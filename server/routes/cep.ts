import { Router, type Request } from "express";

// Consulta de CEP via ViaCEP (proxy no backend para evitar CORS/CSP no cliente
// e permitir cache/normalização). Público — só devolve dados de endereço.

// Rate limit simples em memória por IP (mesmo padrão de carts.ts): endpoint
// público que faz chamada externa, então limitamos abuso.
const HITS = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
setInterval(() => {
  const now = Date.now();
  for (const [ip, v] of HITS) if (now > v.resetAt) HITS.delete(ip);
}, 5 * 60_000).unref();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = HITS.get(ip);
  if (!cur || now > cur.resetAt) {
    HITS.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  cur.count += 1;
  return cur.count > MAX_PER_WINDOW;
}
function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

// Cache em memória (CEP muda raríssimo). TTL 24h; varredura periódica limpa.
interface CepResult {
  cep: string;
  address: string;
  district: string;
  city: string;
  state: string;
  complement: string;
}
const CACHE = new Map<string, { value: CepResult | "notfound"; expires: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of CACHE) if (now > v.expires) CACHE.delete(k);
}, 60 * 60_000).unref();

export function cepRouter(): Router {
  const router = Router();

  router.get("/:cep", async (req, res) => {
    const cep = String(req.params.cep || "").replace(/\D/g, "");
    if (cep.length !== 8) {
      return res.status(400).json({ error: "CEP inválido" });
    }
    if (rateLimited(clientIp(req))) {
      return res.status(429).json({ error: "Muitas consultas. Aguarde um instante." });
    }

    const cached = CACHE.get(cep);
    if (cached && Date.now() < cached.expires) {
      if (cached.value === "notfound") return res.status(404).json({ error: "CEP não encontrado" });
      return res.json(cached.value);
    }

    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        headers: { "User-Agent": "PuraFlora" },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) {
        return res.status(502).json({ error: "Serviço de CEP indisponível" });
      }
      const data = (await resp.json()) as any;
      // ViaCEP devolve { erro: true } (ou "true") quando o CEP não existe.
      if (data?.erro) {
        CACHE.set(cep, { value: "notfound", expires: Date.now() + CACHE_TTL_MS });
        return res.status(404).json({ error: "CEP não encontrado" });
      }
      const out: CepResult = {
        cep: data.cep || cep,
        address: data.logradouro || "",
        district: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
        complement: data.complemento || "",
      };
      CACHE.set(cep, { value: out, expires: Date.now() + CACHE_TTL_MS });
      return res.json(out);
    } catch (err: any) {
      const timeout = err?.name === "TimeoutError" || err?.name === "AbortError";
      return res
        .status(timeout ? 504 : 502)
        .json({ error: timeout ? "Tempo esgotado ao consultar o CEP" : "Falha ao consultar o CEP" });
    }
  });

  return router;
}

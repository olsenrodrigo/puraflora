import { useEffect } from "react";
import { useTranslation } from "react-i18next";

// Widget de chat funcional via Chatwoot (self-hosted na VPS). Só ativa quando as
// variáveis de build estão definidas; caso contrário fica inerte (o site cai no
// botão do WhatsApp). É montado apenas após o consentimento LGPD (ver SupportWidget),
// pois injeta um script de terceiro + cookies.
declare global {
  interface Window {
    chatwootSDK?: { run: (opts: { websiteToken: string; baseUrl: string }) => void };
    chatwootSettings?: Record<string, unknown>;
    $chatwoot?: {
      setLocale?: (locale: string) => void;
      toggleBubbleVisibility?: (v: "show" | "hide") => void;
      reset?: () => void;
    };
  }
}

const env = import.meta.env as unknown as Record<string, string | undefined>;
const BASE_URL = env.VITE_CHATWOOT_BASE_URL?.replace(/\/+$/, "");
const TOKEN = env.VITE_CHATWOOT_TOKEN;

export const isChatwootConfigured = Boolean(BASE_URL && TOKEN);

const cwLocale = (lang?: string) => (lang?.startsWith("en") ? "en" : "pt_BR");

// Uma única injeção do SDK por carga de página (sobrevive a remontagens do React).
let sdkStarted = false;

export default function ChatwootWidget({ onUnavailable }: { onUnavailable?: () => void }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!isChatwootConfigured) return;

    // Remontagem (ex.: consentimento reconcedido): o SDK já foi iniciado —
    // apenas reexibe a bolha, que a limpeza anterior tinha escondido.
    if (sdkStarted) {
      window.$chatwoot?.toggleBubbleVisibility?.("show");
      window.$chatwoot?.setLocale?.(cwLocale(i18n.language));
      return () => window.$chatwoot?.toggleBubbleVisibility?.("hide");
    }

    sdkStarted = true;
    let cancelled = false;
    window.chatwootSettings = { position: "right", locale: cwLocale(i18n.language), type: "standard" };

    const s = document.createElement("script");
    s.id = "chatwoot-sdk";
    s.src = `${BASE_URL}/packs/js/sdk.js`;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      if (!cancelled) window.chatwootSDK?.run({ websiteToken: TOKEN as string, baseUrl: BASE_URL as string });
    };
    s.onerror = () => {
      // Chatwoot indisponível (fora do ar / bloqueado): remove o script e avisa
      // o SupportWidget para cair no botão do WhatsApp.
      s.remove();
      sdkStarted = false;
      if (!cancelled) onUnavailable?.();
    };
    document.head.appendChild(s);

    return () => {
      cancelled = true;
      s.onload = null;
      s.onerror = null;
      // Consentimento revogado / desmontagem: esconde a bolha (o SDK só recarrega
      // no próximo load da página, mesma lógica do analytics).
      window.$chatwoot?.toggleBubbleVisibility?.("hide");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Acompanha a troca de idioma: atualiza o SDK (se pronto) e o settings inicial.
  useEffect(() => {
    const locale = cwLocale(i18n.language);
    if (window.chatwootSettings) window.chatwootSettings.locale = locale;
    window.$chatwoot?.setLocale?.(locale);
  }, [i18n.language]);

  return null;
}

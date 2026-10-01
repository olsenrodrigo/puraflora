import { useEffect, useState } from "react";

// Identificação legal do vendedor (razão social, CNPJ, endereço), vinda de
// /api/store/config — configurada em COMPANY_* no .env do servidor.
export interface CompanyInfo {
  legalName: string | null;
  cnpj: string | null;
  address: string | null;
}

let cached: Promise<CompanyInfo | null> | null = null;

function loadCompany(): Promise<CompanyInfo | null> {
  cached ??= fetch("/api/store/config")
    .then((r) => r.json())
    .then((d) => (d?.company ?? null) as CompanyInfo | null)
    .catch(() => {
      cached = null; // permite nova tentativa no próximo mount
      return null;
    });
  return cached;
}

export function useCompanyInfo(): CompanyInfo | null {
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadCompany().then((c) => {
      if (!cancelled) setCompany(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return company;
}

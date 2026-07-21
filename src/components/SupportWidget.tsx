import { useState } from "react";
import { useAnalyticsReady } from "@/lib/analytics";
import ChatwootWidget, { isChatwootConfigured } from "@/components/ChatwootWidget";
import WhatsAppWidget from "@/components/WhatsAppWidget";

// Canal de atendimento do site:
// - Chatwoot (chat funcional) quando configurado E com consentimento concedido —
//   respeita a regra LGPD de não carregar script de terceiro antes do consentimento.
// - Botão do WhatsApp como fallback: antes do consentimento, sem Chatwoot
//   configurado, ou se o Chatwoot ficar indisponível. Garante que sempre há um
//   canal de contato visível.
export default function SupportWidget() {
  const consentReady = useAnalyticsReady();
  const [chatwootFailed, setChatwootFailed] = useState(false);

  if (isChatwootConfigured && consentReady && !chatwootFailed) {
    return <ChatwootWidget onUnavailable={() => setChatwootFailed(true)} />;
  }
  return <WhatsAppWidget />;
}

import { normalizePlanName } from "@/lib/data";

export const DEFAULT_PIX_KEY = "11972871616";
export const DEFAULT_PIX_OWNER = "Leonardo Rodrigues";

const PLAN_PIX_CODES = {
  economico:
    "00020126670014BR.GOV.BCB.PIX0114+55119728716160227Plano Economico Caixa Local520400005303986540559.995802BR5925LEONARDO RODRIGUES TAVARE6007VINHEDO622605223eIKIZdPpFeULN0P1FJ46S6304D380",
  essencial:
    "00020126670014BR.GOV.BCB.PIX0114+55119728716160227Plano Essencial Caixa Local520400005303986540599.995802BR5925LEONARDO RODRIGUES TAVARE6007VINHEDO622605222DXnYm7JeSZN9pPaGdaAGw63041874",
  gestaoLocal:
    "00020126720014BR.GOV.BCB.PIX0114+55119728716160232Plano Gestao Local - Caixa Local5204000053039865406129.995802BR5925LEONARDO RODRIGUES TAVARE6007VINHEDO622605222CqPPh9H9R9oSD2Am7XtHQ63045378",
} as const;

export function getPlanPixCode(plan: string) {
  const normalized = normalizePlanName(plan);
  if (normalized.includes("gestao local")) return PLAN_PIX_CODES.gestaoLocal;
  if (normalized.includes("essencial")) return PLAN_PIX_CODES.essencial;
  if (normalized.includes("economico")) return PLAN_PIX_CODES.economico;
  return DEFAULT_PIX_KEY;
}

export function getPixQrCodeUrl(pixCode: string, size = 220) {
  return `https://quickchart.io/qr?size=${size}&margin=1&text=${encodeURIComponent(pixCode)}`;
}

export const PUBLIC_PLAN_CHECKOUTS = [
  {
    name: "Economico",
    amount: 59.99,
    description: "Controle essencial para organizar entradas, saidas, metas e relatorios basicos.",
    pixCode: PLAN_PIX_CODES.economico,
  },
  {
    name: "Essencial",
    amount: 99.99,
    description: "Alertas, comparativos e rotina de acompanhamento para lojas em operacao.",
    pixCode: PLAN_PIX_CODES.essencial,
  },
  {
    name: "Gestao Local",
    amount: 129.99,
    description: "Plano consultivo com IA, relatorios interpretados e mais usuarios por loja.",
    pixCode: PLAN_PIX_CODES.gestaoLocal,
  },
] as const;

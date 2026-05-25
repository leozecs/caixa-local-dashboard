// Mock data realista para comércios locais de Vinhedo/SP
import { addDays, format, startOfMonth, subDays, subMonths } from "date-fns";

export type StoreStatus = "ativa" | "pendente" | "trial";
export type Risk = "saudavel" | "atencao" | "critico";
export type EntryType = "receita" | "despesa";
export type PaymentMethod = "Pix" | "Cartão" | "Dinheiro" | "Boleto" | "Transferência";

export const RECEITA_CATEGORIAS = ["Vendas", "Pix", "Cartão", "Dinheiro", "Delivery", "Outros"] as const;
export const DESPESA_CATEGORIAS = [
  "Aluguel",
  "Funcionários",
  "Produtos",
  "Fornecedores",
  "Marketing",
  "Taxas",
  "Impostos",
  "Outros",
] as const;

export interface Entry {
  id: string;
  date: string; // ISO
  type: EntryType;
  category: string;
  description?: string;
  paymentMethod: PaymentMethod;
  amount: number;
}

export interface Store {
  id: string;
  name: string;
  owner: string;
  segment: string;
  status: StoreStatus;
  plan: "Básico" | "Pro" | "Trial";
  lastAccess: string;
  monthRevenue: number;
  risk: Risk;
  city: string;
}

export interface Goals {
  revenue: number;
  margin: number; // %
  maxExpenses: number;
}

export const CURRENT_STORE: Store = {
  id: "store-1",
  name: "Café da Praça",
  owner: "Marina Silveira",
  segment: "Cafeteria",
  status: "ativa",
  plan: "Pro",
  lastAccess: new Date().toISOString(),
  monthRevenue: 38420,
  risk: "saudavel",
  city: "Vinhedo/SP",
};

export const STORE_GOALS: Goals = {
  revenue: 45000,
  margin: 22,
  maxExpenses: 30000,
};

function rand(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Deterministic mock entries for current month
function buildEntries(): Entry[] {
  const r = seedRandom(42);
  const entries: Entry[] = [];
  const monthStart = startOfMonth(new Date());
  const today = new Date();
  const daysSoFar = Math.floor((today.getTime() - monthStart.getTime()) / 86400000) + 1;

  const descricoesReceita = [
    "Vendas balcão",
    "Combo café da manhã",
    "Entrega iFood",
    "Cliente fidelidade",
    "Reserva evento",
    "Venda de grãos",
  ];
  const descricoesDespesa: Record<string, string[]> = {
    Aluguel: ["Aluguel ponto"],
    Funcionários: ["Salário Bruna", "Salário Carlos", "Vale transporte"],
    Produtos: ["Compra grãos especiais", "Leite Tirolez", "Açúcar e adoçantes"],
    Fornecedores: ["Padaria Pão Quente", "Hortifruti Vinhedo"],
    Marketing: ["Anúncio Instagram", "Panfleto bairro"],
    Taxas: ["Taxa maquininha", "Tarifa bancária"],
    Impostos: ["DAS Simples"],
    Outros: ["Material limpeza", "Manutenção máquina"],
  };

  for (let d = 0; d < daysSoFar; d++) {
    const date = addDays(monthStart, d);
    // Receitas (2–5 por dia)
    const nrec = 2 + Math.floor(r() * 4);
    for (let i = 0; i < nrec; i++) {
      const cat = RECEITA_CATEGORIAS[Math.floor(r() * RECEITA_CATEGORIAS.length)];
      const pm: PaymentMethod = (["Pix", "Cartão", "Dinheiro"] as PaymentMethod[])[Math.floor(r() * 3)];
      entries.push({
        id: `r-${d}-${i}`,
        date: date.toISOString(),
        type: "receita",
        category: cat,
        description: descricoesReceita[Math.floor(r() * descricoesReceita.length)],
        paymentMethod: pm,
        amount: rand(80, 720),
      });
    }
    // Despesas (0–2 por dia)
    const ndesp = Math.floor(r() * 3);
    for (let i = 0; i < ndesp; i++) {
      const cat = DESPESA_CATEGORIAS[Math.floor(r() * DESPESA_CATEGORIAS.length)];
      entries.push({
        id: `d-${d}-${i}`,
        date: date.toISOString(),
        type: "despesa",
        category: cat,
        description: descricoesDespesa[cat][Math.floor(r() * descricoesDespesa[cat].length)],
        paymentMethod: "Pix",
        amount: cat === "Aluguel" ? 4200 : cat === "Funcionários" ? rand(1200, 2400) : rand(60, 850),
      });
    }
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export const MOCK_ENTRIES: Entry[] = buildEntries();

// Histórico últimos 6 meses para relatórios
export function getMonthlyHistory() {
  const r = seedRandom(99);
  return Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const revenue = 28000 + Math.round(r() * 18000);
    const expenses = 18000 + Math.round(r() * 10000);
    return {
      month: format(date, "MMM/yy"),
      faturamento: revenue,
      despesas: expenses,
      lucro: revenue - expenses,
    };
  });
}

// Lojas admin
export const ADMIN_STORES: Store[] = [
  {
    id: "store-1",
    name: "Café da Praça",
    owner: "Marina Silveira",
    segment: "Cafeteria",
    status: "ativa",
    plan: "Pro",
    lastAccess: subDays(new Date(), 0).toISOString(),
    monthRevenue: 38420,
    risk: "saudavel",
    city: "Vinhedo/SP",
  },
  {
    id: "store-2",
    name: "Barbearia do Tonho",
    owner: "Antônio Pereira",
    segment: "Barbearia",
    status: "ativa",
    plan: "Básico",
    lastAccess: subDays(new Date(), 1).toISOString(),
    monthRevenue: 14280,
    risk: "atencao",
    city: "Vinhedo/SP",
  },
  {
    id: "store-3",
    name: "Pizzaria Capricciosa",
    owner: "Giovana Bertolli",
    segment: "Pizzaria",
    status: "ativa",
    plan: "Pro",
    lastAccess: subDays(new Date(), 0).toISOString(),
    monthRevenue: 62890,
    risk: "saudavel",
    city: "Vinhedo/SP",
  },
  {
    id: "store-4",
    name: "Atelier Luiza Moda",
    owner: "Luiza Camargo",
    segment: "Loja de Roupas",
    status: "trial",
    plan: "Trial",
    lastAccess: subDays(new Date(), 3).toISOString(),
    monthRevenue: 9120,
    risk: "atencao",
    city: "Vinhedo/SP",
  },
  {
    id: "store-5",
    name: "Studio Bella Estética",
    owner: "Camila Rocha",
    segment: "Estética",
    status: "ativa",
    plan: "Pro",
    lastAccess: subDays(new Date(), 2).toISOString(),
    monthRevenue: 21540,
    risk: "saudavel",
    city: "Vinhedo/SP",
  },
  {
    id: "store-6",
    name: "Mercado São João",
    owner: "José Aparecido",
    segment: "Mercado de Bairro",
    status: "pendente",
    plan: "Básico",
    lastAccess: subDays(new Date(), 12).toISOString(),
    monthRevenue: 4380,
    risk: "critico",
    city: "Vinhedo/SP",
  },
  {
    id: "store-7",
    name: "Hortifruti Bom Preço",
    owner: "Cláudia Ramos",
    segment: "Hortifruti",
    status: "ativa",
    plan: "Básico",
    lastAccess: subDays(new Date(), 0).toISOString(),
    monthRevenue: 27110,
    risk: "saudavel",
    city: "Vinhedo/SP",
  },
  {
    id: "store-8",
    name: "Padaria Vinhas",
    owner: "Renato Bianchi",
    segment: "Padaria",
    status: "ativa",
    plan: "Pro",
    lastAccess: subDays(new Date(), 1).toISOString(),
    monthRevenue: 49870,
    risk: "atencao",
    city: "Vinhedo/SP",
  },
];

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatBRLPrecise(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

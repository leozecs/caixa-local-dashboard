import { addMonths, endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireSupabase } from "@/lib/supabase";
import type { Profile } from "@/lib/auth";

export type StoreStatus = "ativa" | "pendente" | "trial" | "cancelada";
export type Risk = "saudavel" | "atencao" | "critico";
export type EntryType = "receita" | "despesa";
export type PaymentMethod = "Pix" | "Cartão" | "Dinheiro" | "Boleto" | "Transferência";
export type Plan = string;
export type SubscriptionStatus = "em_dia" | "em_atraso" | "trial" | "cancelada";
export type StoreMemberRole = "owner" | "atendente";

export const RECEITA_CATEGORIAS = [
  "Vendas",
  "Pix",
  "Cartão",
  "Dinheiro",
  "Delivery",
  "Outros",
] as const;
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

export interface Store {
  id: string;
  name: string;
  owner: string;
  segment: string;
  status: StoreStatus;
  plan: Plan;
  lastAccess: string | null;
  monthRevenue: number;
  risk: Risk;
  city: string;
  cnpj?: string | null;
  dailyClosingWhatsappEnabled?: boolean;
  memberRole?: StoreMemberRole;
  logoPath?: string | null;
  logoUrl?: string | null;
  defaultCommissionPercent: number;
}

export interface Entry {
  id: string;
  storeId: string;
  date: string;
  type: EntryType;
  category: string;
  description?: string | null;
  paymentMethod: PaymentMethod;
  amount: number;
  salespersonName?: string | null;
  commissionPercent?: number | null;
  commissionAmount?: number;
  isRecurring?: boolean;
}

export interface StoreCategory {
  id: string;
  storeId: string;
  type: EntryType;
  name: string;
  sortOrder: number;
}

export interface EntryAttachment {
  id: string;
  storeId: string;
  entryId: string;
  filePath: string;
  fileName: string;
  fileType: string | null;
  fileSize: number;
  createdAt: string;
}

export interface Goals {
  revenue: number;
  margin: number;
  maxExpenses: number;
}

export interface SubscriptionRow {
  id: string;
  storeId: string;
  storeName: string;
  plan: Plan;
  amount: number;
  nextCharge: string;
  lastPayment: string | null;
  payStatus: SubscriptionStatus;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  amount: number;
  description: string | null;
  active: boolean;
  sortOrder: number;
}

export interface StoreMonthlyResult {
  storeId: string;
  storeName: string;
  owner: string;
  plan: Plan;
  status: StoreStatus;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface AdminAlert {
  id: string;
  severity: "critico" | "atencao" | "info";
  store: string;
  message: string;
  date: string;
}

export interface AiInsight {
  id: string;
  storeId: string;
  summary: string;
  opportunity: string;
  risk: string;
  actions: string[];
  createdAt: string;
}

export interface AdminAiInsight {
  id: string;
  scope: string;
  summary: string;
  opportunity: string;
  risk: string;
  actions: string[];
  createdAt: string;
}

export interface MonthlyOwnerNote {
  id: string;
  storeId: string;
  month: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreOperationalAlert {
  id: string;
  type: "margin" | "revenue_goal" | "expense_goal";
  severity: "atencao" | "critico";
  title: string;
  message: string;
}

export interface StoreDailyResult {
  storeId: string;
  storeName: string;
  owner: string;
  plan: Plan;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface StoreMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: StoreMemberRole;
  commissionPercent: number;
  createdAt: string;
}

export interface PlanCapabilities {
  key: "economico" | "essencial" | "gestao_local" | "custom";
  dashboard: boolean;
  entries: boolean;
  goals: boolean;
  basicReports: boolean;
  alerts: boolean;
  monthlyComparison: boolean;
  interpretedReports: boolean;
  ownerMonthlyNote: boolean;
  aiConsultant: boolean;
  dailyWhatsappSummary: boolean;
  maxUsers: number;
  limitsLabel: string;
}

type StoreRow = {
  id: string;
  name: string;
  owner_name: string;
  segment: string;
  status: StoreStatus;
  plan: Plan;
  last_access_at: string | null;
  city: string;
  cnpj: string | null;
  daily_closing_whatsapp_enabled?: boolean | null;
  logo_path?: string | null;
  default_commission_percent?: number | null;
  created_at: string;
};

type EntryRow = {
  id: string;
  store_id: string;
  entry_date: string;
  type: EntryType;
  category: string;
  description: string | null;
  payment_method: PaymentMethod;
  amount: number;
  salesperson_name?: string | null;
  commission_percent?: number | null;
  commission_amount?: number | null;
  is_recurring?: boolean | null;
};

type StoreCategoryDbRow = {
  id: string;
  store_id: string;
  type: EntryType;
  name: string;
  sort_order: number;
};

type EntryAttachmentDbRow = {
  id: string;
  store_id: string;
  entry_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number;
  created_at: string;
};

type SubscriptionDbRow = {
  id: string;
  store_id: string;
  plan: Plan;
  amount: number;
  next_charge_date: string;
  status: SubscriptionStatus;
  stores?: { name: string } | { name: string }[] | null;
};

type BillingRecordDbRow = {
  store_id: string;
  paid_at: string | null;
  status: "pago" | "pendente" | "atrasado" | "cancelado";
};

type SubscriptionPlanDbRow = {
  id: string;
  name: string;
  amount: number;
  description: string | null;
  active: boolean;
  sort_order: number;
};

type StoreMemberDbRow = {
  id: string;
  role: StoreMemberRole;
  commission_percent?: number | null;
  created_at: string;
  profiles?: { id: string; email: string; name: string } | { id: string; email: string; name: string }[] | null;
};

type AiInsightDbRow = {
  id: string;
  store_id: string;
  summary: string;
  opportunity: string;
  risk: string;
  actions: string[];
  created_at: string;
};

type AdminAiInsightDbRow = {
  id: string;
  scope: string;
  summary: string;
  opportunity: string;
  risk: string;
  actions: string[];
  created_at: string;
};

type MonthlyOwnerNoteDbRow = {
  id: string;
  store_id: string;
  month: string;
  note: string;
  created_at: string;
  updated_at: string;
};

const DEFAULT_BILLING_MESSAGE =
  "Ola, {{responsavel}}. Passando para lembrar da mensalidade do Caixa Local da loja {{loja}}. Plano {{plano}}, valor {{valor}}, vencimento em {{vencimento}}. Posso te ajudar com o pagamento?";

const DEFAULT_DAILY_CLOSING_MESSAGE =
  "Ola, {{responsavel}}. Fechamento de hoje da {{loja}}: entradas {{entrada}}, saidas {{saida}} e lucro {{lucro}}. Qualquer ponto fora do esperado, me chama aqui.";

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "default-economico",
    name: "Economico",
    amount: 59.99,
    description:
      "Para lojas que precisam controlar o caixa sem complexidade. Inclui lancamentos de receita e despesa, dashboard do mes atual, metas mensais, relatorios basicos e exportacao manual. Nao inclui alertas, comparativo mensal, WhatsApp diario ou Consultor IA. Limite: 1 usuario por loja.",
    active: true,
    sortOrder: 1,
  },
  {
    id: "default-essencial",
    name: "Essencial",
    amount: 99.99,
    description:
      "Melhor custo-beneficio para acompanhar a operacao com alertas. Inclui tudo do Economico, alertas, comparativo mensal, fechamento diario por WhatsApp quando ativado, ate 3 usuarios por loja e suporte por WhatsApp em ate 1 dia util.",
    active: true,
    sortOrder: 2,
  },
  {
    id: "default-gestao-local",
    name: "Gestao Local",
    amount: 149.99,
    description:
      "Plano consultivo para o cliente entender onde ganhou, perdeu e pode melhorar. Inclui tudo do Essencial, relatorio interpretado, Consultor IA, ate 5 usuarios por loja e suporte por WhatsApp em ate 2h em dias uteis no horario comercial; fora do horario comercial e fins de semana, resposta em ate 1 dia.",
    active: true,
    sortOrder: 3,
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

export function planHasAlerts(plan: Plan) {
  return getPlanCapabilities(plan).alerts;
}

export function normalizePlanName(plan: Plan) {
  return plan
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function getPlanCapabilities(plan: Plan): PlanCapabilities {
  const normalized = normalizePlanName(plan);
  const base = {
    dashboard: true,
    entries: true,
    goals: true,
    basicReports: true,
    alerts: false,
    monthlyComparison: false,
    interpretedReports: false,
    ownerMonthlyNote: false,
    aiConsultant: false,
    dailyWhatsappSummary: false,
    limitsLabel:
      "Dashboard do mes atual, lancamentos, metas mensais e relatorios basicos. Sem alertas, comparativo mensal, WhatsApp diario ou Consultor IA.",
  };

  if (normalized.includes("gestao local")) {
    return {
      ...base,
      key: "gestao_local",
      alerts: true,
      monthlyComparison: true,
      interpretedReports: true,
      ownerMonthlyNote: true,
      aiConsultant: true,
      dailyWhatsappSummary: true,
      maxUsers: 5,
      limitsLabel:
        "Acesso completo para lojista: dashboard, lancamentos, metas, alertas, relatorios, comparativos, WhatsApp diario e Consultor IA. Painel admin fica restrito ao owner.",
    };
  }

  if (normalized.includes("essencial")) {
    return {
      ...base,
      key: "essencial",
      alerts: true,
      monthlyComparison: true,
      dailyWhatsappSummary: true,
      maxUsers: 3,
      limitsLabel:
        "Tudo do Economico, com alertas, comparativo mensal e fechamento diario por WhatsApp quando ativado. Sem Consultor IA.",
    };
  }

  if (normalized.includes("economico")) {
    return { ...base, key: "economico", maxUsers: 1 };
  }

  return { ...base, key: "custom", maxUsers: 1 };
}

function monthRange(month = new Date()) {
  return {
    start: startOfMonth(month).toISOString().slice(0, 10),
    end: addMonths(startOfMonth(month), 1).toISOString().slice(0, 10),
  };
}

function toEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    storeId: row.store_id,
    date: row.entry_date,
    type: row.type,
    category: row.category,
    description: row.description,
    paymentMethod: row.payment_method,
    amount: row.amount / 100,
    salespersonName: row.salesperson_name || null,
    commissionPercent:
      row.commission_percent === null || row.commission_percent === undefined
        ? null
        : Number(row.commission_percent),
    commissionAmount: (row.commission_amount || 0) / 100,
    isRecurring: Boolean(row.is_recurring),
  };
}

function toStoreCategory(row: StoreCategoryDbRow): StoreCategory {
  return {
    id: row.id,
    storeId: row.store_id,
    type: row.type,
    name: row.name,
    sortOrder: row.sort_order,
  };
}

function toEntryAttachment(row: EntryAttachmentDbRow): EntryAttachment {
  return {
    id: row.id,
    storeId: row.store_id,
    entryId: row.entry_id,
    filePath: row.file_path,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}

function computeRisk(entries: Entry[], goals?: Goals): Risk {
  const revenue = sumEntries(entries, "receita");
  const expenses = sumEntries(entries, "despesa");
  const profit = revenue - expenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  if (revenue <= 0 || margin < 8 || (goals && expenses > goals.maxExpenses)) return "critico";
  if (margin < (goals?.margin ?? 18) || (goals && expenses > goals.maxExpenses * 0.85)) {
    return "atencao";
  }

  return "saudavel";
}

function sumEntries(entries: Entry[], type: EntryType) {
  return entries
    .filter((entry) => entry.type === type)
    .reduce((sum, entry) => sum + entry.amount, 0);
}

function storeNameFromJoin(row: SubscriptionDbRow) {
  const joined = row.stores;
  if (Array.isArray(joined)) return joined[0]?.name || "Loja";
  return joined?.name || "Loja";
}

function defaultStoreCategories(storeId: string): StoreCategory[] {
  return [
    ...RECEITA_CATEGORIAS.map((name, index) => ({
      id: `default-receita-${name}`,
      storeId,
      type: "receita" as EntryType,
      name,
      sortOrder: (index + 1) * 10,
    })),
    ...DESPESA_CATEGORIAS.map((name, index) => ({
      id: `default-despesa-${name}`,
      storeId,
      type: "despesa" as EntryType,
      name,
      sortOrder: (index + 1) * 10,
    })),
  ];
}

function toSubscriptionPlan(row: SubscriptionPlanDbRow): SubscriptionPlan {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount / 100,
    description: row.description,
    active: row.active,
    sortOrder: row.sort_order,
  };
}

function profileFromMember(row: StoreMemberDbRow) {
  const joined = row.profiles;
  return Array.isArray(joined) ? joined[0] : joined;
}

function toStoreMember(row: StoreMemberDbRow): StoreMember {
  const profile = profileFromMember(row);
  return {
    id: row.id,
    userId: profile?.id || "",
    name: profile?.name || "Usuario",
    email: profile?.email || "",
    role: row.role,
    commissionPercent: Number(row.commission_percent ?? 1),
    createdAt: row.created_at,
  };
}

function toAiInsight(row: AiInsightDbRow): AiInsight {
  return {
    id: row.id,
    storeId: row.store_id,
    summary: row.summary,
    opportunity: row.opportunity,
    risk: row.risk,
    actions: row.actions || [],
    createdAt: row.created_at,
  };
}

function toAdminAiInsight(row: AdminAiInsightDbRow): AdminAiInsight {
  return {
    id: row.id,
    scope: row.scope,
    summary: row.summary,
    opportunity: row.opportunity,
    risk: row.risk,
    actions: row.actions || [],
    createdAt: row.created_at,
  };
}

function toMonthlyOwnerNote(row: MonthlyOwnerNoteDbRow): MonthlyOwnerNote {
  return {
    id: row.id,
    storeId: row.store_id,
    month: row.month,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

export async function listSubscriptionPlans({ activeOnly = false } = {}) {
  const client = requireSupabase();
  let query = client
    .from("subscription_plans")
    .select("id, name, amount, description, active, sort_order")
    .order("sort_order", { ascending: true })
    .order("amount", { ascending: true });

  if (activeOnly) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) {
      return activeOnly ? DEFAULT_PLANS.filter((plan) => plan.active) : DEFAULT_PLANS;
    }
    throw error;
  }

  return ((data || []) as SubscriptionPlanDbRow[]).map(toSubscriptionPlan);
}

export async function listAiInsights(storeId: string): Promise<AiInsight[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("ai_insights")
    .select("id, store_id, summary, opportunity, risk, actions, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }

  return ((data || []) as AiInsightDbRow[]).map(toAiInsight);
}

export async function listAdminAiInsights(scope = "portfolio"): Promise<AdminAiInsight[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("admin_ai_insights")
    .select("id, scope, summary, opportunity, risk, actions, created_at")
    .eq("scope", scope)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }

  return ((data || []) as AdminAiInsightDbRow[]).map(toAdminAiInsight);
}

export async function saveAiInsight(input: Omit<AiInsight, "id" | "createdAt">) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("ai_insights")
    .insert({
      store_id: input.storeId,
      summary: input.summary,
      opportunity: input.opportunity,
      risk: input.risk,
      actions: input.actions,
    })
    .select("id, store_id, summary, opportunity, risk, actions, created_at")
    .single();

  if (error) throw error;
  return toAiInsight(data as AiInsightDbRow);
}

export async function getMonthlyOwnerNote(storeId: string, month: Date) {
  const client = requireSupabase();
  const monthKey = startOfMonth(month).toISOString().slice(0, 10);
  const { data, error } = await client
    .from("monthly_owner_notes")
    .select("id, store_id, month, note, created_at, updated_at")
    .eq("store_id", storeId)
    .eq("month", monthKey)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }

  return data ? toMonthlyOwnerNote(data as MonthlyOwnerNoteDbRow) : null;
}

export async function saveMonthlyOwnerNote(input: { storeId: string; month: Date; note: string }) {
  const client = requireSupabase();
  const monthKey = startOfMonth(input.month).toISOString().slice(0, 10);
  const { data, error } = await client
    .from("monthly_owner_notes")
    .upsert(
      {
        store_id: input.storeId,
        month: monthKey,
        note: input.note.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,month" },
    )
    .select("id, store_id, month, note, created_at, updated_at")
    .single();

  if (error) throw error;
  return toMonthlyOwnerNote(data as MonthlyOwnerNoteDbRow);
}

export async function saveSubscriptionPlan(input: {
  id?: string;
  name: string;
  amount: number;
  description?: string | null;
  active: boolean;
  sortOrder: number;
}) {
  const client = requireSupabase();
  const payload = {
    name: input.name.trim(),
    amount: Math.round(input.amount * 100),
    description: input.description?.trim() || null,
    active: input.active,
    sort_order: input.sortOrder,
    updated_at: new Date().toISOString(),
  };

  const query = input.id?.startsWith("default-")
    ? client.from("subscription_plans").insert(payload)
    : input.id
      ? client.from("subscription_plans").update(payload).eq("id", input.id)
      : client.from("subscription_plans").insert(payload);

  const { data, error } = await query.select().single();
  if (error) throw error;
  return toSubscriptionPlan(data as SubscriptionPlanDbRow);
}

export async function deleteSubscriptionPlan(id: string) {
  const client = requireSupabase();
  const { error } = await client.from("subscription_plans").delete().eq("id", id);
  if (error) throw error;
}

async function getPlanAmount(planName: string) {
  const plans = await listSubscriptionPlans({ activeOnly: false });
  return plans.find((plan) => plan.name === planName)?.amount ?? 0;
}

export async function getProfile() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("id, email, name, role, profile_initial, profile_color")
    .single();

  if (error) throw error;
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    profileInitial: data.profile_initial,
    profileColor: data.profile_color,
  } as Profile;
}

export async function updateProfileAppearance(input: {
  profileId: string;
  profileInitial: string;
  profileColor: string;
}) {
  const client = requireSupabase();
  const initial = input.profileInitial.trim().slice(0, 1).toUpperCase();
  const color = input.profileColor.trim() || "#111827";
  const { data, error } = await client
    .from("profiles")
    .update({
      profile_initial: initial,
      profile_color: color,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.profileId)
    .select("id, email, name, role, profile_initial, profile_color")
    .single();

  if (error) throw error;
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    profileInitial: data.profile_initial,
    profileColor: data.profile_color,
  } as Profile;
}

export async function getCurrentStore(profile: Profile) {
  const client = requireSupabase();

  if (profile.role === "owner") {
    const stores = await listStores();
    return stores[0] ?? null;
  }

  const { data, error } = await client
    .from("store_members")
    .select("role, stores(*)")
    .eq("user_id", profile.id)
    .limit(1)
    .single();

  if (error) throw error;
  const store = Array.isArray(data.stores) ? data.stores[0] : data.stores;
  if (!store) return null;

  const lastAccessAt = await touchStoreLastAccess(store.id);
  return {
    ...(await hydrateStore({
      ...(store as StoreRow),
      last_access_at: lastAccessAt || (store as StoreRow).last_access_at,
    })),
    memberRole: data.role as StoreMemberRole,
  };
}

export async function listStores() {
  const client = requireSupabase();
  const { data, error } = await client.from("stores").select("*").order("created_at", {
    ascending: false,
  });

  if (error) throw error;
  return Promise.all((data || []).map((row) => hydrateStore(row as StoreRow)));
}

async function touchStoreLastAccess(storeId: string) {
  const client = requireSupabase();
  const lastAccessAt = new Date().toISOString();
  const { error } = await client
    .from("stores")
    .update({ last_access_at: lastAccessAt })
    .eq("id", storeId);

  if (error) {
    console.warn("Nao foi possivel atualizar ultimo acesso da loja:", error.message);
    return null;
  }

  return lastAccessAt;
}

export async function createStore(input: {
  name: string;
  owner: string;
  email: string;
  password: string;
  segment: string;
  city: string;
  plan: Plan;
  status: StoreStatus;
  cnpj?: string | null;
}) {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sessao expirada. Entre novamente.");

  const response = await fetch("/api/admin/stores", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || "Erro ao cadastrar loja.");
  }

  return hydrateStore(payload.store as StoreRow);
}

export async function updateStore(id: string, input: Partial<Store>) {
  const client = requireSupabase();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) payload.name = input.name;
  if (input.owner !== undefined) payload.owner_name = input.owner;
  if (input.segment !== undefined) payload.segment = input.segment;
  if (input.city !== undefined) payload.city = input.city;
  if (input.status !== undefined) payload.status = input.status;
  if (input.plan !== undefined) payload.plan = input.plan;
  if (input.cnpj !== undefined) payload.cnpj = input.cnpj;
  if (input.dailyClosingWhatsappEnabled !== undefined) {
    payload.daily_closing_whatsapp_enabled = input.dailyClosingWhatsappEnabled;
  }
  if (input.logoPath !== undefined) payload.logo_path = input.logoPath;
  if (input.defaultCommissionPercent !== undefined) {
    payload.default_commission_percent = input.defaultCommissionPercent;
  }

  const { data, error } = await client
    .from("stores")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return hydrateStore(data as StoreRow);
}

export async function listStoreCategories(storeId: string): Promise<StoreCategory[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("store_categories")
    .select("id, store_id, type, name, sort_order")
    .eq("store_id", storeId)
    .order("type", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return defaultStoreCategories(storeId);
    throw error;
  }

  const categories = ((data || []) as StoreCategoryDbRow[]).map(toStoreCategory);
  return categories.length ? categories : defaultStoreCategories(storeId);
}

export async function createStoreCategory(input: {
  storeId: string;
  type: EntryType;
  name: string;
}) {
  const client = requireSupabase();
  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome da categoria.");

  const { data, error } = await client
    .from("store_categories")
    .insert({
      store_id: input.storeId,
      type: input.type,
      name,
      sort_order: 100,
    })
    .select("id, store_id, type, name, sort_order")
    .single();

  if (error) throw error;
  return toStoreCategory(data as StoreCategoryDbRow);
}

export async function deleteStoreCategory(id: string) {
  const client = requireSupabase();
  const { error } = await client.from("store_categories").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadStoreLogo(input: {
  storeId: string;
  currentLogoPath?: string | null;
  file: File;
}) {
  const client = requireSupabase();
  if (!input.file.type.startsWith("image/")) {
    throw new Error("Envie uma imagem para usar como logo.");
  }
  if (input.file.size > 2 * 1024 * 1024) {
    throw new Error("A logo precisa ter ate 2 MB.");
  }

  const extension = input.file.name.split(".").pop()?.toLowerCase().replace(/[^\w]+/g, "") || "png";
  const filePath = `${input.storeId}/logo-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage
    .from("store-logos")
    .upload(filePath, input.file, {
      contentType: input.file.type || "image/png",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const store = await updateStore(input.storeId, { logoPath: filePath });
  if (input.currentLogoPath && input.currentLogoPath !== filePath) {
    await client.storage.from("store-logos").remove([input.currentLogoPath]);
  }

  return store;
}

async function getSessionToken() {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sessao expirada. Entre novamente.");
  return token;
}

export async function listStoreMembers(storeId: string): Promise<{
  members: StoreMember[];
  maxUsers: number;
}> {
  const token = await getSessionToken();
  const response = await fetch(`/api/store-members?storeId=${encodeURIComponent(storeId)}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.message || "Erro ao carregar equipe.");
  return {
    members: ((payload.members || []) as StoreMemberDbRow[]).map(toStoreMember),
    maxUsers: Number(payload.maxUsers || 1),
  };
}

export async function createStoreMember(input: {
  storeId: string;
  name: string;
  email: string;
  password: string;
  role: StoreMemberRole;
  commissionPercent: number;
}) {
  const token = await getSessionToken();
  const response = await fetch(`/api/store-members?storeId=${encodeURIComponent(input.storeId)}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      commissionPercent: input.commissionPercent,
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.message || "Erro ao cadastrar usuario.");
  return ((payload.members || []) as StoreMemberDbRow[]).map(toStoreMember);
}

export async function updateStoreMemberRole(input: {
  storeId: string;
  memberId: string;
  role: StoreMemberRole;
  commissionPercent: number;
}) {
  const token = await getSessionToken();
  const response = await fetch(`/api/store-members?storeId=${encodeURIComponent(input.storeId)}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      memberId: input.memberId,
      role: input.role,
      commissionPercent: input.commissionPercent,
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.message || "Erro ao atualizar usuario.");
  return ((payload.members || []) as StoreMemberDbRow[]).map(toStoreMember);
}

export async function deleteStoreMember(input: { storeId: string; memberId: string }) {
  const token = await getSessionToken();
  const response = await fetch(`/api/store-members?storeId=${encodeURIComponent(input.storeId)}`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ memberId: input.memberId }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.message || "Erro ao excluir usuario.");
  return ((payload.members || []) as StoreMemberDbRow[]).map(toStoreMember);
}

export async function deleteStore(id: string) {
  const client = requireSupabase();
  const { error } = await client.from("stores").delete().eq("id", id);
  if (error) throw error;
}

export async function updateStorePlan(input: { storeId: string; plan: Plan; status: StoreStatus }) {
  const client = requireSupabase();
  const planAmount = await getPlanAmount(input.plan);
  const subscriptionStatus: SubscriptionStatus =
    input.status === "trial" ? "trial" : input.status === "pendente" ? "em_atraso" : "em_dia";

  const { data, error } = await client
    .from("stores")
    .update({
      plan: input.plan,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.storeId)
    .select()
    .single();

  if (error) throw error;

  const { error: subscriptionError } = await client.from("subscriptions").upsert(
    {
      store_id: input.storeId,
      plan: input.plan,
      amount: Math.round(planAmount * 100),
      status: subscriptionStatus,
      next_charge_date: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id" },
  );

  if (subscriptionError) throw subscriptionError;
  return hydrateStore(data as StoreRow);
}

export async function listEntries(storeId: string, start?: string, end?: string) {
  const client = requireSupabase();
  const range = start && end ? { start, end } : monthRange();
  const { data, error } = await client
    .from("financial_entries")
    .select("*")
    .eq("store_id", storeId)
    .gte("entry_date", range.start)
    .lt("entry_date", range.end)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => toEntry(row as EntryRow));
}

export async function saveEntry(entry: Omit<Entry, "id"> & { id?: string }) {
  const client = requireSupabase();
  const commissionPercent =
    entry.type === "receita" && entry.commissionPercent !== null && entry.commissionPercent !== undefined
      ? Number(entry.commissionPercent)
      : null;
  const commissionAmount =
    entry.type === "receita" && commissionPercent !== null
      ? Math.round(entry.amount * (commissionPercent / 100) * 100)
      : 0;
  const payload = {
    store_id: entry.storeId,
    entry_date: entry.date.slice(0, 10),
    type: entry.type,
    category: entry.category,
    description: entry.description || null,
    payment_method: entry.paymentMethod,
    amount: Math.round(entry.amount * 100),
    salesperson_name: entry.type === "receita" ? entry.salespersonName?.trim() || null : null,
    commission_percent: commissionPercent,
    commission_amount: commissionAmount,
    is_recurring: Boolean(entry.isRecurring),
    updated_at: new Date().toISOString(),
  };

  const query = entry.id
    ? client.from("financial_entries").update(payload).eq("id", entry.id)
    : client.from("financial_entries").insert(payload);

  const { data, error } = await query.select().single();
  if (error) throw error;
  return toEntry(data as EntryRow);
}

export async function deleteEntry(id: string) {
  const client = requireSupabase();
  const { error } = await client.from("financial_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function listEntryAttachments(entryId: string): Promise<EntryAttachment[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("entry_attachments")
    .select("id, store_id, entry_id, file_path, file_name, file_type, file_size, created_at")
    .eq("entry_id", entryId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }

  return ((data || []) as EntryAttachmentDbRow[]).map(toEntryAttachment);
}

export async function listStoreAttachments(storeId: string): Promise<EntryAttachment[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("entry_attachments")
    .select("id, store_id, entry_id, file_path, file_name, file_type, file_size, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }

  return ((data || []) as EntryAttachmentDbRow[]).map(toEntryAttachment);
}

export async function uploadEntryAttachment(input: {
  storeId: string;
  entryId: string;
  file: File;
}) {
  const client = requireSupabase();
  const safeName = input.file.name.replace(/[^\w.-]+/g, "-");
  const filePath = `${input.storeId}/${input.entryId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await client.storage
    .from("entry-attachments")
    .upload(filePath, input.file, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error } = await client
    .from("entry_attachments")
    .insert({
      store_id: input.storeId,
      entry_id: input.entryId,
      file_path: filePath,
      file_name: input.file.name,
      file_type: input.file.type || null,
      file_size: input.file.size,
    })
    .select("id, store_id, entry_id, file_path, file_name, file_type, file_size, created_at")
    .single();

  if (error) throw error;
  return toEntryAttachment(data as EntryAttachmentDbRow);
}

export async function openEntryAttachment(attachment: EntryAttachment) {
  const client = requireSupabase();
  const { data, error } = await client.storage
    .from("entry-attachments")
    .createSignedUrl(attachment.filePath, 60);

  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

export async function downloadEntryAttachment(attachment: EntryAttachment) {
  const client = requireSupabase();
  const { data, error } = await client.storage
    .from("entry-attachments")
    .download(attachment.filePath);

  if (error) throw error;
  return data;
}

export async function deleteEntryAttachment(attachment: EntryAttachment) {
  const client = requireSupabase();
  const { error } = await client.from("entry_attachments").delete().eq("id", attachment.id);
  if (error) throw error;

  const { error: storageError } = await client.storage
    .from("entry-attachments")
    .remove([attachment.filePath]);
  if (storageError) throw storageError;
}

export async function getGoals(storeId: string, month = new Date()): Promise<Goals> {
  const client = requireSupabase();
  const referenceMonth = startOfMonth(month).toISOString().slice(0, 10);
  const { data, error } = await client
    .from("store_goals")
    .select("revenue, margin, max_expenses")
    .eq("store_id", storeId)
    .eq("reference_month", referenceMonth)
    .maybeSingle();

  if (error) throw error;

  return data
    ? {
        revenue: data.revenue / 100,
        margin: Number(data.margin),
        maxExpenses: data.max_expenses / 100,
      }
    : { revenue: 0, margin: 0, maxExpenses: 0 };
}

export async function saveGoals(storeId: string, goals: Goals, month = new Date()) {
  const client = requireSupabase();
  const referenceMonth = startOfMonth(month).toISOString().slice(0, 10);
  const { error } = await client.from("store_goals").upsert(
    {
      store_id: storeId,
      reference_month: referenceMonth,
      revenue: Math.round(goals.revenue * 100),
      margin: goals.margin,
      max_expenses: Math.round(goals.maxExpenses * 100),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id,reference_month" },
  );

  if (error) throw error;
}

export async function getMonthlyHistory(storeId: string) {
  const months = Array.from({ length: 6 }).map((_, index) =>
    startOfMonth(subMonths(new Date(), 5 - index)),
  );
  const start = months[0].toISOString().slice(0, 10);
  const end = addMonths(months[months.length - 1], 1)
    .toISOString()
    .slice(0, 10);
  const entries = await listEntries(storeId, start, end);

  return months.map((month) => {
    const monthEntries = entries.filter((entry) => {
      const date = parseISO(entry.date);
      return date >= month && date <= endOfMonth(month);
    });
    const faturamento = sumEntries(monthEntries, "receita");
    const despesas = sumEntries(monthEntries, "despesa");

    return {
      month: format(month, "MMM/yy", { locale: ptBR }),
      faturamento,
      despesas,
      lucro: faturamento - despesas,
    };
  });
}

export async function listSubscriptions(): Promise<SubscriptionRow[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("subscriptions")
    .select("id, store_id, plan, amount, next_charge_date, status, stores(name)")
    .order("next_charge_date", { ascending: true });

  if (error) throw error;

  const storeIds = ((data || []) as SubscriptionDbRow[]).map((row) => row.store_id);
  const lastPayments = new Map<string, string>();
  if (storeIds.length) {
    const { data: billingRows, error: billingError } = await client
      .from("billing_records")
      .select("store_id, paid_at, status")
      .in("store_id", storeIds)
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false });

    if (billingError && !isMissingTableError(billingError)) throw billingError;
    ((billingRows || []) as BillingRecordDbRow[]).forEach((row) => {
      if (row.paid_at && !lastPayments.has(row.store_id)) {
        lastPayments.set(row.store_id, row.paid_at);
      }
    });
  }

  return ((data || []) as SubscriptionDbRow[]).map((row) => ({
    id: row.id,
    storeId: row.store_id,
    storeName: storeNameFromJoin(row),
    plan: row.plan,
    amount: row.amount / 100,
    nextCharge: row.next_charge_date,
    lastPayment: lastPayments.get(row.store_id) || null,
    payStatus: row.status,
  }));
}

export async function listStoreMonthlyResults(month = new Date()): Promise<StoreMonthlyResult[]> {
  const client = requireSupabase();
  const stores = await listStores();
  const range = monthRange(month);
  const { data, error } = await client
    .from("financial_entries")
    .select("store_id, type, amount")
    .gte("entry_date", range.start)
    .lt("entry_date", range.end);

  if (error) throw error;

  const totals = new Map<string, { revenue: number; expenses: number }>();
  (data || []).forEach((row) => {
    const entry = row as Pick<EntryRow, "store_id" | "type" | "amount">;
    const current = totals.get(entry.store_id) || { revenue: 0, expenses: 0 };
    if (entry.type === "receita") current.revenue += entry.amount / 100;
    else current.expenses += entry.amount / 100;
    totals.set(entry.store_id, current);
  });

  return stores.map((store) => {
    const total = totals.get(store.id) || { revenue: 0, expenses: 0 };
    return {
      storeId: store.id,
      storeName: store.name,
      owner: store.owner,
      plan: store.plan,
      status: store.status,
      revenue: total.revenue,
      expenses: total.expenses,
      profit: total.revenue - total.expenses,
    };
  });
}

export async function getAppSetting(key: string, fallback = "") {
  const client = requireSupabase();
  const { data, error } = await client
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return fallback;
    throw error;
  }

  return typeof data?.value === "string" ? data.value : fallback;
}

export async function saveAppSetting(key: string, value: string) {
  const client = requireSupabase();
  const { error } = await client.from("app_settings").upsert(
    {
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) throw error;
}

export function defaultBillingMessageTemplate() {
  return DEFAULT_BILLING_MESSAGE;
}

export function renderBillingMessage(
  template: string,
  input: {
    loja: string;
    responsavel?: string;
    plano: string;
    valor: string;
    vencimento: string;
  },
) {
  return template
    .replaceAll("{{loja}}", input.loja)
    .replaceAll("{{responsavel}}", input.responsavel || input.loja)
    .replaceAll("{{plano}}", input.plano)
    .replaceAll("{{valor}}", input.valor)
    .replaceAll("{{vencimento}}", input.vencimento);
}

export function defaultDailyClosingMessageTemplate() {
  return DEFAULT_DAILY_CLOSING_MESSAGE;
}

export function renderDailyClosingMessage(
  template: string,
  input: {
    loja: string;
    responsavel?: string;
    entrada: string;
    saida: string;
    lucro: string;
    data: string;
  },
) {
  return template
    .replaceAll("{{loja}}", input.loja)
    .replaceAll("{{responsavel}}", input.responsavel || input.loja)
    .replaceAll("{{entrada}}", input.entrada)
    .replaceAll("{{saida}}", input.saida)
    .replaceAll("{{lucro}}", input.lucro)
    .replaceAll("{{data}}", input.data);
}

export async function listDailyStoreResults(date = new Date()): Promise<StoreDailyResult[]> {
  const client = requireSupabase();
  const stores = await listStores();
  const dayStart = date.toISOString().slice(0, 10);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const { data, error } = await client
    .from("financial_entries")
    .select("store_id, type, amount")
    .gte("entry_date", dayStart)
    .lt("entry_date", nextDay.toISOString().slice(0, 10));

  if (error) throw error;

  const totals = new Map<string, { revenue: number; expenses: number }>();
  (data || []).forEach((row) => {
    const entry = row as Pick<EntryRow, "store_id" | "type" | "amount">;
    const current = totals.get(entry.store_id) || { revenue: 0, expenses: 0 };
    if (entry.type === "receita") current.revenue += entry.amount / 100;
    else current.expenses += entry.amount / 100;
    totals.set(entry.store_id, current);
  });

  return stores
    .filter((store) => store.dailyClosingWhatsappEnabled)
    .map((store) => {
      const total = totals.get(store.id) || { revenue: 0, expenses: 0 };
      return {
        storeId: store.id,
        storeName: store.name,
        owner: store.owner,
        plan: store.plan,
        revenue: total.revenue,
        expenses: total.expenses,
        profit: total.revenue - total.expenses,
      };
    });
}

export async function listStoreOperationalAlerts(
  storeId: string,
  month = new Date(),
): Promise<StoreOperationalAlert[]> {
  const store = (await listStores()).find((item) => item.id === storeId);
  if (!store || !planHasAlerts(store.plan)) return [];

  const goals = await getGoals(storeId, month);
  const range = monthRange(month);
  const entries = await listEntries(storeId, range.start, range.end);
  const revenue = sumEntries(entries, "receita");
  const expenses = sumEntries(entries, "despesa");
  const profit = revenue - expenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const alerts: StoreOperationalAlert[] = [];

  if (goals.margin > 0 && revenue > 0 && margin < goals.margin) {
    alerts.push({
      id: "margin-low",
      type: "margin",
      severity: margin < goals.margin * 0.75 ? "critico" : "atencao",
      title: "Margem abaixo da meta",
      message: `Margem atual de ${margin.toFixed(1)}% contra meta de ${goals.margin.toFixed(1)}%.`,
    });
  }

  if (goals.revenue > 0) {
    const today = new Date();
    const daysInMonth = endOfMonth(month).getDate();
    const elapsedDays = Math.min(today.getDate(), daysInMonth);
    const expectedRevenue = goals.revenue * (elapsedDays / daysInMonth);
    if (revenue < expectedRevenue * 0.85) {
      alerts.push({
        id: "revenue-goal-behind",
        type: "revenue_goal",
        severity: revenue < expectedRevenue * 0.6 ? "critico" : "atencao",
        title: "Meta mensal abaixo do ritmo",
        message: `Vendas do mes em ${formatBRL(revenue)}. Para cumprir a meta mensal, o ritmo esperado ate hoje seria ${formatBRL(expectedRevenue)}.`,
      });
    }
  }

  if (goals.maxExpenses > 0 && expenses >= goals.maxExpenses * 0.85) {
    alerts.push({
      id: "expenses-near-limit",
      type: "expense_goal",
      severity: expenses >= goals.maxExpenses ? "critico" : "atencao",
      title: "Despesas perto do limite",
      message: `Despesas em ${formatBRL(expenses)} de um limite mensal de ${formatBRL(goals.maxExpenses)}.`,
    });
  }

  return alerts;
}

export async function listAdminAlerts(): Promise<AdminAlert[]> {
  const subscriptions = await listSubscriptions();
  const alerts: AdminAlert[] = [];
  const now = new Date();

  subscriptions
    .filter((subscription) => subscription.payStatus !== "cancelada")
    .forEach((subscription) => {
      const dueDate = parseISO(subscription.nextCharge);
      const daysToDue = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      if (subscription.payStatus === "em_atraso" || daysToDue < 0) {
        alerts.push({
          id: `billing-overdue-${subscription.id}`,
          severity: "critico",
          store: subscription.storeName,
          message: `Assinatura vencida em ${format(dueDate, "dd/MM/yyyy", { locale: ptBR })}.`,
          date: subscription.nextCharge,
        });
        return;
      }

      if (daysToDue <= 5) {
        alerts.push({
          id: `billing-due-${subscription.id}`,
          severity: "atencao",
          store: subscription.storeName,
          message: `Proximo pagamento em ${format(dueDate, "dd/MM/yyyy", { locale: ptBR })}.`,
          date: subscription.nextCharge,
        });
      }
    });

  if (now.getDate() === 1) {
    alerts.unshift({
      id: "monthly-billing-day",
      severity: "atencao",
      store: "Faturamento mensal",
      message: "Hoje e dia 1: confira e envie o faturamento mensal das lojas ativas.",
      date: now.toISOString(),
    });
  }

  if (!alerts.length) {
    alerts.push({
      id: "all-good",
      severity: "info",
      store: "Base Caixa Local",
      message: "Nenhum vencimento proximo ou assinatura em atraso.",
      date: new Date().toISOString(),
    });
  }

  return alerts;
}

async function hydrateStore(row: StoreRow): Promise<Store> {
  const entries = await listEntries(row.id);
  const goals = await getGoals(row.id).catch(() => undefined);
  const monthRevenue = sumEntries(entries, "receita");
  const logoUrl = row.logo_path ? await getStoreLogoUrl(row.logo_path) : null;

  return {
    id: row.id,
    name: row.name,
    owner: row.owner_name,
    segment: row.segment,
    status: row.status,
    plan: row.plan,
    lastAccess: row.last_access_at,
    monthRevenue,
    risk: computeRisk(entries, goals),
    city: row.city,
    cnpj: row.cnpj,
    dailyClosingWhatsappEnabled: Boolean(row.daily_closing_whatsapp_enabled),
    logoPath: row.logo_path || null,
    logoUrl,
    defaultCommissionPercent: Number(row.default_commission_percent ?? 1),
  };
}

async function getStoreLogoUrl(path: string) {
  const client = requireSupabase();
  const { data, error } = await client.storage.from("store-logos").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

/*
      alerts.push({
        id: `risk-${store.id}`,
        severity: "critico",
        store: store.name,
        message: "Indicadores financeiros em nível crítico.",
        date: store.lastAccess || new Date().toISOString(),
      });
    } else if (store.risk === "atencao") {
      alerts.push({
        id: `risk-${store.id}`,
        severity: "atencao",
        store: store.name,
        message: "Margem, meta ou despesas pedem atenção.",
        date: store.lastAccess || new Date().toISOString(),
      });
    }
  });

  subscriptions
    .filter((subscription) => subscription.payStatus === "em_atraso")
    .forEach((subscription) => {
      alerts.push({
        id: `billing-${subscription.id}`,
        severity: "critico",
        store: subscription.storeName,
        message: "Cobrança em atraso.",
        date: subscription.nextCharge,
      });
    });

  if (!alerts.length) {
    alerts.push({
      id: "all-good",
      severity: "info",
      store: "Base Caixa Local",
      message: "Nenhum alerta operacional crítico no momento.",
      date: new Date().toISOString(),
    });
  }

  return alerts;
}

async function unusedHydrateStore(row: StoreRow): Promise<Store> {
  const entries = await listEntries(row.id);
  const goals = await getGoals(row.id).catch(() => undefined);
  const monthRevenue = sumEntries(entries, "receita");

  return {
    id: row.id,
    name: row.name,
    owner: row.owner_name,
    segment: row.segment,
    status: row.status,
    plan: row.plan,
    lastAccess: row.last_access_at,
    monthRevenue,
    risk: computeRisk(entries, goals),
    city: row.city,
    cnpj: row.cnpj,
  };
}
*/

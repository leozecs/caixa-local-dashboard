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

type SubscriptionPlanDbRow = {
  id: string;
  name: string;
  amount: number;
  description: string | null;
  active: boolean;
  sort_order: number;
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

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "default-economico",
    name: "Economico",
    amount: 59.99,
    description:
      "Para lojas que precisam controlar o caixa sem complexidade. Inclui lancamentos de receita e despesa, dashboard mensal do mes atual, metas de faturamento e despesa, relatorios de lucro total, gastos totais e categorias configuraveis. Limite: 1 usuario por loja.",
    active: true,
    sortOrder: 1,
  },
  {
    id: "default-essencial",
    name: "Essencial",
    amount: 99.99,
    description:
      "Melhor custo-beneficio para acompanhar a operacao com alertas. Inclui tudo do Economico, alerta de margem, alerta de despesa, alerta de meta atrasada, historico mensal comparativo, ate 3 usuarios por loja e suporte por WhatsApp em ate 1 dia util.",
    active: true,
    sortOrder: 2,
  },
  {
    id: "default-gestao-local",
    name: "Gestao Local",
    amount: 149.99,
    description:
      "Plano consultivo para o cliente entender onde ganhou, perdeu e pode melhorar. Inclui tudo do Essencial, relatorio interpretado, pontos de atencao em abas filtraveis, sugestao mensal personalizada de economia, acesso ao Meu Consultor IA, ate 5 usuarios por loja e suporte por WhatsApp em ate 2h em dias uteis no horario comercial; fora do horario comercial e fins de semana, resposta em ate 1 dia.",
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
  const { data, error } = await client.from("profiles").select("id, email, name, role").single();

  if (error) throw error;
  return data as Profile;
}

export async function getCurrentStore(profile: Profile) {
  const client = requireSupabase();

  if (profile.role === "owner") {
    const stores = await listStores();
    return stores[0] ?? null;
  }

  const { data, error } = await client
    .from("store_members")
    .select("stores(*)")
    .eq("user_id", profile.id)
    .limit(1)
    .single();

  if (error) throw error;
  const store = Array.isArray(data.stores) ? data.stores[0] : data.stores;
  if (!store) return null;

  return hydrateStore(store as StoreRow);
}

export async function listStores() {
  const client = requireSupabase();
  const { data, error } = await client.from("stores").select("*").order("created_at", {
    ascending: false,
  });

  if (error) throw error;
  return Promise.all((data || []).map((row) => hydrateStore(row as StoreRow)));
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
  const { data, error } = await client
    .from("stores")
    .update({
      name: input.name,
      owner_name: input.owner,
      segment: input.segment,
      city: input.city,
      status: input.status,
      plan: input.plan,
      cnpj: input.cnpj,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return hydrateStore(data as StoreRow);
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
  const payload = {
    store_id: entry.storeId,
    entry_date: entry.date.slice(0, 10),
    type: entry.type,
    category: entry.category,
    description: entry.description || null,
    payment_method: entry.paymentMethod,
    amount: Math.round(entry.amount * 100),
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
    : { revenue: 45000, margin: 22, maxExpenses: 30000 };
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

  return ((data || []) as SubscriptionDbRow[]).map((row) => ({
    id: row.id,
    storeId: row.store_id,
    storeName: storeNameFromJoin(row),
    plan: row.plan,
    amount: row.amount / 100,
    nextCharge: row.next_charge_date,
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

export async function listAdminAlerts(): Promise<AdminAlert[]> {
  const stores = await listStores();
  const subscriptions = await listSubscriptions();
  const alerts: AdminAlert[] = [];

  stores.forEach((store) => {
    if (store.risk === "critico") {
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

async function hydrateStore(row: StoreRow): Promise<Store> {
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

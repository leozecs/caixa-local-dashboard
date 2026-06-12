import { addMonths, endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireSupabase } from "@/lib/supabase";
import type { Profile } from "@/lib/auth";

export type StoreStatus = "ativa" | "pendente" | "trial" | "cancelada" | "bloqueada";
export type Risk = "saudavel" | "atencao" | "critico";
export type EntryType = "receita" | "despesa";
export type PaymentMethod = "Pix" | "Cartão" | "Dinheiro" | "Boleto" | "Transferência";
export type Plan = string;
export type SubscriptionStatus =
  | "ativa"
  | "aguardando_pagamento"
  | "em_dia"
  | "em_atraso"
  | "trial"
  | "cancelada"
  | "bloqueada";
export type SubscriptionProofStatus =
  | "pago"
  | "pendente"
  | "atrasado"
  | "cancelado"
  | "em_analise"
  | "recusado";
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
  profileType: "vendas" | "pessoal";
  personalFocus?: string | null;
  status: StoreStatus;
  plan: Plan;
  lastAccess: string | null;
  monthRevenue: number;
  risk: Risk;
  city: string;
  cnpj?: string | null;
  dailyClosingWhatsappEnabled?: boolean;
  revenueGoalAlertEnabled?: boolean;
  expenseGoalAlertEnabled?: boolean;
  employeeCommissionsEnabled?: boolean;
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
  saleTotalAmount?: number | null;
  productCostAmount?: number | null;
  salespersonName?: string | null;
  commissionPercent?: number | null;
  commissionAmount?: number;
  downPaymentAmount?: number | null;
  installments?: number;
  importSource?: string | null;
  isRecurring?: boolean;
  recurringParentId?: string | null;
  recurringMonth?: string | null;
}

export interface StoreCategory {
  id: string;
  storeId: string;
  type: EntryType;
  name: string;
  sortOrder: number;
}

export interface StoreAttendant {
  id: string;
  storeId: string;
  name: string;
  commissionPercent: number;
  createdAt: string;
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

export interface NoteTopic {
  id: string;
  storeId: string;
  title: string;
  sortOrder: number;
  createdAt: string;
}

export interface NoteBlock {
  id: string;
  storeId: string;
  topicId: string;
  title: string;
  content: string;
  sortOrder: number;
  updatedAt: string;
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
  paymentLink?: string | null;
  pixCopyPaste?: string | null;
  pixQrCodeUrl?: string | null;
}

export interface BillingRecord {
  id: string;
  storeId: string;
  subscriptionId: string | null;
  referenceMonth: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: SubscriptionProofStatus;
  notes: string | null;
}

export interface SubscriptionPaymentProof {
  id: string;
  storeId: string;
  subscriptionId: string | null;
  billingRecordId: string | null;
  amount: number;
  dueDate: string;
  filePath: string;
  fileName: string;
  fileType: string | null;
  fileSize: number;
  status: SubscriptionProofStatus;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
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

export interface StoreOperationalAlert {
  id: string;
  type: "daily_closing" | "margin" | "revenue_goal" | "expense_goal";
  severity: "info" | "atencao" | "critico";
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
  profile_type?: "vendas" | "pessoal" | null;
  personal_focus?: string | null;
  status: StoreStatus;
  plan: Plan;
  last_access_at: string | null;
  city: string;
  cnpj: string | null;
  daily_closing_whatsapp_enabled?: boolean | null;
  revenue_goal_alert_enabled?: boolean | null;
  expense_goal_alert_enabled?: boolean | null;
  employee_commissions_enabled?: boolean | null;
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
  sale_total_amount?: number | null;
  product_cost_amount?: number | null;
  salesperson_name?: string | null;
  commission_percent?: number | null;
  commission_amount?: number | null;
  down_payment_amount?: number | null;
  installments?: number | null;
  import_source?: string | null;
  is_recurring?: boolean | null;
  recurring_parent_id?: string | null;
  recurring_month?: string | null;
};

type StoreCategoryDbRow = {
  id: string;
  store_id: string;
  type: EntryType;
  name: string;
  sort_order: number;
};

type StoreAttendantDbRow = {
  id: string;
  store_id: string;
  name: string;
  commission_percent: number;
  created_at: string;
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

type NoteTopicDbRow = {
  id: string;
  store_id: string;
  title: string;
  sort_order: number;
  created_at: string;
};

type NoteBlockDbRow = {
  id: string;
  store_id: string;
  topic_id: string;
  title: string;
  content: string | null;
  sort_order: number;
  updated_at: string;
  created_at: string;
};

type SubscriptionDbRow = {
  id: string;
  store_id: string;
  plan: Plan;
  amount: number;
  next_charge_date: string;
  status: SubscriptionStatus;
  payment_link?: string | null;
  pix_copy_paste?: string | null;
  pix_qr_code_url?: string | null;
  stores?: { name: string } | { name: string }[] | null;
};

type BillingRecordDbRow = {
  id: string;
  store_id: string;
  subscription_id: string | null;
  reference_month: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: SubscriptionProofStatus;
  notes: string | null;
};

type SubscriptionPaymentProofDbRow = {
  id: string;
  store_id: string;
  subscription_id: string | null;
  billing_record_id: string | null;
  amount: number;
  due_date: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number;
  status: SubscriptionProofStatus;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  subscriptions?: SubscriptionDbRow | SubscriptionDbRow[] | null;
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
  created_at: string;
  profiles?:
    | { id: string; email: string; name: string }
    | { id: string; email: string; name: string }[]
    | null;
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

function formatDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export const INSTALLMENT_CALENDAR_MONTHS = 36;

function installmentCalendarEnd(from = new Date()) {
  return addMonths(startOfMonth(from), INSTALLMENT_CALENDAR_MONTHS);
}

function minDate(left: Date, right: Date) {
  return left.getTime() < right.getTime() ? left : right;
}

function recurringMaterializationEnd(end: string) {
  const requestedEnd = parseISO(end);
  const currentMonthEnd = addMonths(startOfMonth(new Date()), 1);
  return requestedEnd.getTime() < currentMonthEnd.getTime() ? requestedEnd : currentMonthEnd;
}

function monthlyOccurrenceDate(seedDate: Date, month: Date) {
  const day = seedDate.getDate();
  const monthEnd = endOfMonth(month).getDate();
  return new Date(month.getFullYear(), month.getMonth(), Math.min(day, monthEnd));
}

function installmentLimitForRow(row: Pick<EntryRow, "installments">) {
  return (row.installments ?? 1) > 1
    ? Math.min(row.installments ?? 1, INSTALLMENT_CALENDAR_MONTHS)
    : null;
}

function buildProjectedInstallmentMonthKeys(seed: Pick<EntryRow, "entry_date" | "installments">) {
  const installmentLimit = installmentLimitForRow(seed);
  if (!installmentLimit) return [];

  const seedMonth = startOfMonth(parseISO(seed.entry_date));
  return Array.from({ length: installmentLimit }, (_, index) =>
    formatDateKey(addMonths(seedMonth, index)),
  );
}

async function ensureRecurringEntries(
  client: ReturnType<typeof requireSupabase>,
  storeId: string,
  start: string,
  end: string,
) {
  const rangeStart = parseISO(start);
  const requestedEnd = parseISO(end);
  if (requestedEnd.getTime() <= rangeStart.getTime()) return;

  const calendarEnd = installmentCalendarEnd();
  const seedQueryEnd = minDate(requestedEnd, calendarEnd);
  if (seedQueryEnd.getTime() <= rangeStart.getTime()) return;

  const { data: seeds, error } = await client
    .from("financial_entries")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_recurring", true)
    .is("recurring_parent_id", null)
    .lt("entry_date", formatDateKey(seedQueryEnd));

  if (error) throw error;
  if (!seeds?.length) return;

  const rows = (seeds as EntryRow[]).flatMap((seed) => {
    const seedDate = parseISO(seed.entry_date);
    const seedMonth = startOfMonth(seedDate);
    const installmentLimit = installmentLimitForRow(seed);
    const rangeEnd = installmentLimit
      ? minDate(requestedEnd, calendarEnd)
      : recurringMaterializationEnd(end);
    const occurrences: Array<Record<string, unknown>> = [];
    let cursor = seedMonth;
    let occurrenceIndex = 0;

    while (cursor.getTime() < rangeEnd.getTime()) {
      const occurrenceDate = monthlyOccurrenceDate(seedDate, cursor);
      const isSeedMonth = cursor.getTime() === seedMonth.getTime();
      const installmentNumber = occurrenceIndex + 1;
      const isInRange =
        occurrenceDate.getTime() >= rangeStart.getTime() &&
        occurrenceDate.getTime() < rangeEnd.getTime();

      if (
        !isSeedMonth &&
        isInRange &&
        (!installmentLimit || installmentNumber <= installmentLimit)
      ) {
        occurrences.push({
          store_id: seed.store_id,
          entry_date: formatDateKey(occurrenceDate),
          type: seed.type,
          category: seed.category,
          description: seed.description,
          payment_method: seed.payment_method,
          amount: seed.amount,
          sale_total_amount: seed.sale_total_amount ?? null,
          product_cost_amount: seed.product_cost_amount ?? null,
          salesperson_name: seed.salesperson_name ?? null,
          commission_percent: seed.commission_percent ?? null,
          commission_amount: seed.commission_amount ?? 0,
          down_payment_amount: seed.down_payment_amount ?? null,
          installments: seed.installments ?? 1,
          import_source: seed.import_source ?? null,
          is_recurring: true,
          recurring_parent_id: seed.id,
          recurring_month: formatDateKey(cursor),
          updated_at: new Date().toISOString(),
        });
      }

      cursor = addMonths(cursor, 1);
      occurrenceIndex += 1;
      if (installmentLimit && occurrenceIndex >= installmentLimit) break;
    }

    return occurrences;
  });

  if (!rows.length) return;

  const parentIds = Array.from(new Set(rows.map((row) => String(row.recurring_parent_id))));
  const recurringMonths = Array.from(new Set(rows.map((row) => String(row.recurring_month))));
  const { data: existingRows, error: existingError } = await client
    .from("financial_entries")
    .select("recurring_parent_id, recurring_month")
    .eq("store_id", storeId)
    .in("recurring_parent_id", parentIds)
    .in("recurring_month", recurringMonths);

  if (existingError) throw existingError;

  const existingKeys = new Set(
    (existingRows || []).map((row) => `${row.recurring_parent_id}:${row.recurring_month}`),
  );
  const rowsToInsert = rows.filter(
    (row) => !existingKeys.has(`${row.recurring_parent_id}:${row.recurring_month}`),
  );

  if (!rowsToInsert.length) return;

  const { error: insertError } = await client.from("financial_entries").insert(rowsToInsert);
  if (insertError) throw insertError;
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
    saleTotalAmount:
      row.sale_total_amount === null || row.sale_total_amount === undefined
        ? null
        : row.sale_total_amount / 100,
    productCostAmount:
      row.product_cost_amount === null || row.product_cost_amount === undefined
        ? null
        : row.product_cost_amount / 100,
    salespersonName: row.salesperson_name || null,
    commissionPercent:
      row.commission_percent === null || row.commission_percent === undefined
        ? null
        : Number(row.commission_percent),
    commissionAmount: (row.commission_amount || 0) / 100,
    downPaymentAmount:
      row.down_payment_amount === null || row.down_payment_amount === undefined
        ? null
        : row.down_payment_amount / 100,
    installments: row.installments ?? 1,
    importSource: row.import_source || null,
    isRecurring: Boolean(row.is_recurring),
    recurringParentId: row.recurring_parent_id || null,
    recurringMonth: row.recurring_month || null,
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

function toStoreAttendant(row: StoreAttendantDbRow): StoreAttendant {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    commissionPercent: Number(row.commission_percent),
    createdAt: row.created_at,
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

function toNoteTopic(row: NoteTopicDbRow): NoteTopic {
  return {
    id: row.id,
    storeId: row.store_id,
    title: row.title,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function toNoteBlock(row: NoteBlockDbRow): NoteBlock {
  return {
    id: row.id,
    storeId: row.store_id,
    topicId: row.topic_id,
    title: row.title,
    content: row.content || "",
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
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

function isDefaultStoreCategoryId(id: string) {
  return id.startsWith("default-");
}

function categoryKey(type: EntryType, name: string) {
  return `${type}:${name.trim().toLowerCase()}`;
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

function toBillingRecord(row: BillingRecordDbRow): BillingRecord {
  return {
    id: row.id,
    storeId: row.store_id,
    subscriptionId: row.subscription_id,
    referenceMonth: row.reference_month,
    amount: row.amount / 100,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    status: row.status,
    notes: row.notes,
  };
}

function toSubscriptionPaymentProof(row: SubscriptionPaymentProofDbRow): SubscriptionPaymentProof {
  return {
    id: row.id,
    storeId: row.store_id,
    subscriptionId: row.subscription_id,
    billingRecordId: row.billing_record_id,
    amount: row.amount / 100,
    dueDate: row.due_date,
    filePath: row.file_path,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    status: row.status,
    reviewNotes: row.review_notes,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
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

function isMissingTableError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: string }).code
      : "";
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : "";

  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("Could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

function notesSchemaError() {
  return new Error(
    "A aba Anotacoes ainda precisa da migracao 20260612120000_store_notes.sql aplicada no Supabase.",
  );
}

function isMissingColumnError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42703"
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
    if (isMissingTableError(error)) throw notesSchemaError();
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
  if (error && isMissingTableError(error)) throw notesSchemaError();
  if (error) throw error;
  return toSubscriptionPlan(data as SubscriptionPlanDbRow);
}

export async function deleteSubscriptionPlan(id: string) {
  const client = requireSupabase();
  const { error } = await client.from("subscription_plans").delete().eq("id", id);
  if (error && isMissingTableError(error)) throw notesSchemaError();
  if (error) throw error;
}

async function getPlanAmount(planName: string) {
  const plans = await listSubscriptionPlans({ activeOnly: false });
  return plans.find((plan) => plan.name === planName)?.amount ?? 0;
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
  profileType?: "vendas" | "pessoal";
  personalFocus?: string | null;
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
  if (input.profileType !== undefined) payload.profile_type = input.profileType;
  if (input.personalFocus !== undefined) payload.personal_focus = input.personalFocus;
  if (input.city !== undefined) payload.city = input.city;
  if (input.status !== undefined) payload.status = input.status;
  if (input.plan !== undefined) payload.plan = input.plan;
  if (input.cnpj !== undefined) payload.cnpj = input.cnpj;
  if (input.dailyClosingWhatsappEnabled !== undefined) {
    payload.daily_closing_whatsapp_enabled = input.dailyClosingWhatsappEnabled;
  }
  if (input.revenueGoalAlertEnabled !== undefined) {
    payload.revenue_goal_alert_enabled = input.revenueGoalAlertEnabled;
  }
  if (input.expenseGoalAlertEnabled !== undefined) {
    payload.expense_goal_alert_enabled = input.expenseGoalAlertEnabled;
  }
  if (input.employeeCommissionsEnabled !== undefined) {
    payload.employee_commissions_enabled = input.employeeCommissionsEnabled;
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

  if (error) {
    if (isMissingColumnError(error)) {
      throw new Error(
        "Preferencia ainda nao existe no banco. Aplique as migrations do Supabase e tente novamente.",
      );
    }
    throw error;
  }
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

async function ensureStoreCategoryRows(storeId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("store_categories")
    .select("id, store_id, type, name, sort_order")
    .eq("store_id", storeId);

  if (error) {
    if (isMissingTableError(error)) throw new Error("Categorias ainda nao estao disponiveis.");
    throw error;
  }

  const existing = ((data || []) as StoreCategoryDbRow[]).map(toStoreCategory);
  const existingKeys = new Set(
    existing.map((category) => categoryKey(category.type, category.name)),
  );
  const missingDefaults = defaultStoreCategories(storeId).filter(
    (category) => !existingKeys.has(categoryKey(category.type, category.name)),
  );

  if (missingDefaults.length) {
    const { error: insertError } = await client.from("store_categories").insert(
      missingDefaults.map((category) => ({
        store_id: category.storeId,
        type: category.type,
        name: category.name,
        sort_order: category.sortOrder,
      })),
    );

    if (insertError) throw insertError;
  }

  return listStoreCategories(storeId);
}

async function resolveStoreCategoryId(input: {
  id: string;
  storeId: string;
  type: EntryType;
  name: string;
}) {
  if (!isDefaultStoreCategoryId(input.id)) return input.id;

  const categories = await ensureStoreCategoryRows(input.storeId);
  const persisted = categories.find(
    (category) =>
      !isDefaultStoreCategoryId(category.id) &&
      category.storeId === input.storeId &&
      categoryKey(category.type, category.name) === categoryKey(input.type, input.name),
  );

  if (!persisted) throw new Error("Nao foi possivel preparar a categoria para edicao.");
  return persisted.id;
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

export async function updateStoreCategory(input: {
  id: string;
  storeId: string;
  type: EntryType;
  name: string;
  currentName: string;
}) {
  const client = requireSupabase();
  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome da categoria.");
  const categoryId = await resolveStoreCategoryId({
    id: input.id,
    storeId: input.storeId,
    type: input.type,
    name: input.currentName,
  });

  const { data, error } = await client
    .from("store_categories")
    .update({
      type: input.type,
      name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId)
    .select("id, store_id, type, name, sort_order")
    .single();

  if (error) throw error;
  return toStoreCategory(data as StoreCategoryDbRow);
}

export async function deleteStoreCategory(input: {
  id: string;
  storeId: string;
  type: EntryType;
  name: string;
}) {
  const client = requireSupabase();
  const categoryId = await resolveStoreCategoryId(input);
  const { error } = await client.from("store_categories").delete().eq("id", categoryId);
  if (error) throw error;
}

export async function listStoreAttendants(storeId: string): Promise<StoreAttendant[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("store_attendants")
    .select("id, store_id, name, commission_percent, created_at")
    .eq("store_id", storeId)
    .order("name", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }

  return ((data || []) as StoreAttendantDbRow[]).map(toStoreAttendant);
}

export async function createStoreAttendant(input: {
  storeId: string;
  name: string;
  commissionPercent: number;
}) {
  const client = requireSupabase();
  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome do atendente.");

  const { data, error } = await client
    .from("store_attendants")
    .insert({
      store_id: input.storeId,
      name,
      commission_percent: input.commissionPercent,
    })
    .select("id, store_id, name, commission_percent, created_at")
    .single();

  if (error) throw error;
  return toStoreAttendant(data as StoreAttendantDbRow);
}

export async function updateStoreAttendant(input: {
  id: string;
  name: string;
  commissionPercent: number;
}) {
  const client = requireSupabase();
  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome do atendente.");

  const { data, error } = await client
    .from("store_attendants")
    .update({
      name,
      commission_percent: input.commissionPercent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("id, store_id, name, commission_percent, created_at")
    .single();

  if (error) throw error;
  return toStoreAttendant(data as StoreAttendantDbRow);
}

export async function deleteStoreAttendant(id: string) {
  const client = requireSupabase();
  const { error } = await client.from("store_attendants").delete().eq("id", id);
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

  const extension =
    input.file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^\w]+/g, "") || "png";
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
    input.status === "trial"
      ? "trial"
      : input.status === "pendente"
        ? "aguardando_pagamento"
        : input.status === "bloqueada"
          ? "bloqueada"
          : input.status === "cancelada"
            ? "cancelada"
            : "ativa";

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

export async function markSubscriptionExempt(input: { storeId: string; subscriptionId: string }) {
  const client = requireSupabase();
  const nextCharge = format(addMonths(new Date(), 12), "yyyy-MM-dd");

  const { error: subscriptionError } = await client
    .from("subscriptions")
    .update({
      amount: 0,
      status: "ativa",
      next_charge_date: nextCharge,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.subscriptionId);

  if (subscriptionError) throw subscriptionError;

  const { error: storeError } = await client
    .from("stores")
    .update({ status: "ativa", updated_at: new Date().toISOString() })
    .eq("id", input.storeId);

  if (storeError) throw storeError;
}

export async function listEntries(storeId: string, start?: string, end?: string) {
  const client = requireSupabase();
  const range = start && end ? { start, end } : monthRange();
  await ensureRecurringEntries(client, storeId, range.start, range.end);
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

export async function listEntryMonths(storeId: string) {
  const client = requireSupabase();
  await ensureRecurringEntries(
    client,
    storeId,
    "2000-01-01",
    formatDateKey(installmentCalendarEnd()),
  );

  const { data, error } = await client
    .from("financial_entries")
    .select("entry_date, installments, is_recurring, recurring_parent_id")
    .eq("store_id", storeId)
    .order("entry_date", { ascending: false });

  if (error) throw error;

  const monthKeys = new Set<string>();
  (data || []).forEach((row) => {
    monthKeys.add(formatDateKey(startOfMonth(parseISO(String(row.entry_date)))));
    const entryRow = row as Pick<EntryRow, "entry_date" | "installments" | "recurring_parent_id">;
    if (!entryRow.recurring_parent_id) {
      buildProjectedInstallmentMonthKeys(entryRow).forEach((monthKey) => monthKeys.add(monthKey));
    }
  });

  return Array.from(monthKeys).sort((left, right) => (left > right ? -1 : 1));
}

function installmentCountFor(entry: Pick<Entry, "installments">) {
  return Math.max(1, Math.min(INSTALLMENT_CALENDAR_MONTHS, Math.round(entry.installments || 1)));
}

function buildInstallmentChildRows(parent: EntryRow) {
  const installments = installmentCountFor({ installments: parent.installments ?? 1 });
  if (installments <= 1) return [];

  const seedDate = parseISO(parent.entry_date);
  const seedMonth = startOfMonth(seedDate);
  const timestamp = new Date().toISOString();
  const rows: Array<Record<string, unknown>> = [];

  for (let index = 1; index < installments; index += 1) {
    const cursor = addMonths(seedMonth, index);
    const occurrenceDate = monthlyOccurrenceDate(seedDate, cursor);
    rows.push({
      store_id: parent.store_id,
      entry_date: formatDateKey(occurrenceDate),
      type: parent.type,
      category: parent.category,
      description: parent.description,
      payment_method: parent.payment_method,
      amount: parent.amount,
      sale_total_amount: parent.sale_total_amount ?? null,
      product_cost_amount: parent.product_cost_amount ?? null,
      salesperson_name: parent.salesperson_name ?? null,
      commission_percent: parent.commission_percent ?? null,
      commission_amount: parent.commission_amount ?? 0,
      down_payment_amount: parent.down_payment_amount ?? null,
      installments,
      import_source: parent.import_source ?? null,
      is_recurring: true,
      recurring_parent_id: parent.id,
      recurring_month: formatDateKey(cursor),
      updated_at: timestamp,
    });
  }

  return rows;
}

async function refreshInstallmentChildren(
  client: ReturnType<typeof requireSupabase>,
  parent: EntryRow,
) {
  const { error: deleteError } = await client
    .from("financial_entries")
    .delete()
    .eq("store_id", parent.store_id)
    .eq("recurring_parent_id", parent.id);

  if (deleteError) throw deleteError;

  const rows = buildInstallmentChildRows(parent);
  if (!rows.length) return;

  const { error: insertError } = await client.from("financial_entries").insert(rows);
  if (insertError) throw insertError;
}

export async function saveEntry(entry: Omit<Entry, "id"> & { id?: string }) {
  const client = requireSupabase();
  const installments = installmentCountFor(entry);
  const commissionPercent =
    entry.type === "receita" &&
    entry.commissionPercent !== null &&
    entry.commissionPercent !== undefined
      ? Number(entry.commissionPercent)
      : null;
  const commissionAmount =
    entry.type === "receita" && commissionPercent !== null
      ? Math.round((entry.saleTotalAmount ?? entry.amount) * (commissionPercent / 100) * 100)
      : 0;
  const payload = {
    store_id: entry.storeId,
    entry_date: entry.date.slice(0, 10),
    type: entry.type,
    category: entry.category,
    description: entry.description || null,
    payment_method: entry.paymentMethod,
    amount: Math.round(entry.amount * 100),
    sale_total_amount:
      entry.saleTotalAmount !== null && entry.saleTotalAmount !== undefined
        ? Math.round(entry.saleTotalAmount * 100)
        : null,
    product_cost_amount:
      entry.type === "receita" &&
      entry.productCostAmount !== null &&
      entry.productCostAmount !== undefined
        ? Math.round(entry.productCostAmount * 100)
        : null,
    salesperson_name: entry.type === "receita" ? entry.salespersonName?.trim() || null : null,
    commission_percent: commissionPercent,
    commission_amount: commissionAmount,
    down_payment_amount:
      entry.type === "receita" &&
      entry.downPaymentAmount !== null &&
      entry.downPaymentAmount !== undefined
        ? Math.round(entry.downPaymentAmount * 100)
        : null,
    installments,
    import_source: entry.importSource?.trim() || null,
    is_recurring: installments > 1 || Boolean(entry.isRecurring),
    updated_at: new Date().toISOString(),
  };

  const query = entry.id
    ? client.from("financial_entries").update(payload).eq("id", entry.id)
    : client.from("financial_entries").insert(payload);

  const { data, error } = await query.select().single();
  if (error) throw error;

  const savedEntry = data as EntryRow;
  if (!savedEntry.recurring_parent_id) {
    await refreshInstallmentChildren(client, savedEntry);
  }

  return toEntry(savedEntry);
}

export async function deleteEntriesByImportSource(storeId: string, importSource: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("financial_entries")
    .delete()
    .eq("store_id", storeId)
    .eq("import_source", importSource);

  if (error) throw error;
}

export async function deleteEntry(id: string) {
  const client = requireSupabase();
  const { error } = await client.from("financial_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function listNoteTopics(storeId: string): Promise<NoteTopic[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("note_topics")
    .select("id, store_id, title, sort_order, created_at")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }

  return ((data || []) as NoteTopicDbRow[]).map(toNoteTopic);
}

export async function createNoteTopic(input: { storeId: string; title: string }) {
  const client = requireSupabase();
  const title = input.title.trim();
  if (!title) throw new Error("Informe o nome do tema.");

  const { data, error } = await client
    .from("note_topics")
    .insert({
      store_id: input.storeId,
      title,
      sort_order: 100,
    })
    .select("id, store_id, title, sort_order, created_at")
    .single();

  if (error) throw error;
  return toNoteTopic(data as NoteTopicDbRow);
}

export async function updateNoteTopic(input: { id: string; title: string }) {
  const client = requireSupabase();
  const title = input.title.trim();
  if (!title) throw new Error("Informe o nome do tema.");

  const { data, error } = await client
    .from("note_topics")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", input.id)
    .select("id, store_id, title, sort_order, created_at")
    .single();

  if (error) throw error;
  return toNoteTopic(data as NoteTopicDbRow);
}

export async function deleteNoteTopic(id: string) {
  const client = requireSupabase();
  const { error } = await client.from("note_topics").delete().eq("id", id);
  if (error && isMissingTableError(error)) throw notesSchemaError();
  if (error) throw error;
}

export async function listNoteBlocks(storeId: string): Promise<NoteBlock[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("note_blocks")
    .select("id, store_id, topic_id, title, content, sort_order, updated_at, created_at")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) throw notesSchemaError();
    throw error;
  }

  return ((data || []) as NoteBlockDbRow[]).map(toNoteBlock);
}

export async function createNoteBlock(input: { storeId: string; topicId: string; title: string }) {
  const client = requireSupabase();
  const title = input.title.trim();
  if (!title) throw new Error("Informe o titulo da anotacao.");

  const { data, error } = await client
    .from("note_blocks")
    .insert({
      store_id: input.storeId,
      topic_id: input.topicId,
      title,
      content: "",
      sort_order: 100,
    })
    .select("id, store_id, topic_id, title, content, sort_order, updated_at, created_at")
    .single();

  if (error && isMissingTableError(error)) throw notesSchemaError();
  if (error) throw error;
  return toNoteBlock(data as NoteBlockDbRow);
}

export async function updateNoteBlock(input: { id: string; title: string; content: string }) {
  const client = requireSupabase();
  const title = input.title.trim();
  if (!title) throw new Error("Informe o titulo da anotacao.");

  const { data, error } = await client
    .from("note_blocks")
    .update({
      title,
      content: input.content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("id, store_id, topic_id, title, content, sort_order, updated_at, created_at")
    .single();

  if (error && isMissingTableError(error)) throw notesSchemaError();
  if (error) throw error;
  return toNoteBlock(data as NoteBlockDbRow);
}

export async function deleteNoteBlock(id: string) {
  const client = requireSupabase();
  const { error } = await client.from("note_blocks").delete().eq("id", id);
  if (error && isMissingTableError(error)) throw notesSchemaError();
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
    .select(
      "id, store_id, plan, amount, next_charge_date, status, payment_link, pix_copy_paste, pix_qr_code_url, stores(name)",
    )
    .order("next_charge_date", { ascending: true });

  if (error) throw error;

  const storeIds = ((data || []) as SubscriptionDbRow[]).map((row) => row.store_id);
  const lastPayments = new Map<string, string>();
  if (storeIds.length) {
    const { data: billingRows, error: billingError } = await client
      .from("billing_records")
      .select(
        "id, store_id, subscription_id, reference_month, amount, due_date, paid_at, status, notes",
      )
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
    paymentLink: row.payment_link || null,
    pixCopyPaste: row.pix_copy_paste || null,
    pixQrCodeUrl: row.pix_qr_code_url || null,
  }));
}

export async function getStoreSubscription(storeId: string): Promise<SubscriptionRow | null> {
  const subscriptions = await listSubscriptions();
  return subscriptions.find((subscription) => subscription.storeId === storeId) || null;
}

export async function listBillingRecords(storeId: string): Promise<BillingRecord[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("billing_records")
    .select(
      "id, store_id, subscription_id, reference_month, amount, due_date, paid_at, status, notes",
    )
    .eq("store_id", storeId)
    .order("due_date", { ascending: false })
    .limit(24);

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }

  return ((data || []) as BillingRecordDbRow[]).map(toBillingRecord);
}

export async function listSubscriptionPaymentProofs(
  storeId?: string,
): Promise<SubscriptionPaymentProof[]> {
  const client = requireSupabase();
  let query = client
    .from("subscription_payment_proofs")
    .select(
      "id, store_id, subscription_id, billing_record_id, amount, due_date, file_path, file_name, file_type, file_size, status, review_notes, reviewed_at, created_at",
    )
    .order("created_at", { ascending: false });

  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }

  return ((data || []) as SubscriptionPaymentProofDbRow[]).map(toSubscriptionPaymentProof);
}

export async function uploadSubscriptionPaymentProof(input: {
  storeId: string;
  subscriptionId: string | null;
  amount: number;
  dueDate: string;
  file: File;
}) {
  const client = requireSupabase();
  const safeName = input.file.name.replace(/[^\w.-]+/g, "-");
  const filePath = `${input.storeId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await client.storage
    .from("subscription-proofs")
    .upload(filePath, input.file, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error } = await client
    .from("subscription_payment_proofs")
    .insert({
      store_id: input.storeId,
      subscription_id: input.subscriptionId,
      amount: Math.round(input.amount * 100),
      due_date: input.dueDate,
      file_path: filePath,
      file_name: input.file.name,
      file_type: input.file.type || null,
      file_size: input.file.size,
      status: "em_analise",
    })
    .select(
      "id, store_id, subscription_id, billing_record_id, amount, due_date, file_path, file_name, file_type, file_size, status, review_notes, reviewed_at, created_at",
    )
    .single();

  if (error) throw error;
  return toSubscriptionPaymentProof(data as SubscriptionPaymentProofDbRow);
}

export async function openSubscriptionPaymentProof(proof: SubscriptionPaymentProof) {
  const client = requireSupabase();
  const { data, error } = await client.storage
    .from("subscription-proofs")
    .createSignedUrl(proof.filePath, 60);

  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

export async function approveSubscriptionPaymentProof(proof: SubscriptionPaymentProof) {
  const client = requireSupabase();
  const paidAt = format(new Date(), "yyyy-MM-dd");
  const nextCharge = format(addMonths(parseISO(proof.dueDate), 1), "yyyy-MM-dd");
  const referenceMonth = format(startOfMonth(parseISO(proof.dueDate)), "yyyy-MM-dd");

  const { data: billing, error: billingError } = await client
    .from("billing_records")
    .insert({
      store_id: proof.storeId,
      subscription_id: proof.subscriptionId,
      reference_month: referenceMonth,
      amount: Math.round(proof.amount * 100),
      due_date: proof.dueDate,
      paid_at: paidAt,
      status: "pago",
      notes: `Comprovante validado: ${proof.fileName}`,
    })
    .select("id")
    .single();

  if (billingError) throw billingError;

  const { error: proofError } = await client
    .from("subscription_payment_proofs")
    .update({
      billing_record_id: billing.id,
      status: "pago",
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", proof.id);
  if (proofError) throw proofError;

  if (proof.subscriptionId) {
    const { error: subError } = await client
      .from("subscriptions")
      .update({
        status: "ativa",
        next_charge_date: nextCharge,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proof.subscriptionId);
    if (subError) throw subError;
  }

  const { error: storeError } = await client
    .from("stores")
    .update({ status: "ativa", updated_at: new Date().toISOString() })
    .eq("id", proof.storeId);
  if (storeError) throw storeError;
}

export async function rejectSubscriptionPaymentProof(input: { proofId: string; reason?: string }) {
  const client = requireSupabase();
  const { error } = await client
    .from("subscription_payment_proofs")
    .update({
      status: "recusado",
      review_notes: input.reason?.trim() || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.proofId);

  if (error) throw error;
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
  const today = new Date();
  const selectedMonthStart = startOfMonth(month);
  const currentMonthStart = startOfMonth(today);
  const daysInMonth = endOfMonth(month).getDate();
  const elapsedDays =
    selectedMonthStart.getTime() === currentMonthStart.getTime()
      ? Math.min(today.getDate(), daysInMonth)
      : daysInMonth;
  const todayKey = today.toISOString().slice(0, 10);
  const todayEntries = entries.filter((entry) => entry.date === todayKey);
  const todayRevenue = sumEntries(todayEntries, "receita");
  const todayExpenses = sumEntries(todayEntries, "despesa");
  const todayProfit = todayRevenue - todayExpenses;

  if (store.dailyClosingWhatsappEnabled) {
    alerts.push({
      id: "daily-closing",
      type: "daily_closing",
      severity: todayProfit < 0 ? "atencao" : "info",
      title: "Fechamento do dia",
      message: `${formatBRL(todayRevenue)} entrou, ${formatBRL(todayExpenses)} saiu e o saldo do dia ficou em ${formatBRL(todayProfit)}.`,
    });
  }

  if (goals.margin > 0 && revenue > 0 && margin < goals.margin) {
    alerts.push({
      id: "margin-low",
      type: "margin",
      severity: margin < goals.margin * 0.75 ? "critico" : "atencao",
      title: "Margem abaixo da meta",
      message: `Margem atual de ${margin.toFixed(1)}% contra meta de ${goals.margin.toFixed(1)}%.`,
    });
  }

  if (store.revenueGoalAlertEnabled !== false && goals.revenue > 0) {
    const expectedRevenue = goals.revenue * (elapsedDays / daysInMonth);
    if (revenue < expectedRevenue * 0.85) {
      const dailyTarget = goals.revenue / daysInMonth;
      alerts.push({
        id: "revenue-goal-behind",
        type: "revenue_goal",
        severity: revenue < expectedRevenue * 0.6 ? "critico" : "atencao",
        title: "Meta mensal abaixo do ritmo",
        message: `Vendas do mes em ${formatBRL(revenue)}. Pelo ritmo diario de ${formatBRL(dailyTarget)}, o esperado ate o dia ${elapsedDays} seria ${formatBRL(expectedRevenue)}.`,
      });
    }
  }

  if (store.expenseGoalAlertEnabled !== false && goals.maxExpenses > 0) {
    const expectedExpenses = goals.maxExpenses * (elapsedDays / daysInMonth);
    const projectedAlertLimit = expectedExpenses * 0.8;
    const monthlyAlertLimit = goals.maxExpenses * 0.8;
    const alertLimit = Math.min(projectedAlertLimit, monthlyAlertLimit);
    if (expenses < alertLimit) return alerts;

    alerts.push({
      id: "expenses-near-limit",
      type: "expense_goal",
      severity: expenses >= expectedExpenses ? "critico" : "atencao",
      title: "Despesas perto do limite",
      message: `Despesas em ${formatBRL(expenses)}. Pelo limite mensal de ${formatBRL(goals.maxExpenses)}, o teto proporcional ate o dia ${elapsedDays} e ${formatBRL(expectedExpenses)}.`,
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
    profileType: row.profile_type || "vendas",
    personalFocus: row.personal_focus || null,
    status: row.status,
    plan: row.plan,
    lastAccess: row.last_access_at,
    monthRevenue,
    risk: computeRisk(entries, goals),
    city: row.city,
    cnpj: row.cnpj,
    dailyClosingWhatsappEnabled: Boolean(row.daily_closing_whatsapp_enabled),
    revenueGoalAlertEnabled: row.revenue_goal_alert_enabled !== false,
    expenseGoalAlertEnabled: row.expense_goal_alert_enabled !== false,
    employeeCommissionsEnabled: row.employee_commissions_enabled !== false,
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

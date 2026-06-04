import { addDays, differenceInCalendarDays, format, isValid, parse, parseISO } from "date-fns";
import { readSheet } from "read-excel-file/browser";
import {
  DESPESA_CATEGORIAS,
  RECEITA_CATEGORIAS,
  type Entry,
  type EntryType,
  type PaymentMethod,
} from "@/lib/data";

export type ImportedEntry = {
  date: string;
  type: EntryType;
  category: string;
  description: string;
  paymentMethod: PaymentMethod;
  amount: number;
  source: string;
  matchedEntryId?: string;
};

export type ReconciliationStatus = "matched" | "possible" | "missing";

export type ReconciliationRow = ImportedEntry & {
  status: ReconciliationStatus;
  matchedEntry?: Entry;
};

const DATE_HEADERS = ["data", "date", "dia", "emissao", "lancamento", "competencia"];
const MONTH_HEADERS = ["mes", "mês", "month", "competencia", "competência", "periodo", "período"];
const TYPE_HEADERS = ["tipo", "type", "entrada/saida", "movimento", "natureza"];
const CATEGORY_HEADERS = ["categoria", "category", "grupo", "classificacao"];
const DESCRIPTION_HEADERS = [
  "descricao",
  "descrição",
  "description",
  "historico",
  "histórico",
  "nome",
];
const PAYMENT_HEADERS = ["pagamento", "forma", "forma de pagamento", "payment", "metodo", "método"];
const AMOUNT_HEADERS = ["valor", "amount", "total", "preco", "preço", "entrada", "saida", "saída"];
const GENERIC_AMOUNT_HEADERS = ["valor", "amount", "total", "preco", "preço"];
const REVENUE_HEADERS = ["faturamento", "receita", "receitas", "entrada", "entradas", "vendas"];
const EXPENSE_HEADERS = ["despesas", "despesa", "saida", "saída", "saidas", "saídas", "gastos"];

const PAYMENT_METHODS: PaymentMethod[] = ["Pix", "Cartão", "Dinheiro", "Boleto", "Transferência"];

export async function parseFinancialFile(file: File): Promise<ImportedEntry[]> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (extension === "xlsx" || extension === "xls") return parseWorkbook(file);
  if (extension === "pdf") return parsePdf(file);
  return parseDelimited(await file.text(), file.name);
}

export function reconcileImportedEntries(imported: ImportedEntry[], existing: Entry[]) {
  return imported.map<ReconciliationRow>((item) => {
    const exact = existing.find((entry) => sameEntry(entry, item, 0));
    if (exact) return { ...item, status: "matched", matchedEntry: exact, matchedEntryId: exact.id };

    const possible = existing.find((entry) => sameEntry(entry, item, 2));
    if (possible) {
      return { ...item, status: "possible", matchedEntry: possible, matchedEntryId: possible.id };
    }

    return { ...item, status: "missing" };
  });
}

async function parseWorkbook(file: File) {
  const sheetRows = await readSheet(file);
  const headerIndex = findHeaderRowIndex(sheetRows);
  const headers = (sheetRows[headerIndex] || []).map((header) => String(header || ""));
  if (!headers.some((header) => normalizeKey(header))) {
    return sheetRows
      .map((cells) => parseTextLine(cells.map((cell) => String(cell || "")).join(" "), file.name))
      .filter((item): item is ImportedEntry => Boolean(item));
  }
  const rows = sheetRows
    .slice(headerIndex + 1)
    .map((cells) =>
      Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
    );
  const imported = rowsToImportedEntries(rows, file.name);
  if (imported.length) return imported;

  return sheetRows
    .map((cells) => parseTextLine(cells.map((cell) => String(cell || "")).join(" "), file.name))
    .filter((item): item is ImportedEntry => Boolean(item));
}

function findHeaderRowIndex(sheetRows: unknown[][]) {
  const allHeaders = [
    ...DATE_HEADERS,
    ...MONTH_HEADERS,
    ...TYPE_HEADERS,
    ...CATEGORY_HEADERS,
    ...DESCRIPTION_HEADERS,
    ...PAYMENT_HEADERS,
    ...AMOUNT_HEADERS,
    ...REVENUE_HEADERS,
    ...EXPENSE_HEADERS,
  ].map(normalizeKey);

  const scored = sheetRows.slice(0, 20).map((cells, index) => {
    const score = cells
      .map((cell) => normalizeKey(String(cell || "")))
      .filter((cell) => allHeaders.includes(cell)).length;
    return { index, score };
  });

  return scored.sort((a, b) => b.score - a.score)[0]?.score ? scored[0].index : 0;
}

function parseDelimited(text: string, source: string) {
  const parsedFromLines = text
    .split(/\r?\n/)
    .map((line) => parseTextLine(line, source))
    .filter((item): item is ImportedEntry => Boolean(item));
  if (parsedFromLines.length) return parsedFromLines;

  const delimiter = text.includes(";") ? ";" : text.includes("\t") ? "\t" : ",";
  const rows = parseDelimitedRows(text, delimiter);
  return rowsToImportedEntries(rows, source);
}

async function parsePdf(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    disableWorker: true,
  } as unknown as Parameters<typeof pdfjs.getDocument>[0]).promise;
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    lines.push(...text.split(/\s{2,}|\n/g));
  }

  return lines
    .map((line) => parseTextLine(line, file.name))
    .filter((item): item is ImportedEntry => Boolean(item));
}

function parseTextLine(line: string, source: string): ImportedEntry | null {
  const dateMatch = line.match(/\b(\d{2}\/\d{2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/);
  const amountMatches = line.match(
    /-?\s?R?\$?\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?|-?\s?R?\$?\s?\d+(?:[.,]\d{2})?/g,
  );
  const amountText = amountMatches?.at(-1);
  if (!dateMatch || !amountText) return null;

  const amount = parseAmount(amountText);
  if (!amount) return null;

  const description = line
    .replace(dateMatch[0], "")
    .replace(amountText, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalizeImportedEntry(
    {
      data: dateMatch[0],
      descricao: description || "Lancamento importado de PDF",
      valor: amount,
      tipo: amount < 0 ? "despesa" : "receita",
    },
    source,
  );
}

function rowsToImportedEntries(rows: Record<string, unknown>[], source: string) {
  return rows
    .flatMap((row) => normalizeImportedEntriesFromRow(row, source))
    .filter((item): item is ImportedEntry => Boolean(item));
}

function normalizeImportedEntriesFromRow(row: Record<string, unknown>, source: string) {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeKey(key), value]),
  );
  const dateValue = findValue(normalized, DATE_HEADERS) || findValue(normalized, MONTH_HEADERS);
  const parsedDate = parseDate(dateValue);
  const revenueAmount = sumAmounts(findValues(normalized, REVENUE_HEADERS));
  const expenseAmount = sumAmounts(findValues(normalized, EXPENSE_HEADERS));

  if (
    parsedDate &&
    (revenueAmount || expenseAmount) &&
    !findValue(normalized, GENERIC_AMOUNT_HEADERS)
  ) {
    const rows: ImportedEntry[] = [];
    if (revenueAmount) {
      rows.push({
        date: parsedDate,
        type: "receita",
        category: "Vendas",
        description: "Faturamento importado",
        paymentMethod: "Pix",
        amount: Math.abs(revenueAmount),
        source,
      });
    }
    if (expenseAmount) {
      rows.push({
        date: parsedDate,
        type: "despesa",
        category: "Outros",
        description: "Despesas importadas",
        paymentMethod: "Pix",
        amount: Math.abs(expenseAmount),
        source,
      });
    }
    return rows;
  }

  return [normalizeImportedEntry(row, source)];
}

function normalizeImportedEntry(
  row: Record<string, unknown>,
  source: string,
): ImportedEntry | null {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeKey(key), value]),
  );
  const dateValue = findValue(normalized, DATE_HEADERS) || findValue(normalized, MONTH_HEADERS);
  const amountValue = findValue(normalized, AMOUNT_HEADERS);
  const parsedDate = parseDate(dateValue);
  const parsedAmount = parseAmount(amountValue);
  if (!parsedDate || !parsedAmount) return null;

  const type = normalizeType(findValue(normalized, TYPE_HEADERS), parsedAmount);
  const description = String(findValue(normalized, DESCRIPTION_HEADERS) || "Lancamento importado");
  const category =
    normalizeCategory(findValue(normalized, CATEGORY_HEADERS), type) ||
    inferCategory(description, type);
  const paymentMethod = normalizePaymentMethod(findValue(normalized, PAYMENT_HEADERS), description);

  return {
    date: parsedDate,
    type,
    category,
    description,
    paymentMethod,
    amount: Math.abs(parsedAmount),
    source,
  };
}

function parseDelimitedRows(text: string, delimiter: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  const headers = splitDelimitedLine(lines[0] || "", delimiter);
  return lines.slice(1).map((line) => {
    const cells = splitDelimitedLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
  });
}

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function normalizeKey(key: string) {
  return key
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function findValue(row: Record<string, unknown>, candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeKey);
  const key = Object.keys(row).find((item) => normalizedCandidates.includes(normalizeKey(item)));
  return key ? row[key] : "";
}

function findValues(row: Record<string, unknown>, candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeKey);
  return Object.entries(row)
    .filter(([key]) => normalizedCandidates.includes(normalizeKey(key)))
    .map(([, value]) => value);
}

function sumAmounts(values: unknown[]) {
  return values.reduce<number>((sum, value) => sum + parseAmount(value), 0);
}

function parseDate(value: unknown) {
  if (value instanceof Date && isValid(value)) return format(value, "yyyy-MM-dd");
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsed = addDays(excelEpoch, value);
    if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  }

  const text = String(value || "").trim();
  if (!text) return null;
  const monthDate = parseMonthDate(text);
  if (monthDate) return monthDate;
  const formats = ["yyyy-MM-dd", "dd/MM/yyyy", "dd/MM/yy", "dd-MM-yyyy", "dd.MM.yyyy"];
  for (const pattern of formats) {
    const parsed = parse(text, pattern, new Date());
    if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  }

  const iso = parseISO(text);
  return isValid(iso) ? format(iso, "yyyy-MM-dd") : null;
}

function parseMonthDate(value: string) {
  const text = normalizeKey(value)
    .replace(/\s+de\s+/g, "/")
    .replace(/\s+/g, "/");
  const monthMap: Record<string, number> = {
    jan: 0,
    janeiro: 0,
    fev: 1,
    fevereiro: 1,
    mar: 2,
    marco: 2,
    abr: 3,
    abril: 3,
    mai: 4,
    maio: 4,
    jun: 5,
    junho: 5,
    jul: 6,
    julho: 6,
    ago: 7,
    agosto: 7,
    set: 8,
    setembro: 8,
    out: 9,
    outubro: 9,
    nov: 10,
    novembro: 10,
    dez: 11,
    dezembro: 11,
  };
  const match = text.match(
    /\b(jan(?:eiro)?|fev(?:ereiro)?|mar(?:co)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?)(?:\/|-)?(\d{2,4})?\b/,
  );
  if (!match) return null;
  const yearText = match[2];
  const currentYear = new Date().getFullYear();
  const year = yearText ? Number(yearText.length === 2 ? `20${yearText}` : yearText) : currentYear;
  const parsed = new Date(Date.UTC(year, monthMap[match[1]], 1));
  return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : null;
}

function parseAmount(value: unknown) {
  if (typeof value === "number") return value;
  const text = String(value || "")
    .replace(/\s/g, "")
    .replace("R$", "")
    .trim();
  if (!text) return 0;
  const normalized =
    text.includes(",") && text.lastIndexOf(",") > text.lastIndexOf(".")
      ? text.replace(/\./g, "").replace(",", ".")
      : text.replace(/,/g, "");
  return Number(normalized);
}

function normalizeType(value: unknown, amount: number): EntryType {
  const text = normalizeKey(String(value || ""));
  if (text.includes("despesa") || text.includes("saida") || text.includes("debito")) {
    return "despesa";
  }
  if (text.includes("receita") || text.includes("entrada") || text.includes("credito")) {
    return "receita";
  }
  return amount < 0 ? "despesa" : "receita";
}

function normalizeCategory(value: unknown, type: EntryType) {
  const categories = type === "receita" ? RECEITA_CATEGORIAS : DESPESA_CATEGORIAS;
  const text = normalizeKey(String(value || ""));
  return categories.find((category) => normalizeKey(category) === text) || "";
}

function inferCategory(description: string, type: EntryType) {
  const text = normalizeKey(description);
  if (type === "receita") {
    if (text.includes("pix")) return "Pix";
    if (text.includes("cartao") || text.includes("credito") || text.includes("debito")) {
      return "Cartão";
    }
    if (text.includes("delivery")) return "Delivery";
    return "Vendas";
  }

  if (text.includes("aluguel")) return "Aluguel";
  if (text.includes("funcionario") || text.includes("salario")) return "Funcionários";
  if (text.includes("fornecedor") || text.includes("produto")) return "Fornecedores";
  if (text.includes("marketing") || text.includes("trafego")) return "Marketing";
  if (text.includes("taxa") || text.includes("tarifa")) return "Taxas";
  if (text.includes("imposto")) return "Impostos";
  return "Outros";
}

function normalizePaymentMethod(value: unknown, description: string): PaymentMethod {
  const text = normalizeKey(`${value || ""} ${description}`);
  return (
    PAYMENT_METHODS.find((method) => text.includes(normalizeKey(method))) ||
    (text.includes("cartao") ? "Cartão" : "Pix")
  );
}

function sameEntry(entry: Entry, imported: ImportedEntry, dateToleranceDays: number) {
  const days = Math.abs(differenceInCalendarDays(parseISO(entry.date), parseISO(imported.date)));
  const amountMatches = Math.abs(entry.amount - imported.amount) < 0.01;
  if (!amountMatches || days > dateToleranceDays) return false;
  if (dateToleranceDays === 0) return entry.type === imported.type;

  const existingDescription = entry.description?.toLowerCase() || "";
  const importedDescription = imported.description.toLowerCase();
  return (
    entry.type === imported.type &&
    (existingDescription.includes(importedDescription.slice(0, 12)) ||
      importedDescription.includes(existingDescription.slice(0, 12)) ||
      days <= 1)
  );
}

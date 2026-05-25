import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type EnvRecord = Record<string, string | undefined>;

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers || {}),
    },
  });
}

function readEnv(env: unknown, key: string): string | undefined {
  if (env && typeof env === "object" && key in env) {
    const value = (env as EnvRecord)[key];
    if (value) return value;
  }

  return process.env[key];
}

async function verifySupabaseToken(request: Request, env: unknown) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  const supabaseUrl = readEnv(env, "VITE_SUPABASE_URL");
  const supabaseKey = readEnv(env, "VITE_SUPABASE_PUBLISHABLE_KEY");

  if (!token || !supabaseUrl || !supabaseKey) return false;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${token}`,
    },
  });

  return response.ok;
}

function parseInsightText(text: string) {
  const trimmed = text.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("Resposta da IA nao veio em JSON.");

  const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as {
    summary?: unknown;
    opportunity?: unknown;
    risk?: unknown;
    actions?: unknown;
  };

  return {
    summary: String(parsed.summary || "Sem diagnostico retornado."),
    opportunity: String(parsed.opportunity || "Sem oportunidade retornada."),
    risk: String(parsed.risk || "Sem risco retornado."),
    actions: Array.isArray(parsed.actions)
      ? parsed.actions.slice(0, 3).map((action) => String(action))
      : [],
  };
}

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const direct = (payload as { output_text?: unknown }).output_text;
  if (typeof direct === "string") return direct;

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .map((content) => {
      if (!content || typeof content !== "object") return "";
      const text = (content as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .join("\n");
}

async function handleAiInsights(request: Request, env: unknown) {
  if (request.method !== "POST") {
    return jsonResponse({ message: "Metodo nao permitido." }, { status: 405 });
  }

  const openaiKey = readEnv(env, "OPENAI_API_KEY");
  if (!openaiKey) {
    return jsonResponse(
      { message: "Configure OPENAI_API_KEY no ambiente do servidor." },
      { status: 501 },
    );
  }

  const authenticated = await verifySupabaseToken(request, env);
  if (!authenticated) return jsonResponse({ message: "Sessao invalida." }, { status: 401 });

  const body = (await request.json()) as { metrics?: unknown };
  if (!body.metrics) {
    return jsonResponse({ message: "Metricas da loja nao informadas." }, { status: 400 });
  }

  const model = readEnv(env, "OPENAI_MODEL") || "gpt-5-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${openaiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions:
        'Voce e um consultor financeiro para pequenos comercios locais no Brasil. Analise apenas os dados recebidos, seja pratico e nao invente numeros. Responda exclusivamente em JSON valido no formato {"summary":"...","opportunity":"...","risk":"...","actions":["...","...","..."]}.',
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Gere um insight objetivo para esta loja. Dados: ${JSON.stringify(body.metrics)}`,
            },
          ],
        },
      ],
      max_output_tokens: 900,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : "Erro ao chamar a OpenAI.";
    return jsonResponse({ message }, { status: response.status });
  }

  const text = extractResponseText(payload);
  const insight = parseInsightText(text);
  return jsonResponse(insight);
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/ai-insights") {
        return await handleAiInsights(request, env);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};

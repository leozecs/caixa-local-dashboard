import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type EnvRecord = Record<string, string | undefined>;
type SupabaseUser = { id: string; email?: string };
type StoreStatus = "ativa" | "pendente" | "trial" | "cancelada";

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
  return Boolean(await getSupabaseUser(request, env));
}

async function getSupabaseUser(request: Request, env: unknown): Promise<SupabaseUser | null> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  const supabaseUrl = readEnv(env, "VITE_SUPABASE_URL");
  const supabaseKey = readEnv(env, "VITE_SUPABASE_PUBLISHABLE_KEY");

  if (!token || !supabaseUrl || !supabaseKey) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  return (await response.json()) as SupabaseUser;
}

function getSupabaseAdminConfig(env: unknown) {
  const url = readEnv(env, "VITE_SUPABASE_URL");
  const secretKey =
    readEnv(env, "SUPABASE_SECRET_KEY") || readEnv(env, "SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !secretKey) {
    throw new Error("Configure SUPABASE_SECRET_KEY no ambiente do servidor.");
  }

  return { url, secretKey };
}

async function supabaseAdminFetch(
  env: unknown,
  path: string,
  init: RequestInit & { prefer?: string } = {},
) {
  const { url, secretKey } = getSupabaseAdminConfig(env);
  const headers = new Headers(init.headers);
  headers.set("apikey", secretKey);
  headers.set("authorization", `Bearer ${secretKey}`);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (init.prefer) headers.set("prefer", init.prefer);

  return fetch(`${url}${path}`, { ...init, headers });
}

async function requireOwner(request: Request, env: unknown) {
  const user = await getSupabaseUser(request, env);
  if (!user) throw new Response("Sessao invalida.", { status: 401 });

  const response = await supabaseAdminFetch(
    env,
    `/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`,
  );
  if (!response.ok) throw new Response("Nao foi possivel validar permissoes.", { status: 403 });
  const profiles = (await response.json()) as Array<{ role?: string }>;
  if (profiles[0]?.role !== "owner") {
    throw new Response("Apenas owner pode cadastrar lojas.", { status: 403 });
  }

  return user;
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    if (typeof payload?.message === "string") return payload.message;
    if (typeof payload?.error_description === "string") return payload.error_description;
    if (typeof payload?.msg === "string") return payload.msg;
  } catch {
    return fallback;
  }
  return fallback;
}

async function getSubscriptionPlanAmount(env: unknown, plan: string) {
  const response = await supabaseAdminFetch(
    env,
    `/rest/v1/subscription_plans?name=eq.${encodeURIComponent(plan)}&select=amount&limit=1`,
  );
  if (!response.ok) return 0;
  const rows = (await response.json()) as Array<{ amount?: number }>;
  return rows[0]?.amount ?? 0;
}

async function handleAdminCreateStore(request: Request, env: unknown) {
  if (request.method !== "POST") {
    return jsonResponse({ message: "Metodo nao permitido." }, { status: 405 });
  }

  try {
    await requireOwner(request, env);
  } catch (error) {
    if (error instanceof Response) {
      return jsonResponse({ message: await error.text() }, { status: error.status });
    }
    throw error;
  }

  const body = (await request.json()) as {
    name?: string;
    owner?: string;
    email?: string;
    password?: string;
    segment?: string;
    city?: string;
    plan?: string;
    status?: StoreStatus;
    cnpj?: string | null;
  };

  const name = body.name?.trim();
  const owner = body.owner?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password || "";
  const segment = body.segment?.trim();
  const city = body.city?.trim() || "Vinhedo/SP";
  const plan = body.plan?.trim() || "Trial";
  const status = body.status || "trial";

  if (!name || !owner || !email || !password || !segment) {
    return jsonResponse(
      { message: "Preencha loja, responsavel, email, senha e segmento." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return jsonResponse(
      { message: "A senha inicial precisa ter pelo menos 8 caracteres." },
      { status: 400 },
    );
  }

  const userResponse = await supabaseAdminFetch(env, "/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: owner },
    }),
  });

  if (!userResponse.ok) {
    return jsonResponse(
      {
        message: await readErrorMessage(
          userResponse,
          "Nao foi possivel criar usuario no Supabase.",
        ),
      },
      { status: userResponse.status },
    );
  }

  const authUser = (await userResponse.json()) as { id: string };

  const profileResponse = await supabaseAdminFetch(env, "/rest/v1/profiles?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates",
    body: JSON.stringify({
      id: authUser.id,
      email,
      name: owner,
      role: "lojista",
      updated_at: new Date().toISOString(),
    }),
  });

  if (!profileResponse.ok) {
    return jsonResponse(
      {
        message: await readErrorMessage(
          profileResponse,
          "Usuario criado, mas perfil nao foi atualizado.",
        ),
      },
      { status: profileResponse.status },
    );
  }

  const storeResponse = await supabaseAdminFetch(env, "/rest/v1/stores?select=*", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({
      name,
      owner_name: owner,
      segment,
      city,
      plan,
      status,
      cnpj: body.cnpj || null,
    }),
  });

  if (!storeResponse.ok) {
    return jsonResponse(
      {
        message: await readErrorMessage(
          storeResponse,
          "Usuario criado, mas loja nao foi cadastrada.",
        ),
      },
      { status: storeResponse.status },
    );
  }

  const [store] = (await storeResponse.json()) as Array<{ id: string }>;
  const amount = await getSubscriptionPlanAmount(env, plan);

  const memberResponse = await supabaseAdminFetch(env, "/rest/v1/store_members", {
    method: "POST",
    body: JSON.stringify({ store_id: store.id, user_id: authUser.id }),
  });

  if (!memberResponse.ok) {
    return jsonResponse(
      {
        message: await readErrorMessage(
          memberResponse,
          "Loja criada, mas usuario nao foi vinculado a ela.",
        ),
      },
      { status: memberResponse.status },
    );
  }

  const subscriptionResponse = await supabaseAdminFetch(env, "/rest/v1/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      store_id: store.id,
      plan,
      amount,
      status: status === "trial" ? "trial" : status === "pendente" ? "em_atraso" : "em_dia",
      next_charge_date: new Date(new Date().setMonth(new Date().getMonth() + 1))
        .toISOString()
        .slice(0, 10),
    }),
  });

  if (!subscriptionResponse.ok) {
    return jsonResponse(
      {
        message: await readErrorMessage(
          subscriptionResponse,
          "Loja criada, mas assinatura nao foi cadastrada.",
        ),
      },
      { status: subscriptionResponse.status },
    );
  }

  return jsonResponse({ store });
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
      if (url.pathname === "/api/admin/stores") {
        return await handleAdminCreateStore(request, env);
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

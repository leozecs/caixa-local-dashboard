import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type EnvRecord = Record<string, string | undefined>;
type SupabaseUser = { id: string; email?: string };
type StoreStatus = "ativa" | "pendente" | "trial" | "cancelada";
type StoreMemberRole = "owner" | "atendente";
type AiInsight = {
  summary: string;
  opportunity: string;
  risk: string;
  actions: string[];
};

const AI_SYSTEM_PROMPT =
  'Voce e um consultor pratico para o Caixa Local. Se os dados tiverem scope "commercial_growth", foque em vender mais o Caixa Local, gerar leads, aumentar recorrencia e reduzir cancelamento. Caso contrario, foque na gestao financeira de pequenos comercios locais no Brasil. Analise apenas os dados recebidos, seja pratico e nao invente numeros. Responda exclusivamente em JSON valido no formato {"summary":"...","opportunity":"...","risk":"...","actions":["...","...","..."]}.';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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

async function canAccessStore(env: unknown, userId: string, storeId: string) {
  const profileResponse = await supabaseAdminFetch(
    env,
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=role&limit=1`,
  );
  if (!profileResponse.ok) return false;
  const profiles = (await profileResponse.json()) as Array<{ role?: string }>;
  if (profiles[0]?.role === "owner") return true;

  const memberResponse = await supabaseAdminFetch(
    env,
    `/rest/v1/store_members?store_id=eq.${encodeURIComponent(storeId)}&user_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`,
  );
  if (!memberResponse.ok) return false;
  const members = (await memberResponse.json()) as Array<{ id?: string }>;
  return Boolean(members[0]?.id);
}

async function getStoreMembershipRole(
  env: unknown,
  userId: string,
  storeId: string,
): Promise<StoreMemberRole | null> {
  const memberResponse = await supabaseAdminFetch(
    env,
    `/rest/v1/store_members?store_id=eq.${encodeURIComponent(storeId)}&user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`,
  );
  if (!memberResponse.ok) return null;
  const members = (await memberResponse.json()) as Array<{ role?: StoreMemberRole }>;
  return members[0]?.role || null;
}

async function canManageStore(env: unknown, userId: string, storeId: string) {
  if (await isOwner(env, userId)) return true;
  return (await getStoreMembershipRole(env, userId, storeId)) === "owner";
}

function normalizePlanName(plan: string) {
  return plan
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function planCanUseAiConsultant(plan: string) {
  return normalizePlanName(plan).includes("gestao local");
}

function planMaxUsers(plan: string) {
  const normalized = normalizePlanName(plan);
  if (normalized.includes("gestao local")) return 5;
  if (normalized.includes("essencial")) return 3;
  return 1;
}

async function getStorePlan(env: unknown, storeId: string) {
  const response = await supabaseAdminFetch(
    env,
    `/rest/v1/stores?id=eq.${encodeURIComponent(storeId)}&select=plan&limit=1`,
  );
  if (!response.ok) return "";
  const rows = (await response.json()) as Array<{ plan?: string }>;
  return rows[0]?.plan || "";
}

async function isOwner(env: unknown, userId: string) {
  const response = await supabaseAdminFetch(
    env,
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=role&limit=1`,
  );
  if (!response.ok) return false;
  const profiles = (await response.json()) as Array<{ role?: string }>;
  return profiles[0]?.role === "owner";
}

async function requireStoreManager(request: Request, env: unknown, storeId: string) {
  const user = await getSupabaseUser(request, env);
  if (!user) throw new Response("Sessao invalida.", { status: 401 });
  if (!(await canManageStore(env, user.id, storeId))) {
    throw new Response("Apenas o owner da loja pode gerenciar equipe.", { status: 403 });
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
    body: JSON.stringify({ store_id: store.id, user_id: authUser.id, role: "owner" }),
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

async function getStoreForTeam(env: unknown, storeId: string) {
  const response = await supabaseAdminFetch(
    env,
    `/rest/v1/stores?id=eq.${encodeURIComponent(storeId)}&select=id,plan&limit=1`,
  );
  if (!response.ok) throw new Response("Loja nao encontrada.", { status: 404 });
  const stores = (await response.json()) as Array<{ id: string; plan: string }>;
  if (!stores[0]) throw new Response("Loja nao encontrada.", { status: 404 });
  return stores[0];
}

async function listStoreMembers(env: unknown, storeId: string) {
  const response = await supabaseAdminFetch(
    env,
    `/rest/v1/store_members?store_id=eq.${encodeURIComponent(storeId)}&select=id,role,created_at,profiles(id,email,name)&order=created_at.asc`,
  );
  if (!response.ok) throw new Response("Nao foi possivel carregar equipe.", { status: 500 });
  return (await response.json()) as Array<{
    id: string;
    role: StoreMemberRole;
    created_at: string;
    profiles?: { id: string; email: string; name: string } | null;
  }>;
}

async function handleStoreMembers(request: Request, env: unknown) {
  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId") || "";
  if (!storeId) return jsonResponse({ message: "Loja obrigatoria." }, { status: 400 });

  if (request.method === "GET") {
    const user = await getSupabaseUser(request, env);
    if (!user) return jsonResponse({ message: "Sessao invalida." }, { status: 401 });
    if (!(await canAccessStore(env, user.id, storeId))) {
      return jsonResponse({ message: "Voce nao tem acesso a esta loja." }, { status: 403 });
    }
    const store = await getStoreForTeam(env, storeId);
    return jsonResponse({
      members: await listStoreMembers(env, storeId),
      maxUsers: planMaxUsers(store.plan),
    });
  }

  try {
    await requireStoreManager(request, env, storeId);
  } catch (error) {
    if (error instanceof Response) {
      return jsonResponse({ message: await error.text() }, { status: error.status });
    }
    throw error;
  }

  if (request.method === "POST") {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      role?: StoreMemberRole;
    };
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password || "";
    const role: StoreMemberRole = body.role === "owner" ? "owner" : "atendente";

    if (!name || !email || !password) {
      return jsonResponse({ message: "Preencha nome, email e senha." }, { status: 400 });
    }
    if (password.length < 8) {
      return jsonResponse(
        { message: "A senha precisa ter pelo menos 8 caracteres." },
        { status: 400 },
      );
    }

    const store = await getStoreForTeam(env, storeId);
    const members = await listStoreMembers(env, storeId);
    if (members.length >= planMaxUsers(store.plan)) {
      return jsonResponse(
        { message: `O plano atual permite ate ${planMaxUsers(store.plan)} usuario(s).` },
        { status: 400 },
      );
    }

    const userResponse = await supabaseAdminFetch(env, "/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      }),
    });

    if (!userResponse.ok) {
      return jsonResponse(
        { message: await readErrorMessage(userResponse, "Nao foi possivel criar usuario.") },
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
        name,
        role: "lojista",
        updated_at: new Date().toISOString(),
      }),
    });

    if (!profileResponse.ok) {
      return jsonResponse(
        {
          message: await readErrorMessage(
            profileResponse,
            "Usuario criado, mas perfil nao foi salvo.",
          ),
        },
        { status: profileResponse.status },
      );
    }

    const memberResponse = await supabaseAdminFetch(env, "/rest/v1/store_members", {
      method: "POST",
      body: JSON.stringify({
        store_id: storeId,
        user_id: authUser.id,
        role,
      }),
    });

    if (!memberResponse.ok) {
      return jsonResponse(
        {
          message: await readErrorMessage(
            memberResponse,
            "Usuario criado, mas nao foi vinculado a loja.",
          ),
        },
        { status: memberResponse.status },
      );
    }

    return jsonResponse({ members: await listStoreMembers(env, storeId) }, { status: 201 });
  }

  if (request.method === "PATCH") {
    const body = (await request.json()) as {
      memberId?: string;
      role?: StoreMemberRole;
    };
    const memberId = body.memberId || "";
    const role: StoreMemberRole = body.role === "owner" ? "owner" : "atendente";
    if (!memberId) return jsonResponse({ message: "Membro obrigatorio." }, { status: 400 });

    const members = await listStoreMembers(env, storeId);
    const current = members.find((member) => member.id === memberId);
    if (!current) return jsonResponse({ message: "Membro nao encontrado." }, { status: 404 });
    if (
      current.role === "owner" &&
      role !== "owner" &&
      members.filter((member) => member.role === "owner").length <= 1
    ) {
      return jsonResponse(
        { message: "A loja precisa manter pelo menos um owner." },
        { status: 400 },
      );
    }

    const response = await supabaseAdminFetch(
      env,
      `/rest/v1/store_members?id=eq.${encodeURIComponent(memberId)}&store_id=eq.${encodeURIComponent(storeId)}`,
      {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({ role }),
      },
    );

    if (!response.ok) {
      return jsonResponse(
        { message: await readErrorMessage(response, "Nao foi possivel atualizar membro.") },
        { status: response.status },
      );
    }

    return jsonResponse({ members: await listStoreMembers(env, storeId) });
  }

  if (request.method === "DELETE") {
    const body = (await request.json()) as { memberId?: string };
    const memberId = body.memberId || "";
    if (!memberId) return jsonResponse({ message: "Membro obrigatorio." }, { status: 400 });

    const members = await listStoreMembers(env, storeId);
    const current = members.find((member) => member.id === memberId);
    if (!current) return jsonResponse({ message: "Membro nao encontrado." }, { status: 404 });
    if (current.role !== "atendente") {
      return jsonResponse(
        { message: "Apenas usuarios atendentes podem ser excluidos por aqui." },
        { status: 400 },
      );
    }

    const userId = current.profiles?.id;
    if (userId) {
      const response = await supabaseAdminFetch(
        env,
        `/auth/v1/admin/users/${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        return jsonResponse(
          { message: await readErrorMessage(response, "Nao foi possivel excluir usuario.") },
          { status: response.status },
        );
      }
    } else {
      const response = await supabaseAdminFetch(
        env,
        `/rest/v1/store_members?id=eq.${encodeURIComponent(memberId)}&store_id=eq.${encodeURIComponent(storeId)}`,
        { method: "DELETE", prefer: "return=minimal" },
      );

      if (!response.ok) {
        return jsonResponse(
          { message: await readErrorMessage(response, "Nao foi possivel remover vinculo.") },
          { status: response.status },
        );
      }
    }

    return jsonResponse({ members: await listStoreMembers(env, storeId) });
  }

  return jsonResponse({ message: "Metodo nao permitido." }, { status: 405 });
}

function parseInsightText(text: string): AiInsight {
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

function extractOpenAiResponseText(payload: unknown) {
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

function buildZeroRevenueInsight(metrics: unknown): AiInsight | null {
  const current =
    metrics && typeof metrics === "object" && "current" in metrics
      ? (metrics as { current?: Record<string, unknown> }).current
      : undefined;
  const revenue = Number(current?.revenue ?? 0);
  const expenses = Number(current?.expenses ?? 0);

  if (revenue > 0) return null;

  return {
    summary:
      "Ainda nao existe faturamento registrado neste periodo. Isso significa que o Caixa Local ainda nao tem base suficiente para interpretar vendas, margem e crescimento com confianca. Nesta semana, o foco principal e criar uma rotina de registro para transformar a loja em um painel confiavel.",
    opportunity:
      "A maior oportunidade agora e organizar o primeiro ciclo de dados: registrar toda venda no dia, separar formas de pagamento e cadastrar as despesas fixas para enxergar o ponto de equilibrio.",
    risk:
      expenses > 0
        ? "Existem despesas registradas sem receita correspondente. Pode ser falta de lancamento das vendas ou sinal de caixa negativo; os dois cenarios precisam ser tratados antes de qualquer decisao comercial."
        : "Sem receitas e sem despesas registradas, o principal risco e tomar decisao no escuro. O sistema precisa de pelo menos alguns dias de lancamentos para apontar onde economizar ou vender mais.",
    actions: [
      "Registre todas as vendas dos proximos 7 dias, mesmo que sejam valores pequenos.",
      "Cadastre aluguel, produtos, taxas, comissoes e outras despesas fixas do mes.",
      "Defina metas iniciais de faturamento e limite de despesas para ativar alertas uteis.",
    ],
  };
}

function extractChatResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return "";
  const first = choices[0];
  if (!first || typeof first !== "object") return "";
  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== "object") return "";
  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : "";
}

function getAiProvider(env: unknown) {
  const provider = readEnv(env, "AI_PROVIDER")?.toLowerCase();
  if (provider === "groq" || provider === "openai") return provider;
  return readEnv(env, "GROQ_API_KEY") ? "groq" : "openai";
}

async function generateOpenAiInsight(env: unknown, metrics: unknown): Promise<AiInsight> {
  const openaiKey = readEnv(env, "OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Response(
      JSON.stringify({ message: "Configure OPENAI_API_KEY no ambiente do servidor." }),
      { status: 501, headers: { "content-type": "application/json; charset=utf-8" } },
    );
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
      instructions: AI_SYSTEM_PROMPT,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Gere um insight objetivo para esta loja. Dados: ${JSON.stringify(metrics)}`,
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
    throw new Response(JSON.stringify({ message }), {
      status: response.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  return parseInsightText(extractOpenAiResponseText(payload));
}

async function generateGroqInsight(env: unknown, metrics: unknown): Promise<AiInsight> {
  const groqKey = readEnv(env, "GROQ_API_KEY");
  if (!groqKey) {
    throw new Response(
      JSON.stringify({ message: "Configure GROQ_API_KEY no ambiente do servidor." }),
      { status: 501, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }

  const model = readEnv(env, "GROQ_MODEL") || "llama-3.1-8b-instant";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${groqKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Gere um insight objetivo para esta loja. Dados: ${JSON.stringify(metrics)}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 700,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : "Erro ao chamar a Groq.";
    throw new Response(JSON.stringify({ message }), {
      status: response.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  return parseInsightText(extractChatResponseText(payload));
}

function generateAiInsight(env: unknown, metrics: unknown) {
  return getAiProvider(env) === "groq"
    ? generateGroqInsight(env, metrics)
    : generateOpenAiInsight(env, metrics);
}

async function getLatestAiInsightCreatedAt(env: unknown, storeId: string) {
  const response = await supabaseAdminFetch(
    env,
    `/rest/v1/ai_insights?store_id=eq.${encodeURIComponent(storeId)}&select=created_at&order=created_at.desc&limit=1`,
  );
  if (!response.ok) {
    throw new Response(
      JSON.stringify({ message: "Nao foi possivel verificar o limite semanal da IA." }),
      { status: 500, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }
  const rows = (await response.json()) as Array<{ created_at?: string }>;
  return rows[0]?.created_at;
}

async function saveAiInsightForStore(env: unknown, storeId: string, insight: AiInsight) {
  const response = await supabaseAdminFetch(env, "/rest/v1/ai_insights?select=*", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({
      store_id: storeId,
      summary: insight.summary,
      opportunity: insight.opportunity,
      risk: insight.risk,
      actions: insight.actions,
    }),
  });

  if (!response.ok) {
    throw new Response(
      JSON.stringify({
        message: await readErrorMessage(response, "Insight gerado, mas nao foi salvo."),
      }),
      { status: response.status, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }
}

async function getLatestAdminAiInsightCreatedAt(env: unknown, scope: string) {
  const response = await supabaseAdminFetch(
    env,
    `/rest/v1/admin_ai_insights?scope=eq.${encodeURIComponent(scope)}&select=created_at&order=created_at.desc&limit=1`,
  );
  if (!response.ok) {
    throw new Response(
      JSON.stringify({ message: "Nao foi possivel verificar o limite semanal do admin." }),
      { status: 500, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }
  const rows = (await response.json()) as Array<{ created_at?: string }>;
  return rows[0]?.created_at;
}

async function saveAdminAiInsight(env: unknown, scope: string, userId: string, insight: AiInsight) {
  const response = await supabaseAdminFetch(env, "/rest/v1/admin_ai_insights?select=*", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({
      scope,
      summary: insight.summary,
      opportunity: insight.opportunity,
      risk: insight.risk,
      actions: insight.actions,
      created_by: userId,
    }),
  });

  if (!response.ok) {
    throw new Response(
      JSON.stringify({
        message: await readErrorMessage(response, "Insight do admin gerado, mas nao foi salvo."),
      }),
      { status: response.status, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }
}

async function handleAiInsights(request: Request, env: unknown) {
  if (request.method !== "POST") {
    return jsonResponse({ message: "Metodo nao permitido." }, { status: 405 });
  }

  const user = await getSupabaseUser(request, env);
  if (!user) return jsonResponse({ message: "Sessao invalida." }, { status: 401 });

  const body = (await request.json()) as { metrics?: unknown; storeId?: unknown; scope?: unknown };
  if (!body.metrics) {
    return jsonResponse({ message: "Metricas da loja nao informadas." }, { status: 400 });
  }

  const storeId = typeof body.storeId === "string" ? body.storeId : "";
  const scope = typeof body.scope === "string" ? body.scope : "";
  try {
    if (scope === "admin_portfolio") {
      const owner = await isOwner(env, user.id);
      if (!owner) {
        return jsonResponse({ message: "Apenas owner pode analisar a carteira." }, { status: 403 });
      }

      const latestCreatedAt = await getLatestAdminAiInsightCreatedAt(env, "portfolio");
      if (latestCreatedAt) {
        const nextAllowedAt = new Date(new Date(latestCreatedAt).getTime() + ONE_WEEK_MS);
        if (Date.now() < nextAllowedAt.getTime()) {
          return jsonResponse(
            {
              message: "O Consultor IA do admin pode gerar um novo insight a cada 7 dias.",
              nextAllowedAt: nextAllowedAt.toISOString(),
            },
            { status: 429 },
          );
        }
      }

      const insight = await generateAiInsight(env, body.metrics);
      await saveAdminAiInsight(env, "portfolio", user.id, insight);
      return jsonResponse(insight);
    }

    if (storeId) {
      const canAccess = await canAccessStore(env, user.id, storeId);
      if (!canAccess) {
        return jsonResponse({ message: "Voce nao tem acesso a esta loja." }, { status: 403 });
      }

      const plan = await getStorePlan(env, storeId);
      if (!planCanUseAiConsultant(plan)) {
        return jsonResponse(
          { message: "O Consultor IA esta disponivel apenas no plano Gestao Local." },
          { status: 403 },
        );
      }

      const latestCreatedAt = await getLatestAiInsightCreatedAt(env, storeId);
      if (latestCreatedAt) {
        const nextAllowedAt = new Date(new Date(latestCreatedAt).getTime() + ONE_WEEK_MS);
        if (Date.now() < nextAllowedAt.getTime()) {
          return jsonResponse(
            {
              message: "O Consultor IA pode gerar um novo insight para esta loja a cada 7 dias.",
              nextAllowedAt: nextAllowedAt.toISOString(),
            },
            { status: 429 },
          );
        }
      }
    }

    const insight =
      buildZeroRevenueInsight(body.metrics) ?? (await generateAiInsight(env, body.metrics));
    if (storeId) await saveAiInsightForStore(env, storeId, insight);
    return jsonResponse(insight);
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Erro ao gerar insight." },
      { status: 500 },
    );
  }
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
      if (url.pathname === "/api/store-members") {
        return await handleStoreMembers(request, env);
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

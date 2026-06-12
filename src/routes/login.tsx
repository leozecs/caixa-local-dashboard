import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, signIn } from "@/lib/auth";
import { isValidEmail, normalizeEmail } from "@/lib/security";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar | Caixa Local" }] }),
  component: LoginPage,
});

const LOGIN_ERROR_MESSAGE = "E-mail ou senha invalidos.";
const APP_VERSION = "v1.0";

const trustBadges = [
  { label: "Ambiente seguro", icon: ShieldCheck },
  { label: "Dados protegidos", icon: LockKeyhole },
  { label: "Gestao financeira inteligente", icon: Sparkles },
];

const benefitItems = [
  {
    title: "Fluxo de caixa sob controle",
    description: "Acompanhe entradas, saidas e saldo com clareza operacional.",
    icon: CircleDollarSign,
  },
  {
    title: "Decisoes com previsibilidade",
    description: "Visualize tendencias, metas e sinais de risco antes do fechamento.",
    icon: TrendingUp,
  },
  {
    title: "Operacao preparada para crescer",
    description: "Gestao multiusuario com acesso seguro para rotinas financeiras.",
    icon: Building2,
  },
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberAccess, setRememberAccess] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "cadastro">("login");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setMessage(null);

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail) || !password) {
      setError(LOGIN_ERROR_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const session = await signIn(normalizedEmail, password);
      navigate({ to: session.role === "owner" ? "/admin" : "/dashboard" });
    } catch {
      setError(LOGIN_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (resetLoading) return;
    setError(null);
    setMessage(null);

    const trimmedEmail = normalizeEmail(email);
    if (!isValidEmail(trimmedEmail)) {
      setError("Digite seu e-mail para receber o link de recuperacao de senha.");
      return;
    }

    setResetLoading(true);
    try {
      await requestPasswordReset(trimmedEmail);
      setMessage(
        "Se esse e-mail estiver cadastrado, enviaremos um link seguro para voce criar uma nova senha.",
      );
    } catch {
      setError("Nao foi possivel enviar o e-mail de recuperacao agora.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <main className="login-premium relative min-h-screen overflow-hidden bg-[#071816] text-slate-950">
      <div className="login-grid absolute inset-0 opacity-35" aria-hidden="true" />
      <div
        className="login-sheen absolute -left-32 top-12 h-[42rem] w-48 rotate-12 bg-gradient-to-b from-emerald-300/0 via-emerald-300/12 to-emerald-300/0 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="login-sheen-delayed absolute right-20 top-0 h-[36rem] w-36 -rotate-12 bg-gradient-to-b from-cyan-200/0 via-cyan-200/10 to-cyan-200/0 blur-2xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden h-screen overflow-hidden flex-col justify-between px-10 py-8 text-white lg:flex xl:px-14">
          <div className="flex items-center gap-3">
            <BrandMark variant="dark" />
            <div>
              <p className="text-base font-semibold tracking-tight">Caixa Local</p>
              <p className="text-xs text-emerald-100/70">Finance OS para negocios locais</p>
            </div>
          </div>

          <div className="login-enter max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-emerald-50 shadow-2xl shadow-emerald-950/30 backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              Plataforma segura para operacoes financeiras
            </div>

            <div className="space-y-5">
              <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight text-white 2xl:text-5xl">
                Controle financeiro profissional para crescer sem perder clareza.
              </h1>
              <p className="max-w-lg text-sm leading-6 text-slate-200/78 xl:text-base xl:leading-7">
                O Caixa Local organiza caixa, metas, lancamentos e indicadores em uma experiencia
                premium para donos que precisam decidir com seguranca.
              </p>
            </div>

            <div className="grid max-w-lg gap-3">
              {benefitItems.map((item) => (
                <div
                  key={item.title}
                  className="group flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.07] p-3 shadow-2xl shadow-black/10 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-white/[0.1] xl:p-4"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-300/12 text-emerald-200 ring-1 ring-emerald-200/15 transition group-hover:bg-emerald-300/18">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">{item.title}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-200/68 xl:text-sm xl:leading-6">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-300/55">
            Copyright {new Date().getFullYear()} Caixa Local. Todos os direitos reservados.
          </p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
          <div className="login-card-enter w-full max-w-[450px]">
            <div className="mb-7 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3 text-white">
                <BrandMark variant="dark" />
                <div>
                  <p className="text-base font-semibold tracking-tight">Caixa Local</p>
                  <p className="text-xs text-emerald-100/70">Acesso seguro</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/60 bg-white/96 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <div className="mb-5">
                <div className="mb-4 hidden items-center gap-3 lg:flex">
                  <BrandMark />
                  <div>
                    <p className="text-base font-semibold tracking-tight text-slate-950">
                      Caixa Local
                    </p>
                    <p className="text-xs text-slate-500">Acesso ao painel financeiro</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {trustBadges.map((badge) => (
                    <span
                      key={badge.label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                    >
                      <badge.icon className="h-3.5 w-3.5 text-emerald-600" />
                      {badge.label}
                    </span>
                  ))}
                </div>

                <div className="mt-5 space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                    {mode === "login" ? "Entre na sua conta" : "Cadastre sua loja"}
                  </h2>
                  <p className="text-sm leading-6 text-slate-500">
                    {mode === "login"
                      ? "Acesse seu painel para acompanhar caixa, lançamentos e relatórios com segurança."
                      : "Cadastros de novas lojas estao sendo liberados pela area administrativa."}
                  </p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium">
                <button
                  type="button"
                  className={[
                    "rounded-md px-3 py-2 transition",
                    mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500",
                  ].join(" ")}
                  onClick={() => setMode("login")}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={[
                    "rounded-md px-3 py-2 transition",
                    mode === "cadastro" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500",
                  ].join(" ")}
                  onClick={() => setMode("cadastro")}
                >
                  Cadastro
                </button>
              </div>

              {mode === "login" ? (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                      E-mail
                    </Label>
                    <div className="group relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-600" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "login-feedback" : undefined}
                        className="h-11 rounded-lg border-slate-200 bg-white pl-10 text-sm text-slate-950 shadow-sm transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                      Senha
                    </Label>
                    <div className="group relative">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-600" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Digite sua senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "login-feedback" : undefined}
                        className="h-11 rounded-lg border-slate-200 bg-white pl-10 text-sm text-slate-950 shadow-sm transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <label
                      htmlFor="remember-access"
                      className="flex cursor-pointer items-center gap-2 text-slate-600"
                    >
                      <input
                        id="remember-access"
                        type="checkbox"
                        checked={rememberAccess}
                        onChange={(event) => setRememberAccess(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                      />
                      Lembrar acesso
                    </label>
                    <button
                      type="button"
                      className="font-medium text-emerald-700 transition hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handlePasswordReset}
                      disabled={resetLoading}
                    >
                      {resetLoading ? "Enviando link..." : "Esqueci minha senha"}
                    </button>
                  </div>

                  {error && (
                    <div
                      id="login-feedback"
                      role="alert"
                      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                    >
                      <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  {message && (
                    <div
                      role="status"
                      className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{message}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="h-11 w-full rounded-lg bg-[#0f3d38] text-sm font-semibold text-white shadow-lg shadow-emerald-950/20 transition duration-200 hover:-translate-y-0.5 hover:bg-[#125148] hover:shadow-xl hover:shadow-emerald-950/25 focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:translate-y-0"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        Entrar com seguranca
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <div
                  role="status"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600"
                >
                  <div className="font-semibold text-slate-950">Cadastro pelo administrador</div>
                  <p className="mt-1">
                    Pagamentos online, Pix e envio de comprovantes estao desativados nesta tela. O
                    acesso de novas lojas deve ser criado e liberado pela area administrativa.
                  </p>
                </div>
              )}

              <div className="mt-5 border-t border-slate-100 pt-4 text-right text-xs text-slate-500">
                Caixa Local {APP_VERSION}
              </div>
            </div>

            <div className="mt-5 text-center text-xs text-slate-300/70 lg:hidden">
              Copyright {new Date().getFullYear()} Caixa Local. {APP_VERSION}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function BrandMark({ variant = "light" }: { variant?: "light" | "dark" }) {
  const dark = variant === "dark";

  return (
    <div
      className={[
        "grid h-11 w-11 shrink-0 place-items-center rounded-lg shadow-lg",
        dark
          ? "bg-emerald-300 text-[#08332e] shadow-emerald-950/30"
          : "bg-[#0f3d38] text-white shadow-emerald-950/20",
      ].join(" ")}
      aria-hidden="true"
    >
      <Wallet className="h-5 w-5" />
    </div>
  );
}

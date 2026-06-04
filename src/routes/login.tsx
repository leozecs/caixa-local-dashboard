import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, signIn } from "@/lib/auth";
import { GENERIC_LOGIN_ERROR, isValidEmail, normalizeEmail } from "@/lib/security";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar | Caixa Local" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail) || !password) {
      setError(GENERIC_LOGIN_ERROR);
      return;
    }

    setLoading(true);
    try {
      const session = await signIn(normalizedEmail, password);
      navigate({ to: session.role === "owner" ? "/admin" : "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERIC_LOGIN_ERROR);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    setError(null);
    setMessage(null);

    const trimmedEmail = normalizeEmail(email);
    if (!isValidEmail(trimmedEmail)) {
      setError("Digite seu e-mail para receber o link de recuperação de senha.");
      return;
    }

    setResetLoading(true);
    try {
      await requestPasswordReset(trimmedEmail);
      setMessage(
        "Se esse e-mail estiver cadastrado, enviaremos um link seguro para você criar uma nova senha.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível enviar o e-mail de recuperação.",
      );
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand side */}
      <div className="hidden lg:flex flex-col justify-between bg-sidebar text-sidebar-foreground p-10">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="font-semibold tracking-tight">Caixa Local</span>
        </div>
        <div className="space-y-3 max-w-md">
          <h2 className="text-2xl font-semibold leading-tight">
            Retome o controle do seu dinheiro e enxergue seu negócio com clareza.
          </h2>
          <p className="text-sm text-sidebar-foreground/70">
            Feito para quem quer sair do improviso, acompanhar cada venda e tomar decisões melhores
            todos os dias.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} Caixa Local
        </p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground grid place-items-center">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight">Caixa Local</span>
          </div>

          <h1 className="text-xl font-semibold tracking-tight">Caixa Local</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Feito para você que quer retomar o controle da sua vida financeira, organizar o caixa e
            crescer com mais segurança.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700">
                {message}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button
                type="button"
                className="hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handlePasswordReset}
                disabled={resetLoading}
              >
                {resetLoading ? "Enviando link..." : "Esqueci minha senha"}
              </button>
              <span>Caixa Local · acesso seguro</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

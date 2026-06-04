import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSupabase } from "@/lib/supabase";
import { signOut, updatePassword } from "@/lib/auth";
import { validatePasswordStrength } from "@/lib/security";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Redefinir senha | Caixa Local" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const client = requireSupabase();

    client.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) throw sessionError;
        if (!cancelled) setHasRecoverySession(Boolean(data.session));
      })
      .catch((err) => {
        console.error("Erro ao validar sessão de recuperação:", err);
        if (!cancelled) setHasRecoverySession(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas digitadas não conferem.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setMessage("Senha atualizada com sucesso. Entre novamente com a nova senha.");
      await signOut();
      setTimeout(() => navigate({ to: "/login" }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar sua senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-sm flex-col justify-center">
        <div className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="font-semibold tracking-tight">Caixa Local</span>
        </div>

        <h1 className="text-xl font-semibold tracking-tight">Crie uma nova senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sua loja e seus lançamentos continuam protegidos na mesma conta.
        </p>

        {checkingSession ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Validando link de recuperação...
          </div>
        ) : hasRecoverySession ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo de 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                "Salvar nova senha"
              )}
            </Button>
          </form>
        ) : (
          <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            Link inválido ou expirado. Solicite um novo link na tela de login.
          </div>
        )}

        <Link to="/login" className="mt-5 text-sm text-muted-foreground hover:text-foreground">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}

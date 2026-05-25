// Mock auth via localStorage
import { useEffect, useState } from "react";

export interface Session {
  email: string;
  name: string;
  role: "owner" | "admin";
}

const KEY = "caixa-local-session";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session | null) {
  if (typeof window === "undefined") return;
  if (s) window.localStorage.setItem(KEY, JSON.stringify(s));
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("caixa-local-auth"));
}

export function useSession() {
  const [session, setS] = useState<Session | null>(() => getSession());
  useEffect(() => {
    const handler = () => setS(getSession());
    window.addEventListener("caixa-local-auth", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("caixa-local-auth", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return session;
}

export async function signIn(email: string, password: string): Promise<Session> {
  await new Promise((r) => setTimeout(r, 700));
  if (!email || !password) throw new Error("Informe e-mail e senha.");
  if (password.length < 4) throw new Error("Senha inválida. Tente novamente.");
  const isAdmin = email.toLowerCase().startsWith("admin");
  const session: Session = {
    email,
    name: isAdmin ? "Equipe Caixa Local" : "Marina Silveira",
    role: isAdmin ? "admin" : "owner",
  };
  setSession(session);
  return session;
}

export function signOut() {
  setSession(null);
}

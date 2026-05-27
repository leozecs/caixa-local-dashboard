import { useEffect, useState } from "react";
import type { Session as SupabaseSession, User } from "@supabase/supabase-js";
import { requireSupabase, supabase } from "@/lib/supabase";

export type UserRole = "owner" | "lojista";

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileInitial?: string | null;
  profileColor?: string | null;
}

export interface Session {
  email: string;
  name: string;
  role: UserRole;
  user: User;
  profile: Profile;
}

const PROFILE_CACHE_KEY = "caixa-local-profile";
const PROFILE_CACHE_EVENT = "caixa-local-profile-updated";

export function cacheProfile(profile: Profile | null) {
  if (typeof window === "undefined") return;
  if (profile) window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  else window.localStorage.removeItem(PROFILE_CACHE_KEY);
  window.dispatchEvent(new CustomEvent<Profile | null>(PROFILE_CACHE_EVENT, { detail: profile }));
}

function getCachedProfile(): Profile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

async function fetchProfile(user: User): Promise<Profile> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("id, email, name, role, profile_initial, profile_color")
    .eq("id", user.id)
    .single();

  if (error) throw error;

  const profile = {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    profileInitial: data.profile_initial,
    profileColor: data.profile_color,
  } as Profile;
  cacheProfile(profile);
  return profile;
}

function toSession(authSession: SupabaseSession, profile: Profile): Session {
  return {
    email: profile.email,
    name: profile.name,
    role: profile.role,
    user: authSession.user,
    profile,
  };
}

export function getSession(): Session | null {
  const profile = getCachedProfile();
  if (!profile) return null;

  return {
    email: profile.email,
    name: profile.name,
    role: profile.role,
    user: null as unknown as User,
    profile,
  };
}

export async function getCurrentSession(): Promise<Session | null> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    cacheProfile(null);
    return null;
  }

  const profile = await fetchProfile(data.session.user);
  return toSession(data.session, profile);
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(() => getSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    getCurrentSession()
      .then((current) => {
        if (!cancelled) setSession(current);
      })
      .catch((error) => {
        console.error("Erro ao carregar sessão:", error);
        cacheProfile(null);
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (!authSession) {
        cacheProfile(null);
        setSession(null);
        setLoading(false);
        return;
      }

      fetchProfile(authSession.user)
        .then((profile) => setSession(toSession(authSession, profile)))
        .catch((error) => {
          console.error("Erro ao atualizar perfil:", error);
          cacheProfile(null);
          setSession(null);
        })
        .finally(() => setLoading(false));
    });

    const handleProfileCacheUpdate = (event: Event) => {
      const profile = (event as CustomEvent<Profile | null>).detail;
      if (!profile) {
        setSession(null);
        return;
      }
      setSession((current) =>
        current
          ? {
              ...current,
              email: profile.email,
              name: profile.name,
              role: profile.role,
              profile,
            }
          : getSession(),
      );
    };

    window.addEventListener(PROFILE_CACHE_EVENT, handleProfileCacheUpdate);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener(PROFILE_CACHE_EVENT, handleProfileCacheUpdate);
    };
  }, []);

  return { session, loading };
}

export async function signIn(email: string, password: string): Promise<Session> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error("Não foi possível iniciar a sessão.");

  const profile = await fetchProfile(data.session.user);
  return toSession(data.session, profile);
}

export async function requestPasswordReset(email: string) {
  const client = requireSupabase();
  const redirectTo =
    typeof window === "undefined" ? undefined : `${window.location.origin}/reset-password`;

  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  cacheProfile(null);
  await supabase.auth.signOut();
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Server-side Supabase client bound to the request cookies. Use this for
// anything that depends on the authenticated user.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll throws when called from a Server Component — fine, the
          // middleware refreshes the session.
        }
      },
    },
  });
}

// Service-role client. Bypasses RLS — only use in server actions for
// privileged operations (e.g. claim_invite is locked down to service_role).
export function createSupabaseServiceClient() {
  return createServiceClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

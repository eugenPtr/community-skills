import type { SupabaseClient } from "@supabase/supabase-js";

// The seam invite generation inserts through: the service-role client in
// production, a pglite adapter in tests. Insert reports the Postgres error code
// so the collision retry can recognise a primary-key conflict (23505) on `code`
// and try a fresh code, distinct from any other failure.
export interface GenerateInviteClient {
  insertInvite(
    code: string,
    adminId: string,
  ): PromiseLike<{ error: { code?: string; message: string } | null }>;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function segment(): string {
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

// Default code factory: INV-XXXX-XXXX, uppercase alphanumeric. The INV- prefix
// keeps generated codes distinct from the dev seed's DEV-* codes (both stay
// valid invites).
export function makeInviteCode(): string {
  return `INV-${segment()}-${segment()}`;
}

const MAX_ATTEMPTS = 5;

// Mint one invite attributed to the acting Admin and return its code. The code
// comes from the injected `makeCode` factory (default `makeInviteCode`); on the
// only collision that can happen -- a duplicate `code` primary key (23505) -- it
// retries with a fresh code. Generation has no atomicity requirement, so it is
// a plain insert, not an RPC (ADR-0007, contrast claim_invite).
export async function generateInvite(
  client: GenerateInviteClient,
  opts: { adminId: string; makeCode?: () => string },
): Promise<string> {
  const makeCode = opts.makeCode ?? makeInviteCode;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = makeCode();
    const { error } = await client.insertInvite(code, opts.adminId);
    if (!error) return code;
    // 23505 = unique_violation on the `code` primary key: collision, try again.
    if (error.code !== "23505") {
      throw new Error(`generateInvite failed: ${error.message}`);
    }
  }

  throw new Error(
    `generateInvite failed: ${MAX_ATTEMPTS} code collisions in a row`,
  );
}

// Production adapter over the service-role client (ADR-0007).
export function supabaseGenerateInviteClient(
  service: SupabaseClient,
): GenerateInviteClient {
  return {
    async insertInvite(code, adminId) {
      const { error } = await service
        .from("invites")
        .insert({ code, generated_by: adminId });
      return {
        error: error ? { code: error.code, message: error.message } : null,
      };
    },
  };
}

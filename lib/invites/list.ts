import type { SupabaseClient } from "@supabase/supabase-js";

// One invite as it comes out of the data source, before display rules apply.
// `claimed` is the source of truth for PENDING (it tracks invites.claimed_by,
// not whether a profile name resolves), so a claimed invite whose claimer has
// no profile yet still reads as claimed rather than flipping to PENDING.
export interface InviteRow {
  code: string;
  createdAt: string; // ISO timestamp
  claimed: boolean;
  claimerFirstName: string | null;
  claimerLastName: string | null;
  generatorFirstName: string | null;
  generatorLastName: string | null;
}

// One row as the Admin Dashboard table renders it. Display strings are already
// resolved: "Claimed by" is the claimer's full name or "PENDING"; "Generated
// by" is the generator's full name or "" (a legacy invite with no author).
export interface InviteListRow {
  code: string;
  claimedBy: string;
  generatedBy: string;
}

export interface ListInvitesClient {
  fetchInvites(): PromiseLike<{
    data: InviteRow[] | null;
    error: { message: string } | null;
  }>;
}

function fullName(
  first: string | null,
  last: string | null,
): string {
  return [first, last].filter((p) => p && p.trim()).join(" ");
}

// Every invite, ordered for the Admin Dashboard and resolved to display strings.
// PENDING invites (still handable) come before claimed ones; within each group
// the newest invite is first. This is the business rule the table depends on, so
// it lives here and is asserted once, independent of the data source.
export async function listInvites(
  client: ListInvitesClient,
): Promise<InviteListRow[]> {
  const { data, error } = await client.fetchInvites();
  if (error) throw new Error(`listInvites failed: ${error.message}`);

  const rows = [...(data ?? [])].sort((a, b) => {
    // PENDING (not claimed) sorts above claimed.
    if (a.claimed !== b.claimed) return a.claimed ? 1 : -1;
    // Within a group, newest created_at first.
    return b.createdAt.localeCompare(a.createdAt);
  });

  return rows.map((r) => ({
    code: r.code,
    claimedBy: r.claimed
      ? fullName(r.claimerFirstName, r.claimerLastName)
      : "PENDING",
    generatedBy: fullName(r.generatorFirstName, r.generatorLastName),
  }));
}

// Production adapter over the service-role client (ADR-0007 -- admin invite
// reads bypass RLS). invites has no direct FK to profiles, so rather than lean
// on PostgREST relationship embedding we fetch the invites, then the profiles
// for every referenced member, and join the names in JS. Low-frequency admin
// path, so the second round trip is fine.
export function supabaseListInvitesClient(
  service: SupabaseClient,
): ListInvitesClient {
  return {
    async fetchInvites() {
      const { data: invites, error } = await service
        .from("invites")
        .select("code, created_at, claimed_by, generated_by");
      if (error) return { data: null, error: { message: error.message } };

      const ids = [
        ...new Set(
          (invites ?? []).flatMap((i) =>
            [i.claimed_by, i.generated_by].filter(
              (id): id is string => Boolean(id),
            ),
          ),
        ),
      ];

      const names = new Map<string, { first: string; last: string }>();
      if (ids.length > 0) {
        const { data: profiles, error: profilesError } = await service
          .from("profiles")
          .select("member_id, first_name, last_name")
          .in("member_id", ids);
        if (profilesError) {
          return { data: null, error: { message: profilesError.message } };
        }
        for (const p of profiles ?? []) {
          names.set(p.member_id, { first: p.first_name, last: p.last_name });
        }
      }

      return {
        data: (invites ?? []).map((i) => {
          const claimer = i.claimed_by ? names.get(i.claimed_by) : undefined;
          const generator = i.generated_by
            ? names.get(i.generated_by)
            : undefined;
          return {
            code: i.code,
            createdAt: i.created_at,
            claimed: i.claimed_by != null,
            claimerFirstName: claimer?.first ?? null,
            claimerLastName: claimer?.last ?? null,
            generatorFirstName: generator?.first ?? null,
            generatorLastName: generator?.last ?? null,
          };
        }),
        error: null,
      };
    },
  };
}

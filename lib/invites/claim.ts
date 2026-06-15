// The result the claim server action returns. Distinct kinds for the two
// failure modes the issue calls out (invalid code vs already-claimed code)
// so the UI can render a precise message and the integration test can
// assert the exact failure.
export type ClaimResult =
  | { kind: "ok"; memberId: string }
  | { kind: "invalid" }
  | { kind: "alreadyClaimed" };

// The minimum surface we need from a Supabase-shaped client. The server
// action passes the real service-role client; tests pass an adapter over
// pglite. Both call into the same `claim_invite` Postgres function.
//
// The Supabase JS client's `.rpc()` returns a thenable builder rather than
// a plain Promise — typing the arg as PromiseLike lets that match.
export interface InviteRpcClient {
  rpc(
    name: "claim_invite",
    args: { p_user_id: string; p_email: string; p_code: string },
  ): PromiseLike<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
}

export async function claimInvite(
  client: InviteRpcClient,
  opts: { code: string; userId: string; email: string },
): Promise<ClaimResult> {
  const { data, error } = await client.rpc("claim_invite", {
    p_user_id: opts.userId,
    p_email: opts.email,
    p_code: opts.code,
  });

  if (error) {
    if (error.code === "P0001") return { kind: "invalid" };
    if (error.code === "P0002") return { kind: "alreadyClaimed" };
    throw new Error(`claim_invite failed: ${error.message}`);
  }

  return { kind: "ok", memberId: String(data) };
}

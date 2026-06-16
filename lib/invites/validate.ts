export type ValidateResult =
  | { kind: "valid" }
  | { kind: "invalid" }
  | { kind: "already-claimed" };

export interface InviteValidateClient {
  findInvite(code: string): PromiseLike<{ claimedBy: string | null } | null>;
}

export async function validateInvite(
  client: InviteValidateClient,
  code: string,
): Promise<ValidateResult> {
  const invite = await client.findInvite(code);
  if (invite === null) return { kind: "invalid" };
  if (invite.claimedBy !== null) return { kind: "already-claimed" };
  return { kind: "valid" };
}

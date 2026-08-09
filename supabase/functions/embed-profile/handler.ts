export interface ProfileWebhookPayload {
  type: "INSERT" | "UPDATE";
  table: "profiles";
  schema: "public";
  record: { member_id: string };
  old_record: Record<string, unknown> | null;
}

export type ReembedProfile = (memberId: string) => Promise<{ embeddingInput: string }>;

function isProfileWebhookPayload(value: unknown): value is ProfileWebhookPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<ProfileWebhookPayload>;
  return (payload.type === "INSERT" || payload.type === "UPDATE")
    && payload.table === "profiles"
    && payload.schema === "public"
    && typeof payload.record?.member_id === "string"
    && payload.record.member_id.length > 0;
}

export function createProfileWebhookHandler(deps: { reembedProfile: ReembedProfile }) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") {
      return Response.json({ error: "method_not_allowed" }, { status: 405, headers: { Allow: "POST" } });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }

    if (!isProfileWebhookPayload(payload)) {
      return Response.json({ error: "invalid_profile_webhook" }, { status: 400 });
    }

    try {
      const result = await deps.reembedProfile(payload.record.member_id);
      return Response.json({ ok: true, memberId: payload.record.member_id, embeddingInput: result.embeddingInput });
    } catch (error) {
      console.error("Profile re-embedding failed", error);
      return Response.json({ error: "profile_reembedding_failed" }, { status: 500 });
    }
  };
}

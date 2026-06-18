function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get supabaseUrl(): string {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey(): string {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey(): string {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  // The single credential for both embeddings and answers via the Vercel AI
  // Gateway (ADR-0008). Managed with `vercel env`, pulled locally with
  // `vercel env pull`.
  get aiGatewayApiKey(): string {
    return required("AI_GATEWAY_API_KEY");
  },
};

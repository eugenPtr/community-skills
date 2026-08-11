export function serializeEmbedding(embedding: number[] | string): string {
  return typeof embedding === "string" ? embedding : JSON.stringify(embedding);
}

export type ResourceClassification = "free" | "paid";

export interface ResourceInput {
  description: string;
  classification: ResourceClassification;
}

export interface Resource extends ResourceInput {
  id: string;
  position: number;
}

export function normalizeResources(resources: ResourceInput[]): ResourceInput[] | null {
  const normalized = resources.map((resource) => ({
    ...resource,
    description: resource.description.trim().replace(/\s+/g, " "),
  }));
  if (normalized.length < 1) return null;
  if (normalized.some((r) => r.description.length < 1 || r.description.length > 255)) return null;
  if (normalized.filter((r) => r.classification === "free").length > 10) return null;
  if (normalized.filter((r) => r.classification === "paid").length > 10) return null;
  const unique = new Set(normalized.map((r) => r.description.toLocaleLowerCase("ro")));
  return unique.size === normalized.length ? normalized : null;
}

export function parseResourceLines(free: string, paid: string): ResourceInput[] {
  return [
    ...free.split(/\r?\n/).map((description) => ({ description, classification: "free" as const })),
    ...paid.split(/\r?\n/).map((description) => ({ description, classification: "paid" as const })),
  ].filter((resource) => resource.description.trim().length > 0);
}

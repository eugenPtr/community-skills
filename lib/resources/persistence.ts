export function withPersistedResourceId<T extends object>(
  resource: T,
  id: string,
): T & { id: string } {
  return { ...resource, id };
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function validateProfilePhoto(file: File): Promise<{ extension: string } | null> {
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension || file.size === 0 || file.size > MAX_PHOTO_BYTES) return null;
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  const webp = new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return ((file.type === "image/jpeg" && jpeg) || (file.type === "image/png" && png) ||
    (file.type === "image/webp" && webp)) ? { extension } : null;
}

export function profileInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toLocaleUpperCase("ro");
}

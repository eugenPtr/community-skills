import { ProfileAvatar } from "@/components/profile-avatar";

export function ProfilePhotoPicker({
  id,
  name,
  photoUrl,
  hasPhoto,
  hideActionWhenPhoto = false,
  onChange,
}: {
  id: string;
  name: string;
  photoUrl?: string | null;
  hasPhoto: boolean;
  hideActionWhenPhoto?: boolean;
  onChange: (file?: File) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-start sm:gap-6">
      <ProfileAvatar name={name} photoUrl={photoUrl} size="lg" />
      {!(hasPhoto && hideActionWhenPhoto) ? <label
        htmlFor={id}
        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-white/5 hover:text-white focus-within:ring-2 focus-within:ring-white focus-within:ring-offset-2 focus-within:ring-offset-zinc-950"
      >
        {hasPhoto ? "Schimba" : "Incarca o fotografie de profil"}
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            onChange(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
          className="sr-only"
        />
      </label> : null}
    </div>
  );
}

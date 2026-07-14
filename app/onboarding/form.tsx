"use client";

import { useState } from "react";
import { submitOnboardingAction } from "./actions";

export default function OnboardingForm({ invite }: { invite: string }) {
  const [hasHeartProject, setHasHeartProject] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Intră în rețea</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Spune-ne despre tine, ca membrii să te poată găsi.
        </p>
      </div>

      <form
        action={submitOnboardingAction}
        onSubmit={() => setSubmitting(true)}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="invite" value={invite} />

        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="first_name" className="text-sm font-medium">Prenume</label>
            <input id="first_name" name="first_name" required disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="last_name" className="text-sm font-medium">Nume</label>
            <input id="last_name" name="last_name" required disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="location" className="text-sm font-medium">Localitate</label>
          <input id="location" name="location" required disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" placeholder="Oraș, Țară" />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="skills" className="text-sm font-medium">Abilități</label>
          <textarea id="skills" name="skills" required rows={3} disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" placeholder="Cu ce îi poți ajuta pe ceilalți?" />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="passions" className="text-sm font-medium">Pasiuni</label>
          <textarea id="passions" name="passions" required rows={3} disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" placeholder="Ce te aduce în starea de flow?" />
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Ai un Proiect de Suflet?</p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setHasHeartProject(true)}
              className={`flex-1 rounded border px-3 py-2 text-sm disabled:opacity-50 ${hasHeartProject === true ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"}`}
            >
              Da
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setHasHeartProject(false)}
              className={`flex-1 rounded border px-3 py-2 text-sm disabled:opacity-50 ${hasHeartProject === false ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"}`}
            >
              Încă nu
            </button>
          </div>

          <input
            type="hidden"
            name="heart_project_seeking"
            value={hasHeartProject === false ? "true" : "false"}
          />

          {hasHeartProject === true && (
            <div className="flex flex-col gap-1">
              <label htmlFor="heart_project_description" className="text-sm font-medium">
                Descrie-ți Proiectul de Suflet
              </label>
              <textarea
                id="heart_project_description"
                name="heart_project_description"
                rows={4}
                disabled={submitting}
                className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50"
                placeholder="Ce îți dorești cel mai mult să construiești sau să creezi?"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Rețele și contact</p>
          <p className="-mt-2 text-xs text-zinc-500">
            Toate opționale. Apar pe profilul tău, ca membrii să te poată contacta.
          </p>

          <div className="flex flex-col gap-1">
            <label htmlFor="phone" className="text-sm font-medium">Telefon</label>
            <input id="phone" name="phone" type="tel" disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="contact_email" className="text-sm font-medium">Email de contact</label>
            <input id="contact_email" name="contact_email" type="email" disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="website" className="text-sm font-medium">Site web</label>
            <input id="website" name="website" disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="linkedin" className="text-sm font-medium">LinkedIn</label>
            <input id="linkedin" name="linkedin" disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="facebook" className="text-sm font-medium">Facebook</label>
            <input id="facebook" name="facebook" disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="instagram" className="text-sm font-medium">Instagram</label>
            <input id="instagram" name="instagram" disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="x" className="text-sm font-medium">X</label>
            <input id="x" name="x" disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Se trimite…" : "Intră în rețea"}
        </button>
      </form>
    </main>
  );
}

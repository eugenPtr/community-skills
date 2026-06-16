"use client";

import { useState } from "react";
import { submitOnboardingAction } from "./actions";

export default function OnboardingForm({ invite }: { invite: string }) {
  const [hasHeartProject, setHasHeartProject] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Join the network</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Tell us about yourself so Members can find you.
        </p>
      </div>

      <form
        action={submitOnboardingAction}
        onSubmit={() => setSubmitting(true)}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="invite" value={invite} />

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">Name</label>
          <input id="name" name="name" required disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="location" className="text-sm font-medium">Location</label>
          <input id="location" name="location" required disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" placeholder="City, Country" />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="skills" className="text-sm font-medium">Skills</label>
          <textarea id="skills" name="skills" required rows={3} disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" placeholder="What can you do for others?" />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="passions" className="text-sm font-medium">Passions</label>
          <textarea id="passions" name="passions" required rows={3} disabled={submitting} className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50" placeholder="What puts you in a state of flow?" />
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Do you have a Heart Project?</p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setHasHeartProject(true)}
              className={`flex-1 rounded border px-3 py-2 text-sm disabled:opacity-50 ${hasHeartProject === true ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"}`}
            >
              Yes
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setHasHeartProject(false)}
              className={`flex-1 rounded border px-3 py-2 text-sm disabled:opacity-50 ${hasHeartProject === false ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"}`}
            >
              Not yet
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
                Describe your Heart Project
              </label>
              <textarea
                id="heart_project_description"
                name="heart_project_description"
                rows={4}
                disabled={submitting}
                className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50"
                placeholder="What are you most devoted to building or creating?"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Joining…" : "Join the network"}
        </button>
      </form>
    </main>
  );
}

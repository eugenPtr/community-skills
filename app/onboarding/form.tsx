"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitOnboardingAction } from "./actions";
import PhoneInput, {
  getCountries,
  type Country,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { getExampleNumber, isPossiblePhoneNumber } from "libphonenumber-js/max";
import examples from "libphonenumber-js/mobile/examples";
import { toast } from "sonner";

type OnboardingFormProps = {
  invite: string;
  memberId: string;
  loginEmail: string;
  testMode?: boolean;
};

const fieldClass = (invalid: boolean) =>
  `rounded border px-3 py-2 outline-none transition-colors focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 ${
    invalid ? "border-red-600" : "border-zinc-300"
  }`;

const countryDisplayNames = new Intl.DisplayNames(["ro"], { type: "region" });
const phoneLabels = Object.fromEntries([
  ["country", "Țară"],
  ["phone", "Număr de telefon"],
  ["ext", "Interior"],
  ["ZZ", "Internațional"],
  ...getCountries().map((country) => [country, countryDisplayNames.of(country) ?? country]),
]);

function phonePlaceholder(country?: Country) {
  if (!country || country === "RO") return "+40 721 234 567";
  return getExampleNumber(country, examples)?.formatInternational() ?? "+";
}

const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export default function OnboardingForm({
  invite,
  memberId,
  loginEmail,
  testMode = false,
}: OnboardingFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const draftKey = `onboarding-draft:${memberId}:${invite}`;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    location: "",
    skills: "",
    passions: "",
    heartProject: null as boolean | null,
    heartProjectDescription: "",
    phone: "",
    contactEmail: loginEmail,
    website: "",
    linkedin: "",
    facebook: "",
    instagram: "",
    x: "",
  });
  const [phoneCountry, setPhoneCountry] = useState<Country | undefined>("RO");
  const [submitting, setSubmitting] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [invalid, setInvalid] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const serialized = localStorage.getItem(draftKey);
        if (serialized) {
          const draft = JSON.parse(serialized) as {
            version?: number;
            expiresAt?: number;
            step?: 1 | 2 | 3;
            values?: typeof values;
            phoneCountry?: Country;
          };
          if (
            draft.version !== 1 ||
            !draft.expiresAt ||
            draft.expiresAt <= Date.now() ||
            !draft.values
          ) {
            localStorage.removeItem(draftKey);
          } else {
            setValues({ ...draft.values, contactEmail: draft.values.contactEmail || loginEmail });
            setPhoneCountry(draft.phoneCountry ?? "RO");
            const identityComplete = [
              draft.values.firstName,
              draft.values.lastName,
              draft.values.location,
            ].every((value) => value?.trim());
            const profileComplete =
              draft.values.skills?.trim() &&
              draft.values.passions?.trim() &&
              draft.values.heartProject !== null &&
              (draft.values.heartProject === false ||
                draft.values.heartProjectDescription?.trim());
            setStep(
              !identityComplete
                ? 1
                : draft.step === 3 && profileComplete
                  ? 3
                  : (Math.min(2, draft.step ?? 1) as 1 | 2),
            );
          }
        }
      } catch {
        localStorage.removeItem(draftKey);
      } finally {
        setDraftLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [draftKey, loginEmail]);

  useEffect(() => {
    if (!draftLoaded) return;
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        version: 1,
        expiresAt: Date.now() + DRAFT_TTL_MS,
        step,
        values,
        phoneCountry,
      }),
    );
  }, [draftKey, draftLoaded, phoneCountry, step, values]);

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setInvalid((current) => current.filter((name) => name !== field));
  }

  function next() {
    const missing =
      step === 1
        ? (["firstName", "lastName", "location"] as const).filter(
            (field) => !values[field].trim(),
          )
        : [
            ...(["skills", "passions"] as const).filter(
              (field) => !values[field].trim(),
            ),
            ...(values.heartProject === null ? ["heartProject"] : []),
            ...(values.heartProject === true && !values.heartProjectDescription.trim()
              ? ["heartProjectDescription"]
              : []),
          ];
    setInvalid(missing);
    if (missing.length > 0) {
      requestAnimationFrame(() => formRef.current?.reportValidity());
      return;
    }
    setStep((current) => Math.min(3, current + 1) as 1 | 2 | 3);
  }

  async function finalize() {
    const invalidContact = [
      ...(!values.phone || !isPossiblePhoneNumber(values.phone) ? ["phone"] : []),
      ...(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail.trim())
        ? ["contactEmail"]
        : []),
    ];
    setInvalid(invalidContact);
    if (invalidContact.length > 0) {
      if (invalidContact.includes("phone")) {
        toast.error("Numărul de telefon are o lungime invalidă");
      }
      if (invalidContact.includes("contactEmail")) {
        toast.error("Adresa de email are un format invalid");
      }
      requestAnimationFrame(() => formRef.current?.reportValidity());
      return;
    }
    if (testMode) {
      localStorage.removeItem(draftKey);
      toast.success("Fluxul de test a fost finalizat. Nicio informație nu a fost salvată.");
      return;
    }
    setSubmitting(true);
    const formData = new FormData();
    const entries = {
      invite,
      first_name: values.firstName,
      last_name: values.lastName,
      location: values.location,
      skills: values.skills,
      passions: values.passions,
      heart_project_seeking: values.heartProject === false ? "true" : "false",
      heart_project_description: values.heartProjectDescription,
      phone: values.phone,
      contact_email: values.contactEmail,
      website: values.website,
      linkedin: values.linkedin,
      facebook: values.facebook,
      instagram: values.instagram,
      x: values.x,
    };
    Object.entries(entries).forEach(([name, value]) => formData.set(name, value));

    try {
      const result = await submitOnboardingAction(formData);
      if (result?.kind === "ok") {
        localStorage.removeItem(draftKey);
        router.replace("/");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Intră în rețea</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Spune-ne despre tine, ca membrii să te poată găsi.
        </p>
      </div>

      <div aria-label="Progres înregistrare" className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Pasul {step}/3
        </p>
        <div className="grid grid-cols-3 gap-2" aria-hidden="true">
          {[1, 2, 3].map((segment) => (
            <span
              key={segment}
              data-testid="progress-segment"
              className={`h-1.5 rounded-full transition-colors ${segment <= step ? "bg-zinc-900" : "bg-zinc-200"}`}
            />
          ))}
        </div>
      </div>

      <form ref={formRef} onSubmit={(event) => event.preventDefault()} className="flex flex-col gap-5">
        <h2 className="text-xl font-semibold">
          {step === 1
            ? "Despre tine"
            : step === 2
              ? "Abilități, pasiuni și Proiect de Suflet"
              : "Contact"}
        </h2>

        {step === 1 ? <><div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="first_name" className="text-sm font-medium">
              Prenume (obligatoriu)
            </label>
            <input
              id="first_name"
              name="first_name"
              required
              value={values.firstName}
              onChange={(event) => update("firstName", event.target.value)}
              aria-invalid={invalid.includes("firstName")}
              className={fieldClass(invalid.includes("firstName"))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="last_name" className="text-sm font-medium">
              Nume (obligatoriu)
            </label>
            <input
              id="last_name"
              name="last_name"
              required
              value={values.lastName}
              onChange={(event) => update("lastName", event.target.value)}
              aria-invalid={invalid.includes("lastName")}
              className={fieldClass(invalid.includes("lastName"))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="location" className="text-sm font-medium">
            Localitate (obligatoriu)
          </label>
          <input
            id="location"
            name="location"
            required
            value={values.location}
            onChange={(event) => update("location", event.target.value)}
            aria-invalid={invalid.includes("location")}
            className={fieldClass(invalid.includes("location"))}
            placeholder="Oraș, Țară"
          />
        </div>

        </> : null}

        {step === 2 ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="skills" className="text-sm font-medium">
                Abilități (obligatoriu)
              </label>
              <textarea
                id="skills"
                required
                rows={3}
                value={values.skills}
                onChange={(event) => update("skills", event.target.value)}
                aria-invalid={invalid.includes("skills")}
                className={fieldClass(invalid.includes("skills"))}
                placeholder="Cu ce îi poți ajuta pe ceilalți?"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="passions" className="text-sm font-medium">
                Pasiuni (obligatoriu)
              </label>
              <textarea
                id="passions"
                required
                rows={3}
                value={values.passions}
                onChange={(event) => update("passions", event.target.value)}
                aria-invalid={invalid.includes("passions")}
                className={fieldClass(invalid.includes("passions"))}
                placeholder="Ce te aduce în starea de flow?"
              />
            </div>
            <fieldset
              className={`rounded-lg border p-3 ${invalid.includes("heartProject") ? "border-red-600" : "border-transparent"}`}
              aria-invalid={invalid.includes("heartProject")}
            >
              <legend className="px-1 text-sm font-medium">
                Ai un Proiect de Suflet? (obligatoriu)
              </legend>
              <div className="mt-1 flex gap-3">
                {[true, false].map((choice) => (
                  <button
                    key={String(choice)}
                    type="button"
                    aria-pressed={values.heartProject === choice}
                    onClick={() => {
                      setValues((current) => ({ ...current, heartProject: choice }));
                      setInvalid((current) => current.filter((name) => name !== "heartProject"));
                    }}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      values.heartProject === choice
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-500"
                    }`}
                  >
                    {choice ? "Da" : "Încă nu"}
                  </button>
                ))}
              </div>
            </fieldset>
            {values.heartProject === true ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="heart_project_description" className="text-sm font-medium">
                  Descrie-ți Proiectul de Suflet (obligatoriu)
                </label>
                <textarea
                  id="heart_project_description"
                  required
                  rows={4}
                  value={values.heartProjectDescription}
                  onChange={(event) => update("heartProjectDescription", event.target.value)}
                  aria-invalid={invalid.includes("heartProjectDescription")}
                  className={fieldClass(invalid.includes("heartProjectDescription"))}
                  placeholder="Ce îți dorești cel mai mult să construiești sau să creezi?"
                />
              </div>
            ) : null}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <p className="text-sm leading-6 text-zinc-600">
              Telefonul și emailul de contact sunt obligatorii și vor fi vizibile membrilor
              rețelei. Celelalte câmpuri sunt opționale.
            </p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium">
                Telefon (obligatoriu)
              </label>
              <PhoneInput
                id="phone"
                name="phone"
                required
                international
                defaultCountry="RO"
                countryCallingCodeEditable={false}
                labels={phoneLabels}
                value={values.phone || undefined}
                onChange={(phone) => update("phone", phone ?? "")}
                onCountryChange={setPhoneCountry}
                placeholder={phonePlaceholder(phoneCountry)}
                aria-invalid={invalid.includes("phone")}
                className="gap-2"
                numberInputProps={{
                  className: fieldClass(invalid.includes("phone")),
                }}
                countrySelectProps={{
                  className:
                    "rounded border border-zinc-300 bg-white px-2 outline-none focus:ring-2 focus:ring-zinc-200",
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact_email" className="text-sm font-medium">
                Email de contact (obligatoriu)
              </label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                required
                value={values.contactEmail}
                onChange={(event) => update("contactEmail", event.target.value)}
                aria-invalid={invalid.includes("contactEmail")}
                className={fieldClass(invalid.includes("contactEmail"))}
              />
            </div>

            {([
              ["website", "Site web"],
              ["linkedin", "LinkedIn"],
              ["facebook", "Facebook"],
              ["instagram", "Instagram"],
              ["x", "X"],
            ] as const).map(([field, label]) => (
              <div key={field} className="flex flex-col gap-1.5">
                <label htmlFor={field} className="text-sm font-medium">
                  {label}
                </label>
                <input
                  id={field}
                  name={field}
                  value={values[field]}
                  onChange={(event) => update(field, event.target.value)}
                  className={fieldClass(false)}
                />
              </div>
            ))}
          </>
        ) : null}

        <div className="flex gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                setInvalid([]);
                setStep((current) => Math.max(1, current - 1) as 1 | 2 | 3);
              }}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:border-zinc-500"
            >
              Înapoi
            </button>
          ) : null}
          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
            >
              Înainte
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={finalize}
              className="flex-[2] rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              {submitting ? "Se finalizează…" : "Finalizează înregistrarea"}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}

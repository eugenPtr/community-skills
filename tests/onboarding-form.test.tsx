// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingForm from "@/app/onboarding/form";

const { mockSubmit, mockReplace, mockToastError, mockToastSuccess } = vi.hoisted(() => ({
  mockSubmit: vi.fn(),
  mockReplace: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

vi.mock("@/app/onboarding/actions", () => ({
  submitOnboardingAction: mockSubmit,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("sonner", () => ({
  toast: { error: mockToastError, success: mockToastSuccess },
}));

describe("OnboardingForm (Member-facing form seam)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockSubmit.mockReset();
    mockReplace.mockReset();
    mockToastError.mockReset();
    mockToastSuccess.mockReset();
  });
  afterEach(cleanup);

  async function completeIdentityStep(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Prenume (obligatoriu)"), "Ana");
    await user.type(screen.getByLabelText("Nume (obligatoriu)"), "Popescu");
    await user.type(screen.getByLabelText("Localitate (obligatoriu)"), "Cluj-Napoca");
    await user.click(screen.getByRole("button", { name: "Înainte" }));
  }

  async function reachContactStep(user: ReturnType<typeof userEvent.setup>) {
    await completeIdentityStep(user);
    await user.type(screen.getByLabelText("Abilități (obligatoriu)"), "Design");
    await user.type(screen.getByLabelText("Pasiuni (obligatoriu)"), "Muzică");
    await user.click(screen.getByRole("button", { name: "Încă nu" }));
    await user.click(screen.getByRole("button", { name: "Înainte" }));
  }

  it("starts with the required identity step and a three-part progress indicator", () => {
    render(
      <OnboardingForm
        invite="DEV-AAAA-0002"
        memberId="member-1"
        loginEmail="member@example.com"
      />,
    );

    expect(screen.getByText("Pasul 1/3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Despre tine" })).toBeInTheDocument();
    expect(screen.getAllByTestId("progress-segment")).toHaveLength(3);
    expect(screen.getByLabelText("Prenume (obligatoriu)")).toBeRequired();
    expect(screen.getByLabelText("Nume (obligatoriu)")).toBeRequired();
    expect(screen.getByLabelText("Localitate (obligatoriu)")).toBeRequired();
    expect(screen.getByRole("button", { name: "Înainte" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Înapoi" })).not.toBeInTheDocument();
  });

  it("marks empty identity fields invalid and stays on the first step", async () => {
    const user = userEvent.setup();
    render(
      <OnboardingForm
        invite="DEV-AAAA-0002"
        memberId="member-1"
        loginEmail="member@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Înainte" }));

    expect(screen.getByText("Pasul 1/3")).toBeInTheDocument();
    expect(screen.getByLabelText("Prenume (obligatoriu)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Nume (obligatoriu)")).toHaveClass("border-red-600");
    expect(screen.getByLabelText("Localitate (obligatoriu)")).toHaveClass(
      "border-red-600",
    );
  });

  it("validates the required profile step and preserves identity values when going back", async () => {
    const user = userEvent.setup();
    render(
      <OnboardingForm
        invite="DEV-AAAA-0002"
        memberId="member-1"
        loginEmail="member@example.com"
      />,
    );

    await completeIdentityStep(user);

    expect(screen.getByText("Pasul 2/3")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Abilități, pasiuni și Proiect de Suflet",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Abilități (obligatoriu)")).toBeRequired();
    expect(screen.getByLabelText("Pasiuni (obligatoriu)")).toBeRequired();

    await user.click(screen.getByRole("button", { name: "Înainte" }));
    expect(screen.getByLabelText("Abilități (obligatoriu)")).toHaveClass(
      "border-red-600",
    );
    expect(screen.getByRole("group", { name: "Ai un Proiect de Suflet? (obligatoriu)" })).toHaveClass(
      "border-red-600",
    );

    await user.click(screen.getByRole("button", { name: "Înapoi" }));
    expect(screen.getByLabelText("Prenume (obligatoriu)")).toHaveValue("Ana");
  });

  it("requires a Heart Project description only when the Member chooses Da", async () => {
    const user = userEvent.setup();
    render(
      <OnboardingForm
        invite="DEV-AAAA-0002"
        memberId="member-1"
        loginEmail="member@example.com"
      />,
    );
    await completeIdentityStep(user);
    await user.type(screen.getByLabelText("Abilități (obligatoriu)"), "Design");
    await user.type(screen.getByLabelText("Pasiuni (obligatoriu)"), "Muzică");
    await user.click(screen.getByRole("button", { name: "Da" }));
    await user.click(screen.getByRole("button", { name: "Înainte" }));

    expect(
      screen.getByLabelText("Descrie-ți Proiectul de Suflet (obligatoriu)"),
    ).toHaveClass("border-red-600");

    await user.click(screen.getByRole("button", { name: "Încă nu" }));
    await user.click(screen.getByRole("button", { name: "Înainte" }));
    expect(screen.getByText("Pasul 3/3")).toBeInTheDocument();
  });

  it("shows mandatory Direct Contact Details and optional Online Links", async () => {
    const user = userEvent.setup();
    render(
      <OnboardingForm
        invite="DEV-AAAA-0002"
        memberId="member-1"
        loginEmail="member@example.com"
      />,
    );
    await reachContactStep(user);

    expect(screen.getByRole("heading", { name: "Contact" })).toBeInTheDocument();
    expect(screen.getByLabelText("Telefon (obligatoriu)")).toHaveAttribute(
      "placeholder",
      "+40 721 234 567",
    );
    expect(screen.getByLabelText("Email de contact (obligatoriu)")).toHaveValue(
      "member@example.com",
    );
    expect(screen.getByLabelText("Site web")).not.toBeRequired();
    expect(screen.getByText(/Telefonul și emailul de contact sunt obligatorii/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Finalizează înregistrarea" }),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Țară" }), "US");
    expect(screen.getByLabelText("Telefon (obligatoriu)")).toHaveAttribute(
      "placeholder",
      expect.stringMatching(/^\+1 /),
    );
  });

  it("toasts field-specific phone and email errors on finalization", async () => {
    const user = userEvent.setup();
    render(
      <OnboardingForm
        invite="DEV-AAAA-0002"
        memberId="member-1"
        loginEmail="member@example.com"
      />,
    );
    await reachContactStep(user);

    const phone = screen.getByLabelText("Telefon (obligatoriu)");
    const email = screen.getByLabelText("Email de contact (obligatoriu)");
    await user.type(phone, "+40123");
    await user.clear(email);
    await user.type(email, "invalid-email");
    await user.click(screen.getByRole("button", { name: "Finalizează înregistrarea" }));

    expect(phone).toHaveClass("border-red-600");
    expect(email).toHaveClass("border-red-600");
    expect(mockToastError).toHaveBeenNthCalledWith(
      1,
      "Numărul de telefon are o lungime invalidă",
    );
    expect(mockToastError).toHaveBeenNthCalledWith(
      2,
      "Adresa de email are un format invalid",
    );
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("submits all three steps, clears the draft, and completes onboarding", async () => {
    mockSubmit.mockResolvedValue({ kind: "ok" });
    const user = userEvent.setup();
    const view = render(
      <OnboardingForm
        invite="DEV-AAAA-0002"
        memberId="member-1"
        loginEmail="member@example.com"
      />,
    );
    await reachContactStep(user);
    await user.type(screen.getByLabelText("Telefon (obligatoriu)"), "721234567");
    await user.click(screen.getByRole("button", { name: "Finalizează înregistrarea" }));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledOnce());
    const submitted = mockSubmit.mock.calls[0][0] as FormData;
    expect(submitted.get("first_name")).toBe("Ana");
    expect(submitted.get("skills")).toBe("Design");
    expect(submitted.get("heart_project_seeking")).toBe("true");
    expect(submitted.get("phone")).toBe("+40721234567");
    expect(submitted.get("contact_email")).toBe("member@example.com");
    expect(mockReplace).toHaveBeenCalledWith("/");

    view.unmount();
    render(
      <OnboardingForm
        invite="DEV-AAAA-0002"
        memberId="member-1"
        loginEmail="member@example.com"
      />,
    );
    expect(screen.getByText("Pasul 1/3")).toBeInTheDocument();
    expect(screen.getByLabelText("Prenume (obligatoriu)")).toHaveValue("");
  });

  it("completes test mode without submitting data or navigating", async () => {
    const user = userEvent.setup();
    render(
      <OnboardingForm
        invite="test-only"
        memberId="test-onboarding-member"
        loginEmail="test@example.com"
        testMode
      />,
    );
    await reachContactStep(user);
    await user.type(screen.getByLabelText("Telefon (obligatoriu)"), "721234567");
    await user.click(screen.getByRole("button", { name: "Finalizează înregistrarea" }));

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Fluxul de test a fost finalizat. Nicio informație nu a fost salvată.",
    );
    expect(localStorage.getItem("onboarding-draft:test-onboarding-member:test-only")).toBeNull();
  });

  it("restores a Member-and-Invite-scoped draft and its last valid step after refresh", async () => {
    const user = userEvent.setup();
    const view = render(
      <OnboardingForm
        invite="DEV-AAAA-0002"
        memberId="member-1"
        loginEmail="member@example.com"
      />,
    );
    await completeIdentityStep(user);
    view.unmount();

    render(
      <OnboardingForm
        invite="DEV-AAAA-0002"
        memberId="member-1"
        loginEmail="member@example.com"
      />,
    );
    await waitFor(() => expect(screen.getByText("Pasul 2/3")).toBeInTheDocument());

    cleanup();
    render(
      <OnboardingForm
        invite="DEV-AAAA-0003"
        memberId="member-1"
        loginEmail="member@example.com"
      />,
    );
    expect(screen.getByText("Pasul 1/3")).toBeInTheDocument();
  });

  it("discards a draft after seven days", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const view = render(
      <OnboardingForm
        invite="DEV-AAAA-0002"
        memberId="member-1"
        loginEmail="member@example.com"
      />,
    );
    await completeIdentityStep(user);
    view.unmount();
    vi.setSystemTime(Date.now() + 8 * 24 * 60 * 60 * 1000);

    render(
      <OnboardingForm
        invite="DEV-AAAA-0002"
        memberId="member-1"
        loginEmail="member@example.com"
      />,
    );
    expect(screen.getByText("Pasul 1/3")).toBeInTheDocument();
    vi.useRealTimers();
  });
});

// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingForm from "@/app/onboarding/form";

const mocks = vi.hoisted(() => ({
  submit: vi.fn(), replace: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));
vi.mock("@/app/onboarding/actions", () => ({ submitOnboardingAction: mocks.submit }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("sonner", () => ({ toast: mocks.toast }));

describe("OnboardingForm", () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
  afterEach(cleanup);

  async function reachResources(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Prenume (obligatoriu)"), "Ana");
    await user.type(screen.getByLabelText("Nume (obligatoriu)"), "Pop");
    await user.type(screen.getByLabelText("Localitate (obligatoriu)"), "Cluj");
    await user.click(screen.getByRole("button", { name: "Înainte" }));
    await user.type(screen.getByLabelText("Pasiuni (obligatoriu)"), "Muzică");
    await user.click(screen.getByRole("button", { name: "Încă nu" }));
    await user.click(screen.getByRole("button", { name: "Înainte" }));
  }

  async function addFreeResource(user: ReturnType<typeof userEvent.setup>, text = "Mentorat tehnic") {
    await user.click(screen.getAllByRole("button", { name: "Adaugă resursă" })[0]);
    const input = screen.getByLabelText("Descrie resursa gratis");
    await user.type(input, `${text}{Enter}`);
  }

  it("uses the approved four-step Resource copy and neutral requirement", async () => {
    const user = userEvent.setup();
    render(<OnboardingForm invite="DEV" memberId="m1" loginEmail="ana@example.com" />);
    expect(screen.getByText("Pasul 1/4")).toBeInTheDocument();
    expect(screen.getAllByTestId("progress-segment")).toHaveLength(4);
    await reachResources(user);
    expect(screen.getByRole("heading", { name: "Ce resurse poți oferi comunității?" })).toBeInTheDocument();
    expect(screen.getByText("Adaugă fiecare resursă separat.")).toBeInTheDocument();
    expect(screen.getByText("Adaugă cel puțin o resursă, gratis sau contra cost.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Înainte" })).toBeDisabled();
    await addFreeResource(user);
    expect(screen.getByRole("button", { name: "Înainte" })).toBeEnabled();
    expect(mocks.toast.success).not.toHaveBeenCalled();
  });

  it("submits classified Resources in their visible order", async () => {
    const user = userEvent.setup(); mocks.submit.mockResolvedValue({ kind: "ok" });
    render(<OnboardingForm invite="DEV" memberId="m1" loginEmail="ana@example.com" />);
    await reachResources(user);
    await addFreeResource(user, "Mentorat");
    await addFreeResource(user, "Atelier");
    await user.click(screen.getAllByRole("button", { name: "Adaugă resursă" })[1]);
    await user.type(screen.getByLabelText("Descrie resursa contra cost"), "Audit software{Enter}");
    await user.click(screen.getByRole("button", { name: "Înainte" }));
    await user.type(screen.getByLabelText("Telefon (obligatoriu)"), "721234567");
    await user.click(screen.getByRole("button", { name: "Finalizează înregistrarea" }));
    const data = mocks.submit.mock.calls[0][0] as FormData;
    expect(data.get("free_resources")).toBe("Mentorat\nAtelier");
    expect(data.get("paid_resources")).toBe("Audit software");
    expect(mocks.replace).toHaveBeenCalledWith("/");
  });

  it("restores Resource lists and active progress from its versioned draft", async () => {
    const user = userEvent.setup();
    render(<OnboardingForm invite="DEV" memberId="m1" loginEmail="ana@example.com" />);
    await reachResources(user);
    await addFreeResource(user, "Mentorat păstrat");
    await waitFor(() => expect(localStorage.getItem("onboarding-draft:m1:DEV")).toContain("Mentorat păstrat"));
    cleanup();
    render(<OnboardingForm invite="DEV" memberId="m1" loginEmail="ana@example.com" />);
    await waitFor(() => expect(screen.getByText("Pasul 3/4")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Mentorat păstrat" })).toBeInTheDocument();
  });

  it("ignores incompatible legacy Skill drafts", () => {
    localStorage.setItem("onboarding-draft:m1:DEV", JSON.stringify({ version: 2, expiresAt: Date.now() + 10000, step: 3, values: { freeResources: "legacy" } }));
    render(<OnboardingForm invite="DEV" memberId="m1" loginEmail="ana@example.com" />);
    expect(screen.getByText("Pasul 1/4")).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteFooter } from "@/components/site-footer";

const mocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

describe("SiteFooter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    });
  });

  afterEach(cleanup);

  it("opens the donation dialog and exposes both Profile links", async () => {
    const user = userEvent.setup();
    render(<SiteFooter />);

    const profileLinks = screen.getAllByRole("link");
    expect(profileLinks).toHaveLength(1);
    expect(profileLinks[0]).toHaveAttribute(
      "href",
      "/profile/80804dea-225e-4d37-86fe-6c627fc23e24",
    );

    await user.click(screen.getByRole("button", { name: "Donează" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(screen.getByRole("heading", { name: "Susține proiectul" })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it.each([
    ["Copiază tag revolut", "@eugenptr3", "Tag Revolut copiat."],
    ["Copiază iban", "RO86REVO0000113874415801", "IBAN copiat."],
    ["Copiază beneficiar", "Eugen Patru", "Numele beneficiarului copiat."],
  ])("copies %s and confirms with a toast", async (label, value, message) => {
    const user = userEvent.setup();
    render(<SiteFooter />);
    await user.click(screen.getByRole("button", { name: "Donează" }));
    await user.click(screen.getByRole("button", { name: label }));
    expect(await navigator.clipboard.readText()).toBe(value);
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith(message));
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
  });

  it("shows a toast when clipboard access fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("blocked"));
    render(<SiteFooter />);
    await user.click(screen.getByRole("button", { name: "Donează" }));
    await user.click(screen.getByRole("button", { name: "Copiază iban" }));
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith("Nu am putut copia. Încearcă din nou."),
    );
  });

  it("closes from both controls and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<SiteFooter />);
    const trigger = screen.getByRole("button", { name: "Donează" });

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Închide fereastra de donație" }));
    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Închide" }));
    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
  });

  it("closes when the backdrop is pressed", async () => {
    const user = userEvent.setup();
    render(<SiteFooter />);
    await user.click(screen.getByRole("button", { name: "Donează" }));
    const dialog = screen.getByRole("dialog");
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({
      left: 100,
      right: 500,
      top: 100,
      bottom: 500,
      width: 400,
      height: 400,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });
    fireEvent.click(dialog, { clientX: 20, clientY: 20 });
    expect(dialog).not.toHaveAttribute("open");
  });
});

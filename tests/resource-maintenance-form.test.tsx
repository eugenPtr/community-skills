// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceMaintenanceForm } from "@/components/resource-maintenance-form";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  save: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, back: mocks.back }) }));
vi.mock("@/app/profile/resources/actions", () => ({ saveResourcesAction: mocks.save }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: mocks.toastError, success: vi.fn() }) }));

const initial = [{ id: "11111111-1111-4111-8111-111111111111", description: "Mentorat", classification: "free" as const, position: 0 }];

describe("ResourceMaintenanceForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.save.mockResolvedValue({ kind: "ok" });
    vi.spyOn(window, "confirm").mockReturnValue(false);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("allows a temporarily empty draft but disables save and unchecks the checklist", async () => {
    const user = userEvent.setup();
    render(<ResourceMaintenanceForm initialResources={initial} />);
    await user.click(screen.getByRole("button", { name: "Acțiuni pentru Mentorat" }));
    await user.click(screen.getByRole("button", { name: "Elimină" }));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Salvează modificările" })).toBeDisabled();
  });

  it("warns before Back navigation and refresh when edits are dirty", async () => {
    const user = userEvent.setup();
    render(<ResourceMaintenanceForm initialResources={initial} />);
    await user.click(screen.getByRole("button", { name: "Mentorat" }));
    const edit = screen.getByLabelText("Editează Mentorat");
    await user.clear(edit);
    await user.type(edit, "Coaching{Enter}");

    await user.click(screen.getByRole("button", { name: "Înapoi" }));
    expect(window.confirm).toHaveBeenCalled();
    expect(mocks.back).not.toHaveBeenCalled();

    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
  });

  it("saves explicitly, then navigates with the established success-toast param", async () => {
    const user = userEvent.setup();
    render(<ResourceMaintenanceForm initialResources={initial} />);
    await user.click(screen.getByRole("button", { name: "Mentorat" }));
    const edit = screen.getByLabelText("Editează Mentorat");
    await user.clear(edit);
    await user.type(edit, "Coaching{Enter}");
    await user.click(screen.getByRole("button", { name: "Salvează modificările" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith([
      expect.objectContaining({ id: initial[0].id, description: "Coaching", classification: "free" }),
    ]));
    expect(mocks.push).toHaveBeenCalledWith("/profile?sent=resources-updated");
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvează modificările" })).toBeDisabled());
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(false);
  });

  it("keeps published data unchanged in the UI contract when save fails", async () => {
    mocks.save.mockRejectedValue(new Error("embedding failed"));
    const user = userEvent.setup();
    render(<ResourceMaintenanceForm initialResources={initial} />);
    await user.click(screen.getByRole("button", { name: "Mentorat" }));
    const edit = screen.getByLabelText("Editează Mentorat");
    await user.clear(edit);
    await user.type(edit, "Coaching{Enter}");
    await user.click(screen.getByRole("button", { name: "Salvează modificările" }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Resursele nu au putut fi salvate. Setul publicat a rămas neschimbat."));
    expect(mocks.push).not.toHaveBeenCalled();
  });
});

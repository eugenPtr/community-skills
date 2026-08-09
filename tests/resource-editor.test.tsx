// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceEditor, type EditableResource } from "@/components/resource-editor";

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

function Harness({ initial = [] }: { initial?: EditableResource[] }) {
  const [resources, setResources] = useState(initial);
  return <ResourceEditor resources={resources} onChange={setResources} />;
}

describe("ResourceEditor", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("keeps both empty sections visible and preserves an add draft on blur", async () => {
    const user = userEvent.setup(); render(<Harness />);
    expect(screen.getByText("Resurse gratis")).toBeInTheDocument();
    expect(screen.getByText("Resurse contra cost")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Adaugă resursă" })).toHaveLength(2);
    await user.click(screen.getAllByRole("button", { name: "Adaugă resursă" })[0]);
    const input = screen.getByLabelText("Descrie resursa gratis");
    expect(screen.getByText("0/255")).toBeInTheDocument();
    await user.type(input, "  ");
    await user.keyboard("{Enter}");
    expect(input).toBeInTheDocument();
    await user.type(input, "Mentorat");
    await user.tab();
    expect(input).toHaveValue("  Mentorat");
  });

  it("adds with Enter, cancels with Escape, and rejects cross-category duplicates in place", async () => {
    const user = userEvent.setup(); render(<Harness />);
    await user.click(screen.getAllByRole("button", { name: "Adaugă resursă" })[0]);
    await user.type(screen.getByLabelText("Descrie resursa gratis"), "Mentorat{Enter}");
    expect(screen.getByRole("button", { name: "Mentorat" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Adaugă resursă" })[1]);
    const paid = screen.getByLabelText("Descrie resursa contra cost");
    await user.type(paid, "  MENTORAT  {Enter}");
    expect(screen.getByText("Această resursă a fost deja adăugată.")).toBeInTheDocument();
    expect(paid).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByLabelText("Descrie resursa contra cost")).not.toBeInTheDocument();
  });

  it("edits inline with Enter and cancels an edit with Escape", async () => {
    const user = userEvent.setup(); render(<Harness initial={[{ id: "one", description: "Mentorat", classification: "free" }]} />);
    await user.click(screen.getByRole("button", { name: "Mentorat" }));
    const edit = screen.getByLabelText("Editează Mentorat");
    expect(screen.getByText("8/255")).toBeInTheDocument();
    await user.clear(edit); await user.type(edit, "Coaching{Enter}");
    expect(screen.getByRole("button", { name: "Coaching" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Coaching" }));
    await user.clear(screen.getByLabelText("Editează Coaching"));
    await user.type(screen.getByLabelText("Editează Coaching"), "Schimbat{Escape}");
    expect(screen.getByRole("button", { name: "Coaching" })).toBeInTheDocument();
  });

  it("removes immediately and restores the former category position from the undo toast", async () => {
    const user = userEvent.setup(); render(<Harness initial={[
      { id: "one", description: "Primul", classification: "free" },
      { id: "two", description: "Al doilea", classification: "free" },
    ]} />);
    await user.click(screen.getByRole("button", { name: "Acțiuni pentru Primul" }));
    await user.click(screen.getByRole("button", { name: "Elimină" }));
    expect(screen.queryByRole("button", { name: "Primul" })).not.toBeInTheDocument();
    const options = toast.mock.calls[0][1];
    expect(options.duration).toBe(5000);
    expect(options.action.label).toBe("Anulează");
    act(() => options.action.onClick());
    expect(screen.getAllByTestId("free-resource-list")[0].textContent).toMatch(/Primul.*Al doilea/);
  });

  it("keeps the add control visible and disabled at category capacity", () => {
    render(<Harness initial={Array.from({ length: 10 }, (_, index) => ({ id: String(index), description: `Resursa ${index}`, classification: "free" as const }))} />);
    expect(screen.getByRole("button", { name: "Limită atinsă · 10/10" })).toBeDisabled();
    expect(screen.getByText("0/10")).toBeInTheDocument();
  });

  it("starts sorting only from the dedicated, screen-reader-labelled drag handle", () => {
    render(<Harness initial={[
      { id: "one", description: "Primul", classification: "free" },
      { id: "two", description: "Al doilea", classification: "free" },
    ]} />);
    expect(screen.getByRole("button", { name: "Mută resursa Primul" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Primul" })).not.toHaveAttribute("aria-roledescription");
    expect(screen.getByRole("button", { name: "Acțiuni pentru Primul" })).not.toHaveAttribute("aria-roledescription");
  });

  it("reorders within a category through the accessible action", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[
      { id: "one", description: "Primul", classification: "free" },
      { id: "two", description: "Al doilea", classification: "free" },
    ]} />);

    await user.click(screen.getByRole("button", { name: "Acțiuni pentru Primul" }));
    await user.click(screen.getByRole("button", { name: "Mută mai jos" }));

    const text = screen.getByTestId("free-resource-list").textContent ?? "";
    expect(text.indexOf("Al doilea")).toBeLessThan(text.indexOf("Primul"));
  });

  it("reclassifies through the accessible overflow action", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[
      { id: "one", description: "Mentorat", classification: "free" },
      { id: "two", description: "Audit", classification: "paid" },
    ]} />);

    await user.click(screen.getByRole("button", { name: "Acțiuni pentru Mentorat" }));
    await user.click(screen.getByRole("button", { name: "Mută la contra cost" }));

    expect(screen.getByTestId("free-resource-list")).not.toHaveTextContent("Mentorat");
    expect(screen.getByTestId("paid-resource-list").textContent).toMatch(/Audit.*Mentorat/);
  });

  it("rejects an accessible move into a full category and preserves both positions", async () => {
    const user = userEvent.setup();
    const paid = Array.from({ length: 10 }, (_, index) => ({
      id: `paid-${index}`,
      description: `Contra cost ${index}`,
      classification: "paid" as const,
    }));
    render(<Harness initial={[
      { id: "free-one", description: "Mentorat", classification: "free" },
      ...paid,
    ]} />);

    await user.click(screen.getByRole("button", { name: "Acțiuni pentru Mentorat" }));
    await user.click(screen.getByRole("button", { name: "Mută la contra cost" }));

    expect(screen.getByTestId("free-resource-list")).toHaveTextContent("Mentorat");
    const paidText = screen.getByTestId("paid-resource-list").textContent ?? "";
    expect(paidText.indexOf("Contra cost 0")).toBeLessThan(paidText.indexOf("Contra cost 9"));
    expect(paidText).not.toContain("Mentorat");
    expect(toast.error).toHaveBeenCalledWith("Categoria contra cost poate conține cel mult 10 resurse.");
  });
});

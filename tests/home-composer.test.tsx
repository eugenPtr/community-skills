// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeComposer } from "@/components/home-composer";

const mocks = vi.hoisted(() => ({
  pending: false,
  startConversation: vi.fn(),
}));

vi.mock("@/app/chat/actions", () => ({
  startConversation: mocks.startConversation,
}));

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return {
    ...actual,
    useFormStatus: () => ({ pending: mocks.pending }),
  };
});

describe("HomeComposer", () => {
  beforeEach(() => {
    mocks.pending = false;
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("disables the submit button and replaces the arrow while pending", async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(<HomeComposer />);

    const button = screen.getByRole("button", { name: "Trimite" });
    expect(button).toBeDisabled();

    await user.type(screen.getByRole("textbox"), "Atelier de sănătate feminină");
    expect(button).toBeEnabled();

    mocks.pending = true;
    rerender(<HomeComposer />);

    expect(screen.getByRole("button", { name: "Se trimite" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Se trimite" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("does not submit again from Enter while pending", async () => {
    const user = userEvent.setup();
    const requestSubmit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit");
    const { rerender } = render(<HomeComposer />);
    const textbox = screen.getByRole("textbox");

    await user.type(textbox, "Ajutor");
    mocks.pending = true;
    rerender(<HomeComposer />);
    fireEvent.keyDown(textbox, { key: "Enter" });

    expect(requestSubmit).not.toHaveBeenCalled();
  });
});

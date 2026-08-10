// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationSidebar } from "@/components/conversation-sidebar";

const mocks = vi.hoisted(() => ({
  deleteConversation: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/app/chat/actions", () => ({
  deleteConversationAction: mocks.deleteConversation,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

const conversations = [
  { id: "active", title: "Casa naturală", lastMessageAt: "2026-08-10" },
  { id: "other", title: "Mentorat", lastMessageAt: "2026-08-09" },
];

describe("ConversationSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteConversation.mockResolvedValue({ ok: true });
  });
  afterEach(cleanup);

  it("exposes an accessible delete control for every Conversation", () => {
    render(<ConversationSidebar conversations={conversations} activeId="active" />);

    expect(screen.getByRole("button", { name: "Șterge Casa naturală" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Șterge Mentorat" })).toBeInTheDocument();
  });

  it("deletes the active Conversation and returns home", async () => {
    const user = userEvent.setup();
    render(<ConversationSidebar conversations={conversations} activeId="active" />);

    await user.click(screen.getByRole("button", { name: "Șterge Casa naturală" }));

    await waitFor(() => expect(mocks.deleteConversation).toHaveBeenCalledWith("active"));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Conversația a fost ștearsă.");
    expect(mocks.push).toHaveBeenCalledWith("/");
  });

  it("keeps the current page when deleting an inactive Conversation", async () => {
    const user = userEvent.setup();
    render(<ConversationSidebar conversations={conversations} activeId="active" />);

    await user.click(screen.getByRole("button", { name: "Șterge Mentorat" }));

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(mocks.push).not.toHaveBeenCalled();
  });
});

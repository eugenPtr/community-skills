// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { MemberCard as MemberCardView } from "@/components/member-card";
import type { MemberCard } from "@/lib/members/list";

const base: MemberCard = {
  id: "member-2",
  name: "Ana Pop",
  passions: "Muzică și drumeții",
  heartProjectDescription: "Grădina comunității",
  heartProjectSeeking: false,
  resources: [],
  resourceCount: 0,
};

describe("Member Card Resource previews", () => {
  afterEach(cleanup);

  it.each([
    ["only free", [{ description: "Mentorat", classification: "free" as const, position: 0 }], "Gratis:", "Mentorat"],
    ["only paid", [{ description: "Audit", classification: "paid" as const, position: 0 }], "Contra cost:", "Audit"],
    ["mixed", [
      { description: "Mentorat", classification: "free" as const, position: 0 },
      { description: "Audit", classification: "paid" as const, position: 0 },
    ], "Contra cost:", "Audit"],
  ])("renders %s Resources with explicit classification", (_name, resources, prefix, description) => {
    render(<MemberCardView member={{ ...base, resources, resourceCount: resources.length }} isOwn={false} />);
    expect(screen.getByText(prefix)).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.queryByText(/Skill/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+ încă/)).not.toBeInTheDocument();
  });

  it("orders Resources, Passions and Heart Project", () => {
    render(<MemberCardView member={{ ...base, resources: [
      { description: "Mentorat", classification: "free", position: 0 },
    ], resourceCount: 1 }} isOwn={false} />);
    const resource = screen.getByText("Mentorat");
    const passions = screen.getByText("Muzică și drumeții");
    const heartProject = screen.getByText("Grădina comunității");
    expect(resource.compareDocumentPosition(passions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(passions.compareDocumentPosition(heartProject) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses accented labels with clear title-to-content spacing", () => {
    render(<MemberCardView member={{ ...base, resources: [
      { description: "Mentorat", classification: "free", position: 0 },
    ], resourceCount: 1 }} isOwn={false} />);
    for (const title of ["Resurse", "Pasiuni", "Proiect de Suflet"]) {
      expect(screen.getByText(title)).toHaveClass("text-purple-300");
    }
    expect(screen.getByRole("list")).toHaveClass("mt-1.5");
    expect(screen.getByText("Muzică și drumeții")).toHaveClass("mt-1.5");
    expect(screen.getByText("Grădina comunității")).toHaveClass("mt-1.5");
  });

  it("shows the localized remainder without rendering more than two previews", () => {
    render(<MemberCardView member={{ ...base, resources: [
      { description: "Mentorat", classification: "free", position: 0 },
      { description: "Audit", classification: "paid", position: 0 },
    ], resourceCount: 5 }} isOwn={false} />);
    expect(screen.getByText("+ încă 3")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("links own and other Member cards to the correct Profile", () => {
    const { rerender } = render(<MemberCardView member={base} isOwn />);
    expect(screen.getByRole("link", { name: /Ana Pop/ })).toHaveAttribute("href", "/profile");
    rerender(<MemberCardView member={base} isOwn={false} />);
    expect(screen.getByRole("link", { name: /Ana Pop/ })).toHaveAttribute("href", "/profile/member-2");
  });
});

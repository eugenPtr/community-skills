// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { ProfileView } from "@/components/profile-view";

const base = {
  id: "m1", name: "Ana Pop", location: "Cluj", passions: "Muzică",
  heartProjectDescription: null, heartProjectSeeking: true, socials: {},
};

describe("ProfileView Resources", () => {
  afterEach(cleanup);
  it("shows full free Resources before paid Resources in stored order", () => {
    render(<ProfileView isOwn={false} profile={{ ...base, resources: [
      { id: "f1", description: "Mentorat cu o descriere completă care se poate împacheta", classification: "free", position: 0 },
      { id: "f2", description: "Atelier", classification: "free", position: 1 },
      { id: "p1", description: "Audit software", classification: "paid", position: 0 },
    ] }} />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent);
    expect(headings.indexOf("Resurse gratis")).toBeLessThan(headings.indexOf("Resurse contra cost"));
    expect(screen.getByText(/descriere completă/)).toBeInTheDocument();
  });

  it("hides empty Resource categories", () => {
    render(<ProfileView isOwn={false} profile={{ ...base, resources: [
      { id: "p1", description: "Audit software", classification: "paid", position: 0 },
    ] }} />);
    expect(screen.queryByText("Resurse gratis")).not.toBeInTheDocument();
    expect(screen.getByText("Resurse contra cost")).toBeInTheDocument();
  });

  it("shows Resource editing only on the owner's Profile", () => {
    const { rerender } = render(<ProfileView isOwn profile={{ ...base, resources: [] }} />);
    expect(screen.getByRole("link", { name: "Editează resursele" })).toHaveAttribute("href", "/profile/resources");
    rerender(<ProfileView isOwn={false} profile={{ ...base, resources: [] }} />);
    expect(screen.queryByRole("link", { name: "Editează resursele" })).not.toBeInTheDocument();
  });
});

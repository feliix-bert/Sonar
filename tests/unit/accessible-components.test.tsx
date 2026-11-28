import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { SkipLink } from "@/components/accessibility/SkipLink";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  LiveAnnouncerProvider,
  useLiveAnnouncer,
} from "@/components/accessibility/LiveAnnouncer";
import userEvent from "@testing-library/user-event";

function AnnouncerHarness() {
  const { announce } = useLiveAnnouncer();
  return (
    <button type="button" onClick={() => announce("Upload completed")}>
      Trigger announcement
    </button>
  );
}

describe("SONAR Accessible Components", () => {
  it("renders a keyboard-accessible skip link pointing to #main-content", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("renders non-color-only explicit text labels on review status badges", () => {
    const { rerender } = render(<StatusBadge status="verified" />);
    expect(screen.getByText("Verified by Reviewer")).toBeInTheDocument();

    rerender(<StatusBadge status="unreviewed" />);
    expect(screen.getByText("AI Draft (Unverified)")).toBeInTheDocument();
  });

  it("exposes polite and assertive live regions and announces messages", async () => {
    const user = userEvent.setup();
    render(
      <LiveAnnouncerProvider>
        <AnnouncerHarness />
      </LiveAnnouncerProvider>
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Trigger announcement" })
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
    expect(screen.getByRole("status")).toHaveTextContent("Upload completed");
  });
});

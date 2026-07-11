import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TicketDetailSkeleton } from "./TicketDetailSkeleton";

describe("TicketDetailSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<TicketDetailSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("applies the pulse animation to the placeholder", () => {
    const { container } = render(<TicketDetailSkeleton />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

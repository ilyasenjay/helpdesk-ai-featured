import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AiSummaryCard } from "./AiSummaryCard";

describe("AiSummaryCard", () => {
  it("renders the heading", () => {
    render(<AiSummaryCard summary="Customer can't reset their password." />);
    expect(screen.getByText("AI Summary")).toBeInTheDocument();
  });

  it("renders the summary text", () => {
    render(<AiSummaryCard summary="Customer can't reset their password." />);
    expect(screen.getByText("Customer can't reset their password.")).toBeInTheDocument();
  });
});

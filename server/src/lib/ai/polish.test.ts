import { describe, expect, test } from "bun:test";
import { formatPolishedReply } from "./polish";

describe("formatPolishedReply", () => {
  test("greets the customer by name and signs off with the agent's name and email", () => {
    const result = formatPolishedReply({
      polishedText: "We'll look into this right away.",
      customerName: "Bob Newest",
      agentName: "Admin",
      agentEmail: "admin@example.com",
    });

    expect(result).toBe(
      "Hi Bob Newest,\n\nWe'll look into this right away.\n\nBest regards,\nAdmin\nadmin@example.com"
    );
  });

  test("trims surrounding whitespace from the AI-generated text", () => {
    const result = formatPolishedReply({
      polishedText: "  \n  Thanks for your patience.  \n  ",
      customerName: "Jane",
      agentName: "Agent Smith",
      agentEmail: "agent@example.com",
    });

    expect(result).toBe(
      "Hi Jane,\n\nThanks for your patience.\n\nBest regards,\nAgent Smith\nagent@example.com"
    );
  });
});

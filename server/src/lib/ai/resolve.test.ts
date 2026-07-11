import { describe, expect, test } from "bun:test";
import { parseAutoResolveResponse } from "./resolve";

describe("parseAutoResolveResponse", () => {
  test("returns the reply text when the model answers the ticket", () => {
    const result = parseAutoResolveResponse("  Here's how to reset your password...  ");
    expect(result).toBe("Here's how to reset your password...");
  });

  test("returns null for the ESCALATE sentinel", () => {
    expect(parseAutoResolveResponse("ESCALATE")).toBeNull();
  });

  test("is case-insensitive and trims whitespace around the sentinel", () => {
    expect(parseAutoResolveResponse("  escalate  ")).toBeNull();
  });

  test("returns null for an empty response", () => {
    expect(parseAutoResolveResponse("   ")).toBeNull();
  });

  test("returns null when the sentinel is wrapped in an explanation instead of standing alone", () => {
    const result = parseAutoResolveResponse(
      "The knowledge base does not provide information about a mobile app.\nESCALATE"
    );
    expect(result).toBeNull();
  });

  test("does not false-positive on a real answer that happens to contain 'escalated' as part of another word", () => {
    const result = parseAutoResolveResponse("Your request has been escalated to billing automatically.");
    expect(result).toBe("Your request has been escalated to billing automatically.");
  });
});

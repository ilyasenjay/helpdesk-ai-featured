import { describe, expect, test } from "bun:test";
import { stripQuotedReply, decodeCommonHtmlEntities } from "./quote";

describe("stripQuotedReply", () => {
  test("strips a single-line Gmail quote header and everything after it", () => {
    const input = [
      "Hello Ilyas,",
      "Yes, received.",
      "",
      "Thanks and Regards,",
      "*Ilyas Shaikh,*",
      "",
      "On Mon, Jul 13, 2026 at 11:13 PM Support <support@example.com> wrote:",
      "",
      "> Hi Ilyas Shaikh,",
      ">",
      "> Please confirm that you have received this email.",
    ].join("\n");

    expect(stripQuotedReply(input)).toBe(
      ["Hello Ilyas,", "Yes, received.", "", "Thanks and Regards,", "*Ilyas Shaikh,*"].join("\n"),
    );
  });

  test("strips a quote header that soft-wraps 'wrote:' onto its own line", () => {
    const input = [
      "Yes, received.",
      "",
      "On Mon, Jul 13, 2026 at 11:13 PM Support",
      "wrote:",
      "",
      "> Hi Ilyas Shaikh,",
    ].join("\n");

    expect(stripQuotedReply(input)).toBe("Yes, received.");
  });

  test("falls back to stripping a trailing run of '>' lines with no header", () => {
    const input = ["My reply.", "", "> quoted line one", "> quoted line two"].join("\n");
    expect(stripQuotedReply(input)).toBe("My reply.");
  });

  test("leaves text with no quote markers unchanged", () => {
    expect(stripQuotedReply("Just a plain reply, no quoting.")).toBe(
      "Just a plain reply, no quoting.",
    );
  });

  test("does not strip a '>' that appears mid-message without a trailing quote run", () => {
    const input = "Compare: 5 > 3 is true.\n\nMore reply text after it.";
    expect(stripQuotedReply(input)).toBe(input);
  });
});

describe("decodeCommonHtmlEntities", () => {
  test("decodes common entities", () => {
    expect(decodeCommonHtmlEntities("&gt; quoted &amp; escaped &lt;tag&gt;")).toBe(
      "> quoted & escaped <tag>",
    );
  });

  test("leaves plain text unchanged", () => {
    expect(decodeCommonHtmlEntities("no entities here")).toBe("no entities here");
  });
});

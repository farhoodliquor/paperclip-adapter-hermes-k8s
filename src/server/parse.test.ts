import { describe, it, expect } from "vitest";
import { parseHermesText, isHermesUnknownSessionError } from "./parse.js";

describe("parseHermesText", () => {
  it("extracts session_id from session info line", () => {
    const stdout = "session_id: sess_abc123\n";
    const result = parseHermesText(stdout);
    expect(result.sessionId).toBe("sess_abc123");
  });

  it("extracts session_id with underscore format", () => {
    const stdout = "session_id: sess_abc123\n";
    const result = parseHermesText(stdout);
    expect(result.sessionId).toBe("sess_abc123");
  });

  it("extracts assistant messages", () => {
    const stdout = "  ┊ 💬 Hello, how can I help?\n";
    const result = parseHermesText(stdout);
    expect(result.summary).toBe("Hello, how can I help?");
  });

  it("extracts tool completion lines", () => {
    const stdout = "  ┊ 💻 $ curl -s https://api.example.com  0.5s\n";
    const result = parseHermesText(stdout);
    expect(result.summary).toContain("curl");
  });

  it("collects error lines", () => {
    const stdout = "Error: something went wrong\n";
    const result = parseHermesText(stdout);
    expect(result.errorMessage).toBe("Error: something went wrong");
  });

  it("returns null errorMessage when no errors", () => {
    const stdout = "  ┊ 💬 Hello world\n";
    const result = parseHermesText(stdout);
    expect(result.errorMessage).toBeNull();
  });

  it("skips [tool] prefix lines", () => {
    const stdout = "[tool] (｡◕‿◕｡) Searching...\n  ┊ 💬 Done\n";
    const result = parseHermesText(stdout);
    expect(result.summary).toBe("Done");
  });

  it("skips spinner remnants", () => {
    const stdout = "💻 Completed\n  ┊ 💬 All done\n";
    const result = parseHermesText(stdout);
    expect(result.summary).toBe("All done");
  });

  it("skips MCP/server noise lines", () => {
    const stdout = "[2026-03-25T10:40:53.941Z] INFO: Server started\n  ┊ 💬 Ready\n";
    const result = parseHermesText(stdout);
    expect(result.summary).toBe("Ready");
  });

  it("skips system lines except session_id", () => {
    const stdout = "[hermes] Starting agent...\n  ┊ 💬 Hello\n";
    const result = parseHermesText(stdout);
    expect(result.summary).toBe("Hello");
  });

  it("skips thinking blocks in summary", () => {
    const stdout = "💭 Thinking about the problem...\n  ┊ 💬 Here's my answer\n";
    const result = parseHermesText(stdout);
    expect(result.summary).toBe("Here's my answer");
  });

  it("returns empty summary when no assistant output", () => {
    const stdout = "[hermes] Starting...\n";
    const result = parseHermesText(stdout);
    expect(result.summary).toBe("");
  });

  it("joins multiple messages with double newlines", () => {
    const stdout = "  ┊ 💬 First message\n  ┊ 💬 Second message\n";
    const result = parseHermesText(stdout);
    expect(result.summary).toBe("First message\n\nSecond message");
  });

  it("handles CRLF line endings", () => {
    const stdout = "  ┊ 💬 Hello\r\n  ┊ 💬 World\r\n";
    const result = parseHermesText(stdout);
    expect(result.summary).toBe("Hello\n\nWorld");
  });
});

describe("isHermesUnknownSessionError", () => {
  it("detects unknown session phrase", () => {
    expect(isHermesUnknownSessionError("unknown session")).toBe(true);
  });

  it("detects session not found phrase", () => {
    expect(isHermesUnknownSessionError("session not found")).toBe(true);
  });

  it("detects resource not found for session", () => {
    expect(isHermesUnknownSessionError("resource not found: /session/abc.json")).toBe(true);
  });

  it("detects NotFoundError", () => {
    expect(isHermesUnknownSessionError("NotFoundError")).toBe(true);
  });

  it("detects no session phrase", () => {
    expect(isHermesUnknownSessionError("no session available")).toBe(true);
  });

  it("returns false for clean output", () => {
    expect(isHermesUnknownSessionError("All good here")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(isHermesUnknownSessionError("UNKNOWN SESSION")).toBe(true);
  });
});

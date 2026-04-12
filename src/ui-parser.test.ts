import { describe, it, expect } from "vitest";
import { parseStdoutLine } from "./ui-parser.js";

function entries(result: ReturnType<typeof parseStdoutLine>) {
  return result as { kind: string; ts: string; text: string }[];
}

describe("parseStdoutLine", () => {
  it("returns non-matching lines as assistant kind", () => {
    const result = parseStdoutLine("raw output", "2024-01-01T00:00:00Z");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ kind: "assistant", ts: "2024-01-01T00:00:00Z", text: "raw output" });
  });

  it("returns empty array for empty lines", () => {
    expect(parseStdoutLine("", "ts")).toEqual([]);
    expect(parseStdoutLine("   ", "ts")).toEqual([]);
  });

  it("parses assistant message from 💬 line", () => {
    const result = entries(parseStdoutLine("  ┊ 💬 Hello world", "ts"));
    expect(result[0].text).toBe("Hello world");
    expect(result[0].kind).toBe("assistant");
  });

  it("parses tool_call + tool_result from tool completion line", () => {
    const result = parseStdoutLine("  ┊ 💻 $ curl -s https://api.example.com  0.5s", "ts");
    expect(result).toHaveLength(2);
    expect(result[0].kind).toBe("tool_call");
    expect(result[1].kind).toBe("tool_result");
  });

  it("skips [tool] prefix lines", () => {
    const result = parseStdoutLine("[tool] (｡◕‿◕｡) Searching...", "ts");
    expect(result).toEqual([]);
  });

  it("parses error as stderr", () => {
    const result = entries(parseStdoutLine("Error: something went wrong", "ts"));
    expect(result[0].kind).toBe("stderr");
    expect(result[0].text).toBe("Error: something went wrong");
  });

  it("parses thinking as thinking kind", () => {
    const result = entries(parseStdoutLine("💭 Thinking about the problem...", "ts"));
    expect(result[0].kind).toBe("thinking");
  });

  it("parses system line as system kind", () => {
    const result = entries(parseStdoutLine("[hermes] Starting agent...", "ts"));
    expect(result[0].kind).toBe("system");
  });

  it("skips spinner remnants", () => {
    const result = parseStdoutLine("💻 Completed", "ts");
    expect(result).toEqual([]);
  });

  it("skips MCP server noise", () => {
    const result = parseStdoutLine("[2026-03-25T10:40:53.941Z] INFO: Server started", "ts");
    expect(result[0].kind).toBe("stderr");
  });

  it("handles session_id as system", () => {
    const result = entries(parseStdoutLine("session_id: sess_abc123", "ts"));
    expect(result[0].kind).toBe("system");
    expect(result[0].text).toBe("session_id: sess_abc123");
  });
});

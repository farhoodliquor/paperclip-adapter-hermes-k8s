import { describe, it, expect } from "vitest";
import { formatEvent, parseStdoutLine } from "./format-event.js";

// Cast to avoid TranscriptEntry union type narrowing issues on result[0]
type SimpleEntry = { kind: string; ts: string; text: string };

function entries(result: ReturnType<typeof parseStdoutLine>): SimpleEntry[] {
  return result as SimpleEntry[];
}

describe("formatEvent", () => {
  it("returns non-JSON lines as-is", () => {
    expect(formatEvent("hello world", false)).toBe("hello world");
  });

  it("returns empty string for empty lines", () => {
    expect(formatEvent("", false)).toBe("");
    expect(formatEvent("   ", false)).toBe("");
  });

  it("skips step_start in normal mode", () => {
    expect(formatEvent('{"type":"step_start","sessionID":"sess_123"}', false)).toBe("");
  });

  it("shows step_start with session in debug mode", () => {
    expect(formatEvent('{"type":"step_start","sessionID":"sess_123"}', true)).toBe("[step_start] session=sess_123");
  });

  it("returns text content from text event", () => {
    expect(formatEvent('{"type":"text","part":{"text":"Hello world"}}', false)).toBe("Hello world");
  });

  it("returns text content from message event", () => {
    expect(formatEvent('{"type":"message","part":{"content":"Hello"}}', false)).toBe("Hello");
  });

  it("returns text from part.content fallback", () => {
    expect(formatEvent('{"type":"text","part":{"content":"Fallback text"}}', false)).toBe("Fallback text");
  });

  it("skips tool_use in normal mode", () => {
    expect(formatEvent('{"type":"tool_use","part":{"type":"bash","state":{}}}', false)).toBe("");
  });

  it("shows tool_use errors in normal mode", () => {
    expect(formatEvent('{"type":"tool_use","part":{"type":"bash","state":{"status":"error","error":"Command failed"}}}', false)).toBe("⚠ Command failed");
  });

  it("shows tool_use details in debug mode", () => {
    const result = formatEvent('{"type":"tool_use","part":{"type":"bash","state":{"status":"ok","output":"done"}}}', true);
    expect(result).toContain("[tool:bash]");
    expect(result).toContain("ok");
    expect(result).toContain("done");
  });

  it("shows step_finish message", () => {
    expect(formatEvent('{"type":"step_finish","part":{"message":"All done"}}', false)).toBe("All done");
  });

  it("shows tokens and cost on step_finish when present", () => {
    const result = formatEvent('{"type":"step_finish","part":{"tokens":{"input":100,"output":50},"cost":0.005}}', false);
    expect(result).toContain("tokens=150");
    expect(result).toContain("cost$0.0050");
  });

  it("shows step_finish reason as fallback", () => {
    expect(formatEvent('{"type":"step_finish","part":{"reason":"completed"}}', false)).toBe("[step_finish] completed");
  });

  it("shows error events", () => {
    expect(formatEvent('{"type":"error","error":{"message":"Something broke"}}', false)).toBe("✗ Something broke");
  });

  it("shows nested error message", () => {
    expect(formatEvent('{"type":"error","error":{"data":{"message":"Nested"}}}', false)).toBe("✗ Nested");
  });

  it("returns debug marker for unknown types in debug mode", () => {
    expect(formatEvent('{"type":"unknown_event"}', true)).toBe("[unknown_event]");
  });

  it("returns empty for unknown types in normal mode", () => {
    expect(formatEvent('{"type":"unknown_event"}', false)).toBe("");
  });

  it("handles turn_complete as step_finish", () => {
    expect(formatEvent('{"type":"turn_complete","part":{"message":"Done"}}', false)).toBe("Done");
  });
});

describe("parseStdoutLine", () => {
  it("returns non-JSON as stdout entry", () => {
    const result = parseStdoutLine("raw output", "2024-01-01T00:00:00Z");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ kind: "stdout", ts: "2024-01-01T00:00:00Z", text: "raw output" });
  });

  it("returns empty array for empty lines", () => {
    expect(parseStdoutLine("", "ts")).toEqual([]);
    expect(parseStdoutLine("   ", "ts")).toEqual([]);
  });

  it("parses text event as stdout", () => {
    const result = entries(parseStdoutLine('{"type":"text","part":{"text":"Hello"}}', "ts"));
    expect(result[0].text).toBe("Hello");
    expect(result[0].kind).toBe("stdout");
  });

  it("parses message event as stdout", () => {
    const result = entries(parseStdoutLine('{"type":"message","part":{"content":"Hi"}}', "ts"));
    expect(result[0].text).toBe("Hi");
  });

  it("parses step_finish message as stdout", () => {
    const result = entries(parseStdoutLine('{"type":"step_finish","part":{"message":"Finished!"}}', "ts"));
    expect(result[0].text).toBe("Finished!");
  });

  it("skips step_start", () => {
    expect(parseStdoutLine('{"type":"step_start"}', "ts")).toEqual([]);
  });

  it("skips tool_use", () => {
    expect(parseStdoutLine('{"type":"tool_use","part":{"type":"bash"}}', "ts")).toEqual([]);
  });

  it("parses error as stderr", () => {
    const result = entries(parseStdoutLine('{"type":"error","error":{"message":"Failed"}}', "ts"));
    expect(result[0].kind).toBe("stderr");
    expect(result[0].text).toBe("Failed");
  });

  it("returns empty array for turn_complete without message", () => {
    expect(parseStdoutLine('{"type":"turn_complete","part":{}}', "ts")).toEqual([]);
  });
});

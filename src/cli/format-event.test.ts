import { describe, it, expect } from "vitest";
import { formatEvent } from "./format-event.js";

describe("formatEvent", () => {
  it("returns non-JSON lines as-is in normal mode", () => {
    expect(formatEvent("hello world", false)).toBe("hello world");
  });

  it("returns empty string for empty lines", () => {
    expect(formatEvent("", false)).toBe("");
    expect(formatEvent("   ", false)).toBe("");
  });

  it("returns trimmed line as-is in normal mode", () => {
    expect(formatEvent("  ┊ 💬 Hello world  ", false)).toBe("┊ 💬 Hello world");
  });

  it("returns system lines with [system] prefix in debug mode", () => {
    expect(formatEvent("[hermes] Starting agent...", true)).toBe("[system] [hermes] Starting agent...");
  });

  it("returns tool lines with [tool] prefix in debug mode", () => {
    expect(formatEvent("  ┊ 💻 $ curl -s https://api.example.com  0.5s", true)).toBe("[tool] ┊ 💻 $ curl -s https://api.example.com  0.5s");
  });

  it("returns thinking lines with [think] prefix in debug mode", () => {
    expect(formatEvent("💭 Thinking about the problem...", true)).toBe("[think] Thinking about the problem...");
  });

  it("returns assistant lines with extracted text in debug mode", () => {
    expect(formatEvent("  ┊ 💬 Hello, how can I help?", true)).toBe("Hello, how can I help?");
  });

  it("returns error lines with [error] prefix in debug mode", () => {
    expect(formatEvent("Error: something went wrong", true)).toBe("[error] Error: something went wrong");
  });

  it("returns session lines with [session] prefix in debug mode", () => {
    expect(formatEvent("session_id: sess_abc123", true)).toBe("[session] session_id: sess_abc123");
  });

  it("returns regular lines as-is in debug mode", () => {
    expect(formatEvent("Some regular output", true)).toBe("Some regular output");
  });

  it("returns assistant 💬 text in normal mode", () => {
    expect(formatEvent("  ┊ 💬 Hello world", false)).toBe("┊ 💬 Hello world");
  });

  it("returns tool completion lines in normal mode", () => {
    expect(formatEvent("  ┊ 💻 $ curl -s https://api.example.com  0.5s", false)).toBe("┊ 💻 $ curl -s https://api.example.com  0.5s");
  });
});

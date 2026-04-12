import { describe, it, expect } from "vitest";
import { parseHermesJsonl, isHermesUnknownSessionError } from "./parse.js";

describe("parseHermesJsonl", () => {
  it("parses session_id from step_finish event", () => {
    const stdout = [
      '{"type":"step_finish","sessionID":"sess_abc123","part":{"tokens":{"input":100,"output":50}}}',
    ].join("\n");

    const result = parseHermesJsonl(stdout);

    expect(result.sessionId).toBe("sess_abc123");
    expect(result.usage.inputTokens).toBe(100);
    expect(result.usage.outputTokens).toBe(50);
  });

  it("parses sessionId variant", () => {
    const stdout = [
      '{"type":"step_finish","sessionId":"sess_xyz","part":{"tokens":{"input":10}}}',
    ].join("\n");

    const result = parseHermesJsonl(stdout);

    expect(result.sessionId).toBe("sess_xyz");
  });

  it("accumulates token usage across events", () => {
    const stdout = [
      '{"type":"step_finish","part":{"tokens":{"input":100,"output":50}}}',
      '{"type":"step_finish","part":{"tokens":{"input":200,"output":75}}}',
    ].join("\n");

    const result = parseHermesJsonl(stdout);

    expect(result.usage.inputTokens).toBe(300);
    expect(result.usage.outputTokens).toBe(125);
  });

  it("separates cached input tokens", () => {
    const stdout = [
      '{"type":"step_finish","part":{"tokens":{"input":500,"cache":{"read":400},"output":100}}}',
    ].join("\n");

    const result = parseHermesJsonl(stdout);

    expect(result.usage.inputTokens).toBe(500);
    expect(result.usage.cachedInputTokens).toBe(400);
  });

  it("includes reasoning tokens in output", () => {
    const stdout = [
      '{"type":"step_finish","part":{"tokens":{"input":50,"output":30,"reasoning":70}}}',
    ].join("\n");

    const result = parseHermesJsonl(stdout);

    expect(result.usage.outputTokens).toBe(100); // 30 + 70
  });

  it("accumulates cost", () => {
    const stdout = [
      '{"type":"step_finish","part":{"cost":0.05}}',
      '{"type":"step_finish","part":{"cost":0.03}}',
    ].join("\n");

    const result = parseHermesJsonl(stdout);

    expect(result.costUsd).toBeCloseTo(0.08);
  });

  it("extracts summary from text events", () => {
    const stdout = [
      '{"type":"text","part":{"text":"Hello world"}}',
      '{"type":"message","part":{"content":"How can I help?"}}',
    ].join("\n");

    const result = parseHermesJsonl(stdout);

    expect(result.summary).toBe("Hello world\n\nHow can I help?");
  });

  it("collects error messages from error events", () => {
    const stdout = [
      '{"type":"error","error":{"message":"Something went wrong"}}',
    ].join("\n");

    const result = parseHermesJsonl(stdout);

    expect(result.errorMessage).toBe("Something went wrong");
  });

  it("collects error messages from tool_use state errors", () => {
    const stdout = [
      '{"type":"tool_use","part":{"state":{"status":"error","error":"Tool failed"}}}',
    ].join("\n");

    const result = parseHermesJsonl(stdout);

    expect(result.errorMessage).toBe("Tool failed");
  });

  it("returns null errorMessage when no errors", () => {
    const stdout = [
      '{"type":"text","part":{"text":"Hello"}}',
    ].join("\n");

    const result = parseHermesJsonl(stdout);

    expect(result.errorMessage).toBeNull();
  });

  it("skips empty lines", () => {
    const stdout = [
      '{"type":"step_finish","part":{"tokens":{"input":10}}}',
      "",
      "   ",
      '{"type":"text","part":{"text":"Done"}}',
    ].join("\n");

    const result = parseHermesJsonl(stdout);

    expect(result.usage.inputTokens).toBe(10);
    expect(result.summary).toBe("Done");
  });

  it("handles CRLF line endings", () => {
    const stdout = '{"type":"text","part":{"text":"Hi"}}\r\n{"type":"text","part":{"text":"There"}}';

    const result = parseHermesJsonl(stdout);

    expect(result.summary).toBe("Hi\n\nThere");
  });

  it("returns empty summary when no text events", () => {
    const stdout = [
      '{"type":"step_finish","part":{"tokens":{"input":10}}}',
    ].join("\n");

    const result = parseHermesJsonl(stdout);

    expect(result.summary).toBe("");
  });

  it("handles nested error object with data.message", () => {
    const stdout = [
      '{"type":"error","error":{"data":{"message":"Nested error"}}}',
    ].join("\n");

    const result = parseHermesJsonl(stdout);

    expect(result.errorMessage).toBe("Nested error");
  });

  it("handles error object with code field", () => {
    const stdout = [
      '{"type":"error","error":{"code":"RATE_LIMITED"}}',
    ].join("\n");

    const result = parseHermesJsonl(stdout);

    expect(result.errorMessage).toBe("RATE_LIMITED");
  });
});

describe("isHermesUnknownSessionError", () => {
  it("detects 'unknown session' phrase", () => {
    expect(isHermesUnknownSessionError("unknown session foo", "")).toBe(true);
  });

  it("detects 'session not found' phrase", () => {
    expect(isHermesUnknownSessionError("", "session not found")).toBe(true);
  });

  it("detects session resource not found path", () => {
    expect(isHermesUnknownSessionError("", "resource not found: /session/abc.json")).toBe(true);
  });

  it("detects NotFoundError", () => {
    expect(isHermesUnknownSessionError("NotFoundError", "")).toBe(true);
  });

  it("detects no session phrase", () => {
    expect(isHermesUnknownSessionError("no session available", "")).toBe(true);
  });

  it("returns false for clean output", () => {
    expect(isHermesUnknownSessionError("All good here", "")).toBe(false);
  });

  it("combines stdout and stderr", () => {
    expect(isHermesUnknownSessionError("stdout line", "session not found")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(isHermesUnknownSessionError("UNKNOWN SESSION", "")).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { parseStdoutLine } from "./ui-parser.js";

describe("ui-parser", () => {
  describe("parseStdoutLine", () => {
    it("parses a line as stdout entry", () => {
      const result = parseStdoutLine("hello world", "2024-01-01T00:00:00Z");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: "stdout",
        ts: "2024-01-01T00:00:00Z",
        text: "hello world",
      });
    });

    it("returns array with single entry", () => {
      const result = parseStdoutLine("test", "2024-06-15T10:30:00Z");

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it("preserves exact text content", () => {
      const text = "Multi-word message with special chars: !@#$%";
      const result = parseStdoutLine(text, "ts");

      expect(result[0].text).toBe(text);
    });

    it("handles empty string", () => {
      const result = parseStdoutLine("", "ts");

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("");
    });

    it("includes timestamp in output", () => {
      const ts = "2024-12-25T12:00:00Z";
      const result = parseStdoutLine("line", ts);

      expect(result[0].ts).toBe(ts);
    });
  });
});

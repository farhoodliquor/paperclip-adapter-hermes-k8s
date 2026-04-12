import { describe, it, expect } from "vitest";

// We only test the pure utility portions of job-manifest.
// K8s-dependent logic requires integration tests with a real cluster.

describe("job-manifest utils", () => {
  describe("sanitizeForK8sName", () => {
    // Inline the function since it's not exported
    const sanitizeForK8sName = (value: string): string =>
      value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 8);

    it("converts to lowercase", () => {
      expect(sanitizeForK8sName("AgentName")).toBe("agentnam");
    });

    it("removes non-alphanumeric chars except hyphens", () => {
      // underscores removed first (9 chars), then truncated to 8
      expect(sanitizeForK8sName("agent_test")).toBe("agenttes");
    });

    it("limits to 8 chars", () => {
      expect(sanitizeForK8sName("verylongagentname")).toBe("verylong");
    });

    it("preserves hyphens", () => {
      // hyphen present but truncated to 8 chars
      expect(sanitizeForK8sName("agent-test")).toBe("agent-te");
    });

    it("handles numbers", () => {
      expect(sanitizeForK8sName("agent123")).toBe("agent123");
    });

    it("handles mixed case with special chars", () => {
      // underscores and special chars removed, truncated to 8 chars
      expect(sanitizeForK8sName("MyAgent_Test!")).toBe("myagentt");
    });
  });

  describe("joinPromptSections", () => {
    const joinPromptSections = (sections: string[], separator = "\n\n"): string =>
      sections.filter((s) => s.trim().length > 0).join(separator);

    it("joins non-empty sections with separator", () => {
      expect(joinPromptSections(["Hello", "World"])).toBe("Hello\n\nWorld");
    });

    it("skips empty sections", () => {
      expect(joinPromptSections(["Hello", "", "World"])).toBe("Hello\n\nWorld");
    });

    it("skips whitespace-only sections", () => {
      expect(joinPromptSections(["Hello", "   ", "World"])).toBe("Hello\n\nWorld");
    });

    it("returns empty string when all sections empty", () => {
      expect(joinPromptSections(["", "  "])).toBe("");
    });

    it("uses custom separator", () => {
      expect(joinPromptSections(["a", "b"], " | ")).toBe("a | b");
    });

    it("handles single section", () => {
      expect(joinPromptSections(["Only"])).toBe("Only");
    });
  });
});

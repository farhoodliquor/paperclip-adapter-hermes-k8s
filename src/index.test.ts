import { describe, it, expect } from "vitest";
import { type, label, models, agentConfigurationDoc } from "./index.js";

describe("index", () => {
  describe("type", () => {
    it("exports correct adapter type", () => {
      expect(type).toBe("hermes_k8s");
    });
  });

  describe("label", () => {
    it("exports human-readable label", () => {
      expect(label).toBe("Hermes (Kubernetes)");
    });
  });

  describe("models", () => {
    it("exports model list", () => {
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it("each model has id and label", () => {
      for (const model of models) {
        expect(typeof model.id).toBe("string");
        expect(typeof model.label).toBe("string");
        expect(model.id).toContain("/"); // provider/model format
      }
    });

    it("includes Claude models", () => {
      const claudeModels = models.filter((m) => m.id.startsWith("anthropic/"));
      expect(claudeModels.length).toBeGreaterThan(0);
    });

    it("includes OpenAI models", () => {
      const openaiModels = models.filter((m) => m.id.startsWith("openai/"));
      expect(openaiModels.length).toBeGreaterThan(0);
    });

    it("includes Google models", () => {
      const googleModels = models.filter((m) => m.id.startsWith("google/"));
      expect(googleModels.length).toBeGreaterThan(0);
    });
  });

  describe("agentConfigurationDoc", () => {
    it("exports configuration documentation", () => {
      expect(typeof agentConfigurationDoc).toBe("string");
      expect(agentConfigurationDoc.length).toBeGreaterThan(0);
    });

    it("contains adapter type", () => {
      expect(agentConfigurationDoc).toContain("hermes_k8s");
    });

    it("documents model field", () => {
      expect(agentConfigurationDoc).toContain("- model");
    });

    it("documents namespace field", () => {
      expect(agentConfigurationDoc).toContain("- namespace");
    });

    it("documents timeoutSec field", () => {
      expect(agentConfigurationDoc).toContain("- timeoutSec");
    });
  });
});

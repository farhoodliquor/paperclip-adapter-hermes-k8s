import { describe, it, expect } from "vitest";
import { getConfigSchema } from "./config-schema.js";

describe("getConfigSchema", () => {
  const schema = getConfigSchema();

  it("returns an object with a fields array", () => {
    expect(schema).toHaveProperty("fields");
    expect(Array.isArray(schema.fields)).toBe(true);
  });

  it("does not include platform-provided fields", () => {
    const keys = schema.fields.map((f) => f.key);
    expect(keys).not.toContain("model");
    expect(keys).not.toContain("promptTemplate");
    expect(keys).not.toContain("env");
    expect(keys).not.toContain("extraArgs");
    expect(keys).not.toContain("timeoutSec");
    expect(keys).not.toContain("graceSec");
  });

  it("includes all expected adapter-specific field keys", () => {
    const keys = schema.fields.map((f) => f.key);
    expect(keys).toContain("provider");
    expect(keys).toContain("variant");
    expect(keys).toContain("dangerouslySkipPermissions");
    expect(keys).toContain("namespace");
    expect(keys).toContain("image");
    expect(keys).toContain("imagePullPolicy");
    expect(keys).toContain("kubeconfig");
    expect(keys).toContain("cwd");
    expect(keys).toContain("resources.requests.cpu");
    expect(keys).toContain("resources.requests.memory");
    expect(keys).toContain("resources.limits.cpu");
    expect(keys).toContain("resources.limits.memory");
    expect(keys).toContain("nodeSelector");
    expect(keys).toContain("tolerations");
    expect(keys).toContain("labels");
    expect(keys).toContain("ttlSecondsAfterFinished");
    expect(keys).toContain("retainJobs");
  });

  it("has a provider field with all expected options", () => {
    const field = schema.fields.find((f) => f.key === "provider")!;
    expect(field.type).toBe("select");
    expect(field.options).toEqual([
      { label: "Auto-detect", value: "auto" },
      { label: "OpenAI", value: "openai" },
      { label: "Anthropic", value: "anthropic" },
      { label: "Google", value: "google" },
      { label: "OpenRouter", value: "openrouter" },
      { label: "Nous", value: "nous" },
    ]);
  });

  it("has imagePullPolicy with all expected options", () => {
    const field = schema.fields.find((f) => f.key === "imagePullPolicy")!;
    expect(field.type).toBe("select");
    expect(field.options).toEqual([
      { label: "IfNotPresent", value: "IfNotPresent" },
      { label: "Always", value: "Always" },
      { label: "Never", value: "Never" },
    ]);
  });

  it("has dangerouslySkipPermissions with default true", () => {
    const field = schema.fields.find((f) => f.key === "dangerouslySkipPermissions")!;
    expect(field.type).toBe("toggle");
    expect(field.default).toBe(true);
  });

  it("has ttlSecondsAfterFinished with default 300", () => {
    const field = schema.fields.find((f) => f.key === "ttlSecondsAfterFinished")!;
    expect(field.type).toBe("number");
    expect(field.default).toBe(300);
  });

  it("has itemized resource fields as text inputs", () => {
    const resourceKeys = [
      "resources.requests.cpu",
      "resources.requests.memory",
      "resources.limits.cpu",
      "resources.limits.memory",
    ];
    for (const key of resourceKeys) {
      const field = schema.fields.find((f) => f.key === key);
      expect(field).toBeDefined();
      expect(field!.type).toBe("text");
      expect(field!.group).toBe("kubernetes");
    }
  });

  it("each field has a label", () => {
    for (const field of schema.fields) {
      expect(typeof field.label).toBe("string");
      expect(field.label.length).toBeGreaterThan(0);
    }
  });

  it("each field has a valid type", () => {
    const validTypes = ["text", "textarea", "select", "toggle", "number"] as const;
    for (const field of schema.fields) {
      expect(validTypes).toContain(field.type);
    }
  });

  it("select fields have options array", () => {
    const selectFields = schema.fields.filter((f) => f.type === "select");
    for (const field of selectFields) {
      expect(Array.isArray(field.options)).toBe(true);
      for (const opt of field.options!) {
        expect(opt).toHaveProperty("label");
        expect(opt).toHaveProperty("value");
      }
    }
  });

  it("has no duplicate field keys", () => {
    const keys = schema.fields.map((f) => f.key);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it("every field has a group", () => {
    const validGroups = ["core", "gateway", "kubernetes"];
    for (const field of schema.fields) {
      expect(validGroups).toContain(field.group);
    }
  });

  it("surfaces bootstrapPromptTemplate in the UI schema", () => {
    const keys = schema.fields.map((f) => f.key);
    expect(keys).toContain("bootstrapPromptTemplate");
  });

  it("surfaces serviceAccountName in the UI schema", () => {
    const keys = schema.fields.map((f) => f.key);
    expect(keys).toContain("serviceAccountName");
  });

  it("includes cwd as text", () => {
    const field = schema.fields.find((f) => f.key === "cwd")!;
    expect(field.type).toBe("text");
    expect(field.group).toBe("kubernetes");
  });
});

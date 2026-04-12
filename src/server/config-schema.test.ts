import { describe, it, expect } from "vitest";
import { getConfigSchema } from "./config-schema.js";

describe("getConfigSchema", () => {
  const schema = getConfigSchema();

  it("returns an object with a fields array", () => {
    expect(schema).toHaveProperty("fields");
    expect(Array.isArray(schema.fields)).toBe(true);
  });

  it("includes all expected field keys", () => {
    const keys = schema.fields.map((f) => f.key);
    expect(keys).toContain("model");
    expect(keys).toContain("provider");
    expect(keys).toContain("variant");
    expect(keys).toContain("dangerouslySkipPermissions");
    expect(keys).toContain("promptTemplate");
    expect(keys).toContain("bootstrapPromptTemplate");
    expect(keys).toContain("extraArgs");
    expect(keys).toContain("env");
    expect(keys).toContain("namespace");
    expect(keys).toContain("image");
    expect(keys).toContain("imagePullPolicy");
    expect(keys).toContain("serviceAccountName");
    expect(keys).toContain("kubeconfig");
    expect(keys).toContain("cwd");
    expect(keys).toContain("resources");
    expect(keys).toContain("nodeSelector");
    expect(keys).toContain("tolerations");
    expect(keys).toContain("labels");
    expect(keys).toContain("ttlSecondsAfterFinished");
    expect(keys).toContain("retainJobs");
    expect(keys).toContain("timeoutSec");
    expect(keys).toContain("graceSec");
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

  it("has timeoutSec with default 0", () => {
    const field = schema.fields.find((f) => f.key === "timeoutSec")!;
    expect(field.type).toBe("number");
    expect(field.default).toBe(0);
  });

  it("has graceSec with default 60", () => {
    const field = schema.fields.find((f) => f.key === "graceSec")!;
    expect(field.type).toBe("number");
    expect(field.default).toBe(60);
  });

  it("has ttlSecondsAfterFinished with default 300", () => {
    const field = schema.fields.find((f) => f.key === "ttlSecondsAfterFinished")!;
    expect(field.type).toBe("number");
    expect(field.default).toBe(300);
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

  it("marks model as required", () => {
    const field = schema.fields.find((f) => f.key === "model")!;
    expect(field.required).toBe(true);
  });

  it("every field has a group", () => {
    const validGroups = ["core", "kubernetes", "operational"];
    for (const field of schema.fields) {
      expect(validGroups).toContain(field.group);
    }
  });

  it("includes bootstrapPromptTemplate as textarea", () => {
    const field = schema.fields.find((f) => f.key === "bootstrapPromptTemplate")!;
    expect(field.type).toBe("textarea");
    expect(field.group).toBe("core");
  });

  it("includes env as textarea", () => {
    const field = schema.fields.find((f) => f.key === "env")!;
    expect(field.type).toBe("textarea");
    expect(field.group).toBe("core");
  });

  it("includes serviceAccountName as text", () => {
    const field = schema.fields.find((f) => f.key === "serviceAccountName")!;
    expect(field.type).toBe("text");
    expect(field.group).toBe("kubernetes");
  });

  it("includes cwd as text", () => {
    const field = schema.fields.find((f) => f.key === "cwd")!;
    expect(field.type).toBe("text");
    expect(field.group).toBe("kubernetes");
  });
});

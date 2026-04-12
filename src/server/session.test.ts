import { describe, it, expect } from "vitest";
import { sessionCodec } from "./session.js";

describe("sessionCodec", () => {
  describe("deserialize", () => {
    it("deserializes sessionId", () => {
      const result = sessionCodec.deserialize({ sessionId: "sess_123" });
      expect(result?.sessionId).toBe("sess_123");
    });

    it("deserializes session_id variant", () => {
      const result = sessionCodec.deserialize({ session_id: "sess_456" });
      expect(result?.sessionId).toBe("sess_456");
    });

    it("deserializes sessionID variant", () => {
      const result = sessionCodec.deserialize({ sessionID: "sess_789" });
      expect(result?.sessionId).toBe("sess_789");
    });

    it("prefers sessionId over session_id", () => {
      const result = sessionCodec.deserialize({ sessionId: "sess_a", session_id: "sess_b" });
      expect(result?.sessionId).toBe("sess_a");
    });

    it("deserializes cwd", () => {
      const result = sessionCodec.deserialize({ sessionId: "sess_1", cwd: "/workspace" });
      expect(result?.cwd).toBe("/workspace");
    });

    it("deserializes workdir variant", () => {
      const result = sessionCodec.deserialize({ sessionId: "sess_1", workdir: "/home" });
      expect(result?.cwd).toBe("/home");
    });

    it("deserializes folder variant", () => {
      const result = sessionCodec.deserialize({ sessionId: "sess_1", folder: "/code" });
      expect(result?.cwd).toBe("/code");
    });

    it("deserializes workspaceId", () => {
      const result = sessionCodec.deserialize({ sessionId: "sess_1", workspaceId: "ws_abc" });
      expect(result?.workspaceId).toBe("ws_abc");
    });

    it("deserializes repoUrl", () => {
      const result = sessionCodec.deserialize({ sessionId: "sess_1", repoUrl: "https://github.com/org/repo" });
      expect(result?.repoUrl).toBe("https://github.com/org/repo");
    });

    it("deserializes repoRef", () => {
      const result = sessionCodec.deserialize({ sessionId: "sess_1", repoRef: "main" });
      expect(result?.repoRef).toBe("main");
    });

    it("omits undefined fields", () => {
      const result = sessionCodec.deserialize({ sessionId: "sess_1" });
      expect(result).toEqual({ sessionId: "sess_1" });
    });

    it("trims whitespace from sessionId", () => {
      const result = sessionCodec.deserialize({ sessionId: "  sess_trimmed  " });
      expect(result?.sessionId).toBe("sess_trimmed");
    });

    it("returns null when no sessionId fields present", () => {
      const result = sessionCodec.deserialize({ cwd: "/workspace" });
      expect(result).toBeNull();
    });

    it("returns null for null input", () => {
      const result = sessionCodec.deserialize(null);
      expect(result).toBeNull();
    });

    it("returns null for array input", () => {
      const result = sessionCodec.deserialize(["sess_1"]);
      expect(result).toBeNull();
    });

    it("returns null for primitive input", () => {
      const result = sessionCodec.deserialize("sess_1");
      expect(result).toBeNull();
    });

    it("ignores empty strings for sessionId", () => {
      const result = sessionCodec.deserialize({ sessionId: "   ", session_id: "sess_valid" });
      expect(result?.sessionId).toBe("sess_valid");
    });
  });

  describe("serialize", () => {
    it("serializes sessionId", () => {
      const result = sessionCodec.serialize({ sessionId: "sess_1" });
      expect(result).toEqual({ sessionId: "sess_1" });
    });

    it("omits null fields", () => {
      const result = sessionCodec.serialize({ sessionId: "sess_1", cwd: null });
      expect(result).toEqual({ sessionId: "sess_1" });
    });

    it("returns null for null input", () => {
      const result = sessionCodec.serialize(null);
      expect(result).toBeNull();
    });

    it("returns null when sessionId is empty", () => {
      const result = sessionCodec.serialize({ sessionId: "" });
      expect(result).toBeNull();
    });

    it("serializes all fields", () => {
      const params = {
        sessionId: "sess_1",
        cwd: "/workspace",
        workspaceId: "ws_abc",
        repoUrl: "https://github.com/org/repo",
        repoRef: "main",
      };
      const result = sessionCodec.serialize(params);
      expect(result).toEqual(params);
    });
  });

  describe("getDisplayId", () => {
    it("returns sessionId when present", () => {
      const result = sessionCodec.getDisplayId!({ sessionId: "sess_display" });
      expect(result).toBe("sess_display");
    });

    it("returns null for null input", () => {
      const result = sessionCodec.getDisplayId!(null);
      expect(result).toBeNull();
    });

    it("returns null when no session fields", () => {
      const result = sessionCodec.getDisplayId!({ cwd: "/workspace" });
      expect(result).toBeNull();
    });

    it("trims whitespace", () => {
      const result = sessionCodec.getDisplayId!({ sessionId: "  sess_trim  " });
      expect(result).toBe("sess_trim");
    });
  });
});

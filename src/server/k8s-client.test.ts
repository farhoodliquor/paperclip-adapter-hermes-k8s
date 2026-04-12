import { describe, it, expect, beforeEach } from "vitest";
import { resetCache, type SelfPodInfo } from "./k8s-client.js";

describe("k8s-client", () => {
  beforeEach(() => {
    resetCache();
  });

  describe("resetCache", () => {
    it("clears cached state", () => {
      //resetCache is called in beforeEach - just verify it doesn't throw
      expect(() => resetCache()).not.toThrow();
    });
  });

  describe("SelfPodInfo interface", () => {
    it("accepts valid SelfPodInfo structure", () => {
      const info: SelfPodInfo = {
        namespace: "default",
        image: "paperclipai/agent:latest",
        imagePullSecrets: [{ name: "regcred" }],
        dnsConfig: undefined,
        pvcClaimName: "paperclip-data",
        secretVolumes: [],
        inheritedEnv: { ANTHROPIC_API_KEY: "sk-..." },
      };

      expect(info.namespace).toBe("default");
      expect(info.image).toBe("paperclipai/agent:latest");
      expect(info.pvcClaimName).toBe("paperclip-data");
    });

    it("handles null pvcClaimName", () => {
      const info: SelfPodInfo = {
        namespace: "default",
        image: "test:latest",
        imagePullSecrets: [],
        dnsConfig: undefined,
        pvcClaimName: null,
        secretVolumes: [],
        inheritedEnv: {},
      };

      expect(info.pvcClaimName).toBeNull();
    });

    it("handles secret volumes", () => {
      const info: SelfPodInfo = {
        namespace: "default",
        image: "test:latest",
        imagePullSecrets: [],
        dnsConfig: undefined,
        pvcClaimName: null,
        secretVolumes: [
          { volumeName: "secret-vol", secretName: "my-secret", mountPath: "/secrets", defaultMode: 420 },
        ],
        inheritedEnv: {},
      };

      expect(info.secretVolumes).toHaveLength(1);
      expect(info.secretVolumes[0].secretName).toBe("my-secret");
    });
  });
});

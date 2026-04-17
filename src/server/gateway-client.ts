import type { GatewayEndpoint } from "./gateway-manager.js";

export interface StartRunOptions {
  prompt: string;
  instructions?: string;
  model?: string;
  provider?: string;
  variant?: string;
  sessionId?: string;
  extraArgs?: string[];
}

export interface StartRunResult {
  runId: string;
}

export interface RunEvent {
  event: string;
  run_id: string;
  timestamp: number;
  delta?: string;
  tool?: string;
  preview?: string;
  duration?: number;
  error?: boolean | string;
  text?: string;
  output?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface RunResult {
  runId: string;
  output: string;
  usage?: RunEvent["usage"];
  error?: string;
}

function buildPostBody(opts: StartRunOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    input: opts.prompt,
  };
  if (opts.instructions) {
    body.instructions = opts.instructions;
  }
  if (opts.sessionId) {
    body.session_id = opts.sessionId;
  }
  if (opts.model) {
    body.model = opts.model;
  }
  if (opts.provider) {
    body.provider = opts.provider;
  }
  if (opts.variant) {
    body.variant = opts.variant;
  }
  return body;
}

/**
 * Start an async run on the gateway.
 * Returns the run_id immediately (202 Accepted).
 */
export async function startRun(
  endpoint: GatewayEndpoint,
  opts: StartRunOptions,
  signal?: AbortSignal,
): Promise<StartRunResult> {
  const body = buildPostBody(opts);
  const res = await fetch(`${endpoint.baseUrl}/v1/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${endpoint.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`hermes_k8s: gateway /v1/runs failed (${res.status}): ${text}`);
  }

  const json = await res.json() as { run_id: string; status?: string };
  return { runId: json.run_id };
}

/**
 * Stream run events via SSE from the gateway.
 * Calls onEvent for each parsed event. Returns when the stream completes.
 *
 * The X-Hermes-Session-Id header is sent to maintain session context on the SSE connection.
 */
export async function streamRunEvents(
  endpoint: GatewayEndpoint,
  runId: string,
  sessionId: string | undefined,
  onEvent: (event: RunEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${endpoint.baseUrl}/v1/runs/${encodeURIComponent(runId)}/events`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${endpoint.apiKey}`,
  };
  if (sessionId) {
    headers["X-Hermes-Session-Id"] = sessionId;
  }

  const res = await fetch(url, { headers, signal });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`hermes_k8s: gateway /v1/runs events failed (${res.status}): ${text}`);
  }

  if (!res.body) {
    throw new Error("hermes_k8s: gateway /v1/runs/events response has no body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith(": keepalive")) continue;
        if (!line.startsWith("data: ")) continue;
        const data = line.slice("data: ".length).trim();
        if (!data) continue;
        if (data === "[DONE]") continue;

        try {
          const event = JSON.parse(data) as RunEvent;
          onEvent(event);
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Cancel a running job.
 */
export async function cancelRun(
  endpoint: GatewayEndpoint,
  runId: string,
  signal?: AbortSignal,
): Promise<void> {
  await fetch(`${endpoint.baseUrl}/v1/runs/${encodeURIComponent(runId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${endpoint.apiKey}` },
    signal,
  });
}

/**
 * Execute a run end-to-end: start it, stream events, accumulate result.
 */
export async function executeGatewayRun(
  endpoint: GatewayEndpoint,
  opts: StartRunOptions,
  signal?: AbortSignal,
): Promise<RunResult> {
  const { runId } = await startRun(endpoint, opts, signal);

  let output = "";
  let usage: RunEvent["usage"] | undefined;
  let error: string | undefined;

  await streamRunEvents(
    endpoint,
    runId,
    opts.sessionId,
    (event) => {
      if (event.event === "message.delta" && event.delta) {
        output += event.delta;
      } else if (event.event === "run.completed") {
        output = event.output ?? "";
        usage = event.usage;
      } else if (event.event === "run.failed") {
        error = typeof event.error === "string" ? event.error : JSON.stringify(event.error);
      }
    },
    signal,
  );

  return { runId, output, usage, error };
}

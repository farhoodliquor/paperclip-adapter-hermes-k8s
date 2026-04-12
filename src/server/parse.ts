/**
 * Parse Hermes Agent quiet-mode text output.
 *
 * Hermes --quiet output patterns:
 *   Assistant:  "  ┊ 💬 {text}"
 *   Tool:       "  ┊ {emoji} {verb:9} {detail}  {duration}"
 *   System:     "[hermes] ..." or "session_id: {id}"
 *   Thinking:   "💭 ..." or "<thinking>...</thinking>"
 *   Error:      "Error: ..." or "ERROR: ..." or "Traceback ..."
 */

const TOOL_OUTPUT_PREFIX = "┊";
const THINKING_EMOJI = "💭";
const SESSION_ID_REGEX = /session[_ ]?(?:id|saved)[:\s]+([a-zA-Z0-9_-]+)/i;

function isThinkingLine(line: string): boolean {
  return (
    line.includes(THINKING_EMOJI) ||
    line.startsWith("<thinking>") ||
    line.startsWith("</thinking>") ||
    line.startsWith("Thinking:")
  );
}

function extractThinkingText(line: string): string {
  return line.replace(/^[\s┊]*💭\s*/, "").trim();
}

function isAssistantLine(line: string): boolean {
  return /^┊\s*💬/.test(line);
}

function extractAssistantText(line: string): string {
  return line.replace(/^[\s┊]*💬\s*/, "").trim();
}

function isToolCompletionLine(line: string): boolean {
  return line.includes(TOOL_OUTPUT_PREFIX);
}

/**
 * Parse a tool completion line to extract structured info.
 * Format: "┊ {emoji} {verb} {detail}  {duration}"
 */
function parseToolLine(line: string): string {
  const stripped = line
    .replace(/^\[done\]\s*/, "")
    .replace(new RegExp(`^${TOOL_OUTPUT_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`), "")
    .trim();
  // Strip kaomoji: (｡◕‿◕｡), (★ω★), etc.
  const cleaned = stripped.replace(/[(][^()]{2,20}[)]\s*/gu, "").trim();
  // Strip duration at end
  return cleaned.replace(/[\d.]+s(\s*\(.*\))?\s*$/, "").trim();
}

function isSystemLine(line: string): boolean {
  return line.startsWith("[hermes]") || line.startsWith("[paperclip]") || line.startsWith("session_id:");
}

function isErrorLine(line: string): boolean {
  return line.startsWith("Error:") || line.startsWith("ERROR:") || line.startsWith("Traceback");
}

export interface ParsedHermesOutput {
  sessionId: string | null;
  summary: string;
  errorMessage: string | null;
}

/**
 * Parse Hermes quiet-mode text output into structured result.
 */
export function parseHermesText(stdout: string): ParsedHermesOutput {
  let sessionId: string | null = null;
  const messages: string[] = [];
  const errors: string[] = [];

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // Session ID extraction
    const sessionMatch = SESSION_ID_REGEX.exec(line);
    if (sessionMatch) {
      sessionId = sessionMatch[1];
    }

    // Skip non-display lines
    if (line.startsWith("[tool]")) continue;
    if (/^\p{Emoji_Presentation}\s*(Completed|Running|Error)?\s*$/u.test(line)) continue;
    if (/^\[\d{4}-\d{2}-\d{2}T/.test(line)) continue; // MCP/server noise

    // System lines — skip except for session_id (already extracted above)
    if (isSystemLine(line)) continue;

    // Error lines
    if (isErrorLine(line)) {
      errors.push(line);
      continue;
    }

    // Thinking blocks — skip for summary (separate from assistant output)
    if (isThinkingLine(line)) continue;

    // Tool completion lines — extract detail
    if (isToolCompletionLine(line) && !isAssistantLine(line)) {
      const detail = parseToolLine(line);
      if (detail) messages.push(detail);
      continue;
    }

    // Assistant messages
    if (isAssistantLine(line)) {
      const text = extractAssistantText(line);
      if (text) messages.push(text);
      continue;
    }

    // Fallback: any other non-empty line
    if (line) messages.push(line);
  }

  return {
    sessionId,
    summary: messages.join("\n\n"),
    errorMessage: errors.length > 0 ? errors.join("\n") : null,
  };
}

/**
 * Detect unknown session errors from Hermes output.
 */
export function isHermesUnknownSessionError(stdout: string): boolean {
  const haystack = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");

  return /unknown\s+session|session\b.*\bnot\s+found|resource\s+not\s+found.*session|no session|notfounderror/i.test(haystack);
}

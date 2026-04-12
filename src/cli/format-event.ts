/**
 * CLI output formatting for Hermes K8s adapter.
 *
 * Formats Hermes --quiet output lines for terminal display.
 */

const TOOL_OUTPUT_PREFIX = "┊";
const THINKING_EMOJI = "💭";

function isThinkingLine(line: string): boolean {
  return (
    line.includes(THINKING_EMOJI) ||
    line.startsWith("<thinking>") ||
    line.startsWith("</thinking>") ||
    line.startsWith("Thinking:")
  );
}

function isAssistantLine(line: string): boolean {
  return /^┊\s*💬/.test(line);
}

function isToolLine(line: string): boolean {
  return line.includes(TOOL_OUTPUT_PREFIX) && !isAssistantLine(line);
}

function isSystemLine(line: string): boolean {
  return line.startsWith("[hermes]") || line.startsWith("[paperclip]");
}

function isErrorLine(line: string): boolean {
  return line.startsWith("Error:") || line.startsWith("ERROR:") || line.startsWith("Traceback");
}

/**
 * Format a Hermes stdout line for terminal display.
 * In normal mode prints as-is; in debug mode adds color hints.
 *
 * Note: Actual color formatting (picocolors) is handled by the console.log
 * wrapper in the CLI adapter. This function returns the formatted text.
 */
export function formatEvent(line: string, debug: boolean): string {
  const trimmed = line.trim();
  if (!trimmed) return "";

  if (!debug) {
    return trimmed;
  }

  // System lines — blue
  if (isSystemLine(trimmed)) {
    return `[system] ${trimmed}`;
  }

  // Tool output lines — cyan
  if (isToolLine(trimmed)) {
    return `[tool] ${trimmed}`;
  }

  // Thinking — dim
  if (isThinkingLine(trimmed)) {
    return `[think] ${trimmed.replace(/^[\s┊]*💭\s*/, "")}`;
  }

  // Assistant lines — green
  if (isAssistantLine(trimmed)) {
    return trimmed.replace(/^[\s┊]*💬\s*/, "");
  }

  // Error lines — red
  if (isErrorLine(trimmed)) {
    return `[error] ${trimmed}`;
  }

  // Session info — green
  if (/session/i.test(trimmed) && /id|saved|resumed/i.test(trimmed)) {
    return `[session] ${trimmed}`;
  }

  return trimmed;
}

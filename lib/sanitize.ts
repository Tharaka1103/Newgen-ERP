/**
 * Utility to sanitize user input against NoSQL Injection attacks.
 * Strips keys containing `$` or `.`.
 */
export function sanitizeInput<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input !== "object") {
    if (typeof input === "string") {
      // Basic trim and sanitization
      return input.trim() as unknown as T;
    }
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeInput(item)) as unknown as T;
  }

  const cleanObj: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    // Drop keys that start with '$' or contain '.' (NoSQL operator injection)
    if (key.startsWith("$") || key.includes(".")) {
      continue;
    }

    cleanObj[key] = sanitizeInput(value);
  }

  return cleanObj as T;
}

export function escapeHtml(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function serializeQuestionAnswer(answer: unknown): string | undefined {
  if (answer === null || answer === undefined) return undefined;

  if (Array.isArray(answer)) {
    const hasObject = answer.some((item) => item && typeof item === 'object');
    if (hasObject) {
      return JSON.stringify(answer);
    }
    return JSON.stringify(answer.map((a) => String(a)));
  }

  if (typeof answer === 'string') {
    const trimmed = answer.trim();
    if (!trimmed) return undefined;
    return trimmed;
  }

  if (typeof answer === 'object') {
    try {
      return JSON.stringify(answer);
    } catch {
      return String(answer);
    }
  }

  return String(answer);
}

export function parseQuestionAnswer(
  answer: string | null | undefined
): string | string[] | Record<string, unknown> | Array<Record<string, unknown>> | undefined {
  if (answer === null || answer === undefined) return undefined;

  const trimmed = answer.trim();
  if (!trimmed) return undefined;

  // Accept JSON array/object answers (e.g. ["a","b"]) but remain backward compatible with plain strings.
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const hasObject = parsed.some((item) => item && typeof item === 'object');
        return hasObject
          ? (parsed as Array<Record<string, unknown>>)
          : parsed.map((a) => String(a));
      }
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // fallthrough
    }
  }

  return trimmed;
}

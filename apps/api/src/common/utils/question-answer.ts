export function serializeQuestionAnswer(answer: unknown): string | undefined {
  if (answer === null || answer === undefined) return undefined;

  if (Array.isArray(answer)) {
    return JSON.stringify(answer.map((a) => String(a)));
  }

  if (typeof answer === 'string') {
    const trimmed = answer.trim();
    if (!trimmed) return undefined;
    return trimmed;
  }

  return String(answer);
}

export function parseQuestionAnswer(
  answer: string | null | undefined
): string | string[] | undefined {
  if (answer === null || answer === undefined) return undefined;

  const trimmed = answer.trim();
  if (!trimmed) return undefined;

  // Accept JSON array answers (e.g. ["a","b"]) but remain backward compatible with plain strings.
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((a) => String(a));
      }
    } catch {
      // fallthrough
    }
  }

  return trimmed;
}

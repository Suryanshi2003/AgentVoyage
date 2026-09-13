/**
 * Best-effort guess at the destination named in a free-text trip query,
 * used only as a placeholder while the agents are still working. Not
 * perfect — it's a heuristic, not an NLP model.
 */
const NON_PLACE_WORDS = new Set([
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'budget', 'week', 'weekend', 'days', 'day', 'the', 'a', 'an',
]);

export function extractDestination(query: string): string | null {
  const regex = /\b(?:in|to|around|through)\s+([A-Za-z][\w'-]*(?:\s+[A-Za-z][\w'-]*){0,2})/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(query))) {
    const candidate = match[1].trim();
    const firstWord = candidate.split(/\s+/)[0].toLowerCase();
    if (!NON_PLACE_WORDS.has(firstWord)) {
      return candidate;
    }
  }

  const capitalizedMatch = query.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  return capitalizedMatch ? capitalizedMatch[1].trim() : null;
}

export interface AnswerDestination {
  /** Full text as written, e.g. "Kyoto, Japan" — good for display. */
  display: string;
  /** Just the city/place, e.g. "Kyoto" — better for an image lookup. */
  searchTerm: string;
}

const DESTINATION_LINE_RE = /destination\s*:\s*([^\n]+)/i;

/**
 * Reads the "Destination: Kyoto, Japan" line the final agent's prompt asks
 * for. Far more reliable than guessing from the user's raw (possibly
 * lowercase, possibly vague) query, once the answer has actually arrived.
 */
export function extractDestinationFromAnswer(answer: string): AnswerDestination | null {
  const match = answer.match(DESTINATION_LINE_RE);
  if (!match) return null;

  const display = match[1].replace(/\*+/g, '').trim();
  const searchTerm = display.split(',')[0].trim();
  if (!searchTerm) return null;

  return { display, searchTerm };
}

export interface SummarySection {
  key: string;
  title: string;
  icon: string;
  /** Raw markdown for this section's body, rendered later via the markdown pipe. */
  body: string;
}

export interface ItineraryDay {
  label: string;
  /** Raw markdown for this day's body, rendered later via the markdown pipe. */
  body: string;
}

const ICON_RULES: { match: RegExp; icon: string }[] = [
  { match: /trip summary/i, icon: 'compass' },
  { match: /flight/i, icon: 'plane' },
  { match: /hotel/i, icon: 'bed' },
  { match: /itinerary/i, icon: 'calendar' },
  { match: /budget/i, icon: 'wallet' },
  { match: /recommend/i, icon: 'star' },
];

function iconFor(title: string): string {
  return ICON_RULES.find((rule) => rule.match.test(title))?.icon ?? 'compass';
}

/** Strips leading markdown markup (#, >, *, whitespace) so headers can be
 *  matched whether the LLM wrote "1. Trip Summary" or "**1. Trip Summary**". */
function normalizeHeaderCandidate(line: string): string {
  return line
    .replace(/^[#>*\s]+/, '')
    .replace(/\*+\s*$/, '')
    .trim();
}

const NUMBERED_HEADER_RE = /^(\d+)[.)]\s*(.+)$/;

function tryParseNumberedHeader(line: string): string | null {
  const normalized = normalizeHeaderCandidate(line);
  const match = normalized.match(NUMBERED_HEADER_RE);
  return match ? match[2].replace(/\*+$/, '').trim() : null;
}

/**
 * Splits the final agent's answer into its numbered sections
 * (Trip Summary, Flight Information, ...). Returns null if the
 * text doesn't look sectioned, so callers can fall back gracefully.
 */
export function parseSummarySections(text: string): SummarySection[] | null {
  const lines = (text || '').split('\n');
  const sections: SummarySection[] = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentTitle) {
      sections.push({
        key: currentTitle,
        title: currentTitle,
        icon: iconFor(currentTitle),
        body: currentLines.join('\n').trim(),
      });
    }
  };

  for (const rawLine of lines) {
    const headerTitle = tryParseNumberedHeader(rawLine);
    if (headerTitle && headerTitle.length < 60) {
      flush();
      currentTitle = headerTitle;
      currentLines = [];
    } else {
      currentLines.push(rawLine);
    }
  }
  flush();

  return sections.length >= 2 ? sections : null;
}

const DAY_HEADER_RE = /^day\s*(\d+)\b[:\-]?\s*(.*)$/i;

function tryParseDayHeader(line: string): { num: string; rest: string } | null {
  const normalized = normalizeHeaderCandidate(line);
  const match = normalized.match(DAY_HEADER_RE);
  if (!match) return null;
  return { num: match[1], rest: match[2]?.replace(/\*+$/, '').trim() ?? '' };
}

/**
 * Splits itinerary text into a per-day timeline. Returns null if no
 * "Day N" markers are found, so callers can fall back gracefully.
 */
export function parseItineraryDays(text: string): ItineraryDay[] | null {
  const lines = (text || '').split('\n');
  const days: ItineraryDay[] = [];
  let currentLabel: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentLabel) {
      days.push({ label: currentLabel, body: currentLines.join('\n').trim() });
    }
  };

  for (const rawLine of lines) {
    const day = tryParseDayHeader(rawLine);
    if (day) {
      flush();
      currentLabel = day.rest ? `Day ${day.num} — ${day.rest}` : `Day ${day.num}`;
      currentLines = [];
    } else {
      currentLines.push(rawLine);
    }
  }
  flush();

  return days.length ? days : null;
}

// Phrases that leak backend/API implementation details into user-facing text.
const PROVIDER_MENTION_RE = /\b(API|AviationStack|Amadeus|Skyscanner|Kayak|Tavily|RapidAPI)\b/i;
const PRICE_CAVEAT_RE = /ticket price|live\/status|flight-pricing/i;

export interface CleanedContent {
  content: string;
  note: string | null;
}

/**
 * Strips out lines that mention API/provider names or raw technical
 * caveats, and replaces them with one plain, user-facing note instead.
 */
export function extractProviderNote(text: string): CleanedContent {
  const lines = (text || '').split('\n');
  const kept: string[] = [];
  let sawNote = false;

  for (const line of lines) {
    if (PROVIDER_MENTION_RE.test(line) || PRICE_CAVEAT_RE.test(line)) {
      sawNote = true;
      continue;
    }
    kept.push(line);
  }

  return {
    content: kept.join('\n').trim(),
    note: sawNote
      ? "These are flight schedules, not live ticket prices — check the airline's site or a booking site for current fares."
      : null,
  };
}

/** Strips common markdown syntax down to plain text, for Copy / PDF export. */
export function toPlainText(markdown: string): string {
  return (markdown || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\|/g, '  ')
    .replace(/^-{3,}$/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

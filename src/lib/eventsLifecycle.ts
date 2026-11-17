import type { EventData } from '../schemas/events';
import type { TracklistData } from '../schemas/tracklist';
import type { Locale } from '../i18n/ui';

export interface EventTodoStatus {
  isPast: boolean;
  missingTracklist: boolean;
  missingNotes: boolean;
  missingAudioSetup: boolean;
  needsAttention: boolean;
}

export function isEventPast(
  event: Pick<EventData, 'endAt' | 'date'>,
  now: Date = new Date()
): boolean {
  const endMs = event.endAt ? Date.parse(event.endAt) : Date.parse(`${event.date}T23:59:59+01:00`);
  if (Number.isNaN(endMs)) {
    return false;
  }
  return now.getTime() > endMs;
}

export function getEventTodoStatus(
  event: EventData,
  tracklistsById?: Record<string, TracklistData>,
  now: Date = new Date()
): EventTodoStatus {
  const past = isEventPast(event, now);

  const hasLinkedTracklist = Boolean(
    event.tracklistId &&
      (!tracklistsById ||
        (tracklistsById[event.tracklistId] &&
          tracklistsById[event.tracklistId].tracks.length > 0))
  );
  const hasLegacyTracklist = Array.isArray(event.tracklist) && event.tracklist.length > 0;
  const missingTracklist = past && !hasLinkedTracklist && !hasLegacyTracklist;

  const missingNotes =
    past && (!event.notes?.it?.trim() || !event.notes?.en?.trim());

  const missingAudioSetup = past && !event.audioSetup?.trim();

  return {
    isPast: past,
    missingTracklist,
    missingNotes,
    missingAudioSetup,
    needsAttention: missingTracklist || missingNotes || missingAudioSetup,
  };
}

export function formatEventTimeRange(
  startAt: string,
  endAt: string,
  locale: Locale = 'it'
): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return '';
  }

  const timeFmt = new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-GB', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const dateFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const startTime = timeFmt.format(start);
  const endTime = timeFmt.format(end);
  const startDay = dateFmt.format(start);
  const endDay = dateFmt.format(end);

  if (startDay !== endDay) {
    return `${startTime} – ${endTime} (+1)`;
  }
  return `${startTime} – ${endTime}`;
}

export function extractRomeDateAndTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: '2026-01-01', time: '22:00' };
  }
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  return { date, time };
}

/**
 * Converts a local Europe/Rome YYYY-MM-DD + HH:mm pair into an ISO string with the accurate
 * Europe/Rome UTC offset (+01:00 or +02:00 depending on DST).
 */
export function buildRomeIsoDateTime(dateStr: string, timeStr: string): string {
  const cleanDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : '2026-01-01';
  const cleanTime = /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : '22:00';

  const probeUtc = new Date(`${cleanDate}T${cleanTime}:00Z`);
  if (Number.isNaN(probeUtc.getTime())) {
    return `${cleanDate}T${cleanTime}:00+01:00`;
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    timeZoneName: 'shortOffset',
  }).formatToParts(probeUtc);

  const tzName = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+1';
  const match = tzName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  let offset = '+01:00';
  if (match) {
    const sign = match[1];
    const hh = match[2].padStart(2, '0');
    const mm = (match[3] || '00').padStart(2, '0');
    offset = `${sign}${hh}:${mm}`;
  }

  return `${cleanDate}T${cleanTime}:00${offset}`;
}

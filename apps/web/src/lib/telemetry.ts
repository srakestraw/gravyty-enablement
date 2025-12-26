/**
 * Telemetry stub
 * 
 * TODO: Replace with actual telemetry service (e.g., Segment, Amplitude, etc.)
 * This will integrate with EventBridge + Step Functions + Firehose + Athena in the future
 */

interface TelemetryPayload {
  [key: string]: any;
}

export function track(eventName: string, payload: TelemetryPayload = {}) {
  const event = {
    eventName,
    ts: new Date().toISOString(),
    payload,
  };

  // Console log for now - will be replaced with actual telemetry service
  console.log('[Telemetry]', event);

  // TODO: Send to telemetry service
  // Example: analytics.track(eventName, { ...payload, timestamp: event.ts });
}

// Event names used throughout the app
export const TELEMETRY_EVENTS = {
  PAGE_VIEW: 'page_view',
  SEARCH: 'search',
  DOWNLOAD: 'download',
  ASSISTANT_QUERY: 'assistant_query',
  NOTIFICATION_VIEW: 'notification_view',
} as const;


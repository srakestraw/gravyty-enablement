/**
 * Telemetry
 * 
 * Sends events to the API /v1/events endpoint
 * Future: Will integrate with EventBridge + Step Functions + Firehose + Athena
 */

import { eventsApi } from './apiClient';

interface TelemetryPayload {
  [key: string]: any;
}

export function track(eventName: string, payload: TelemetryPayload = {}) {
  const event = {
    event_name: eventName,
    metadata: payload,
  };

  // Send to API (non-blocking)
  eventsApi.track(event);

  // Also log for development
  if (import.meta.env.DEV) {
    console.log('[Telemetry]', event);
  }
}

// Event names used throughout the app
export const TELEMETRY_EVENTS = {
  PAGE_VIEW: 'page_view',
  SEARCH: 'search',
  DOWNLOAD: 'download',
  ASSISTANT_QUERY: 'assistant_query',
  NOTIFICATION_VIEW: 'notification_view',
  // Brain events
  BRAIN_DOCUMENT_CREATED: 'brain_document_created',
  BRAIN_DOCUMENT_UPLOAD_STARTED: 'brain_document_upload_started',
  BRAIN_DOCUMENT_UPLOAD_COMPLETED: 'brain_document_upload_completed',
  BRAIN_DOCUMENT_INGEST_REQUESTED: 'brain_document_ingest_requested',
  BRAIN_DOCUMENT_VIEWED: 'brain_document_viewed',
  ASSISTANT_CITATION_CLICK: 'assistant_citation_click',
  // Landing/Auth events
  LANDING_VIEWED: 'landing_viewed',
  LOGIN_CTA_CLICKED: 'login_cta_clicked',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  // Header events
  NOTIFICATION_OPENED: 'notification_opened',
  NOTIFICATION_CLICKED: 'notification_clicked',
  USER_MENU_OPENED: 'user_menu_opened',
  SIGN_OUT_CLICKED: 'sign_out_clicked',
} as const;


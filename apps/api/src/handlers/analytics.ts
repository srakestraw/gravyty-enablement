/**
 * Analytics Handlers
 * 
 * Admin-only endpoints for viewing usage analytics from events table
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest, ApiSuccessResponse } from '../types';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../aws/dynamoClient';

const EVENTS_TABLE = process.env.DDB_TABLE_EVENTS || 'events';

interface EventItem {
  date_bucket: string;
  'ts#event_id': string;
  event_id: string;
  event_name: string;
  user_id?: string;
  content_id?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Query events for a date range
 */
async function queryEventsForDateRange(days: number): Promise<EventItem[]> {
  const events: EventItem[] = [];
  const today = new Date();
  
  // Query events for the last N days
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateBucket = date.toISOString().split('T')[0];
    
    try {
      const command = new QueryCommand({
        TableName: EVENTS_TABLE,
        KeyConditionExpression: 'date_bucket = :date',
        ExpressionAttributeValues: {
          ':date': dateBucket,
        },
        ScanIndexForward: false, // Descending order
      });
      
      const { Items = [] } = await dynamoDocClient.send(command);
      events.push(...(Items as EventItem[]));
    } catch (error) {
      console.warn(`Failed to query events for ${dateBucket}:`, error);
      // Continue with other dates
    }
  }
  
  return events;
}

/**
 * GET /v1/analytics/overview
 * Get overview analytics (active users, total events, views, downloads, notification clicks)
 */
export async function getAnalyticsOverview(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const days = parseInt(req.query.days as string) || 30;

  try {
    const events = await queryEventsForDateRange(days);
    
    // Calculate metrics
    const activeUsers = new Set<string>();
    let views = 0;
    let downloads = 0;
    let notificationClicks = 0;
    
    for (const event of events) {
      if (event.user_id) {
        activeUsers.add(event.user_id);
      }
      
      switch (event.event_name) {
        case 'view':
        case 'content_view':
        case 'page_view':
          views++;
          break;
        case 'download':
          downloads++;
          break;
        case 'notification_click':
          notificationClicks++;
          break;
      }
    }
    
    const response: ApiSuccessResponse<{
      active_users: number;
      total_events: number;
      views: number;
      downloads: number;
      notification_clicks: number;
      days: number;
    }> = {
      data: {
        active_users: activeUsers.size,
        total_events: events.length,
        views,
        downloads,
        notification_clicks: notificationClicks,
        days,
      },
      request_id: requestId,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get analytics overview',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/analytics/content
 * Get per-content analytics (views, downloads, notification clicks)
 * Returns top 20 by downloads
 */
export async function getContentAnalytics(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const days = parseInt(req.query.days as string) || 30;

  try {
    const events = await queryEventsForDateRange(days);
    
    // Aggregate by content_id
    const contentStats = new Map<string, {
      content_id: string;
      views: number;
      downloads: number;
      notification_clicks: number;
    }>();
    
    for (const event of events) {
      if (!event.content_id) continue;
      
      if (!contentStats.has(event.content_id)) {
        contentStats.set(event.content_id, {
          content_id: event.content_id,
          views: 0,
          downloads: 0,
          notification_clicks: 0,
        });
      }
      
      const stats = contentStats.get(event.content_id)!;
      
      switch (event.event_name) {
        case 'view':
        case 'content_view':
          stats.views++;
          break;
        case 'download':
          stats.downloads++;
          break;
        case 'notification_click':
          stats.notification_clicks++;
          break;
      }
    }
    
    // Sort by downloads descending and take top 20
    const topContent = Array.from(contentStats.values())
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 20);
    
    const response: ApiSuccessResponse<{
      items: Array<{
        content_id: string;
        views: number;
        downloads: number;
        notification_clicks: number;
      }>;
      days: number;
    }> = {
      data: {
        items: topContent,
        days,
      },
      request_id: requestId,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get content analytics',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/analytics/users
 * Get per-user analytics (event count, last seen)
 * Returns top 50 by activity
 */
export async function getUserAnalytics(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const days = parseInt(req.query.days as string) || 30;

  try {
    const events = await queryEventsForDateRange(days);
    
    // Aggregate by user_id
    const userStats = new Map<string, {
      user_id: string;
      event_count: number;
      last_seen: string;
    }>();
    
    for (const event of events) {
      if (!event.user_id) continue;
      
      if (!userStats.has(event.user_id)) {
        userStats.set(event.user_id, {
          user_id: event.user_id,
          event_count: 0,
          last_seen: event.timestamp || '',
        });
      }
      
      const stats = userStats.get(event.user_id)!;
      stats.event_count++;
      
      // Update last_seen if this event is more recent
      if (event.timestamp && event.timestamp > stats.last_seen) {
        stats.last_seen = event.timestamp;
      }
    }
    
    // Sort by event_count descending and take top 50
    const topUsers = Array.from(userStats.values())
      .sort((a, b) => b.event_count - a.event_count)
      .slice(0, 50);
    
    const response: ApiSuccessResponse<{
      items: Array<{
        user_id: string;
        event_count: number;
        last_seen: string;
      }>;
      days: number;
    }> = {
      data: {
        items: topUsers,
        days,
      },
      request_id: requestId,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get user analytics',
      },
      request_id: requestId,
    });
  }
}



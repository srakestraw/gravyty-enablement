/**
 * Content Hub Scheduler Lambda Handler
 * 
 * EventBridge scheduled Lambda that publishes scheduled versions and expires published versions.
 */

import { handler as schedulerHandler } from '@gravyty/jobs';

export const handler = schedulerHandler;

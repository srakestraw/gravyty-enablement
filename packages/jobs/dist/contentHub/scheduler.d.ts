/**
 * Content Hub Scheduler Job
 *
 * EventBridge scheduled Lambda that:
 * - Publishes scheduled versions when publishAt <= now
 * - Expires published versions when expireAt <= now
 *
 * Runs every 5 minutes, idempotent.
 */
export interface SchedulerJobResult {
    published: number;
    expired: number;
    errors: number;
    errorDetails?: string[];
}
/**
 * Run the Content Hub scheduler job
 *
 * @param options.now - Current time (defaults to now)
 * @returns Summary of job execution
 */
export declare function runContentHubScheduler(options?: {
    now?: Date;
}): Promise<SchedulerJobResult>;
/**
 * Lambda handler for EventBridge scheduled trigger
 */
export declare function handler(event: any): Promise<{
    statusCode: number;
    body: string;
}>;
//# sourceMappingURL=scheduler.d.ts.map
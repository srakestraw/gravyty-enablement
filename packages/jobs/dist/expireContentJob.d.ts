/**
 * Scheduled Content Expiry Job
 *
 * Scans content_registry for items with expiry_date <= now and status != Expired,
 * then expires them (status change + notifications).
 */
export interface ExpiryJobResult {
    scanned: number;
    expired: number;
    skipped: number;
    errors: number;
    errorDetails?: string[];
}
/**
 * Run the expiry job
 *
 * @param options.now - Current time (defaults to now)
 * @returns Summary of job execution
 */
export declare function runExpiryJob(options?: {
    now?: Date;
}): Promise<ExpiryJobResult>;
//# sourceMappingURL=expireContentJob.d.ts.map
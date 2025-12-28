/**
 * Lambda Handler for Scheduled Content Expiry
 * 
 * Invoked by EventBridge on a daily schedule to expire content items.
 * 
 * Imports from @gravyty/jobs package which will be bundled by NodejsFunction.
 */

import { runExpiryJob } from '@gravyty/jobs';

export async function handler(event: any) {
  console.log('Expiry job started', { event });

  try {
    const result = await runExpiryJob();

    console.log('Expiry job completed', {
      scanned: result.scanned,
      expired: result.expired,
      skipped: result.skipped,
      errors: result.errors,
      errorDetails: result.errorDetails,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        result,
      }),
    };
  } catch (error) {
    console.error('Expiry job failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}


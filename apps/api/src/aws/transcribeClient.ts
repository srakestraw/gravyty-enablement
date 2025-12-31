/**
 * AWS Transcribe Client
 * 
 * Wrapper for AWS Transcribe SDK v3
 * Handles transcription job creation and status checking
 */

import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand, TranscriptionJobStatus } from '@aws-sdk/client-transcribe';

const region = process.env.AWS_REGION || 'us-east-1';

// Create Transcribe client
export const transcribeClient = new TranscribeClient({
  region,
  // Credentials will be resolved from:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. Shared credentials file (~/.aws/credentials)
  // 3. IAM role (when running on Lambda)
});

/**
 * Start a transcription job
 */
export async function startTranscriptionJob(params: {
  jobName: string;
  mediaFileUri: string; // S3 URI (s3://bucket/key)
  outputBucket: string;
  outputKey: string;
  languageCode?: string; // Default: 'en-US'
  mediaFormat?: string; // Auto-detect if not provided
}): Promise<{ jobName: string; status: TranscriptionJobStatus }> {
  const command = new StartTranscriptionJobCommand({
    TranscriptionJobName: params.jobName,
    Media: {
      MediaFileUri: params.mediaFileUri,
    },
    MediaFormat: params.mediaFormat, // Optional - Transcribe will auto-detect if not provided
    LanguageCode: params.languageCode || 'en-US',
    OutputBucketName: params.outputBucket,
    OutputKey: params.outputKey,
    Settings: {
      ShowSpeakerLabels: false, // Basic transcription, no speaker diarization
      ShowAlternatives: false, // Single best transcript
    },
  });

  const response = await transcribeClient.send(command);
  
  if (!response.TranscriptionJob) {
    throw new Error('Failed to start transcription job: no job returned');
  }

  return {
    jobName: response.TranscriptionJob.TranscriptionJobName!,
    status: response.TranscriptionJob.TranscriptionJobStatus!,
  };
}

/**
 * Get transcription job status
 */
export async function getTranscriptionJob(jobName: string): Promise<{
  status: TranscriptionJobStatus;
  transcriptUri?: string;
  failureReason?: string;
  languageCode?: string;
}> {
  const command = new GetTranscriptionJobCommand({
    TranscriptionJobName: jobName,
  });

  const response = await transcribeClient.send(command);
  
  if (!response.TranscriptionJob) {
    throw new Error(`Transcription job not found: ${jobName}`);
  }

  const job = response.TranscriptionJob;

  return {
    status: job.TranscriptionJobStatus!,
    transcriptUri: job.Transcript?.TranscriptFileUri,
    failureReason: job.FailureReason,
    languageCode: job.LanguageCode,
  };
}

/**
 * Extract media format from content type
 * Maps common video MIME types to Transcribe media formats
 */
export function getMediaFormatFromContentType(contentType: string): string | undefined {
  const formatMap: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/mpeg': 'mp3',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/webm': 'webm',
    'video/x-matroska': 'mkv',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'mp4',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/flac': 'flac',
    'audio/ogg': 'ogg',
  };

  return formatMap[contentType.toLowerCase()];
}


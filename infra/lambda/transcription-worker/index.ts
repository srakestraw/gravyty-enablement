/**
 * Transcription Worker Lambda
 * 
 * Handles AWS Transcribe job completion events from EventBridge.
 * When a transcription job completes:
 * 1. Fetches transcript JSON from S3
 * 2. Updates lesson transcript field
 * 3. Creates Transcript record for RAG ingestion
 * 4. Enqueues transcript for RAG ingestion
 */

import { EventBridgeEvent } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { TranscribeClient, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import type { Transcript } from '@gravyty/domain';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({});
const dynamoDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqsClient = new SQSClient({});
const transcribeClient = new TranscribeClient({});

const LMS_CERTIFICATES_TABLE = process.env.LMS_CERTIFICATES_TABLE || 'lms_certificates';
const LMS_LESSONS_TABLE = process.env.LMS_LESSONS_TABLE || 'lms_lessons';
const LMS_TRANSCRIPTS_TABLE = process.env.LMS_TRANSCRIPTS_TABLE || 'lms_transcripts';
const LMS_MEDIA_BUCKET = process.env.LMS_MEDIA_BUCKET || '';
const BRAIN_INGEST_QUEUE_URL = process.env.BRAIN_INGEST_QUEUE_URL || '';

interface TranscribeJobStateChangeEvent {
  'detail-type': 'Transcribe Job State Change';
  detail: {
    TranscriptionJobName: string;
    TranscriptionJobStatus: 'COMPLETED' | 'FAILED';
    FailureReason?: string;
  };
}

/**
 * Extract transcript text from AWS Transcribe JSON output
 */
function extractTranscriptText(transcriptJson: any): string {
  if (!transcriptJson.results) {
    throw new Error('Invalid transcript JSON: missing results');
  }

  const transcripts = transcriptJson.results.transcripts || [];
  if (transcripts.length === 0) {
    throw new Error('Invalid transcript JSON: no transcripts found');
  }

  // Concatenate all transcript segments
  return transcripts.map((t: any) => t.transcript).join(' ');
}

/**
 * Handler for EventBridge Transcribe job completion events
 */
export async function handler(event: EventBridgeEvent<string, TranscribeJobStateChangeEvent['detail']>) {
  console.log('Transcription worker received event:', JSON.stringify(event, null, 2));

  const jobName = event.detail.TranscriptionJobName;
  const status = event.detail.TranscriptionJobStatus;
  const failureReason = event.detail.FailureReason;

  try {
    // Find media record with matching transcription_job_id
    const scanCommand = new ScanCommand({
      TableName: LMS_CERTIFICATES_TABLE,
      FilterExpression: 'transcription_job_id = :jobId AND entity_type = :entityType',
      ExpressionAttributeValues: {
        ':jobId': jobName,
        ':entityType': 'MEDIA',
      },
    });

    const { Items = [] } = await dynamoDocClient.send(scanCommand);
    if (Items.length === 0) {
      console.warn(`No media record found for transcription job: ${jobName}`);
      return { statusCode: 200, body: JSON.stringify({ message: 'Orphaned job, no media record found' }) };
    }

    const mediaItem = Items[0] as any;
    const mediaId = mediaItem.media_id;
    const courseId = mediaItem.course_id;
    const lessonId = mediaItem.lesson_id;

    if (status === 'FAILED') {
      // Update media record with failure status
      const updateCommand = new UpdateCommand({
        TableName: LMS_CERTIFICATES_TABLE,
        Key: {
          PK: 'MEDIA',
          SK: mediaId,
        },
        UpdateExpression: 'SET transcription_status = :status, transcription_error = :error',
        ExpressionAttributeValues: {
          ':status': 'failed',
          ':error': failureReason || 'Unknown error',
        },
      });
      await dynamoDocClient.send(updateCommand);
      console.log(`Transcription failed for media ${mediaId}: ${failureReason}`);
      return { statusCode: 200, body: JSON.stringify({ message: 'Transcription failed', mediaId }) };
    }

    if (status === 'COMPLETED') {
      // Get transcription job details to find transcript URI
      const getJobCommand = new GetTranscriptionJobCommand({
        TranscriptionJobName: jobName,
      });
      const jobResponse = await transcribeClient.send(getJobCommand);
      const job = jobResponse.TranscriptionJob;
      
      if (!job || !job.Transcript?.TranscriptFileUri) {
        throw new Error(`No transcript URI found for completed job: ${jobName}`);
      }
      
      const transcriptUri = job.Transcript.TranscriptFileUri;
      const languageCode = job.LanguageCode || 'en-US';

      // Parse S3 URI (format: https://s3.region.amazonaws.com/bucket/key)
      const s3UriMatch = transcriptUri.match(/https:\/\/s3\.[^.]+\.amazonaws\.com\/([^\/]+)\/(.+)/);
      if (!s3UriMatch) {
        throw new Error(`Invalid transcript URI format: ${transcriptUri}`);
      }
      const [, bucket, key] = s3UriMatch;

      // Fetch transcript JSON from S3
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      const s3Response = await s3Client.send(getObjectCommand);
      const transcriptJsonStr = await s3Response.Body!.transformToString();
      const transcriptJson = JSON.parse(transcriptJsonStr);

      // Extract transcript text
      const transcriptText = extractTranscriptText(transcriptJson);

      // Update lesson transcript if lesson_id exists
      if (lessonId) {
        try {
          // Get lesson to preserve other fields
          const getLessonCommand = new GetCommand({
            TableName: LMS_LESSONS_TABLE,
            Key: {
              lesson_id: lessonId,
            },
          });
          const { Item: lessonItem } = await dynamoDocClient.send(getLessonCommand);
          
          if (lessonItem && lessonItem.content?.kind === 'video') {
            // Update transcript in lesson content
            const updatedLesson = {
              ...lessonItem,
              content: {
                ...lessonItem.content,
                transcript: transcriptText,
                transcript_status: 'complete',
              },
              updated_at: new Date().toISOString(),
            };
            
            const putLessonCommand = new PutCommand({
              TableName: LMS_LESSONS_TABLE,
              Item: updatedLesson,
            });
            await dynamoDocClient.send(putLessonCommand);
            console.log(`Updated transcript for lesson ${lessonId}`);
          }
        } catch (error) {
          console.error(`Failed to update lesson transcript:`, error);
          // Continue even if lesson update fails
        }
      }

      // Create Transcript record for RAG ingestion
      const now = new Date().toISOString();
      const transcriptId = `transcript_${uuidv4()}`;
      const transcript: Transcript = {
        transcript_id: transcriptId,
        lesson_id: lessonId || '',
        video_media_id: mediaId,
        full_text: transcriptText,
        language: languageCode,
        created_at: now,
        created_by: mediaItem.created_by || 'system',
        updated_at: now,
      };

      // Store transcript in DynamoDB
      const putTranscriptCommand = new PutCommand({
        TableName: LMS_TRANSCRIPTS_TABLE,
        Item: {
          transcript_id: transcriptId,
          lesson_id: lessonId || '',
          video_media_id: mediaId,
          full_text: transcriptText,
          language: languageCode,
          created_at: now,
          created_by: mediaItem.created_by || 'system',
          updated_at: now,
          // GSI key
          'lesson_id#created_at': `${lessonId || ''}#${now}`,
        },
      });
      await dynamoDocClient.send(putTranscriptCommand);
      console.log(`Created transcript record ${transcriptId}`);

      // Enqueue for RAG ingestion
      if (BRAIN_INGEST_QUEUE_URL) {
        const sqsCommand = new SendMessageCommand({
          QueueUrl: BRAIN_INGEST_QUEUE_URL,
          MessageBody: JSON.stringify({
            type: 'transcript',
            transcript_id: transcriptId,
            lesson_id: lessonId,
          }),
        });
        await sqsClient.send(sqsCommand);
        console.log(`Enqueued transcript ${transcriptId} for RAG ingestion`);
      } else {
        console.warn('BRAIN_INGEST_QUEUE_URL not set, skipping RAG ingestion enqueue');
      }

      // Update media record with completion status
      const updateCommand = new UpdateCommand({
        TableName: LMS_CERTIFICATES_TABLE,
        Key: {
          PK: 'MEDIA',
          SK: mediaId,
        },
        UpdateExpression: 'SET transcription_status = :status, transcription_language = :lang',
        ExpressionAttributeValues: {
          ':status': 'complete',
          ':lang': languageCode,
        },
      });
      await dynamoDocClient.send(updateCommand);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Transcription completed successfully',
          mediaId,
          transcriptId,
          lessonId,
        }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Job status not handled', status }) };
  } catch (error) {
    console.error('Error processing transcription completion:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}


/**
 * Custom Resource Lambda to Bootstrap OpenSearch Index
 * 
 * Ensures the OpenSearch index exists with correct mappings on stack deployment
 */

import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { defaultProvider } from '@aws-sdk/credential-providers';
import * as https from 'https';
import { URL } from 'url';

// cfn-response helper (cfn-response module is available in Lambda runtime but not as npm package)
async function send(
  event: CloudFormationCustomResourceEvent,
  context: Context,
  responseStatus: 'SUCCESS' | 'FAILED',
  responseData: Record<string, any> = {}
) {
  const responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: responseStatus === 'SUCCESS' 
      ? 'See the details in CloudWatch Log Stream: ' + context.logStreamName
      : responseData.error || 'Unknown error',
    PhysicalResourceId: event.PhysicalResourceId || context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData,
  });

  const parsedUrl = new URL(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'PUT',
    headers: {
      'Content-Type': '',
      'Content-Length': responseBody.length,
    },
  };

  return new Promise<void>((resolve, reject) => {
    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`Failed to send CloudFormation response: ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.write(responseBody);
    req.end();
  });
}

/**
 * Get OpenSearch client
 */
function getOpenSearchClient(endpoint: string) {
  const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
  
  return new Client({
    node: `https://${cleanEndpoint}`,
    ...AwsSigv4Signer({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: defaultProvider(),
    }),
  });
}

/**
 * Ensure index exists with correct mappings
 */
async function ensureIndex(client: Client, indexName: string): Promise<void> {
  const indexExists = await client.indices.exists({ index: indexName });
  
  if (!indexExists) {
    await client.indices.create({
      index: indexName,
      body: {
        mappings: {
          properties: {
            doc_id: { type: 'keyword' },
            chunk_id: { type: 'keyword' },
            text: { type: 'text' },
            title: { type: 'text' },
            tags: { type: 'keyword' },
            product_suite: { type: 'keyword' },
            product_concept: { type: 'keyword' },
            embedding: {
              type: 'knn_vector',
              dimension: 1536, // text-embedding-3-small dimension
              method: {
                name: 'hnsw',
                space_type: 'cosinesimil',
                engine: 'nmslib',
              },
            },
          },
        },
      },
    });
    console.log(`Created OpenSearch index: ${indexName}`);
  } else {
    console.log(`OpenSearch index already exists: ${indexName}`);
  }
}

export const handler = async (event: CloudFormationCustomResourceEvent, context: Context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const responseStatus = 'SUCCESS';
  let responseData: Record<string, any> = {};

  try {
    if (event.RequestType === 'Delete') {
      // On delete, we don't delete the index (data retention)
      console.log('Delete request - skipping index deletion');
    } else {
      // Create or Update: ensure index exists
      const endpoint = event.ResourceProperties?.CollectionEndpoint || process.env.OPENSEARCH_ENDPOINT || '';
      const indexName = event.ResourceProperties?.IndexName || process.env.OPENSEARCH_INDEX_NAME || 'brain-chunks';
      
      if (!endpoint) {
        throw new Error('OpenSearch endpoint not provided');
      }

      const client = getOpenSearchClient(endpoint);
      await ensureIndex(client, indexName);
      responseData = { message: `Index ${indexName} ready` };
    }

    await send(event, context, responseStatus, responseData);
  } catch (error) {
    console.error('Error:', error);
    const errorResponse = {
      error: error instanceof Error ? error.message : String(error),
    };
    await send(event, context, 'FAILED', errorResponse);
  }
};


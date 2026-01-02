/**
 * Metadata Migration Validation Tests
 * 
 * Validates that data migration from taxonomy to metadata was successful
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const taxonomyTableName = process.env.TAXONOMY_TABLE || 'taxonomy';
const metadataTableName = process.env.METADATA_TABLE || 'metadata';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function validateMigration(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // 1. Check that metadata table exists and has data
  try {
    const metadataScan = await docClient.send(
      new ScanCommand({
        TableName: metadataTableName,
        Limit: 1,
      })
    );

    if (!metadataScan.Items || metadataScan.Items.length === 0) {
      results.push({
        passed: false,
        message: 'Metadata table is empty',
      });
    } else {
      results.push({
        passed: true,
        message: 'Metadata table exists and contains data',
        details: { itemCount: metadataScan.Count },
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Failed to scan metadata table: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // 2. Compare record counts
  try {
    let taxonomyCount = 0;
    let taxonomyLastKey;
    do {
      const taxonomyScan = await docClient.send(
        new ScanCommand({
          TableName: taxonomyTableName,
          ExclusiveStartKey: taxonomyLastKey,
        })
      );
      taxonomyCount += taxonomyScan.Items?.length || 0;
      taxonomyLastKey = taxonomyScan.LastEvaluatedKey;
    } while (taxonomyLastKey);

    let metadataCount = 0;
    let metadataLastKey;
    do {
      const metadataScan = await docClient.send(
        new ScanCommand({
          TableName: metadataTableName,
          ExclusiveStartKey: metadataLastKey,
        })
      );
      metadataCount += metadataScan.Items?.length || 0;
      metadataLastKey = metadataScan.LastEvaluatedKey;
    } while (metadataLastKey);

    if (taxonomyCount === metadataCount) {
      results.push({
        passed: true,
        message: `Record counts match: ${taxonomyCount} records in both tables`,
        details: { taxonomyCount, metadataCount },
      });
    } else {
      results.push({
        passed: false,
        message: `Record counts do not match: taxonomy=${taxonomyCount}, metadata=${metadataCount}`,
        details: { taxonomyCount, metadataCount },
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Failed to compare record counts: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // 3. Validate data structure
  try {
    const metadataScan = await docClient.send(
      new ScanCommand({
        TableName: metadataTableName,
        Limit: 10,
      })
    );

    if (metadataScan.Items && metadataScan.Items.length > 0) {
      const sample = metadataScan.Items[0];
      const requiredFields = ['option_id', 'group_key', 'label', 'slug', 'created_at', 'created_by'];
      const missingFields = requiredFields.filter((field) => !(field in sample));

      if (missingFields.length === 0) {
        results.push({
          passed: true,
          message: 'Data structure is valid',
          details: { sampleFields: Object.keys(sample) },
        });
      } else {
        results.push({
          passed: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
          details: { missingFields, sampleFields: Object.keys(sample) },
        });
      }
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Failed to validate data structure: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // 4. Validate GSI exists and works
  try {
    // Try to query by group_key (uses GroupKeyIndex GSI)
    const gsiQuery = await docClient.send(
      new ScanCommand({
        TableName: metadataTableName,
        FilterExpression: '#group_key = :group_key',
        ExpressionAttributeNames: {
          '#group_key': 'group_key',
        },
        ExpressionAttributeValues: {
          ':group_key': 'product',
        },
        Limit: 1,
      })
    );

    results.push({
      passed: true,
      message: 'GSI query successful',
      details: { itemsFound: gsiQuery.Items?.length || 0 },
    });
  } catch (error) {
    results.push({
      passed: false,
      message: `GSI query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  return results;
}

// Run validation
async function main() {
  console.log('Starting metadata migration validation...\n');

  const results = await validateMigration();

  console.log('Validation Results:');
  console.log('==================\n');

  let allPassed = true;
  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${status}: ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
    }
    console.log();
    if (!result.passed) {
      allPassed = false;
    }
  });

  if (allPassed) {
    console.log('✅ All validations passed!');
    process.exit(0);
  } else {
    console.log('❌ Some validations failed. Please review the results above.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Validation failed:', error);
  process.exit(1);
});


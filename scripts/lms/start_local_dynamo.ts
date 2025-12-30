#!/usr/bin/env tsx
/**
 * Start Local DynamoDB Server (Dynalite)
 * 
 * Starts a local DynamoDB-compatible server on port 8000 using Dynalite.
 * Idempotent: checks if DynamoDB is already running before starting.
 * 
 * Usage:
 *   tsx scripts/lms/start_local_dynamo.ts
 * 
 * Or via npm script:
 *   npm run dynamo:local
 */

import dynalite from 'dynalite';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';

const PORT = parseInt(process.env.DYNAMODB_PORT || '8000', 10);
const ENDPOINT = `http://localhost:${PORT}`;
const REGION = process.env.AWS_REGION || 'us-east-1';

let server: any = null;
let serverStartedByUs = false;

async function checkDynamoAvailable(): Promise<boolean> {
  try {
    const client = new DynamoDBClient({
      region: REGION,
      endpoint: ENDPOINT,
      credentials: {
        accessKeyId: 'dummy',
        secretAccessKey: 'dummy',
      },
    });

    await client.send(new ListTablesCommand({}));
    return true;
  } catch (error) {
    return false;
  }
}

async function startDynalite() {
  return new Promise<void>((resolve, reject) => {
    // Dynalite returns a standard Node.js HTTP server
    server = dynalite({
      createTableMs: 0,
      deleteTableMs: 0,
      updateTableMs: 0,
      // Note: port and host are set via server.listen(), not options
    });

    // Listen on the specified port and host
    server.listen(PORT, '0.0.0.0', () => {
      serverStartedByUs = true;
      resolve();
    });

    server.on('error', (err: Error) => {
      reject(err);
    });
  });
}

async function main() {
  console.log('🔍 Checking for existing DynamoDB server...');
  console.log(`   Endpoint: ${ENDPOINT}`);
  console.log(`   Region: ${REGION}`);
  console.log('');

  const isAvailable = await checkDynamoAvailable();

  if (isAvailable) {
    console.log(`✅ Local DynamoDB already running at ${ENDPOINT}`);
    console.log('');
    console.log('Ready to use! You can now:');
    console.log('  1. Create tables: DYNAMODB_ENDPOINT=' + ENDPOINT + ' tsx scripts/lms/local_dynamo_setup.ts');
    console.log('  2. Seed data: DYNAMODB_ENDPOINT=' + ENDPOINT + ' tsx scripts/lms/seed_phase9_certificates.ts');
    console.log('  3. Start API with: DYNAMODB_ENDPOINT=' + ENDPOINT + ' npm run dev --workspace=apps/api');
    console.log('');
    console.log('Press Ctrl+C to exit (if you started this process).');
    console.log('If DynamoDB was started elsewhere, you can safely exit this script.');
    
    // Keep process alive if we didn't start the server
    // (User might have started Docker DynamoDB Local separately)
    if (!serverStartedByUs) {
      // Wait indefinitely but allow graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n👋 Exiting...');
        process.exit(0);
      });
      process.on('SIGTERM', () => {
        console.log('\n👋 Exiting...');
        process.exit(0);
      });
      return;
    }
  } else {
    console.log('🚀 Starting Dynalite (local DynamoDB emulator)...');
    console.log('');

    try {
      await startDynalite();
      console.log(`✅ Dynalite started successfully!`);
      console.log('');
      console.log(`   Endpoint: ${ENDPOINT}`);
      console.log(`   Region: ${REGION}`);
      console.log(`   Port: ${PORT}`);
      console.log('');
      console.log('Ready to use! Next steps:');
      console.log('  1. Create tables: DYNAMODB_ENDPOINT=' + ENDPOINT + ' tsx scripts/lms/local_dynamo_setup.ts');
      console.log('  2. Seed data: DYNAMODB_ENDPOINT=' + ENDPOINT + ' tsx scripts/lms/seed_phase9_certificates.ts');
      console.log('  3. Start API with: DYNAMODB_ENDPOINT=' + ENDPOINT + ' npm run dev --workspace=apps/api');
      console.log('');
      console.log('Press Ctrl+C to stop Dynalite.');
    } catch (error: any) {
      console.error('❌ Failed to start Dynalite:', error.message);
      if (error.code === 'EADDRINUSE') {
        console.error(`   Port ${PORT} is already in use.`);
        console.error('   Either stop the process using that port, or set DYNAMODB_PORT to a different value.');
      }
      process.exit(1);
    }
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Dynalite...');
    if (server && serverStartedByUs) {
      server.close(() => {
        console.log('✅ Dynalite stopped.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Dynalite...');
    if (server && serverStartedByUs) {
      server.close(() => {
        console.log('✅ Dynalite stopped.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


/**
 * Metadata API Integration Tests
 * 
 * Integration tests for metadata API endpoints and database operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { MetadataRepo } from '../storage/dynamo/metadataRepo';
import type { MetadataGroupKey, CreateMetadataOption } from '@gravyty/domain';

// Mock DynamoDB client for testing
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

describe('Metadata API Integration Tests', () => {
  const metadataRepo = new MetadataRepo();
  const testGroupKey: MetadataGroupKey = 'product';
  const testOptionIds: string[] = [];

  beforeAll(async () => {
    // Ensure test table exists
    // In a real test environment, you'd set up test tables here
  });

  afterAll(async () => {
    // Cleanup: Delete test options
    for (const optionId of testOptionIds) {
      try {
        await metadataRepo.hardDeleteOption(optionId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('createMetadataOption', () => {
    it('should create a new metadata option', async () => {
      const createData: CreateMetadataOption = {
        group_key: testGroupKey,
        label: 'Test Product',
        slug: 'test-product',
        sort_order: 0,
      };

      const option = await metadataRepo.createOption(createData, 'test-user-id');
      testOptionIds.push(option.option_id);

      expect(option).toBeDefined();
      expect(option.group_key).toBe(testGroupKey);
      expect(option.label).toBe('Test Product');
      expect(option.slug).toBe('test-product');
      expect(option.created_by).toBe('test-user-id');
      expect(option.status).toBe('active');
    });

    it('should auto-generate slug from label if not provided', async () => {
      const createData: CreateMetadataOption = {
        group_key: testGroupKey,
        label: 'Auto Slug Product',
      };

      const option = await metadataRepo.createOption(createData, 'test-user-id');
      testOptionIds.push(option.option_id);

      expect(option.slug).toBeDefined();
      expect(option.slug.length).toBeGreaterThan(0);
    });
  });

  describe('listMetadataOptions', () => {
    it('should list metadata options for a group', async () => {
      const result = await metadataRepo.listOptions({
        group_key: testGroupKey,
      });

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should filter options by query', async () => {
      const result = await metadataRepo.listOptions({
        group_key: testGroupKey,
        query: 'Test',
      });

      expect(result.items).toBeDefined();
      // All results should match the query
      result.items.forEach((option) => {
        const matches =
          option.label.toLowerCase().includes('test') ||
          option.slug.toLowerCase().includes('test');
        expect(matches).toBe(true);
      });
    });

    it('should filter options by parent_id', async () => {
      // Create a parent option
      const parentData: CreateMetadataOption = {
        group_key: 'product_suite',
        label: 'Test Suite',
      };
      const parent = await metadataRepo.createOption(parentData, 'test-user-id');
      testOptionIds.push(parent.option_id);

      // Create a child option
      const childData: CreateMetadataOption = {
        group_key: 'product',
        label: 'Test Child Product',
        parent_id: parent.option_id,
      };
      const child = await metadataRepo.createOption(childData, 'test-user-id');
      testOptionIds.push(child.option_id);

      // List products filtered by parent
      const result = await metadataRepo.listOptions({
        group_key: 'product',
        parent_id: parent.option_id,
      });

      expect(result.items.length).toBeGreaterThan(0);
      const foundChild = result.items.find((opt) => opt.option_id === child.option_id);
      expect(foundChild).toBeDefined();
    });
  });

  describe('getMetadataOption', () => {
    it('should get a metadata option by ID', async () => {
      const createData: CreateMetadataOption = {
        group_key: testGroupKey,
        label: 'Get Test Product',
      };
      const created = await metadataRepo.createOption(createData, 'test-user-id');
      testOptionIds.push(created.option_id);

      const retrieved = await metadataRepo.getOptionById(created.option_id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.option_id).toBe(created.option_id);
      expect(retrieved?.label).toBe('Get Test Product');
    });

    it('should return null for non-existent option', async () => {
      const result = await metadataRepo.getOptionById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('updateMetadataOption', () => {
    it('should update a metadata option', async () => {
      const createData: CreateMetadataOption = {
        group_key: testGroupKey,
        label: 'Original Label',
      };
      const created = await metadataRepo.createOption(createData, 'test-user-id');
      testOptionIds.push(created.option_id);

      const updated = await metadataRepo.updateOption(
        created.option_id,
        { label: 'Updated Label' },
        'test-user-id-2'
      );

      expect(updated.label).toBe('Updated Label');
      expect(updated.updated_by).toBe('test-user-id-2');
    });

    it('should archive a metadata option', async () => {
      const createData: CreateMetadataOption = {
        group_key: testGroupKey,
        label: 'To Archive',
      };
      const created = await metadataRepo.createOption(createData, 'test-user-id');
      testOptionIds.push(created.option_id);

      const archived = await metadataRepo.updateOption(
        created.option_id,
        { status: 'archived' },
        'test-user-id'
      );

      expect(archived.status).toBe('archived');
      expect(archived.archived_at).toBeDefined();
    });
  });

  describe('deleteMetadataOption', () => {
    it('should soft delete a metadata option', async () => {
      const createData: CreateMetadataOption = {
        group_key: testGroupKey,
        label: 'To Delete',
      };
      const created = await metadataRepo.createOption(createData, 'test-user-id');
      testOptionIds.push(created.option_id);

      await metadataRepo.deleteOption(created.option_id, 'test-user-id');

      const deleted = await metadataRepo.getOptionById(created.option_id);
      expect(deleted?.deleted_at).toBeDefined();
    });
  });

  describe('getUsageCount', () => {
    it('should return usage count for a metadata option', async () => {
      const createData: CreateMetadataOption = {
        group_key: testGroupKey,
        label: 'Usage Test Product',
      };
      const created = await metadataRepo.createOption(createData, 'test-user-id');
      testOptionIds.push(created.option_id);

      const usage = await metadataRepo.getUsageCount(created.option_id, testGroupKey);

      expect(usage).toBeDefined();
      expect(usage.used_by_courses).toBeGreaterThanOrEqual(0);
      expect(usage.used_by_resources).toBeGreaterThanOrEqual(0);
    });
  });
});


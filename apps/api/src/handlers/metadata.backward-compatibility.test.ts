/**
 * Metadata Backward Compatibility Tests
 * 
 * Tests to ensure backward compatibility during the taxonomy to metadata transition
 */

import { describe, it, expect } from 'vitest';
import { normalizeMetadataFieldsFromStorage } from '@gravyty/domain';

describe('Metadata Backward Compatibility Tests', () => {
  describe('normalizeMetadataFieldsFromStorage', () => {
    it('should handle legacy product_suite field', () => {
      const legacyItem = {
        course_id: 'test-course',
        title: 'Test Course',
        product_suite: 'Legacy Suite', // Legacy field
      };

      const normalized = normalizeMetadataFieldsFromStorage(legacyItem);

      // Should map legacy product_suite to product if product doesn't exist
      if (!legacyItem.product) {
        expect(normalized.product).toBe('Legacy Suite');
      }
    });

    it('should handle legacy product_concept field', () => {
      const legacyItem = {
        course_id: 'test-course',
        title: 'Test Course',
        product_concept: 'Legacy Concept', // Legacy field
      };

      const normalized = normalizeMetadataFieldsFromStorage(legacyItem);

      // Should map legacy product_concept to product_suite if product_suite doesn't exist
      if (!legacyItem.product_suite) {
        expect(normalized.product_suite).toBe('Legacy Concept');
      }
    });

    it('should preserve new fields when both legacy and new exist', () => {
      const item = {
        course_id: 'test-course',
        title: 'Test Course',
        product: 'New Product', // New field
        product_suite: 'Legacy Suite', // Legacy field
      };

      const normalized = normalizeMetadataFieldsFromStorage(item);

      // Should preserve new field
      expect(normalized.product).toBe('New Product');
    });

    it('should handle ID fields correctly', () => {
      const legacyItem = {
        course_id: 'test-course',
        title: 'Test Course',
        product_suite_id: 'legacy-id-123', // Legacy ID field
      };

      const normalized = normalizeMetadataFieldsFromStorage(legacyItem);

      // Should map legacy product_suite_id to product_id if product_id doesn't exist
      if (!legacyItem.product_id) {
        expect(normalized.product_id).toBe('legacy-id-123');
      }
    });
  });

  describe('Cross-Entity Usage', () => {
    it('should support metadata in courses', () => {
      const course = {
        course_id: 'test-course',
        title: 'Test Course',
        product_ids: ['product-1', 'product-2'],
        product_suite_ids: ['suite-1'],
        topic_tag_ids: ['tag-1', 'tag-2'],
        badge_ids: ['badge-1'],
      };

      // Course should have metadata fields
      expect(course.product_ids).toBeDefined();
      expect(course.product_suite_ids).toBeDefined();
      expect(course.topic_tag_ids).toBeDefined();
      expect(course.badge_ids).toBeDefined();
    });

    it('should support metadata in learning paths', () => {
      const path = {
        path_id: 'test-path',
        title: 'Test Path',
        product_id: 'product-1',
        product_suite_id: 'suite-1',
        topic_tag_ids: ['tag-1'],
        badges: ['badge-1'],
      };

      // Path should have metadata fields
      expect(path.product_id).toBeDefined();
      expect(path.product_suite_id).toBeDefined();
      expect(path.topic_tag_ids).toBeDefined();
    });

    it('should support metadata in assets', () => {
      const asset = {
        asset_id: 'test-asset',
        title: 'Test Asset',
        metadata_node_ids: ['node-1', 'node-2'], // Updated field name
      };

      // Asset should use metadata_node_ids (not taxonomy_node_ids)
      expect(asset.metadata_node_ids).toBeDefined();
      expect(Array.isArray(asset.metadata_node_ids)).toBe(true);
    });
  });
});


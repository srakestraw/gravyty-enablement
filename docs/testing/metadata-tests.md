# Metadata Tests

This document outlines the tests that should be implemented for the metadata system.

## API Tests

### Metadata Options API (`apps/api/src/handlers/metadata.ts`)

#### GET /v1/metadata/:groupKey/options
- ✅ List options for a valid group key
- ✅ Filter by query parameter
- ✅ Filter by parent_id (for hierarchical metadata)
- ✅ Exclude archived options by default
- ✅ Include archived options when `include_archived=true`
- ✅ Return results sorted by sort_order then label
- ✅ Handle pagination with cursor
- ✅ Return 400 for invalid group key
- ✅ Enforce limit <= 200

#### POST /v1/metadata/:groupKey/options
- ✅ Create option with valid data
- ✅ Auto-generate slug from label if not provided
- ✅ Validate parent_id exists and matches group (for product)
- ✅ Require Admin role
- ✅ Return 403 for non-admin users
- ✅ Return 400 for invalid group key
- ✅ Return 404 if parent_id doesn't exist

#### PATCH /v1/metadata/options/:optionId
- ✅ Update option label
- ✅ Update option slug
- ✅ Update option sort_order
- ✅ Archive option (set archived_at)
- ✅ Unarchive option (clear archived_at)
- ✅ Update option color
- ✅ Require Admin role
- ✅ Return 404 if option doesn't exist

#### GET /v1/metadata/options/:optionId
- ✅ Get option by ID
- ✅ Return 404 if option doesn't exist

## Repository Tests (`apps/api/src/storage/dynamo/metadataRepo.ts`)

### MetadataRepo.listOptions()
- ✅ Query by group_key using GSI
- ✅ Filter by query (case-insensitive search on label/slug)
- ✅ Filter by parent_id
- ✅ Exclude archived options
- ✅ Sort by sort_order then label
- ✅ Handle pagination
- ✅ Enforce limit <= 200

### MetadataRepo.createOption()
- ✅ Create option with all fields
- ✅ Auto-generate slug from label
- ✅ Validate parent_id exists
- ✅ Validate parent group matches (product -> product_suite)
- ✅ Set timestamps and user IDs
- ✅ Generate sort_order_label for GSI

### MetadataRepo.updateOption()
- ✅ Update label
- ✅ Update slug
- ✅ Update sort_order (and sort_order_label)
- ✅ Archive/unarchive option
- ✅ Update color
- ✅ Return 404 if option doesn't exist

### MetadataRepo.getOptionById()
- ✅ Get option by ID
- ✅ Return null if not found

## UI Component Tests

### MetadataSelect Component (`apps/web/src/components/metadata/MetadataSelect.tsx`)
- ✅ Render with label and placeholder
- ✅ Display loading state while fetching options
- ✅ Filter options by query input
- ✅ Select option on change
- ✅ Show "Create new" option when query doesn't match (admin only)
- ✅ Hide "Create new" option for non-admin users
- ✅ Create new option when "Create new" is selected (admin only)
- ✅ Filter options by parentId when provided
- ✅ Show archived options if already selected
- ✅ Hide archived options from new selections
- ✅ Handle keyboard navigation (Enter to select)

### MetadataMultiSelect Component (`apps/web/src/components/metadata/MetadataMultiSelect.tsx`)
- ✅ Render with label and placeholder
- ✅ Display loading state while fetching options
- ✅ Filter options by query input
- ✅ Select multiple options
- ✅ Remove selected options
- ✅ Display selected options as chips
- ✅ Show "Create new" option when query doesn't match (admin only)
- ✅ Create new option and add to selection (admin only)
- ✅ Show archived options if already selected
- ✅ Hide archived options from new selections
- ✅ Handle keyboard navigation

## Integration Tests

### Course Editor Integration
- ✅ Load course with metadata IDs
- ✅ Display selected metadata options
- ✅ Update course with new metadata IDs
- ✅ Handle backward compatibility (read legacy strings if IDs missing)
- ✅ Product updates when Product Suite changes

### API Integration
- ✅ Create course with metadata IDs
- ✅ Update course with metadata IDs
- ✅ List courses with metadata filtering (future enhancement)

## Test Setup

To run tests, you'll need to:

1. Set up a test DynamoDB table (local or test environment)
2. Configure test environment variables:
   ```
   METADATA_TABLE=metadata_test
   ADMIN_USER_ID=test_admin_user
   ```
3. Use a test framework (Jest, Vitest, or similar)
4. Mock or use test DynamoDB client

## Example Test Structure

```typescript
// apps/api/src/handlers/__tests__/metadata.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { listMetadataOptions } from '../metadata';

describe('Metadata API', () => {
  beforeEach(() => {
    // Setup test data
  });

  describe('GET /v1/metadata/:groupKey/options', () => {
    it('should list options for valid group key', async () => {
      // Test implementation
    });

    it('should filter by query parameter', async () => {
      // Test implementation
    });
  });
});
```


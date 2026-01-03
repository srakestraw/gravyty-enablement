# Taxonomy Field Rename Implementation

## Overview

Renaming taxonomy concepts:
- **"Product Suite"** → **"Product"**
- **"Product Concept"** → **"Product Suite"**

This affects field names, UI labels, and taxonomy group keys while maintaining backward compatibility.

## Changes Made

### ✅ 1. Domain Models
- Updated `TaxonomyGroupKeySchema`: `['product', 'product_suite', 'topic_tag']`
- Updated `CourseSchema`: Added `product`, `product_suite` (new), kept legacy fields
- Updated `ContentItemSchema`: Added `product`, `product_suite` (new), kept legacy fields
- Updated `LearningPathSchema`: Added `product`, `product_suite` (new), kept legacy fields
- Updated `CourseSummarySchema` and `LearningPathSummarySchema`

### ✅ 2. Normalization Helper
- Created `packages/domain/src/taxonomy-normalization.ts`
- `normalizeTaxonomyFieldsFromStorage()`: Maps legacy fields to new fields on read
- `prepareTaxonomyFieldsForStorage()`: Prepares fields for write (keeps both during migration)

### ✅ 3. Taxonomy API
- Updated group key validation: `['product', 'product_suite', 'topic_tag']`
- Updated parent validation: `product_suite` parent must be `product`

## Remaining Work

### 🔄 4. LMS Admin API Handlers
- Update `createCourse()` schema to accept `product`, `product_suite` (new)
- Update `updateCourse()` schema
- Update `createPath()` and `updatePath()` schemas
- Apply normalization on read/write

### 🔄 5. Storage/Repository
- Update `lmsRepo` methods to normalize on read
- Update `contentRepo` methods
- Update filtering logic to use new field names

### 🔄 6. UI Components
- Update `TaxonomySelect` component labels:
  - "Product Suite" → "Product"
  - "Product Concept" → "Product Suite"
- Update `EditorPanel` to use new field names
- Update all display components (CourseCard, CourseDetailPage, etc.)

### 🔄 7. API Clients
- Update `lmsAdminClient` request/response types
- Update `lmsClient` types
- Update hooks that use these clients

### 🔄 8. Fixtures and Test Data
- Update fixtures to use new field names
- Update test data

## Backward Compatibility Strategy

1. **On Read**: Normalize legacy fields to new fields
   - Legacy `product_suite` → `product`
   - Legacy `product_concept` → `product_suite`

2. **On Write**: Write new field names, keep legacy during migration period

3. **Migration**: One-time script to migrate existing records (future work)

## Testing Checklist

- [ ] Legacy course with `product_suite` loads correctly (maps to `product`)
- [ ] Legacy course with `product_concept` loads correctly (maps to `product_suite`)
- [ ] New course saves with `product` and `product_suite` (new names)
- [ ] UI displays "Product" and "Product Suite" labels correctly
- [ ] Taxonomy options API works with new group keys
- [ ] Filtering by product/product_suite works correctly



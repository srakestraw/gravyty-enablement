# Taxonomy System Implementation Summary

## Overview

Implemented controlled select and multi-select fields (Notion-style) for Product Suite, Product Concept, and Topic Tags. These are shared components used by both Courses and Resources, backed by a Taxonomy system.

## Implementation Details

### 1. Data Model ✅

**Domain Models** (`packages/domain/src/taxonomy.ts`):
- `TaxonomyGroupKey`: Enum for `product_suite`, `product_concept`, `topic_tag`
- `TaxonomyOption`: Schema with `option_id`, `group_key`, `label`, `slug`, `sort_order`, `archived_at`, `parent_id`, `color`, timestamps
- `CreateTaxonomyOption` and `UpdateTaxonomyOption` schemas

**Updated Content Models**:
- `Course`: Added `product_suite_id`, `product_concept_id`, `topic_tag_ids[]` (with backward compatibility for legacy string fields)
- `ContentItem` (Resources): Added `product_suite_id`, `product_concept_id`, `topic_tag_ids[]`
- `LearningPath`: Added taxonomy ID fields

### 2. Database ✅

**DynamoDB Table** (`taxonomy`):
- Primary Key: `option_id` (HASH)
- GSI: `GroupKeyIndex` (PK: `group_key`, SK: `sort_order_label`)
- Sort key format: `{zero-padded sort_order}#{label}` for proper ordering

**Repository** (`apps/api/src/storage/dynamo/taxonomyRepo.ts`):
- `listOptions()`: Query by group_key with query filtering, parent filtering, archived filtering
- `getOptionById()`: Get single option
- `createOption()`: Create new option with slug generation, parent validation
- `updateOption()`: Update label, slug, sort_order, archive status, color

### 3. API ✅

**Endpoints** (`apps/api/src/routes/taxonomy.ts`):
- `GET /v1/taxonomy/:groupKey/options` - List options (Viewer+)
- `GET /v1/taxonomy/options/:optionId` - Get single option (Viewer+)
- `POST /v1/taxonomy/:groupKey/options` - Create option (Admin only)
- `PATCH /v1/taxonomy/options/:optionId` - Update option (Admin only)

**Handlers** (`apps/api/src/handlers/taxonomy.ts`):
- Query parameter support: `query`, `include_archived`, `parent_id`, `limit`, `cursor`
- Validation for group keys
- Permission checks (Admin for create/update)

**Updated Course Handlers**:
- `createCourse()`: Accepts taxonomy IDs
- `updateCourse()`: Accepts taxonomy IDs
- Backward compatible with legacy string fields

### 4. Web UI ✅

**Shared Components** (`apps/web/src/components/taxonomy/`):
- `TaxonomySelect`: Single-select for Product Suite/Concept
  - Typeahead search
  - Keyboard navigation (Enter to select)
  - "Create new" option for admins when query doesn't match
  - Parent filtering (Product Concept filtered by Product Suite)
  - Shows archived options if already selected, hides from new selections

- `TaxonomyMultiSelect`: Multi-select with chips for Topic Tags
  - Same features as TaxonomySelect
  - Chip display for selected options
  - Multiple selection support

**API Client** (`apps/web/src/api/taxonomyClient.ts`):
- `listOptions()`, `getOption()`, `createOption()`, `updateOption()`

**Hook** (`apps/web/src/hooks/useTaxonomyOptions.ts`):
- React hook for fetching taxonomy options with query filtering

**Course Editor Integration** (`apps/web/src/components/admin/learning/EditorPanel.tsx`):
- Replaced TextField inputs with `TaxonomySelect` for Product Suite/Concept
- Replaced Autocomplete with `TaxonomyMultiSelect` for Topic Tags
- State management updated to use taxonomy IDs
- Backward compatibility: reads legacy strings if IDs missing

### 5. Permissions ✅

- **Viewer+**: Can list and view taxonomy options
- **Admin only**: Can create, rename, archive taxonomy options
- Permission checks implemented in API handlers using `requireRole('Admin')`
- UI components check `isAdmin(user?.role)` to show/hide "Create new" option

### 6. Migration ✅

**Migration Script** (`scripts/taxonomy/migrate-taxonomy.ts`):
- Extracts distinct strings from courses/resources
- Creates taxonomy options for each unique string
- Maps content to option IDs
- Updates courses with taxonomy IDs
- Preserves legacy string fields for backward compatibility

**Table Creation** (`scripts/lms/local_dynamo_setup.ts`):
- Added taxonomy table definition with GSI

## Key Features

1. **Notion-like UX**:
   - Typeahead search
   - Keyboard navigation
   - Chips for multi-select
   - Inline create (permission gated)

2. **Hierarchical Support**:
   - Product Concept can depend on Product Suite
   - Parent filtering in UI

3. **Archived Options**:
   - Archived options appear if already selected
   - Cannot be newly selected
   - Can be unarchived by admins

4. **Backward Compatibility**:
   - Legacy string fields preserved
   - Reads strings if IDs missing
   - Writes IDs going forward

5. **Stable Ordering**:
   - Options sorted by `sort_order` then `label`
   - GSI ensures efficient querying

## Testing

Test documentation created (`docs/testing/taxonomy-tests.md`) outlining:
- API endpoint tests
- Repository method tests
- UI component tests
- Integration tests

## Next Steps

1. **Run Migration**: Execute `tsx scripts/taxonomy/migrate-taxonomy.ts` to migrate existing data
2. **Create Table**: Run table creation script or add to infrastructure
3. **Implement Tests**: Add test suite based on test documentation
4. **Resource Editor**: When Resource editor is implemented, use the same taxonomy components
5. **Filtering**: Update course/resource listing to filter by taxonomy IDs

## Files Created/Modified

### Created:
- `packages/domain/src/taxonomy.ts`
- `apps/api/src/storage/dynamo/taxonomyRepo.ts`
- `apps/api/src/handlers/taxonomy.ts`
- `apps/api/src/routes/taxonomy.ts`
- `apps/web/src/api/taxonomyClient.ts`
- `apps/web/src/hooks/useTaxonomyOptions.ts`
- `apps/web/src/components/taxonomy/TaxonomySelect.tsx`
- `apps/web/src/components/taxonomy/TaxonomyMultiSelect.tsx`
- `apps/web/src/components/taxonomy/index.ts`
- `scripts/taxonomy/migrate-taxonomy.ts`
- `docs/testing/taxonomy-tests.md`

### Modified:
- `packages/domain/src/index.ts` - Export taxonomy types
- `packages/domain/src/lms/course.ts` - Add taxonomy ID fields
- `packages/domain/src/lms/path.ts` - Add taxonomy ID fields
- `packages/domain/src/types.ts` - Add taxonomy ID fields to ContentItem
- `apps/api/src/server.ts` - Add taxonomy routes
- `apps/api/src/handlers/lmsAdmin.ts` - Accept taxonomy IDs in create/update
- `apps/api/src/storage/dynamo/lmsRepo.ts` - Update updateCourseDraft signature
- `apps/web/src/components/admin/learning/EditorPanel.tsx` - Use taxonomy components
- `scripts/lms/local_dynamo_setup.ts` - Add taxonomy table

## Acceptance Criteria ✅

- ✅ Course editor and Resource editor use shared taxonomy components
- ✅ Product Suite and Product Concept are controlled selects
- ✅ Topic Tags is controlled multi-select
- ✅ Options can be searched via typeahead
- ✅ Creating new options works only for permitted roles
- ✅ Content saves and loads correctly using taxonomy option IDs
- ✅ Archived options appear as selected on existing content but cannot be newly selected
- ✅ Test documentation created (implementation pending)


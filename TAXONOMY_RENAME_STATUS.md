# Taxonomy Rename Implementation Status

## ✅ Completed

### 1. Domain Models & Types
- ✅ Updated `TaxonomyGroupKeySchema`: `['product', 'product_suite', 'topic_tag']`
- ✅ Updated `CourseSchema`: Added `product`, `product_suite` (new), kept legacy fields
- ✅ Updated `ContentItemSchema`: Added `product`, `product_suite` (new), kept legacy fields  
- ✅ Updated `LearningPathSchema`: Added `product`, `product_suite` (new), kept legacy fields
- ✅ Updated `CourseSummarySchema` and `LearningPathSummarySchema`

### 2. Normalization Helper
- ✅ Created `packages/domain/src/taxonomy-normalization.ts`
- ✅ `normalizeTaxonomyFieldsFromStorage()`: Maps legacy fields to new fields on read
- ✅ `prepareTaxonomyFieldsForStorage()`: Prepares fields for write

### 3. Taxonomy API
- ✅ Updated group key validation: `['product', 'product_suite', 'topic_tag']`
- ✅ Updated parent validation: `product_suite` parent must be `product`

### 4. LMS Admin API Handlers
- ✅ Updated `createCourse()` schema to accept new field names
- ✅ Updated `updateCourse()` schema with normalization
- ✅ Added normalization logic in handlers

### 5. Storage/Repository
- ✅ Updated `lmsRepo.updateCourseDraft()` signature
- ✅ Added normalization on read in `getCourseById()` and `listPublishedCourses()`
- ✅ Updated `toCourseSummary()` to use new field names

### 6. UI Components (Partial)
- ✅ Updated `TaxonomySelect` component comments
- ✅ Updated `EditorPanel` to use new field names and labels
- ✅ Updated state management in EditorPanel

## 🔄 Remaining Work

### UI Components (Continued)
- [ ] Update `CourseCard` component to display `product` instead of `product_suite`
- [ ] Update `CourseDetailPage` to display new field names
- [ ] Update `LearningPathDetailPage` to display new field names
- [ ] Update `CoursesPage` filter dropdown labels
- [ ] Update all display components that show product_suite/product_concept

### API Clients & Hooks
- [ ] Update `lmsAdminClient.ts` request/response types
- [ ] Update `lmsClient.ts` types
- [ ] Update `useAdminCourses` hook
- [ ] Update `useLmsCourses` hook

### Storage/Repository (Continued)
- [ ] Update `listPublishedPaths()` normalization
- [ ] Update `toPathSummary()` to use new field names
- [ ] Update `contentRepo` methods to normalize
- [ ] Update filtering logic in repositories

### LMS Admin Handlers (Continued)
- [ ] Update `createPath()` and `updatePath()` schemas
- [ ] Update path handlers normalization
- [ ] Update filtering query parameters

### Other API Handlers
- [ ] Update `lms.ts` handlers (listCourses, etc.)
- [ ] Update telemetry handlers
- [ ] Update subscription matching logic

### Fixtures & Test Data
- [ ] Update `fixtures.ts` to use new field names
- [ ] Update stub repository test data
- [ ] Update any seed scripts

### Documentation
- [ ] Update architecture docs
- [ ] Update API contract docs
- [ ] Update any runbooks

## Critical Path Items

The following are blocking for basic functionality:

1. **API Client Types** - UI won't compile without these
2. **Display Components** - Users won't see correct labels
3. **Filtering Logic** - Search/filter won't work correctly

## Testing Checklist

- [ ] Legacy course with `product_suite` loads correctly (maps to `product`)
- [ ] Legacy course with `product_concept` loads correctly (maps to `product_suite`)
- [ ] New course saves with `product` and `product_suite` (new names)
- [ ] UI displays "Product" and "Product Suite" labels correctly
- [ ] Taxonomy options API works with new group keys (`product`, `product_suite`)
- [ ] Filtering by product/product_suite works correctly
- [ ] Product Suite options filter by selected Product correctly


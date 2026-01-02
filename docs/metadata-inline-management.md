# Metadata Inline Management

## Overview

The metadata system provides Notion-style inline management for Product, Product Suite, Topic Tags, Badge, and Audience fields used across Courses and Resources. Admins can create, rename, reorder, archive, and set colors for metadata options directly within the select components.

## Components

### MetadataSelect
Single-select component for Product and Product Suite fields.

**Features:**
- Typeahead search
- Inline create (admin only)
- Inline management panel (admin only)
- Color indicators
- Keyboard navigation

**Usage:**
```tsx
<MetadataSelect
  groupKey="product"
  value={productId}
  onChange={(optionId) => setProductId(optionId)}
  label="Product"
  placeholder="Select product"
/>
```

### MetadataMultiSelect
Multi-select component for Topic Tags, Badge, and Audience.

**Features:**
- Typeahead search
- Chip display for selected values
- Inline create (admin only)
- Inline management panel (admin only)
- Color indicators
- Keyboard navigation

**Usage:**
```tsx
<MetadataMultiSelect
  groupKey="topic_tag"
  values={topicTagIds}
  onChange={(optionIds) => setTopicTagIds(optionIds)}
  label="Topic Tags"
  placeholder="Add topic tags"
/>
```

### MetadataManagerPanel
Inline management panel accessible from the select components.

**Features:**
- Add new options
- Rename options (inline editing)
- Reorder options (up/down arrows)
- Archive/unarchive options
- Set color (palette picker)

**Access:**
- Click "Manage options" row at the bottom of the select dropdown (admin only)
- Opens in a popover overlay

## Permissions

- **Admin**: Can create, rename, reorder, archive, and set colors
- **Non-admin**: Can only select from existing options

## Data Model

Metadata options are stored with:
- `option_id`: Unique identifier
- `group_key`: `product`, `product_suite`, `topic_tag`, `badge`, or `audience`
- `label`: Display name
- `slug`: URL-friendly identifier
- `sort_order`: Display order
- `color`: Optional hex color
- `archived_at`: ISO datetime if archived
- `parent_id`: For hierarchical metadata (product_suite → product)

## API Endpoints

- `GET /v1/metadata/:groupKey/options` - List options
- `POST /v1/metadata/:groupKey/options` - Create option (Admin)
- `PATCH /v1/metadata/options/:optionId` - Update option (Admin)
- `GET /v1/metadata/options/:optionId` - Get single option

## Optimistic Updates

All management operations use optimistic updates:
1. Update UI immediately
2. Send API request
3. On success: Update with server response
4. On failure: Rollback to previous state

## Field Naming

- **UI Labels**: "Product", "Product Suite", "Topic Tags", "Badges", "Audience"
- **API Fields**: `product_id`, `product_suite_id`, `topic_tag_ids[]`, `badge_ids[]`, `audience_ids[]`
- **Group Keys**: `product`, `product_suite`, `topic_tag`, `badge`, `audience`

## Usage in Editors

### Course Editor
Located in `EditorPanel.tsx`:
- Product: Multi-select
- Product Suite: Multi-select
- Topic Tags: Multi-select
- Audience: Multi-select
- Badges: Multi-select

### Resource Editor
Same components used for Resource metadata fields.

## Managing Options

1. Open the select dropdown
2. Scroll to bottom
3. Click "Manage options" (gear icon)
4. In the management panel:
   - Add: Type name and press Enter or click checkmark
   - Rename: Click edit icon, modify text, press Enter
   - Reorder: Use up/down arrows
   - Archive: Click archive icon
   - Color: Click palette icon, select color

## Best Practices

- Archive instead of delete to preserve data integrity
- Use consistent naming conventions
- Set colors for visual organization
- Order options by importance/frequency


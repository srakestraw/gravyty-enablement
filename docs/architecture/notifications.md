# Notifications Architecture

## Overview

The enablement portal implements an in-app notification system that alerts users when content relevant to their subscriptions is approved or expires. Notifications are stored in DynamoDB and displayed in the web UI.

## Subscription Matching Rules (MVP)

A subscription matches a `ContentItem` if **all** of the following conditions are met:

### 1. Product Suite Match
- `subscription.product_suite` matches `contentItem.product_suite` **OR**
- `subscription.product_suite` is `"*"` (wildcard matches all)

### 2. Product Concept Match
- `subscription.product_concept` matches `contentItem.product_concept` **OR**
- `subscription.product_concept` is `"*"` (wildcard matches all)

### 3. Tag Overlap (if subscription has tags)
- If `subscription.tags` is **empty or undefined**: tag matching is skipped (matches all)
- If `subscription.tags` is **non-empty**: at least one tag in `subscription.tags` must exist in `contentItem.tags`
- Tag matching is case-sensitive and exact match

### Examples

**Example 1: Exact Match**
- Subscription: `{ product_suite: "CRM", product_concept: "Contacts", tags: ["sales"] }`
- Content: `{ product_suite: "CRM", product_concept: "Contacts", tags: ["sales", "marketing"] }`
- **Match**: ✅ All conditions met

**Example 2: Wildcard Product Suite**
- Subscription: `{ product_suite: "*", product_concept: "Contacts" }`
- Content: `{ product_suite: "CRM", product_concept: "Contacts" }`
- **Match**: ✅ Wildcard matches any product suite

**Example 3: Tag Mismatch**
- Subscription: `{ product_suite: "CRM", product_concept: "Contacts", tags: ["sales"] }`
- Content: `{ product_suite: "CRM", product_concept: "Contacts", tags: ["marketing"] }`
- **Match**: ❌ No tag overlap

**Example 4: No Tags in Subscription**
- Subscription: `{ product_suite: "CRM", product_concept: "Contacts" }` (no tags)
- Content: `{ product_suite: "CRM", product_concept: "Contacts", tags: ["sales"] }`
- **Match**: ✅ Tags are ignored when subscription has no tags

**Example 5: Partial Tag Match**
- Subscription: `{ product_suite: "CRM", product_concept: "*", tags: ["sales", "support"] }`
- Content: `{ product_suite: "CRM", product_concept: "Contacts", tags: ["sales"] }`
- **Match**: ✅ "sales" tag overlaps

## Notification Types

### content_approved
- **Trigger**: Content status changes from any status to `Approved`
- **Recipients**: All users with subscriptions matching the content
- **Title**: "New enablement content available"
- **Message**: Includes content title and product context (e.g., "New content: {title} ({product_suite} - {product_concept})")
- **Idempotency**: Notification ID = `approved:{content_id}:{user_id}`

### content_expired
- **Trigger**: Content status changes to `Expired`
- **Recipients**: 
  1. All users with subscriptions matching the content
  2. All users who downloaded the content (from events table where `event_name="download"` and `content_id` matches)
- **Title**: "Content expired"
- **Message**: Includes content title and suggested replacement action
- **Idempotency**: Notification ID = `expired:{content_id}:{user_id}`

## Notification Schema

```typescript
{
  id: string;                    // notification_id (deterministic)
  user_id: string;               // PK
  created_at#notification_id: string;  // SK (ISO8601#{notification_id})
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  created_at: string;            // ISO8601
  content_id?: string;           // Link to content item
}
```

## Idempotency

To prevent duplicate notifications:

1. **Deterministic Notification IDs**: Use format `{event_type}:{content_id}:{user_id}`
   - Example: `approved:content_123:user_456`
   - Example: `expired:content_123:user_456`

2. **Check Before Create**: Before creating a notification, check if one with the same ID already exists for the user

3. **Conditional Write**: Use DynamoDB conditional write (`ConditionExpression`) if supported, or check-then-create pattern

## Implementation Details

### Finding Matching Subscribers

1. Query all subscriptions (no filtering at DB level - small scale MVP)
2. For each subscription, check if it matches the content using matching rules
3. Collect unique `user_id` values from matching subscriptions

### Finding Downloaders (for Expiry)

1. Query events table for `event_name="download"` and `content_id={content_id}`
2. Extract unique `user_id` values
3. Combine with matching subscribers (deduplicate)

### Notification Creation

1. For each recipient user:
   - Generate deterministic notification ID
   - Check if notification already exists
   - If not exists, create notification with appropriate type, title, message
   - Include `content_id` for linking

## Future Enhancements

- **Email/SMS Delivery**: Add delivery channels (Phase 5+)
- **Notification Preferences**: Allow users to configure notification types
- **Batch Notifications**: Group multiple content approvals into single notification
- **Real-time Updates**: WebSocket/SSE for live notifications
- **Notification Expiry**: Auto-delete old notifications
- **Rich Notifications**: Include content preview, images, action buttons

## Related Documentation

- [Data Model](./data-model.md) - DynamoDB table schemas
- [API Contract](./api-contract.md) - API endpoints
- [Authentication Architecture](./auth.md) - User authentication


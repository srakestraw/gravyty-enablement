# Invite Email Status - Why Emails Aren't Being Sent

## Current Status: ❌ Emails Are NOT Being Sent

### Why Emails Aren't Being Sent

1. **`MessageAction: 'SUPPRESS'` is set** (line 146 in `apps/api/src/aws/cognitoClient.ts`)
   - This explicitly tells Cognito **NOT** to send any welcome/invitation emails
   - Comment says: "Don't send welcome email (we'll handle invitation separately)"
   - **But no separate email handling has been implemented**

2. **No Email Service Configured**
   - No AWS SES (Simple Email Service) configured
   - No email sending library (nodemailer, etc.) in dependencies
   - No email templates or sending logic

3. **Dev Environment**
   - Even if emails were configured, dev environments typically don't send real emails
   - Would need email service configuration for local testing

## How to Verify Email Status

### Option 1: Check Cognito User Status

After inviting a user, check their status in Cognito:

```bash
# Get user details
aws cognito-idp admin-get-user \
  --user-pool-id <USER_POOL_ID> \
  --username <EMAIL>

# Look for:
# - UserStatus: Should be "FORCE_CHANGE_PASSWORD" or "UNCONFIRMED" if email was sent
# - Enabled: Should be true
```

### Option 2: Check CloudWatch Logs

If emails were being sent, you'd see logs in:
- Cognito User Pool logs (if enabled)
- Lambda function logs (if using Lambda triggers)

### Option 3: Check Code

Look at `apps/api/src/aws/cognitoClient.ts` line 146:
```typescript
MessageAction: 'SUPPRESS', // Don't send welcome email (we'll handle invitation separately)
```

This confirms emails are suppressed.

## Options to Send Invitation Emails

### Option A: Use Cognito's Built-in Email (Easiest)

Remove `MessageAction: 'SUPPRESS'` to let Cognito send welcome emails:

```typescript
const command = new AdminCreateUserCommand({
  UserPoolId: USER_POOL_ID,
  Username: email,
  UserAttributes: attributes,
  // Remove MessageAction: 'SUPPRESS'
  // Or set to: MessageAction: 'WELCOME' (default)
  DesiredDeliveryMediums: ['EMAIL'],
});
```

**Requirements:**
- Cognito User Pool must have email configuration
- For production: Need verified email domain in SES
- For dev: Cognito sandbox mode (limited to verified emails)

### Option B: Use AWS SES (Recommended for Production)

1. **Configure SES**:
   ```bash
   # Verify email domain or email address
   aws ses verify-email-identity --email-address noreply@gravyty.com
   ```

2. **Update Cognito User Pool** to use SES:
   - In AWS Console: Cognito → User Pool → Messaging → Email
   - Set "Email provider" to "Amazon SES"
   - Select verified SES identity

3. **Remove `MessageAction: 'SUPPRESS'`** from code

### Option C: Custom Email Service (Most Control)

Implement custom email sending:

1. **Add email service** (e.g., AWS SES SDK, SendGrid, etc.)
2. **Create invitation email template**
3. **Send email after user creation**:
   ```typescript
   // After creating user
   await adminCreateUserInvite(email, name);
   await sendInvitationEmail(email, name, role);
   ```

## Current Behavior

When you invite a user:
1. ✅ User is created in Cognito
2. ✅ User is assigned to selected role group
3. ❌ **NO email is sent** (because of `MessageAction: 'SUPPRESS'`)
4. ✅ User appears in admin users list
5. ✅ User can sign in with Google OAuth (if email matches)

## For Development Testing

Since you're in dev and no email service is configured:

1. **Check user was created**:
   ```bash
   aws cognito-idp admin-get-user \
     --user-pool-id <USER_POOL_ID> \
     --username <INVITED_EMAIL>
   ```

2. **Check user status**:
   - Should show user exists
   - Status will be `FORCE_CHANGE_PASSWORD` or `UNCONFIRMED`
   - No email was sent (expected)

3. **User can still sign in**:
   - Since you're using Google OAuth, user can sign in with their Google account
   - If email matches, they'll be authenticated
   - Their role will be applied from Cognito groups

## Recommendation

For **development**:
- Keep `MessageAction: 'SUPPRESS'` (current behavior)
- Users can sign in via Google OAuth
- No emails needed for dev testing

For **production**:
- Configure AWS SES with verified domain
- Remove `MessageAction: 'SUPPRESS'` OR implement custom email sending
- Send proper invitation emails with instructions

## Quick Check Script

Create a test script to verify user creation:

```bash
#!/bin/bash
# Check if invited user exists and their status

USER_POOL_ID="<YOUR_USER_POOL_ID>"
EMAIL="<INVITED_EMAIL>"

echo "Checking user: $EMAIL"
aws cognito-idp admin-get-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$EMAIL" \
  --query '{Username:Username,Status:UserStatus,Enabled:Enabled,Email:UserAttributes[?Name==`email`].Value|[0]}' \
  --output json
```

This will show:
- ✅ User exists
- ✅ User status
- ✅ Enabled status
- ❌ No email was sent (expected with current config)


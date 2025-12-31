# Authentication Architecture

## Overview

The enablement portal uses AWS Cognito for authentication with Google as the identity provider (IdP). Users authenticate via Google OAuth and receive JWT tokens that are validated by the API.

## Architecture Components

### 1. Cognito User Pool

- **Purpose**: Manages user identities and authentication
- **Sign-in Method**: Google OAuth (federated identity)
- **User Pool Name**: `enablement-portal-users`

### 2. Cognito Groups

Groups define user roles and permissions:

- **Viewer** (precedence: 1)
  - View-only access to approved content
  - Can download approved content files

- **Contributor** (precedence: 2)
  - Can create and edit content
  - Can upload files to draft content
  - Can attach files to own content

- **Approver** (precedence: 3)
  - Can approve, deprecate, and expire content
  - All Contributor permissions

- **Admin** (precedence: 4)
  - Full administrative access
  - Can access all content regardless of status
  - Can attach files to any content

### 3. Google Identity Provider

- **Provider Type**: Google OAuth 2.0
- **Credentials**: Stored in SSM Parameter Store
  - `/enablement-portal/google/client-id`
  - `/enablement-portal/google/client-secret`
- **Attribute Mapping**:
  - `email` → Cognito email attribute
  - `name` → Cognito name attribute

### 4. Cognito Domain

- **Type**: Cognito hosted domain
- **Format**: `enablement-portal-{account-id}.auth.{region}.amazoncognito.com`
- **Purpose**: Hosts the OAuth sign-in UI

### 5. User Pool Client

- **Client Type**: Public client (web app)
- **OAuth Flows**: Authorization code grant
- **Scopes**: `openid`, `email`, `profile`
- **Callback URLs**:
  - `http://localhost:5173` (Vite dev)
  - `http://localhost:3000` (Alternative dev port)
  - TODO: Add Amplify domain when deployed

## Authentication Flow

### 1. User Sign-In

```
User → Web App → Cognito Hosted UI → Google OAuth → Cognito → JWT Tokens → Web App
```

1. User clicks "Sign In with Google"
2. Web app redirects to Cognito hosted UI
3. Cognito redirects to Google OAuth
4. User authenticates with Google
5. Google redirects back to Cognito with authorization code
6. Cognito exchanges code for tokens (ID token, access token, refresh token)
7. Cognito redirects back to web app with tokens
8. Web app stores tokens in memory

### 2. API Request Flow

```
Web App → API Request with JWT → API Middleware → JWT Verification → Extract User Context → Process Request
```

1. Web app includes ID token in `Authorization: Bearer <token>` header
2. API middleware extracts token
3. JWT verifier validates token signature and claims
4. Extract user ID from `sub` claim
5. Extract role from `cognito:groups` claim
6. Attach user context to request
7. Process request with user context

## JWT Token Structure

### ID Token Claims

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "cognito:groups": ["Contributor"],
  "iss": "https://cognito-idp.{region}.amazonaws.com/{userPoolId}",
  "aud": "{clientId}",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Role Extraction

The API extracts the role from the `cognito:groups` claim:
- Checks groups in precedence order: Admin > Approver > Contributor > Viewer
- Defaults to Viewer if no groups or invalid group

## Configuration

### Web App Environment Variables

Create `.env` or `.env.local` in `apps/web/`:

```bash
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_USER_POOL_DOMAIN=enablement-portal-12345678.auth.us-east-1.amazoncognito.com

# Optional: Dev mode fallback
VITE_DEV_ROLE=Viewer
VITE_DEV_USER_ID=dev-user
```

### API Environment Variables

Add to `apps/api/.env`:

```bash
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Google OAuth Setup

### Quick Setup (Recommended)

Use the automated setup script:

```bash
./infra/scripts/configure-google-oauth.sh
```

This script guides you through the entire process.

### Manual Setup

See the detailed guide: [Google OAuth Setup Runbook](../runbooks/google-oauth-setup.md)

**Quick Steps**:

1. **Create Google OAuth Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create OAuth client ID (Web application)
   - Add redirect URI: `https://{cognito-domain}/oauth2/idpresponse`
   - Copy Client ID and Client Secret

2. **Store Credentials in SSM**:
   ```bash
   # Get parameter names from CDK outputs
   CLIENT_ID_PARAM=$(aws cloudformation describe-stacks \
     --stack-name EnablementPortalStack \
     --query 'Stacks[0].Outputs[?OutputKey==`GoogleClientIdParamName`].OutputValue' \
     --output text)
   
   # Store credentials
   aws ssm put-parameter \
     --name "$CLIENT_ID_PARAM" \
     --value "YOUR_CLIENT_ID" \
     --type String \
     --overwrite
   
   aws ssm put-parameter \
     --name "$CLIENT_SECRET_PARAM" \
     --value "YOUR_CLIENT_SECRET" \
     --type SecureString \
     --overwrite
   ```

3. **Update Cognito Identity Provider**:
   ```bash
   USER_POOL_ID=$(aws cloudformation describe-stacks \
     --stack-name EnablementPortalStack \
     --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
     --output text)
   
   aws cognito-idp update-identity-provider \
     --user-pool-id "$USER_POOL_ID" \
     --provider-name Google \
     --provider-details "client_id=YOUR_CLIENT_ID,client_secret=YOUR_CLIENT_SECRET,authorize_scopes=openid email profile"
   ```

## User Management

### Admin Users & Roles Module

The Admin Users & Roles module provides a web interface for managing users and their role assignments. It is backed by Cognito groups and provides full CRUD operations for user management.

**Access**: Admin-only (protected by `requireRole('Admin')` middleware)

**Features**:
- List users with search and filtering
- Invite new users via email
- Change user roles (Viewer, Contributor, Approver, Admin)
- Enable/disable user accounts
- Audit trail for all admin actions

**API Endpoints** (all require Admin role):
- `GET /v1/admin/users` - List users with pagination
- `POST /v1/admin/users/invite` - Invite new user
- `PATCH /v1/admin/users/:username/role` - Update user role
- `PATCH /v1/admin/users/:username/enable` - Enable user account
- `PATCH /v1/admin/users/:username/disable` - Disable user account

**Role Management**:
- Users can only belong to one role group at a time
- Changing a user's role removes them from their current role group and adds them to the new group
- Role groups: Viewer, Contributor, Approver, Admin (in order of precedence)

**Audit Trail**:
All admin actions emit audit events to `/v1/events`:
- `admin_users_invite` - User invitation
- `admin_users_role_change` - Role changes
- `admin_users_enable` - User enabled
- `admin_users_disable` - User disabled

Each audit event includes:
- `actor`: Current admin user ID/email
- `target_username`, `target_email`: Target user information
- `old_role`, `new_role`: Role change details (when applicable)
- `enabled_before`, `enabled_after`: Status change details (when applicable)

**Dev Fallback**:
When `COGNITO_USER_POOL_ID` is not configured, the API uses an in-memory user store with stub users for UI development.

### Assigning Users to Groups

Users can be assigned to groups via:
1. **Admin UI**: Use the Users & Roles page in the web app
2. **AWS Console**: Cognito User Pool → Users → Select user → Groups tab
3. **CLI**:

```bash
# Add user to Contributor group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username user@example.com \
  --group-name Contributor
```

### Automatic Group Assignment

For automatic group assignment based on Google groups, configure attribute mapping in Cognito:

1. Map Google `groups` claim to custom attribute
2. Use Lambda trigger to assign Cognito groups based on Google groups

## Fallback Mode

For local development without Cognito:

- **Web App**: Uses `VITE_DEV_ROLE` and `VITE_DEV_USER_ID` env vars
- **API**: Falls back to `x-dev-role` and `x-dev-user-id` headers
- **Enabled**: When Cognito env vars are not set or user not authenticated

## Security Considerations

1. **Token Storage**: Tokens stored in memory (not localStorage) to prevent XSS attacks
2. **Token Expiry**: ID tokens expire after 1 hour (default)
3. **Token Refresh**: Amplify automatically refreshes tokens using refresh token
4. **HTTPS Required**: All OAuth redirects must use HTTPS in production
5. **CORS**: API CORS configured to accept Authorization header
6. **JWT Verification**: Validates signature, expiration, issuer, and audience

## Troubleshooting

### "Invalid token" errors

- Check token hasn't expired
- Verify User Pool ID and Client ID match
- Ensure token is ID token (not access token)

### "User not authenticated" errors

- Check Amplify configuration
- Verify redirect URLs match Cognito configuration
- Check browser console for OAuth errors

### "Group not found" errors

- Verify user is assigned to a Cognito group
- Check group name matches expected values (Viewer, Contributor, Approver, Admin)

## Related Documentation

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [Amplify Auth Documentation](https://docs.amplify.aws/react/build-a-backend/auth/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)


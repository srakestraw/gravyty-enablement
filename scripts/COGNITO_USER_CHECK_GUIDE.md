# How to Check Your Cognito User in AWS

## Option 1: AWS Console (Easiest)

1. **Go to AWS Cognito Console**:
   - https://console.aws.amazon.com/cognito/
   - Select your region: **us-east-1** (N. Virginia)

2. **Find Your User Pool**:
   - Click "User pools" in the left sidebar
   - Find: **enablement-portal-users** (ID: `us-east-1_s4q1vjkgD`)
   - Click on it

3. **Find Your User**:
   - Click "Users" tab
   - Search for: `scott.rakestraw@gravyty.com`
   - OR search by User ID: `8498b4a8-d081-7007-23df-8b2585ae7d49`

4. **Check Your Groups**:
   - Click on your user
   - Go to "Groups" tab
   - You should see which groups you're in
   - If you see "Admin" group, you're all set!

5. **Add Yourself to Admin Group** (if needed):
   - In the "Groups" tab, click "Add user to group"
   - Select "Admin" group
   - Click "Add"

## Option 2: AWS CLI (If Configured)

```bash
# Check if you exist
aws cognito-idp admin-get-user \
  --user-pool-id us-east-1_s4q1vjkgD \
  --username scott.rakestraw@gravyty.com

# Check your groups
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id us-east-1_s4q1vjkgD \
  --username scott.rakestraw@gravyty.com

# List all users (to find your exact username)
aws cognito-idp list-users \
  --user-pool-id us-east-1_s4q1vjkgD \
  --limit 50
```

## Option 3: From Your Browser (JWT Token)

Your JWT token shows:
- **Email**: scott.rakestraw@gravyty.com
- **User ID**: 8498b4a8-d081-7007-23df-8b2585ae7d49
- **Groups**: ['us-east-1_s4q1vjkgD_Google', 'Admin']

This means:
- ✅ You ARE a user (you've signed in successfully)
- ✅ You ARE in the Admin group
- ✅ Your JWT token is valid

## Why You Might Not See Yourself in AWS Console

1. **Username Format**: Cognito might use your email or user ID as username
   - Try searching for: `scott.rakestraw@gravyty.com`
   - Try searching for: `8498b4a8-d081-7007-23df-8b2585ae7d49`
   - Try searching for: `scott.rakestraw` (without domain)

2. **Federated Identity**: Since you're using Google OAuth, Cognito creates the user automatically on first sign-in
   - The username might be your email
   - Or it might be a generated ID

3. **User Pool vs Identity Pool**: Make sure you're looking at the correct User Pool
   - User Pool ID: `us-east-1_s4q1vjkgD`
   - Pool Name: `enablement-portal-users`

## Quick Verification

Since your browser logs show you have Admin group in your JWT token, you're definitely:
- ✅ A user in Cognito
- ✅ In the Admin group
- ✅ Authenticated correctly

The "No users found" issue is because the API is using dev fallback (stub users) since AWS credentials aren't configured locally. This is expected for local development!


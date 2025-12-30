# Amplify Environment Variables

Copy these environment variables to AWS Amplify Console:

**Location:** AWS Amplify Console → Your App → App Settings → Environment Variables → Manage Variables

## Required Variables

```
VITE_API_BASE_URL=
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_s4q1vjkgD
VITE_COGNITO_USER_POOL_CLIENT_ID=5p932tqfp5g5jh9h02bn6hskgm
VITE_COGNITO_DOMAIN=enablement-portal-75874255
VITE_AUTH_MODE=cognito
```

## Notes

- **VITE_API_BASE_URL**: Currently empty - will be populated after API Gateway is deployed
- **VITE_COGNITO_DOMAIN**: This is the domain prefix. The full domain will be: `enablement-portal-75874255.auth.us-east-1.amazoncognito.com`

## After API Deployment

Once the API is deployed, run:
```bash
export AWS_PROFILE=admin
./infra/scripts/update-web-env-from-cdk.sh --amplify-format
```

This will output the complete list including `VITE_API_BASE_URL`.

## Setting in Amplify Console

1. Go to: https://console.aws.amazon.com/amplify
2. Select your app
3. Click: **App settings** → **Environment variables**
4. Click: **Manage variables**
5. Click: **Add variable** for each variable above
6. Click: **Save**
7. Redeploy the app



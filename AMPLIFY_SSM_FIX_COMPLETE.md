# Amplify SSM Permissions - Fix Applied

## ✅ What Was Done

1. **Created IAM Service Role**: `amplify-d1cf513hn1tkd1-service-role`
   - Role ARN: `arn:aws:iam::758742552610:role/amplify-d1cf513hn1tkd1-service-role`
   - Includes SSM parameter access permissions
   - Includes Amplify build permissions

2. **SSM Permissions Configured**:
   - `ssm:GetParameter`
   - `ssm:GetParameters`
   - `ssm:GetParametersByPath`
   - Resource: `arn:aws:ssm:us-east-1:758742552610:parameter/amplify/d1cf513hn1tkd1/*`

## 🔧 Final Step Required

The IAM role has been created, but it needs to be assigned to your Amplify app. Do this via AWS Console:

### Option 1: Via Amplify Console (Recommended)

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Select your app: **gravyty-enablement**
3. Go to **App settings** → **General**
4. Scroll to **Service role**
5. Click **Edit**
6. Select: `amplify-d1cf513hn1tkd1-service-role`
7. Click **Save**

### Option 2: Via AWS CLI (if console doesn't work)

```bash
aws amplify update-app \
  --app-id d1cf513hn1tkd1 \
  --iam-service-role-arn arn:aws:iam::758742552610:role/amplify-d1cf513hn1tkd1-service-role
```

## ✅ Verification

After assigning the role:

1. **Verify role is assigned**:
   ```bash
   aws amplify get-app --app-id d1cf513hn1tkd1 --query 'app.serviceRoleArn' --output text
   ```
   Should return: `arn:aws:iam::758742552610:role/amplify-d1cf513hn1tkd1-service-role`

2. **Trigger a new build** in Amplify Console

3. **Check build logs** - The SSM warning should be resolved

## 📋 Summary

- ✅ IAM role created with SSM permissions
- ⏳ Role needs to be assigned to Amplify app (via Console)
- ⏳ New build needed to verify fix

The role is ready and has all the necessary permissions. Once assigned to the Amplify app, your builds should proceed without the SSM warning blocking deployment.


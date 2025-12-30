# GoDaddy DNS Setup for Amplify Domain

## Current Status

- **Amplify App ID**: `d1cf513hn1tkd1`
- **Custom Domain**: `enable.gravytylabs.com`
- **Status**: FAILED (DNS records not verified)

## DNS Records Needed

Based on your Amplify configuration, you need to add these CNAME records in GoDaddy:

### Record 1: Root Domain (enable.gravytylabs.com)

```
Type: CNAME
Name: enable
Value: dlcwl3r468kk6.cloudfront.net
TTL: 3600 (or default)
```

**Note**: In GoDaddy, if you're setting up the root domain `enable.gravytylabs.com`, the "Name" field should be `enable` (not blank).

### Record 2: WWW Subdomain (www.enable.gravytylabs.com)

```
Type: CNAME
Name: www.enable
Value: dlcwl3r468kk6.cloudfront.net
TTL: 3600 (or default)
```

## Step-by-Step Instructions for GoDaddy

1. **Log in to GoDaddy**:
   - Go to: https://dcc.godaddy.com/
   - Sign in with your GoDaddy account

2. **Navigate to DNS Management**:
   - Click "My Products"
   - Find `gravytylabs.com` in your domain list
   - Click "DNS" or "Manage DNS"

3. **Add CNAME Record for Root Domain**:
   - Click "Add" or "+" to add a new record
   - Select **Type**: `CNAME`
   - **Name**: `enable`
   - **Value**: `dlcwl3r468kk6.cloudfront.net`
   - **TTL**: `3600` (or leave default)
   - Click "Save"

4. **Add CNAME Record for WWW Subdomain**:
   - Click "Add" again
   - Select **Type**: `CNAME`
   - **Name**: `www.enable`
   - **Value**: `dlcwl3r468kk6.cloudfront.net`
   - **TTL**: `3600` (or leave default)
   - Click "Save"

5. **Verify Records**:
   - You should see both records in your DNS list
   - Wait 5-60 minutes for DNS propagation

## Verify DNS Propagation

After adding the records, verify they're working:

```bash
# Check root domain
dig enable.gravytylabs.com CNAME

# Check www subdomain
dig www.enable.gravytylabs.com CNAME
```

Or use online tools:
- https://www.whatsmydns.net/#CNAME/enable.gravytylabs.com
- https://dnschecker.org/#CNAME/enable.gravytylabs.com

Expected result: Both should resolve to `dlcwl3r468kk6.cloudfront.net`

## After DNS Propagates

1. **Check Amplify Console**:
   - Go to: https://console.aws.amazon.com/amplify/home?region=us-east-1#/d1cf513hn1tkd1/domains
   - The domain status should change from "FAILED" to "AVAILABLE" or "PENDING_VERIFICATION"

2. **Wait for SSL Certificate**:
   - Amplify will automatically provision an SSL certificate
   - This can take 10-30 minutes after DNS propagates

3. **Test Your Domain**:
   - Visit: https://enable.gravytylabs.com
   - Should load your Amplify app

## Troubleshooting

### Domain Still Shows FAILED

- **Check DNS propagation**: Use the verification tools above
- **Verify record names**: Make sure `enable` (not `enable.gravytylabs.com`) is in the Name field
- **Check for typos**: Ensure the CloudFront domain is exactly `dlcwl3r468kk6.cloudfront.net`
- **Wait longer**: DNS can take up to 48 hours to fully propagate (usually 5-60 minutes)

### Multiple CNAME Records Issue

If GoDaddy shows an error about multiple CNAME records:
- Make sure you don't have conflicting records
- Remove any old/incorrect CNAME records for `enable` or `www.enable`
- Only keep the records pointing to `dlcwl3r468kk6.cloudfront.net`

### SSL Certificate Not Provisioning

- Wait 30-60 minutes after DNS propagates
- Check Amplify Console for certificate status
- If still failing after 24 hours, contact AWS Support

## Quick Reference

**CloudFront Distribution**: `dlcwl3r468kk6.cloudfront.net`

**Records to Add**:
1. `enable` → `dlcwl3r468kk6.cloudfront.net`
2. `www.enable` → `dlcwl3r468kk6.cloudfront.net`

**Amplify Console**: https://console.aws.amazon.com/amplify/home?region=us-east-1#/d1cf513hn1tkd1



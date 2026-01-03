# Verify GoDaddy DNS Records

## Records Amplify Expects

Based on the Amplify console, you need these CNAME records in GoDaddy:

### Record 1: SSL Certificate Validation
```
Type: CNAME
Name: _5e2d07b5345e5077eff0eea06e4e1baa.enable
Value: _0eee8b0245bdcf9894d8879b8bacfc8c.jkddzztszm.acm-validations.aws.
TTL: 3600
```

**Note**: In GoDaddy, the "Name" field should be: `_5e2d07b5345e5077eff0eea06e4e1baa.enable`
(GoDaddy will automatically append `.gravytylabs.com`)

### Record 2: Subdomain to CloudFront
```
Type: CNAME
Name: enable
Value: d2640nttze75rq.cloudfront.net
TTL: 3600
```

**Note**: In GoDaddy, the "Name" field should be: `enable`
(GoDaddy will automatically append `.gravytylabs.com`)

## How to Verify in GoDaddy

1. **Log in to GoDaddy**: https://dcc.godaddy.com/
2. **Go to DNS Management**:
   - My Products → gravytylabs.com → DNS
3. **Check your CNAME records**:
   - Look for records with "Name" starting with `_5e2d07b5345e5077eff0eea06e4e1baa.enable`
   - Look for records with "Name" = `enable`
4. **Verify values match exactly**:
   - Certificate validation: Should point to `_0eee8b0245bdcf9894d8879b8bacfc8c.jkddzztszm.acm-validations.aws.`
   - Subdomain: Should point to `d2640nttze75rq.cloudfront.net`

## What to Check

✅ **Certificate Validation Record**:
- Name: `_5e2d07b5345e5077eff0eea06e4e1baa.enable`
- Value: `_0eee8b0245bdcf9894d8879b8bacfc8c.jkddzztszm.acm-validations.aws.`
- **Important**: Must include the trailing dot (.) at the end

✅ **Subdomain Record**:
- Name: `enable`
- Value: `d2640nttze75rq.cloudfront.net`
- **Important**: This is different from the old value (`dlcwl3r468kk6.cloudfront.net`) - make sure it's updated!

## Common Issues

### Old CloudFront Domain
If you see `dlcwl3r468kk6.cloudfront.net` instead of `d2640nttze75rq.cloudfront.net`:
- **Update the CNAME record** to the new CloudFront domain
- This happens when Amplify creates a new distribution

### Missing Certificate Validation Record
If the certificate validation record is missing:
- **Add it** - This is required for SSL certificate provisioning
- Without it, Amplify can't verify domain ownership

### Trailing Dots
- Certificate validation record **must** have a trailing dot (.)
- Subdomain record should **not** have a trailing dot

## After Verifying/Updating

1. **Save changes** in GoDaddy
2. **Wait 5-15 minutes** for DNS propagation
3. **Return to Amplify Console** - it should automatically verify
4. **Check status** - Should change from "SSL configuration" to "Domain activation"





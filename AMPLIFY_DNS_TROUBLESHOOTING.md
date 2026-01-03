# Amplify DNS Troubleshooting Guide

## If It Doesn't Work This Time

### Option 1: Systematic Troubleshooting (Recommended First)

**Don't delete DNS records yet** - let's diagnose the issue first:

1. **Wait 15-30 minutes** after adding the certificate validation record
   - DNS propagation can take time
   - Amplify checks periodically (not instantly)

2. **Verify DNS records are correct**:
   ```bash
   # Check certificate validation
   dig _5e2d07b5345e5077eff0eea06e4e1baa.enable.gravytylabs.com CNAME
   
   # Check subdomain
   dig enable.gravytylabs.com CNAME
   ```

3. **Check Amplify status**:
   ```bash
   export AWS_PROFILE=admin
   aws amplify get-domain-association \
     --app-id d1cf513hn1tkd1 \
     --domain-name enable.gravytylabs.com \
     --query 'domainAssociation.domainStatus' \
     --output text
   ```

4. **Common issues**:
   - Certificate validation record missing or incorrect
   - Wrong CloudFront domain
   - DNS TTL too high (should be 3600 or lower)
   - Trailing dots missing/extra in certificate validation record

### Option 2: Delete and Recreate Domain Association

**If troubleshooting doesn't work**, try this:

1. **Delete the domain association in Amplify**:
   - Go to Amplify Console → Domain management
   - Click on `enable.gravytylabs.com`
   - Click "Remove domain"
   - Confirm deletion

2. **Wait 5-10 minutes** for cleanup

3. **Delete DNS records in GoDaddy**:
   - Remove the certificate validation CNAME
   - Remove or update the `enable` CNAME

4. **Recreate domain association**:
   - Add domain again in Amplify
   - Get NEW DNS records (they'll be different)
   - Add new records to GoDaddy
   - Wait for verification

**Pros**: Fresh start, new certificate validation record
**Cons**: More work, need to update DNS again

### Option 3: Try a Different Subdomain (Easier Alternative)

**If you want to avoid the current domain issues**:

1. **Use a simpler subdomain**:
   - `portal.gravytylabs.com` (shorter, simpler)
   - `app.gravytylabs.com`
   - `enablement.gravytylabs.com`

2. **Keep current domain for later**:
   - Leave `enable.gravytylabs.com` DNS records as-is
   - Don't delete them
   - Can fix it later

3. **Set up new subdomain**:
   - Add new domain in Amplify Console
   - Get fresh DNS records
   - Add to GoDaddy
   - Usually works faster with a clean slate

**Pros**: Faster, cleaner setup, can fix original domain later
**Cons**: Different URL, need to update app configs

## Recommended Approach

### Step 1: Wait and Verify (15-30 minutes)
- Check if certificate validation record propagates
- Verify Amplify status changes
- Use the verification commands above

### Step 2: If Still Failing - Check Specific Error
- Look at Amplify Console for specific error message
- Check if it's DNS-related or certificate-related
- Common errors:
  - "DNS records not found" → DNS propagation issue
  - "Certificate validation failed" → Certificate record issue
  - "Domain verification pending" → Still waiting

### Step 3: Decision Point

**If error is DNS-related**:
- Try Option 2 (delete and recreate) - gives fresh DNS records

**If you need it working quickly**:
- Try Option 3 (new subdomain) - faster path to working solution

**If you have time to troubleshoot**:
- Continue with Option 1 - check DNS records, wait longer, verify

## Quick Status Check Script

Run this to check current status:

```bash
#!/bin/bash
export AWS_PROFILE=admin

echo "=== Amplify Domain Status ==="
aws amplify get-domain-association \
  --app-id d1cf513hn1tkd1 \
  --domain-name enable.gravytylabs.com \
  --query '{status: domainAssociation.domainStatus, subDomains: domainAssociation.subDomains[*].{prefix: subDomainSetting.prefix, verified: verified}}' \
  --output json | jq .

echo ""
echo "=== DNS Records ==="
echo "Certificate validation:"
dig +short _5e2d07b5345e5077eff0eea06e4e1baa.enable.gravytylabs.com CNAME || echo "Not found"

echo "Subdomain:"
dig +short enable.gravytylabs.com CNAME || echo "Not found"
```

## My Recommendation

**If it doesn't work this time**:

1. **First**: Wait 30 minutes and check status
2. **If still failing**: Try **Option 3 (new subdomain)** - it's the fastest path to a working solution
3. **Keep `enable.gravytylabs.com`** for later - don't delete DNS records, just set up a new subdomain
4. **Once new subdomain works**: You can come back and fix `enable.gravytylabs.com` later

**Why Option 3?**
- Faster to get working
- Less frustration
- Can fix original domain when you have time
- New DNS records = fresh start

## Alternative: Use Amplify Default Domain

If DNS continues to be problematic, you can:
- Use the default Amplify domain: `d1cf513hn1tkd1.amplifyapp.com`
- It works immediately, no DNS configuration needed
- Add custom domain later when ready

This gets your app live fastest, then you can tackle custom domain setup separately.





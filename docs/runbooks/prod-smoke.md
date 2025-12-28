# Production Smoke Test Checklist

Use this checklist to verify the production deployment is working correctly after deploying to AWS Amplify.

## Prerequisites

- Amplify app deployed and accessible
- At least two test users:
  - **Contributor user**: Can create/edit content
  - **Approver user**: Can approve content
- Browser DevTools open (Network and Console tabs)

## Test Environment

- **Amplify URL**: `https://main.xxxxxxxxx.amplifyapp.com` (replace with your URL)
- **API URL**: Get from CDK outputs: `./infra/scripts/get-api-url.sh`

## Authentication Tests

### ✅ Test 1: Sign In with Google

1. Navigate to Amplify app URL
2. Click **"Sign In"** button
3. Should redirect to Cognito Hosted UI
4. Click **"Sign in with Google"**
5. Complete Google OAuth flow
6. Should redirect back to Amplify app
7. Should see user email/name in header
8. **Verify**: User is authenticated (no "Sign In" button visible)

**Expected Result:**
- ✅ Redirects to Cognito Hosted UI
- ✅ Google OAuth works
- ✅ Redirects back to Amplify app
- ✅ User authenticated state visible

**Common Issues:**
- Redirect URI mismatch → Check Cognito callback URLs include Amplify domain
- CORS error → Verify `WEB_ALLOWED_ORIGINS` includes Amplify domain

### ✅ Test 2: Sign Out

1. Click **"Sign Out"** button
2. Should redirect to sign-in page or home page
3. User should be logged out

**Expected Result:**
- ✅ Sign out works
- ✅ User redirected appropriately
- ✅ Session cleared

## Content List Tests

### ✅ Test 3: List Content (Viewer)

1. Sign in as a user with **Viewer** role (or any authenticated user)
2. Navigate to **"Content"** page
3. Should see list of content items
4. Check browser Network tab for API calls

**Expected Result:**
- ✅ Content list loads
- ✅ API call to `/v1/content` succeeds (200 OK)
- ✅ JWT token included in `Authorization` header
- ✅ No CORS errors in console
- ✅ Content items display correctly

**API Call to Verify:**
```bash
# Get API URL
API_URL=$(./infra/scripts/get-api-url.sh)

# Test with JWT (replace TOKEN with actual token from browser)
curl -H "Authorization: Bearer TOKEN" $API_URL/v1/content
```

**Common Issues:**
- CORS error → Check API Gateway CORS config
- 401 Unauthorized → Verify JWT token is valid
- Empty list → Normal if no content exists yet

## Content Creation Tests (Contributor)

### ✅ Test 4: Create Draft Content

1. Sign in as a user with **Contributor** role
2. Navigate to **"Content"** page
3. Click **"Create Content"** or **"New"** button
4. Fill in required fields:
   - Title: "Test Content"
   - Summary: "Test summary"
   - Status: "Draft"
5. Click **"Save"** or **"Create"**
6. Should see success message
7. New content should appear in list

**Expected Result:**
- ✅ Content creation form works
- ✅ API call to `POST /v1/content` succeeds (201 Created)
- ✅ JWT token includes `Contributor` group claim
- ✅ Content appears in list after creation

**API Call to Verify:**
```bash
curl -X POST $API_URL/v1/content \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Content",
    "summary": "Test summary",
    "status": "Draft"
  }'
```

**Common Issues:**
- 403 Forbidden → User not in Contributor group
- Validation error → Check required fields

### ✅ Test 5: Upload and Attach File

1. Sign in as **Contributor**
2. Create or edit content item
3. Navigate to file upload section
4. Click **"Upload File"** or **"Choose File"**
5. Select a test file (e.g., PDF, image)
6. Upload should start
7. File should appear in attached files list

**Expected Result:**
- ✅ File upload initiates
- ✅ API call to `POST /v1/content/{id}/files` succeeds
- ✅ S3 presigned URL generated
- ✅ File uploads to S3 successfully
- ✅ File appears in content detail page

**API Call to Verify:**
```bash
# Get presigned upload URL
curl -X POST $API_URL/v1/content/{content_id}/files \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.pdf", "content_type": "application/pdf"}'

# Use presigned URL to upload file
curl -X PUT <presigned_url> \
  -H "Content-Type: application/pdf" \
  --data-binary @test.pdf
```

**Common Issues:**
- S3 CORS error → Check S3 bucket CORS config includes Amplify domain
- Upload fails → Verify presigned URL is valid and not expired

## Content Approval Tests (Approver)

### ✅ Test 6: Approve Content

1. Sign in as a user with **Approver** role
2. Navigate to content item with status **"Draft"**
3. Click **"Approve"** button
4. Should see confirmation or success message
5. Content status should change to **"Approved"**

**Expected Result:**
- ✅ Approve action works
- ✅ API call to `PATCH /v1/content/{id}` succeeds
- ✅ JWT token includes `Approver` group claim
- ✅ Status updated to "Approved"

**API Call to Verify:**
```bash
curl -X PATCH $API_URL/v1/content/{content_id} \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "Approved"}'
```

**Common Issues:**
- 403 Forbidden → User not in Approver group
- Status not updating → Check API response

## Content Download Tests (Viewer)

### ✅ Test 7: Download File

1. Sign in as **Viewer** (or any authenticated user)
2. Navigate to approved content item
3. Find attached file in file list
4. Click **"Download"** button
5. File should download successfully

**Expected Result:**
- ✅ Download initiates
- ✅ API call to `GET /v1/content/{id}/files/{file_id}/download` succeeds
- ✅ S3 presigned download URL generated
- ✅ File downloads successfully

**API Call to Verify:**
```bash
curl -X GET $API_URL/v1/content/{content_id}/files/{file_id}/download \
  -H "Authorization: Bearer TOKEN"
```

**Common Issues:**
- 404 Not Found → File doesn't exist or wrong ID
- Download fails → Check S3 presigned URL validity

## Event Logging Tests (Optional)

### ✅ Test 8: Verify Events Are Written

After performing actions above, verify events are logged:

**Option A: Check DynamoDB**
```bash
# Get Events table name
EVENTS_TABLE=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`EventsTableName`].OutputValue' \
  --output text)

# Query recent events
aws dynamodb scan \
  --table-name $EVENTS_TABLE \
  --limit 10 \
  --query 'Items[*].[event_type.S, user_id.S, created_at.S]' \
  --output table
```

**Option B: Check via API**
```bash
# List recent events (if endpoint exists)
curl -H "Authorization: Bearer TOKEN" $API_URL/v1/events
```

**Expected Result:**
- ✅ Events table contains entries
- ✅ Event types match actions (e.g., `content.created`, `content.approved`)
- ✅ User IDs match authenticated users
- ✅ Timestamps are recent

## Performance Checks

### ✅ Test 9: Page Load Performance

1. Open browser DevTools > Network tab
2. Navigate to different pages
3. Check load times

**Expected Result:**
- ✅ Initial page load < 3 seconds
- ✅ API calls complete < 1 second
- ✅ No failed requests

### ✅ Test 10: Error Handling

1. Test with invalid inputs
2. Test with expired JWT token (wait or manually expire)
3. Test with network offline

**Expected Result:**
- ✅ Error messages display appropriately
- ✅ 401 errors redirect to sign-in
- ✅ Network errors show user-friendly messages

## Security Checks

### ✅ Test 11: RBAC Enforcement

1. Sign in as **Viewer**
2. Try to create content (should fail or button hidden)
3. Try to approve content (should fail or button hidden)
4. Sign in as **Contributor**
5. Try to approve content (should fail or button hidden)

**Expected Result:**
- ✅ Viewer cannot create/approve (403 or UI hidden)
- ✅ Contributor cannot approve (403 or UI hidden)
- ✅ Only appropriate actions available per role

### ✅ Test 12: CORS Verification

1. Open browser DevTools > Console
2. Navigate through app
3. Check for CORS errors

**Expected Result:**
- ✅ No CORS errors in console
- ✅ All API calls succeed
- ✅ Preflight requests return 200 OK

## Final Verification

After completing all tests:

- [ ] All authentication tests pass
- [ ] All content CRUD operations work
- [ ] File upload/download works
- [ ] RBAC enforced correctly
- [ ] No CORS errors
- [ ] No console errors
- [ ] Events logged (if checked)
- [ ] Performance acceptable

## Troubleshooting

### Common Issues

**CORS Errors:**
- Verify `WEB_ALLOWED_ORIGINS` includes Amplify domain
- Redeploy CDK stack
- Check API Gateway CORS config

**Authentication Failures:**
- Verify Cognito callback URLs include Amplify domain
- Check environment variables in Amplify Console
- Verify Google OAuth redirect URI matches Cognito domain

**403 Forbidden:**
- Verify user is in correct Cognito group
- Check JWT token includes group claims
- Verify API Gateway authorizer configuration

**File Upload/Download Issues:**
- Check S3 bucket CORS config
- Verify presigned URL expiration
- Check IAM permissions for Lambda

## Scheduled Jobs

### ✅ Test 13: Content Expiry Job

The content expiry job runs daily at 2:00 AM UTC to automatically expire content items with `expiry_date <= now`.

**Manual Invocation:**

```bash
# Get Lambda function name from CDK outputs
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ExpiryJobLambdaFunctionName`].OutputValue' \
  --output text)

# Invoke the Lambda function
aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  response.json

# Check the response
cat response.json | jq '.'
```

**Expected Result:**
- ✅ Lambda executes successfully
- ✅ Returns summary: `{ scanned, expired, skipped, errors }`
- ✅ Content items with `expiry_date <= now` are expired
- ✅ Notifications created for subscribers and downloaders

**Verify Expiry:**
1. Create content with `expiry_date` in the past
2. Manually invoke expiry job
3. Check content status changed to "Expired"
4. Check notifications created for matching users

### ✅ Test 12: Brain Document Upload and Ingestion (Contributor+)

1. Sign in as a Contributor user
2. Navigate to **"Brain"** in the sidebar (should be visible for Contributor+)
3. Click **"Upload Source"** button
4. Fill in the form:
   - Title: "Test Enablement Document"
   - Product Suite: "CRM" (optional)
   - Product Concept: "Contacts" (optional)
   - Tags: "test, onboarding" (comma-separated)
   - Select a text file (.txt or .md)
5. Click **"Upload & Ingest"**
6. **Verify**: 
   - Document appears in the list with status "Uploaded" or "Ingesting"
   - After a few seconds, status changes to "Ready" (or "Failed" if error)
   - Chunk count is displayed if ingestion succeeded
7. Click on the document to view details
8. **Verify**: Document detail page shows:
   - Title, status, metadata
   - "Chunks Indexed" count (if Ready)
   - "Test Question" panel is visible (if Ready)

**Expected Result:**
- ✅ Upload dialog works
- ✅ File uploads to S3 successfully
- ✅ Document record created in DynamoDB
- ✅ Ingestion triggered via SQS
- ✅ Status updates to "Ready" after processing
- ✅ Chunks indexed in OpenSearch

**Common Issues:**
- Upload fails → Check S3 bucket permissions and presigned URL expiry
- Ingestion stuck → Check Lambda logs and SQS queue
- Status stays "Ingesting" → Check Lambda function logs for errors

### ✅ Test 13: Assistant Query with RAG (Contributor+)

1. Navigate to a Brain document with status "Ready"
2. In the **"Test Question"** panel, enter a question related to the document content
   - Example: "What is the main topic of this document?"
3. Click **"Ask"**
4. **Verify**:
   - Answer is displayed with relevant information
   - Citations list shows source chunks with snippets
   - Citations are clickable (track click events)
5. Click on a citation
6. **Verify**: Citation click is tracked (check events table or analytics)

**Expected Result:**
- ✅ Query returns an answer
- ✅ Citations are displayed with snippets
- ✅ Citations link to source documents
- ✅ Query event tracked with metadata (has_filters, retrieved_chunks_count, model)
- ✅ Citation click event tracked

**Common Issues:**
- No answer returned → Check OpenSearch collection and index exist
- No citations → Verify embeddings were generated and stored
- Query fails → Check OpenAI API key in SSM and Lambda permissions

### ✅ Test 15: Brain Hardening Checks

1. **File Size Validation:**
   - Try uploading a file > 10MB
   - **Verify**: Request rejected with clear error message

2. **File Type Validation:**
   - Try uploading a PDF or other unsupported type
   - **Verify**: Request rejected with allowed types listed

3. **Document Size Limits:**
   - Upload a very large text file (> 120k tokens when chunked)
   - **Verify**: Document marked as Failed with "document too large" error

4. **OpenSearch Readiness:**
   - After stack deployment, check CloudWatch logs for `OpenSearchIndexBootstrapLambda`
   - **Verify**: Index created successfully (or already exists message)
   - Upload a document and trigger ingestion
   - **Verify**: Ingestion succeeds without manual index creation

5. **Error Tracking:**
   - Upload an invalid file or trigger a failure
   - Call `GET /v1/brain/documents/:id/debug` (Admin only)
   - **Verify**: Returns `last_error_code`, `last_error_message`, `last_error_at`

6. **Query Safety:**
   - Query assistant with no matching documents
   - **Verify**: Returns "I don't have that information..." (not hallucinated answer)
   - Query with matching documents
   - **Verify**: Answer includes citations, `retrieved_chunks_count` is returned

7. **Ingestion Events:**
   - Upload and ingest a document
   - Check events table for:
     - `brain_document_ingest_started`
     - `brain_document_ingest_completed` (with chunk_count, duration_ms)
   - Trigger a failure
   - **Verify**: `brain_document_ingest_failed` event with error_code

**Expected Result:**
- ✅ File validation prevents oversized/unsupported files
- ✅ Document size limits enforced
- ✅ OpenSearch index auto-created on deploy
- ✅ Ingestion retries gracefully if OpenSearch not ready
- ✅ Error tracking provides actionable debug info
- ✅ Assistant refuses to hallucinate
- ✅ Ingestion events tracked for observability

### ✅ Test 16: Brain Lifecycle Management (Approver+)

1. **Expire Document:**
   - Navigate to a Ready brain document
   - Click "Expire" button (Approver+)
   - Confirm in dialog
   - **Verify**: Status changes to Expired, vectors removed from search
   - **Verify**: Notification created for users who cited it

2. **Set Expiry Date:**
   - Navigate to a Ready brain document
   - Set `expires_at` date (Approver+)
   - Save
   - **Verify**: Date saved and displayed

3. **Reindex Document:**
   - Navigate to a Ready brain document
   - Click "Reindex" button (Approver+)
   - **Verify**: Status changes to Ingesting, then Ready
   - **Verify**: `last_ingest_at` updated
   - **Verify**: Vectors updated in OpenSearch

4. **Replace Source:**
   - Navigate to a Ready brain document (Contributor+)
   - Click "Replace Source" button
   - **Verify**: New document created with incremented revision
   - **Verify**: Old document shows `replaced_by_doc_id` link
   - Upload file to new document and ingest
   - **Verify**: New revision works independently

5. **Scheduled Expiry:**
   - Create a document with `expires_at` in the past
   - Manually invoke expiry Lambda:
     ```bash
     ./infra/scripts/invoke-expire-brain-docs.sh
     ```
   - **Verify**: Document expired automatically
   - **Verify**: Notifications created

**Expected Result:**
- ✅ Expire removes document from search results
- ✅ Expiry date can be set and saved
- ✅ Reindex updates vectors and timestamps
- ✅ Replace creates new revision with audit trail
- ✅ Scheduled expiry runs daily and expires overdue docs
- ✅ All lifecycle actions tracked via telemetry

### ✅ Test 14: Verify Brain Telemetry Events

1. Check events table or analytics overview:
   ```bash
   # Get events table name
   EVENTS_TABLE=$(aws cloudformation describe-stacks \
     --stack-name EnablementPortalStack \
     --query 'Stacks[0].Outputs[?OutputKey==`EventsTableName`].OutputValue' \
     --output text)

   # Query recent brain events
   aws dynamodb scan \
     --table-name $EVENTS_TABLE \
     --filter-expression "contains(event_name, :prefix)" \
     --expression-attribute-values '{":prefix":{"S":"brain_"}}' \
     --query 'Items[*].[event_name.S,metadata.M]' \
     --output table
   ```

2. **Verify** events are present:
   - `brain_document_created`
   - `brain_document_upload_started`
   - `brain_document_upload_completed`
   - `brain_document_ingest_requested`
   - `brain_document_viewed`
   - `assistant_query`
   - `assistant_citation_click`

**Expected Result:**
- ✅ All brain-related events are tracked
- ✅ Event metadata includes doc_id, status, file_size, etc.
- ✅ Query events include retrieved_chunks_count and model

### ✅ Test 17: PDF Upload Ingestion (Contributor+)

1. Sign in as a Contributor user
2. Navigate to **"Brain"** page
3. Click **"Upload Source"** button
4. Select **"PDF"** as source type
5. Fill in the form:
   - Title: "Test PDF Document"
   - Product Suite: "CRM" (optional)
   - Select a PDF file (< 25MB)
6. Click **"Upload & Ingest"**
7. **Verify**:
   - Document appears with status "Uploaded" or "Ingesting"
   - After processing, status changes to "Ready" (or "Failed" if extraction fails)
   - If Ready: chunk_count is displayed
   - If Failed: error_message shows `PDF_TEXT_EXTRACTION_FAILED` if text extraction failed
8. Navigate to document detail page
9. **Verify**:
   - Source type shows "upload:pdf"
   - Source filename displayed
   - Extraction method shows "pdf-parse"
   - Extracted character count displayed (if successful)

**Expected Result:**
- ✅ PDF uploads accepted (up to 25MB)
- ✅ PDF text extraction works for text-based PDFs
- ✅ Image-based PDFs fail gracefully with clear error message
- ✅ Extraction metadata stored correctly

**Common Issues:**
- PDF extraction fails → Check if PDF is image-based (requires OCR, not yet supported)
- File too large → Verify 25MB limit for PDFs

### ✅ Test 18: URL Ingestion (Contributor+)

1. Sign in as a Contributor user
2. Navigate to **"Brain"** page
3. Click **"Upload Source"** button
4. Select **"Web Page"** as source type
5. Fill in the form:
   - Title: "Test Web Page"
   - URL: Enter a valid HTTPS URL (e.g., `https://example.com/docs`)
   - Product Suite: "Platform" (optional)
6. Click **"Add & Ingest"**
7. **Verify**:
   - Document created without file upload
   - Status changes to "Ingesting" then "Ready"
   - Source URL displayed in document detail
8. Navigate to document detail page (as Approver/Admin)
9. **Verify**:
   - Source type shows "url:web"
   - Source URL displayed and clickable
   - Extraction method shows "html-to-text"
   - Extracted character count displayed
   - Snapshot files info shown (Admin/Approver only)

**Expected Result:**
- ✅ URL ingestion works without file upload
- ✅ HTML converted to text successfully
- ✅ Snapshots stored in S3 (`brain/{docId}/snapshot.html` and `snapshot.txt`)
- ✅ Extraction metadata stored correctly

**Common Issues:**
- URL fetch fails → Check URL is accessible and uses HTTPS
- Timeout → Verify URL responds within 30 seconds

### ✅ Test 19: Strict Scope Enforcement

1. Navigate to **"AI Assistant"** page
2. **Verify**: Product scope selectors are visible
3. Try to send a query **without** selecting product scope
4. **Verify**: Error message displayed: "Product scope required..."
5. Select a Product Suite (e.g., "CRM")
6. Send a query
7. **Verify**: Query succeeds
8. **Verify**: Scope selection persisted (refresh page, scope still selected)
9. Clear scope selection
10. Try to send another query
11. **Verify**: Error again (strict scope enforced)
12. Set `strict_scope=false` via API (if testing API directly):
    ```bash
    curl -X POST $API_URL/v1/assistant/query \
      -H "Authorization: Bearer TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "query": "test query",
        "strict_scope": false
      }'
    ```
13. **Verify**: Query succeeds without scope

**Expected Result:**
- ✅ Strict scoping enforced by default
- ✅ UI requires scope selection before querying
- ✅ Scope persisted in local storage
- ✅ API returns `SCOPE_REQUIRED` error when scope missing and strict_scope=true
- ✅ Setting strict_scope=false allows queries without scope

**Common Issues:**
- Scope not persisted → Check browser local storage
- Error not shown → Verify API returns proper error code

### ✅ Test 20: Video Link Creation and Publishing

1. Navigate to **Reels** page (Contributor+)
2. Create a new video link:
   - Click **"Add Video"** or similar
   - Enter:
     - Title: "Test YouTube Video"
     - URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (or any valid YouTube URL)
     - Product Suite: "CRM"
     - Product Concept: "Contacts"
     - Persona Tags: ["AE"]
   - Save as Draft
3. **Verify**: Video link created with provider="youtube" and embed_url derived
4. As Approver, publish the video link
5. **Verify**: Video appears in Reels feed with Published status
6. **Verify**: Subscribers matching product/persona receive notification

**Expected Result:**
- ✅ Video link created with correct provider detection
- ✅ Embed URL derived for YouTube
- ✅ Publish works and sets published_at/by
- ✅ Notifications sent to matching subscribers

### ✅ Test 21: Learning Path Creation and Publishing

1. Navigate to **Learning Paths** page (Contributor+)
2. Create a new learning path:
   - Click **"Create Path"**
   - Enter:
     - Title: "Test Learning Path"
     - Description: "Test path description"
     - Product Suite: "CRM"
     - Product Concept: "Contacts"
     - Persona Tags: ["AE"]
     - Steps:
       - Step 1: type="content", ref_id=<existing_content_id>
       - Step 2: type="video_link", ref_id=<existing_video_id>
   - Save as Draft
3. **Verify**: Path created with steps
4. As Approver, publish the path
5. **Verify**: All step ref_ids validated (should fail if invalid)
6. **Verify**: Path appears in Paths feed with Published status
7. **Verify**: Subscribers matching product/persona receive notification

**Expected Result:**
- ✅ Path created with steps
- ✅ Step validation on publish (fails if ref_id doesn't exist)
- ✅ Publish works and sets published_at/by
- ✅ Notifications sent to matching subscribers

### ✅ Test 22: Progress Tracking

1. Navigate to a published learning path
2. Click **"Start Path"** or open path detail
3. **Verify**: `path_started` event tracked
4. Mark first step as complete
5. **Verify**: Step shows as completed
6. **Verify**: Progress percentage updates
7. **Verify**: `step_completed` event tracked
8. Navigate back to Paths page
9. **Verify**: Path appears in "Continue Where You Left Off" section
10. **Verify**: Progress bar shows correct percentage

**Expected Result:**
- ✅ Path started event tracked
- ✅ Step completion works
- ✅ Progress saved and displayed correctly
- ✅ Continue section shows in-progress paths

### ✅ Test 23: Path Update Notifications

1. As Contributor, update a published learning path (add/remove steps or change description)
2. **Verify**: Users who started the path receive notification
3. **Verify**: Notification ID format: `path_updated:{path_id}:{user_id}`
4. **Verify**: Notification shows path title and update message

**Expected Result:**
- ✅ Update notifications sent to users with progress
- ✅ Deterministic notification IDs prevent duplicates
- ✅ Notification content is accurate

### ✅ Test 24: Landing Page and Auth Gating (Phase 5.2)

1. **Unauthenticated Landing Page:**
   - Open app in incognito/private window (or sign out)
   - Navigate to root URL (`/`)
   - **Verify**: Landing page displays (no SideNav, no app chrome)
   - **Verify**: Hero image displays (Ivy & Ocelot launch image)
   - **Verify**: "Sign in with Google" button is prominent
   - **Verify**: Feature cards display with images
   - **Verify**: Troubleshooting link is visible

2. **Protected Route Redirect:**
   - While logged out, navigate directly to `/enablement/content`
   - **Verify**: Redirects to `/login?returnTo=/enablement/content`
   - **Verify**: Landing page displays (not app shell)
   - **Verify**: URL contains correct `returnTo` parameter

3. **Sign In Flow:**
   - Click "Sign in with Google" on landing page
   - Complete Google OAuth flow
   - **Verify**: Redirects back to original URL (`/enablement/content` in this case)
   - **Verify**: App shell (SideNav, Header) is now visible
   - **Verify**: User is authenticated

4. **Root Route Behavior:**
   - While logged out, navigate to `/`
   - **Verify**: Landing page displays
   - Sign in
   - **Verify**: Redirects to `/enablement` (default route)
   - While logged in, navigate to `/`
   - **Verify**: Redirects to `/enablement` (does not show landing page)

5. **Login Route:**
   - Navigate to `/login` while logged out
   - **Verify**: Landing page displays
   - Navigate to `/login?returnTo=/enablement/paths` while logged out
   - **Verify**: Landing page displays with returnTo preserved
   - Sign in
   - **Verify**: Redirects to `/enablement/paths` after login

6. **No Flash of App Shell:**
   - Clear browser cache and cookies
   - Navigate to `/enablement/content` while logged out
   - **Verify**: No SideNav or app chrome flashes before redirect
   - **Verify**: Loading state shows briefly, then redirects to login

7. **Troubleshooting Dialog:**
   - On landing page, click "Having trouble signing in?"
   - **Verify**: Dialog opens with troubleshooting steps
   - **Verify**: Steps include cookies, popup blockers, domain allowlist
   - Close dialog
   - **Verify**: Dialog closes properly

8. **Telemetry Events:**
   - Check browser console (dev mode) or events table:
   - **Verify**: `landing_viewed` event fired when landing page loads
   - **Verify**: `login_cta_clicked` event fired with `provider: "google"` when button clicked
   - **Verify**: `login_success` event fired after successful OAuth redirect
   - **Verify**: `login_failed` event fired (if login fails) with `error_code`

9. **Image Assets:**
   - Inspect landing page images in browser DevTools
   - **Verify**: Images load from local assets (`/src/assets/landing/`)
   - **Verify**: No external URLs to gravyty.com in image sources
   - **Verify**: Images display correctly (hero and feature cards)

**Expected Result:**
- ✅ Unauthenticated users see landing page (no app shell)
- ✅ Protected routes redirect to `/login` with `returnTo`
- ✅ After login, users redirected to original URL
- ✅ Root route shows landing page when logged out, redirects when logged in
- ✅ No flash of app shell during auth check
- ✅ Troubleshooting dialog works
- ✅ Telemetry events fire correctly
- ✅ Images are repo-local (not hotlinked)

**Common Issues:**
- App shell flashes → Check RequireAuth loading state
- returnTo not working → Verify sessionStorage is set before OAuth redirect
- Images not loading → Check image imports and Vite asset handling
- Telemetry not firing → Check browser console for errors

## Related Documentation

- [Amplify Deployment](./amplify-deploy.md)
- [CDK Deployment](./cdk-deployment.md)
- [API Contract](../architecture/api-contract.md)
- [Authentication Architecture](../architecture/auth.md)
- [RAG Architecture](../architecture/rag.md)


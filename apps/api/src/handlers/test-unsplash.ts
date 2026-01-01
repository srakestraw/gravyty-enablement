/**
 * Test Script for Unsplash API Integration
 * 
 * Tests Unsplash API access and endpoints (search and trending)
 * 
 * Usage:
 *   npm run test:unsplash
 *   or
 *   npx tsx apps/api/src/handlers/test-unsplash.ts
 */

import { ssmClient } from '../aws/ssmClient';
import { GetParameterCommand } from '@aws-sdk/client-ssm';

/**
 * Get Unsplash Access Key from SSM
 */
async function getUnsplashAccessKey(): Promise<string> {
  try {
    const command = new GetParameterCommand({
      Name: '/enablement-portal/unsplash/access-key',
      WithDecryption: true,
    });
    const response = await ssmClient.send(command);
    const accessKey = response.Parameter?.Value?.trim();

    if (!accessKey || accessKey === 'REPLACE_WITH_UNSPLASH_ACCESS_KEY') {
      throw new Error('Unsplash access key not configured in SSM Parameter Store');
    }

    return accessKey;
  } catch (error) {
    throw new Error(`Failed to retrieve Unsplash access key from SSM: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Test Unsplash API authentication and basic connectivity
 */
async function testUnsplashAuthentication() {
  console.log('\n=== Testing Unsplash API Authentication ===\n');

  try {
    const accessKey = await getUnsplashAccessKey();
    console.log(`✅ Retrieved Access Key from SSM (length: ${accessKey.length}, prefix: ${accessKey.substring(0, 10)}...)`);

    // Test with a simple endpoint - get a single random photo
    const testUrl = 'https://api.unsplash.com/photos/random';
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Authentication successful!`);
    console.log(`   Photo ID: ${data.id}`);
    console.log(`   Photographer: ${data.user.name} (@${data.user.username})`);
    console.log(`   Description: ${data.description || 'No description'}`);
    
    // Check rate limit headers
    const rateLimit = response.headers.get('X-Ratelimit-Limit');
    const rateLimitRemaining = response.headers.get('X-Ratelimit-Remaining');
    if (rateLimit) {
      console.log(`   Rate Limit: ${rateLimitRemaining}/${rateLimit} requests remaining`);
    }

    return true;
  } catch (error) {
    console.error('❌ Authentication test failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Test Unsplash Search API
 */
async function testUnsplashSearch() {
  console.log('\n=== Testing Unsplash Search API ===\n');

  try {
    const accessKey = await getUnsplashAccessKey();
    const query = 'nature';
    const page = 1;
    const perPage = 5;
    const orientation = 'landscape';

    const searchUrl = new URL('https://api.unsplash.com/search/photos');
    searchUrl.searchParams.set('query', query);
    searchUrl.searchParams.set('page', page.toString());
    searchUrl.searchParams.set('per_page', perPage.toString());
    searchUrl.searchParams.set('orientation', orientation);

    console.log(`Searching for: "${query}" (page ${page}, ${perPage} per page, ${orientation} orientation)`);
    
    const response = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Search successful!`);
    console.log(`   Total results: ${data.total}`);
    console.log(`   Total pages: ${data.total_pages}`);
    console.log(`   Results returned: ${data.results.length}`);

    if (data.results.length > 0) {
      const firstPhoto = data.results[0];
      console.log(`\n   First result:`);
      console.log(`   - ID: ${firstPhoto.id}`);
      console.log(`   - Photographer: ${firstPhoto.user.name} (@${firstPhoto.user.username})`);
      console.log(`   - Description: ${firstPhoto.description || firstPhoto.alt_description || 'No description'}`);
      console.log(`   - Dimensions: ${firstPhoto.width}x${firstPhoto.height}`);
      console.log(`   - URLs available: ${Object.keys(firstPhoto.urls).join(', ')}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Search test failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Test Unsplash Trending Photos API
 */
async function testUnsplashTrending() {
  console.log('\n=== Testing Unsplash Trending Photos API ===\n');

  try {
    const accessKey = await getUnsplashAccessKey();
    const page = 1;
    const perPage = 5;

    const trendingUrl = new URL('https://api.unsplash.com/photos');
    trendingUrl.searchParams.set('order_by', 'popular');
    trendingUrl.searchParams.set('page', page.toString());
    trendingUrl.searchParams.set('per_page', perPage.toString());
    trendingUrl.searchParams.set('orientation', 'landscape');

    console.log(`Fetching trending photos (page ${page}, ${perPage} per page, landscape orientation)`);
    
    const response = await fetch(trendingUrl.toString(), {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const photos = Array.isArray(data) ? data : [];
    
    console.log(`✅ Trending photos fetched successfully!`);
    console.log(`   Photos returned: ${photos.length}`);

    if (photos.length > 0) {
      const firstPhoto = photos[0];
      console.log(`\n   First photo:`);
      console.log(`   - ID: ${firstPhoto.id}`);
      console.log(`   - Photographer: ${firstPhoto.user.name} (@${firstPhoto.user.username})`);
      console.log(`   - Description: ${firstPhoto.description || firstPhoto.alt_description || 'No description'}`);
      console.log(`   - Dimensions: ${firstPhoto.width}x${firstPhoto.height}`);
      console.log(`   - Created: ${firstPhoto.created_at}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Trending photos test failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Test error handling for invalid requests
 */
async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===\n');

  try {
    const accessKey = await getUnsplashAccessKey();

    // Test with invalid query (empty query should still work but return empty results)
    const searchUrl = new URL('https://api.unsplash.com/search/photos');
    searchUrl.searchParams.set('query', '');
    searchUrl.searchParams.set('per_page', '1');

    const response = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Empty query handled correctly (returned ${data.total} results)`);
    } else {
      console.log(`⚠️  Empty query returned ${response.status} (this is acceptable)`);
    }

    // Test with invalid per_page (should be capped by API)
    const invalidUrl = new URL('https://api.unsplash.com/search/photos');
    invalidUrl.searchParams.set('query', 'test');
    invalidUrl.searchParams.set('per_page', '1000'); // Way over limit

    const invalidResponse = await fetch(invalidUrl.toString(), {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });

    if (invalidResponse.ok) {
      const invalidData = await invalidResponse.json();
      console.log(`✅ Invalid per_page handled (API likely capped it, returned ${invalidData.results?.length || 0} results)`);
    } else {
      console.log(`⚠️  Invalid per_page returned ${invalidResponse.status} (this is acceptable)`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error handling test failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting Unsplash API Tests\n');
  console.log('='.repeat(60));

  const results = {
    authentication: false,
    search: false,
    trending: false,
    errorHandling: false,
  };

  // Test authentication first (required for all other tests)
  results.authentication = await testUnsplashAuthentication();

  if (!results.authentication) {
    console.log('\n❌ Authentication failed. Cannot proceed with other tests.');
    console.log('\n📋 Troubleshooting Steps:');
    console.log('   1. Verify your Unsplash Access Key is correct in SSM Parameter Store');
    console.log('      Parameter: /enablement-portal/unsplash/access-key');
    console.log('   2. Check your Unsplash developer account: https://unsplash.com/developers');
    console.log('   3. Verify the Access Key matches what\'s shown in your application\'s "Keys" page');
    console.log('   4. Ensure your application is not in demo mode (if you need higher rate limits)');
    console.log('   5. Try regenerating the Access Key if it may have expired');
    console.log('\n💡 According to Unsplash API docs:');
    console.log('   - Use "Client-ID" header format: Authorization: Client-ID YOUR_ACCESS_KEY');
    console.log('   - Access Key is used for public API access (no OAuth required)');
    console.log('   - Application ID (851053) is different from Access Key');
    process.exit(1);
  }

  // Run other tests
  results.search = await testUnsplashSearch();
  results.trending = await testUnsplashTrending();
  results.errorHandling = await testErrorHandling();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');
  console.log(`   Authentication: ${results.authentication ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Search API:      ${results.search ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Trending API:    ${results.trending ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Error Handling:  ${results.errorHandling ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    console.log('\n✅ All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }

  console.log('\n' + '='.repeat(60));
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runTests };


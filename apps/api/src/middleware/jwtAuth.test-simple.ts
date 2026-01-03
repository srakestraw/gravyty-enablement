/**
 * Simple test to verify group extraction and role determination
 * Run with: tsx src/middleware/jwtAuth.test-simple.ts
 */

// Import the functions we want to test
// For now, copy the logic here to test independently

function extractGroupsFromPayload(payload: any): string[] {
  if (payload['cognito:groups']) {
    const groups = payload['cognito:groups'];
    if (Array.isArray(groups)) {
      return groups.map(g => String(g).trim()).filter(Boolean);
    }
    return [String(groups).trim()].filter(Boolean);
  }
  
  if (payload.groups) {
    const groups = payload.groups;
    if (Array.isArray(groups)) {
      return groups.map(g => String(g).trim()).filter(Boolean);
    }
    return [String(groups).trim()].filter(Boolean);
  }
  
  return [];
}

function determineRoleFromGroups(groups: string[]): 'Viewer' | 'Contributor' | 'Approver' | 'Admin' {
  if (groups.length === 0) {
    return 'Viewer';
  }
  
  const lowerGroups = groups.map(g => g.toLowerCase());
  
  if (lowerGroups.includes('admin')) {
    return 'Admin';
  }
  if (lowerGroups.includes('approver')) {
    return 'Approver';
  }
  if (lowerGroups.includes('contributor')) {
    return 'Contributor';
  }
  if (lowerGroups.includes('viewer')) {
    return 'Viewer';
  }
  
  return 'Viewer';
}

// Test cases
console.log('🧪 Testing Group Extraction and Role Determination\n');

// Test 1: Standard Cognito groups array
const test1 = {
  'cognito:groups': ['Admin', 'us-east-1_xBNZh7TaB_Google'],
};
const groups1 = extractGroupsFromPayload(test1);
const role1 = determineRoleFromGroups(groups1);
console.log('Test 1 - Standard Cognito groups:');
console.log('  Input:', test1);
console.log('  Groups extracted:', groups1);
console.log('  Role:', role1);
console.log('  ✅ Expected: Admin, Got:', role1, role1 === 'Admin' ? '✅' : '❌');
console.log('');

// Test 2: Single group
const test2 = {
  'cognito:groups': ['Admin'],
};
const groups2 = extractGroupsFromPayload(test2);
const role2 = determineRoleFromGroups(groups2);
console.log('Test 2 - Single Admin group:');
console.log('  Input:', test2);
console.log('  Groups extracted:', groups2);
console.log('  Role:', role2);
console.log('  ✅ Expected: Admin, Got:', role2, role2 === 'Admin' ? '✅' : '❌');
console.log('');

// Test 3: Lowercase admin
const test3 = {
  'cognito:groups': ['admin', 'other-group'],
};
const groups3 = extractGroupsFromPayload(test3);
const role3 = determineRoleFromGroups(groups3);
console.log('Test 3 - Lowercase admin:');
console.log('  Input:', test3);
console.log('  Groups extracted:', groups3);
console.log('  Role:', role3);
console.log('  ✅ Expected: Admin, Got:', role3, role3 === 'Admin' ? '✅' : '❌');
console.log('');

// Test 4: No groups
const test4 = {};
const groups4 = extractGroupsFromPayload(test4);
const role4 = determineRoleFromGroups(groups4);
console.log('Test 4 - No groups:');
console.log('  Input:', test4);
console.log('  Groups extracted:', groups4);
console.log('  Role:', role4);
console.log('  ✅ Expected: Viewer, Got:', role4, role4 === 'Viewer' ? '✅' : '❌');
console.log('');

// Test 5: Groups claim (not cognito:groups)
const test5 = {
  groups: ['Admin'],
};
const groups5 = extractGroupsFromPayload(test5);
const role5 = determineRoleFromGroups(groups5);
console.log('Test 5 - Groups claim (not cognito:groups):');
console.log('  Input:', test5);
console.log('  Groups extracted:', groups5);
console.log('  Role:', role5);
console.log('  ✅ Expected: Admin, Got:', role5, role5 === 'Admin' ? '✅' : '❌');
console.log('');

console.log('✅ All tests completed!');


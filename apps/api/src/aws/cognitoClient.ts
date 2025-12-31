/**
 * Cognito Client
 * 
 * Wrapper around AWS Cognito Identity Provider SDK
 * Provides helper functions for user and group management
 */

import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminEnableUserCommand,
  AdminDisableUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminListGroupsForUserCommand,
  UserType,
} from '@aws-sdk/client-cognito-identity-provider';
import { AdminUser, UserRole, CognitoUserStatus } from '@gravyty/domain';

const region = process.env.AWS_REGION || 'us-east-1';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || '';

// Create Cognito client
// AWS SDK will automatically use AWS_PROFILE from environment if set
const cognitoClient = USER_POOL_ID
  ? new CognitoIdentityProviderClient({ region })
  : null;


/**
 * Check if Cognito is configured
 */
export function isCognitoConfigured(): boolean {
  return !!USER_POOL_ID && !!cognitoClient;
}

/**
 * Convert Cognito UserType to AdminUser
 */
function cognitoUserToAdminUser(user: UserType, groups: string[] = []): AdminUser {
  const attributes = user.Attributes || [];
  const emailAttr = attributes.find(attr => attr.Name === 'email');
  const nameAttr = attributes.find(attr => attr.Name === 'name');
  const email = emailAttr?.Value || '';
  
  // Determine role from groups (highest precedence)
  let role: UserRole = 'Viewer';
  if (groups.includes('Admin')) role = 'Admin';
  else if (groups.includes('Approver')) role = 'Approver';
  else if (groups.includes('Contributor')) role = 'Contributor';
  else if (groups.includes('Viewer')) role = 'Viewer';

  return {
    username: user.Username || '',
    email,
    name: nameAttr?.Value,
    role,
    enabled: user.Enabled !== false,
    user_status: (user.UserStatus as CognitoUserStatus) || 'UNCONFIRMED',
    created_at: user.UserCreateDate?.toISOString() || new Date().toISOString(),
    modified_at: user.UserLastModifiedDate?.toISOString() || new Date().toISOString(),
    groups,
  };
}

/**
 * List users from Cognito
 */
export async function listUsers(options: {
  query?: string;
  limit?: number;
  paginationToken?: string;
}): Promise<{
  users: AdminUser[];
  paginationToken?: string;
}> {
  if (!isCognitoConfigured()) {
    throw new Error('Cognito is not configured. COGNITO_USER_POOL_ID must be set.');
  }

  const { query, limit = 50, paginationToken } = options;

  try {
    const command = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: limit,
      PaginationToken: paginationToken,
      Filter: query ? `email ^= "${query}" OR username ^= "${query}"` : undefined,
    });

    const response = await cognitoClient!.send(command);

    // Fetch groups for each user
    const usersWithGroups = await Promise.all(
      (response.Users || []).map(async (user) => {
        const groups = await listGroupsForUser(user.Username || '');
        return cognitoUserToAdminUser(user, groups);
      })
    );

    return {
      users: usersWithGroups,
      paginationToken: response.PaginationToken,
    };
  } catch (error) {
    // Provide helpful error message for credential issues
    if (error instanceof Error && (
      error.message.includes('credentials') ||
      error.message.includes('CredentialsProviderError') ||
      error.name === 'CredentialsProviderError'
    )) {
      console.error('[Cognito] AWS credentials not configured. Set AWS_PROFILE or AWS credentials.');
      throw new Error('AWS credentials not configured. Please configure AWS_PROFILE or AWS credentials to access Cognito users.');
    }
    console.error('[Cognito] Error listing users:', error);
    throw error;
  }
}

/**
 * Create user invite (admin create user)
 */
export async function adminCreateUserInvite(
  email: string,
  name?: string
): Promise<AdminUser> {
  if (!isCognitoConfigured()) {
    throw new Error('Cognito is not configured. COGNITO_USER_POOL_ID must be set.');
  }

  try {
    const attributes: { Name: string; Value: string }[] = [
      { Name: 'email', Value: email },
    ];
    if (name) {
      attributes.push({ Name: 'name', Value: name });
    }

    const command = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: attributes,
      MessageAction: 'SUPPRESS', // Don't send welcome email (we'll handle invitation separately)
      DesiredDeliveryMediums: ['EMAIL'],
    });

    const response = await cognitoClient!.send(command);
    const user = response.User;

    if (!user || !user.Username) {
      throw new Error('Failed to create user');
    }

    // User is created with no groups by default, so we'll return with empty groups
    // The caller should set the role/group after creation
    return cognitoUserToAdminUser(user, []);
  } catch (error) {
    console.error('[Cognito] Error creating user:', error);
    throw error;
  }
}

/**
 * List groups for a user
 */
export async function listGroupsForUser(username: string): Promise<string[]> {
  if (!isCognitoConfigured()) {
    throw new Error('Cognito is not configured. COGNITO_USER_POOL_ID must be set.');
  }

  try {
    const command = new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    });

    const response = await cognitoClient!.send(command);
    return (response.Groups || []).map(group => group.GroupName || '').filter(Boolean);
  } catch (error) {
    console.error(`[Cognito] Error listing groups for user ${username}:`, error);
    // Return empty array if user doesn't exist or has no groups
    return [];
  }
}

/**
 * Set single role group for a user
 * Removes user from all role groups (Viewer, Contributor, Approver, Admin) and adds to target group
 */
export async function setSingleRoleGroup(username: string, role: UserRole): Promise<void> {
  if (!isCognitoConfigured()) {
    throw new Error('Cognito is not configured. COGNITO_USER_POOL_ID must be set.');
  }

  try {
    // Get current groups
    const currentGroups = await listGroupsForUser(username);

    // Role groups to check/remove
    const roleGroups: UserRole[] = ['Viewer', 'Contributor', 'Approver', 'Admin'];

    // Remove user from all role groups
    for (const groupName of roleGroups) {
      if (currentGroups.includes(groupName)) {
        const removeCommand = new AdminRemoveUserFromGroupCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
          GroupName: groupName,
        });
        await cognitoClient!.send(removeCommand);
      }
    }

    // Add user to target role group
    const addCommand = new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: role,
    });
    await cognitoClient!.send(addCommand);
  } catch (error) {
    console.error(`[Cognito] Error setting role group for user ${username}:`, error);
    throw error;
  }
}

/**
 * Enable a user
 */
export async function adminEnableUser(username: string): Promise<void> {
  if (!isCognitoConfigured()) {
    throw new Error('Cognito is not configured. COGNITO_USER_POOL_ID must be set.');
  }

  try {
    const command = new AdminEnableUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    });
    await cognitoClient!.send(command);
  } catch (error) {
    console.error(`[Cognito] Error enabling user ${username}:`, error);
    throw error;
  }
}

/**
 * Disable a user
 */
export async function adminDisableUser(username: string): Promise<void> {
  if (!isCognitoConfigured()) {
    throw new Error('Cognito is not configured. COGNITO_USER_POOL_ID must be set.');
  }

  try {
    const command = new AdminDisableUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    });
    await cognitoClient!.send(command);
  } catch (error) {
    console.error(`[Cognito] Error disabling user ${username}:`, error);
    throw error;
  }
}

/**
 * Get a single user by username
 */
export async function getUserByUsername(username: string): Promise<AdminUser | null> {
  if (!isCognitoConfigured()) {
    throw new Error('Cognito is not configured. COGNITO_USER_POOL_ID must be set.');
  }

  try {
    const command = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    });

    const response = await cognitoClient!.send(command);
    const user = response;

    if (!user || !user.Username) {
      return null;
    }

    const groups = await listGroupsForUser(username);
    
    // Convert AdminGetUserResponse to UserType-like object
    const userType: UserType = {
      Username: user.Username,
      Attributes: user.UserAttributes?.map(attr => ({
        Name: attr.Name || '',
        Value: attr.Value || '',
      })) || [],
      UserCreateDate: user.UserCreateDate,
      UserLastModifiedDate: user.UserLastModifiedDate,
      Enabled: user.Enabled,
      UserStatus: user.UserStatus as any,
    };
    
    return cognitoUserToAdminUser(userType, groups);
  } catch (error) {
    console.error(`[Cognito] Error getting user ${username}:`, error);
    // Return null if user doesn't exist
    if (error instanceof Error && error.name === 'UserNotFoundException') {
      return null;
    }
    throw error;
  }
}

// Note: Stub users are initialized lazily when dev fallback is used
// This allows them to work even when USER_POOL_ID is set but credentials aren't available


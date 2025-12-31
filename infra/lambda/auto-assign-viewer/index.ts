/**
 * Cognito Post-Authentication Lambda Trigger
 * 
 * Automatically assigns @gravyty.com users to Viewer group if they're not already in a role group
 */

import {
  CognitoIdentityProviderClient,
  AdminListGroupsForUserCommand,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({});

// Role groups in precedence order
const ROLE_GROUPS = ['Admin', 'Approver', 'Contributor', 'Viewer'];

interface PostAuthenticationEvent {
  version: string;
  region: string;
  userPoolId: string;
  userName: string;
  triggerSource: string;
  request: {
    userAttributes: {
      email?: string;
      name?: string;
      [key: string]: string | undefined;
    };
    newDeviceUsed?: boolean;
  };
  response: {};
}

export const handler = async (event: PostAuthenticationEvent) => {
  console.log('Post-authentication trigger event:', JSON.stringify(event, null, 2));

  const userPoolId = event.userPoolId;
  const username = event.userName;
  const email = event.request.userAttributes.email;

  if (!email) {
    console.log('No email found in user attributes, skipping auto-assignment');
    return event;
  }

  // Extract domain from email
  const emailDomain = email.split('@')[1]?.toLowerCase();

  if (!emailDomain) {
    console.log('Invalid email format:', email);
    return event;
  }

  // Only auto-assign for @gravyty.com users
  if (emailDomain !== 'gravyty.com') {
    console.log('Email domain is not @gravyty.com, skipping auto-assignment:', emailDomain);
    return event;
  }

  console.log('Processing @gravyty.com user:', username, email);

  try {
    // Get user's current groups
    const listGroupsCommand = new AdminListGroupsForUserCommand({
      UserPoolId: userPoolId,
      Username: username,
    });

    const groupsResponse = await cognitoClient.send(listGroupsCommand);
    const currentGroups = (groupsResponse.Groups || []).map(g => g.GroupName || '').filter(Boolean);
    
    console.log('Current groups for user:', currentGroups);

    // Check if user is already in any role group
    const hasRoleGroup = ROLE_GROUPS.some(roleGroup => currentGroups.includes(roleGroup));

    if (hasRoleGroup) {
      console.log('User already has a role group, skipping auto-assignment');
      return event;
    }

    // User doesn't have a role group, add them to Viewer
    console.log('Adding user to Viewer group');
    const addToGroupCommand = new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: username,
      GroupName: 'Viewer',
    });

    await cognitoClient.send(addToGroupCommand);
    console.log('Successfully added user to Viewer group');

  } catch (error) {
    // Log error but don't fail authentication
    console.error('Error auto-assigning Viewer group:', error);
    // Don't throw - we don't want to block authentication if group assignment fails
  }

  return event;
};


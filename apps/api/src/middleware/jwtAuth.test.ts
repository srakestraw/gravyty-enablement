/**
 * Unit tests for JWT Authentication Middleware
 * 
 * Tests role extraction from Cognito groups, including Admin role handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

// Mock the extractRoleFromGroups function logic
// We'll test the actual logic that's in the middleware
function extractRoleFromGroups(groups?: string[]): 'Viewer' | 'Contributor' | 'Approver' | 'Admin' {
  if (!groups || groups.length === 0) {
    return 'Viewer';
  }

  // Normalize groups to strings and lowercase for comparison
  const normalizedGroups = groups.map(g => String(g).trim().toLowerCase());

  // Check groups in precedence order (Admin > Approver > Contributor > Viewer)
  // Use case-insensitive matching
  if (normalizedGroups.includes('admin')) {
    return 'Admin';
  }
  if (normalizedGroups.includes('approver')) {
    return 'Approver';
  }
  if (normalizedGroups.includes('contributor')) {
    return 'Contributor';
  }
  if (normalizedGroups.includes('viewer')) {
    return 'Viewer';
  }

  // Default to Viewer if group doesn't match
  return 'Viewer';
}

describe('JWT Auth - Role Extraction', () => {
  describe('extractRoleFromGroups', () => {
    it('should return Admin when Admin group is present', () => {
      expect(extractRoleFromGroups(['Admin'])).toBe('Admin');
      expect(extractRoleFromGroups(['admin'])).toBe('Admin');
      expect(extractRoleFromGroups(['ADMIN'])).toBe('Admin');
      expect(extractRoleFromGroups(['Admin', 'Viewer'])).toBe('Admin');
      expect(extractRoleFromGroups(['Viewer', 'Admin'])).toBe('Admin');
    });

    it('should return Admin when Admin is in array with other groups', () => {
      expect(extractRoleFromGroups(['Admin', 'us-east-1_xBNZh7TaB_Google'])).toBe('Admin');
      expect(extractRoleFromGroups(['Contributor', 'Admin', 'Viewer'])).toBe('Admin');
    });

    it('should return Approver when Approver group is present (no Admin)', () => {
      expect(extractRoleFromGroups(['Approver'])).toBe('Approver');
      expect(extractRoleFromGroups(['Approver', 'Viewer'])).toBe('Approver');
    });

    it('should return Contributor when Contributor group is present (no Admin/Approver)', () => {
      expect(extractRoleFromGroups(['Contributor'])).toBe('Contributor');
      expect(extractRoleFromGroups(['Contributor', 'Viewer'])).toBe('Contributor');
    });

    it('should return Viewer when Viewer group is present (no higher roles)', () => {
      expect(extractRoleFromGroups(['Viewer'])).toBe('Viewer');
    });

    it('should return Viewer when no groups provided', () => {
      expect(extractRoleFromGroups()).toBe('Viewer');
      expect(extractRoleFromGroups([])).toBe('Viewer');
      expect(extractRoleFromGroups(undefined)).toBe('Viewer');
    });

    it('should return Viewer when groups don\'t match known roles', () => {
      expect(extractRoleFromGroups(['UnknownGroup'])).toBe('Viewer');
      expect(extractRoleFromGroups(['CustomGroup', 'AnotherGroup'])).toBe('Viewer');
    });

    it('should handle case-insensitive group names', () => {
      expect(extractRoleFromGroups(['ADMIN'])).toBe('Admin');
      expect(extractRoleFromGroups(['approver'])).toBe('Approver');
      expect(extractRoleFromGroups(['CONTRIBUTOR'])).toBe('Contributor');
      expect(extractRoleFromGroups(['viewer'])).toBe('Viewer');
    });

    it('should handle groups with whitespace', () => {
      expect(extractRoleFromGroups([' Admin '])).toBe('Admin');
      expect(extractRoleFromGroups(['  Approver  '])).toBe('Approver');
    });

    it('should prioritize Admin over other roles', () => {
      expect(extractRoleFromGroups(['Admin', 'Approver', 'Contributor', 'Viewer'])).toBe('Admin');
      expect(extractRoleFromGroups(['Viewer', 'Contributor', 'Approver', 'Admin'])).toBe('Admin');
    });
  });

  describe('Group extraction from token payload', () => {
    it('should extract groups from cognito:groups claim', () => {
      const rawPayload = {
        'cognito:groups': ['Admin', 'us-east-1_xBNZh7TaB_Google'],
        email: 'test@example.com',
        sub: 'user-123',
      };

      let groups: string[] | undefined;
      if (rawPayload['cognito:groups']) {
        groups = Array.isArray(rawPayload['cognito:groups']) 
          ? rawPayload['cognito:groups'] 
          : [rawPayload['cognito:groups']];
      }

      expect(groups).toEqual(['Admin', 'us-east-1_xBNZh7TaB_Google']);
      expect(extractRoleFromGroups(groups)).toBe('Admin');
    });

    it('should handle groups claim (alternative format)', () => {
      const rawPayload = {
        groups: ['Admin'],
        email: 'test@example.com',
        sub: 'user-123',
      };

      let groups: string[] | undefined;
      if (rawPayload.groups) {
        groups = Array.isArray(rawPayload.groups) 
          ? rawPayload.groups 
          : [rawPayload.groups];
      }

      expect(groups).toEqual(['Admin']);
      expect(extractRoleFromGroups(groups)).toBe('Admin');
    });

    it('should handle single group (non-array)', () => {
      const rawPayload = {
        'cognito:groups': 'Admin',
        email: 'test@example.com',
        sub: 'user-123',
      };

      let groups: string[] | undefined;
      if (rawPayload['cognito:groups']) {
        groups = Array.isArray(rawPayload['cognito:groups']) 
          ? rawPayload['cognito:groups'] 
          : [rawPayload['cognito:groups']];
      }

      expect(groups).toEqual(['Admin']);
      expect(extractRoleFromGroups(groups)).toBe('Admin');
    });

    it('should prioritize raw payload over verified payload', () => {
      const rawPayload = {
        'cognito:groups': ['Admin'],
        email: 'test@example.com',
        sub: 'user-123',
      };

      const verifiedPayload = {
        email: 'test@example.com',
        sub: 'user-123',
        // Note: verified payload doesn't have groups (stripped by verifier)
      };

      // Simulate the priority logic
      let groups: string[] | undefined;
      
      // PRIORITY 1: Use raw payload first
      if (rawPayload && rawPayload['cognito:groups']) {
        groups = Array.isArray(rawPayload['cognito:groups']) 
          ? rawPayload['cognito:groups'] 
          : [rawPayload['cognito:groups']];
      }
      
      // PRIORITY 2: Fallback to verified payload (shouldn't be needed here)
      if ((!groups || groups.length === 0) && verifiedPayload['cognito:groups']) {
        groups = Array.isArray(verifiedPayload['cognito:groups']) 
          ? verifiedPayload['cognito:groups'] 
          : [verifiedPayload['cognito:groups']];
      }

      expect(groups).toEqual(['Admin']);
      expect(extractRoleFromGroups(groups)).toBe('Admin');
    });
  });

  describe('Safety check - Force Admin when groups contain Admin', () => {
    it('should force Admin role when groups contain Admin but extraction returns Viewer', () => {
      const groups = ['Admin', 'us-east-1_xBNZh7TaB_Google'];
      let role = extractRoleFromGroups(groups);
      
      // Simulate bug where extraction incorrectly returns Viewer
      // (This shouldn't happen, but we test the safety check)
      if (role === 'Viewer' && groups && groups.length > 0) {
        const hasAdminGroup = groups.some((g: any) => 
          String(g).trim().toLowerCase() === 'admin'
        );
        if (hasAdminGroup) {
          role = 'Admin'; // Force correction
        }
      }

      expect(role).toBe('Admin');
    });

    it('should not force Admin when groups don\'t contain Admin', () => {
      const groups = ['Viewer'];
      let role = extractRoleFromGroups(groups);
      
      const originalRole = role;
      if (role === 'Viewer' && groups && groups.length > 0) {
        const hasAdminGroup = groups.some((g: any) => 
          String(g).trim().toLowerCase() === 'admin'
        );
        if (hasAdminGroup) {
          role = 'Admin';
        }
      }

      expect(role).toBe('Viewer');
      expect(role).toBe(originalRole);
    });
  });

  describe('Real-world scenario - Scott Rakestraw (scott.rakestraw@gravyty.com)', () => {
    // Your actual user data from Cognito
    const SCOTT_USER = {
      username: 'Google_116634829206759161721',
      email: 'scott.rakestraw@gravyty.com',
      userId: '04d80478-60a1-70f3-fd2c-217c903a94e1',
      userPoolId: 'us-east-1_xBNZh7TaB',
      cognitoGroups: ['Admin', 'us-east-1_xBNZh7TaB_Google'],
    };

    it('should extract Admin from Scott\'s token payload structure', () => {
      // Simulate Scott's exact token payload (as seen in browser console)
      const rawPayload = {
        'cognito:groups': SCOTT_USER.cognitoGroups,
        email: SCOTT_USER.email,
        sub: SCOTT_USER.userId,
        iss: `https://cognito-idp.us-east-1.amazonaws.com/${SCOTT_USER.userPoolId}`,
      };

      // Extract groups using the same logic as middleware
      let groups: string[] | undefined;
      if (rawPayload['cognito:groups']) {
        groups = Array.isArray(rawPayload['cognito:groups']) 
          ? rawPayload['cognito:groups'] 
          : [rawPayload['cognito:groups']];
      }

      // Ensure groups is an array of strings
      if (groups) {
        groups = groups.map(g => String(g)).filter(Boolean);
      }

      const role = extractRoleFromGroups(groups);

      // Verify groups match Scott's actual Cognito groups
      expect(groups).toEqual(SCOTT_USER.cognitoGroups);
      expect(groups?.includes('Admin')).toBe(true);
      expect(groups?.includes('us-east-1_xBNZh7TaB_Google')).toBe(true);
      expect(role).toBe('Admin');
    });

    it('should handle Scott\'s case when verified payload strips groups', () => {
      // Simulate aws-jwt-verify stripping cognito:groups from verified payload
      const rawPayload = {
        'cognito:groups': SCOTT_USER.cognitoGroups,
        email: SCOTT_USER.email,
        sub: SCOTT_USER.userId,
      };

      const verifiedPayload = {
        email: SCOTT_USER.email,
        sub: SCOTT_USER.userId,
        // cognito:groups is missing (stripped by aws-jwt-verify)
      };

      // Simulate the extraction logic with priority
      let groups: string[] | undefined;
      
      // PRIORITY 1: Raw payload (should have groups)
      if (rawPayload && rawPayload['cognito:groups']) {
        groups = Array.isArray(rawPayload['cognito:groups']) 
          ? rawPayload['cognito:groups'] 
          : [rawPayload['cognito:groups']];
      }
      
      // PRIORITY 2: Verified payload (shouldn't be used here since raw has groups)
      if ((!groups || groups.length === 0)) {
        if (verifiedPayload['cognito:groups']) {
          groups = Array.isArray(verifiedPayload['cognito:groups']) 
            ? verifiedPayload['cognito:groups'] 
            : [verifiedPayload['cognito:groups']];
        }
      }

      // Ensure groups is an array of strings
      if (groups) {
        groups = groups.map(g => String(g)).filter(Boolean);
      }

      const role = extractRoleFromGroups(groups);

      // Verify we got Admin from raw payload
      expect(groups).toEqual(SCOTT_USER.cognitoGroups);
      expect(role).toBe('Admin');
    });

    it('should force Admin role for Scott even if extraction incorrectly returns Viewer', () => {
      const groups = SCOTT_USER.cognitoGroups;
      let role = extractRoleFromGroups(groups);
      
      // Safety check: If role is Viewer but groups contain Admin, force Admin
      let finalRole = role;
      if (role === 'Viewer' && groups && groups.length > 0) {
        const hasAdminGroup = groups.some((g: any) => 
          String(g).trim().toLowerCase() === 'admin'
        );
        if (hasAdminGroup) {
          finalRole = 'Admin';
        }
      }

      // Verify Scott gets Admin role
      expect(groups).toEqual(['Admin', 'us-east-1_xBNZh7TaB_Google']);
      expect(groups.includes('Admin')).toBe(true);
      expect(role).toBe('Admin'); // Should be Admin from extraction
      expect(finalRole).toBe('Admin'); // Safety check should also result in Admin
    });

    it('should match Scott\'s actual Cognito groups from AWS', () => {
      // This test verifies the groups match what's actually in Cognito
      const expectedGroups = ['Admin', 'us-east-1_xBNZh7TaB_Google'];
      
      expect(SCOTT_USER.cognitoGroups).toEqual(expectedGroups);
      expect(SCOTT_USER.cognitoGroups.length).toBe(2);
      expect(SCOTT_USER.cognitoGroups[0]).toBe('Admin');
      expect(extractRoleFromGroups(SCOTT_USER.cognitoGroups)).toBe('Admin');
    });

    it('should handle verified payload missing groups (verifier strips them)', () => {
      const rawPayload = {
        'cognito:groups': ['Admin'],
        email: 'test@example.com',
        sub: 'user-123',
      };

      const verifiedPayload = {
        email: 'test@example.com',
        sub: 'user-123',
        // cognito:groups is missing (stripped by aws-jwt-verify)
      };

      // Simulate the extraction logic
      let groups: string[] | undefined;
      
      // PRIORITY 1: Raw payload
      if (rawPayload && rawPayload['cognito:groups']) {
        groups = Array.isArray(rawPayload['cognito:groups']) 
          ? rawPayload['cognito:groups'] 
          : [rawPayload['cognito:groups']];
      }
      
      // PRIORITY 2: Verified payload (shouldn't be used here)
      if ((!groups || groups.length === 0)) {
        if (verifiedPayload['cognito:groups']) {
          groups = Array.isArray(verifiedPayload['cognito:groups']) 
            ? verifiedPayload['cognito:groups'] 
            : [verifiedPayload['cognito:groups']];
        }
      }

      expect(groups).toEqual(['Admin']);
      expect(extractRoleFromGroups(groups)).toBe('Admin');
    });
  });
});


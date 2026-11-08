/**
 * Hardened Security Rules Test Suite — My Easy Project
 * Verifies that all "Dirty Dozen" adversarial payloads return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  docId: string;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Project Create',
    collection: 'projects',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    docId: 'proj_1',
    payload: {
      ownerId: 'user_1',
      name: 'Alpha',
      isVerifiedAdmin: true, // Shadow field
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Identity Spoofing on Document Create',
    collection: 'documents',
    operation: 'create',
    auth: { uid: 'attacker_1', email: 'attacker@example.com', email_verified: true },
    docId: 'doc_1',
    payload: {
      ownerId: 'victim_1',
      projectId: 'proj_1',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Write Attempt',
    collection: 'projects',
    operation: 'create',
    auth: { uid: 'user_1', email: 'valere.andje@gmail.com', email_verified: false },
    docId: 'proj_1',
    payload: { ownerId: 'user_1', name: 'Spoofed' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Path ID Poisoning with Invalid Characters',
    collection: 'projects',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    docId: 'invalid$id!with spaces',
    payload: { ownerId: 'user_1', name: 'Valid Name' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Orphaned FinancialDocument Referencing Non-Existent Project',
    collection: 'documents',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    docId: 'doc_orphan',
    payload: { ownerId: 'user_1', projectId: 'missing_proj_999' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Cross-Tenant Project Linking in FinancialDocument',
    collection: 'documents',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    docId: 'doc_cross',
    payload: { ownerId: 'user_1', projectId: 'other_users_project' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Update-Gap Value Poisoning on Project Name',
    collection: 'projects',
    operation: 'update',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    docId: 'proj_1',
    payload: { name: 'X'.repeat(5000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immortal Field Mutation (ownerId change on update)',
    collection: 'projects',
    operation: 'update',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    docId: 'proj_1',
    payload: { ownerId: 'user_2' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery on Create',
    collection: 'alerts',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    docId: 'alert_1',
    payload: { ownerId: 'user_1', createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Terminal State Mutation on Cancelled Document',
    collection: 'documents',
    operation: 'update',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    docId: 'cancelled_doc_1',
    payload: { status: 'paid' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unauthorized List Scraping Across Tenants',
    collection: 'team_members',
    operation: 'list',
    auth: { uid: 'attacker_1', email: 'attacker@example.com', email_verified: true },
    docId: '*',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'PII User Profile Cross-Read Attempt',
    collection: 'users',
    operation: 'get',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    docId: 'user_2',
    expectedResult: 'PERMISSION_DENIED',
  },
];

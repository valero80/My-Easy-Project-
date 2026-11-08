# Security Specification — My Easy Project

## 1. Data Invariants

1. **Global Catch-All Deny**: Every path not explicitly matched defaults to `allow read, write: if false;`.
2. **Verified Authentication**: All standard reads and writes require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Strict Path ID Guard**: Every single-document operation (`get`, `create`, `update`, `delete`) validates the path parameter ID with `isValidId(id)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Owner Isolation & PII Protection**: Users can only read (`get`, `list`) and write (`create`, `update`, `delete`) their own profile (`/users/{userId}` where `userId == request.auth.uid`) and records where `ownerId == request.auth.uid` (or `isAdmin()`).
5. **Relational Parent Integrity (`exists` & `get`)**: A `FinancialDocument` (`/documents/{documentId}`) cannot be created unless its referenced `/projects/$(incoming().projectId)` exists AND is owned by `request.auth.uid`.
6. **Immortal Fields**: `ownerId`, `uid`, and `createdAt` can never be mutated during an `update`.
7. **Temporal Integrity**: `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
8. **Terminal State Locking**: Once a `Project` reaches `status == 'completed'` or a `FinancialDocument` reaches `status == 'cancelled'`, further client updates are blocked unless performed by an admin (`isAdmin()`).

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Shadow Field Injection)**: Creating a project with an undeclared field `"isAdmin": true`. Rejected by `data.keys().hasOnly(...)`.
2. **Payload 2 (Identity Spoofing on Create)**: Creating a document with `ownerId: "victim_uid_123"` when `request.auth.uid == "attacker_uid"`. Rejected by `data.ownerId == request.auth.uid`.
3. **Payload 3 (Unverified Email Write)**: Writing to `/projects/proj_1` with `request.auth.token.email_verified == false`. Rejected by `isVerifiedUser()`.
4. **Payload 4 (Path ID Poisoning)**: Creating a document with ID containing spaces or special characters (`proj$123!`) or exceeding 128 chars. Rejected by `isValidId()`.
5. **Payload 5 (Orphaned Invoice Creation)**: Creating a `FinancialDocument` referencing a non-existent `projectId: "non_existent_proj"`. Rejected by `exists(/databases/$(database)/documents/projects/$(incoming().projectId))`.
6. **Payload 6 (Cross-Tenant Project Linking)**: Creating a `FinancialDocument` referencing a `projectId` owned by another user. Rejected by `get(.../projects/$(incoming().projectId)).data.ownerId == request.auth.uid`.
7. **Payload 7 (Update-Gap Type Poisoning)**: Updating a project's `name` to a number `99999` or a 10,000-character string. Rejected because `isValidProject(incoming())` wraps the entire `allow update` block.
8. **Payload 8 (Immortal Field Mutation)**: Updating `ownerId` or `createdAt` on an existing project. Rejected by `incoming().ownerId == existing().ownerId && incoming().createdAt == existing().createdAt`.
9. **Payload 9 (Timestamp Forgery)**: Creating or updating a document with a forged past or future timestamp instead of `request.time`. Rejected by `incoming().createdAt == request.time` and `incoming().updatedAt == request.time`.
10. **Payload 10 (Terminal State Mutation)**: Updating a `FinancialDocument` whose existing `status` is `'cancelled'`, or a `Project` whose existing `status` is `'completed'`, as a non-admin. Rejected by terminal state guard `existing().status != 'cancelled'`.
11. **Payload 11 (Blanket List Scraping)**: Listing `/documents` or `/team_members` without filtering by `ownerId == request.auth.uid`. Rejected by `allow list: if isVerifiedUser() && resource.data.ownerId == request.auth.uid;`.
12. **Payload 12 (PII Profile Snooping)**: Authenticated user `user_A` calling `get` on `/users/user_B`. Rejected by `userId == request.auth.uid || isAdmin()`.

// ============================================================================
// IMMUTABLE MULTI-LAYER ENTERPRISE & WORKSPACE VAULT
// Guarantees that any company created by an online service provider and 100%
// of its data can NEVER be deleted or lost under any pretext, even during
// application updates, browser cache migrations, or server restarts.
// ============================================================================

export interface VaultWorkspaceCollections {
  projects?: any[];
  docs?: any[];
  catalog?: any[];
  movements?: any[];
  employees?: any[];
  payslips?: any[];
  warehouses?: any[];
  suppliers?: any[];
  pos?: any[];
  doc_custom?: Record<string, any> | null;
  client_profiles?: any[];
  alerts?: any[];
  team_members?: any[];
  custom_taxes?: any[];
  custom_trades?: any[];
  personnel_categories?: any[];
  audit?: any[];
  trial_state?: Record<string, any> | null;
  realtime_costs?: any[];
  updatedAt?: string;
}

export interface ImmutableVaultSnapshot {
  accounts: any[];
  enterpriseRegistry: Record<string, any>;
  tenantWorkspaces: Record<string, VaultWorkspaceCollections>;
  updatedAt: string;
}

const IDB_NAME = 'MyEasyProject_ImmutableEnterpriseVault_DB';
const IDB_VERSION = 1;
const IDB_STORE = 'immutable_vault_store';
const IDB_MASTER_KEY = 'MASTER_ENTERPRISE_VAULT_SNAPSHOT';
const LS_IMMUTABLE_MASTER_KEY = 'MEP_IMMUTABLE_MASTER_VAULT_PERMANENT';

const WORKSPACE_ARRAY_KEYS: (keyof VaultWorkspaceCollections)[] = [
  'projects',
  'docs',
  'catalog',
  'movements',
  'employees',
  'payslips',
  'warehouses',
  'suppliers',
  'pos',
  'client_profiles',
  'alerts',
  'team_members',
  'custom_taxes',
  'custom_trades',
  'personnel_categories',
  'audit',
  'realtime_costs',
];

/**
 * Non-destructive merge of two arrays of records.
 * Never deletes any existing item: merges items by unique key (id, email, code, name)
 * and preserves all records across updates.
 */
export function mergeRecordsNonDestructive<T = any>(
  existingList: T[] | undefined | null,
  incomingList: T[] | undefined | null,
  keyExtractor?: (item: any) => string
): T[] {
  const safeExisting = Array.isArray(existingList) ? existingList : [];
  const safeIncoming = Array.isArray(incomingList) ? incomingList : [];

  if (safeExisting.length === 0 && safeIncoming.length === 0) return [];
  if (safeExisting.length === 0) return [...safeIncoming];
  if (safeIncoming.length === 0) return [...safeExisting];

  const getKey =
    keyExtractor ||
    ((item: any): string => {
      if (!item || typeof item !== 'object') return String(item);
      if (item.id) return `id:${String(item.id)}`;
      if (item.projectId && !item.id) return `projectId:${String(item.projectId)}`;
      if (item.email && item.companyId) return `acct:${String(item.email).toLowerCase()}:${String(item.companyId)}`;
      if (item.email) return `email:${String(item.email).toLowerCase()}`;
      if (item.code && item.name) return `code:${String(item.code)}:${String(item.name)}`;
      if (item.docNumber) return `doc:${String(item.docNumber)}`;
      return JSON.stringify(item);
    });

  const mergedMap = new Map<string, T>();

  for (const item of safeExisting) {
    if (item === null || item === undefined) continue;
    mergedMap.set(getKey(item), item);
  }

  for (const item of safeIncoming) {
    if (item === null || item === undefined) continue;
    const key = getKey(item);
    const prev = mergedMap.get(key);
    if (prev && typeof prev === 'object' && typeof item === 'object') {
      // Preserve existing fields while applying newer incoming fields
      mergedMap.set(key, { ...prev, ...item });
    } else {
      mergedMap.set(key, item);
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Non-destructive merge of two EnterpriseDetails objects.
 * Never allows empty strings or undefined values to overwrite valid enterprise info.
 */
export function mergeEnterpriseDetailsNonDestructive(
  existingEnt: Record<string, any> | undefined | null,
  incomingEnt: Record<string, any> | undefined | null
): Record<string, any> {
  if (!existingEnt && !incomingEnt) return {};
  if (!existingEnt) return { ...incomingEnt };
  if (!incomingEnt) return { ...existingEnt };

  const result: Record<string, any> = { ...existingEnt };
  for (const [k, v] of Object.entries(incomingEnt)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '' && typeof result[k] === 'string' && result[k].trim() !== '') {
      // Never overwrite a populated string field with an empty string
      continue;
    }
    if (k === 'trialStartedAt' && result.trialStartedAt) {
      // Keep the earliest/original trial creation timestamp
      continue;
    }
    result[k] = v;
  }
  result.isProtectedCustomerEnterprise = true;
  result.deletionForbidden = true;
  return result;
}

/**
 * Non-destructive merge of two Enterprise Registry maps (tenantId -> EnterpriseDetails).
 * Never removes any enterprise from the registry.
 */
export function mergeEnterpriseRegistryNonDestructive(
  existingReg: Record<string, any> | undefined | null,
  incomingReg: Record<string, any> | undefined | null
): Record<string, any> {
  const safeExisting = existingReg && typeof existingReg === 'object' ? existingReg : {};
  const safeIncoming = incomingReg && typeof incomingReg === 'object' ? incomingReg : {};

  const merged: Record<string, any> = { ...safeExisting };
  for (const [tenantId, ent] of Object.entries(safeIncoming)) {
    if (!tenantId || !ent || typeof ent !== 'object') continue;
    merged[tenantId] = mergeEnterpriseDetailsNonDestructive(merged[tenantId], ent);
  }
  return merged;
}

/**
 * Strictly filters an array of records so that any record belonging to another enterprise (tenantId !== targetTenantId)
 * is rejected, and stamps targetTenantId onto all object records created by this enterprise.
 */
export function isolateAndStampRecordsForTenant<T = any>(
  records: T[] | undefined | null,
  targetTenantId?: string,
  strictRequireExistingStamp = false
): T[] {
  if (!Array.isArray(records)) return [];
  if (!targetTenantId || targetTenantId === 'default_tenant') return [];
  return records
    .filter((item: any) => {
      if (item === null || item === undefined) return false;
      if (typeof item === 'object') {
        if (item.tenantId && String(item.tenantId) !== targetTenantId) {
          return false;
        }
        if (strictRequireExistingStamp && item.tenantId !== targetTenantId) {
          return false;
        }
      }
      return true;
    })
    .map((item: any) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return { ...item, tenantId: targetTenantId } as T;
      }
      return item as T;
    });
}

function extractRecordTimestampMs(item: any): number | null {
  if (!item || typeof item !== 'object') return null;
  if (typeof item.id === 'string') {
    const m = item.id.match(/_(\d{12,15})(?:_|$)/);
    if (m) return Number(m[1]);
  }
  for (const field of ['createdAt', 'timestamp', 'sentAt', 'deletedAt']) {
    if (typeof item[field] === 'string') {
      const t = Date.parse(item[field]);
      if (Number.isFinite(t) && t > 1000000000000) return t;
    }
  }
  return null;
}

function extractTenantCreationMs(
  tenantId: string,
  accounts: any[],
  registry: Record<string, any>
): number {
  const candidates: number[] = [];
  const m = tenantId.match(/^tenant_(\d{12,15})/);
  if (m) candidates.push(Number(m[1]));

  const ent = registry?.[tenantId];
  if (ent?.trialStartedAt) {
    const t = Date.parse(ent.trialStartedAt);
    if (Number.isFinite(t)) candidates.push(t);
  }
  for (const acc of accounts) {
    if ((acc?.tenantId === tenantId || acc?.companyId === tenantId) && acc?.createdAt) {
      const t = Date.parse(acc.createdAt);
      if (Number.isFinite(t)) candidates.push(t);
      if (typeof acc.id === 'string') {
        const am = acc.id.match(/_(\d{12,15})/);
        if (am) candidates.push(Number(am[1]));
      }
    }
  }
  return candidates.length > 0 ? Math.min(...candidates) : Number.MAX_SAFE_INTEGER;
}

/**
 * Sanitizes and decontaminates all tenant workspaces in a snapshot:
 * 1. Never allows 'default_tenant' to hold or leak enterprise data.
 * 2. Ensures any record with an ownerId belonging to a specific account stays ONLY in that account's tenant.
 * 3. Ensures no record with the exact same unique ID appears in two different enterprises' workspaces
 *    (attributing it strictly to its original creator enterprise and purging leaked copies from other enterprises).
 */
export function sanitizeCrossTenantContamination(
  snapshot: ImmutableVaultSnapshot
): ImmutableVaultSnapshot {
  const accounts = Array.isArray(snapshot.accounts) ? snapshot.accounts : [];
  const registry = snapshot.enterpriseRegistry || {};
  const workspaces = { ...(snapshot.tenantWorkspaces || {}) };
  delete workspaces['default_tenant'];

  // Map accountId -> tenantId
  const accountToTenant = new Map<string, string>();
  const tenantCreationMs = new Map<string, number>();

  const allTenantIds = new Set<string>([
    ...Object.keys(registry),
    ...Object.keys(workspaces),
    ...accounts.map((a: any) => a?.tenantId || a?.companyId).filter(Boolean),
  ]);
  allTenantIds.delete('default_tenant');

  for (const acc of accounts) {
    const tId = acc?.tenantId || acc?.companyId;
    if (acc?.id && tId && tId !== 'default_tenant') {
      accountToTenant.set(String(acc.id), String(tId));
    }
  }

  for (const tId of allTenantIds) {
    tenantCreationMs.set(tId, extractTenantCreationMs(tId, accounts, registry));
    if (!workspaces[tId]) {
      workspaces[tId] = {};
    }
  }

  // Track project ownership across tenants so linked docs/warehouses/movements follow their parent project's tenant
  const projectToTrueTenant = new Map<string, string>();

  for (const key of WORKSPACE_ARRAY_KEYS) {
    // Collect all occurrences of each item across all tenants
    const occurrencesByKey = new Map<
      string,
      Array<{ tenantId: string; item: any }>
    >();

    const getRecordIdentity = (item: any): string => {
      if (!item || typeof item !== 'object') return String(item);
      if (item.id) return `id:${String(item.id)}`;
      if (item.docNumber) return `doc:${String(item.docNumber)}`;
      if (item.sku && item.name) return `sku:${String(item.sku)}:${String(item.name)}`;
      if (item.code && item.name) return `code:${String(item.code)}:${String(item.name)}`;
      return JSON.stringify(item);
    };

    for (const [tId, ws] of Object.entries(workspaces)) {
      if (!tId || tId === 'default_tenant' || !ws) continue;
      const arr = Array.isArray((ws as any)[key]) ? ((ws as any)[key] as any[]) : [];
      for (const rawItem of arr) {
        if (!rawItem || typeof rawItem !== 'object') continue;
        const recKey = getRecordIdentity(rawItem);
        const list = occurrencesByKey.get(recKey) || [];
        list.push({ tenantId: tId, item: rawItem });
        occurrencesByKey.set(recKey, list);
      }
    }

    // Clear and rebuild strictly isolated arrays per tenant
    for (const tId of allTenantIds) {
      if (workspaces[tId]) {
        (workspaces[tId] as any)[key] = [];
      }
    }

    for (const [, occurrences] of occurrencesByKey.entries()) {
      if (occurrences.length === 0) continue;
      const sample = occurrences[0].item;

      // Determine the single legitimate owner tenant for this record
      let trueOwnerTenantId: string | null = null;

      // 1. Check explicit ownerId -> account's tenantId
      if (sample.ownerId && accountToTenant.has(String(sample.ownerId))) {
        const mapped = accountToTenant.get(String(sample.ownerId))!;
        // If this user owns multiple tenants in a network, prefer the occurrence whose tenant matches sample.tenantId if valid
        const matchingOccurrence = occurrences.find((o) => o.tenantId === mapped);
        if (matchingOccurrence) {
          trueOwnerTenantId = mapped;
        }
      }

      // 2. Check parent projectId -> project's true owner tenant
      if (!trueOwnerTenantId && sample.projectId && projectToTrueTenant.has(String(sample.projectId))) {
        trueOwnerTenantId = projectToTrueTenant.get(String(sample.projectId))!;
      }

      // 3. If the record only exists in one tenant, check if that tenant was created AFTER the record itself
      if (!trueOwnerTenantId && occurrences.length === 1) {
        const onlyTenant = occurrences[0].tenantId;
        const recTs = extractRecordTimestampMs(sample);
        const tenantTs = tenantCreationMs.get(onlyTenant) ?? Number.MAX_SAFE_INTEGER;
        // If record has a timestamp that predates this tenant's creation by > 5 seconds, it was leaked from an earlier tenant
        if (
          recTs !== null &&
          tenantTs !== Number.MAX_SAFE_INTEGER &&
          recTs < tenantTs - 5000
        ) {
          // Find which existing tenant was already created before recTs
          let bestEarlierTenant: string | null = null;
          let bestEarlierTs = Number.MAX_SAFE_INTEGER;
          for (const [candTenant, candTs] of tenantCreationMs.entries()) {
            if (candTs <= recTs + 5000 && candTs < bestEarlierTs) {
              bestEarlierTs = candTs;
              bestEarlierTenant = candTenant;
            }
          }
          trueOwnerTenantId = bestEarlierTenant; // If none found, drop leaked orphan
        } else {
          trueOwnerTenantId = onlyTenant;
        }
      }

      // 4. If the exact same record ID exists in MULTIPLE tenants (cross-tenant copy leak), pick the original creator tenant
      if (!trueOwnerTenantId && occurrences.length > 1) {
        const recTs = extractRecordTimestampMs(sample);
        // Filter candidate tenants that existed at the time the record was created
        const validCandidates = occurrences.filter((occ) => {
          const tTs = tenantCreationMs.get(occ.tenantId) ?? Number.MAX_SAFE_INTEGER;
          return recTs === null || tTs === Number.MAX_SAFE_INTEGER || tTs <= recTs + 5000;
        });
        const pool = validCandidates.length > 0 ? validCandidates : occurrences;
        pool.sort((a, b) => {
          const tsA = tenantCreationMs.get(a.tenantId) ?? Number.MAX_SAFE_INTEGER;
          const tsB = tenantCreationMs.get(b.tenantId) ?? Number.MAX_SAFE_INTEGER;
          return tsA - tsB;
        });
        trueOwnerTenantId = pool[0].tenantId;
      }

      if (trueOwnerTenantId && workspaces[trueOwnerTenantId]) {
        const winningOcc =
          occurrences.find((o) => o.tenantId === trueOwnerTenantId) || occurrences[0];
        const stampedItem = { ...winningOcc.item, tenantId: trueOwnerTenantId };
        (workspaces[trueOwnerTenantId] as any)[key].push(stampedItem);
        if (key === 'projects' && stampedItem.id) {
          projectToTrueTenant.set(String(stampedItem.id), trueOwnerTenantId);
        }
      }
    }
  }

  // Also isolate doc_custom per tenant
  for (const [tId, ws] of Object.entries(workspaces)) {
    if (!ws) continue;
    if (ws.doc_custom && typeof ws.doc_custom === 'object') {
      if (ws.doc_custom.tenantId && ws.doc_custom.tenantId !== tId) {
        delete ws.doc_custom;
      } else {
        ws.doc_custom = { ...ws.doc_custom, tenantId: tId };
      }
    }
  }

  return {
    ...snapshot,
    accounts,
    enterpriseRegistry: registry,
    tenantWorkspaces: workspaces,
  };
}

/**
 * Non-destructive merge of a single tenant's workspace collections.
 * Never allows an empty array [] to wipe out existing records, and strictly prevents cross-tenant data mixing.
 */
export function mergeTenantWorkspaceNonDestructive(
  existingWs: VaultWorkspaceCollections | undefined | null,
  incomingWs: VaultWorkspaceCollections | undefined | null,
  targetTenantId?: string
): VaultWorkspaceCollections {
  if (!targetTenantId || targetTenantId === 'default_tenant') {
    return {};
  }
  const safeExisting: VaultWorkspaceCollections =
    existingWs && typeof existingWs === 'object' ? existingWs : {};
  const safeIncoming: VaultWorkspaceCollections =
    incomingWs && typeof incomingWs === 'object' ? incomingWs : {};

  const merged: VaultWorkspaceCollections = {
    ...safeExisting,
    ...safeIncoming,
    updatedAt: new Date().toISOString(),
  };

  for (const key of WORKSPACE_ARRAY_KEYS) {
    const existingArr = isolateAndStampRecordsForTenant(
      Array.isArray(safeExisting[key]) ? (safeExisting[key] as any[]) : [],
      targetTenantId
    );
    const incomingArr = isolateAndStampRecordsForTenant(
      Array.isArray(safeIncoming[key]) ? (safeIncoming[key] as any[]) : [],
      targetTenantId
    );
    (merged as any)[key] = mergeRecordsNonDestructive(existingArr, incomingArr);
  }

  // Merge object configs non-destructively only if they belong to targetTenantId
  const validExistingDocCustom =
    safeExisting.doc_custom &&
    (!safeExisting.doc_custom.tenantId || safeExisting.doc_custom.tenantId === targetTenantId)
      ? safeExisting.doc_custom
      : null;
  const validIncomingDocCustom =
    safeIncoming.doc_custom &&
    (!safeIncoming.doc_custom.tenantId || safeIncoming.doc_custom.tenantId === targetTenantId)
      ? safeIncoming.doc_custom
      : null;

  if (validExistingDocCustom || validIncomingDocCustom) {
    merged.doc_custom = {
      ...(validExistingDocCustom || {}),
      ...(validIncomingDocCustom || {}),
      tenantId: targetTenantId,
    };
  } else {
    delete merged.doc_custom;
  }

  if (safeExisting.trial_state || safeIncoming.trial_state) {
    merged.trial_state = {
      ...(safeExisting.trial_state || {}),
      ...(safeIncoming.trial_state || {}),
    };
  }

  return merged;
}

/**
 * Open IndexedDB connection safely.
 */
function openVaultIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (db: IDBDatabase | null) => {
      if (settled) return;
      settled = true;
      resolve(db);
    };
    const timer = window.setTimeout(() => finish(null), 1200);
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        window.clearTimeout(timer);
        finish(req.result);
      };
      req.onerror = () => {
        window.clearTimeout(timer);
        finish(null);
      };
      req.onblocked = () => {
        window.clearTimeout(timer);
        finish(null);
      };
    } catch {
      window.clearTimeout(timer);
      finish(null);
    }
  });
}

export async function readSnapshotFromIDB(): Promise<ImmutableVaultSnapshot | null> {
  const db = await openVaultIDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_MASTER_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function writeSnapshotToIDB(snapshot: ImmutableVaultSnapshot): Promise<void> {
  const db = await openVaultIDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(snapshot, IDB_MASTER_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Reads the current local snapshot from localStorage (master vault + all tenant keys)
 * and merges them into a unified ImmutableVaultSnapshot with strict per-enterprise isolation.
 */
export function collectLocalBrowserSnapshot(): ImmutableVaultSnapshot {
  const snapshot: ImmutableVaultSnapshot = {
    accounts: [],
    enterpriseRegistry: {},
    tenantWorkspaces: {},
    updatedAt: new Date().toISOString(),
  };

  if (typeof window === 'undefined' || !window.localStorage) return snapshot;

  try {
    const rawMaster = localStorage.getItem(LS_IMMUTABLE_MASTER_KEY);
    if (rawMaster) {
      const parsedMaster = JSON.parse(rawMaster);
      if (Array.isArray(parsedMaster?.accounts)) {
        snapshot.accounts = mergeRecordsNonDestructive(snapshot.accounts, parsedMaster.accounts);
      }
      if (parsedMaster?.enterpriseRegistry) {
        snapshot.enterpriseRegistry = mergeEnterpriseRegistryNonDestructive(
          snapshot.enterpriseRegistry,
          parsedMaster.enterpriseRegistry
        );
      }
      if (parsedMaster?.tenantWorkspaces && typeof parsedMaster.tenantWorkspaces === 'object') {
        for (const [tId, ws] of Object.entries(parsedMaster.tenantWorkspaces)) {
          if (!tId || tId === 'default_tenant') continue;
          snapshot.tenantWorkspaces[tId] = mergeTenantWorkspaceNonDestructive(
            snapshot.tenantWorkspaces[tId],
            ws as VaultWorkspaceCollections,
            tId
          );
        }
      }
    }
  } catch {
    // Ignore parse errors
  }

  // Merge accounts from all known keys (including v3 and permanent backup)
  const accountKeys = [
    'mep_enterprise_accounts_v3',
    'mep_enterprise_accounts_permanent_backup',
    'mep_local_accounts_v2',
    'mep_backup_local_accounts_permanent',
    'mep_local_accounts_v1',
    'mep_local_accounts',
  ];
  for (const key of accountKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          snapshot.accounts = mergeRecordsNonDestructive(snapshot.accounts, parsed);
        }
      }
    } catch {
      // Ignore
    }
  }

  // Merge enterprise registry from all known keys (including v3 and permanent backup)
  const registryKeys = [
    'mep_enterprise_registry_v3',
    'mep_enterprise_registry_permanent_backup',
    'mep_enterprise_registry_v2',
    'mep_backup_enterprise_registry_permanent',
    'mep_enterprise_registry_v1',
    'mep_enterprise_registry',
  ];
  for (const key of registryKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          snapshot.enterpriseRegistry = mergeEnterpriseRegistryNonDestructive(
            snapshot.enterpriseRegistry,
            parsed
          );
        }
      }
    } catch {
      // Ignore
    }
  }

  // Ensure every account that represents a provider enterprise is also reflected in enterpriseRegistry
  for (const acct of snapshot.accounts) {
    const acctTenantId = acct?.tenantId || acct?.companyId;
    if (acct && acctTenantId && acct.enterpriseDetails) {
      snapshot.enterpriseRegistry[acctTenantId] = mergeEnterpriseDetailsNonDestructive(
        snapshot.enterpriseRegistry[acctTenantId],
        acct.enterpriseDetails
      );
    }
  }

  // Discover all tenantIds from accounts, enterpriseRegistry, and localStorage keys
  const tenantIds = new Set<string>([
    ...Object.keys(snapshot.enterpriseRegistry),
    ...Object.keys(snapshot.tenantWorkspaces),
    ...snapshot.accounts.map((a: any) => a?.tenantId || a?.companyId).filter(Boolean),
  ]);
  tenantIds.delete('default_tenant');

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      for (const suffix of WORKSPACE_ARRAY_KEYS) {
        const match1 = k.match(new RegExp(`^mep_(.+)_${suffix}$`));
        if (
          match1 &&
          match1[1] &&
          !match1[1].startsWith('backup_') &&
          match1[1] !== 'default_tenant'
        ) {
          tenantIds.add(match1[1]);
        }
        const match2 = k.match(new RegExp(`^mep_backup_(.+)_${suffix}$`));
        if (match2 && match2[1] && match2[1] !== 'default_tenant') {
          tenantIds.add(match2[1]);
        }
      }
    }
  } catch {
    // Ignore
  }

  for (const tId of tenantIds) {
    if (!tId || tId === 'default_tenant') continue;
    const wsFromStorage: VaultWorkspaceCollections = {};
    for (const suffix of WORKSPACE_ARRAY_KEYS) {
      try {
        const primaryRaw = localStorage.getItem(`mep_${tId}_${suffix}`);
        const backupRaw = localStorage.getItem(`mep_backup_${tId}_${suffix}`);
        const primaryArr = isolateAndStampRecordsForTenant(
          primaryRaw ? JSON.parse(primaryRaw) : [],
          tId
        );
        const backupArr = isolateAndStampRecordsForTenant(
          backupRaw ? JSON.parse(backupRaw) : [],
          tId
        );
        const mergedArr = mergeRecordsNonDestructive(backupArr, primaryArr);
        if (mergedArr.length > 0) {
          (wsFromStorage as any)[suffix] = mergedArr;
        }
      } catch {
        // Ignore
      }
    }
    try {
      const docCustomPrimary = localStorage.getItem(`mep_${tId}_doc_custom`);
      const docCustomBackup = localStorage.getItem(`mep_backup_${tId}_doc_custom`);
      const pObj = docCustomPrimary ? JSON.parse(docCustomPrimary) : null;
      const bObj = docCustomBackup ? JSON.parse(docCustomBackup) : null;
      if (pObj || bObj) {
        wsFromStorage.doc_custom = { ...(bObj || {}), ...(pObj || {}) };
      }
    } catch {
      // Ignore
    }
    try {
      const trialPrimary = localStorage.getItem(`mep_${tId}_trial_state`);
      const trialBackup = localStorage.getItem(`mep_backup_${tId}_trial_state`);
      const pObj = trialPrimary ? JSON.parse(trialPrimary) : null;
      const bObj = trialBackup ? JSON.parse(trialBackup) : null;
      if (pObj || bObj) {
        wsFromStorage.trial_state = { ...(bObj || {}), ...(pObj || {}) };
      }
    } catch {
      // Ignore
    }

    snapshot.tenantWorkspaces[tId] = mergeTenantWorkspaceNonDestructive(
      snapshot.tenantWorkspaces[tId],
      wsFromStorage,
      tId
    );
  }

  return sanitizeCrossTenantContamination(snapshot);
}

/**
 * Writes a merged snapshot back to localStorage (all primary + permanent backup keys)
 * and IndexedDB without ever deleting existing data and with strict per-enterprise isolation.
 */
export async function persistMergedSnapshotLocally(
  incomingPartial: Partial<ImmutableVaultSnapshot>
): Promise<ImmutableVaultSnapshot> {
  const localSnap = collectLocalBrowserSnapshot();
  const idbSnap = await readSnapshotFromIDB();

  const mergedAccounts = mergeRecordsNonDestructive(
    mergeRecordsNonDestructive(idbSnap?.accounts, localSnap.accounts),
    incomingPartial.accounts
  );

  const mergedRegistry = mergeEnterpriseRegistryNonDestructive(
    mergeEnterpriseRegistryNonDestructive(
      idbSnap?.enterpriseRegistry,
      localSnap.enterpriseRegistry
    ),
    incomingPartial.enterpriseRegistry
  );

  const allTenantIds = new Set<string>([
    ...Object.keys(idbSnap?.tenantWorkspaces || {}),
    ...Object.keys(localSnap.tenantWorkspaces || {}),
    ...Object.keys(incomingPartial.tenantWorkspaces || {}),
    ...Object.keys(mergedRegistry),
  ]);
  allTenantIds.delete('default_tenant');

  const mergedWorkspaces: Record<string, VaultWorkspaceCollections> = {};
  for (const tId of allTenantIds) {
    if (!tId || tId === 'default_tenant') continue;
    const step1 = mergeTenantWorkspaceNonDestructive(
      idbSnap?.tenantWorkspaces?.[tId],
      localSnap.tenantWorkspaces?.[tId],
      tId
    );
    mergedWorkspaces[tId] = mergeTenantWorkspaceNonDestructive(
      step1,
      incomingPartial.tenantWorkspaces?.[tId],
      tId
    );
  }

  const finalSnapshot = sanitizeCrossTenantContamination({
    accounts: mergedAccounts,
    enterpriseRegistry: mergedRegistry,
    tenantWorkspaces: mergedWorkspaces,
    updatedAt: new Date().toISOString(),
  });

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (finalSnapshot.accounts.length > 0) {
        const serializedAccounts = JSON.stringify(finalSnapshot.accounts);
        localStorage.setItem('mep_enterprise_accounts_v3', serializedAccounts);
        localStorage.setItem('mep_enterprise_accounts_permanent_backup', serializedAccounts);
        localStorage.setItem('mep_local_accounts_v2', serializedAccounts);
        localStorage.setItem('mep_backup_local_accounts_permanent', serializedAccounts);
      }
      if (Object.keys(finalSnapshot.enterpriseRegistry).length > 0) {
        const serializedRegistry = JSON.stringify(finalSnapshot.enterpriseRegistry);
        localStorage.setItem('mep_enterprise_registry_v3', serializedRegistry);
        localStorage.setItem('mep_enterprise_registry_permanent_backup', serializedRegistry);
        localStorage.setItem('mep_enterprise_registry_v2', serializedRegistry);
        localStorage.setItem('mep_backup_enterprise_registry_permanent', serializedRegistry);
      }

      for (const [tId, ws] of Object.entries(finalSnapshot.tenantWorkspaces)) {
        if (!tId || tId === 'default_tenant' || !ws) continue;
        for (const suffix of WORKSPACE_ARRAY_KEYS) {
          const arr = isolateAndStampRecordsForTenant((ws as any)[suffix], tId);
          const serialized = JSON.stringify(arr);
          localStorage.setItem(`mep_${tId}_${suffix}`, serialized);
          localStorage.setItem(`mep_backup_${tId}_${suffix}`, serialized);
        }
        if (ws.doc_custom && Object.keys(ws.doc_custom).length > 0) {
          const serialized = JSON.stringify({ ...ws.doc_custom, tenantId: tId });
          localStorage.setItem(`mep_${tId}_doc_custom`, serialized);
          localStorage.setItem(`mep_backup_${tId}_doc_custom`, serialized);
        }
        if (ws.trial_state && Object.keys(ws.trial_state).length > 0) {
          const serialized = JSON.stringify(ws.trial_state);
          localStorage.setItem(`mep_${tId}_trial_state`, serialized);
          localStorage.setItem(`mep_backup_${tId}_trial_state`, serialized);
        }
      }

      localStorage.setItem(LS_IMMUTABLE_MASTER_KEY, JSON.stringify(finalSnapshot));
    } catch {
      // Ignore quota errors on localStorage; IndexedDB still stores full snapshot
    }
  }

  await writeSnapshotToIDB(finalSnapshot);
  return finalSnapshot;
}


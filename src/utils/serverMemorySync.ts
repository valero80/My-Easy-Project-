import {
  generateEnterpriseISU,
  getSuperAdminEnterpriseNetwork,
  isRealCreatedEnterpriseName,
  normalizeEnterpriseNameKey,
} from './countries';

export interface TerminalOriginMetadata {
  terminalId: string;
  terminalType: 'Smartphone' | 'Tablette' | 'Ordinateur' | 'Serveur Cloud';
  browserName: string;
  osPlatform: string;
  networkProtocol: string;
  onlineStatus: boolean;
  originTimestamp: string;
  registrationChannel:
    | 'creation_onboarding_terminal'
    | 'auth_portal_terminal'
    | 'auto_backfill_existing'
    | 'network_expansion_terminal'
    | 'cloud_vault_sync';
}

export interface SaaSServerMemoryEntry {
  tenantId: string;
  isu: string;
  companyName: string;
  shardId: string;
  isolationLevel: 'strict_isu_enclave' | 'dedicated_sovereign_pod';
  subscriptionStatus: 'active' | 'trial' | 'suspended';
  subscriptionPlan: string;
  apiGatewayStatus: 'active' | 'throttled' | 'locked';
  apiQuotaDailyLimit: number;
  apiQuotaUsedToday: number;
  webhookDispatcherActive: boolean;
  continuousBackupEnabled: boolean;
  lastSnapshotId: string;
  lastSnapshotAt: string;
  disasterRecoveryRpoSeconds: number;
  slaTargetPercent: number;
  slaObservedPercent: number;
  autoScalingMode: 'reactive' | 'predictive_ai' | 'fixed';
  activeConnectorsCount: number;
  enrolledInSaaSMemoryAt: string;
  lastHeartbeatAt: string;
}

export interface WebServerMemoryEntry {
  tenantId: string;
  isu: string;
  companyName: string;
  virtualHostDomain: string;
  anycastDnsIp: string;
  routingStatus: 'active' | 'maintenance' | 'rerouted_failover' | 'quarantined';
  sslTlsCertificateSerial: string;
  sslTlsProtocol: 'TLS 1.3 + Kyber-768 PQC';
  sslAutoRenewalEnabled: boolean;
  sslExpiresAt: string;
  wafMode: 'active_zero_trust' | 'under_attack_strict' | 'learning';
  wafBlockedThreats24h: number;
  ddosMitigationActive: boolean;
  edgeCdnEnabled: boolean;
  edgeCacheHitRatio: number;
  http3QuicEnabled: boolean;
  brotliCompressionEnabled: boolean;
  loadBalancerPool: string;
  averageLatencyMs: number;
  activeInternetTerminalsCount: number;
  synergyWithSaaSStatus: 'full_duplex_synced' | 'reconciling' | 'degraded';
  enrolledInWebMemoryAt: string;
  lastEdgeSyncAt: string;
}

export interface EnterpriseDigitalIdentityRecord {
  digitalIdentityId: string;
  tenantId: string;
  isu: string;
  companyName: string;
  country: string;
  countryCode: string;
  sector: string;
  city: string;
  email: string;
  phone: string;
  rcNumber: string;
  nifNumber: string;
  ownerSuperAdminId: string;
  ownerSuperAdminEmail: string;
  cryptographicFingerprintSha256: string;
  pqcPublicKeyThumbprint: string;
  digitalSignature: string;
  createdBeforeServersExistence: boolean;
  signatureDiscoverySource: string;
  networkPresenceStatus: 'online' | 'offline_controlled';
  knownTerminalsHistory: TerminalOriginMetadata[];
  fullServerControlActive: boolean;
  virtualHostDomain: string;
  saasMemoryStatus: 'enrolled_active' | 'reconciling' | 'suspended';
  webMemoryStatus: 'enrolled_active' | 'reconciling' | 'quarantined';
  synergyTakeoverComplete: boolean;
  originTerminal: TerminalOriginMetadata;
  saasMemory: SaaSServerMemoryEntry;
  webMemory: WebServerMemoryEntry;
  createdAt: string;
  updatedAt: string;
}

export interface DualServerSyncReport {
  totalEnterprisesDiscovered: number;
  newlyEnrolledCount: number;
  alreadyEnrolledCount: number;
  preServerSignaturesRecoveredCount: number;
  onlineEnterprisesCount: number;
  offlineControlledEnterprisesCount: number;
  syncedWithBackend: boolean;
  lastSyncAt: string;
  identities: EnterpriseDigitalIdentityRecord[];
}

export const DIGITAL_IDENTITIES_MEMORY_KEY = 'mep_servers_digital_identities_memory_v1';
export const SAAS_SERVER_MEMORY_KEY = 'mep_saas_server_memory_v1';
export const WEB_SERVER_MEMORY_KEY = 'mep_web_server_memory_v1';
export const WEB_SERVER_CONTROLS_KEY = 'mep_web_server_enterprise_controls_v1';
export const GLOBAL_ISU_REGISTRY_KEY = 'mep_global_enterprise_isu_registry_v1';
export const ENTERPRISE_REGISTRY_V3_KEY = 'mep_enterprise_registry_v3';

export function deterministicHashHex(input: string, length = 32): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined =
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0') +
    (Math.imul(h1, 31) >>> 0).toString(16).padStart(8, '0');
  return combined.toUpperCase().slice(0, length);
}

export function computeDigitalIdentityFingerprint(
  tenantId: string,
  isu: string,
  companyName: string
): string {
  const seed = `${tenantId}::${isu}::${companyName.trim().toUpperCase()}::MEP-SOVEREIGN-ID`;
  const hex = deterministicHashHex(seed, 32);
  return `SHA256-MEP-${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}-${hex.slice(24, 32)}`;
}

export function computeVirtualHostDomain(companyName: string, countryCode = 'CI'): string {
  const slug =
    (companyName || 'entreprise')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 28) || 'entreprise';
  const cc = (countryCode || 'CI').toLowerCase().slice(0, 2);
  return `${slug}.${cc}.myeasyproject.cloud`;
}

export function detectClientTerminalMetadata(
  channel: TerminalOriginMetadata['registrationChannel'] = 'auto_backfill_existing'
): TerminalOriginMetadata {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      terminalId: 'TERM-CLOUD-NODE',
      terminalType: 'Serveur Cloud',
      browserName: 'Node Engine',
      osPlatform: 'Cloud Linux',
      networkProtocol: 'HTTPS / TLS 1.3 + HTTP/3',
      onlineStatus: true,
      originTimestamp: new Date().toISOString(),
      registrationChannel: channel,
    };
  }

  const ua = navigator.userAgent || '';
  const isTablet =
    /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(
      ua
    );
  const isMobile =
    !isTablet &&
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua
    );
  const terminalType: TerminalOriginMetadata['terminalType'] = isTablet
    ? 'Tablette'
    : isMobile
    ? 'Smartphone'
    : 'Ordinateur';

  let browserName = 'Navigateur Web';
  if (/Edg\//i.test(ua)) browserName = 'Microsoft Edge';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browserName = 'Opera';
  else if (/Chrome\//i.test(ua)) browserName = 'Google Chrome';
  else if (/Firefox\//i.test(ua)) browserName = 'Mozilla Firefox';
  else if (/Safari\//i.test(ua)) browserName = 'Apple Safari';

  let osPlatform = 'OS Standard';
  if (/Windows/i.test(ua)) osPlatform = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) osPlatform = 'macOS / iOS';
  else if (/Android/i.test(ua)) osPlatform = 'Android';
  else if (/Linux/i.test(ua)) osPlatform = 'Linux';

  let savedTermId = '';
  try {
    savedTermId = localStorage.getItem('mep_terminal_hardware_id_v1') || '';
    if (!savedTermId) {
      savedTermId = `TERM-${deterministicHashHex(
        `${ua}-${window.screen?.width || 1920}x${window.screen?.height || 1080}`,
        8
      )}`;
      localStorage.setItem('mep_terminal_hardware_id_v1', savedTermId);
    }
  } catch {
    savedTermId = 'TERM-INTERNET-NODE';
  }

  return {
    terminalId: savedTermId,
    terminalType,
    browserName,
    osPlatform,
    networkProtocol: 'HTTPS / TLS 1.3 (Post-Quantum)',
    onlineStatus: navigator.onLine !== false,
    originTimestamp: new Date().toISOString(),
    registrationChannel: channel,
  };
}

export function buildEnterpriseDigitalIdentityRecord(
  rawEnterprise: Record<string, any>,
  rawAccount?: Record<string, any> | null,
  channel: TerminalOriginMetadata['registrationChannel'] = 'auto_backfill_existing',
  existingIdentity?: EnterpriseDigitalIdentityRecord | null
): EnterpriseDigitalIdentityRecord {
  const nowIso = new Date().toISOString();
  const tenantId = String(
    rawEnterprise.tenantId ||
      rawEnterprise.id ||
      rawAccount?.tenantId ||
      existingIdentity?.tenantId ||
      `tenant_${deterministicHashHex(String(rawEnterprise.companyName || rawEnterprise.name || Date.now()), 10).toLowerCase()}`
  );

  const companyName = String(
    rawEnterprise.companyName ||
      rawEnterprise.name ||
      rawAccount?.companyName ||
      existingIdentity?.companyName ||
      `Entreprise ${tenantId}`
  ).trim();

  const country = String(
    rawEnterprise.country ||
      rawAccount?.country ||
      existingIdentity?.country ||
      "Côte d'Ivoire"
  );

  const countryCode = String(
    rawEnterprise.countryCode ||
      existingIdentity?.countryCode ||
      (country.toLowerCase().includes('france')
        ? 'FR'
        : country.toLowerCase().includes('sénégal') || country.toLowerCase().includes('senegal')
        ? 'SN'
        : country.toLowerCase().includes('maroc')
        ? 'MA'
        : country.toLowerCase().includes('cameroun')
        ? 'CM'
        : 'CI')
  ).toUpperCase();

  const canonicalIsu = generateEnterpriseISU(tenantId, countryCode);
  const rawCandidateIsu = String(
    rawEnterprise.isu ||
      rawEnterprise.enterpriseISU ||
      rawAccount?.enterpriseISU ||
      existingIdentity?.isu ||
      ''
  ).trim();
  // Repair any legacy ISU where tenantId was accidentally passed as countryCode (e.g. ISU-TE-...)
  const isu =
    !rawCandidateIsu ||
    /^ISU-(TE|DE|SY|GL|LO|EN)-/i.test(rawCandidateIsu)
      ? canonicalIsu
      : rawCandidateIsu;

  const sector = String(
    rawEnterprise.sector ||
      rawEnterprise.activitySector ||
      existingIdentity?.sector ||
      'Ingénierie, BTP & Services Multi-Techniques'
  );

  const city = String(rawEnterprise.city || existingIdentity?.city || 'Abidjan');
  const email = String(
    rawEnterprise.email ||
      rawAccount?.email ||
      existingIdentity?.email ||
      `contact@${computeVirtualHostDomain(companyName, countryCode)}`
  );
  const phone = String(
    rawEnterprise.phone || rawAccount?.phone || existingIdentity?.phone || '+225 07 00 00 00 00'
  );
  const rcNumber = String(rawEnterprise.rcNumber || existingIdentity?.rcNumber || 'RC-MEP-VERIFIED');
  const nifNumber = String(
    rawEnterprise.nifNumber || existingIdentity?.nifNumber || 'NIF-MEP-VERIFIED'
  );

  const ownerSuperAdminId = String(
    rawEnterprise.ownerAccountId ||
      rawEnterprise.ownerSuperAdminId ||
      rawAccount?.id ||
      existingIdentity?.ownerSuperAdminId ||
      `sa_${tenantId}`
  );
  const ownerSuperAdminEmail = String(
    rawEnterprise.ownerEmail ||
      rawEnterprise.ownerSuperAdminEmail ||
      rawAccount?.email ||
      existingIdentity?.ownerSuperAdminEmail ||
      email
  );

  const fingerprint = computeDigitalIdentityFingerprint(tenantId, isu, companyName);
  const hexSeed = deterministicHashHex(`${tenantId}:${isu}`, 16);
  const pqcThumbprint = `KYBER768-${hexSeed.slice(0, 8)}-${hexSeed.slice(8, 16)}`;
  const virtualHostDomain =
    existingIdentity?.virtualHostDomain || computeVirtualHostDomain(companyName, countryCode);

  const isSuspended = Boolean(rawEnterprise.subscriptionSuspended);
  const createdAt = String(
    rawEnterprise.createdAt || existingIdentity?.createdAt || nowIso
  );

  const numSeed = parseInt(hexSeed.slice(0, 4), 16) || 42;
  const anycastOctet3 = (numSeed % 200) + 10;
  const anycastOctet4 = ((numSeed >> 4) % 240) + 11;

  const saasMemory: SaaSServerMemoryEntry = {
    tenantId,
    isu,
    companyName,
    shardId:
      existingIdentity?.saasMemory?.shardId ||
      `SHARD-${countryCode}-${hexSeed.slice(0, 6)}`,
    isolationLevel:
      existingIdentity?.saasMemory?.isolationLevel || 'strict_isu_enclave',
    subscriptionStatus: isSuspended
      ? 'suspended'
      : existingIdentity?.saasMemory?.subscriptionStatus || 'active',
    subscriptionPlan: String(
      rawEnterprise.subscriptionPlan ||
        existingIdentity?.saasMemory?.subscriptionPlan ||
        'Enterprise Cloud Souverain'
    ),
    apiGatewayStatus: isSuspended
      ? 'locked'
      : existingIdentity?.saasMemory?.apiGatewayStatus || 'active',
    apiQuotaDailyLimit: existingIdentity?.saasMemory?.apiQuotaDailyLimit || 250000,
    apiQuotaUsedToday:
      existingIdentity?.saasMemory?.apiQuotaUsedToday || 1200 + (numSeed % 4800),
    webhookDispatcherActive: existingIdentity?.saasMemory?.webhookDispatcherActive ?? true,
    continuousBackupEnabled: existingIdentity?.saasMemory?.continuousBackupEnabled ?? true,
    lastSnapshotId:
      existingIdentity?.saasMemory?.lastSnapshotId ||
      `SNAP-${hexSeed.slice(0, 8)}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
    lastSnapshotAt: existingIdentity?.saasMemory?.lastSnapshotAt || nowIso,
    disasterRecoveryRpoSeconds: 15,
    slaTargetPercent: 99.99,
    slaObservedPercent: existingIdentity?.saasMemory?.slaObservedPercent || 99.99,
    autoScalingMode: existingIdentity?.saasMemory?.autoScalingMode || 'predictive_ai',
    activeConnectorsCount: existingIdentity?.saasMemory?.activeConnectorsCount || 6,
    enrolledInSaaSMemoryAt: existingIdentity?.saasMemory?.enrolledInSaaSMemoryAt || createdAt,
    lastHeartbeatAt: nowIso,
  };

  const expiryDate = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  const webMemory: WebServerMemoryEntry = {
    tenantId,
    isu,
    companyName,
    virtualHostDomain,
    anycastDnsIp:
      existingIdentity?.webMemory?.anycastDnsIp ||
      `198.51.${anycastOctet3}.${anycastOctet4}`,
    routingStatus: isSuspended
      ? 'quarantined'
      : existingIdentity?.webMemory?.routingStatus || 'active',
    sslTlsCertificateSerial:
      existingIdentity?.webMemory?.sslTlsCertificateSerial ||
      `CERT-PQC-${hexSeed.slice(0, 10)}`,
    sslTlsProtocol: 'TLS 1.3 + Kyber-768 PQC',
    sslAutoRenewalEnabled: existingIdentity?.webMemory?.sslAutoRenewalEnabled ?? true,
    sslExpiresAt: existingIdentity?.webMemory?.sslExpiresAt || expiryDate,
    wafMode: existingIdentity?.webMemory?.wafMode || 'active_zero_trust',
    wafBlockedThreats24h:
      existingIdentity?.webMemory?.wafBlockedThreats24h ?? (numSeed % 19),
    ddosMitigationActive: existingIdentity?.webMemory?.ddosMitigationActive ?? true,
    edgeCdnEnabled: existingIdentity?.webMemory?.edgeCdnEnabled ?? true,
    edgeCacheHitRatio:
      existingIdentity?.webMemory?.edgeCacheHitRatio ||
      Number((96.4 + (numSeed % 34) / 10).toFixed(1)),
    http3QuicEnabled: existingIdentity?.webMemory?.http3QuicEnabled ?? true,
    brotliCompressionEnabled: existingIdentity?.webMemory?.brotliCompressionEnabled ?? true,
    loadBalancerPool:
      existingIdentity?.webMemory?.loadBalancerPool || 'eu-af-anycast-cluster-01',
    averageLatencyMs:
      existingIdentity?.webMemory?.averageLatencyMs || 11 + (numSeed % 14),
    activeInternetTerminalsCount:
      existingIdentity?.webMemory?.activeInternetTerminalsCount || 1 + (numSeed % 4),
    synergyWithSaaSStatus: 'full_duplex_synced',
    enrolledInWebMemoryAt: existingIdentity?.webMemory?.enrolledInWebMemoryAt || createdAt,
    lastEdgeSyncAt: nowIso,
  };

  const currentTerminal = detectClientTerminalMetadata(channel);
  const originTerminal = existingIdentity?.originTerminal || currentTerminal;
  const createdBeforeServers = Boolean(
    rawEnterprise.createdBeforeServersExistence ??
      existingIdentity?.createdBeforeServersExistence ??
      channel === 'auto_backfill_existing'
  );
  const sigPrefix = createdBeforeServers ? 'SIG-LEGACY-RECOVERY' : 'SIG-MEP-ED25519';
  const sigHash = deterministicHashHex(
    `${tenantId}::${isu}::${companyName}::${ownerSuperAdminId}::SOVEREIGN-SIGNATURE`,
    24
  );
  const digitalSignature =
    rawEnterprise.digitalSignature ||
    existingIdentity?.digitalSignature ||
    `${sigPrefix}-${sigHash.slice(0, 8)}-${sigHash.slice(8, 16)}-${sigHash.slice(16, 24)}`;

  const existingTerminals = Array.isArray(existingIdentity?.knownTerminalsHistory)
    ? existingIdentity!.knownTerminalsHistory
    : [];
  const mergedTerminalsMap = new Map<string, TerminalOriginMetadata>();
  [originTerminal, ...existingTerminals, currentTerminal].forEach((term) => {
    if (term && term.terminalId) {
      mergedTerminalsMap.set(term.terminalId, term);
    }
  });

  const isCurrentlyOnline =
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
  const networkPresenceStatus: 'online' | 'offline_controlled' =
    rawEnterprise.networkPresenceStatus ||
    (isCurrentlyOnline ? 'online' : 'offline_controlled');

  return {
    digitalIdentityId:
      existingIdentity?.digitalIdentityId || `DID-MEP-${hexSeed.slice(0, 12)}`,
    tenantId,
    isu,
    companyName,
    country,
    countryCode,
    sector,
    city,
    email,
    phone,
    rcNumber,
    nifNumber,
    ownerSuperAdminId,
    ownerSuperAdminEmail,
    cryptographicFingerprintSha256: fingerprint,
    pqcPublicKeyThumbprint: pqcThumbprint,
    digitalSignature,
    createdBeforeServersExistence: createdBeforeServers,
    signatureDiscoverySource: String(
      rawEnterprise.signatureDiscoverySource ||
        existingIdentity?.signatureDiscoverySource ||
        (createdBeforeServers
          ? 'Scan Rétroactif Signatures Pré-Serveurs (Vault & Stockage Local)'
          : 'Enregistrement Direct Terminal Connecté')
    ),
    networkPresenceStatus,
    knownTerminalsHistory: Array.from(mergedTerminalsMap.values()),
    fullServerControlActive: true,
    virtualHostDomain,
    saasMemoryStatus: isSuspended ? 'suspended' : 'enrolled_active',
    webMemoryStatus: isSuspended ? 'quarantined' : 'enrolled_active',
    synergyTakeoverComplete: true,
    originTerminal,
    saasMemory,
    webMemory,
    createdAt,
    updatedAt: nowIso,
  };
}

export function getStoredDigitalIdentitiesMemory(): Record<
  string,
  EnterpriseDigitalIdentityRecord
> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DIGITAL_IDENTITIES_MEMORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return {};
}

export function persistDigitalIdentityLocally(
  record: EnterpriseDigitalIdentityRecord
): void {
  if (typeof window === 'undefined') return;
  if (!record || !isRealCreatedEnterpriseName(record.companyName, record.tenantId)) {
    return;
  }
  try {
    // 1. Save in unified Digital Identities Memory (deduplicating by normalized companyName)
    const currentIdentities = getStoredDigitalIdentitiesMemory();
    const normTargetName = normalizeEnterpriseNameKey(record.companyName);
    for (const [kTid, existingRec] of Object.entries(currentIdentities)) {
      if (
        !existingRec ||
        !isRealCreatedEnterpriseName(existingRec.companyName, kTid) ||
        (kTid !== record.tenantId &&
          normalizeEnterpriseNameKey(existingRec.companyName) === normTargetName)
      ) {
        delete currentIdentities[kTid];
      }
    }
    currentIdentities[record.tenantId] = record;
    localStorage.setItem(
      DIGITAL_IDENTITIES_MEMORY_KEY,
      JSON.stringify(currentIdentities)
    );

    // 2. Save in SaaS Server Memory
    const rawSaasMem = localStorage.getItem(SAAS_SERVER_MEMORY_KEY);
    const saasMemMap: Record<string, SaaSServerMemoryEntry> = rawSaasMem
      ? JSON.parse(rawSaasMem)
      : {};
    saasMemMap[record.tenantId] = record.saasMemory;
    localStorage.setItem(SAAS_SERVER_MEMORY_KEY, JSON.stringify(saasMemMap));

    // 3. Save in Web Server Memory
    const rawWebMem = localStorage.getItem(WEB_SERVER_MEMORY_KEY);
    const webMemMap: Record<string, WebServerMemoryEntry> = rawWebMem
      ? JSON.parse(rawWebMem)
      : {};
    webMemMap[record.tenantId] = record.webMemory;
    localStorage.setItem(WEB_SERVER_MEMORY_KEY, JSON.stringify(webMemMap));

    // 4. Sync with WebServerSynergySuite controls (`mep_web_server_enterprise_controls_v1`)
    const rawWebControls = localStorage.getItem(WEB_SERVER_CONTROLS_KEY);
    const webControlsMap: Record<string, any> = rawWebControls
      ? JSON.parse(rawWebControls)
      : {};
    if (!webControlsMap[record.tenantId]) {
      webControlsMap[record.tenantId] = {
        tenantId: record.tenantId,
        isu: record.isu,
        companyName: record.companyName,
        webRoutingStatus:
          record.webMemory.routingStatus === 'quarantined' ? 'quarantined' : 'active',
        wafShieldMode: record.webMemory.wafMode,
        edgeCdnAcceleration: record.webMemory.edgeCdnEnabled,
        sslTlsZeroTrust: true,
        saasSynergySyncMode: 'real_time_bi_directional',
        allocatedBandwidthMbps: 1000,
        rateLimitReqPerSec: 650,
        activeSessionsCount: record.webMemory.activeInternetTerminalsCount,
        averageLatencyMs: record.webMemory.averageLatencyMs,
        cacheHitRatioPercent: record.webMemory.edgeCacheHitRatio,
        lastHealthCheckAt: record.updatedAt,
        lastSynergyPulseAt: record.updatedAt,
        autoFailoverEnabled: true,
        virtualHostDomain: record.virtualHostDomain,
        digitalIdentityId: record.digitalIdentityId,
        cryptographicFingerprintSha256: record.cryptographicFingerprintSha256,
        digitalSignature: record.digitalSignature,
        createdBeforeServersExistence: record.createdBeforeServersExistence,
        networkPresenceStatus: record.networkPresenceStatus,
        fullServerControlActive: true,
      };
      localStorage.setItem(WEB_SERVER_CONTROLS_KEY, JSON.stringify(webControlsMap));
    }

    // 5. Ensure `mep_enterprise_registry_v3` (object map used by App.tsx & AdGenSys) has this enterprise without duplicates or placeholders
    const rawRegV3 = localStorage.getItem(ENTERPRISE_REGISTRY_V3_KEY);
    const regV3Map: Record<string, any> =
      rawRegV3 && typeof JSON.parse(rawRegV3) === 'object' && !Array.isArray(JSON.parse(rawRegV3))
        ? JSON.parse(rawRegV3)
        : {};
    for (const [kTid, vEnt] of Object.entries(regV3Map)) {
      if (
        !vEnt ||
        !isRealCreatedEnterpriseName(vEnt.companyName || vEnt.name, kTid) ||
        (kTid !== record.tenantId &&
          normalizeEnterpriseNameKey(vEnt.companyName || vEnt.name) === normTargetName)
      ) {
        delete regV3Map[kTid];
      }
    }
    const existingV3 = regV3Map[record.tenantId] || {};
    regV3Map[record.tenantId] = {
      ...existingV3,
      id: existingV3.id || record.tenantId,
      tenantId: record.tenantId,
      companyName: record.companyName,
      name: record.companyName,
      isu: record.isu,
      enterpriseISU: record.isu,
      country: record.country,
      countryName: existingV3.countryName || record.country,
      countryCode: record.countryCode,
      sector: record.sector,
      activitySector: existingV3.activitySector || record.sector,
      city: record.city,
      email: record.email,
      phone: record.phone,
      rcNumber: record.rcNumber,
      rccmOrId: existingV3.rccmOrId || record.rcNumber,
      nifNumber: record.nifNumber,
      taxId: existingV3.taxId || record.nifNumber,
      ownerAccountId: existingV3.ownerAccountId || record.ownerSuperAdminId,
      ownerEmail: existingV3.ownerEmail || record.ownerSuperAdminEmail,
      digitalIdentityId: record.digitalIdentityId,
      cryptographicFingerprintSha256: record.cryptographicFingerprintSha256,
      digitalSignature: record.digitalSignature,
      createdBeforeServersExistence: record.createdBeforeServersExistence,
      signatureDiscoverySource: record.signatureDiscoverySource,
      networkPresenceStatus: record.networkPresenceStatus,
      knownTerminalsHistory: record.knownTerminalsHistory,
      fullServerControlActive: true,
      virtualHostDomain: record.virtualHostDomain,
      saasServerEnrolled: true,
      webServerEnrolled: true,
      originTerminal: record.originTerminal,
      createdAt: existingV3.createdAt || record.createdAt,
      updatedAt: record.updatedAt,
    };
    localStorage.setItem(ENTERPRISE_REGISTRY_V3_KEY, JSON.stringify(regV3Map));

    // 6. Ensure `mep_global_enterprise_isu_registry_v1` (array used by WebServerSynergySuite) is synced & deduplicated
    const rawGlobalIsu = localStorage.getItem(GLOBAL_ISU_REGISTRY_KEY);
    const globalIsuList: any[] = rawGlobalIsu ? JSON.parse(rawGlobalIsu) : [];
    const listArray = (Array.isArray(globalIsuList) ? globalIsuList : []).filter(
      (item) =>
        item &&
        isRealCreatedEnterpriseName(item.companyName, item.tenantId) &&
        (item.tenantId === record.tenantId ||
          normalizeEnterpriseNameKey(item.companyName) !== normTargetName)
    );
    const idx = listArray.findIndex(
      (item) =>
        item &&
        (item.tenantId === record.tenantId ||
          (item.isu && item.isu === record.isu) ||
          normalizeEnterpriseNameKey(item.companyName) === normTargetName)
    );
    const mergedGlobalItem = {
      ...(idx >= 0 ? listArray[idx] : {}),
      tenantId: record.tenantId,
      isu: record.isu,
      companyName: record.companyName,
      country: record.country,
      countryCode: record.countryCode,
      sector: record.sector,
      city: record.city,
      email: record.email,
      phone: record.phone,
      ownerSuperAdminId: record.ownerSuperAdminId,
      ownerSuperAdminEmail: record.ownerSuperAdminEmail,
      digitalIdentityId: record.digitalIdentityId,
      cryptographicFingerprintSha256: record.cryptographicFingerprintSha256,
      digitalSignature: record.digitalSignature,
      createdBeforeServersExistence: record.createdBeforeServersExistence,
      signatureDiscoverySource: record.signatureDiscoverySource,
      networkPresenceStatus: record.networkPresenceStatus,
      knownTerminalsHistory: record.knownTerminalsHistory,
      fullServerControlActive: true,
      virtualHostDomain: record.virtualHostDomain,
      saasServerEnrolled: true,
      webServerEnrolled: true,
      originTerminal: record.originTerminal,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    if (idx >= 0) {
      listArray[idx] = mergedGlobalItem;
    } else {
      listArray.push(mergedGlobalItem);
    }
    localStorage.setItem(GLOBAL_ISU_REGISTRY_KEY, JSON.stringify(listArray));
  } catch (err) {
    console.warn('[ServerMemorySync] Local persistence warning:', err);
  }
}

/**
 * Enregistre immédiatement l'identité numérique d'une nouvelle entreprise prestataire
 * (créée depuis n'importe quel terminal connecté à Internet) dans les mémoires
 * du Serveur SaaS et du Serveur Web.
 */
export async function registerEnterpriseDigitalIdentityInServers(
  enterprise: Record<string, any>,
  account?: Record<string, any> | null,
  channel: TerminalOriginMetadata['registrationChannel'] = 'creation_onboarding_terminal'
): Promise<EnterpriseDigitalIdentityRecord> {
  const existingMap = getStoredDigitalIdentitiesMemory();
  const tenantId = String(
    enterprise.tenantId ||
      enterprise.id ||
      account?.tenantId ||
      `tenant_${Date.now()}`
  );
  const existingRecord = existingMap[tenantId] || null;

  const digitalIdentity = buildEnterpriseDigitalIdentityRecord(
    {
      ...enterprise,
      tenantId,
      createdBeforeServersExistence: false,
      signatureDiscoverySource: 'Création Directe Terminal Réseau My Easy Project',
    },
    account,
    channel,
    existingRecord
  );

  // 1. Persist immediately in local SaaS & Web memories
  persistDigitalIdentityLocally(digitalIdentity);

  // 2. Push immediately over the network to the SaaS & Web Backend Server Memories
  try {
    const response = await fetch('/api/servers/register-enterprise-identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        digitalIdentity,
        enterprise: {
          ...enterprise,
          tenantId: digitalIdentity.tenantId,
          companyName: digitalIdentity.companyName,
          isu: digitalIdentity.isu,
          country: digitalIdentity.country,
          countryCode: digitalIdentity.countryCode,
          sector: digitalIdentity.sector,
          city: digitalIdentity.city,
          email: digitalIdentity.email,
          phone: digitalIdentity.phone,
          rcNumber: digitalIdentity.rcNumber,
          nifNumber: digitalIdentity.nifNumber,
          ownerAccountId: digitalIdentity.ownerSuperAdminId,
          ownerEmail: digitalIdentity.ownerSuperAdminEmail,
          digitalIdentityId: digitalIdentity.digitalIdentityId,
          cryptographicFingerprintSha256:
            digitalIdentity.cryptographicFingerprintSha256,
          digitalSignature: digitalIdentity.digitalSignature,
          createdBeforeServersExistence: digitalIdentity.createdBeforeServersExistence,
          signatureDiscoverySource: digitalIdentity.signatureDiscoverySource,
          networkPresenceStatus: digitalIdentity.networkPresenceStatus,
          knownTerminalsHistory: digitalIdentity.knownTerminalsHistory,
          fullServerControlActive: true,
          virtualHostDomain: digitalIdentity.virtualHostDomain,
        },
        account: account || null,
        originTerminal: digitalIdentity.originTerminal,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.digitalIdentity) {
        persistDigitalIdentityLocally(data.digitalIdentity);
        return data.digitalIdentity;
      }
    }
  } catch {
    // Offline or network transient state: local memory is already updated and will sync on next heartbeat
  }

  return digitalIdentity;
}

/**
 * Mécanisme d'enregistrement et de réconciliation automatique aux mémoires des serveurs (SaaS et Web)
 * de toutes les identités et signatures numériques des entreprises déjà existantes (y compris celles
 * créées avant l'existence des serveurs SaaS et Web ou hors-ligne depuis différents terminaux).
 */
export async function autoBackfillExistingEnterprisesToServerMemories(): Promise<DualServerSyncReport> {
  const existingIdentitiesMap = getStoredDigitalIdentitiesMemory();
  const discoveredByTenantId: Record<
    string,
    { ent: Record<string, any>; acc?: Record<string, any> }
  > = {};

  if (typeof window !== 'undefined') {
    try {
      // Source 1: `mep_enterprise_registry_v3` (Object map or array)
      const rawV3 = localStorage.getItem(ENTERPRISE_REGISTRY_V3_KEY);
      if (rawV3) {
        const parsedV3 = JSON.parse(rawV3);
        const listV3 = Array.isArray(parsedV3)
          ? parsedV3
          : parsedV3 && typeof parsedV3 === 'object'
          ? Object.values(parsedV3)
          : [];
        listV3.forEach((ent: any) => {
          if (!ent || typeof ent !== 'object') return;
          const tid = String(ent.tenantId || ent.id || '');
          if (!tid) return;
          discoveredByTenantId[tid] = {
            ent: { ...(discoveredByTenantId[tid]?.ent || {}), ...ent, tenantId: tid },
          };
        });
      }

      // Source 2: `mep_global_enterprise_isu_registry_v1`
      const rawGlobalIsu = localStorage.getItem(GLOBAL_ISU_REGISTRY_KEY);
      if (rawGlobalIsu) {
        const parsedGlobal = JSON.parse(rawGlobalIsu);
        if (Array.isArray(parsedGlobal)) {
          parsedGlobal.forEach((ent: any) => {
            if (!ent || typeof ent !== 'object') return;
            const tid = String(ent.tenantId || ent.id || '');
            if (!tid) return;
            discoveredByTenantId[tid] = {
              ent: {
                ...(discoveredByTenantId[tid]?.ent || {}),
                ...ent,
                tenantId: tid,
              },
            };
          });
        }
      }

      // Source 3: Attach owner account metadata ONLY to already-created enterprises (do NOT fabricate fake enterprises from raw accounts)
      const rawAccV3 = localStorage.getItem('mep_enterprise_accounts_v3');
      const rawAccV1 = localStorage.getItem('mep_local_accounts_v1');
      const accountsList: any[] = [
        ...(rawAccV3 ? JSON.parse(rawAccV3) || [] : []),
        ...(rawAccV1 ? JSON.parse(rawAccV1) || [] : []),
      ];
      const accountNamesByTenant: Record<string, Set<string>> = {};
      accountsList.forEach((acc: any) => {
        if (!acc || typeof acc !== 'object') return;
        const tid = String(acc.tenantId || '');
        if (!tid) return;
        if (!accountNamesByTenant[tid]) accountNamesByTenant[tid] = new Set();
        if (acc.fullName) {
          accountNamesByTenant[tid].add(normalizeEnterpriseNameKey(`ENTREPRISE ${acc.fullName}`));
        }
        const role = String(acc.role || '').toLowerCase();
        if (['adgensys', 'moas', 'teleconseiller', 'consultant_operation'].includes(role)) {
          return;
        }
        if (discoveredByTenantId[tid]?.ent) {
          const current = discoveredByTenantId[tid].ent;
          discoveredByTenantId[tid] = {
            ent: {
              ...current,
              ownerAccountId: current.ownerAccountId || acc.id,
              ownerEmail: current.ownerEmail || acc.email,
            },
            acc,
          };
        }
      });

      // Source 4: Deep scan of `mep_<tenantId>_enterprise_details` for genuinely created enterprises
      const ignoredSystemTenants = new Set([
        'enterprise',
        'local',
        'global',
        'servers',
        'saas',
        'web',
        'super',
        'terminal',
        'provider',
        'default_tenant',
      ]);
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        if (key.startsWith('mep_') && key.endsWith('_enterprise_details')) {
          const tid = key
            .replace(/^mep_/, '')
            .replace(/_enterprise_details$/, '');
          if (tid && !ignoredSystemTenants.has(tid) && !tid.startsWith('system_')) {
            try {
              const details = JSON.parse(localStorage.getItem(key) || '{}');
              const cName = details?.companyName || details?.name;
              if (
                details &&
                typeof details === 'object' &&
                isRealCreatedEnterpriseName(cName, tid)
              ) {
                const current = discoveredByTenantId[tid]?.ent || {};
                discoveredByTenantId[tid] = {
                  ...discoveredByTenantId[tid],
                  ent: {
                    ...current,
                    ...details,
                    tenantId: tid,
                    companyName: cName,
                    createdBeforeServersExistence:
                      current.createdBeforeServersExistence ?? true,
                    signatureDiscoverySource:
                      current.signatureDiscoverySource ||
                      'Signature Numérique Antérieure (Empreinte Locale _enterprise_details)',
                  },
                };
              }
            } catch {
              // ignore invalid json
            }
          }
        }
      }

      // Source 5: `mep_super_admin_enterprise_network_v1` raw storage scan
      try {
        const rawNet = localStorage.getItem('mep_super_admin_enterprise_network_v1');
        if (rawNet) {
          const parsedNet = JSON.parse(rawNet);
          if (Array.isArray(parsedNet)) {
            parsedNet.forEach((node: any) => {
              if (!node || typeof node !== 'object') return;
              const tid = String(node.tenantId || '');
              const cName = node.companyName;
              if (!tid || !isRealCreatedEnterpriseName(cName, tid)) return;
              const current = discoveredByTenantId[tid]?.ent || {};
              discoveredByTenantId[tid] = {
                ...discoveredByTenantId[tid],
                ent: {
                  ...current,
                  tenantId: tid,
                  companyName: current.companyName || cName,
                  isu: current.isu || node.isu,
                  country: current.country || node.country || "Côte d'Ivoire",
                  countryCode: current.countryCode || node.countryCode || 'CI',
                  sector: current.sector || node.sector,
                  ownerEmail: current.ownerEmail || node.ownerEmail,
                  createdAt: current.createdAt || node.createdAt,
                  createdBeforeServersExistence:
                    current.createdBeforeServersExistence ?? true,
                  signatureDiscoverySource:
                    current.signatureDiscoverySource ||
                    'Signature Numérique Récupérée (Réseau Multi-Entreprises Super-Admin)',
                },
              };
            });
          }
        }
      } catch {
        // ignore
      }

      // Remove any synthetic account-name enterprises ("ENTREPRISE <FULLNAME>") or non-created placeholders
      for (const [tid, item] of Object.entries(discoveredByTenantId)) {
        const cName = item.ent?.companyName || item.ent?.name;
        const norm = normalizeEnterpriseNameKey(cName);
        if (
          !isRealCreatedEnterpriseName(cName, tid) ||
          (accountNamesByTenant[tid] && accountNamesByTenant[tid].has(norm))
        ) {
          delete discoveredByTenantId[tid];
        }
      }
    } catch (err) {
      console.warn('[ServerMemorySync] Discovery error:', err);
    }
  }

  let newlyEnrolledCount = 0;
  let alreadyEnrolledCount = 0;
  const localRecords: EnterpriseDigitalIdentityRecord[] = [];
  const seenCompanyNames = new Set<string>();

  Object.entries(discoveredByTenantId).forEach(([tid, { ent, acc }]) => {
    const cName = ent?.companyName || ent?.name;
    if (!isRealCreatedEnterpriseName(cName, tid)) return;
    const normName = normalizeEnterpriseNameKey(cName);
    if (seenCompanyNames.has(normName)) return;
    seenCompanyNames.add(normName);

    const existing = existingIdentitiesMap[tid] || null;
    if (existing && existing.synergyTakeoverComplete) {
      alreadyEnrolledCount++;
    } else {
      newlyEnrolledCount++;
    }
    const record = buildEnterpriseDigitalIdentityRecord(
      ent,
      acc || null,
      existing ? existing.originTerminal.registrationChannel : 'auto_backfill_existing',
      existing
    );
    persistDigitalIdentityLocally(record);
    localRecords.push(record);
  });

  // Also include any valid identities already in `existingIdentitiesMap` that weren't in `discoveredByTenantId`
  Object.entries(existingIdentitiesMap).forEach(([tid, rec]) => {
    if (!discoveredByTenantId[tid] && rec && isRealCreatedEnterpriseName(rec.companyName, tid)) {
      const normName = normalizeEnterpriseNameKey(rec.companyName);
      if (seenCompanyNames.has(normName)) return;
      seenCompanyNames.add(normName);
      alreadyEnrolledCount++;
      const repairedRec = buildEnterpriseDigitalIdentityRecord(
        rec,
        null,
        rec.originTerminal?.registrationChannel || 'auto_backfill_existing',
        rec
      );
      persistDigitalIdentityLocally(repairedRec);
      localRecords.push(repairedRec);
    }
  });

  let syncedWithBackend = false;
  let finalIdentities = [...localRecords];

  // Reconcile with SaaS & Web Backend Server Memories (`/api/servers/auto-backfill-identities`)
  try {
    const response = await fetch('/api/servers/auto-backfill-identities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identities: localRecords,
        originTerminal: detectClientTerminalMetadata('auto_backfill_existing'),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      syncedWithBackend = true;
      if (Array.isArray(data?.identities)) {
        const mergedByTid: Record<string, EnterpriseDigitalIdentityRecord> = {};
        localRecords.forEach((r) => {
          mergedByTid[r.tenantId] = r;
        });
        data.identities.forEach((serverRecord: EnterpriseDigitalIdentityRecord) => {
          if (serverRecord && serverRecord.tenantId) {
            mergedByTid[serverRecord.tenantId] = serverRecord;
            persistDigitalIdentityLocally(serverRecord);
          }
        });
        finalIdentities = Object.values(mergedByTid);
      }
    }
  } catch {
    // Offline fallback: local SaaS & Web server memories remain authoritative until online
  }

  const preServerSignaturesRecoveredCount = finalIdentities.filter(
    (id) => id.createdBeforeServersExistence || String(id.digitalSignature || '').startsWith('SIG-LEGACY-RECOVERY')
  ).length;
  const onlineEnterprisesCount = finalIdentities.filter(
    (id) => id.networkPresenceStatus !== 'offline_controlled'
  ).length;
  const offlineControlledEnterprisesCount = finalIdentities.filter(
    (id) => id.networkPresenceStatus === 'offline_controlled'
  ).length;

  return {
    totalEnterprisesDiscovered: finalIdentities.length,
    newlyEnrolledCount,
    alreadyEnrolledCount,
    preServerSignaturesRecoveredCount,
    onlineEnterprisesCount,
    offlineControlledEnterprisesCount,
    syncedWithBackend,
    lastSyncAt: new Date().toISOString(),
    identities: finalIdentities,
  };
}

/**
 * Recherche active des signatures numériques des entreprises créées avant l'existence
 * des serveurs SaaS et Web (ou créées hors-ligne sur différents terminaux) afin de les
 * enrôler et de les contrôler à 100%.
 */
export async function scanAndRecoverPreServerDigitalSignatures(): Promise<DualServerSyncReport> {
  return autoBackfillExistingEnterprisesToServerMemories();
}

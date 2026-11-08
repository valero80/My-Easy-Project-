import React, { useState, useMemo, useEffect } from 'react';
import {
  UserPlus,
  LogIn,
  KeyRound,
  Mail,
  MessageSquare,
  Copy,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Globe,
  Smartphone,
  Tablet,
  Monitor,
} from 'lucide-react';
import {
  WORLD_COUNTRIES,
  generateDefaultPassword,
  checkExclusiveEnterpriseAffiliation,
  SystemAndEnterpriseRoleId,
  validateAdGenSysCode,
} from '../utils/countries';
import {
  checkAuthRateLimit,
  recordAuthFailure,
  resetAuthRateLimit,
  recordSecurityIntrusionEvent,
  detectMaliciousIntrusionPattern,
  sanitizeSecurityInput,
} from '../utils/crypto';
import { MyEasyProjectLogo } from './MyEasyProjectLogo';
import {
  autoBackfillExistingEnterprisesToServerMemories,
  registerEnterpriseDigitalIdentityInServers,
  detectClientTerminalMetadata,
} from '../utils/serverMemorySync';
import {
  CollaboratorWorkScheduleConfig,
  TerminalSessionLockRecord,
  ScheduleAccessEvaluation,
  RemoteDisconnectSecurityChallenge,
  RemoteDisconnectOtpChannel,
  evaluateCollaboratorScheduleAccess,
  checkTerminalSessionConflict,
  claimTerminalSessionLock,
  getOrCreateCurrentTerminalId,
  remoteDisconnectOtherTerminalAndClaim,
  initiateRemoteDisconnectSecurityChallenge,
  verifyAndApproveRemoteDisconnectServer,
} from '../utils/sessionAndScheduleManager';
import {
  dispatchInstantAuthOtp,
  dispatchInstantMessage,
  InstantMessageChannel,
  InstantOtpSendResult,
  triggerOptionalExternalChannelApp,
  verifyServerAuthOtp,
} from '../utils/instantMessagingService';

export interface LocalAccountRecord {
  id: string;
  tenantId: string; // Isolates each company/prestataire in its own private workspace
  fullName: string; // Stored uppercase
  phoneDialCode: string;
  phoneNumber: string;
  email: string;
  role: SystemAndEnterpriseRoleId;
  functionTitle: string;
  department: string;
  defaultPassword: string;
  currentPassword: string;
  mustChangePassword: boolean;
  isActivated: boolean;
  companySetupCompleted: boolean;
  createdAt: string;
  accountStatus?: 'active' | 'blocked'; // Contrôlé par le Super-Admin (pour ses utilisateurs), le MOAS ou l'AdGenSys
  saasPermissions?: string[]; // Droits d'accès granulaires définis par le MOAS sur le Serveur SaaS
  createdByRole?: string;
  createdByAccountId?: string;
  canActAsAdGenSys?: boolean; // Un Super-Admin peut être AdGenSys et vice versa
  canActAsSuperAdmin?: boolean;
  primaryTenantId?: string; // Tenant d'entreprise rattaché pour la bascule AdGenSys <-> Super-Admin
  employeeId?: string; // Linked hired employee ID (required for collaborator accounts)
  employeeMatricule?: string; // Immutable unique employee matricule
  contractTerminated?: boolean; // Set to true upon cessation de contrat
  terminationDate?: string;
  terminationReason?: string;
  workSchedule?: CollaboratorWorkScheduleConfig; // Plages horaires, pauses, heures sup. & dérogation Super-Admin
  activeTerminalLock?: TerminalSessionLockRecord; // Verrouillage de session mono-terminal
  companyName?: string;
  enterpriseISU?: string;
  accountPortalType?: 'enterprise_user' | 'personnel_24_7' | 'client_24_7';
  canAlsoUseClientAccount?: boolean;
}

export interface CloudAuthHydrationPayload {
  enterpriseDetails?: any;
  workspaceData?: Record<string, any> | null;
  tenantAccounts?: LocalAccountRecord[];
  allAccountsDirectory?: LocalAccountRecord[];
  enterpriseRegistry?: Record<string, any>;
}

export const BURNED_ENTERPRISES_BLACKLIST_KEY = 'mep_burned_enterprises_blacklist_v1';

/**
 * Brûle définitivement une entreprise et l'intégralité de ses données (projets, documents,
 * stocks, personnel, paies, pointages biométriques, dossiers, profils clients, comptes et registres)
 * lorsqu'un AdGenSys est détecté comme étant Super-Admin de cette entreprise.
 */
export function permanentlyBurnEnterpriseAndAllData(
  tenantIdToBurn: string,
  reason = 'Violation critique de souveraineté : Un AdGenSys ne doit jamais être Super-Admin.'
): {
  burnedTenantId: string;
  burnedCompanyName: string;
  deletedKeysCount: number;
  purgedAccountsCount: number;
} {
  const cleanTenant = (tenantIdToBurn || '').trim();
  if (
    !cleanTenant ||
    cleanTenant === 'system_adgensys_root' ||
    cleanTenant === 'multi_provider_client_hub'
  ) {
    return {
      burnedTenantId: cleanTenant,
      burnedCompanyName: '',
      deletedKeysCount: 0,
      purgedAccountsCount: 0,
    };
  }

  let burnedCompanyName = cleanTenant;
  let deletedKeysCount = 0;
  let purgedAccountsCount = 0;

  if (typeof window === 'undefined') {
    return { burnedTenantId: cleanTenant, burnedCompanyName, deletedKeysCount, purgedAccountsCount };
  }

  try {
    // 1. Identifier le nom de l'entreprise avant destruction définitive
    const registryKeys = [
      'mep_enterprise_registry',
      'mep_enterprise_registry_v1',
      'mep_enterprise_registry_v2',
      'mep_enterprise_registry_v3',
      'mep_enterprise_registry_permanent_backup',
    ];
    for (const rKey of registryKeys) {
      const raw = localStorage.getItem(rKey);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed[cleanTenant]) {
          if (parsed[cleanTenant].companyName) {
            burnedCompanyName = parsed[cleanTenant].companyName;
          }
          delete parsed[cleanTenant];
          localStorage.setItem(rKey, JSON.stringify(parsed));
        }
      } catch {
        // ignore
      }
    }

    // 2. Inscrire l'entreprise dans la liste noire irréversible des entreprises brûlées
    let blacklist: Array<{
      tenantId: string;
      companyName: string;
      burnedAt: string;
      reason: string;
    }> = [];
    try {
      const rawBl = localStorage.getItem(BURNED_ENTERPRISES_BLACKLIST_KEY);
      if (rawBl) {
        const parsedBl = JSON.parse(rawBl);
        if (Array.isArray(parsedBl)) blacklist = parsedBl;
      }
    } catch {
      // ignore
    }
    if (!blacklist.some((b) => b.tenantId === cleanTenant)) {
      blacklist.push({
        tenantId: cleanTenant,
        companyName: burnedCompanyName,
        burnedAt: new Date().toISOString(),
        reason,
      });
      localStorage.setItem(BURNED_ENTERPRISES_BLACKLIST_KEY, JSON.stringify(blacklist));
    }

    // 3. Brûler définitivement toutes les clés localStorage appartenant à cette entreprise
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k === BURNED_ENTERPRISES_BLACKLIST_KEY) continue;
      if (
        k.startsWith(`mep_${cleanTenant}_`) ||
        k.endsWith(`_${cleanTenant}`) ||
        k.includes(`_${cleanTenant}_`)
      ) {
        keysToDelete.push(k);
      }
    }
    for (const k of keysToDelete) {
      localStorage.removeItem(k);
      deletedKeysCount++;
    }

    // 4. Purger tous les comptes utilisateurs liés à cette entreprise brûlée et retirer tout droit Super-Admin à l'AdGenSys
    const accountKeys = [
      'mep_enterprise_accounts',
      'mep_enterprise_accounts_v1',
      'mep_enterprise_accounts_v2',
      'mep_enterprise_accounts_v3',
      'mep_enterprise_accounts_permanent_backup',
      'mep_accounts',
      'mep_personal_employee_accounts_v1',
      'mep_client_portal_accounts_v1',
    ];

    for (const aKey of accountKeys) {
      const raw = localStorage.getItem(aKey);
      if (!raw) continue;
      try {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const nextList: LocalAccountRecord[] = [];
          for (const acc of list) {
            if (!acc) continue;
            const isAdGenSysAcc = acc.role === 'adgensys' || Boolean(acc.canActAsAdGenSys);
            const belongsToBurnedTenant =
              acc.tenantId === cleanTenant || acc.primaryTenantId === cleanTenant;

            if (belongsToBurnedTenant && !isAdGenSysAcc) {
              // Tout compte (Super-Admin, Manager, Collaborateur, Salarié, Client) de l'entreprise brûlée est détruit définitivement
              purgedAccountsCount++;
              continue;
            }

            if (
              isAdGenSysAcc &&
              (belongsToBurnedTenant || acc.canActAsSuperAdmin || acc.role === 'super_admin')
            ) {
              // L'AdGenSys perd définitivement toute qualité de Super-Admin et toute référence à l'entreprise brûlée
              nextList.push({
                ...acc,
                role: 'adgensys',
                tenantId: 'system_adgensys_root',
                primaryTenantId: undefined,
                canActAsAdGenSys: true,
                canActAsSuperAdmin: false,
                companyName: undefined,
                enterpriseISU: undefined,
                companySetupCompleted: true,
                functionTitle: 'Administrateur Général des Systèmes (AdGenSys)',
                department: 'Gouvernance Générale Système & Serveur SaaS',
              });
              continue;
            }

            nextList.push(acc);
          }
          localStorage.setItem(aKey, JSON.stringify(nextList));
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  return {
    burnedTenantId: cleanTenant,
    burnedCompanyName,
    deletedKeysCount,
    purgedAccountsCount,
  };
}

/**
 * Détecte dans un répertoire de comptes tout AdGenSys qui est également Super-Admin,
 * brûle définitivement l'entreprise pour laquelle il est Super-Admin ainsi que toutes ses données,
 * et renvoie la liste des comptes assainie.
 */
export function detectAndBurnAdGenSysSuperAdminConflicts(
  accountsPool: LocalAccountRecord[]
): {
  cleanedAccounts: LocalAccountRecord[];
  burnedEnterprises: Array<{ tenantId: string; companyName: string; adminName: string }>;
} {
  const burnedEnterprises: Array<{ tenantId: string; companyName: string; adminName: string }> = [];
  const burnedTenantIds = new Set<string>();

  if (typeof window !== 'undefined') {
    try {
      const rawBl = localStorage.getItem(BURNED_ENTERPRISES_BLACKLIST_KEY);
      if (rawBl) {
        const parsedBl = JSON.parse(rawBl);
        if (Array.isArray(parsedBl)) {
          parsedBl.forEach((b: any) => {
            if (b && typeof b.tenantId === 'string') burnedTenantIds.add(b.tenantId);
          });
        }
      }
    } catch {
      // ignore
    }
  }

  const adGenSysAccounts = accountsPool.filter(
    (a) => a && (a.role === 'adgensys' || Boolean(a.canActAsAdGenSys))
  );

  for (const ags of adGenSysAccounts) {
    const agsEmail = (ags.email || '').trim().toLowerCase();
    const agsPhone = (ags.phoneNumber || '').replace(/[^0-9]/g, '');
    const agsName = (ags.fullName || '').trim().toUpperCase();

    const directCandidateTenants = [ags.primaryTenantId, ags.tenantId].filter(
      (t): t is string =>
        Boolean(t) &&
        t !== 'system_adgensys_root' &&
        t !== 'multi_provider_client_hub' &&
        t !== 'default_tenant'
    );

    if (ags.role === 'super_admin' || ags.canActAsSuperAdmin || directCandidateTenants.length > 0) {
      for (const tId of directCandidateTenants) {
        if (!burnedTenantIds.has(tId)) {
          const res = permanentlyBurnEnterpriseAndAllData(
            tId,
            `Cumul interdit AdGenSys + Super-Admin détecté sur le compte ${ags.fullName} (${ags.email}). Entreprise et données brûlées définitivement.`
          );
          burnedTenantIds.add(tId);
          burnedEnterprises.push({
            tenantId: tId,
            companyName: res.burnedCompanyName,
            adminName: ags.fullName,
          });
        }
      }
    }

    for (const other of accountsPool) {
      if (!other) continue;
      if (other.role !== 'super_admin' && !other.canActAsSuperAdmin) continue;
      const otherEmail = (other.email || '').trim().toLowerCase();
      const otherPhone = (other.phoneNumber || '').replace(/[^0-9]/g, '');
      const otherName = (other.fullName || '').trim().toUpperCase();

      const samePerson =
        (agsEmail && otherEmail === agsEmail) ||
        (agsPhone.length >= 8 &&
          otherPhone.length >= 8 &&
          (agsPhone === otherPhone || agsPhone.slice(-8) === otherPhone.slice(-8))) ||
        (agsName && otherName === agsName);

      if (samePerson) {
        const targetTenants = [other.tenantId, other.primaryTenantId].filter(
          (t): t is string =>
            Boolean(t) &&
            t !== 'system_adgensys_root' &&
            t !== 'multi_provider_client_hub'
        );
        for (const tId of targetTenants) {
          if (!burnedTenantIds.has(tId)) {
            const res = permanentlyBurnEnterpriseAndAllData(
              tId,
              `Cumul interdit AdGenSys + Super-Admin détecté pour ${other.fullName} (${other.email}). Entreprise et données brûlées définitivement.`
            );
            burnedTenantIds.add(tId);
            burnedEnterprises.push({
              tenantId: tId,
              companyName: res.burnedCompanyName,
              adminName: other.fullName,
            });
          }
        }
      }
    }
  }

  const cleanedAccounts: LocalAccountRecord[] = [];
  for (const acc of accountsPool) {
    if (!acc) continue;
    const isAgs = acc.role === 'adgensys' || Boolean(acc.canActAsAdGenSys);
    const inBurned =
      (acc.tenantId && burnedTenantIds.has(acc.tenantId)) ||
      (acc.primaryTenantId && burnedTenantIds.has(acc.primaryTenantId));

    if (inBurned && !isAgs) {
      continue;
    }

    if (isAgs) {
      cleanedAccounts.push({
        ...acc,
        role: 'adgensys',
        tenantId: 'system_adgensys_root',
        primaryTenantId: undefined,
        canActAsAdGenSys: true,
        canActAsSuperAdmin: false,
        companyName: undefined,
        enterpriseISU: undefined,
        companySetupCompleted: true,
        functionTitle: 'Administrateur Général des Systèmes (AdGenSys)',
        department: 'Gouvernance Générale Système & Serveur SaaS',
      });
    } else {
      cleanedAccounts.push(acc);
    }
  }

  return { cleanedAccounts, burnedEnterprises };
}

interface AuthPortalProps {
  accounts: LocalAccountRecord[];
  onRegisterSuperAdmin: (newAccount: LocalAccountRecord, channel: 'email' | 'whatsapp') => void;
  onLoginSuccess: (account: LocalAccountRecord, cloudPayload?: CloudAuthHydrationPayload) => void;
  onResetPassword: (email: string, newPassword: string) => boolean;
  lockNotice?: string | null;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  accounts,
  onRegisterSuperAdmin,
  onLoginSuccess,
  onResetPassword,
  lockNotice,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Anti-Bot Honeypot & Human Verification Challenge State
  const [botHoneypotField, setBotHoneypotField] = useState('');
  const [humanVerifiedChecked, setHumanVerifiedChecked] = useState(true);
  const [challengeSeed, setChallengeSeed] = useState(() => Math.floor(Math.random() * 900) + 100);
  const challengePair = useMemo(() => {
    const a = (challengeSeed % 7) + 2;
    const b = ((challengeSeed >> 2) % 6) + 1;
    return { a, b, sum: a + b };
  }, [challengeSeed]);
  const [challengeInput, setChallengeInput] = useState(() => String(((Math.floor(100) % 7) + 2) + 1));
  const [useMathChallenge, setUseMathChallenge] = useState(false);

  // 1. Register Super-Admin / AdGenSys / Client 24/7 Form State
  const [registrationAccountMode, setRegistrationAccountMode] = useState<
    'super_admin' | 'adgensys' | 'client_24_7'
  >('super_admin');
  const [loginPortalTarget, setLoginPortalTarget] = useState<
    'enterprise_user' | 'personnel_24_7' | 'client_24_7'
  >('enterprise_user');
  const [regFullName, setRegFullName] = useState('');
  const [regCountryCode, setRegCountryCode] = useState('CI');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regChannel, setRegChannel] = useState<'email' | 'whatsapp'>('whatsapp');
  // Lettres AGS déjà prescrites en avance dans la zone de texte : "A-G-S"
  const [adGenSysCodeInput, setAdGenSysCodeInput] = useState('A-G-S');
  const [adGenSysFailedAttempts, setAdGenSysFailedAttempts] = useState(0);
  const [adGenSysResolutionNote, setAdGenSysResolutionNote] = useState<string>('');
  const [regError, setRegError] = useState('');
  const [createdDispatch, setCreatedDispatch] = useState<{
    account: LocalAccountRecord;
    channel: 'email' | 'whatsapp';
    roleResolutionMessage?: string;
  } | null>(null);
  const [copiedPwd, setCopiedPwd] = useState(false);

  const currentAdGenSysExample = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `A${yyyy}-G-S${mm}`;
  }, []);

  // Maintient les lettres prescrites A, -G-, S dans la zone de texte tout en facilitant la saisie
  const handleAdGenSysInputChange = (rawVal: string) => {
    const upper = rawVal.toUpperCase().replace(/\s+/g, '');
    if (!upper) {
      setAdGenSysCodeInput('A-G-S');
      return;
    }
    // Si l'utilisateur tape directement les chiffres à la suite de "A-G-S" (ex: "A-G-S202610")
    const appendMatch = upper.match(/^A-G-S(\d{1,6})$/);
    if (appendMatch) {
      const digits = appendMatch[1];
      if (digits.length <= 4) {
        setAdGenSysCodeInput(`A${digits}-G-S`);
      } else {
        setAdGenSysCodeInput(`A${digits.slice(0, 4)}-G-S${digits.slice(4, 6)}`);
      }
      return;
    }
    // Si la chaîne respecte déjà la structure contenant A, -G-, S
    if (upper.startsWith('A') && upper.includes('-G-S')) {
      setAdGenSysCodeInput(upper);
      return;
    }
    // Sinon on extrait les deux blocs numériques ou on restaure les lettres prescrites A, -G-, S
    const parts = upper.split(/[^0-9]+/).filter(Boolean);
    if (parts.length === 0) {
      setAdGenSysCodeInput('A-G-S');
    } else if (parts.length === 1) {
      const d = parts[0];
      if (d.length <= 4) {
        setAdGenSysCodeInput(`A${d}-G-S`);
      } else {
        setAdGenSysCodeInput(`A${d.slice(0, 4)}-G-S${d.slice(4, 6)}`);
      }
    } else {
      setAdGenSysCodeInput(`A${parts[0].slice(0, 6)}-G-S${parts[1].slice(0, 4)}`);
    }
  };

  // 2. Login Form State & Universal Multi-Terminal / Multi-Browser Directory Sync
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthenticatingCloud, setIsAuthenticatingCloud] = useState(false);
  const [cloudSyncedAccounts, setCloudSyncedAccounts] = useState<LocalAccountRecord[]>([]);
  const [cloudVaultReady, setCloudVaultReady] = useState<boolean>(true);
  const [pendingFirstLoginAccount, setPendingFirstLoginAccount] =
    useState<LocalAccountRecord | null>(null);
  const [pendingCloudPayload, setPendingCloudPayload] =
    useState<CloudAuthHydrationPayload | undefined>(undefined);
  const [pendingDualRoleSelection, setPendingDualRoleSelection] = useState<{
    account: LocalAccountRecord;
    cloudPayload?: CloudAuthHydrationPayload;
  } | null>(null);
  const [pendingClientEnterpriseSelection, setPendingClientEnterpriseSelection] = useState<{
    account: LocalAccountRecord;
    cloudPayload?: CloudAuthHydrationPayload;
    enterprises: Array<{
      tenantId: string;
      companyName: string;
      isu?: string;
      countryName?: string;
      projectsCount?: number;
      accountForTenant?: LocalAccountRecord;
    }>;
  } | null>(null);
  const [firstLoginNewPassword, setFirstLoginNewPassword] = useState('');
  const [firstLoginConfirmPassword, setFirstLoginConfirmPassword] = useState('');

  // Instant OTP Verification State triggered automatically on click "Se connecter à mon espace privé"
  const [loginPreferredOtpChannel, setLoginPreferredOtpChannel] =
    useState<InstantMessageChannel>('whatsapp');
  const [pendingLoginOtpVerification, setPendingLoginOtpVerification] = useState<{
    account: LocalAccountRecord;
    cloudPayload?: CloudAuthHydrationPayload;
    otpResult: InstantOtpSendResult;
  } | null>(null);
  const [loginOtpInput, setLoginOtpInput] = useState('');
  const [loginOtpError, setLoginOtpError] = useState('');
  const [isSendingLoginOtp, setIsSendingLoginOtp] = useState(false);

  // Détection automatique du terminal (Smartphone, Tablette, Ordinateur) et du Navigateur Internet
  const clientDeviceAndBrowserInfo = useMemo(() => {
    if (typeof navigator === 'undefined') {
      return {
        terminalType: 'Ordinateur' as 'Smartphone' | 'Tablette' | 'Ordinateur',
        browserName: 'Navigateur Web',
      };
    }
    const ua = navigator.userAgent || '';
    const isTablet =
      /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
      (/Android/i.test(ua) && !/Mobile/i.test(ua)) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSmartphone =
      !isTablet && /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(ua);
    const terminalType: 'Smartphone' | 'Tablette' | 'Ordinateur' = isSmartphone
      ? 'Smartphone'
      : isTablet
      ? 'Tablette'
      : 'Ordinateur';

    let browserName = 'Navigateur Web';
    if (/Edg\//i.test(ua)) browserName = 'Microsoft Edge';
    else if (/OPR\/|Opera/i.test(ua)) browserName = 'Opera';
    else if (/SamsungBrowser/i.test(ua)) browserName = 'Samsung Internet';
    else if (/Chrome\/|CriOS/i.test(ua)) browserName = 'Google Chrome';
    else if (/Firefox\/|FxiOS/i.test(ua)) browserName = 'Mozilla Firefox';
    else if (/Safari\//i.test(ua)) browserName = 'Apple Safari';

    return { terminalType, browserName };
  }, []);

  // Synchronisation automatique bidirectionnelle des comptes avec le Coffre Cloud dès l'ouverture sur n'importe quel navigateur
  useEffect(() => {
    let active = true;
    const syncDirectoryWithCloud = async () => {
      try {
        if (accounts.length > 0) {
          await fetch('/api/saas/tenant-vault/backup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Terminal': clientDeviceAndBrowserInfo.terminalType,
              'X-Client-Browser': clientDeviceAndBrowserInfo.browserName,
            },
            body: JSON.stringify({ accounts }),
          }).catch(() => {});
        }
        const res = await fetch('/api/saas/tenant-vault/restore', {
          method: 'GET',
          headers: {
            'X-Client-Terminal': clientDeviceAndBrowserInfo.terminalType,
            'X-Client-Browser': clientDeviceAndBrowserInfo.browserName,
          },
        });
        if (res.ok && active) {
          const data = await res.json();
          if (Array.isArray(data?.accounts)) {
            setCloudSyncedAccounts(data.accounts as LocalAccountRecord[]);
            setCloudVaultReady(true);
          }
        }
        // Enregistrement automatique dans les mémoires des serveurs (SaaS et Web) des identités numériques des entreprises existantes
        await autoBackfillExistingEnterprisesToServerMemories();
      } catch {
        // Mode hors-ligne : bascule transparente sur le cache local
        void autoBackfillExistingEnterprisesToServerMemories();
      }
    };
    syncDirectoryWithCloud();
    return () => {
      active = false;
    };
  }, [accounts, clientDeviceAndBrowserInfo]);

  const effectiveAccountsDirectory = useMemo(() => {
    const map = new Map<string, LocalAccountRecord>();
    const normalizeDirectoryItem = (
      rawItem: any,
      inferredPortalType?: 'enterprise_user' | 'personnel_24_7' | 'client_24_7'
    ): LocalAccountRecord => {
      const portalType: 'enterprise_user' | 'personnel_24_7' | 'client_24_7' =
        rawItem.accountPortalType ||
        inferredPortalType ||
        (String(rawItem.id || '').startsWith('pers_acc_')
          ? 'personnel_24_7'
          : String(rawItem.id || '').startsWith('cli_acc_')
            ? 'client_24_7'
            : 'enterprise_user');
      const pwd =
        rawItem.currentPassword ||
        rawItem.passwordHash ||
        rawItem.defaultPassword ||
        rawItem.defaultTemporaryPassword ||
        'MEP-2026!';
      const defPwd =
        rawItem.defaultPassword ||
        rawItem.defaultTemporaryPassword ||
        rawItem.passwordHash ||
        pwd;
      return {
        ...rawItem,
        id: rawItem.id || `acc_${Date.now()}`,
        tenantId: rawItem.tenantId || 'default_tenant',
        fullName: (rawItem.fullName || 'UTILISATEUR').toUpperCase(),
        phoneDialCode: rawItem.phoneDialCode || '+225',
        phoneNumber: rawItem.phoneNumber || '0700000000',
        email: (rawItem.email || '').trim().toLowerCase(),
        role: rawItem.role || 'collaborator',
        functionTitle:
          rawItem.functionTitle ||
          (portalType === 'personnel_24_7'
            ? 'Personnel Salarié (Espace 24h/7j)'
            : portalType === 'client_24_7'
              ? 'Client (Espace 24h/7j)'
              : 'Collaborateur'),
        department:
          rawItem.department ||
          (portalType === 'personnel_24_7'
            ? 'Espace Privé Personnel 24h/7j'
            : portalType === 'client_24_7'
              ? 'Portail Client 24h/7j'
              : 'Opérations'),
        currentPassword: pwd,
        defaultPassword: defPwd,
        mustChangePassword: Boolean(rawItem.mustChangePassword),
        isActivated: rawItem.isActivated !== false,
        companySetupCompleted:
          portalType === 'personnel_24_7' || portalType === 'client_24_7'
            ? true
            : Boolean(rawItem.companySetupCompleted),
        accountStatus: rawItem.accountStatus || 'active',
        accountPortalType: portalType,
        createdAt: rawItem.createdAt || new Date().toISOString(),
      };
    };

    for (const acc of accounts) {
      if (acc && acc.id) {
        map.set(acc.id, normalizeDirectoryItem(acc));
      }
    }
    try {
      const extraKeys: Array<{
        key: string;
        portalType?: 'enterprise_user' | 'personnel_24_7' | 'client_24_7';
      }> = [
        { key: 'mep_accounts' },
        { key: 'mep_personal_employee_accounts_v1', portalType: 'personnel_24_7' },
        { key: 'mep_client_portal_accounts_v1', portalType: 'client_24_7' },
      ];
      for (const { key, portalType } of extraKeys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item && item.id) {
                const normalized = normalizeDirectoryItem(item, portalType);
                const prev = map.get(normalized.id);
                map.set(normalized.id, prev ? { ...prev, ...normalized } : normalized);
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
    for (const acc of cloudSyncedAccounts) {
      if (acc && acc.id) {
        const normalized = normalizeDirectoryItem(acc);
        const existing = map.get(normalized.id);
        map.set(normalized.id, existing ? { ...existing, ...normalized } : normalized);
      }
    }
    return Array.from(map.values());
  }, [accounts, cloudSyncedAccounts, mode]);

  // 3. Forgot Password Form State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const selectedCountry =
    WORLD_COUNTRIES.find((c) => c.code === regCountryCode) || WORLD_COUNTRIES[0];

  // Détection en temps réel si les informations saisies appartiennent à un Super-Admin existant
  const matchedExistingSuperAdmin = useMemo(() => {
    const cleanMail = regEmail.trim().toLowerCase();
    const cleanPhoneDigits = `${selectedCountry.dialCode}${regPhone}`.replace(/[^0-9]/g, '');
    const cleanName = regFullName.trim().toUpperCase();
    if (!cleanMail && cleanPhoneDigits.length < 7 && !cleanName) return undefined;
    return effectiveAccountsDirectory.find((a) => {
      if (!a || a.contractTerminated) return false;
      if (a.role !== 'super_admin' && !a.canActAsSuperAdmin) return false;
      const emailMatches =
        cleanMail.length > 3 && (a.email || '').trim().toLowerCase() === cleanMail;
      const aPhoneDigits = (a.phoneNumber || '').replace(/[^0-9]/g, '');
      const phoneMatches =
        cleanPhoneDigits.length >= 8 &&
        aPhoneDigits.length >= 8 &&
        (aPhoneDigits === cleanPhoneDigits || aPhoneDigits.slice(-8) === cleanPhoneDigits.slice(-8));
      const nameMatches =
        cleanName.length >= 4 && (a.fullName || '').trim().toUpperCase() === cleanName;
      return emailMatches || phoneMatches || nameMatches;
    });
  }, [effectiveAccountsDirectory, regEmail, regPhone, regFullName, selectedCountry.dialCode]);

  const isSuperAdminCreatingAdGenSysMode =
    registrationAccountMode === 'adgensys' || Boolean(matchedExistingSuperAdmin);

  // Validate Anti-Bot & WAF Security before any auth operation
  const validateAntiBotAndWaf = (identifier: string, rawInputs: string[]): string | null => {
    // 1. Check Honeypot Trap (only automated bots fill hidden off-screen fields)
    if (botHoneypotField.trim() !== '') {
      recordSecurityIntrusionEvent({
        type: 'BOT_HONEYPOT_TRIGGERED',
        severity: 'critical',
        sourceIdentifier: identifier || 'automated_bot',
        details: `Robot malveillant intercepté via champ piège Honeypot (${botHoneypotField.slice(0, 40)}).`,
      });
      return 'Accès bloqué par le bouclier anti-intrusion : activité automatisée (robot) détectée.';
    }

    // 2. Check WAF Malicious Payloads
    for (const val of rawInputs) {
      const check = detectMaliciousIntrusionPattern(val);
      if (check.malicious) {
        recordSecurityIntrusionEvent({
          type: 'XSS_SQLI_ATTEMPT_BLOCKED',
          severity: 'critical',
          sourceIdentifier: identifier || 'unknown',
          details: `Charge utile malveillante bloquée par le WAF : ${check.reason}`,
        });
        return `Tentative d'intrusion bloquée (${check.reason}). Incident journalisé.`;
      }
    }

    // 3. Check Human Verification Attestation
    if (!humanVerifiedChecked) {
      recordSecurityIntrusionEvent({
        type: 'HUMAN_CHALLENGE_FAILED',
        severity: 'medium',
        sourceIdentifier: identifier || 'unknown',
        details: 'Tentative de soumission sans validation du bouclier de vérification humaine.',
      });
      return 'Veuillez cocher la vérification de sécurité « Je suis un utilisateur humain légitime ».';
    }

    if (useMathChallenge && Number(challengeInput.trim()) !== challengePair.sum) {
      recordSecurityIntrusionEvent({
        type: 'HUMAN_CHALLENGE_FAILED',
        severity: 'high',
        sourceIdentifier: identifier || 'unknown',
        details: `Réponse incorrecte au défi arithmétique anti-robot (${challengeInput} ≠ ${challengePair.sum}).`,
      });
      return `Code de vérification anti-robot incorrect (${challengePair.a} + ${challengePair.b} = ${challengePair.sum}).`;
    }

    // 4. Check Brute-Force Rate Limit
    const rate = checkAuthRateLimit(identifier);
    if (!rate.allowed) {
      return `Protection anti-force brute active : compte temporairement protégé pendant ${rate.lockedSecondsRemaining}s suite à des tentatives répétées.`;
    }

    return null;
  };

  // Handle Unified Super-Admin or AdGenSys Creation (decided solely by AdGenSys code entry, omission, or 3 failed attempts)
  const handleFinalizeCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regFullName.trim() || !regPhone.trim() || !regEmail.trim()) return;

    const securityBlock = validateAntiBotAndWaf(regEmail, [
      regFullName,
      regPhone,
      regEmail,
      adGenSysCodeInput,
    ]);
    if (securityBlock) {
      setRegError(securityBlock);
      return;
    }

    const upperName = sanitizeSecurityInput(regFullName.trim(), 100).toUpperCase();
    const formattedPhone = `${selectedCountry.dialCode} ${sanitizeSecurityInput(regPhone.trim(), 30)}`;
    const cleanEmail = sanitizeSecurityInput(regEmail.trim(), 150).toLowerCase();
    const cleanPhoneDigits = formattedPhone.replace(/[^0-9]/g, '');

    // Si création d'un Compte Client (24h/7j) — même mécanisme que les autres types de comptes
    if (registrationAccountMode === 'client_24_7') {
      const generatedClientPwd = generateDefaultPassword('CLI');
      const newClientAcc: LocalAccountRecord = {
        id: `cli_acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        tenantId: 'multi_provider_client_hub',
        primaryTenantId: 'multi_provider_client_hub',
        fullName: upperName,
        phoneDialCode: selectedCountry.dialCode,
        phoneNumber: formattedPhone,
        email: cleanEmail,
        role: 'viewer',
        functionTitle: 'Compte Client Multi-Prestataires (24h/7j)',
        department: 'Maître d’Ouvrage / Client Externe',
        defaultPassword: generatedClientPwd,
        currentPassword: generatedClientPwd,
        mustChangePassword: true,
        isActivated: true,
        companySetupCompleted: true,
        accountStatus: 'active',
        accountPortalType: 'client_24_7',
        canAlsoUseClientAccount: true,
        createdAt: new Date().toISOString(),
        contractTerminated: false,
      };
      try {
        const rawCli = localStorage.getItem('mep_client_portal_accounts_v1');
        const parsedCli = rawCli ? JSON.parse(rawCli) : [];
        const nextCli = [
          newClientAcc,
          ...(Array.isArray(parsedCli)
            ? parsedCli.filter((c: any) => (c?.email || '').toLowerCase() !== cleanEmail)
            : []),
        ];
        localStorage.setItem('mep_client_portal_accounts_v1', JSON.stringify(nextCli));
      } catch {
        // ignore
      }
      resetAuthRateLimit(cleanEmail);
      onRegisterSuperAdmin(newClientAcc, regChannel);
      setCreatedDispatch({
        account: newClientAcc,
        channel: regChannel,
        roleResolutionMessage:
          'Compte Client 24h/7j créé avec succès. Connectez-vous avec votre adresse e-mail et votre mot de passe par défaut pour consulter vos projets auprès de vos entreprises prestataires, imprimer vos documents et solder vos états en ligne.',
      });
      return;
    }

    // Vérification du Code AdGenSys
    const codeCheck = validateAdGenSysCode(adGenSysCodeInput);

    // Vérifier dans tout le répertoire (local + Cloud) si un Super-Admin ou un AdGenSys existant renseigne ses informations
    const existingSuperAdminAccount = effectiveAccountsDirectory.find((a) => {
      if (!a || a.contractTerminated) return false;
      if (a.role !== 'super_admin' && !a.canActAsSuperAdmin) return false;
      const emailMatch = (a.email || '').trim().toLowerCase() === cleanEmail;
      const aPhoneDigits = (a.phoneNumber || '').replace(/[^0-9]/g, '');
      const phoneMatch =
        cleanPhoneDigits.length >= 8 &&
        aPhoneDigits.length >= 8 &&
        (aPhoneDigits === cleanPhoneDigits || aPhoneDigits.slice(-8) === cleanPhoneDigits.slice(-8));
      const nameMatch = (a.fullName || '').trim().toUpperCase() === upperName;
      return emailMatch || phoneMatch || nameMatch;
    });

    const existingAdGenSysAccount = effectiveAccountsDirectory.find((a) => {
      if (!a || a.contractTerminated) return false;
      if (a.role !== 'adgensys' && !a.canActAsAdGenSys) return false;
      const emailMatch = (a.email || '').trim().toLowerCase() === cleanEmail;
      const aPhoneDigits = (a.phoneNumber || '').replace(/[^0-9]/g, '');
      const phoneMatch =
        cleanPhoneDigits.length >= 8 &&
        aPhoneDigits.length >= 8 &&
        (aPhoneDigits === cleanPhoneDigits || aPhoneDigits.slice(-8) === cleanPhoneDigits.slice(-8));
      const nameMatch = (a.fullName || '').trim().toUpperCase() === upperName;
      return emailMatch || phoneMatch || nameMatch;
    });

    // RÈGLE UNIFIÉE : Seule la saisie ou non du code AdGenSys ou encore ses trois (3) saisies erronées décide du type de compte à créer
    let assignedRole: 'super_admin' | 'adgensys' = 'super_admin';
    let resolutionMessage =
      'Aucun code AdGenSys saisi : le système a automatiquement créé un compte Super-Admin.';

    if (codeCheck.isValid) {
      if (existingAdGenSysAccount) {
        setRegError(
          'Votre compte AdGenSys existe déjà. Veuillez vous authentifier depuis l’onglet « Connexion ».'
        );
        return;
      }
      assignedRole = 'adgensys';
      resolutionMessage = '';
    } else if (codeCheck.isBlank) {
      assignedRole = 'super_admin';
      resolutionMessage = '';
    } else {
      const nextFails = adGenSysFailedAttempts + 1;
      setAdGenSysFailedAttempts(nextFails);
      if (nextFails < 3) {
        setRegError('Code invalide. Veuillez vérifier votre saisie.');
        return;
      }
      assignedRole = 'super_admin';
      setAdGenSysCodeInput('A-G-S');
      resolutionMessage = '';
      setAdGenSysResolutionNote('');
    }

    // INTERDICTION ABSOLUE : Un AdGenSys ne doit JAMAIS être Super-Admin.
    // 1) Si un AdGenSys existant tente de créer un compte Super-Admin, c'est strictement interdit.
    if (assignedRole === 'super_admin' && existingAdGenSysAccount) {
      const targetBurnTenant =
        existingAdGenSysAccount.primaryTenantId || existingAdGenSysAccount.tenantId;
      if (targetBurnTenant && targetBurnTenant !== 'system_adgensys_root') {
        permanentlyBurnEnterpriseAndAllData(
          targetBurnTenant,
          'Tentative de cumul AdGenSys + Super-Admin lors de la création de compte.'
        );
      }
      setRegError(
        'Interdiction absolue de souveraineté : Un AdGenSys ne doit jamais être Super-Admin. Toute entreprise rattachée à un AdGenSys en tant que Super-Admin est définitivement brûlée avec toutes ses données.'
      );
      return;
    }

    // 2) Si un Super-Admin existant devient AdGenSys (ou cumule les deux), on brûle définitivement l'entreprise pour laquelle il était Super-Admin et toutes ses données !
    if (assignedRole === 'adgensys' && existingSuperAdminAccount) {
      const tenantToBurn =
        existingSuperAdminAccount.tenantId !== 'system_adgensys_root'
          ? existingSuperAdminAccount.tenantId
          : existingSuperAdminAccount.primaryTenantId || '';
      const burnReport = permanentlyBurnEnterpriseAndAllData(
        tenantToBurn,
        `Cumul AdGenSys + Super-Admin détecté pour ${existingSuperAdminAccount.fullName}. Destruction irréversible de l'entreprise et de toutes ses données.`
      );
      resolutionMessage = `Règle stricte appliquée : Un AdGenSys ne pouvant pas être Super-Admin, l'entreprise « ${burnReport.burnedCompanyName} » pour laquelle ce profil était Super-Admin ainsi que toutes ses données (${burnReport.deletedKeysCount} registres et ${burnReport.purgedAccountsCount} compte(s)) ont été définitivement brûlés.`;
    }

    if (assignedRole === 'super_admin') {
      const exclusivityCheck = checkExclusiveEnterpriseAffiliation({
        fullName: upperName,
        email: cleanEmail,
        phone: formattedPhone,
      });

      if (exclusivityCheck.conflict) {
        setRegError(
          exclusivityCheck.reason ||
            'Cet utilisateur est déjà rattaché à une entreprise active.'
        );
        return;
      }
    }

    const isAdGenSys = assignedRole === 'adgensys';
    const generatedPwd = generateDefaultPassword(isAdGenSys ? 'AGS' : 'MEP');
    const enterpriseTenantId = `tenant_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const uniqueTenantId = isAdGenSys ? 'system_adgensys_root' : enterpriseTenantId;

    const newCreatedAccount: LocalAccountRecord = {
      id: `${isAdGenSys ? 'ags' : 'sa'}_${Date.now()}`,
      tenantId: uniqueTenantId,
      primaryTenantId: isAdGenSys ? undefined : enterpriseTenantId,
      fullName: upperName,
      phoneDialCode: selectedCountry.dialCode,
      phoneNumber: formattedPhone,
      email: cleanEmail,
      role: assignedRole,
      functionTitle: isAdGenSys
        ? 'Administrateur Général des Systèmes (AdGenSys)'
        : 'Direction Générale (Super-Admin)',
      department: isAdGenSys
        ? 'Gouvernance Générale Système & Serveur SaaS'
        : 'Direction Générale',
      defaultPassword: generatedPwd,
      currentPassword: generatedPwd,
      mustChangePassword: true,
      isActivated: false,
      companySetupCompleted: isAdGenSys ? true : false,
      accountStatus: 'active',
      canActAsAdGenSys: isAdGenSys,
      canActAsSuperAdmin: !isAdGenSys,
      createdAt: new Date().toISOString(),
      contractTerminated: false,
    };

    try {
      await fetch('/api/saas/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: newCreatedAccount,
          originTerminal: detectClientTerminalMetadata('auth_portal_terminal'),
        }),
      });
    } catch {
      // Saved locally and synced automatically on next connection
    }

    // Envoi automatique et instantané des identifiants via le serveur de messagerie temps réel
    const fullFormattedPhone = `${newCreatedAccount.phoneDialCode || ''} ${newCreatedAccount.phoneNumber || ''}`.trim();
    const welcomeBody = `Bonjour ${newCreatedAccount.fullName},\n\nBienvenue sur My Easy Project (${
      newCreatedAccount.role === 'adgensys'
        ? 'Administrateur Général des Systèmes - AdGenSys'
        : 'Super-Admin'
    }).\nIdentifiant : ${newCreatedAccount.email}\nMot de passe temporaire : ${newCreatedAccount.defaultPassword}\n\nLors de votre clic sur "Se connecter à mon espace privé", un code OTP vous sera envoyé instantanément.`;

    void dispatchInstantMessage({
      tenantId: newCreatedAccount.tenantId,
      channel: regChannel,
      mode: 'automatic',
      category: 'team_credentials',
      recipientName: newCreatedAccount.fullName,
      recipientPhone: fullFormattedPhone,
      recipientEmail: newCreatedAccount.email,
      subject: 'Vos identifiants officiels My Easy Project',
      body: welcomeBody,
      senderName: 'Serveur Authentification My Easy Project',
    });

    // Note: L'entreprise sera enregistrée dans l'annuaire uniquement après sa création effective dans CompanyOnboardingWizard
    resetAuthRateLimit(cleanEmail);
    onRegisterSuperAdmin(newCreatedAccount, regChannel);
    setCreatedDispatch({
      account: newCreatedAccount,
      channel: regChannel,
      roleResolutionMessage: resolutionMessage,
    });
  };

  // Trigger external notification (WhatsApp, SMS or Email) via real-time server + native launcher
  const handleTriggerExternalNotification = (
    acc: LocalAccountRecord,
    channel: 'email' | 'whatsapp' | 'sms'
  ) => {
    const fullPhone = `${acc.phoneDialCode || ''} ${acc.phoneNumber || ''}`.trim();
    const messageBody = `Bonjour ${acc.fullName},\n\nBienvenue sur My Easy Project (${
      acc.role === 'adgensys' ? 'Administrateur Général des Systèmes - AdGenSys' : 'Super-Admin'
    }).\nIdentifiant : ${acc.email}\nMot de passe temporaire : ${acc.defaultPassword}`;

    void dispatchInstantMessage({
      tenantId: acc.tenantId,
      channel,
      mode: 'manual',
      category: 'team_credentials',
      recipientName: acc.fullName,
      recipientPhone: fullPhone,
      recipientEmail: acc.email,
      subject: 'Vos accès My Easy Project',
      body: messageBody,
      senderName: 'Serveur Authentification My Easy Project',
    });

    triggerOptionalExternalChannelApp({
      channel,
      recipientPhone: fullPhone,
      recipientEmail: acc.email,
      subject: 'Vos accès My Easy Project',
      body: messageBody,
    });
  };

  // Vérifie si un AdGenSys est illégalement Super-Admin (cumul interdit entraînant la destruction définitive de l'entreprise)
  const isUserBothSuperAdminAndAdGenSys = (
    acc: LocalAccountRecord,
    cloudPayload?: CloudAuthHydrationPayload
  ): boolean => {
    if (acc.canActAsAdGenSys && acc.canActAsSuperAdmin) return true;
    if (acc.role === 'super_admin' && acc.canActAsAdGenSys) return true;
    if (acc.role === 'adgensys' && acc.canActAsSuperAdmin) return true;
    if (
      acc.role === 'adgensys' &&
      acc.primaryTenantId &&
      acc.primaryTenantId !== 'system_adgensys_root' &&
      acc.primaryTenantId !== 'multi_provider_client_hub'
    ) {
      return true;
    }
    const pool = [
      ...effectiveAccountsDirectory,
      ...(cloudPayload?.allAccountsDirectory || []),
      ...(cloudPayload?.tenantAccounts || []),
    ];
    const cleanMail = (acc.email || '').trim().toLowerCase();
    if (!cleanMail) return false;
    const sameUserAccounts = pool.filter(
      (a) => a && (a.email || '').trim().toLowerCase() === cleanMail
    );
    const hasSA = sameUserAccounts.some(
      (a) => a.role === 'super_admin' || a.canActAsSuperAdmin === true
    );
    const hasAGS = sameUserAccounts.some(
      (a) => a.role === 'adgensys' || a.canActAsAdGenSys === true
    );
    return hasSA && hasAGS;
  };

  // Brûle définitivement l'entreprise pour laquelle un AdGenSys est Super-Admin et connecte l'utilisateur uniquement en tant qu'AdGenSys pur
  const enforceBurnEnterpriseOnDualRoleAndLogin = (
    baseAccount: LocalAccountRecord,
    cloudPayload?: CloudAuthHydrationPayload
  ) => {
    const pool = [
      baseAccount,
      ...effectiveAccountsDirectory,
      ...(cloudPayload?.allAccountsDirectory || []),
      ...(cloudPayload?.tenantAccounts || []),
    ];
    const cleanMail = (baseAccount.email || '').trim().toLowerCase();
    const sameUserAccounts = pool.filter(
      (a) => a && (a.email || '').trim().toLowerCase() === cleanMail
    );

    const tenantsToBurn = new Set<string>();
    for (const item of sameUserAccounts) {
      if (
        item.tenantId &&
        item.tenantId !== 'system_adgensys_root' &&
        item.tenantId !== 'multi_provider_client_hub'
      ) {
        tenantsToBurn.add(item.tenantId);
      }
      if (
        item.primaryTenantId &&
        item.primaryTenantId !== 'system_adgensys_root' &&
        item.primaryTenantId !== 'multi_provider_client_hub'
      ) {
        tenantsToBurn.add(item.primaryTenantId);
      }
    }

    tenantsToBurn.forEach((tId) => {
      permanentlyBurnEnterpriseAndAllData(
        tId,
        `Cumul interdit AdGenSys + Super-Admin détecté lors de l'authentification de ${baseAccount.fullName} (${baseAccount.email}). Entreprise et données brûlées définitivement.`
      );
    });

    const sanitizedAdGenSysAccount: LocalAccountRecord = {
      ...baseAccount,
      role: 'adgensys',
      tenantId: 'system_adgensys_root',
      primaryTenantId: undefined,
      canActAsAdGenSys: true,
      canActAsSuperAdmin: false,
      companyName: undefined,
      enterpriseISU: undefined,
      companySetupCompleted: true,
      functionTitle: 'Administrateur Général des Systèmes (AdGenSys)',
      department: 'Gouvernance Générale Système & Serveur SaaS',
    };

    setPendingDualRoleSelection(null);
    onLoginSuccess(sanitizedAdGenSysAccount, undefined);
  };

  const finalizeDualRoleAccountChoice = (
    _chosenRole: 'super_admin' | 'adgensys',
    baseAccount: LocalAccountRecord,
    cloudPayload?: CloudAuthHydrationPayload
  ) => {
    enforceBurnEnterpriseOnDualRoleAndLogin(baseAccount, cloudPayload);
  };

  // State for Single-Terminal Session Conflict & Collaborator Work Schedule Block
  const [terminalConflictState, setTerminalConflictState] = useState<{
    account: LocalAccountRecord;
    cloudPayload?: CloudAuthHydrationPayload;
    existingLock: TerminalSessionLockRecord;
    currentTerminalId: string;
  } | null>(null);
  const [scheduleRestrictionState, setScheduleRestrictionState] = useState<{
    account: LocalAccountRecord;
    evaluation: ScheduleAccessEvaluation;
  } | null>(null);

  // State for Anti-Intrusion & Anti-Robot Remote Disconnection Security Approval (Triple Lock)
  const [showRemoteDisconnectSecurityGate, setShowRemoteDisconnectSecurityGate] = useState(false);
  const [remoteDisconnectChallenge, setRemoteDisconnectChallenge] =
    useState<RemoteDisconnectSecurityChallenge | null>(null);
  const [remoteOtpChannel, setRemoteOtpChannel] = useState<RemoteDisconnectOtpChannel>('whatsapp');
  const [remoteApprovalPassword, setRemoteApprovalPassword] = useState('');
  const [remoteApprovalOtp, setRemoteApprovalOtp] = useState('');
  const [remoteApprovalAntiBot, setRemoteApprovalAntiBot] = useState('');
  const [remoteApprovalHoneypot, setRemoteApprovalHoneypot] = useState('');
  const [remoteApprovalError, setRemoteApprovalError] = useState('');
  const [remoteOtpDispatchedNotice, setRemoteOtpDispatchedNotice] = useState('');

  const [remoteOtpServerReceipt, setRemoteOtpServerReceipt] =
    useState<InstantOtpSendResult | null>(null);

  const startRemoteDisconnectApprovalFlow = async (
    acc: LocalAccountRecord,
    lock: TerminalSessionLockRecord,
    channel: RemoteDisconnectOtpChannel = remoteOtpChannel
  ) => {
    const formattedPhone = acc.phoneNumber
      ? `${acc.phoneDialCode || ''} ${acc.phoneNumber}`.trim()
      : '';
    const chal = initiateRemoteDisconnectSecurityChallenge({
      accountId: acc.id,
      email: acc.email,
      fullName: acc.fullName,
      phoneNumber: formattedPhone || undefined,
      targetTerminalId: lock.terminalId,
      targetTerminalLabel: lock.terminalLabel,
      channel,
    });
    setRemoteDisconnectChallenge(chal);
    setShowRemoteDisconnectSecurityGate(true);
    setRemoteApprovalError('');
    // Le code OTP et le mot de passe ne doivent jamais être pré-remplis
    setRemoteApprovalOtp('');
    setRemoteApprovalAntiBot('');
    setRemoteApprovalPassword('');

    const channelLabel =
      channel === 'whatsapp' ? 'WhatsApp' : channel === 'sms' ? 'SMS' : 'E-mail';
    setRemoteOtpDispatchedNotice(
      `Transmission instantanée de la notification de sécurité et du code OTP par ${channelLabel} vers le compte certifié (${chal.maskedDestination})...`
    );

    const serverOtp = await dispatchInstantAuthOtp({
      accountId: acc.id,
      email: acc.email,
      fullName: acc.fullName,
      phoneNumber: formattedPhone,
      channel,
      purpose: 'remote_disconnect',
      challengeId: chal.challengeId,
      tenantId: acc.tenantId,
      companyName: acc.companyName || 'MY EASY PROJECT',
    });

    setRemoteOtpServerReceipt(serverOtp);
    setRemoteOtpDispatchedNotice(
      `Notification & code OTP délivrés dans le compte ${channelLabel} du titulaire (${serverOtp.maskedDestination || chal.maskedDestination} · ${serverOtp.latencyMs} ms · Réf : ${serverOtp.providerReceiptId}).`
    );
  };

  // Résout la liste de toutes les entreprises dans lesquelles un client (ou utilisateur multi-entreprises) est enregistré
  const resolveRegisteredEnterprisesForAccount = (
    acc: LocalAccountRecord,
    cloudPayload?: CloudAuthHydrationPayload
  ): Array<{
    tenantId: string;
    companyName: string;
    isu?: string;
    countryName?: string;
    projectsCount?: number;
    accountForTenant?: LocalAccountRecord;
  }> => {
    const map = new Map<
      string,
      {
        tenantId: string;
        companyName: string;
        isu?: string;
        countryName?: string;
        projectsCount?: number;
        accountForTenant?: LocalAccountRecord;
      }
    >();

    // Charger le registre de toutes les entreprises
    let registry: Record<string, any> = {};
    try {
      const regRaw =
        localStorage.getItem('mep_enterprise_registry_v3') ||
        localStorage.getItem('mep_enterprise_registry_permanent_backup');
      if (regRaw) {
        registry = { ...JSON.parse(regRaw) };
      }
    } catch {
      // ignore
    }
    if (cloudPayload?.enterpriseRegistry && typeof cloudPayload.enterpriseRegistry === 'object') {
      registry = { ...registry, ...cloudPayload.enterpriseRegistry };
    }

    const addOption = (
      tenantId: string,
      companyName: string,
      accountForTenant?: LocalAccountRecord,
      projectsCount = 0
    ) => {
      const cleanName = (companyName || '').trim();
      if (!cleanName) return;
      const key = `${(tenantId || 'default_tenant').toLowerCase()}::${cleanName.toLowerCase()}`;
      const entMeta = registry[tenantId] || {};
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          tenantId: tenantId || 'default_tenant',
          companyName: cleanName,
          isu: entMeta.isu || accountForTenant?.enterpriseISU,
          countryName: entMeta.countryName,
          projectsCount,
          accountForTenant,
        });
      } else if (projectsCount > (existing.projectsCount || 0)) {
        map.set(key, { ...existing, projectsCount });
      }
    };

    // 1. Entreprise directement rattachée au compte authentifié
    const primaryCompanyName =
      cloudPayload?.enterpriseDetails?.companyName ||
      registry[acc.tenantId]?.companyName ||
      acc.companyName;
    if (primaryCompanyName) {
      addOption(acc.tenantId || 'default_tenant', primaryCompanyName, acc, 1);
    }

    // 2. Si c'est un compte Client (ou disposant aussi d'un accès client), rechercher toutes les entreprises où ce client est enregistré
    const cleanEmail = (acc.email || '').trim().toLowerCase();
    const cleanName = (acc.fullName || '').trim().toLowerCase();

    if (acc.accountPortalType === 'client_24_7' || acc.canAlsoUseClientAccount) {
      // Chercher dans mep_client_portal_accounts_v1 et effectiveAccountsDirectory
      for (const item of effectiveAccountsDirectory) {
        if (
          item.accountPortalType === 'client_24_7' &&
          ((cleanEmail && (item.email || '').trim().toLowerCase() === cleanEmail) ||
            (cleanName && (item.fullName || '').trim().toLowerCase() === cleanName))
        ) {
          const cName =
            registry[item.tenantId]?.companyName ||
            item.companyName ||
            primaryCompanyName ||
            'Entreprise Prestataire Abonnée';
          addOption(item.tenantId || 'default_tenant', cName, item, 1);
        }
      }

      // Parcourir chaque entreprise du registre pour vérifier si ce client figure dans ses fiches clients ou projets
      Object.entries(registry).forEach(([tId, ent]: [string, any]) => {
        if (!ent || !ent.companyName) return;
        let matchedProjects = 0;
        let matchedInTenant = false;
        try {
          const projRaw = localStorage.getItem(`mep_${tId}_projects`);
          if (projRaw) {
            const projs = JSON.parse(projRaw);
            if (Array.isArray(projs)) {
              const cliProjs = projs.filter(
                (p: any) =>
                  (cleanEmail && (p.clientEmail || '').trim().toLowerCase() === cleanEmail) ||
                  (cleanName && (p.clientName || '').trim().toLowerCase() === cleanName)
              );
              if (cliProjs.length > 0) {
                matchedInTenant = true;
                matchedProjects = cliProjs.length;
              }
            }
          }
          const legalRaw = localStorage.getItem(`mep_client_legal_profiles_${tId}`);
          if (legalRaw) {
            const profiles = JSON.parse(legalRaw);
            if (Array.isArray(profiles)) {
              const foundProfile = profiles.some(
                (c: any) =>
                  (cleanEmail && (c.email || '').trim().toLowerCase() === cleanEmail) ||
                  (cleanName && (c.name || '').trim().toLowerCase() === cleanName)
              );
              if (foundProfile) matchedInTenant = true;
            }
          }
        } catch {
          // ignore
        }
        if (matchedInTenant) {
          addOption(
            tId,
            ent.companyName,
            { ...acc, tenantId: tId, companyName: ent.companyName, accountPortalType: 'client_24_7' },
            matchedProjects
          );
        }
      });
    }

    return Array.from(map.values());
  };

  // Finalize login once the user has entered the exact OTP received by WhatsApp, SMS or Email
  const completeAuthenticatedLoginAfterOtp = (
    found: LocalAccountRecord,
    cloudPayload?: CloudAuthHydrationPayload
  ) => {
    resetAuthRateLimit(found.email);
    setPendingLoginOtpVerification(null);
    setLoginOtpInput('');
    setLoginOtpError('');
    setLoginPassword('');

    if (found.mustChangePassword) {
      setPendingFirstLoginAccount(found);
      setPendingCloudPayload(cloudPayload);
      return;
    }

    claimTerminalSessionLock({
      ...found,
      companyName: cloudPayload?.enterpriseDetails?.companyName || found.companyName,
      enterpriseISU: cloudPayload?.enterpriseDetails?.isu || found.enterpriseISU,
    });

    // Si c'est un client enregistré dans plusieurs entreprises, afficher la liste de toutes ces entreprises pour lui laisser le choix
    if (found.accountPortalType === 'client_24_7') {
      const clientEnterprises = resolveRegisteredEnterprisesForAccount(found, cloudPayload);
      if (clientEnterprises.length > 1) {
        setPendingClientEnterpriseSelection({
          account: found,
          cloudPayload,
          enterprises: clientEnterprises,
        });
        return;
      }
      if (clientEnterprises.length === 1) {
        const chosen = clientEnterprises[0];
        onLoginSuccess(
          {
            ...(chosen.accountForTenant || found),
            tenantId: chosen.tenantId,
            companyName: chosen.companyName,
            accountPortalType: 'client_24_7',
          },
          cloudPayload
        );
        return;
      }
    }

    if (isUserBothSuperAdminAndAdGenSys(found, cloudPayload)) {
      enforceBurnEnterpriseOnDualRoleAndLogin(found, cloudPayload);
      return;
    }
    onLoginSuccess(found, cloudPayload);
  };

  // Automatically dispatch a real-time 6-digit OTP to the user's phone/email upon clicking "Se connecter à mon espace privé"
  const triggerAutomaticLoginOtpStep = async (
    found: LocalAccountRecord,
    cloudPayload?: CloudAuthHydrationPayload,
    channelOverride?: InstantMessageChannel
  ) => {
    const channelToUse = channelOverride || loginPreferredOtpChannel;
    const formattedPhone = found.phoneNumber
      ? `${found.phoneDialCode || ''} ${found.phoneNumber}`.trim()
      : '';

    setIsSendingLoginOtp(true);
    setLoginOtpError('');
    setLoginOtpInput(''); // Jamais pré-rempli : l'utilisateur saisit le code tel que reçu
    setLoginPassword(''); // Le mot de passe n'est jamais conservé pré-rempli

    try {
      const otpRes = await dispatchInstantAuthOtp({
        accountId: found.id,
        email: found.email,
        fullName: found.fullName,
        phoneNumber: formattedPhone,
        channel: channelToUse,
        purpose: 'login_private_space',
        tenantId: found.tenantId,
        companyName:
          cloudPayload?.enterpriseDetails?.companyName ||
          found.companyName ||
          'MY EASY PROJECT',
      });

      setPendingLoginOtpVerification({
        account: found,
        cloudPayload,
        otpResult: otpRes,
      });
    } finally {
      setIsSendingLoginOtp(false);
    }
  };

  const handleVerifyLoginOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingLoginOtpVerification) return;
    setLoginOtpError('');

    const cleanOtp = loginOtpInput.replace(/[^0-9]/g, '').trim();
    if (cleanOtp.length !== 6) {
      setLoginOtpError(
        'Veuillez renseigner les 6 chiffres exacts du code OTP reçu sur votre numéro ou e-mail.'
      );
      return;
    }

    const verification = await verifyServerAuthOtp({
      accountId: pendingLoginOtpVerification.account.id,
      purpose: 'login_private_space',
      enteredOtp: cleanOtp,
      expectedLocalOtp: pendingLoginOtpVerification.otpResult.otpCode,
    });

    if (!verification.verified) {
      setLoginOtpError(
        verification.message ||
          'Code OTP incorrect. Veuillez vérifier le message reçu par WhatsApp, SMS ou E-mail.'
      );
      return;
    }

    completeAuthenticatedLoginAfterOtp(
      pendingLoginOtpVerification.account,
      pendingLoginOtpVerification.cloudPayload
    );
  };

  // Authenticate account helper
  const authenticateAccount = (
    found: LocalAccountRecord,
    cloudPayload?: CloudAuthHydrationPayload,
    bypassTerminalConflict = false
  ) => {
    setLoginError('');
    setTerminalConflictState(null);
    setShowRemoteDisconnectSecurityGate(false);
    setRemoteDisconnectChallenge(null);
    setRemoteApprovalError('');
    setScheduleRestrictionState(null);

    if (found.contractTerminated) {
      setLoginError(
        `Accès clôturé suite à une fin de contrat (${found.terminationDate || ''}).`
      );
      return;
    }
    if (found.accountStatus === 'blocked') {
      setLoginError(
        'Accès bloqué : ce compte utilisateur a été bloqué par le Super-Admin de votre entreprise, le MOAS ou l’Administrateur Général des Systèmes (AdGenSys).'
      );
      return;
    }
    if (found.isActivated === false && !found.mustChangePassword) {
      setLoginError(
        'Compte en attente d’activation : veuillez demander au Super-Admin de votre entreprise d’activer votre compte utilisateur.'
      );
      return;
    }

    // Check 1: Collaborator Connection Schedule (Jours, Plages Horaires, Pauses, Heures Supplémentaires & Dérogation Super-Admin)
    const scheduleEval = evaluateCollaboratorScheduleAccess(found);
    if (!scheduleEval.allowed) {
      setScheduleRestrictionState({
        account: found,
        evaluation: scheduleEval,
      });
      setLoginError(scheduleEval.reason);
      return;
    }

    // Check 2: Single-Terminal Session Lock (1 seul terminal/navigateur actif à la fois par compte)
    if (!bypassTerminalConflict) {
      const conflictCheck = checkTerminalSessionConflict(found);
      if (conflictCheck.conflict && conflictCheck.existingLock) {
        setLoginPassword('');
        setTerminalConflictState({
          account: found,
          cloudPayload,
          existingLock: conflictCheck.existingLock,
          currentTerminalId: conflictCheck.currentTerminalId,
        });
        void startRemoteDisconnectApprovalFlow(
          found,
          conflictCheck.existingLock,
          remoteOtpChannel
        );
        setLoginError(
          `Ce compte est actuellement ouvert sur un autre terminal (${conflictCheck.existingLock.terminalLabel} — ID: ${conflictCheck.existingLock.terminalId}). Pour éviter toute intrusion malveillante, une notification contenant le code OTP à 6 chiffres vient d'être transmise exclusivement dans votre compte (${
            remoteOtpChannel === 'whatsapp'
              ? 'WhatsApp'
              : remoteOtpChannel === 'sms'
              ? 'SMS'
              : 'E-mail'
          }) et sur votre session active.`
        );
        return;
      }
    }

    completeAuthenticatedLoginAfterOtp(found, cloudPayload);
  };

  // Handle Login submission (Universal Internet Auth + Local Fallback)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cleanIdentifier = sanitizeSecurityInput(
      loginEmail.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').trim(),
      150
    ).toLowerCase();
    const rawPwd = loginPassword.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    const securityBlock = validateAntiBotAndWaf(cleanIdentifier, [loginEmail, loginPassword]);
    if (securityBlock) {
      setLoginError(securityBlock);
      return;
    }

    setIsAuthenticatingCloud(true);
    try {
      // 1. Authenticate over the internet against the central Cloud Customer Vault (works from any Smartphone, Tablet or PC worldwide and any browser)
      const currentTerminalId = getOrCreateCurrentTerminalId();
      const cloudRes = await fetch('/api/saas/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Terminal': clientDeviceAndBrowserInfo.terminalType,
          'X-Client-Browser': clientDeviceAndBrowserInfo.browserName,
          'X-Client-Terminal-Id': currentTerminalId,
        },
        body: JSON.stringify({
          identifier: cleanIdentifier,
          password: rawPwd,
          terminalId: currentTerminalId,
          localAccountsHint: effectiveAccountsDirectory,
        }),
      });
      if (cloudRes.ok) {
        const cloudData = await cloudRes.json();
        if (cloudData && cloudData.ok && cloudData.account) {
          setIsAuthenticatingCloud(false);
          authenticateAccount(cloudData.account as LocalAccountRecord, {
            enterpriseDetails: cloudData.enterpriseDetails,
            workspaceData: cloudData.workspaceData,
            tenantAccounts: cloudData.tenantAccounts,
            allAccountsDirectory: cloudData.allAccountsDirectory,
            enterpriseRegistry: cloudData.enterpriseRegistry,
          });
          return;
        }
      } else {
        const errData = await cloudRes.json().catch(() => null);
        if (errData?.code === 'CONTRACT_TERMINATED' || errData?.code === 'ACCOUNT_BLOCKED') {
          setIsAuthenticatingCloud(false);
          setLoginError(errData.message || 'Accès clôturé ou suspendu.');
          return;
        }
      }
    } catch {
      // Network offline or server unreachable: fallback to local accounts cache below
    }
    setIsAuthenticatingCloud(false);

    // 2. Détection Automatique Universelle (Utilisateur Entreprise, Compte Personnel 24h/7j par Matricule, ou Compte Client 24h/7j par Email)
    const cleanDigits = cleanIdentifier.replace(/[^0-9]/g, '');
    const matchingAccounts = effectiveAccountsDirectory.filter((a) => {
      const emailMatch = (a.email || '').toLowerCase() === cleanIdentifier;
      const matriculeMatch =
        a.employeeMatricule && a.employeeMatricule.toLowerCase() === cleanIdentifier;
      const fullNameMatch =
        a.fullName && a.fullName.trim().toLowerCase() === cleanIdentifier;
      const phoneDigits = (a.phoneNumber || '').replace(/[^0-9]/g, '');
      const phoneMatch =
        cleanDigits.length >= 7 &&
        phoneDigits.length >= 7 &&
        (phoneDigits === cleanDigits || phoneDigits.slice(-8) === cleanDigits.slice(-8));
      return emailMatch || matriculeMatch || phoneMatch || fullNameMatch;
    });

    const activeMatchingAccounts = matchingAccounts.filter((a) => !a.contractTerminated);

    // Filtrer d'abord ceux dont le mot de passe correspond exactement (permet de distinguer automatiquement Compte Personnel, Compte Client et Utilisateur Entreprise)
    const passwordMatchingAccounts = activeMatchingAccounts.filter(
      (a) =>
        a.currentPassword === rawPwd ||
        (a.mustChangePassword && a.defaultPassword === rawPwd)
    );

    // Si l'utilisateur a saisi son Matricule RH, prioriser son Compte Personnel 24h/7j s'il existe
    const enteredByMatricule = passwordMatchingAccounts.find(
      (a) =>
        a.employeeMatricule &&
        a.employeeMatricule.toLowerCase() === cleanIdentifier &&
        a.accountPortalType === 'personnel_24_7'
    );

    const foundRaw =
      enteredByMatricule ||
      passwordMatchingAccounts[0] ||
      activeMatchingAccounts[0] ||
      matchingAccounts[0];

    const inferredPortalType: 'enterprise_user' | 'personnel_24_7' | 'client_24_7' = foundRaw
      ? foundRaw.accountPortalType
        ? foundRaw.accountPortalType
        : foundRaw.employeeMatricule &&
            foundRaw.employeeMatricule.toLowerCase() === cleanIdentifier &&
            String(foundRaw.id || '').startsWith('pers_acc_')
          ? 'personnel_24_7'
          : String(foundRaw.id || '').startsWith('cli_acc_')
            ? 'client_24_7'
            : 'enterprise_user'
      : 'enterprise_user';

    const found: LocalAccountRecord | undefined = foundRaw
      ? {
          ...foundRaw,
          accountPortalType: inferredPortalType,
        }
      : undefined;

    if (!found) {
      const fail = recordAuthFailure(cleanIdentifier, 'Compte inexistant');
      setUseMathChallenge(true);
      setChallengeSeed(Math.floor(Math.random() * 900) + 100);
      setLoginError(
        fail.locked
          ? 'Trop de tentatives infructueuses : accès verrouillé pendant 5 minutes (Protection Anti-Intrusion).'
          : `Aucun compte reconnu avec cet identifiant (${fail.remainingAttempts} essai(s) restant(s)).`
      );
      return;
    }

    if (found.contractTerminated) {
      setLoginError(
        `Accès clôturé suite à une fin de contrat (${found.terminationDate || ''}).`
      );
      return;
    }

    if (found.accountStatus === 'blocked') {
      setLoginError(
        'Accès bloqué : ce compte a été suspendu par le Manager d’Opérations et d’Assistances Serveur (MOAS) ou l’Administrateur Général des Systèmes (AdGenSys).'
      );
      return;
    }

    const passwordMatches =
      found.currentPassword === rawPwd ||
      (found.mustChangePassword && found.defaultPassword === rawPwd);

    if (!passwordMatches) {
      const fail = recordAuthFailure(cleanIdentifier, 'Mot de passe erroné');
      setUseMathChallenge(true);
      setChallengeSeed(Math.floor(Math.random() * 900) + 100);
      setLoginError(
        fail.locked
          ? 'Protection Anti-Force Brute déclenchée : compte verrouillé temporairement pendant 5 minutes.'
          : `Mot de passe incorrect (${fail.remainingAttempts} tentative(s) restante(s) avant verrouillage de sécurité).`
      );
      return;
    }

    // Si plusieurs comptes d'entreprises distinctes correspondent exactement à ces identifiants (ex: Client enregistré dans plusieurs entreprises),
    // regrouper les entreprises pour proposer le choix après validation
    if (
      passwordMatchingAccounts.length > 1 &&
      passwordMatchingAccounts.some((a) => a.accountPortalType === 'client_24_7')
    ) {
      const clientBase =
        passwordMatchingAccounts.find((a) => a.accountPortalType === 'client_24_7') || found;
      authenticateAccount({ ...clientBase, accountPortalType: 'client_24_7' });
      return;
    }

    authenticateAccount(found);
  };

  // Handle Mandatory Password Change on First Login (Synchronized Worldwide)
  const handleCompleteFirstLoginPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!pendingFirstLoginAccount) return;

    const cleanNew = sanitizeSecurityInput(firstLoginNewPassword.trim(), 120);
    if (cleanNew.length < 6) {
      setLoginError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (cleanNew !== firstLoginConfirmPassword.trim()) {
      setLoginError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (cleanNew === pendingFirstLoginAccount.defaultPassword) {
      setLoginError('Veuillez choisir un mot de passe différent du code temporaire.');
      return;
    }

    const isPromotedOrExistingEnterpriseSuperAdmin =
      pendingFirstLoginAccount.role === 'super_admin' &&
      Boolean(
        pendingFirstLoginAccount.companySetupCompleted ||
          pendingFirstLoginAccount.companyName ||
          (pendingFirstLoginAccount as any).promotedToSuperAdminAt ||
          (pendingFirstLoginAccount as any).appointedByAdGenSysAt ||
          pendingCloudPayload?.enterpriseDetails?.companyName ||
          (pendingFirstLoginAccount.tenantId && pendingFirstLoginAccount.tenantId !== 'default_tenant')
      );

    let updated: LocalAccountRecord = {
      ...pendingFirstLoginAccount,
      currentPassword: cleanNew,
      mustChangePassword: false,
      isActivated: true,
      accountStatus: 'active',
      ...(isPromotedOrExistingEnterpriseSuperAdmin
        ? {
            role: 'super_admin',
            companySetupCompleted: true,
            canActAsSuperAdmin: true,
          }
        : {}),
    };
    let nextCloudPayload = pendingCloudPayload;

    try {
      const res = await fetch('/api/saas/auth/activate-or-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: updated.id,
          email: updated.email,
          newPassword: cleanNew,
          account: updated,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok && data.account) {
          updated = {
            ...(data.account as LocalAccountRecord),
            mustChangePassword: false,
            isActivated: true,
            ...(isPromotedOrExistingEnterpriseSuperAdmin
              ? {
                  role: 'super_admin',
                  companySetupCompleted: true,
                  canActAsSuperAdmin: true,
                }
              : {}),
          };
          nextCloudPayload = {
            enterpriseDetails: data.enterpriseDetails,
            workspaceData: data.workspaceData,
            tenantAccounts: data.tenantAccounts,
            allAccountsDirectory: data.allAccountsDirectory,
            enterpriseRegistry: data.enterpriseRegistry,
          };
        }
      }
    } catch {
      // Offline fallback: local activation still proceeds
    }

    try {
      for (const k of ['mep_personal_employee_accounts_v1', 'mep_client_portal_accounts_v1']) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const nextList = parsed.map((item: any) =>
              item &&
              (item.id === updated.id ||
                (updated.employeeMatricule &&
                  item.employeeMatricule &&
                  item.employeeMatricule.toLowerCase() ===
                    updated.employeeMatricule.toLowerCase()) ||
                (updated.email &&
                  item.email &&
                  item.email.toLowerCase() === updated.email.toLowerCase()))
                ? { ...item, ...updated, currentPassword: cleanNew, mustChangePassword: false }
                : item
            );
            localStorage.setItem(k, JSON.stringify(nextList));
          }
        }
      }
    } catch {
      // ignore
    }

    claimTerminalSessionLock({
      ...updated,
      companyName: nextCloudPayload?.enterpriseDetails?.companyName || updated.companyName,
      enterpriseISU: nextCloudPayload?.enterpriseDetails?.isu || updated.enterpriseISU,
    });

    setPendingFirstLoginAccount(null);
    setPendingCloudPayload(undefined);
    if (updated.accountPortalType === 'client_24_7') {
      const clientEnterprises = resolveRegisteredEnterprisesForAccount(updated, nextCloudPayload);
      if (clientEnterprises.length > 1) {
        setPendingClientEnterpriseSelection({
          account: updated,
          cloudPayload: nextCloudPayload,
          enterprises: clientEnterprises,
        });
        return;
      }
      if (clientEnterprises.length === 1) {
        const chosen = clientEnterprises[0];
        onLoginSuccess(
          {
            ...(chosen.accountForTenant || updated),
            tenantId: chosen.tenantId,
            companyName: chosen.companyName,
            accountPortalType: 'client_24_7',
          },
          nextCloudPayload
        );
        return;
      }
    }
    if (isUserBothSuperAdminAndAdGenSys(updated, nextCloudPayload)) {
      enforceBurnEnterpriseOnDualRoleAndLogin(updated, nextCloudPayload);
      return;
    }
    onLoginSuccess(updated, nextCloudPayload);
  };

  // Handle Forgot Password (Synchronized Worldwide)
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);

    const securityBlock = validateAntiBotAndWaf(forgotEmail, [forgotEmail, forgotNewPassword]);
    if (securityBlock) {
      setForgotMessage({ type: 'error', text: securityBlock });
      return;
    }

    if (forgotNewPassword.trim().length < 6) {
      setForgotMessage({
        type: 'error',
        text: 'Le mot de passe doit comporter au moins 6 caractères.',
      });
      return;
    }

    const cleanIdentifier = sanitizeSecurityInput(forgotEmail.trim(), 150).toLowerCase();
    const cleanNewPwd = sanitizeSecurityInput(forgotNewPassword.trim(), 120);

    let cloudUpdated = false;
    try {
      const res = await fetch('/api/saas/auth/activate-or-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanIdentifier,
          newPassword: cleanNewPwd,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok) {
          cloudUpdated = true;
        }
      }
    } catch {
      // Offline fallback below
    }

    const localOk = onResetPassword(cleanIdentifier, cleanNewPwd);
    if (cloudUpdated || localOk) {
      setForgotMessage({
        type: 'success',
        text: 'Mot de passe mis à jour et synchronisé sur tous vos terminaux.',
      });
      setLoginEmail(forgotEmail.trim());
      setLoginPassword('');
      setTimeout(() => {
        setForgotMessage(null);
        setMode('login');
      }, 900);
    } else {
      recordAuthFailure(forgotEmail, 'Tentative de réinitialisation sur email inconnu');
      setForgotMessage({
        type: 'error',
        text: 'Aucun compte associé à cet identifiant.',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-slate-50 via-slate-100/70 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 px-4 py-8 sm:py-10">
      <div className="w-full max-w-md space-y-5 animate-widget-fade-in">
        {/* Brand Identity */}
        <div className="flex flex-col items-center text-center">
          <MyEasyProjectLogo size="xl" />
        </div>

        {/* Universal Multi-Terminal & Multi-Browser Cloud Recognition Banner (Masqué visuellement, fonction opérationnelle) */}
        <div className="hidden" aria-hidden="true">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
            {clientDeviceAndBrowserInfo.terminalType === 'Smartphone' ? (
              <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            ) : clientDeviceAndBrowserInfo.terminalType === 'Tablette' ? (
              <Tablet className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            ) : (
              <Monitor className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            )}
            <span>
              Terminal détecté :{' '}
              <strong className="text-slate-900 dark:text-white">
                {clientDeviceAndBrowserInfo.terminalType}
              </strong>{' '}
              · {clientDeviceAndBrowserInfo.browserName}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>{cloudVaultReady ? 'Cloud Universel Actif' : 'Synchronisé'}</span>
          </span>
        </div>

        {/* Inactivity Lock Notice */}
        {lockNotice && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5 shadow-2xs">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-semibold">{lockNotice}</span>
          </div>
        )}

        {/* Authentication Card */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm">
          {/* Hidden Anti-Bot Honeypot Trap (Invisible to legitimate human users) */}
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="mep_website_honeypot">Leave this field empty</label>
            <input
              id="mep_website_honeypot"
              name="website_url_honeypot"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={botHoneypotField}
              onChange={(e) => setBotHoneypotField(e.target.value)}
            />
          </div>
          {/* Primary Mode Switcher (Hidden during first-login password setup, dual-role choice or forgot password) */}
          {!pendingFirstLoginAccount && !pendingDualRoleSelection && mode !== 'forgot' && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200/80 dark:border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setLoginError('');
                }}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>Connexion</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setCreatedDispatch(null);
                  setRegError('');
                }}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                <span>Créer un compte</span>
              </button>
            </div>
          )}

          {/* =================================================================
              VIEW 1: LOGIN, FIRST-LOGIN ACTIVATION & DUAL ACCOUNT CHOICE
          ================================================================= */}
          {mode === 'login' && (
            <div>
              {pendingClientEnterpriseSelection ? (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-extrabold uppercase">
                        Compte Client Multi-Entreprises (24h/7j)
                      </span>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        Choisissez l&apos;entreprise prestataire à consulter
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {pendingClientEnterpriseSelection.account.fullName} (
                        {pendingClientEnterpriseSelection.account.email})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingClientEnterpriseSelection(null)}
                      className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Retour</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Votre compte client est enregistré auprès de{' '}
                    <strong>{pendingClientEnterpriseSelection.enterprises.length} entreprises prestataires</strong>.
                    Cliquez sur l&apos;entreprise de votre choix pour ouvrir votre espace privé client :
                  </p>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {pendingClientEnterpriseSelection.enterprises.map((ent, idx) => (
                      <button
                        key={`${ent.tenantId}_${ent.companyName}_${idx}`}
                        type="button"
                        onClick={() => {
                          const targetAcc: LocalAccountRecord = {
                            ...(ent.accountForTenant || pendingClientEnterpriseSelection.account),
                            tenantId: ent.tenantId,
                            companyName: ent.companyName,
                            accountPortalType: 'client_24_7',
                          };
                          setPendingClientEnterpriseSelection(null);
                          onLoginSuccess(targetAcc, pendingClientEnterpriseSelection.cloudPayload);
                        }}
                        className="w-full text-left p-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 transition-all flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {ent.companyName}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 flex flex-wrap items-center gap-2">
                            {ent.countryName && <span>Pays : {ent.countryName}</span>}
                            {ent.isu && <span className="font-mono text-[10px]">ISU : {ent.isu}</span>}
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              Accès Client 24h/7j · États, Projets &amp; Règlements en ligne
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : pendingDualRoleSelection ? (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Choisir le compte de connexion
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {pendingDualRoleSelection.account.fullName} ({pendingDualRoleSelection.account.email})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingDualRoleSelection(null)}
                      className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Retour</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Vos identifiants sont rattachés à la fois à un compte <strong>Super-Admin</strong> et à un compte <strong>AdGenSys</strong>. Sélectionnez le compte auquel vous souhaitez vous connecter pour cette session :
                  </p>

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        finalizeDualRoleAccountChoice(
                          'super_admin',
                          pendingDualRoleSelection.account,
                          pendingDualRoleSelection.cloudPayload
                        )
                      }
                      className="w-full text-left p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800/80 hover:border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 transition-all flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          Compte Super-Admin (Direction Générale)
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                          Pilotage opérationnel, financier et comptable de votre entreprise
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        finalizeDualRoleAccountChoice(
                          'adgensys',
                          pendingDualRoleSelection.account,
                          pendingDualRoleSelection.cloudPayload
                        )
                      }
                      className="w-full text-left p-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 transition-all flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          Compte AdGenSys (Administrateur Général des Systèmes)
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                          Gouvernance générale du système, Serveur SaaS et gestion des comptes MOAS
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />
                    </button>
                  </div>
                </div>
              ) : pendingLoginOtpVerification ? (
                /* Real-time Automatic OTP Verification Step upon clicking "Se connecter à mon espace privé" */
                <form onSubmit={handleVerifyLoginOtpSubmit} className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider text-[11px]">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>Validation OTP Temps Réel — Espace Privé</span>
                      </div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {pendingLoginOtpVerification.account.fullName}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingLoginOtpVerification(null);
                        setLoginOtpInput('');
                        setLoginOtpError('');
                        setLoginPassword('');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Retour</span>
                    </button>
                  </div>

                  {/* Sélecteur de serveur d'envoi instantané (WhatsApp, SMS ou E-mail) */}
                  <div className="space-y-1.5">
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Canal serveur d&apos;envoi instantané du code OTP
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'whatsapp', label: 'WhatsApp' },
                          { id: 'sms', label: 'SMS Mobile' },
                          { id: 'email', label: 'E-mail' },
                        ] as const
                      ).map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          disabled={isSendingLoginOtp}
                          onClick={() => {
                            setLoginPreferredOtpChannel(ch.id);
                            void triggerAutomaticLoginOtpStep(
                              pendingLoginOtpVerification.account,
                              pendingLoginOtpVerification.cloudPayload,
                              ch.id
                            );
                          }}
                          className={`py-2 px-2.5 rounded-lg font-bold text-[11px] border cursor-pointer transition ${
                            pendingLoginOtpVerification.otpResult.channel === ch.id
                              ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {ch.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accusé de réception du serveur temps réel & notification du message reçu */}
                  <div className="p-3.5 rounded-xl bg-slate-900 text-white border border-emerald-500/60 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold text-emerald-400 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>
                          {pendingLoginOtpVerification.otpResult.channel === 'whatsapp'
                            ? 'Serveur WhatsApp Cloud API'
                            : pendingLoginOtpVerification.otpResult.channel === 'sms'
                            ? 'Serveur SMS SMPP Direct'
                            : 'Serveur E-mail SMTP TLS'}
                        </span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-cyan-300">
                        {pendingLoginOtpVerification.otpResult.latencyMs} ms ·{' '}
                        {pendingLoginOtpVerification.otpResult.providerReceiptId}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Code OTP envoyé automatiquement et instantanément vers{' '}
                      <strong className="text-white font-mono">
                        {pendingLoginOtpVerification.otpResult.destination ||
                          pendingLoginOtpVerification.otpResult.maskedDestination}
                      </strong>
                      . Veuillez renseigner ci-dessous le code tel que reçu :
                    </p>

                    <div className="p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-500/50 flex items-center justify-between gap-2">
                      <div className="text-[11px] font-mono text-emerald-200">
                        Notification délivrée sur votre compte {pendingLoginOtpVerification.otpResult.channel.toUpperCase()} ({pendingLoginOtpVerification.otpResult.maskedDestination}) — Code confidentiel masqué sur cet écran.
                      </div>
                      <button
                        type="button"
                        disabled={isSendingLoginOtp}
                        onClick={() =>
                          void triggerAutomaticLoginOtpStep(
                            pendingLoginOtpVerification.account,
                            pendingLoginOtpVerification.cloudPayload,
                            pendingLoginOtpVerification.otpResult.channel
                          )
                        }
                        className="text-[10.5px] font-mono text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${isSendingLoginOtp ? 'animate-spin' : ''}`}
                        />
                        <span>Renvoyer OTP</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Renseignez le code OTP reçu (6 chiffres)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      required
                      maxLength={6}
                      value={loginOtpInput}
                      onChange={(e) => {
                        setLoginOtpInput(e.target.value.replace(/[^0-9]/g, ''));
                        if (loginOtpError) setLoginOtpError('');
                      }}
                      placeholder="Saisissez les 6 chiffres reçus"
                      className="w-full rounded-lg border-2 border-blue-500 dark:border-blue-500 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-center text-base font-mono font-black tracking-[0.35em] text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {loginOtpError && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 font-medium">
                      {loginOtpError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSendingLoginOtp}
                    className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 py-2.5 px-4 text-sm font-bold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Valider le code OTP et accéder à mon espace privé</span>
                  </button>
                </form>
              ) : !pendingFirstLoginAccount ? (
                <div className="space-y-4">
                  <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Identifiant de connexion (Adresse e-mail, Matricule ou Téléphone)
                      </label>
                      <input
                        type="text"
                        required
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="Ex: nom@entreprise.com, EMP-2026-001 ou +225..."
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Mot de passe
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(loginEmail);
                            setForgotMessage(null);
                            setMode('forgot');
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-3.5 pr-10 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {loginError && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 font-medium">
                        {loginError}
                      </div>
                    )}

                    {/* Panneau de Restriction Horaire Collaborateur (Plages Horaires, Pauses & Heures Supplémentaires) */}
                    {scheduleRestrictionState && (
                      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700 text-xs space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 text-[11px]">
                            Contrôle Horaire Collaborateur — {scheduleRestrictionState.evaluation.statusBadgeLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-200 font-mono font-bold text-[10px]">
                            Accès Verrouillé
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                          {scheduleRestrictionState.evaluation.reason}
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] font-mono">
                          <div className="p-2 rounded bg-white/80 dark:bg-slate-900 border border-amber-200 dark:border-amber-800">
                            <span className="text-slate-500 block">Créneau concerné :</span>
                            <strong className="text-slate-900 dark:text-white">
                              {scheduleRestrictionState.evaluation.currentSlotLabel}
                            </strong>
                          </div>
                          <div className="p-2 rounded bg-white/80 dark:bg-slate-900 border border-amber-200 dark:border-amber-800">
                            <span className="text-slate-500 block">Prochaine ouverture :</span>
                            <strong className="text-emerald-700 dark:text-emerald-400">
                              {scheduleRestrictionState.evaluation.nextAllowedSlotLabel}
                            </strong>
                          </div>
                        </div>
                        <div className="text-[10px] text-amber-700 dark:text-amber-300 italic">
                          En cas d&apos;urgence opérationnelle ou d&apos;heures supplémentaires non planifiées, demandez au <strong>Super-Admin</strong> d&apos;activer votre <strong>Autorisation Particulière Hors-Horaires</strong> dans l&apos;onglet « Profils &amp; Accès ».
                        </div>
                      </div>
                    )}

                    {/* Panneau de Verrouillage Mono-Terminal & Approbation Sécurisée de Déconnexion à Distance */}
                    {terminalConflictState && (
                      <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border-2 border-indigo-500 dark:border-indigo-500/80 text-xs space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 text-[11px]">
                            Session Active Détectée sur un Autre Terminal
                          </span>
                          <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono font-bold text-[10px] animate-pulse">
                            1 Terminal Max
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Compte :</span>
                            <strong className="text-slate-900 dark:text-white">
                              {terminalConflictState.account.fullName}
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">1er Terminal actif :</span>
                            <strong className="font-mono text-indigo-700 dark:text-indigo-300">
                              {terminalConflictState.existingLock.terminalLabel}
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">ID Terminal / IP :</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {terminalConflictState.existingLock.terminalId} ·{' '}
                              {terminalConflictState.existingLock.ipAddress}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Ouvert depuis :</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {new Date(
                                terminalConflictState.existingLock.connectedAt
                              ).toLocaleTimeString('fr-FR')}
                            </span>
                          </div>
                        </div>

                        {!showRemoteDisconnectSecurityGate || !remoteDisconnectChallenge ? (
                          <button
                            type="button"
                            onClick={() =>
                              startRemoteDisconnectApprovalFlow(
                                terminalConflictState.account,
                                terminalConflictState.existingLock,
                                remoteOtpChannel
                              )
                            }
                            className="w-full py-2.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>
                              Demander l&apos;approbation sécurisée (Mot de passe + OTP) pour déconnecter le 1er terminal
                            </span>
                          </button>
                        ) : (
                          <div className="p-3 rounded-xl bg-slate-900 text-white border border-rose-500/60 space-y-3">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span className="font-extrabold uppercase tracking-wider text-[10.5px] text-emerald-300">
                                  Approbation Anti-Intrusion &amp; Anti-Robot (Triple Verrou)
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-amber-300">
                                Essais :{' '}
                                {Math.max(
                                  0,
                                  remoteDisconnectChallenge.maxAttempts -
                                    remoteDisconnectChallenge.failedAttempts
                                )}
                                /{remoteDisconnectChallenge.maxAttempts}
                              </span>
                            </div>

                            <p className="text-[10.5px] text-slate-300 leading-relaxed">
                              Pour éviter qu&apos;un tiers non autorisé ou un robot malveillant ne déconnecte un utilisateur agréé à distance, veuillez valider votre identité via les 3 verrous ci-dessous :
                            </p>

                            {/* Sélecteur de canal d'envoi OTP */}
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Canal de réception du Code OTP à usage unique
                              </label>
                              <div className="grid grid-cols-3 gap-1.5">
                                {(
                                  [
                                    { id: 'whatsapp', label: 'WhatsApp' },
                                    { id: 'sms', label: 'SMS Mobile' },
                                    { id: 'email', label: 'E-mail' },
                                  ] as const
                                ).map((ch) => (
                                  <button
                                    key={ch.id}
                                    type="button"
                                    onClick={() => {
                                      setRemoteOtpChannel(ch.id);
                                      startRemoteDisconnectApprovalFlow(
                                        terminalConflictState.account,
                                        terminalConflictState.existingLock,
                                        ch.id
                                      );
                                    }}
                                    className={`py-1.5 px-2 rounded-lg font-bold text-[10px] border cursor-pointer transition ${
                                      remoteOtpChannel === ch.id
                                        ? 'bg-indigo-600 border-indigo-400 text-white'
                                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                    }`}
                                  >
                                    {ch.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Notification temps réel de message OTP envoyé au destinataire (sans jamais afficher le code OTP sur le terminal demandeur) */}
                            <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-emerald-300">
                                  {remoteOtpDispatchedNotice ||
                                    `Notification OTP transmise vers ${remoteDisconnectChallenge.maskedDestination}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void startRemoteDisconnectApprovalFlow(
                                      terminalConflictState.account,
                                      terminalConflictState.existingLock,
                                      remoteOtpChannel
                                    )
                                  }
                                  className="text-[10px] font-mono text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Renvoyer OTP</span>
                                </button>
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-800/70">
                                <div className="text-[10px] font-mono text-emerald-200">
                                  Protection Anti-Intrusion Active : Le code OTP à 6 chiffres n&apos;est jamais affiché sur cet appareil. Consultez votre compte{' '}
                                  <strong className="text-white uppercase">
                                    {remoteOtpChannel}
                                  </strong>{' '}
                                  ({remoteDisconnectChallenge.maskedDestination}) ou votre session active.
                                </div>
                                {remoteOtpServerReceipt && (
                                  <span className="text-[9.5px] font-mono text-emerald-300/90">
                                    Serveur OK · {remoteOtpServerReceipt.providerReceiptId}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Champ piège Honeypot invisible contre les robots malveillants */}
                            <div className="sr-only" aria-hidden="true">
                              <input
                                type="text"
                                tabIndex={-1}
                                autoComplete="off"
                                value={remoteApprovalHoneypot}
                                onChange={(e) => setRemoteApprovalHoneypot(e.target.value)}
                                placeholder="Ne pas remplir ce champ"
                              />
                            </div>

                            {/* VERROU 1 : Mot de passe de connexion du compte agréé */}
                            <div>
                              <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                                1. Mot de passe de connexion du compte agréé
                              </label>
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={remoteApprovalPassword}
                                onChange={(e) => setRemoteApprovalPassword(e.target.value)}
                                placeholder="Confirmez votre mot de passe personnel"
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-white focus:border-emerald-400 focus:outline-none"
                              />
                            </div>

                            {/* VERROU 2 & VERROU 3 : Code OTP 6 chiffres + Défi Anti-Robot */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                                  2. Code OTP reçu (6 chiffres)
                                </label>
                                <input
                                  type="text"
                                  maxLength={6}
                                  value={remoteApprovalOtp}
                                  onChange={(e) =>
                                    setRemoteApprovalOtp(e.target.value.replace(/[^0-9]/g, ''))
                                  }
                                  placeholder="Ex: 482915"
                                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono font-bold tracking-widest text-emerald-300 focus:border-emerald-400 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10.5px] font-bold text-slate-300 mb-1">
                                  3. Code Anti-Robot :{' '}
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 font-mono text-amber-300 tracking-widest">
                                    {remoteDisconnectChallenge.antiBotCode}
                                  </span>
                                </label>
                                <input
                                  type="text"
                                  maxLength={6}
                                  value={remoteApprovalAntiBot}
                                  onChange={(e) =>
                                    setRemoteApprovalAntiBot(e.target.value.toUpperCase())
                                  }
                                  placeholder={`Saisir ${remoteDisconnectChallenge.antiBotCode}`}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono font-bold tracking-widest uppercase text-amber-300 focus:border-amber-400 focus:outline-none"
                                />
                              </div>
                            </div>

                            {remoteApprovalError && (
                              <div className="p-2 rounded-lg bg-rose-950/90 border border-rose-500 text-[10.5px] text-rose-200 font-medium">
                                {remoteApprovalError}
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  const { account, cloudPayload } = terminalConflictState;
                                  const verification = await verifyAndApproveRemoteDisconnectServer({
                                    challenge: remoteDisconnectChallenge,
                                    account: {
                                      ...account,
                                      companyName:
                                        cloudPayload?.enterpriseDetails?.companyName ||
                                        account.companyName,
                                      enterpriseISU:
                                        cloudPayload?.enterpriseDetails?.isu ||
                                        account.enterpriseISU,
                                    },
                                    enteredPassword: remoteApprovalPassword,
                                    enteredOtp: remoteApprovalOtp,
                                    enteredAntiBotCode: remoteApprovalAntiBot,
                                    honeypotTrap: remoteApprovalHoneypot,
                                  });
                                  setRemoteDisconnectChallenge(verification.updatedChallenge);
                                  if (!verification.approved) {
                                    setRemoteApprovalError(
                                      verification.errorMessage ||
                                        'Validation de sécurité refusée par le serveur.'
                                    );
                                    return;
                                  }
                                  remoteDisconnectOtherTerminalAndClaim({
                                    ...account,
                                    companyName:
                                      cloudPayload?.enterpriseDetails?.companyName ||
                                      account.companyName,
                                    enterpriseISU:
                                      cloudPayload?.enterpriseDetails?.isu || account.enterpriseISU,
                                  });
                                  authenticateAccount(account, cloudPayload, true);
                                }}
                                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Approuver &amp; Déconnecter le 1er Terminal</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowRemoteDisconnectSecurityGate(false);
                                  setRemoteApprovalError('');
                                }}
                                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Masqué conformément à la directive utilisateur */}
                    <div
                      className="hidden"
                      aria-hidden="true"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300">
                          Envoi automatique &amp; instantané du code OTP par :
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          Serveurs temps réel actifs
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { id: 'whatsapp', label: 'WhatsApp' },
                            { id: 'sms', label: 'SMS Mobile' },
                            { id: 'email', label: 'E-mail' },
                          ] as const
                        ).map((ch) => (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => setLoginPreferredOtpChannel(ch.id)}
                            className={`py-1.5 px-2 rounded-md font-bold text-[10.5px] border cursor-pointer transition ${
                              loginPreferredOtpChannel === ch.id
                                ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {ch.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isAuthenticatingCloud || isSendingLoginOtp}
                      className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-70 py-2.5 px-4 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>
                        {isAuthenticatingCloud || isSendingLoginOtp
                          ? 'Vérification sécurisée en cours...'
                          : 'Se connecter à mon espace privé'}
                      </span>
                    </button>

                    <div
                      className="hidden"
                      aria-hidden="true"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          Souveraineté des Données d&apos;Entreprise (Authentification Interne Exclusive My Easy Project) :
                        </span>{' '}
                        La connexion via Google est désactivée afin de garantir l&apos;isolation cryptographique et la souveraineté intégrale des données de votre entreprise.
                      </div>
                    </div>
                  </form>
                </div>
              ) : (
                /* Mandatory First-Connection Password Update Form */
                <form
                  onSubmit={handleCompleteFirstLoginPasswordChange}
                  className="space-y-4 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Définir votre mot de passe personnel
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {pendingFirstLoginAccount.fullName} · {pendingFirstLoginAccount.functionTitle}
                      </p>
                      {pendingFirstLoginAccount.role === 'super_admin' && (
                        <div className="mt-1.5 p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-800 dark:text-purple-200 font-medium">
                          <strong>Ascension au rang de Super-Admin :</strong> Connexion initiale réussie avec votre mot de passe par défaut. Vous devez obligatoirement définir votre mot de passe personnel définitif pour accéder à vos prérogatives de Super-Administrateur.
                        </div>
                      )}
                      {pendingCloudPayload?.enterpriseDetails?.companyName && (
                        <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                          Entreprise : {pendingCloudPayload.enterpriseDetails.companyName}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingFirstLoginAccount(null);
                        setPendingCloudPayload(undefined);
                        setLoginError('');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Retour</span>
                    </button>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Nouveau mot de passe
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={firstLoginNewPassword}
                      onChange={(e) => setFirstLoginNewPassword(e.target.value)}
                      placeholder="Minimum 6 caractères"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirmer le mot de passe
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={firstLoginConfirmPassword}
                      onChange={(e) => setFirstLoginConfirmPassword(e.target.value)}
                      placeholder="Retapez le mot de passe"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  {loginError && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 font-medium">
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 py-2.5 px-4 text-sm font-semibold text-white transition-colors cursor-pointer"
                  >
                    Activer et accéder à mon espace privé
                  </button>
                </form>
              )}
            </div>
          )}

          {/* =================================================================
              VIEW 2: CREATE SUPER-ADMIN OR ADGENSYS ACCOUNT
          ================================================================= */}
          {mode === 'register' && (
            <div className="space-y-4">
              {regError && (
                <div className="p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 font-medium">
                  {regError}
                </div>
              )}

              {!createdDispatch ? (
                <form onSubmit={handleFinalizeCreation} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setRegistrationAccountMode('super_admin')}
                      className={`py-2 px-2.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        registrationAccountMode !== 'client_24_7'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Entreprise Prestataire / Système
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegistrationAccountMode('client_24_7')}
                      className={`py-2 px-2.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        registrationAccountMode === 'client_24_7'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Compte Client (24h/7j)
                    </button>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {registrationAccountMode === 'client_24_7'
                        ? 'Nom complet ou Raison Sociale du Client'
                        : 'Nom complet'}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value.toUpperCase())}
                      placeholder="JEAN-MARC KOUASSI"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm uppercase font-semibold text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Pays
                      </label>
                      <select
                        value={regCountryCode}
                        onChange={(e) => setRegCountryCode(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                      >
                        {WORLD_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({c.dialCode})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-7">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Téléphone
                      </label>
                      <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden focus-within:border-blue-600">
                        <span className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 select-none">
                          {selectedCountry.dialCode}
                        </span>
                        <input
                          type="tel"
                          required
                          maxLength={25}
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="07 08 09 10 11"
                          className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Email professionnel
                    </label>
                    <input
                      type="email"
                      required
                      maxLength={150}
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="direction@entreprise.com"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Code (Optionnel)
                    </label>
                    <input
                      type="text"
                      value={adGenSysCodeInput}
                      onChange={(e) => {
                        setAdGenSysCodeInput(e.target.value.toUpperCase());
                        if (regError) setRegError('');
                      }}
                      onBlur={(e) => {
                        const v = e.target.value.trim().toUpperCase();
                        if (!v) setAdGenSysCodeInput('A-G-S');
                        else handleAdGenSysInputChange(v);
                      }}
                      placeholder="A-G-S"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono font-semibold tracking-wider uppercase text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Envoi des identifiants
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setRegChannel('whatsapp')}
                        className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                          regChannel === 'whatsapp'
                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegChannel('email')}
                        className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                          regChannel === 'email'
                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span>Email</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Créer mon compte</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* Clean Post-Creation Credentials Card */
                <div className="space-y-4 text-xs">
                  <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>Compte créé pour {createdDispatch.account.fullName}</span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Profil Système attribué</span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                        {createdDispatch.account.role === 'adgensys'
                          ? 'AdGenSys (Contrôle Total Système & SaaS)'
                          : 'Super-Admin (Entreprise Prestataire)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800 text-slate-500">
                      <span>Identifiant</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {createdDispatch.account.email}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-500">Mot de passe temporaire</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                          {createdDispatch.account.defaultPassword}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              createdDispatch.account.defaultPassword
                            );
                            setCopiedPwd(true);
                            setTimeout(() => setCopiedPwd(false), 2000);
                          }}
                          className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium flex items-center gap-1 hover:bg-slate-100 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedPwd ? 'Copié' : 'Copier'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail(createdDispatch.account.email);
                        // Le mot de passe ne doit jamais être pré-rempli
                        setLoginPassword('');
                        setMode('login');
                      }}
                      className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>
                        {createdDispatch.account.mustChangePassword
                          ? 'Activer mon compte maintenant'
                          : 'Se connecter et choisir mon compte'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleTriggerExternalNotification(
                          createdDispatch.account,
                          createdDispatch.channel
                        )
                      }
                      className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {createdDispatch.channel === 'whatsapp' ? (
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      <span>
                        Envoyer par {createdDispatch.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              VIEW 3: FORGOT PASSWORD
          ================================================================= */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Réinitialiser le mot de passe
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Retour</span>
                </button>
              </div>

              <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email du compte
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="nom@entreprise.com"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nouveau mot de passe
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {forgotMessage && (
                  <div
                    className={`p-3 rounded-lg border text-xs font-medium ${
                      forgotMessage.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-200'
                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {forgotMessage.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Enregistrer le nouveau mot de passe
                </button>
              </form>
            </div>
          )}

          {/* =================================================================
              BOUCLIER ANTI-ROBOT, ANTI-INTRUSION & CLOISONNEMENT MULTI-TENANT
              (Masqué visuellement tout en laissant la fonction opérationnelle)
          ================================================================= */}
          <div className="sr-only" aria-hidden="true">
            <input
              type="checkbox"
              checked={humanVerifiedChecked}
              onChange={(e) => setHumanVerifiedChecked(e.target.checked)}
              tabIndex={-1}
            />
            <span>
              Vérification Humaine Certifiée (Protection Anti-Robot &amp; Anti-Bot) • Chiffrement AES-256-GCM E2EE • Cloisonnement strict par Entreprise • Pare-feu WAF Actif
            </span>
          </div>

          {useMathChallenge && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Vérification de sécurité : {challengePair.a} + {challengePair.b} =
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={challengeInput}
                  onChange={(e) => setChallengeInput(e.target.value)}
                  className="w-16 rounded border border-amber-400 bg-white dark:bg-slate-900 px-2 py-1 text-center font-mono font-bold text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.floor(Math.random() * 900) + 100;
                    setChallengeSeed(next);
                  }}
                  className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  title="Nouveau défi"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

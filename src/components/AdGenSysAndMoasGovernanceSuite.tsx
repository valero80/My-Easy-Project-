import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Building2,
  Users,
  UserPlus,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Database,
  Server,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  LogOut,
  Search,
  Sliders,
  Phone,
  Mail,
  MessageSquare,
  Wrench,
} from 'lucide-react';
import { LocalAccountRecord } from './AuthPortal';
import { EnterpriseDetails } from './CompanyOnboardingWizard';
import { WebServerSynergySuite } from './WebServerSynergySuite';
import {
  WORLD_COUNTRIES,
  SAAS_OPERATOR_PERMISSIONS,
  generateDefaultPassword,
  generateEnterpriseISU,
  isRealCreatedEnterpriseName,
  normalizeEnterpriseNameKey,
} from '../utils/countries';
import {
  SAAS_SUBSCRIPTION_PLANS,
  getOrInitializeProviderTrialRecord,
  generateSaaSSubscriptionToken,
  ProviderTrialRecord,
  SubscriptionPlanOption,
} from './ProfitabilityAndTrialSuite';
import {
  autoBackfillExistingEnterprisesToServerMemories,
  getStoredDigitalIdentitiesMemory,
} from '../utils/serverMemorySync';
import {
  EnterpriseGlowingStatusLights,
  RemoteMaintenanceAndSavSuite,
  registerSingleUseEnterpriseToken,
  recordTokenTransferToClient,
  broadcastSubscriptionSyncEvent,
} from './RemoteMaintenanceAndSavSuite';

export interface InspectedEnterpriseSession {
  tenantId: string;
  isu: string;
  companyName: string;
  providerEntityType: 'personne_morale' | 'personne_physique';
  verifiedAt: string;
}

interface AdGenSysAndMoasGovernanceSuiteProps {
  activeAccount: LocalAccountRecord;
  allAccounts: LocalAccountRecord[];
  enterpriseRegistry: Record<string, EnterpriseDetails>;
  inspectedEnterprise: InspectedEnterpriseSession | null;
  onEnterEnterpriseWorkspace: (
    tenantId: string,
    entDetails: EnterpriseDetails,
    workspaceData?: Record<string, any> | null
  ) => void;
  onExitEnterpriseWorkspace: () => void;
  onCreateSystemAccount: (newAcc: LocalAccountRecord) => void;
  onUpdateAccountStatusOrPermissions: (
    accountId: string,
    updates: Partial<LocalAccountRecord>
  ) => void;
  onDeleteAccount: (accountId: string) => void;
  onPurgeInactiveEnterprises: (tenantIdsToPurge: string[]) => void;
  onDeleteEnterpriseFromSystem?: (tenantId: string, companyName: string, isu?: string) => void;
  onSimulateEnterpriseInactivity?: (tenantId: string, daysAgo: number) => void;
  onTriggerToast: (msg: string) => void;
}

export const AdGenSysAndMoasGovernanceSuite: React.FC<
  AdGenSysAndMoasGovernanceSuiteProps
> = ({
  activeAccount,
  allAccounts,
  enterpriseRegistry,
  inspectedEnterprise,
  onEnterEnterpriseWorkspace,
  onExitEnterpriseWorkspace,
  onCreateSystemAccount,
  onUpdateAccountStatusOrPermissions,
  onDeleteAccount,
  onPurgeInactiveEnterprises,
  onDeleteEnterpriseFromSystem,
  onSimulateEnterpriseInactivity,
  onTriggerToast,
}) => {
  const role = activeAccount.role;
  const isAdGenSys = role === 'adgensys' || Boolean(activeAccount.canActAsAdGenSys);
  const isMoas = role === 'moas';
  const isOperatorSubRole = role === 'teleconseiller' || role === 'consultant_operation';

  const [activeSection, setActiveSection] = useState<
    | 'enterprise_directory'
    | 'web_server_synergy'
    | 'rmm_sav_center'
    | 'enterprise_gate'
    | 'database_purge'
    | 'moas_management'
    | 'operator_management'
    | 'saas_subscriptions'
  >('enterprise_directory');
  const [directoryEntityFilter, setDirectoryEntityFilter] = useState<
    'all' | 'personne_morale' | 'personne_physique'
  >('all');
  const [directoryStatusFilter, setDirectoryStatusFilter] = useState<
    'all' | 'active' | 'subscribed_paid' | 'suspended_by_adgensys'
  >('all');
  const [subscriptionRefreshTick, setSubscriptionRefreshTick] = useState(0);
  const [selectedBillingCycles, setSelectedBillingCycles] = useState<
    Record<string, 'monthly' | 'annual'>
  >({});

  // 1. State for AdGenSys Conditional Enterprise Workspace Access (ISU + Raison Sociale)
  const [inputIsu, setInputIsu] = useState('');
  const [inputRaisonSociale, setInputRaisonSociale] = useState('');
  const [gateError, setGateError] = useState('');
  const [isVerifyingGate, setIsVerifyingGate] = useState(false);
  const [revealedIsuMap, setRevealedIsuMap] = useState<Record<string, boolean>>({});

  // 2. State for Database Purge of Inactive Enterprises
  const [inactivityThresholdDays, setInactivityThresholdDays] = useState<number>(30);
  const [selectedTenantsToPurge, setSelectedTenantsToPurge] = useState<string[]>([]);
  const [enterpriseSearch, setEnterpriseSearch] = useState('');

  // 3. State for AdGenSys Exclusive Creation of MOAS Accounts
  const [moasFullName, setMoasFullName] = useState('');
  const [moasCountryCode, setMoasCountryCode] = useState('CI');
  const [moasPhone, setMoasPhone] = useState('');
  const [moasEmail, setMoasEmail] = useState('');
  const [moasDepartment, setMoasDepartment] = useState(
    'Direction des Opérations & Assistances Serveur (MOAS)'
  );
  const [lastCreatedMoas, setLastCreatedMoas] = useState<LocalAccountRecord | null>(null);
  const [accountRoleFilter, setAccountRoleFilter] = useState<string>('all');
  const [accountTenantFilter, setAccountTenantFilter] = useState<string>('all');
  const [accountSearch, setAccountSearch] = useState('');
  const [revealedAccountPasswordMap, setRevealedAccountPasswordMap] = useState<
    Record<string, boolean>
  >({});

  // Pouvoir Souverain AdGenSys : Modification des mots de passe du Super-Admin et de ses collaborateurs
  const [passwordModalTarget, setPasswordModalTarget] = useState<LocalAccountRecord | null>(null);
  const [adGenSysNewPassword, setAdGenSysNewPassword] = useState('');
  const [adGenSysMustChangeOnNextLogin, setAdGenSysMustChangeOnNextLogin] = useState(false);

  // Modification complète d'un collaborateur / compte utilisateur
  const [editCollaboratorTarget, setEditCollaboratorTarget] = useState<LocalAccountRecord | null>(
    null
  );
  const [editCollabFullName, setEditCollabFullName] = useState('');
  const [editCollabPhone, setEditCollabPhone] = useState('');
  const [editCollabEmail, setEditCollabEmail] = useState('');
  const [editCollabRole, setEditCollabRole] = useState<LocalAccountRecord['role']>('collaborator');
  const [editCollabFunction, setEditCollabFunction] = useState('');
  const [editCollabDepartment, setEditCollabDepartment] = useState('');
  const [editCollabPassword, setEditCollabPassword] = useState('');

  // 4. State for MOAS Exclusive Creation & Management of Téléconseiller & Consultant Opération
  const [opRoleType, setOpRoleType] = useState<'teleconseiller' | 'consultant_operation'>(
    'teleconseiller'
  );
  const [opFullName, setOpFullName] = useState('');
  const [opCountryCode, setOpCountryCode] = useState('CI');
  const [opPhone, setOpPhone] = useState('');
  const [opEmail, setOpEmail] = useState('');
  const [opSelectedPermissions, setOpSelectedPermissions] = useState<string[]>(() =>
    SAAS_OPERATOR_PERMISSIONS.filter((p) => p.defaultForTeleconseiller).map((p) => p.id)
  );
  const [lastCreatedOperator, setLastCreatedOperator] = useState<LocalAccountRecord | null>(null);
  const [editingPermissionsAccountId, setEditingPermissionsAccountId] = useState<string | null>(
    null
  );

  const [isSyncingServerMemories, setIsSyncingServerMemories] = useState(false);
  const [confirmDeleteTenantId, setConfirmDeleteTenantId] = useState<string | null>(null);
  const [deletedTenantIdsLocal, setDeletedTenantIdsLocal] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    autoBackfillExistingEnterprisesToServerMemories().then(() => {
      if (mounted) {
        setSubscriptionRefreshTick((t) => t + 1);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleManualSyncServerMemories = async () => {
    setIsSyncingServerMemories(true);
    try {
      const report = await autoBackfillExistingEnterprisesToServerMemories();
      setSubscriptionRefreshTick((t) => t + 1);
      onTriggerToast(
        `Enregistrement automatique terminé : ${report.totalEnterprisesDiscovered} identité(s) numérique(s) enregistrée(s) dans les mémoires des serveurs SaaS et Web.`
      );
    } finally {
      setIsSyncingServerMemories(false);
    }
  };

  // Complete unfiltered list of all genuinely created enterprises in My Easy Project (zero duplicates, no synthetic placeholders)
  const allEnterprisesUnfilteredList = useMemo(() => {
    const nowMs = Date.now();
    const combinedRegistry: Record<string, EnterpriseDetails> = {};
    const storedIdentities = getStoredDigitalIdentitiesMemory();

    // Collect synthetic account names ("ENTREPRISE <FULLNAME>") to reject unconfigured account placeholders
    const syntheticAccountNames = new Set<string>();
    for (const acc of allAccounts) {
      if (acc.fullName) {
        syntheticAccountNames.add(normalizeEnterpriseNameKey(`ENTREPRISE ${acc.fullName}`));
      }
    }

    for (const [tId, ent] of Object.entries(enterpriseRegistry)) {
      if (
        tId &&
        tId !== 'default_tenant' &&
        !tId.startsWith('system_') &&
        ent &&
        typeof ent === 'object' &&
        isRealCreatedEnterpriseName(ent.companyName, tId) &&
        !syntheticAccountNames.has(normalizeEnterpriseNameKey(ent.companyName))
      ) {
        combinedRegistry[tId] = ent;
      }
    }

    for (const [tId, idRec] of Object.entries(storedIdentities)) {
      if (
        tId &&
        !tId.startsWith('system_') &&
        tId !== 'default_tenant' &&
        !combinedRegistry[tId] &&
        idRec &&
        isRealCreatedEnterpriseName(idRec.companyName, tId) &&
        !syntheticAccountNames.has(normalizeEnterpriseNameKey(idRec.companyName))
      ) {
        combinedRegistry[tId] = {
          id: tId,
          tenantId: tId,
          isu: idRec.isu,
          companyName: idRec.companyName,
          legalForm: 'SARL / SAS',
          providerEntityType: 'personne_morale',
          legalEntityType: 'moral',
          activitySector: idRec.sector,
          countryCode: idRec.countryCode || 'CI',
          countryName: idRec.country || "Côte d'Ivoire",
          dialCode: '+225',
          currency: 'XOF' as any,
          taxId: idRec.nifNumber || 'NIF-CERTIFIE',
          rccmOrId: idRec.rcNumber || 'RCCM-CERTIFIE',
          email: idRec.email,
          phone: idRec.phone,
          createdAt: idRec.createdAt,
          lastActivityAt: idRec.updatedAt,
        } as EnterpriseDetails;
      }
    }

    // Deduplicate strictly by normalized companyName (keeping the richest / most recently active record)
    const deduplicatedByName = new Map<string, [string, EnterpriseDetails]>();
    for (const [tId, ent] of Object.entries(combinedRegistry)) {
      if (deletedTenantIdsLocal.has(tId)) continue;
      if (!isRealCreatedEnterpriseName(ent?.companyName, tId)) continue;
      const normName = normalizeEnterpriseNameKey(ent.companyName);
      if (syntheticAccountNames.has(normName)) continue;

      const existingPair = deduplicatedByName.get(normName);
      if (!existingPair) {
        deduplicatedByName.set(normName, [tId, ent]);
      } else {
        const [, prevEnt] = existingPair;
        const prevScore =
          (prevEnt.rccmOrId && prevEnt.rccmOrId !== 'RCCM-CERTIFIE' ? 2 : 0) +
          (prevEnt.taxId && prevEnt.taxId !== 'NIF-CERTIFIE' ? 2 : 0) +
          (prevEnt.representativeName ? 1 : 0);
        const currScore =
          (ent.rccmOrId && ent.rccmOrId !== 'RCCM-CERTIFIE' ? 2 : 0) +
          (ent.taxId && ent.taxId !== 'NIF-CERTIFIE' ? 2 : 0) +
          (ent.representativeName ? 1 : 0);
        if (currScore > prevScore) {
          deduplicatedByName.set(normName, [tId, ent]);
        }
      }
    }

    return Array.from(deduplicatedByName.values()).map(([tId, ent]) => {
      const idRec = storedIdentities[tId] || null;
      const canonicalIsu = generateEnterpriseISU(tId, ent.countryCode || 'CI');
      const rawIsu = ent.isu || idRec?.isu || '';
      const isu =
        !rawIsu || /^ISU-(TE|DE|SY|GL|LO|EN)-/i.test(rawIsu) ? canonicalIsu : rawIsu;
      const lastActIso = ent.lastActivityAt || ent.trialStartedAt || new Date().toISOString();
      const lastActMs = new Date(lastActIso).getTime();
      const inactiveDays = Number.isFinite(lastActMs)
        ? Math.max(0, Math.floor((nowMs - lastActMs) / (1000 * 60 * 60 * 24)))
        : 0;
      const linkedAccountsCount = allAccounts.filter(
        (a) => a.tenantId === tId || a.primaryTenantId === tId
      ).length;
      const legalType =
        ent.legalEntityType === 'physical' || ent.providerEntityType === 'personne_physique'
          ? 'physical'
          : 'moral';
      const trialRec = getOrInitializeProviderTrialRecord(
        tId,
        ent.companyName || 'Entreprise',
        legalType
      );
      return {
        ...ent,
        tenantId: tId,
        isu,
        canonicalIsu,
        lastActivityAt: lastActIso,
        inactiveDays,
        linkedAccountsCount,
        subscriptionStatus: trialRec.subscriptionStatus,
        subscribedPlanName: trialRec.subscribedPlanName,
        digitalIdentity: idRec,
      };
    });
  }, [enterpriseRegistry, allAccounts, subscriptionRefreshTick, deletedTenantIdsLocal]);

  // Filtered enterprises list for the directory view
  const enterprisesList = useMemo(() => {
    return allEnterprisesUnfilteredList.filter((ent) => {
      if (
        directoryEntityFilter !== 'all' &&
        (ent.providerEntityType || 'personne_morale') !== directoryEntityFilter
      ) {
        return false;
      }
      if (directoryStatusFilter === 'suspended_by_adgensys') {
        if (ent.subscriptionStatus !== 'suspended_by_adgensys') return false;
      } else if (directoryStatusFilter === 'subscribed_paid') {
        if (ent.subscriptionStatus !== 'subscribed_paid') return false;
      } else if (directoryStatusFilter === 'active') {
        if (ent.subscriptionStatus === 'suspended_by_adgensys') return false;
      }
      if (!enterpriseSearch.trim()) return true;
      const q = enterpriseSearch.trim().toLowerCase();
      return (
        (ent.companyName || '').toLowerCase().includes(q) ||
        (ent.isu || '').toLowerCase().includes(q) ||
        (ent.countryName || '').toLowerCase().includes(q) ||
        (ent.activitySector || '').toLowerCase().includes(q) ||
        (ent.representativeName || '').toLowerCase().includes(q) ||
        (ent.email || '').toLowerCase().includes(q)
      );
    });
  }, [
    allEnterprisesUnfilteredList,
    enterpriseSearch,
    directoryEntityFilter,
    directoryStatusFilter,
  ]);

  const ADGENSYS_PREESTABLISHED_DELETION_CRITERIA = [
    {
      id: 'UNSUBSCRIBED_TRIAL_EXPIRED',
      code: 'CRIT-01',
      label: 'Non-souscription après expiration de la période d’essai (28j + 02j)',
    },
    {
      id: 'INACTIVITY_THRESHOLD_EXCEEDED',
      code: 'CRIT-02',
      label: 'Inactivité prolongée au-delà du seuil réglementaire (> 30 jours)',
    },
    {
      id: 'SUSPENDED_UNRESOLVED',
      code: 'CRIT-03',
      label: 'Suspension administrative AdGenSys non régularisée',
    },
    {
      id: 'COMPLIANCE_SECURITY_BREACH',
      code: 'CRIT-04',
      label: 'Violation de conformité, anomalie d’audit ou alerte de sécurité Zero-Trust',
    },
    {
      id: 'DUPLICATE_OR_OFFICIAL_CLOSURE',
      code: 'CRIT-05',
      label: 'Doublon d’identité numérique ou cessation officielle d’activité du prestataire',
    },
  ] as const;

  const [selectedDeletionCriteriaByTenant, setSelectedDeletionCriteriaByTenant] = useState<
    Record<string, string[]>
  >({});

  const getAutoEvaluatedCriteriaForEnterprise = (ent: (typeof enterprisesList)[number]): string[] => {
    const auto: string[] = [];
    if (ent.inactiveDays >= 30) auto.push('INACTIVITY_THRESHOLD_EXCEEDED');
    if (ent.subscriptionStatus === 'suspended_by_adgensys') auto.push('SUSPENDED_UNRESOLVED');
    if (ent.subscriptionStatus === 'locked_full' || ent.subscriptionStatus === 'grace_print_only') {
      auto.push('UNSUBSCRIBED_TRIAL_EXPIRED');
    }
    if (auto.length === 0) {
      auto.push('UNSUBSCRIBED_TRIAL_EXPIRED');
    }
    return auto;
  };

  const toggleDeletionCriterionForTenant = (tenantId: string, criterionId: string, defaultList: string[]) => {
    setSelectedDeletionCriteriaByTenant((prev) => {
      const current = prev[tenantId] ?? defaultList;
      const exists = current.includes(criterionId);
      const next = exists ? current.filter((c) => c !== criterionId) : [...current, criterionId];
      return { ...prev, [tenantId]: next };
    });
  };

  const handleAdGenSysDeleteEnterprise = async (ent: (typeof enterprisesList)[number]) => {
    if (!isAdGenSys) {
      onTriggerToast(
        "Accès refusé : Seul l'Administrateur Général des Systèmes (AdGenSys) possède le pouvoir de supprimer une entreprise du système de My Easy Project."
      );
      return;
    }

    const tId = ent.tenantId;
    const activeCriteriaIds =
      selectedDeletionCriteriaByTenant[tId] ?? getAutoEvaluatedCriteriaForEnterprise(ent);

    if (activeCriteriaIds.length === 0) {
      onTriggerToast(
        'Suppression refusée : Veuillez sélectionner au moins un critère préétabli de suppression réglementaire.'
      );
      return;
    }

    const activeCriteriaLabels = ADGENSYS_PREESTABLISHED_DELETION_CRITERIA.filter((c) =>
      activeCriteriaIds.includes(c.id)
    ).map((c) => `${c.code} (${c.label})`);

    setDeletedTenantIdsLocal((prev) => {
      const next = new Set(prev);
      next.add(tId);
      return next;
    });
    setConfirmDeleteTenantId(null);

    try {
      const memoryKeys = [
        'mep_enterprise_registry_v3',
        'mep_enterprise_registry_backup_v3',
        'mep_servers_digital_identities_memory_v1',
        'mep_saas_server_memory_v1',
        'mep_web_server_memory_v1',
      ];
      for (const mk of memoryKeys) {
        const raw = localStorage.getItem(mk);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            delete parsed[tId];
            localStorage.setItem(mk, JSON.stringify(parsed));
          }
        }
      }
      localStorage.removeItem(`mep_provider_trial_${tId}`);
    } catch {
      // ignore
    }

    onPurgeInactiveEnterprises([tId]);
    if (onDeleteEnterpriseFromSystem) {
      onDeleteEnterpriseFromSystem(tId, ent.companyName || 'Entreprise', ent.isu);
    }

    try {
      await fetch('/api/saas/adgensys/delete-enterprise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Operator-Role': activeAccount.role,
        },
        body: JSON.stringify({
          operatorRole: activeAccount.role,
          tenantId: tId,
          companyName: ent.companyName,
          isu: ent.isu,
          deletionCriteriaIds: activeCriteriaIds,
          deletionCriteriaLabels: activeCriteriaLabels,
        }),
      });
    } catch {
      // ignore network error
    }

    setSubscriptionRefreshTick((t) => t + 1);
    onTriggerToast(
      `Entreprise "${ent.companyName}" (ISU : ${ent.isu}) supprimée par l'AdGenSys selon critères préétablis : ${activeCriteriaLabels.join(' + ')}.`
    );
  };

  const handleToggleSuspendEnterpriseSubscription = (
    ent: (typeof enterprisesList)[number]
  ) => {
    if (!isAdGenSys) {
      onTriggerToast(
        'Accès refusé : seul l’Administrateur Général des Systèmes (AdGenSys) a le pouvoir de suspendre ou réactiver l’abonnement d’une entreprise.'
      );
      return;
    }
    const legalType =
      ent.legalEntityType === 'physical' || ent.providerEntityType === 'personne_physique'
        ? 'physical'
        : 'moral';
    const currentRec = getOrInitializeProviderTrialRecord(
      ent.tenantId,
      ent.companyName || 'Entreprise',
      legalType
    );
    const isCurrentlySuspended = currentRec.subscriptionStatus === 'suspended_by_adgensys';
    const nextStatus = isCurrentlySuspended
      ? currentRec.subscribedPlanId
        ? 'subscribed_paid'
        : 'trial_active'
      : 'suspended_by_adgensys';

    const updated: ProviderTrialRecord = {
      ...currentRec,
      subscriptionStatus: nextStatus,
      suspendedAt: isCurrentlySuspended ? undefined : new Date().toISOString(),
      suspensionReason: isCurrentlySuspended
        ? undefined
        : 'Décision administrative d’exploitation AdGenSys',
    };
    try {
      localStorage.setItem(
        `mep_provider_trial_${ent.tenantId || 'default'}`,
        JSON.stringify(updated)
      );
    } catch {
      // ignore
    }
    setSubscriptionRefreshTick((t) => t + 1);
    onTriggerToast(
      isCurrentlySuspended
        ? `L’abonnement de l’entreprise "${ent.companyName}" a été réactivé par l’AdGenSys.`
        : `L’abonnement de l’entreprise "${ent.companyName}" a été suspendu par l’AdGenSys.`
    );
  };

  const inactiveEnterprisesMatchingThreshold = useMemo(() => {
    return enterprisesList.filter((e) => e.inactiveDays >= inactivityThresholdDays);
  }, [enterprisesList, inactivityThresholdDays]);

  const normalizeIdentityString = (val: string): string =>
    String(val || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

  const executeVerifyAndEnterEnterprise = async (rawIsuInput: string, rawNameInput: string) => {
    setGateError('');
    if (!isAdGenSys) {
      setGateError(
        'Accès refusé : seul l’Administrateur Général des Systèmes (AdGenSys) peut entrer dans l’espace privé d’une entreprise.'
      );
      return;
    }

    const cleanIsu = normalizeIdentityString(rawIsuInput);
    const cleanName = normalizeIdentityString(rawNameInput);

    if (!cleanIsu || !cleanName) {
      setGateError(
        'Condition obligatoire : veuillez renseigner l’Identifiant Système Unique (ISU) ET la Raison Sociale exacte de l’entreprise.'
      );
      return;
    }

    // 1. Check unfiltered local/synced registry with resilient ISU + Raison Sociale matching
    const inputIsuDigits = cleanIsu.split('-').pop() || '';
    const localMatch = allEnterprisesUnfilteredList.find((ent) => {
      const entName = normalizeIdentityString(ent.companyName || '');
      if (!entName) return false;
      const nameMatches =
        entName === cleanName ||
        (cleanName.length >= 3 && (entName.includes(cleanName) || cleanName.includes(entName)));
      if (!nameMatches) return false;

      const candidateIsus = new Set<string>([
        normalizeIdentityString(ent.isu),
        normalizeIdentityString((ent as any).canonicalIsu || ''),
        normalizeIdentityString(generateEnterpriseISU(ent.tenantId, ent.countryCode || 'CI')),
        normalizeIdentityString(generateEnterpriseISU(ent.countryCode || 'CI', ent.tenantId)),
        normalizeIdentityString(ent.digitalIdentity?.isu || ''),
      ]);
      if (candidateIsus.has(cleanIsu)) return true;
      if (inputIsuDigits.length >= 6) {
        for (const cand of candidateIsus) {
          if (cand && cand.endsWith(`-${inputIsuDigits}`)) return true;
        }
      }
      return false;
    });

    setIsVerifyingGate(true);
    try {
      const res = await fetch('/api/saas/adgensys/verify-enterprise-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isu: localMatch ? localMatch.isu : rawIsuInput.trim().toUpperCase(),
          raisonSociale: localMatch
            ? localMatch.companyName
            : rawNameInput.trim().toUpperCase(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok && data.enterpriseDetails) {
          setIsVerifyingGate(false);
          const mergedDetails = {
            ...(localMatch || {}),
            ...data.enterpriseDetails,
            tenantId: localMatch?.tenantId || data.tenantId,
            isu:
              localMatch?.isu ||
              data.enterpriseDetails.isu ||
              cleanIsu,
            companyName:
              localMatch?.companyName ||
              data.enterpriseDetails.companyName ||
              rawNameInput.trim().toUpperCase(),
          };
          onEnterEnterpriseWorkspace(
            mergedDetails.tenantId,
            mergedDetails as EnterpriseDetails,
            data.workspaceData
          );
          return;
        }
      }
    } catch {
      // Fallback to local registry check below
    }
    setIsVerifyingGate(false);

    if (!localMatch) {
      setGateError(
        'Accès refusé : l’Identifiant Système Unique (ISU) ou la Raison Sociale ne correspond à aucune entreprise créée. Vérifiez que l’ISU et la Raison Sociale renseignés sont exacts.'
      );
      return;
    }

    onEnterEnterpriseWorkspace(localMatch.tenantId, localMatch, null);
  };

  // Verify ISU + Raison Sociale to enter an enterprise's private workspace
  const handleVerifyAndEnterWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeVerifyAndEnterEnterprise(inputIsu, inputRaisonSociale);
  };

  // Handle AdGenSys Exclusive Creation of MOAS Account
  const handleCreateMoasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdGenSys) return;
    if (!moasFullName.trim() || !moasPhone.trim() || !moasEmail.trim()) return;

    const country =
      WORLD_COUNTRIES.find((c) => c.code === moasCountryCode) || WORLD_COUNTRIES[0];
    const generatedPwd = generateDefaultPassword('MOAS');
    const newMoas: LocalAccountRecord = {
      id: `moas_${Date.now()}`,
      tenantId: 'system_saas_server',
      fullName: moasFullName.trim().toUpperCase(),
      phoneDialCode: country.dialCode,
      phoneNumber: `${country.dialCode} ${moasPhone.trim()}`,
      email: moasEmail.trim().toLowerCase(),
      role: 'moas',
      functionTitle: 'Manager d’Opérations et d’Assistances Serveur (MOAS)',
      department: moasDepartment.trim() || 'Direction des Opérations & Assistances Serveur',
      defaultPassword: generatedPwd,
      currentPassword: generatedPwd,
      mustChangePassword: true,
      isActivated: true,
      companySetupCompleted: true,
      accountStatus: 'active',
      createdByRole: 'adgensys',
      createdByAccountId: activeAccount.id,
      createdAt: new Date().toISOString(),
      contractTerminated: false,
    };

    try {
      await fetch('/api/saas/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: newMoas }),
      });
    } catch {
      // synced locally
    }

    onCreateSystemAccount(newMoas);
    setLastCreatedMoas(newMoas);
    setMoasFullName('');
    setMoasPhone('');
    setMoasEmail('');
    onTriggerToast(
      `Compte MOAS créé avec succès pour ${newMoas.fullName} (Exclusivité AdGenSys).`
    );
  };

  // Handle MOAS Exclusive Creation of Téléconseiller / Consultant Opération Account
  const handleCreateOperatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMoas && !isAdGenSys) return;
    if (!opFullName.trim() || !opPhone.trim() || !opEmail.trim()) return;

    const country = WORLD_COUNTRIES.find((c) => c.code === opCountryCode) || WORLD_COUNTRIES[0];
    const prefix = opRoleType === 'teleconseiller' ? 'TLC' : 'COP';
    const generatedPwd = generateDefaultPassword(prefix);

    const newOp: LocalAccountRecord = {
      id: `${prefix.toLowerCase()}_${Date.now()}`,
      tenantId: 'system_saas_server',
      fullName: opFullName.trim().toUpperCase(),
      phoneDialCode: country.dialCode,
      phoneNumber: `${country.dialCode} ${opPhone.trim()}`,
      email: opEmail.trim().toLowerCase(),
      role: opRoleType,
      functionTitle:
        opRoleType === 'teleconseiller'
          ? 'Téléconseiller Serveur SaaS'
          : 'Consultant Opération Serveur SaaS',
      department:
        opRoleType === 'teleconseiller'
          ? 'Cellule Téléconseil & Assistance Abonnés'
          : 'Ingénierie des Opérations & Monitoring Serveur',
      defaultPassword: generatedPwd,
      currentPassword: generatedPwd,
      mustChangePassword: true,
      isActivated: true,
      companySetupCompleted: true,
      accountStatus: 'active',
      saasPermissions:
        opSelectedPermissions.length > 0
          ? opSelectedPermissions
          : ['assistance_abonnements'],
      createdByRole: activeAccount.role,
      createdByAccountId: activeAccount.id,
      createdAt: new Date().toISOString(),
      contractTerminated: false,
    };

    try {
      await fetch('/api/saas/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: newOp }),
      });
    } catch {
      // synced locally
    }

    onCreateSystemAccount(newOp);
    setLastCreatedOperator(newOp);
    setOpFullName('');
    setOpPhone('');
    setOpEmail('');
    onTriggerToast(
      `Compte ${newOp.functionTitle} créé avec succès pour ${newOp.fullName}.`
    );
  };

  const operatorAccountsList = useMemo(
    () =>
      allAccounts.filter(
        (a) => a.role === 'teleconseiller' || a.role === 'consultant_operation'
      ),
    [allAccounts]
  );

  const moasAccountsList = useMemo(
    () => allAccounts.filter((a) => a.role === 'moas'),
    [allAccounts]
  );

  const filteredAllSystemAccounts = useMemo(() => {
    return allAccounts.filter((a) => {
      if (accountRoleFilter !== 'all') {
        if (accountRoleFilter === 'enterprise_staff') {
          if (
            a.role !== 'super_admin' &&
            a.role !== 'manager' &&
            a.role !== 'accountant' &&
            a.role !== 'collaborator' &&
            a.role !== 'viewer'
          ) {
            return false;
          }
        } else if (a.role !== accountRoleFilter) {
          return false;
        }
      }
      if (accountTenantFilter !== 'all') {
        if (a.tenantId !== accountTenantFilter && a.primaryTenantId !== accountTenantFilter) {
          return false;
        }
      }
      if (accountSearch.trim()) {
        const q = accountSearch.trim().toLowerCase();
        const entName =
          allEnterprisesUnfilteredList.find(
            (e) => e.tenantId === a.tenantId || e.tenantId === a.primaryTenantId
          )?.companyName || '';
        return (
          (a.fullName || '').toLowerCase().includes(q) ||
          (a.email || '').toLowerCase().includes(q) ||
          (a.functionTitle || '').toLowerCase().includes(q) ||
          entName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    allAccounts,
    accountRoleFilter,
    accountTenantFilter,
    accountSearch,
    allEnterprisesUnfilteredList,
  ]);

  const openAdGenSysPasswordModal = (acc: LocalAccountRecord) => {
    if (!isAdGenSys) {
      onTriggerToast(
        'Accès refusé : seul l’AdGenSys a le pouvoir de modifier les mots de passe du Super-Admin et de ses collaborateurs.'
      );
      return;
    }
    setPasswordModalTarget(acc);
    setAdGenSysNewPassword(acc.currentPassword || acc.defaultPassword || generateDefaultPassword('MEP'));
    setAdGenSysMustChangeOnNextLogin(false);
  };

  const handleSaveAdGenSysPasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdGenSys || !passwordModalTarget) return;
    const cleanPwd = adGenSysNewPassword.trim();
    if (cleanPwd.length < 4) {
      onTriggerToast('Veuillez saisir un mot de passe d’au moins 4 caractères.');
      return;
    }
    onUpdateAccountStatusOrPermissions(passwordModalTarget.id, {
      currentPassword: cleanPwd,
      defaultPassword: cleanPwd,
      mustChangePassword: adGenSysMustChangeOnNextLogin,
      isActivated: true,
    });
    onTriggerToast(
      `Mot de passe de ${passwordModalTarget.fullName} (${passwordModalTarget.role.toUpperCase()}) modifié avec succès par l’AdGenSys.`
    );
    setPasswordModalTarget(null);
  };

  const openEditCollaboratorModal = (acc: LocalAccountRecord) => {
    setEditCollaboratorTarget(acc);
    setEditCollabFullName(acc.fullName || '');
    setEditCollabPhone(acc.phoneNumber || '');
    setEditCollabEmail(acc.email || '');
    setEditCollabRole(acc.role);
    setEditCollabFunction(acc.functionTitle || '');
    setEditCollabDepartment(acc.department || '');
    setEditCollabPassword('');
  };

  const handleSaveCollaboratorEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCollaboratorTarget) return;
    const cleanName = editCollabFullName.trim().toUpperCase();
    const cleanEmail = editCollabEmail.trim().toLowerCase();
    if (!cleanName || !cleanEmail) {
      onTriggerToast('Veuillez renseigner le nom complet et l’email du collaborateur.');
      return;
    }
    const updates: Partial<LocalAccountRecord> = {
      fullName: cleanName,
      phoneNumber: editCollabPhone.trim() || editCollaboratorTarget.phoneNumber,
      email: cleanEmail,
      role: editCollabRole,
      functionTitle: editCollabFunction.trim() || editCollaboratorTarget.functionTitle,
      department: editCollabDepartment.trim() || editCollaboratorTarget.department,
    };
    if (editCollabPassword.trim().length >= 4) {
      updates.currentPassword = editCollabPassword.trim();
      updates.defaultPassword = editCollabPassword.trim();
      updates.mustChangePassword = false;
      updates.isActivated = true;
    }
    onUpdateAccountStatusOrPermissions(editCollaboratorTarget.id, updates);
    onTriggerToast(
      `Profil collaborateur / utilisateur de ${cleanName} mis à jour avec succès.`
    );
    setEditCollaboratorTarget(null);
  };

  // =========================================================================
  // POUVOIR EXCLUSIF ADGENSYS : CHANGER LE SUPER-ADMIN D'UNE ENTREPRISE
  // EN CAS D'INDISPONIBILITÉ CONSTATÉE ET PROUVÉE
  // =========================================================================
  const [replaceSuperAdminModalEnt, setReplaceSuperAdminModalEnt] = useState<{
    tenantId: string;
    companyName: string;
    isu: string;
    currentSuperAdmin?: LocalAccountRecord | null;
  } | null>(null);
  const [unavailabilityReason, setUnavailabilityReason] = useState<string>(
    'Absence prolongée / Incapacité médicale constatée'
  );
  const [proofReference, setProofReference] = useState<string>('');
  const [proofDescription, setProofDescription] = useState<string>('');
  const [replacementMode, setReplacementMode] = useState<'promote_existing' | 'new_super_admin'>(
    'new_super_admin'
  );
  const [previousAdminDisposition, setPreviousAdminDisposition] = useState<
    'demote_to_manager' | 'suspend_account'
  >('demote_to_manager');
  const [selectedCollaboratorToPromoteId, setSelectedCollaboratorToPromoteId] =
    useState<string>('');
  const [newSaFullName, setNewSaFullName] = useState<string>('');
  const [newSaEmail, setNewSaEmail] = useState<string>('');
  const [newSaPhone, setNewSaPhone] = useState<string>('+225 ');
  const [newSaFunction, setNewSaFunction] = useState<string>(
    'Directeur Général & Super-Administrateur'
  );
  const [newSaPassword, setNewSaPassword] = useState<string>('');
  const [isExecutingSaReplacement, setIsExecutingSaReplacement] = useState<boolean>(false);

  const openReplaceSuperAdminModal = (params: {
    tenantId: string;
    companyName: string;
    isu: string;
    currentSuperAdmin?: LocalAccountRecord | null;
  }) => {
    if (!isAdGenSys) {
      onTriggerToast(
        'Accès refusé : seul l’AdGenSys a le pouvoir de changer le Super-Admin d’une entreprise en cas d’indisponibilité constatée et prouvée.'
      );
      return;
    }
    const cleanNameUpper = (params.companyName || '').trim().toUpperCase();
    const matchedSa =
      params.currentSuperAdmin ||
      allAccounts.find(
        (a) =>
          a.role === 'super_admin' &&
          (a.tenantId === params.tenantId ||
            (a.companyName || '').trim().toUpperCase() === cleanNameUpper)
      ) ||
      null;

    const enterpriseCollabs = allAccounts.filter(
      (a) =>
        a.role !== 'super_admin' &&
        a.role !== 'adgensys' &&
        a.role !== 'moas' &&
        (a.tenantId === params.tenantId ||
          (a.companyName || '').trim().toUpperCase() === cleanNameUpper ||
          (matchedSa && (a as any).createdBySuperAdminId === matchedSa.id))
    );

    setReplaceSuperAdminModalEnt({
      ...params,
      currentSuperAdmin: matchedSa,
    });
    setUnavailabilityReason('Absence prolongée / Incapacité médicale constatée');
    setProofReference(
      `PV-INDISP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
    );
    setProofDescription(
      `Indisponibilité constatée et prouvée du Super-Admin de ${params.companyName} (${params.isu}). Continuité d'exploitation assurée par décision souveraine AdGenSys.`
    );
    setReplacementMode(enterpriseCollabs.length > 0 ? 'promote_existing' : 'new_super_admin');
    setSelectedCollaboratorToPromoteId(enterpriseCollabs[0]?.id || '');
    setPreviousAdminDisposition('demote_to_manager');
    setNewSaFullName('');
    setNewSaEmail('');
    setNewSaPhone('+225 ');
    setNewSaFunction('Directeur Général & Super-Administrateur');
    setNewSaPassword(generateDefaultPassword('ADM'));
  };

  const handleExecuteReplaceSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdGenSys || !replaceSuperAdminModalEnt) return;
    if (!proofReference.trim() || !proofDescription.trim()) {
      onTriggerToast(
        'Veuillez renseigner la référence de preuve et le constat d’indisponibilité prouvée.'
      );
      return;
    }

    const entCollabs = allAccounts.filter(
      (a) =>
        a.role !== 'super_admin' &&
        a.role !== 'adgensys' &&
        a.role !== 'moas' &&
        (a.tenantId === replaceSuperAdminModalEnt.tenantId ||
          (a.companyName || '').trim().toUpperCase() ===
            (replaceSuperAdminModalEnt.companyName || '').trim().toUpperCase() ||
          (replaceSuperAdminModalEnt.currentSuperAdmin &&
            (a as any).createdBySuperAdminId === replaceSuperAdminModalEnt.currentSuperAdmin.id))
    );

    const promotedCollab =
      replacementMode === 'promote_existing'
        ? entCollabs.find((c) => c.id === selectedCollaboratorToPromoteId)
        : null;

    if (replacementMode === 'promote_existing' && !promotedCollab) {
      onTriggerToast('Veuillez sélectionner le collaborateur à promouvoir Super-Admin.');
      return;
    }

    if (
      replacementMode === 'new_super_admin' &&
      (!newSaFullName.trim() || !newSaEmail.trim())
    ) {
      onTriggerToast(
        'Veuillez renseigner le nom complet et l’email professionnel du nouveau Super-Admin.'
      );
      return;
    }

    setIsExecutingSaReplacement(true);
    try {
      const payload = {
        operatorRole: 'adgensys',
        tenantId: replaceSuperAdminModalEnt.tenantId,
        companyName: replaceSuperAdminModalEnt.companyName,
        isu: replaceSuperAdminModalEnt.isu,
        unavailabilityReason,
        proofReference: proofReference.trim(),
        proofDescription: proofDescription.trim(),
        replacementMode,
        previousAdminDisposition,
        previousSuperAdminId: replaceSuperAdminModalEnt.currentSuperAdmin?.id || '',
        previousSuperAdminName: replaceSuperAdminModalEnt.currentSuperAdmin?.fullName || '',
        previousSuperAdminEmail: replaceSuperAdminModalEnt.currentSuperAdmin?.email || '',
        targetCollaboratorId: promotedCollab?.id || `sa_rep_${Date.now()}`,
        newFullName:
          replacementMode === 'promote_existing'
            ? promotedCollab?.fullName
            : newSaFullName.trim().toUpperCase(),
        newEmail:
          replacementMode === 'promote_existing'
            ? promotedCollab?.email
            : newSaEmail.trim().toLowerCase(),
        newPhone:
          replacementMode === 'promote_existing'
            ? promotedCollab?.phoneNumber
            : newSaPhone.trim(),
        newFunctionTitle: newSaFunction.trim() || 'Directeur Général & Super-Administrateur',
        newDepartment: 'Direction Générale',
        newPassword: newSaPassword.trim() || generateDefaultPassword('ADM'),
      };

      const res = await fetch('/api/saas/adgensys/replace-super-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-operator-role': 'adgensys',
        },
        body: JSON.stringify(payload),
      });

      const oldSa = replaceSuperAdminModalEnt.currentSuperAdmin;
      if (oldSa) {
        onUpdateAccountStatusOrPermissions(oldSa.id, {
          role: previousAdminDisposition === 'demote_to_manager' ? 'manager' : 'viewer',
          accountStatus: previousAdminDisposition === 'suspend_account' ? 'blocked' : 'active',
          functionTitle:
            previousAdminDisposition === 'suspend_account'
              ? `${oldSa.functionTitle || 'Ancien Super-Admin'} (Indisponibilité constatée)`
              : `${oldSa.functionTitle || 'Directeur'} (Ancien Super-Admin remplacé)`,
        });
      }

      if (replacementMode === 'promote_existing' && promotedCollab) {
        onUpdateAccountStatusOrPermissions(promotedCollab.id, {
          role: 'super_admin',
          accountStatus: 'active',
          isActivated: true,
          companySetupCompleted: true,
          canActAsSuperAdmin: true,
          mustChangePassword: true,
          functionTitle: payload.newFunctionTitle,
          department: 'Direction Générale',
          currentPassword: payload.newPassword,
          defaultPassword: payload.newPassword,
          tenantId: replaceSuperAdminModalEnt.tenantId,
          companyName: replaceSuperAdminModalEnt.companyName,
        });
      } else {
        const createdSa: LocalAccountRecord = {
          id: payload.targetCollaboratorId,
          fullName: payload.newFullName || 'NOUVEAU SUPER-ADMIN',
          phoneNumber: payload.newPhone || '+225 07 00 00 00 00',
          phoneDialCode: '+225',
          email: payload.newEmail || 'direction@entreprise.com',
          role: 'super_admin',
          functionTitle: payload.newFunctionTitle,
          department: 'Direction Générale',
          defaultPassword: payload.newPassword,
          currentPassword: payload.newPassword,
          mustChangePassword: true,
          companySetupCompleted: true,
          canActAsSuperAdmin: true,
          isActivated: true,
          accountStatus: 'active',
          createdAt: new Date().toISOString().slice(0, 10),
          createdByRole: 'adgensys',
          tenantId: replaceSuperAdminModalEnt.tenantId,
          companyName: replaceSuperAdminModalEnt.companyName,
        };
        onCreateSystemAccount(createdSa);
      }

      if (res.ok) {
        const data = await res.json();
        onTriggerToast(
          data?.message ||
            `Super-Admin de "${replaceSuperAdminModalEnt.companyName}" changé avec succès suite au constat d'indisponibilité prouvée (${proofReference.trim()}).`
        );
      } else {
        onTriggerToast(
          `Super-Admin de "${replaceSuperAdminModalEnt.companyName}" remplacé avec succès (Preuve : ${proofReference.trim()}).`
        );
      }
      setReplaceSuperAdminModalEnt(null);
    } catch {
      onTriggerToast(
        `Super-Admin de "${replaceSuperAdminModalEnt.companyName}" remplacé avec succès.`
      );
      setReplaceSuperAdminModalEnt(null);
    } finally {
      setIsExecutingSaReplacement(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-indigo-600/30 dark:border-indigo-500/40 bg-white dark:bg-slate-900 shadow-sm overflow-hidden space-y-0">
      {/* Top Governance Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-white">
                {isAdGenSys
                  ? 'Gouvernance Centrale AdGenSys — Administrateur Général des Systèmes'
                  : isMoas
                  ? 'Console MOAS — Manager d’Opérations et d’Assistances Serveur'
                  : `Console Opérateur Serveur SaaS — ${activeAccount.functionTitle}`}
              </h2>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-bold uppercase">
                {isAdGenSys
                  ? 'Contrôle Total Système, Serveur SaaS & Entreprises'
                  : isMoas
                  ? 'Exclusivité Serveur SaaS • Téléconseillers & Consultants Opération'
                  : 'Accès Serveur SaaS & Services • ISU Visible'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isAdGenSys
                ? 'Contrôle intégral du Serveur SaaS, création exclusive des comptes MOAS, épuration des entreprises inactives et accès conditionné (ISU + Raison Sociale) aux espaces privés.'
                : isMoas
                ? 'Gestion exclusive des comptes Téléconseiller et Consultant Opération, consultation de l’annuaire des entreprises avec ISU visible et gestion des abonnements Serveur SaaS.'
                : `Opérateur : ${activeAccount.fullName} (${activeAccount.email}) — Droits d'accès au Serveur SaaS et ses services avec visibilité complète des ISU entreprises.`}
            </p>
          </div>
        </div>

        {/* Navigation Pills inside Governance Console */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setActiveSection('enterprise_directory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'enterprise_directory'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Annuaire des Entreprises ({enterprisesList.length})</span>
          </button>
          {isAdGenSys && (
            <>
              <button
                type="button"
                onClick={() => setActiveSection('enterprise_gate')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeSection === 'enterprise_gate'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Accès Espace Privé (ISU)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('database_purge')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeSection === 'database_purge'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Épuration Base ({enterprisesList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('moas_management')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeSection === 'moas_management'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Exclusivité MOAS &amp; Comptes ({allAccounts.length})</span>
              </button>
            </>
          )}
          {(isAdGenSys || isMoas) && (
            <button
              type="button"
              onClick={() => setActiveSection('operator_management')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeSection === 'operator_management'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Téléconseillers &amp; Consultants ({operatorAccountsList.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveSection('saas_subscriptions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'saas_subscriptions'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Souscriptions Abonnements SaaS ({enterprisesList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('web_server_synergy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'web_server_synergy'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-cyan-300 hover:text-white hover:bg-cyan-900/50 border border-cyan-500/40'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Serveur Web &amp; Services Intelligents (Synergie SaaS)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('rmm_sav_center')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'rmm_sav_center'
                ? 'bg-amber-500 text-slate-950'
                : 'text-amber-300 hover:text-white hover:bg-amber-900/50 border border-amber-500/40'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Télémaintenance (RMM) &amp; SAV Proactif ({enterprisesList.length})</span>
          </button>
        </div>
      </div>

      {/* If connected user is Téléconseiller or Consultant Opération, display their operational permissions summary */}
      {isOperatorSubRole && (
        <div className="border-b border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 px-6 py-4 space-y-2.5">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Vos droits d&apos;accès autorisés sur le Serveur SaaS et tous ses services ({(activeAccount.saasPermissions || []).length}) :
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {SAAS_OPERATOR_PERMISSIONS.map((perm) => {
              const hasRight = (activeAccount.saasPermissions || []).includes(perm.id);
              return (
                <div
                  key={perm.id}
                  className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                    hasRight
                      ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 opacity-50 text-slate-500'
                  }`}
                >
                  {hasRight ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">{perm.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{perm.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Enterprise Inspection Banner for AdGenSys */}
      {isAdGenSys && inspectedEnterprise && (
        <div className="bg-emerald-950 text-emerald-100 px-6 py-3 border-b border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>SESSION D&apos;INSPECTION ADGENSYS AUTORISÉE :</strong> Vous avez accès à l&apos;espace privé de l&apos;entreprise{' '}
              <strong className="uppercase text-white">{inspectedEnterprise.companyName}</strong> (ISU vérifié :{' '}
              <strong className="font-mono text-emerald-300">{inspectedEnterprise.isu}</strong>). Tous les onglets de l&apos;application ERP sont déverrouillés pour cette entreprise.
            </span>
          </div>
          <button
            type="button"
            onClick={onExitEnterpriseWorkspace}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Quitter l&apos;espace privé de l&apos;entreprise</span>
          </button>
        </div>
      )}

      <div className="p-6">
        {/* ===================================================================
            SECTION 0 (Serveur SaaS): ANNUAIRE DE TOUTES LES ENTREPRISES CRÉÉES DANS MY EASY PROJECT
        =================================================================== */}
        {activeSection === 'enterprise_directory' && (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                      Annuaire Central Serveur SaaS — Toutes les Entreprises Réseau My Easy Project ({enterprisesList.length})
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-mono font-bold uppercase">
                      Répertoire Multi-Terminaux (En Ligne &amp; Hors-Ligne) • ISU Dévoilé
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-mono font-extrabold uppercase">
                      Signatures Pré-Serveurs Récupérées &amp; Contrôlées 100%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Recensement exhaustif de toutes les entreprises créées à partir des différents terminaux connectés au réseau de <strong>My Easy Project</strong>, qu&apos;elles soient <strong>en ligne ou hors-ligne</strong>, y compris la récupération automatique des <strong>signatures numériques des entreprises créées avant l&apos;existence des serveurs SaaS et Web</strong> pour un contrôle intégral à 100%.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isSyncingServerMemories}
                  onClick={handleManualSyncServerMemories}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingServerMemories ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncingServerMemories
                      ? 'Scan des signatures SaaS & Web...'
                      : 'Scanner Signatures Pré-Serveurs & Enrôler (SaaS + Web)'}
                  </span>
                </button>
                {isAdGenSys && (
                  <button
                    type="button"
                    onClick={() => setActiveSection('enterprise_gate')}
                    className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Portail d&apos;Entrée Conditionné (ISU + Raison Sociale)</span>
                  </button>
                )}
              </div>
            </div>

            {/* KPIs Annuaire des Entreprises */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
                <div className="text-[11px] font-medium text-slate-500">Total Entreprises Contrôlées (100%)</div>
                <div className="mt-1 text-xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                  {enterprisesList.length}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
                <div className="text-[11px] font-medium text-slate-500">Personnes Morales / Physiques</div>
                <div className="mt-1 text-xl font-extrabold font-mono text-slate-900 dark:text-white">
                  {enterprisesList.filter((e) => e.providerEntityType !== 'personne_physique').length} /{' '}
                  {enterprisesList.filter((e) => e.providerEntityType === 'personne_physique').length}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
                <div className="text-[11px] font-medium text-slate-500">En Ligne &amp; Hors-Ligne Contrôlées</div>
                <div className="mt-1 text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  {enterprisesList.filter((e) => e.subscriptionStatus !== 'suspended_by_adgensys').length}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
                <div className="text-[11px] font-medium text-slate-500">Abonnements Suspendus</div>
                <div className="mt-1 text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
                  {enterprisesList.filter((e) => e.subscriptionStatus === 'suspended_by_adgensys').length}
                </div>
              </div>
            </div>

            {/* Barre de Recherche et Filtres de l'Annuaire */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={enterpriseSearch}
                  onChange={(e) => setEnterpriseSearch(e.target.value)}
                  placeholder="Rechercher par Raison Sociale, Secteur, Pays, Dirigeant ou Email..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-8 pr-3 py-2 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={directoryEntityFilter}
                  onChange={(e) => setDirectoryEntityFilter(e.target.value as any)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold"
                >
                  <option value="all">Toutes les formes (Morale &amp; Physique)</option>
                  <option value="personne_morale">Personne Morale uniquement</option>
                  <option value="personne_physique">Personne Physique uniquement</option>
                </select>

                <select
                  value={directoryStatusFilter}
                  onChange={(e) => setDirectoryStatusFilter(e.target.value as any)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold"
                >
                  <option value="all">Tous les statuts d&apos;abonnement</option>
                  <option value="active">Actifs (Essai + Abonnés)</option>
                  <option value="subscribed_paid">Abonnés Payants uniquement</option>
                  <option value="suspended_by_adgensys">Suspendus par AdGenSys</option>
                </select>
              </div>
            </div>

            {/* Légende Officielle des Voyants d'État Réseau Temps Réel & Identité des Utilisateurs Connectés */}
            <div className="p-3 rounded-xl bg-slate-900 text-white border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px]">
              <div className="font-bold text-cyan-300 flex items-center gap-2">
                <span>Télédiagnostic Temps Réel de l&apos;Annuaire Serveur :</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-[10px]">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/60 text-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                  <span>Vert fixe : En ligne</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/70 text-amber-300">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-90" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                  <span>Orange clignotant : Mauvaise qualité réseau</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-950 border border-rose-500/70 text-rose-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-[0_0_8px_#e11d48]" />
                  <span>Rouge fixe : Hors-ligne</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950 border border-red-500/80 text-red-200">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-95" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
                  </span>
                  <span>Rouge clignotant : En panne</span>
                </span>
              </div>
            </div>

            {/* Tableau Complet de l'Annuaire des Entreprises */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-bold text-slate-500">
                      <th className="py-3 px-4">Raison Sociale, Signature Numérique &amp; Terminal</th>
                      <th className="py-3 px-4">Forme &amp; Identifiants Légaux</th>
                      <th className="py-3 px-4">Représentant &amp; Coordonnées</th>
                      <th className="py-3 px-4">Pays, Devise &amp; Comptes</th>
                      <th className="py-3 px-4">ISU, Statut Exact (Voyant Réseau) &amp; Identité des Utilisateurs Connectés</th>
                      <th className="py-3 px-4 text-right">Actions d&apos;Exploitation Serveur SaaS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {enterprisesList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          Aucune entreprise ne correspond aux critères de recherche dans l&apos;annuaire.
                        </td>
                      </tr>
                    ) : (
                      enterprisesList.map((ent) => {
                        const isCurrentlyInspected =
                          inspectedEnterprise?.tenantId === ent.tenantId;
                        const isSuspended = ent.subscriptionStatus === 'suspended_by_adgensys';
                        const didRec = (ent as any).digitalIdentity;
                        const isLegacySig = Boolean(
                          didRec?.createdBeforeServersExistence ||
                            String(didRec?.digitalSignature || '').startsWith('SIG-LEGACY-RECOVERY')
                        );
                        const isOfflineControlled =
                          didRec?.networkPresenceStatus === 'offline_controlled';
                        return (
                          <tr
                            key={ent.tenantId}
                            className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                              isCurrentlyInspected
                                ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                                : isSuspended
                                ? 'bg-rose-50/30 dark:bg-rose-950/15'
                                : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="font-extrabold text-slate-900 dark:text-white uppercase flex items-center gap-1.5 flex-wrap">
                                <span>{ent.companyName}</span>
                                {isCurrentlyInspected && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-mono uppercase">
                                    Inspectée
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                                {ent.activitySector || 'Prestations de Services & Ingénierie'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Créée le : {String(ent.createdAt || ent.trialStartedAt || '').slice(0, 10) || '2026'}
                              </div>
                              {didRec && (
                                <div className="mt-1 space-y-1">
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 font-mono text-[9px] font-bold">
                                      {didRec.digitalIdentityId}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                                        isOfflineControlled
                                          ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                                          : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                                      }`}
                                    >
                                      {isOfflineControlled
                                        ? 'Hors-Ligne • Contrôlée 100%'
                                        : 'En Ligne • Contrôlée 100%'}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[9px] font-bold">
                                      Terminal : {didRec.originTerminal?.terminalType || 'Ordinateur'}
                                    </span>
                                  </div>
                                  <div className="text-[9px] font-mono text-amber-700 dark:text-amber-300 font-bold">
                                    {didRec.digitalSignature || didRec.cryptographicFingerprintSha256} (
                                    {isLegacySig ? 'Signature Pré-Serveurs Récupérée' : 'Signature Native'})
                                  </div>
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                {ent.providerEntityType === 'personne_physique'
                                  ? 'Personne Physique'
                                  : `Personne Morale (${ent.legalForm || 'SARL / SAS'})`}
                              </span>
                              <div className="text-[11px] text-slate-500 font-mono mt-1">
                                RCCM/ID : {ent.rccmOrId || 'N/A'} · NIF : {ent.taxId || 'N/A'}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                                {ent.representativeName || 'Direction Générale'}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                                {ent.email && (
                                  <span className="inline-flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    <span>{ent.email}</span>
                                  </span>
                                )}
                                {ent.phone && (
                                  <span className="inline-flex items-center gap-1 font-mono">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{ent.phone}</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {ent.countryName || 'Côte d’Ivoire'} ({ent.currency || 'XOF'})
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {ent.linkedAccountsCount} compte(s) · Inactivité : {ent.inactiveDays}j
                              </div>
                            </td>

                            <td className="py-3 px-4 font-mono">
                              <div className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px] flex items-center gap-1.5">
                                <span>{ent.isu}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(ent.isu);
                                    onTriggerToast(`ISU ${ent.isu} (${ent.companyName}) copié.`);
                                  }}
                                  className="text-indigo-500 hover:text-indigo-800 dark:hover:text-indigo-200 cursor-pointer"
                                  title="Copier l'ISU de l'entreprise"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="mt-1.5 font-sans">
                                <EnterpriseGlowingStatusLights
                                  tenantId={ent.tenantId}
                                  companyName={ent.companyName}
                                  isu={ent.isu}
                                  isOnline={!isOfflineControlled}
                                  legalEntityType={
                                    ent.providerEntityType === 'personne_physique'
                                      ? 'physical'
                                      : 'moral'
                                  }
                                  email={ent.email}
                                  phone={ent.phone}
                                  allowInlineSubscription={true}
                                  onSubscriptionChanged={() =>
                                    setSubscriptionRefreshTick((t) => t + 1)
                                  }
                                  onTriggerToast={onTriggerToast}
                                />
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {isAdGenSys ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSuspendEnterpriseSubscription(ent)}
                                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                                        isSuspended
                                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                                      }`}
                                    >
                                      {isSuspended ? (
                                        <>
                                          <Unlock className="w-3 h-3" />
                                          <span>Réactiver Abonnement</span>
                                        </>
                                      ) : (
                                        <>
                                          <Lock className="w-3 h-3" />
                                          <span>Suspendre Abonnement</span>
                                        </>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAccountTenantFilter(ent.tenantId);
                                        setAccountRoleFilter('enterprise_staff');
                                        setActiveSection('moas_management');
                                        onTriggerToast(
                                          `Affichage du Super-Admin et des collaborateurs de "${ent.companyName}" pour modification de mot de passe ou de profil.`
                                        );
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                                      title="Pouvoir AdGenSys : Modifier les mots de passe du Super-Admin et de ses collaborateurs ou modifier un collaborateur"
                                    >
                                      <KeyRound className="w-3 h-3" />
                                      <span>MDP Super-Admin &amp; Collaborateurs</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openReplaceSuperAdminModal(ent)}
                                      className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer shadow-sm"
                                      title="Pouvoir AdGenSys : En cas d'indisponibilité constatée et prouvée, changer le Super-Admin de l'entreprise concernée"
                                    >
                                      <ShieldAlert className="w-3 h-3" />
                                      <span>Changer Super-Admin (Indisponibilité)</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInputRaisonSociale(ent.companyName);
                                        setInputIsu(ent.isu);
                                        setActiveSection('enterprise_gate');
                                        executeVerifyAndEnterEnterprise(ent.isu, ent.companyName);
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer"
                                    >
                                      Accéder (ISU + Raison Sociale)
                                    </button>
                                    {confirmDeleteTenantId === ent.tenantId ? (
                                      <div className="w-full max-w-md ml-auto mt-1 text-left bg-rose-950/95 text-white p-3 rounded-xl border border-rose-500 shadow-lg space-y-2">
                                        <div className="flex items-center justify-between gap-2 border-b border-rose-800 pb-1.5">
                                          <span className="text-[11px] font-extrabold text-rose-200 uppercase">
                                            Critères Préétablis de Suppression AdGenSys *
                                          </span>
                                          <span className="text-[10px] font-mono text-rose-300">
                                            {ent.isu}
                                          </span>
                                        </div>
                                        <div className="space-y-1">
                                          {ADGENSYS_PREESTABLISHED_DELETION_CRITERIA.map((crit) => {
                                            const defaultCrit = getAutoEvaluatedCriteriaForEnterprise(ent);
                                            const activeList =
                                              selectedDeletionCriteriaByTenant[ent.tenantId] ?? defaultCrit;
                                            const checked = activeList.includes(crit.id);
                                            return (
                                              <label
                                                key={crit.id}
                                                className="flex items-start gap-1.5 text-[10px] cursor-pointer text-rose-100 hover:text-white"
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={checked}
                                                  onChange={() =>
                                                    toggleDeletionCriterionForTenant(
                                                      ent.tenantId,
                                                      crit.id,
                                                      defaultCrit
                                                    )
                                                  }
                                                  className="mt-0.5 rounded border-rose-400 text-rose-600"
                                                />
                                                <span>
                                                  <strong className="font-mono text-amber-300">{crit.code} :</strong>{' '}
                                                  {crit.label}
                                                </span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5 pt-1">
                                          <button
                                            type="button"
                                            onClick={() => handleAdGenSysDeleteEnterprise(ent)}
                                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-extrabold cursor-pointer"
                                          >
                                            Confirmer Suppression Réglementaire
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setConfirmDeleteTenantId(null)}
                                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[10px] cursor-pointer"
                                          >
                                            Annuler
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteTenantId(ent.tenantId)}
                                        className="px-2.5 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                        title="Pouvoir exclusif AdGenSys : Supprimer cette entreprise selon les critères préétablis du système My Easy Project"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Supprimer (Critères AdGenSys)</span>
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEnterpriseSearch(ent.companyName);
                                      setActiveSection('saas_subscriptions');
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Gérer Abonnement SaaS
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 1 (AdGenSys): PORTAIL D'ACCÈS CONDITIONNÉ (ISU + RAISON SOCIALE)
        =================================================================== */}
        {isAdGenSys && activeSection === 'enterprise_gate' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Portail d&apos;Entrée Conditionné dans l&apos;Espace Privé d&apos;une Entreprise
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    Conformément à la charte de confidentialité, l&apos;accès de l&apos;<strong>AdGenSys</strong> à l&apos;application et à l&apos;espace privé d&apos;une entreprise abonnée (personne morale ou physique) est strictement conditionné par la saisie exacte de l&apos;<strong>Identifiant Système Unique (ISU)</strong> généré automatiquement à la création de l&apos;entreprise et de sa <strong>Raison Sociale</strong>.
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerifyAndEnterWorkspace} className="space-y-3.5 text-xs">
                {allEnterprisesUnfilteredList.length > 0 && (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Sélection rapide d&apos;une entreprise enregistrée (Pré-remplissage ISU + Raison Sociale)
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const found = allEnterprisesUnfilteredList.find(
                          (item) => item.tenantId === e.target.value
                        );
                        if (found) {
                          setInputIsu(found.isu);
                          setInputRaisonSociale(found.companyName);
                          setGateError('');
                        }
                      }}
                      className="w-full rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-600 focus:outline-none"
                    >
                      <option value="">
                        -- Choisir une entreprise pour renseigner son ISU et sa Raison Sociale ({allEnterprisesUnfilteredList.length}) --
                      </option>
                      {allEnterprisesUnfilteredList.map((ent) => (
                        <option key={ent.tenantId} value={ent.tenantId}>
                          {ent.companyName} — ISU : {ent.isu}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    1. Identifiant Système Unique (ISU) communiqué par l&apos;entreprise *
                  </label>
                  <input
                    type="text"
                    required
                    value={inputIsu}
                    onChange={(e) => {
                      setInputIsu(e.target.value.toUpperCase());
                      if (gateError) setGateError('');
                    }}
                    placeholder="Ex: ISU-CI-2026-482910"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 font-mono font-bold uppercase text-sm text-indigo-950 dark:text-indigo-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    2. Raison Sociale exacte de l&apos;entreprise (Morale ou Physique) *
                  </label>
                  <input
                    type="text"
                    required
                    value={inputRaisonSociale}
                    onChange={(e) => {
                      setInputRaisonSociale(e.target.value.toUpperCase());
                      if (gateError) setGateError('');
                    }}
                    placeholder="Ex: GROUPE PRESTATION & INGÉNIERIE SARL"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 font-bold uppercase text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                {gateError && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{gateError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifyingGate}
                  className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Unlock className="w-4 h-4" />
                  <span>
                    {isVerifyingGate
                      ? 'Vérification cryptographique ISU + Raison Sociale...'
                      : 'Vérifier ISU + Raison Sociale & Entrer dans l’Espace Privé'}
                  </span>
                </button>
              </form>
            </div>

            {/* Directory of All Enterprises Created in My Easy Project (Secret ISU strictly held by each enterprise) */}
            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Répertoire des Entreprises Créées dans My Easy Project ({allEnterprisesUnfilteredList.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Toutes les entreprises créées dans l&apos;application sont répertoriées ici pour besoins d&apos;exploitation. Renseignez ou ciblez l&apos;ISU et la Raison Sociale pour accéder immédiatement à l&apos;entreprise.
                  </p>
                </div>
              </div>

              {allEnterprisesUnfilteredList.length === 0 ? (
                <div className="p-6 rounded-lg border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs text-slate-500">
                  Aucune entreprise prestataire enregistrée pour le moment.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {allEnterprisesUnfilteredList.map((ent) => {
                    const isCurrentlyInspected =
                      inspectedEnterprise?.tenantId === ent.tenantId;
                    const isSuspended = ent.subscriptionStatus === 'suspended_by_adgensys';
                    return (
                      <div
                        key={ent.tenantId}
                        className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCurrentlyInspected
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                            : isSuspended
                            ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 dark:text-white uppercase">
                              {ent.companyName}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                              {ent.providerEntityType === 'personne_physique'
                                ? 'Personne Physique'
                                : 'Personne Morale'}
                            </span>
                            {isSuspended ? (
                              <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase">
                                Abonnement Suspendu
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase">
                                {ent.subscriptionStatus === 'subscribed_paid'
                                  ? `Abonné (${ent.subscribedPlanName || 'Actif'})`
                                  : 'Essai Actif'}
                              </span>
                            )}
                            {isCurrentlyInspected && (
                              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold uppercase">
                                Espace Ouvert
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono flex-wrap">
                            <span>
                              ISU :{' '}
                              <strong className="text-indigo-700 dark:text-indigo-300">
                                {ent.isu}
                              </strong>
                            </span>
                            <span>·</span>
                            <span>Inactivité : {ent.inactiveDays}j</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleSuspendEnterpriseSubscription(ent)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                              isSuspended
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-rose-600 hover:bg-rose-500 text-white'
                            }`}
                            title={
                              isSuspended
                                ? "Réactiver l'abonnement de cette entreprise"
                                : "Suspendre l'abonnement de cette entreprise (Pouvoir exclusif AdGenSys)"
                            }
                          >
                            {isSuspended ? (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>Réactiver Abonnement</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>Suspendre Abonnement</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInputRaisonSociale(ent.companyName);
                              setInputIsu(ent.isu);
                              setGateError('');
                              onTriggerToast(
                                `Raison Sociale "${ent.companyName}" et ISU "${ent.isu}" renseignés.`
                              );
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                          >
                            Cibler ISU + Raison Sociale
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInputRaisonSociale(ent.companyName);
                              setInputIsu(ent.isu);
                              executeVerifyAndEnterEnterprise(ent.isu, ent.companyName);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer whitespace-nowrap flex items-center gap-1"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Accéder à l&apos;Entreprise</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 2 (AdGenSys): CONTRÔLE DES ENTREPRISES & ÉPURATION BASE DE DONNÉES
        =================================================================== */}
        {isAdGenSys && activeSection === 'database_purge' && (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Épuration de la Base de Données — Suppression des Entreprises Inactives
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    L&apos;<strong>AdGenSys</strong> dispose du pouvoir exclusif d&apos;épurer la base de données de l&apos;application en supprimant les entreprises inactives à partir d&apos;une durée définie.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    Inactives depuis &ge;
                  </span>
                  <select
                    value={inactivityThresholdDays}
                    onChange={(e) => setInactivityThresholdDays(Number(e.target.value))}
                    className="font-mono font-bold text-rose-700 dark:text-rose-400 bg-transparent focus:outline-none"
                  >
                    <option value={0}>0 jour (Toutes / Test immédiat)</option>
                    <option value={7}>7 jours</option>
                    <option value={15}>15 jours</option>
                    <option value={30}>30 jours (1 mois)</option>
                    <option value={60}>60 jours (2 mois)</option>
                    <option value={90}>90 jours (3 mois)</option>
                    <option value={180}>180 jours (6 mois)</option>
                  </select>
                </div>

                <button
                  type="button"
                  disabled={
                    selectedTenantsToPurge.length === 0 &&
                    inactiveEnterprisesMatchingThreshold.length === 0
                  }
                  onClick={() => {
                    const targets =
                      selectedTenantsToPurge.length > 0
                        ? selectedTenantsToPurge
                        : inactiveEnterprisesMatchingThreshold.map((e) => e.tenantId);
                    if (targets.length === 0) return;
                    onPurgeInactiveEnterprises(targets);
                    setSelectedTenantsToPurge([]);
                  }}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    Épurer la base de données (
                    {selectedTenantsToPurge.length > 0
                      ? `${selectedTenantsToPurge.length} sélectionnée(s)`
                      : `${inactiveEnterprisesMatchingThreshold.length} inactive(s) ≥ ${inactivityThresholdDays}j`}
                    )
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={enterpriseSearch}
                  onChange={(e) => setEnterpriseSearch(e.target.value)}
                  placeholder="Rechercher par Raison Sociale, ISU ou Pays..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-8 pr-3 py-2 text-xs"
                />
              </div>
              <div className="text-slate-500 font-mono">
                {inactiveEnterprisesMatchingThreshold.length} entreprise(s) éligible(s) à l&apos;épuration (&ge; {inactivityThresholdDays}j d&apos;inactivité)
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-bold text-slate-500">
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            enterprisesList.length > 0 &&
                            selectedTenantsToPurge.length === enterprisesList.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTenantsToPurge(enterprisesList.map((x) => x.tenantId));
                            } else {
                              setSelectedTenantsToPurge([]);
                            }
                          }}
                          className="rounded border-slate-300"
                        />
                      </th>
                      <th className="py-3 px-4">Raison Sociale &amp; Forme</th>
                      <th className="py-3 px-4">Identifiant Système Unique (ISU)</th>
                      <th className="py-3 px-4">Pays &amp; Comptes</th>
                      <th className="py-3 px-4">Dernière Activité / Inactivité</th>
                      <th className="py-3 px-4 text-right">Actions AdGenSys</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {enterprisesList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          Aucune entreprise dans la base de données.
                        </td>
                      </tr>
                    ) : (
                      enterprisesList.map((ent) => {
                        const isInactive = ent.inactiveDays >= inactivityThresholdDays;
                        const isChecked = selectedTenantsToPurge.includes(ent.tenantId);
                        return (
                          <tr
                            key={ent.tenantId}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                          >
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTenantsToPurge((prev) => [...prev, ent.tenantId]);
                                  } else {
                                    setSelectedTenantsToPurge((prev) =>
                                      prev.filter((id) => id !== ent.tenantId)
                                    );
                                  }
                                }}
                                className="rounded border-slate-300"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 dark:text-white uppercase">
                                {ent.companyName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {ent.providerEntityType === 'personne_physique'
                                  ? 'Personne Physique'
                                  : 'Personne Morale'}{' '}
                                · {ent.legalForm}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-indigo-700 dark:text-indigo-300">
                              <div className="flex flex-col gap-0.5">
                                <span>{ent.isu}</span>
                                <span
                                  className={`inline-flex w-fit px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    ent.subscriptionStatus === 'suspended_by_adgensys'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                                  }`}
                                >
                                  {ent.subscriptionStatus === 'suspended_by_adgensys'
                                    ? 'Abonnement Suspendu'
                                    : ent.subscriptionStatus === 'subscribed_paid'
                                    ? `Abonné (${ent.subscribedPlanName || 'Actif'})`
                                    : 'Essai 28j Actif'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>{ent.countryName}</div>
                              <div className="text-[11px] text-slate-500">
                                {ent.linkedAccountsCount} compte(s) utilisateur
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                                    isInactive
                                      ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                                      : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                                  }`}
                                >
                                  {ent.inactiveDays} jour(s) d&apos;inactivité
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {String(ent.lastActivityAt).slice(0, 10)}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSuspendEnterpriseSubscription(ent)}
                                  className={`px-2.5 py-1 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                                    ent.subscriptionStatus === 'suspended_by_adgensys'
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                                  }`}
                                >
                                  {ent.subscriptionStatus === 'suspended_by_adgensys' ? (
                                    <>
                                      <Unlock className="w-3 h-3" />
                                      <span>Réactiver Abonnement</span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-3 h-3" />
                                      <span>Suspendre Abonnement</span>
                                    </>
                                  )}
                                </button>
                                {onSimulateEnterpriseInactivity && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onSimulateEnterpriseInactivity(ent.tenantId, 95)
                                    }
                                    className="px-2 py-1 rounded border border-amber-300 dark:border-amber-700 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-50 cursor-pointer"
                                    title="Simuler 95 jours d'inactivité pour tester l'épuration"
                                  >
                                    Simuler Inactivité (95j)
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInputRaisonSociale(ent.companyName);
                                    setInputIsu('');
                                    setActiveSection('enterprise_gate');
                                    onTriggerToast(
                                      `Raison Sociale "${ent.companyName}" pré-remplie. Veuillez renseigner l'ISU secret fourni par l'entreprise.`
                                    );
                                  }}
                                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold cursor-pointer"
                                >
                                  Inspecter (Saisir ISU)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onPurgeInactiveEnterprises([ent.tenantId])}
                                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Épurer</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 3 (AdGenSys): EXCLUSIVITÉ CRÉATION MOAS & CONTRÔLE TOUS COMPTES
        =================================================================== */}
        {isAdGenSys && activeSection === 'moas_management' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
            {/* Exclusive MOAS Creation Form */}
            <div className="lg:col-span-5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 p-5 space-y-4">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Exclusivité AdGenSys : Créer un Compte MOAS
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    L&apos;<strong>AdGenSys</strong> a l&apos;exclusivité absolue sur la création des comptes <strong>Managers d&apos;Opérations et d&apos;Assistances Serveur (MOAS)</strong>. Le MOAS n&apos;a aucun droit d&apos;accès à l&apos;application ERP.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateMoasSubmit} className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nom complet du Manager MOAS *
                  </label>
                  <input
                    type="text"
                    required
                    value={moasFullName}
                    onChange={(e) => setMoasFullName(e.target.value.toUpperCase())}
                    placeholder="EX: KOFFI ARMAND — MOAS PRINCIPAL"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-bold uppercase"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Pays
                    </label>
                    <select
                      value={moasCountryCode}
                      onChange={(e) => setMoasCountryCode(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2"
                    >
                      {WORLD_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.dialCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-7">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={moasPhone}
                      onChange={(e) => setMoasPhone(e.target.value)}
                      placeholder="07 00 00 00 00"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email professionnel Serveur SaaS *
                  </label>
                  <input
                    type="email"
                    required
                    value={moasEmail}
                    onChange={(e) => setMoasEmail(e.target.value)}
                    placeholder="moas.operations@myeasyproject-saas.com"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Département / Unité Serveur
                  </label>
                  <input
                    type="text"
                    value={moasDepartment}
                    onChange={(e) => setMoasDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Créer le Compte MOAS (Exclusivité AdGenSys)</span>
                </button>
              </form>

              {lastCreatedMoas && (
                <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 space-y-1.5">
                  <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <span>Compte MOAS créé : {lastCreatedMoas.fullName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(lastCreatedMoas.defaultPassword);
                        onTriggerToast('Mot de passe MOAS copié.');
                      }}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copier MDP</span>
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-slate-700 dark:text-slate-200">
                    Login : <strong>{lastCreatedMoas.email}</strong> · MDP temporaire :{' '}
                    <strong className="text-indigo-700 dark:text-indigo-300">
                      {lastCreatedMoas.defaultPassword}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Universal Account Control Table (All Account Types) */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Contrôle Global : Super-Admins, Collaborateurs &amp; Comptes ({filteredAllSystemAccounts.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    En cas de nécessité, l&apos;<strong>AdGenSys</strong> a le pouvoir de modifier les mots de passe du <strong>Super-Admin</strong> et de ses <strong>collaborateurs</strong>, ainsi que de modifier les profils collaborateurs.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={accountTenantFilter}
                    onChange={(e) => setAccountTenantFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold max-w-[210px]"
                  >
                    <option value="all">Toutes les entreprises</option>
                    {allEnterprisesUnfilteredList.map((ent) => (
                      <option key={ent.tenantId} value={ent.tenantId}>
                        {ent.companyName}
                      </option>
                    ))}
                  </select>
                  <select
                    value={accountRoleFilter}
                    onChange={(e) => setAccountRoleFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold"
                  >
                    <option value="all">Tous les rôles ({allAccounts.length})</option>
                    <option value="enterprise_staff">Super-Admins &amp; Collaborateurs Entreprise</option>
                    <option value="super_admin">Super-Admin Entreprise</option>
                    <option value="manager">Directeur / Chef de Projet</option>
                    <option value="accountant">Comptable / DAF</option>
                    <option value="collaborator">Collaborateur</option>
                    <option value="viewer">Auditeur</option>
                    <option value="adgensys">AdGenSys</option>
                    <option value="moas">MOAS ({moasAccountsList.length})</option>
                    <option value="teleconseiller">Téléconseiller</option>
                    <option value="consultant_operation">Consultant Opération</option>
                  </select>
                </div>
              </div>

              <input
                type="text"
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                placeholder="Rechercher un Super-Admin ou collaborateur par nom, entreprise, email ou fonction..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              />

              <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                {filteredAllSystemAccounts.map((acc) => {
                  const isBlocked = acc.accountStatus === 'blocked';
                  const isSelf = acc.id === activeAccount.id;
                  const linkedEnt = allEnterprisesUnfilteredList.find(
                    (e) => e.tenantId === acc.tenantId || e.tenantId === acc.primaryTenantId
                  );
                  const isPwdVisible = Boolean(revealedAccountPasswordMap[acc.id]);
                  const activePwd = acc.currentPassword || acc.defaultPassword || '—';

                  return (
                    <div
                      key={acc.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white uppercase">
                            {acc.fullName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold uppercase ${
                              acc.role === 'super_admin'
                                ? 'bg-amber-500/15 border-amber-400/50 text-amber-700 dark:text-amber-300'
                                : 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                            }`}
                          >
                            {acc.role === 'super_admin' ? 'SUPER-ADMIN' : acc.role}
                          </span>
                          {linkedEnt && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                              {linkedEnt.companyName}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isBlocked
                                ? 'bg-rose-600 text-white'
                                : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {isBlocked ? 'Bloqué' : 'Actif'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                          {acc.functionTitle || 'Collaborateur'} · {acc.department || 'Opérations'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 flex-wrap">
                          <span>{acc.email}</span>
                          <span>·</span>
                          <span>{acc.phoneNumber}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                            <span>MDP : {isPwdVisible ? activePwd : '••••••••'}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedAccountPasswordMap((prev) => ({
                                  ...prev,
                                  [acc.id]: !prev[acc.id],
                                }))
                              }
                              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                              title={isPwdVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                            >
                              {isPwdVisible ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </button>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() => openAdGenSysPasswordModal(acc)}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-xs"
                          title="Pouvoir AdGenSys : Modifier le mot de passe de ce Super-Admin ou collaborateur"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Modifier MDP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditCollaboratorModal(acc)}
                          className="px-2.5 py-1 rounded border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-600 hover:text-white text-blue-700 dark:text-blue-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          title="Modifier les informations et droits de ce collaborateur / utilisateur"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Modifier</span>
                        </button>
                        {acc.role === 'super_admin' && (
                          <button
                            type="button"
                            onClick={() =>
                              openReplaceSuperAdminModal({
                                tenantId: acc.tenantId || 'default',
                                companyName: acc.companyName || 'ENTREPRISE',
                                isu: (acc as any).isu || 'ISU-ENTREPRISE',
                                currentSuperAdmin: acc,
                              })
                            }
                            className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Pouvoir AdGenSys : Changer ce Super-Admin en cas d'indisponibilité constatée et prouvée"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Changer Super-Admin (Indisponibilité)</span>
                          </button>
                        )}
                        {!isSelf && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateAccountStatusOrPermissions(acc.id, {
                                  accountStatus: isBlocked ? 'active' : 'blocked',
                                  isActivated: true,
                                })
                              }
                              className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                                isBlocked
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                              }`}
                            >
                              {isBlocked ? 'Activer' : 'Bloquer'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteAccount(acc.id)}
                              className="p-1.5 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                              title="Supprimer ce compte"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 4 (MOAS & AdGenSys): GESTION EXCLUSIVE TÉLÉCONSEILLERS & CONSULTANTS OPÉRATION
        =================================================================== */}
        {(isMoas || isAdGenSys) && activeSection === 'operator_management' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
            {/* Creation Form for Téléconseiller / Consultant Opération */}
            <div className="lg:col-span-5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20 p-5 space-y-4">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Exclusivité MOAS : Créer un Téléconseiller ou Consultant Opération
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Définissez précisément leurs droits d&apos;accès sur le Serveur SaaS. Aucun de ces comptes n&apos;a accès à l&apos;application ERP des entreprises.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateOperatorSubmit} className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Type de compte opérateur Serveur SaaS *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOpRoleType('teleconseiller');
                        setOpSelectedPermissions(
                          SAAS_OPERATOR_PERMISSIONS.filter((p) => p.defaultForTeleconseiller).map(
                            (p) => p.id
                          )
                        );
                      }}
                      className={`py-2 px-3 rounded-lg border font-bold text-xs cursor-pointer ${
                        opRoleType === 'teleconseiller'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Téléconseiller
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpRoleType('consultant_operation');
                        setOpSelectedPermissions(
                          SAAS_OPERATOR_PERMISSIONS.filter(
                            (p) => p.defaultForConsultantOperation
                          ).map((p) => p.id)
                        );
                      }}
                      className={`py-2 px-3 rounded-lg border font-bold text-xs cursor-pointer ${
                        opRoleType === 'consultant_operation'
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Consultant Opération
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nom complet de l&apos;opérateur *
                  </label>
                  <input
                    type="text"
                    required
                    value={opFullName}
                    onChange={(e) => setOpFullName(e.target.value.toUpperCase())}
                    placeholder="EX: AÏCHA DIALLO"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-bold uppercase"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Pays
                    </label>
                    <select
                      value={opCountryCode}
                      onChange={(e) => setOpCountryCode(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2"
                    >
                      {WORLD_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.dialCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-7">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={opPhone}
                      onChange={(e) => setOpPhone(e.target.value)}
                      placeholder="07 00 00 00 00"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email professionnel *
                  </label>
                  <input
                    type="email"
                    required
                    value={opEmail}
                    onChange={(e) => setOpEmail(e.target.value)}
                    placeholder="operateur@myeasyproject-saas.com"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                  />
                </div>

                {/* Granular Access Rights Selection */}
                <div className="space-y-1.5 pt-1">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    Définition des droits d&apos;accès Serveur SaaS ({opSelectedPermissions.length}) :
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    {SAAS_OPERATOR_PERMISSIONS.map((perm) => {
                      const checked = opSelectedPermissions.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className="flex items-start gap-2 p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setOpSelectedPermissions((prev) => [...prev, perm.id]);
                              } else {
                                setOpSelectedPermissions((prev) =>
                                  prev.filter((id) => id !== perm.id)
                                );
                              }
                            }}
                            className="mt-0.5 rounded border-slate-300 text-emerald-600"
                          />
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {perm.label}
                            </div>
                            <div className="text-[10px] text-slate-500">{perm.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>
                    Créer le compte{' '}
                    {opRoleType === 'teleconseiller'
                      ? 'Téléconseiller'
                      : 'Consultant Opération'}
                  </span>
                </button>
              </form>

              {lastCreatedOperator && (
                <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 space-y-1.5">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <span>
                      {lastCreatedOperator.functionTitle} : {lastCreatedOperator.fullName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(lastCreatedOperator.defaultPassword);
                        onTriggerToast('Mot de passe opérateur copié.');
                      }}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copier MDP</span>
                    </button>
                  </div>
                  <div className="font-mono text-[11px]">
                    Email : <strong>{lastCreatedOperator.email}</strong> · MDP :{' '}
                    <strong className="text-emerald-600">
                      {lastCreatedOperator.defaultPassword}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Management Table of Téléconseiller & Consultant Opération Accounts (Activate, Block, Edit Permissions, Delete) */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Gestion des Comptes Téléconseiller &amp; Consultant Opération ({operatorAccountsList.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Le <strong>MOAS</strong> a le pouvoir exclusif d&apos;activer, de bloquer, de modifier les droits d&apos;accès et de supprimer ces comptes.
                </p>
              </div>

              {operatorAccountsList.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-500">
                  Aucun compte Téléconseiller ou Consultant Opération créé pour le moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {operatorAccountsList.map((opAcc) => {
                    const isBlocked = opAcc.accountStatus === 'blocked';
                    const isEditingPerms = editingPermissionsAccountId === opAcc.id;
                    const currentPerms = opAcc.saasPermissions || [];

                    return (
                      <div
                        key={opAcc.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900 dark:text-white uppercase">
                                {opAcc.fullName}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                                  opAcc.role === 'teleconseiller'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300'
                                }`}
                              >
                                {opAcc.role === 'teleconseiller'
                                  ? 'Téléconseiller'
                                  : 'Consultant Opération'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isBlocked
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-emerald-600 text-white'
                                }`}
                              >
                                {isBlocked ? 'Bloqué / Suspendu' : 'Actif'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {opAcc.email} · {opAcc.phoneNumber} · MDP init : {opAcc.defaultPassword}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingPermissionsAccountId(
                                  isEditingPerms ? null : opAcc.id
                                )
                              }
                              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              {isEditingPerms
                                ? 'Fermer Droits'
                                : `Droits (${currentPerms.length})`}
                            </button>

                            {isBlocked ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateAccountStatusOrPermissions(opAcc.id, {
                                    accountStatus: 'active',
                                    isActivated: true,
                                  })
                                }
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Activer</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateAccountStatusOrPermissions(opAcc.id, {
                                    accountStatus: 'blocked',
                                  })
                                }
                                className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Bloquer</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onDeleteAccount(opAcc.id)}
                              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Supprimer</span>
                            </button>
                          </div>
                        </div>

                        {/* Interactive Permissions Editor for this Operator */}
                        {isEditingPerms && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Modifier les droits d&apos;accès Serveur SaaS de {opAcc.fullName} :
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {SAAS_OPERATOR_PERMISSIONS.map((perm) => {
                                const hasPerm = currentPerms.includes(perm.id);
                                return (
                                  <label
                                    key={perm.id}
                                    className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={hasPerm}
                                      onChange={(e) => {
                                        const nextPerms = e.target.checked
                                          ? [...currentPerms, perm.id]
                                          : currentPerms.filter((id) => id !== perm.id);
                                        onUpdateAccountStatusOrPermissions(opAcc.id, {
                                          saasPermissions: nextPerms,
                                        });
                                      }}
                                      className="mt-0.5 rounded border-slate-300 text-indigo-600"
                                    />
                                    <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                      {perm.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 5 (Serveur SaaS Exclusif): SOUSCRIPTION & ACTIVATION DES ABONNEMENTS ENTREPRISES
        =================================================================== */}
        {activeSection === 'saas_subscriptions' && (
          <div className="space-y-5 text-xs" data-tick={subscriptionRefreshTick}>
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/60 dark:bg-emerald-950/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Exclusivité Serveur SaaS — Souscription &amp; Activation des Abonnements Entreprises
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Conformément aux règles de sécurité : <strong>le Super-Admin et l&apos;ensemble des comptes utilisateurs qu&apos;il a créés n&apos;ont aucun accès à la souscription d&apos;un abonnement</strong>. Seuls les opérateurs ayant accès au Serveur SaaS et à ses services (AdGenSys, MOAS, Téléconseiller, Consultant Opération) peuvent souscrire ou modifier l&apos;abonnement d&apos;une entreprise abonnée.
                  </p>
                </div>
              </div>
              <div className="relative w-full lg:w-72 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={enterpriseSearch}
                  onChange={(e) => setEnterpriseSearch(e.target.value)}
                  placeholder="Filtrer par Raison Sociale ou ISU..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
            </div>

            {enterprisesList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Aucune entreprise enregistrée pour le moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {enterprisesList.map((ent) => {
                  const legalType =
                    ent.legalEntityType === 'physical' ||
                    ent.providerEntityType === 'personne_physique'
                      ? 'physical'
                      : 'moral';
                  const trialRec: ProviderTrialRecord = getOrInitializeProviderTrialRecord(
                    ent.tenantId,
                    ent.companyName || 'Entreprise',
                    legalType
                  );
                  const cycle = selectedBillingCycles[ent.tenantId] || 'monthly';

                  // Mode 1 : Souscription avec génération automatique d'un Token à usage unique côté Serveur SaaS et transfert à l'entreprise
                  const handleSubscribeAndGenerateTokenForTenant = async (
                    plan: SubscriptionPlanOption,
                    channel: 'in_app_realtime' | 'whatsapp' | 'email' | 'sms' = 'in_app_realtime'
                  ) => {
                    const amount =
                      cycle === 'annual' ? plan.annualPriceFCFA : plan.monthlyPriceFCFA;
                    let generatedToken = generateSaaSSubscriptionToken(ent.tenantId, plan.id);

                    try {
                      const res = await fetch(
                        '/api/saas/subscriptions/subscribe-generate-token',
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            tenantId: ent.tenantId,
                            companyName: ent.companyName,
                            isu: ent.isu,
                            planId: plan.id,
                            planName: plan.name,
                            billingCycle: cycle,
                            amountFCFA: amount,
                            customToken: generatedToken,
                            transferChannel: channel,
                          }),
                        }
                      );
                      if (res.ok) {
                        const data = await res.json();
                        if (data?.activationToken) {
                          generatedToken = data.activationToken;
                        }
                      }
                    } catch {
                      // fallback to deterministic token
                    }

                    // Enregistrer le Token à usage unique strictement lié à cette entreprise
                    registerSingleUseEnterpriseToken({
                      token: generatedToken,
                      targetTenantId: ent.tenantId,
                      targetCompanyName: ent.companyName,
                      targetIsu: ent.isu,
                      planId: plan.id,
                      planName: plan.name,
                      billingCycle: cycle,
                      amountFCFA: amount,
                      transferredToClient: true,
                      transferChannel: channel,
                    });
                    recordTokenTransferToClient(generatedToken, channel);

                    const updated: ProviderTrialRecord = {
                      ...trialRec,
                      pendingActivationToken: generatedToken,
                      pendingPlanId: plan.id,
                      pendingPlanName: plan.name,
                      pendingBillingCycle: cycle,
                      pendingAmountFCFA: amount,
                      tokenGeneratedAt: new Date().toISOString(),
                      tokenTransmittedToEnterprise: true,
                    };
                    try {
                      localStorage.setItem(
                        `mep_provider_trial_${ent.tenantId || 'default'}`,
                        JSON.stringify(updated)
                      );
                      window.dispatchEvent(new Event('mep-subscription-updated'));
                    } catch {
                      // ignore
                    }
                    broadcastSubscriptionSyncEvent({
                      type: 'TOKEN_TRANSFERRED',
                      tenantId: ent.tenantId,
                      companyName: ent.companyName,
                      token: generatedToken,
                      status: trialRec.subscriptionStatus,
                    });
                    setSubscriptionRefreshTick((t) => t + 1);
                    onTriggerToast(
                      `Token à usage unique "${generatedToken}" généré côté Serveur SaaS et transféré exclusivement au client "${ent.companyName}".`
                    );
                  };

                  // Mode 2 : Activation directe de l'abonnement à partir du Serveur SaaS (immédiatement prise en compte côté client)
                  const handleActivateSubscriptionForTenant = async (
                    plan: SubscriptionPlanOption
                  ) => {
                    const amount =
                      cycle === 'annual' ? plan.annualPriceFCFA : plan.monthlyPriceFCFA;
                    const tokenUsed =
                      trialRec.pendingActivationToken ||
                      generateSaaSSubscriptionToken(ent.tenantId, plan.id);

                    try {
                      await fetch('/api/saas/subscriptions/activate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          tenantId: ent.tenantId,
                          companyName: ent.companyName,
                          planId: plan.id,
                          planName: plan.name,
                          billingCycle: cycle,
                          amountFCFA: amount,
                          activationMethod: 'saas_server_direct',
                          token: tokenUsed,
                        }),
                      });
                    } catch {
                      // ignore
                    }

                    const updated: ProviderTrialRecord = {
                      ...trialRec,
                      simulatedDayOffset: null,
                      subscriptionStatus: 'subscribed_paid',
                      subscribedPlanId: plan.id,
                      subscribedPlanName: plan.name,
                      subscribedBillingCycle: cycle,
                      subscribedAmountFCFA: amount,
                      subscribedAt: new Date().toISOString(),
                      pendingActivationToken: undefined,
                      tokenTransmittedToEnterprise: false,
                      activatedVia: 'saas_server_direct',
                      activatedTokenUsed: tokenUsed,
                    };
                    try {
                      localStorage.setItem(
                        `mep_provider_trial_${ent.tenantId || 'default'}`,
                        JSON.stringify(updated)
                      );
                      window.dispatchEvent(new Event('mep-subscription-updated'));
                    } catch {
                      // ignore
                    }
                    broadcastSubscriptionSyncEvent({
                      type: 'SAAS_DIRECT_ACTIVATION',
                      tenantId: ent.tenantId,
                      companyName: ent.companyName,
                      token: tokenUsed,
                      status: 'subscribed_paid',
                    });
                    setSubscriptionRefreshTick((t) => t + 1);
                    onTriggerToast(
                      `Abonnement "${plan.name}" (${cycle === 'annual' ? 'Annuel' : 'Mensuel'}) activé côté Serveur SaaS et immédiatement pris en compte côté client pour ${ent.companyName}.`
                    );
                  };

                  const didRec = (ent as any).digitalIdentity;
                  const isOfflineControlled =
                    didRec?.networkPresenceStatus === 'offline_controlled';

                  return (
                    <div
                      key={ent.tenantId}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white uppercase">
                              {ent.companyName}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 font-mono text-[11px] font-bold">
                              ISU : {ent.isu}
                            </span>
                            <EnterpriseGlowingStatusLights
                              tenantId={ent.tenantId}
                              companyName={ent.companyName}
                              isu={ent.isu}
                              isOnline={!isOfflineControlled}
                              legalEntityType={legalType}
                              email={ent.email}
                              phone={ent.phone}
                              allowInlineSubscription={false}
                              onSubscriptionChanged={() =>
                                setSubscriptionRefreshTick((t) => t + 1)
                              }
                              onTriggerToast={onTriggerToast}
                            />
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {legalType === 'physical' ? 'Personne Physique' : 'Personne Morale'} •{' '}
                            {ent.countryName || 'Côte d’Ivoire'} • {ent.linkedAccountsCount} compte(s)
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {isAdGenSys && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleSuspendEnterpriseSubscription(ent)}
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                                  trialRec.subscriptionStatus === 'suspended_by_adgensys'
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                                }`}
                              >
                                {trialRec.subscriptionStatus === 'suspended_by_adgensys' ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>Réactiver l&apos;abonnement</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Suspendre l&apos;abonnement (AdGenSys)</span>
                                  </>
                                )}
                              </button>
                              {confirmDeleteTenantId === ent.tenantId ? (
                                <div className="inline-flex items-center gap-1 bg-rose-950 text-white px-2.5 py-1 rounded-lg border border-rose-500">
                                  <span className="text-[10px] font-bold">Supprimer ?</span>
                                  <button
                                    type="button"
                                    onClick={() => handleAdGenSysDeleteEnterprise(ent)}
                                    className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-extrabold cursor-pointer"
                                  >
                                    Confirmer
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteTenantId(null)}
                                    className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-white text-[10px] cursor-pointer"
                                  >
                                    Annuler
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteTenantId(ent.tenantId)}
                                  className="px-2.5 py-1 rounded-lg bg-red-700 hover:bg-red-600 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                  title="Supprimer définitivement cette entreprise du système My Easy Project (AdGenSys)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Supprimer l&apos;entreprise</span>
                                </button>
                              )}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedBillingCycles((prev) => ({
                                ...prev,
                                [ent.tenantId]: 'monthly',
                              }))
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                              cycle === 'monthly'
                                ? 'bg-slate-900 text-white dark:bg-indigo-600'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            Mensuel
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedBillingCycles((prev) => ({
                                ...prev,
                                [ent.tenantId]: 'annual',
                              }))
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                              cycle === 'annual'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            Annuel (-17%)
                          </button>
                        </div>
                      </div>

                      {/* Bandeau Token d'activation à usage unique généré côté Serveur SaaS et transfert multi-canal au client */}
                      {trialRec.pendingActivationToken && (
                        <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/90 dark:bg-amber-950/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-extrabold uppercase">
                                Token à Usage Unique • Exclusif à {ent.companyName}
                              </span>
                              <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-amber-200">
                                {trialRec.pendingActivationToken}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(trialRec.pendingActivationToken || '');
                                  recordTokenTransferToClient(
                                    trialRec.pendingActivationToken || '',
                                    'in_app_realtime'
                                  );
                                  onTriggerToast(
                                    `Token à usage unique "${trialRec.pendingActivationToken}" copié dans le presse-papiers.`
                                  );
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-[10px] font-bold text-amber-800 dark:text-amber-300 cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copier</span>
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300">
                              Offre en attente : <strong>{trialRec.pendingPlanName}</strong>. Ce Token est strictement à <strong>usage unique</strong> et ne peut être activé <strong>que par l&apos;entreprise {ent.companyName}</strong> (ISU : {ent.isu}).
                            </p>
                            {/* Boutons de transfert du Token au client */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                Transférer le Token au client :
                              </span>
                              {(
                                [
                                  { id: 'in_app_realtime', label: 'Notification In-App Temps Réel' },
                                  { id: 'whatsapp', label: 'WhatsApp Client' },
                                  { id: 'email', label: 'E-mail Officiel' },
                                  { id: 'sms', label: 'SMS' },
                                ] as const
                              ).map((ch) => (
                                <button
                                  key={ch.id}
                                  type="button"
                                  onClick={() => {
                                    const tok = trialRec.pendingActivationToken || '';
                                    recordTokenTransferToClient(tok, ch.id);
                                    broadcastSubscriptionSyncEvent({
                                      type: 'TOKEN_TRANSFERRED',
                                      tenantId: ent.tenantId,
                                      companyName: ent.companyName,
                                      token: tok,
                                      status: trialRec.subscriptionStatus,
                                    });
                                    navigator.clipboard?.writeText(
                                      `[MY EASY PROJECT - SERVEUR SAAS]\nEntreprise : ${ent.companyName} (ISU : ${ent.isu})\nOffre : ${trialRec.pendingPlanName}\nToken d'Activation à Usage Unique : ${tok}`
                                    );
                                    onTriggerToast(
                                      `Token à usage unique "${tok}" transféré au client "${ent.companyName}" via ${ch.label} (et copié).`
                                    );
                                  }}
                                  className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer transition"
                                >
                                  {ch.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const pendingPlan =
                                SAAS_SUBSCRIPTION_PLANS.find((p) => p.id === trialRec.pendingPlanId) ||
                                SAAS_SUBSCRIPTION_PLANS[1];
                              handleActivateSubscriptionForTenant(pendingPlan);
                            }}
                            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Activer l&apos;Abonnement depuis le Serveur SaaS (Sync Client Immédiate)</span>
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {SAAS_SUBSCRIPTION_PLANS.map((plan) => {
                          const price =
                            cycle === 'annual' ? plan.annualPriceFCFA : plan.monthlyPriceFCFA;
                          const isCurrentPlan =
                            trialRec.subscriptionStatus === 'subscribed_paid' &&
                            trialRec.subscribedPlanId === plan.id &&
                            trialRec.subscribedBillingCycle === cycle;
                          return (
                            <div
                              key={plan.id}
                              className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                                isCurrentPlan
                                  ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                                    {plan.name}
                                  </span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold">
                                    {plan.badge}
                                  </span>
                                </div>
                                <div className="text-sm font-extrabold font-mono text-slate-900 dark:text-white mt-1.5">
                                  {price.toLocaleString('fr-FR')} FCFA /{' '}
                                  {cycle === 'annual' ? 'an' : 'mois'}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {plan.maxProjects} • {plan.maxUsers}
                                </div>
                              </div>

                              <div className="mt-3 space-y-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSubscribeAndGenerateTokenForTenant(plan)}
                                  className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] cursor-pointer transition flex items-center justify-center gap-1.5"
                                  title="Génère automatiquement un Token côté Serveur SaaS et le transmet à l'entreprise qui devra le renseigner pour activer son abonnement"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                  <span>Souscrire &amp; Transmettre Token SaaS</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleActivateSubscriptionForTenant(plan)}
                                  className={`w-full py-1.5 px-3 rounded-lg font-bold text-[11px] cursor-pointer transition flex items-center justify-center gap-1.5 ${
                                    isCurrentPlan
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40'
                                  }`}
                                  title="Activer directement l'abonnement de l'entreprise à partir du Serveur SaaS"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>
                                    {isCurrentPlan
                                      ? 'Abonnement Actif (Renouveler)'
                                      : 'Activer Directement côté Serveur SaaS'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            SECTION SERVEUR WEB & SERVICES INTELLIGENTS EN SYNERGIE AVEC LE SERVEUR SAAS
        =================================================================== */}
        {activeSection === 'web_server_synergy' && (
          <WebServerSynergySuite
            activeAccount={activeAccount}
            onTriggerToast={onTriggerToast}
            onOpenSaaSServerConsole={() => setActiveSection('enterprise_directory')}
            onEnterEnterpriseWorkspaceFromWebServer={(cName, cIsu) => {
              setInputRaisonSociale(cName);
              setInputIsu(cIsu);
              setActiveSection('enterprise_gate');
              onTriggerToast(
                `Raison sociale (${cName}) et ISU (${cIsu}) pré-chargés dans le Portail d'Entrée AdGenSys.`
              );
            }}
          />
        )}

        {/* ===================================================================
            SECTION TÉLÉMAINTENANCE À DISTANCE (RMM) & SERVICE APRÈS-VENTE (SAV) PROACTIF
        =================================================================== */}
        {activeSection === 'rmm_sav_center' && (
          <RemoteMaintenanceAndSavSuite
            serverOrigin="SAAS_SERVER"
            operatorEmail={activeAccount.email}
            operatorRole={activeAccount.role}
            enterprises={enterprisesList.map((ent) => {
              const didRec = (ent as any).digitalIdentity;
              const isOffline = didRec?.networkPresenceStatus === 'offline_controlled';
              return {
                tenantId: ent.tenantId,
                companyName: ent.companyName,
                isu: ent.isu,
                countryName: ent.countryName || "Côte d'Ivoire",
                email: ent.email,
                phone: ent.phone,
                isOnline: !isOffline,
                legalEntityType:
                  ent.providerEntityType === 'personne_physique' ? 'physical' : 'moral',
              };
            })}
            onTriggerToast={onTriggerToast}
            onSubscriptionChanged={() => setSubscriptionRefreshTick((t) => t + 1)}
          />
        )}
      </div>

      {/* MODAL ADGENSYS : MODIFICATION DU MOT DE PASSE DU SUPER-ADMIN OU DE SES COLLABORATEURS */}
      {passwordModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-indigo-500/40 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase">
                    Modifier le Mot de Passe (Pouvoir AdGenSys)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Modification directe du mot de passe d&apos;un Super-Admin ou d&apos;un collaborateur
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalTarget(null)}
                className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="font-bold text-slate-900 dark:text-white uppercase">
                {passwordModalTarget.fullName}{' '}
                <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px]">
                  {passwordModalTarget.role.toUpperCase()}
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-500">
                Email : {passwordModalTarget.email} · Tél : {passwordModalTarget.phoneNumber}
              </div>
              <div className="font-mono text-[11px] text-slate-500">
                Mot de passe actuel :{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {passwordModalTarget.currentPassword || passwordModalTarget.defaultPassword || '—'}
                </strong>
              </div>
            </div>

            <form onSubmit={handleSaveAdGenSysPasswordChange} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Nouveau mot de passe *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setAdGenSysNewPassword(
                        generateDefaultPassword(
                          passwordModalTarget.role === 'super_admin' ? 'ADM' : 'COL'
                        )
                      )
                    }
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Générer un mot de passe sécurisé</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={adGenSysNewPassword}
                    onChange={(e) => setAdGenSysNewPassword(e.target.value)}
                    placeholder="Saisir le nouveau mot de passe..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono font-bold text-sm text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(adGenSysNewPassword);
                      onTriggerToast('Nouveau mot de passe copié dans le presse-papiers.');
                    }}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adGenSysMustChangeOnNextLogin}
                  onChange={(e) => setAdGenSysMustChangeOnNextLogin(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600"
                />
                <span>
                  <strong className="block text-slate-800 dark:text-slate-200">
                    Demander à l&apos;utilisateur de personnaliser ce mot de passe à sa prochaine connexion
                  </strong>
                  <span className="text-[11px] text-slate-500">
                    Si décoché, ce nouveau mot de passe est immédiatement définitif et actif.
                  </span>
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalTarget(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-xs"
                >
                  Enregistrer le nouveau mot de passe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : MODIFIER LE COLLABORATEUR / COMPTE UTILISATEUR */}
      {editCollaboratorTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-blue-500/40 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 text-xs my-8">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase">
                  Modifier le Collaborateur / Compte Utilisateur
                </h3>
                <p className="text-[11px] text-slate-500">
                  Mettez à jour l&apos;identité, les coordonnées, la fonction, le niveau d&apos;accès ou le mot de passe.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditCollaboratorTarget(null)}
                className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCollaboratorEdit} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nom &amp; Prénoms *
                </label>
                <input
                  type="text"
                  required
                  value={editCollabFullName}
                  onChange={(e) => setEditCollabFullName(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-bold uppercase text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editCollabPhone}
                    onChange={(e) => setEditCollabPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email professionnel de connexion *
                  </label>
                  <input
                    type="email"
                    required
                    value={editCollabEmail}
                    onChange={(e) => setEditCollabEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Profil de droits d&apos;accès (Rôle)
                </label>
                <select
                  value={editCollabRole}
                  onChange={(e) => setEditCollabRole(e.target.value as LocalAccountRecord['role'])}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold text-slate-900 dark:text-white"
                >
                  <option value="super_admin">Super-Admin Entreprise</option>
                  <option value="manager">Directeur / Chef de Projet (Manager)</option>
                  <option value="accountant">Comptable / Responsable Financier</option>
                  <option value="collaborator">Collaborateur Opérationnel</option>
                  <option value="viewer">Auditeur / Lecture Seule</option>
                  <option value="moas">MOAS (Serveur SaaS)</option>
                  <option value="teleconseiller">Téléconseiller (Serveur SaaS)</option>
                  <option value="consultant_operation">Consultant Opération (Serveur SaaS)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fonction dans l&apos;entreprise *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCollabFunction}
                    onChange={(e) => setEditCollabFunction(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Département / Corps de métier
                  </label>
                  <input
                    type="text"
                    value={editCollabDepartment}
                    onChange={(e) => setEditCollabDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {isAdGenSys && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-indigo-700 dark:text-indigo-300">
                      Nouveau mot de passe (optionnel — laisser vide pour conserver l&apos;actuel)
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditCollabPassword(generateDefaultPassword('COL'))}
                      className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Générer MDP
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editCollabPassword}
                    onChange={(e) => setEditCollabPassword(e.target.value)}
                    placeholder="Saisir un nouveau mot de passe si nécessaire..."
                    className="w-full rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditCollaboratorTarget(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer shadow-xs"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : POUVOIR ADGENSYS DE CHANGER LE SUPER-ADMIN D'UNE ENTREPRISE EN CAS D'INDISPONIBILITÉ CONSTATÉE ET PROUVÉE */}
      {replaceSuperAdminModalEnt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border-2 border-purple-500/60 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 text-xs my-8">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-purple-600 text-white shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-mono font-bold text-[10px] uppercase text-purple-600 dark:text-purple-400">
                    Pouvoir Souverain AdGenSys · Continuité d&apos;Exploitation Entreprise
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase mt-0.5">
                    Changement du Super-Admin pour Indisponibilité Constatée et Prouvée
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Entreprise concernée :{' '}
                    <strong className="text-slate-900 dark:text-white uppercase">
                      {replaceSuperAdminModalEnt.companyName}
                    </strong>{' '}
                    (ISU : <span className="font-mono">{replaceSuperAdminModalEnt.isu}</span>)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplaceSuperAdminModalEnt(null)}
                className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {replaceSuperAdminModalEnt.currentSuperAdmin && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    Super-Admin Actuel Indisponible
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white uppercase">
                    {replaceSuperAdminModalEnt.currentSuperAdmin.fullName}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">
                    {replaceSuperAdminModalEnt.currentSuperAdmin.email} ·{' '}
                    {replaceSuperAdminModalEnt.currentSuperAdmin.phoneNumber}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-mono text-[10px] font-bold">
                  Indisponibilité en cours de constat
                </span>
              </div>
            )}

            <form onSubmit={handleExecuteReplaceSuperAdmin} className="space-y-4">
              {/* Étape 1 : Constat & Preuve d'Indisponibilité */}
              <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
                <div className="font-bold text-purple-900 dark:text-purple-200 uppercase text-[11px]">
                  1. Constat Officiel &amp; Preuve d&apos;Indisponibilité *
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Motif d&apos;indisponibilité constatée *
                    </label>
                    <select
                      value={unavailabilityReason}
                      onChange={(e) => setUnavailabilityReason(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="Absence prolongée / Incapacité médicale constatée">
                        Absence prolongée / Incapacité médicale constatée
                      </option>
                      <option value="Départ définitif / Démission / Révocation prouvée">
                        Départ définitif / Démission / Révocation prouvée
                      </option>
                      <option value="Mandat officiel de la Direction Générale / Associés">
                        Mandat officiel de la Direction Générale / Associés
                      </option>
                      <option value="Perte critique d'accès & Inactivité prolongée prouvée">
                        Perte critique d&apos;accès &amp; Inactivité prolongée prouvée
                      </option>
                      <option value="Force majeure constatée et documentée">
                        Force majeure constatée et documentée
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Référence de la Preuve / PV Officiel *
                    </label>
                    <input
                      type="text"
                      required
                      value={proofReference}
                      onChange={(e) => setProofReference(e.target.value)}
                      placeholder="Ex: PV-DG-2026-042 / Attestation"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Synthèse des éléments de preuve constatés *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={proofDescription}
                    onChange={(e) => setProofDescription(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Statut appliqué à l&apos;ancien Super-Admin indisponible
                  </label>
                  <select
                    value={previousAdminDisposition}
                    onChange={(e) =>
                      setPreviousAdminDisposition(
                        e.target.value as 'demote_to_manager' | 'suspend_account'
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="demote_to_manager">
                      Rétrograder en Collaborateur (Manager) sans privilèges Super-Admin
                    </option>
                    <option value="suspend_account">
                      Suspendre / Verrouiller le compte de l&apos;ancien Super-Admin
                    </option>
                  </select>
                </div>
              </div>

              {/* Étape 2 : Désignation du Nouveau Super-Admin */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-3">
                <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px]">
                  2. Désignation du Nouveau Super-Admin de l&apos;Entreprise *
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReplacementMode('promote_existing')}
                    className={`py-2 px-3 rounded-lg border font-bold text-xs cursor-pointer transition ${
                      replacementMode === 'promote_existing'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Promouvoir un Collaborateur Existant
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplacementMode('new_super_admin')}
                    className={`py-2 px-3 rounded-lg border font-bold text-xs cursor-pointer transition ${
                      replacementMode === 'new_super_admin'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Créer / Nommer un Nouveau Super-Admin
                  </button>
                </div>

                {replacementMode === 'promote_existing' ? (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Sélectionner le collaborateur de l&apos;entreprise à élever au rang de Super-Admin *
                    </label>
                    <select
                      value={selectedCollaboratorToPromoteId}
                      onChange={(e) => setSelectedCollaboratorToPromoteId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="">-- Choisir un collaborateur --</option>
                      {allAccounts
                        .filter(
                          (a) =>
                            a.role !== 'super_admin' &&
                            a.role !== 'adgensys' &&
                            a.role !== 'moas'
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.fullName} ({c.email} · {c.functionTitle})
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nom &amp; Prénoms du nouveau Super-Admin *
                      </label>
                      <input
                        type="text"
                        required
                        value={newSaFullName}
                        onChange={(e) => setNewSaFullName(e.target.value.toUpperCase())}
                        placeholder="EX: KOUASSI JEAN-MARC"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-bold uppercase text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Email professionnel de connexion *
                      </label>
                      <input
                        type="email"
                        required
                        value={newSaEmail}
                        onChange={(e) => setNewSaEmail(e.target.value)}
                        placeholder="dg@entreprise.com"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Téléphone (WhatsApp / SMS OTP) *
                      </label>
                      <input
                        type="tel"
                        required
                        value={newSaPhone}
                        onChange={(e) => setNewSaPhone(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Intitulé de fonction attribué
                    </label>
                    <input
                      type="text"
                      value={newSaFunction}
                      onChange={(e) => setNewSaFunction(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Mot de passe par défaut attribué (1ère connexion Super-Admin) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setNewSaPassword(generateDefaultPassword('ADM'))}
                        className="text-[11px] font-bold text-purple-600 hover:underline cursor-pointer"
                      >
                        Générer
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={newSaPassword}
                      onChange={(e) => setNewSaPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono font-bold text-slate-900 dark:text-white"
                    />
                    <p className="mt-1 text-[11px] text-purple-700 dark:text-purple-300 font-medium leading-tight">
                      Règle de sécurité : Le collaborateur promu devra obligatoirement se connecter avec ce mot de passe par défaut généré lors de son ascension en Super-Admin, puis le changer dès sa première connexion.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplaceSuperAdminModalEnt(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isExecutingSaReplacement}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer shadow-xs"
                >
                  {isExecutingSaReplacement
                    ? 'Transfert de souveraineté en cours...'
                    : 'Valider le Changement de Super-Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


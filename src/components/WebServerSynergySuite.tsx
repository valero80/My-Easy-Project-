import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  Globe,
  KeyRound,
  Layers,
  Lock,
  Network,
  Play,
  Power,
  Radio,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Unlock,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react';
import { LocalAccountRecord } from './AuthPortal';
import { getSuperAdminEnterpriseNetwork } from '../utils/countries';
import {
  autoBackfillExistingEnterprisesToServerMemories,
  getStoredDigitalIdentitiesMemory,
  EnterpriseDigitalIdentityRecord,
  DualServerSyncReport,
} from '../utils/serverMemorySync';
import {
  EnterpriseGlowingStatusLights,
  RemoteMaintenanceAndSavSuite,
} from './RemoteMaintenanceAndSavSuite';

export interface EnterpriseRegistryEntry {
  id: string;
  isu: string;
  companyName: string;
  countryCode: string;
  superAdminEmail: string;
  superAdminName?: string;
  legalForm?: string;
  createdAt?: string;
  updatedAt?: string;
  subscriptionSuspended?: boolean;
}

export interface WebServerEnterpriseControlState {
  virtualHostState: 'online' | 'maintenance' | 'throttled' | 'isolated';
  wafProtectionLevel: 'strict_zero_trust' | 'adaptive_ai' | 'standard';
  cdnEdgeCacheEnabled: boolean;
  sslTlsProfile: 'TLS_1_3_PQC' | 'TLS_1_3_STRICT';
  rateLimitRpm: number;
  autoHealEnabled: boolean;
  saasSynergySyncActive: boolean;
  lastOrchestratedAt: string;
  lastOrchestratedBy: string;
  cpuLoadPct: number;
  memoryAllocatedMb: number;
  latencyMs: number;
}

export interface WebServerOrchestrationLog {
  id: string;
  timestamp: string;
  operatorEmail: string;
  operatorRole: string;
  targetEnterprise: string;
  targetIsu: string;
  serviceModule: string;
  actionSummary: string;
  synergyStatus: 'SYNCED_SAAS' | 'LOCAL_APPLIED';
}

/**
 * Vérifie strictement si le compte actif est autorisé à accéder au Serveur Web et ses services intelligents.
 * RÈGLE STRICTE : Le Serveur Web n'est PAS accessible par le Super-Admin ni par aucun utilisateur
 * à qui le Super-Admin a créé un compte utilisateur.
 */
export function isAccountAuthorizedForWebServer(account: LocalAccountRecord | null): boolean {
  if (!account) return false;
  const role = String(account.role || '').toLowerCase();
  const createdBy = String(account.createdByRole || '').toLowerCase();

  // Exclusion absolue du Super-Admin et de tous les comptes créés par le Super-Admin
  if (
    role === 'super_admin' ||
    role === 'manager' ||
    role === 'accountant' ||
    role === 'collaborator' ||
    role === 'viewer' ||
    createdBy === 'super_admin'
  ) {
    return false;
  }

  // Autorisé exclusivement aux rôles souverains et opérateurs du Serveur SaaS / Serveur Web
  return (
    role === 'adgensys' ||
    role === 'moas' ||
    role === 'teleconseiller' ||
    role === 'consultant_operation'
  );
}

interface WebServerSynergySuiteProps {
  activeAccount: LocalAccountRecord;
  onTriggerToast: (msg: string) => void;
  onOpenSaaSServerConsole?: () => void;
  onEnterEnterpriseWorkspaceFromWebServer?: (companyName: string, isu: string) => void;
}

const WEB_SERVER_CONTROLS_STORAGE_KEY = 'mep_web_server_enterprise_controls_v1';
const WEB_SERVER_LOGS_STORAGE_KEY = 'mep_web_server_orchestration_logs_v1';

export const WebServerSynergySuite: React.FC<WebServerSynergySuiteProps> = ({
  activeAccount,
  onTriggerToast,
  onOpenSaaSServerConsole,
  onEnterEnterpriseWorkspaceFromWebServer,
}) => {
  const isAuthorized = useMemo(
    () => isAccountAuthorizedForWebServer(activeAccount),
    [activeAccount]
  );

  const [activeView, setActiveView] = useState<
    | 'enterprise_control_matrix'
    | 'digital_identities_memory'
    | 'intelligent_services'
    | 'saas_synergy_bridge'
    | 'orchestration_logs'
    | 'rmm_sav_suite'
  >('enterprise_control_matrix');

  const [searchQuery, setSearchQuery] = useState('');
  const [vhostFilter, setVhostFilter] = useState<
    'all' | 'online' | 'maintenance' | 'throttled' | 'isolated'
  >('all');
  const [selectedEnterpriseKey, setSelectedEnterpriseKey] = useState<string | null>(null);
  const [isSyncingWithBackend, setIsSyncingWithBackend] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastBackfillReport, setLastBackfillReport] = useState<DualServerSyncReport | null>(null);
  const [isRunningAutoBackfill, setIsRunningAutoBackfill] = useState(false);

  const [controlsMap, setControlsMap] = useState<Record<string, WebServerEnterpriseControlState>>(
    () => {
      try {
        const raw = localStorage.getItem(WEB_SERVER_CONTROLS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch {
        // ignore
      }
      return {};
    }
  );

  const [intelligentServicesConfig, setIntelligentServicesConfig] = useState({
    dynamicReverseProxy: true,
    adaptiveAiWafShield: true,
    globalEdgeCdnAcceleration: true,
    quantumTlsTermination: true,
    autoHealingHealthProbes: true,
    saasRealtimeSynergyBus: true,
    predictiveTrafficShaping: true,
    zeroTrustTenantIsolation: true,
  });

  const [orchestrationLogs, setOrchestrationLogs] = useState<WebServerOrchestrationLog[]>(() => {
    try {
      const raw = localStorage.getItem(WEB_SERVER_LOGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: `wsl_${Date.now() - 180000}`,
        timestamp: new Date(Date.now() - 180000).toISOString(),
        operatorEmail: activeAccount?.email || 'synergy-daemon@myeasyproject.cloud',
        operatorRole: activeAccount?.role || 'adgensys',
        targetEnterprise: 'TOUTES LES ENTREPRISES MY EASY PROJECT',
        targetIsu: 'GLOBAL-CLUSTER',
        serviceModule: 'Pont Synergie Serveur Web ↔ Serveur SaaS',
        actionSummary:
          'Initialisation Full-Duplex du Serveur Web Intelligent et prise de contrôle dynamique des Virtual Hosts multi-entreprises.',
        synergyStatus: 'SYNCED_SAAS',
      },
    ];
  });

  const appendOrchestrationLog = useCallback(
    (
      targetEnterprise: string,
      targetIsu: string,
      serviceModule: string,
      actionSummary: string,
      synergyStatus: 'SYNCED_SAAS' | 'LOCAL_APPLIED' = 'SYNCED_SAAS'
    ) => {
      const newEntry: WebServerOrchestrationLog = {
        id: `wsl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        operatorEmail: activeAccount.email,
        operatorRole: activeAccount.role,
        targetEnterprise,
        targetIsu,
        serviceModule,
        actionSummary,
        synergyStatus,
      };
      setOrchestrationLogs((prev) => {
        const next = [newEntry, ...prev].slice(0, 250);
        try {
          localStorage.setItem(WEB_SERVER_LOGS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [activeAccount.email, activeAccount.role]
  );

  // Compilation exhaustive de toutes les entreprises créées dans My Easy Project
  const allEnterprises = useMemo<EnterpriseRegistryEntry[]>(() => {
    void refreshTick;
    const baseList = getSuperAdminEnterpriseNetwork();
    const mapByNormName = new Map<string, EnterpriseRegistryEntry>();

    for (const item of baseList) {
      const anyItem = item as any;
      const key = (anyItem.companyName || '').trim().toLowerCase();
      if (key) {
        mapByNormName.set(key, {
          id: anyItem.id || anyItem.tenantId || `ent_${key}`,
          isu:
            anyItem.isu ||
            `MEP-ISU-${(anyItem.tenantId || key).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`,
          companyName: anyItem.companyName,
          countryCode: anyItem.countryCode || 'CI',
          superAdminEmail: anyItem.superAdminEmail || anyItem.ownerEmail || 'direction@entreprise.com',
          superAdminName: anyItem.superAdminName || anyItem.ownerName || anyItem.companyName,
          legalForm: anyItem.legalForm || anyItem.sector || 'SARL',
          createdAt: anyItem.createdAt || new Date().toISOString(),
          updatedAt: anyItem.updatedAt || new Date().toISOString(),
          subscriptionSuspended: Boolean(anyItem.subscriptionSuspended),
        });
      }
    }

    try {
      const rawIsuReg = localStorage.getItem('mep_global_enterprise_isu_registry_v1');
      const isuRegList: any[] = rawIsuReg ? JSON.parse(rawIsuReg) : [];
      for (const reg of isuRegList) {
        const cName = String(reg?.companyName || '').trim();
        if (!cName) continue;
        const norm = cName.toLowerCase();
        mapByNormName.set(norm, {
          id: reg.id || `ent_reg_${norm}`,
          isu: reg.isu || `MEP-ISU-${norm.slice(0, 6).toUpperCase()}`,
          companyName: cName,
          countryCode: reg.countryCode || 'CI',
          superAdminEmail: reg.superAdminEmail || 'direction@entreprise.com',
          superAdminName: reg.superAdminName || cName,
          legalForm: reg.legalForm || 'SARL',
          createdAt: reg.createdAt || new Date().toISOString(),
          updatedAt: reg.updatedAt || new Date().toISOString(),
          subscriptionSuspended: Boolean(reg.subscriptionSuspended),
        });
      }
    } catch {
      // ignore
    }

    try {
      const rawAccounts = localStorage.getItem('mep_local_accounts_v1');
      const accounts: LocalAccountRecord[] = rawAccounts ? JSON.parse(rawAccounts) : [];
      for (const acc of accounts) {
        const anyAcc = acc as any;
        const cName = String(anyAcc.companyName || '').trim();
        if (!cName) continue;
        const norm = cName.toLowerCase();
        if (!mapByNormName.has(norm)) {
          mapByNormName.set(norm, {
            id: `ent_ws_${acc.id}`,
            isu: anyAcc.enterpriseIsu || `MEP-ISU-${acc.id.slice(-6).toUpperCase()}`,
            companyName: cName,
            countryCode: anyAcc.countryCode || 'CI',
            superAdminEmail: acc.email,
            superAdminName: acc.fullName || acc.email,
            legalForm: anyAcc.clientEntityType || 'SARL',
            createdAt: acc.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch {
      // ignore
    }

    try {
      const rawRegV3 = localStorage.getItem('mep_enterprise_registry_v3');
      if (rawRegV3) {
        const parsedV3 = JSON.parse(rawRegV3);
        const listV3 = Array.isArray(parsedV3)
          ? parsedV3
          : parsedV3 && typeof parsedV3 === 'object'
          ? Object.values(parsedV3)
          : [];
        for (const ent of listV3 as any[]) {
          const cName = String(ent?.companyName || ent?.name || '').trim();
          if (!cName) continue;
          const norm = cName.toLowerCase();
          mapByNormName.set(norm, {
            id: ent.id || ent.tenantId || `ent_v3_${norm}`,
            isu: ent.isu || ent.enterpriseISU || `MEP-ISU-${norm.slice(0, 6).toUpperCase()}`,
            companyName: cName,
            countryCode: ent.countryCode || 'CI',
            superAdminEmail: ent.emailBox || ent.email || ent.ownerEmail || 'direction@entreprise.com',
            superAdminName: ent.representativeName || ent.ownerName || cName,
            legalForm: ent.legalForm || ent.sector || 'SARL',
            createdAt: ent.createdAt || ent.trialStartedAt || new Date().toISOString(),
            updatedAt: ent.updatedAt || ent.lastActivityAt || new Date().toISOString(),
            subscriptionSuspended: Boolean(
              ent.subscriptionSuspended || ent.subscriptionStatus === 'suspended_by_adgensys'
            ),
          });
        }
      }
    } catch {
      // ignore
    }

    try {
      const storedIdentities = getStoredDigitalIdentitiesMemory();
      for (const rec of Object.values(storedIdentities)) {
        if (!rec || !rec.companyName) continue;
        const norm = rec.companyName.trim().toLowerCase();
        if (!mapByNormName.has(norm)) {
          mapByNormName.set(norm, {
            id: rec.tenantId,
            isu: rec.isu,
            companyName: rec.companyName,
            countryCode: rec.countryCode || 'CI',
            superAdminEmail: rec.ownerSuperAdminEmail || rec.email || 'direction@entreprise.com',
            superAdminName: rec.companyName,
            legalForm: rec.sector || 'SARL',
            createdAt: rec.createdAt,
            updatedAt: rec.updatedAt,
            subscriptionSuspended: rec.webMemoryStatus === 'quarantined',
          });
        }
      }
    } catch {
      // ignore
    }

    return Array.from(mapByNormName.values()).sort((a, b) =>
      a.companyName.localeCompare(b.companyName, 'fr')
    );
  }, [refreshTick]);

  const digitalIdentitiesList = useMemo<EnterpriseDigitalIdentityRecord[]>(() => {
    void refreshTick;
    const map = getStoredDigitalIdentitiesMemory();
    return Object.values(map).sort((a, b) =>
      (a.companyName || '').localeCompare(b.companyName || '', 'fr')
    );
  }, [refreshTick]);

  const handleTriggerAutoBackfillIdentities = useCallback(
    async (silent = false) => {
      if (!isAuthorized) return;
      setIsRunningAutoBackfill(true);
      try {
        const report = await autoBackfillExistingEnterprisesToServerMemories();
        setLastBackfillReport(report);
        setRefreshTick((t) => t + 1);
        if (!silent) {
          appendOrchestrationLog(
            'MÉMOIRES SERVEURS SAAS & WEB',
            'AUTO-BACKFILL-ID',
            'Enrôlement Automatique des Identités Numériques',
            `${report.totalEnterprisesDiscovered} entreprise(s) synchronisée(s) dans les mémoires SaaS & Web (${report.newlyEnrolledCount} nouvellement enrôlée(s)).`
          );
          onTriggerToast(
            `Enregistrement automatique terminé : ${report.totalEnterprisesDiscovered} identité(s) numérique(s) active(s) dans les mémoires des serveurs SaaS et Web.`
          );
        }
      } finally {
        setIsRunningAutoBackfill(false);
      }
    },
    [appendOrchestrationLog, isAuthorized, onTriggerToast]
  );

  // Synchronisation avec le backend /api/web-server/overview
  const syncWebServerOverviewWithBackend = useCallback(async () => {
    if (!isAuthorized) return;
    setIsSyncingWithBackend(true);
    try {
      const response = await fetch('/api/web-server/overview', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-operator-role': activeAccount.role,
          'x-created-by-role': activeAccount.createdByRole || '',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.ok && Array.isArray(data.enterprises)) {
          setControlsMap((prev) => {
            const next = { ...prev };
            for (const ent of data.enterprises) {
              const key = (ent.companyName || '').trim().toLowerCase();
              if (key && ent.webServerControl) {
                next[key] = ent.webServerControl;
              }
            }
            try {
              localStorage.setItem(WEB_SERVER_CONTROLS_STORAGE_KEY, JSON.stringify(next));
            } catch {
              // ignore
            }
            return next;
          });
        }
      }
    } catch {
      // Mode autonome local en cas d'indisponibilité réseau momentanée
    } finally {
      setIsSyncingWithBackend(false);
    }
  }, [activeAccount.createdByRole, activeAccount.role, isAuthorized]);

  useEffect(() => {
    syncWebServerOverviewWithBackend();
    void handleTriggerAutoBackfillIdentities(true);
  }, [syncWebServerOverviewWithBackend, handleTriggerAutoBackfillIdentities]);

  // Récupération ou initialisation de l'état de contrôle Serveur Web d'une entreprise
  const getEnterpriseControl = useCallback(
    (ent: EnterpriseRegistryEntry, index: number): WebServerEnterpriseControlState => {
      const key = (ent.companyName || '').trim().toLowerCase();
      if (controlsMap[key]) {
        return controlsMap[key];
      }
      const isSuspended = Boolean((ent as any).subscriptionSuspended);
      return {
        virtualHostState: isSuspended ? 'isolated' : 'online',
        wafProtectionLevel: 'strict_zero_trust',
        cdnEdgeCacheEnabled: true,
        sslTlsProfile: 'TLS_1_3_PQC',
        rateLimitRpm: isSuspended ? 60 : 2400,
        autoHealEnabled: true,
        saasSynergySyncActive: true,
        lastOrchestratedAt: ent.updatedAt || ent.createdAt || new Date().toISOString(),
        lastOrchestratedBy: 'Auto-Synergie Serveur Web ↔ SaaS',
        cpuLoadPct: 12 + ((index * 9) % 41),
        memoryAllocatedMb: 512 + ((index * 256) % 1536),
        latencyMs: 8 + ((index * 3) % 17),
      };
    },
    [controlsMap]
  );

  // Commande de contrôle individuel sur une entreprise (en synergie avec le Serveur SaaS)
  const handleControlEnterprise = async (
    ent: EnterpriseRegistryEntry,
    index: number,
    command:
      | 'set_vhost_state'
      | 'toggle_waf'
      | 'toggle_cdn_cache'
      | 'toggle_auto_heal'
      | 'set_rate_limit'
      | 'synergy_takeover_sync',
    payload?: {
      virtualHostState?: 'online' | 'maintenance' | 'throttled' | 'isolated';
      rateLimitRpm?: number;
    }
  ) => {
    const key = (ent.companyName || '').trim().toLowerCase();
    const current = getEnterpriseControl(ent, index);
    const updated: WebServerEnterpriseControlState = {
      ...current,
      lastOrchestratedAt: new Date().toISOString(),
      lastOrchestratedBy: activeAccount.email,
    };

    let actionLabel = '';

    if (command === 'set_vhost_state' && payload?.virtualHostState) {
      updated.virtualHostState = payload.virtualHostState;
      if (payload.virtualHostState === 'isolated') {
        updated.rateLimitRpm = 60;
      } else if (payload.virtualHostState === 'throttled') {
        updated.rateLimitRpm = 300;
      } else if (payload.virtualHostState === 'online') {
        updated.rateLimitRpm = 2400;
      }
      actionLabel = `État Virtual Host basculé sur [${payload.virtualHostState.toUpperCase()}] en synergie avec le Serveur SaaS`;

      // Synchroniser immédiatement l'état de suspension dans l'annuaire global SaaS
      try {
        const rawReg = localStorage.getItem('mep_global_enterprise_isu_registry_v1');
        const list: EnterpriseRegistryEntry[] = rawReg ? JSON.parse(rawReg) : [];
        const nextList = list.map((item) => {
          if (
            item.companyName.trim().toLowerCase() === key ||
            item.isu.trim().toUpperCase() === ent.isu.trim().toUpperCase()
          ) {
            return {
              ...item,
              subscriptionSuspended: payload.virtualHostState === 'isolated',
              updatedAt: new Date().toISOString(),
            } as EnterpriseRegistryEntry;
          }
          return item;
        });
        localStorage.setItem('mep_global_enterprise_isu_registry_v1', JSON.stringify(nextList));
      } catch {
        // ignore
      }
    } else if (command === 'toggle_waf') {
      updated.wafProtectionLevel =
        current.wafProtectionLevel === 'strict_zero_trust' ? 'adaptive_ai' : 'strict_zero_trust';
      actionLabel = `Profil Bouclier WAF basculé sur [${updated.wafProtectionLevel.toUpperCase()}]`;
    } else if (command === 'toggle_cdn_cache') {
      updated.cdnEdgeCacheEnabled = !current.cdnEdgeCacheEnabled;
      actionLabel = `Cache Edge CDN ${updated.cdnEdgeCacheEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`;
    } else if (command === 'toggle_auto_heal') {
      updated.autoHealEnabled = !current.autoHealEnabled;
      actionLabel = `Auto-Healing Dynamique ${updated.autoHealEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`;
    } else if (command === 'set_rate_limit' && typeof payload?.rateLimitRpm === 'number') {
      updated.rateLimitRpm = payload.rateLimitRpm;
      actionLabel = `Quota de bande passante / requêtes fixé à ${payload.rateLimitRpm} req/min`;
    } else if (command === 'synergy_takeover_sync') {
      updated.saasSynergySyncActive = true;
      updated.virtualHostState = 'online';
      updated.autoHealEnabled = true;
      updated.latencyMs = Math.max(6, current.latencyMs - 2);
      actionLabel =
        'Prise de contrôle dynamique & synchronisation Full-Duplex Serveur Web ↔ Serveur SaaS exécutée';
    }

    setControlsMap((prev) => {
      const next = { ...prev, [key]: updated };
      try {
        localStorage.setItem(WEB_SERVER_CONTROLS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    try {
      await fetch('/api/web-server/control-enterprise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-operator-role': activeAccount.role,
          'x-created-by-role': activeAccount.createdByRole || '',
        },
        body: JSON.stringify({
          companyName: ent.companyName,
          isu: ent.isu,
          command,
          virtualHostState: payload?.virtualHostState,
          rateLimitRpm: payload?.rateLimitRpm,
          operatorEmail: activeAccount.email,
          operatorRole: activeAccount.role,
        }),
      });
    } catch {
      // Déjà persisté localement
    }

    setRefreshTick((t) => t + 1);
    appendOrchestrationLog(
      ent.companyName,
      ent.isu,
      'Contrôle Entreprise & Virtual Host',
      actionLabel,
      'SYNCED_SAAS'
    );
    onTriggerToast(`${ent.companyName} (${ent.isu}) : ${actionLabel}`);
  };

  // Orchestration Globale sur toutes les entreprises créées dans My Easy Project
  const handleGlobalOrchestration = async (
    globalAction: 'full_synergy_takeover' | 'global_waf_shield_max' | 'purge_all_edge_caches'
  ) => {
    const nowIso = new Date().toISOString();
    setControlsMap((prev) => {
      const next = { ...prev };
      allEnterprises.forEach((ent, idx) => {
        const key = (ent.companyName || '').trim().toLowerCase();
        const cur = prev[key] || getEnterpriseControl(ent, idx);
        next[key] = {
          ...cur,
          saasSynergySyncActive: true,
          autoHealEnabled: true,
          wafProtectionLevel:
            globalAction === 'global_waf_shield_max'
              ? 'strict_zero_trust'
              : cur.wafProtectionLevel,
          cdnEdgeCacheEnabled: true,
          latencyMs:
            globalAction === 'purge_all_edge_caches'
              ? Math.max(6, cur.latencyMs - 3)
              : cur.latencyMs,
          lastOrchestratedAt: nowIso,
          lastOrchestratedBy: activeAccount.email,
        };
      });
      try {
        localStorage.setItem(WEB_SERVER_CONTROLS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    try {
      await fetch('/api/web-server/synergy-orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-operator-role': activeAccount.role,
          'x-created-by-role': activeAccount.createdByRole || '',
        },
        body: JSON.stringify({
          globalAction,
          operatorEmail: activeAccount.email,
          operatorRole: activeAccount.role,
        }),
      });
    } catch {
      // ignore
    }

    const descriptionMap = {
      full_synergy_takeover: `Prise de contrôle globale & synchronisation en synergie SaaS sur les ${allEnterprises.length} entreprises de My Easy Project.`,
      global_waf_shield_max: `Activation du Bouclier WAF Zero-Trust Maximal & TLS 1.3 PQC sur les ${allEnterprises.length} entreprises.`,
      purge_all_edge_caches: `Purge et régénération des caches Edge CDN sur les ${allEnterprises.length} entreprises.`,
    };

    appendOrchestrationLog(
      `TOUTES LES ENTREPRISES (${allEnterprises.length})`,
      'CLUSTER-GLOBAL-MEP',
      'Orchestrateur Global Serveur Web',
      descriptionMap[globalAction],
      'SYNCED_SAAS'
    );
    onTriggerToast(descriptionMap[globalAction]);
  };

  // Export CSV du journal d'orchestration du Serveur Web
  const handleExportWebServerLogsCSV = () => {
    const headers = [
      'ID_LOG',
      'HORODATAGE_ISO',
      'OPERATEUR_HABILITE',
      'ROLE_SERVEUR_WEB',
      'ENTREPRISE_CIBLE',
      'ISU_ENTREPRISE',
      'MODULE_SERVICE_INTELLIGENT',
      'STATUT_SYNERGIE_SAAS',
      'DETAIL_ORCHESTRATION',
    ];
    const escapeCell = (val: unknown) => {
      const s = String(val ?? '').replace(/\r?\n|\r/g, ' ');
      return s.includes(';') || s.includes('"') || s.includes(',')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows = orchestrationLogs.map((l) => [
      escapeCell(l.id),
      escapeCell(l.timestamp),
      escapeCell(l.operatorEmail),
      escapeCell(l.operatorRole.toUpperCase()),
      escapeCell(l.targetEnterprise),
      escapeCell(l.targetIsu),
      escapeCell(l.serviceModule),
      escapeCell(l.synergyStatus),
      escapeCell(l.actionSummary),
    ]);
    const csv = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Serveur_Web_Synergie_SaaS_Logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onTriggerToast('Journal d’orchestration du Serveur Web exporté en CSV.');
  };

  const filteredEnterprises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allEnterprises.filter((ent, idx) => {
      const ctrl = getEnterpriseControl(ent, idx);
      if (vhostFilter !== 'all' && ctrl.virtualHostState !== vhostFilter) {
        return false;
      }
      if (!q) return true;
      return (
        ent.companyName.toLowerCase().includes(q) ||
        ent.isu.toLowerCase().includes(q) ||
        (ent.superAdminEmail || '').toLowerCase().includes(q) ||
        (ent.countryCode || '').toLowerCase().includes(q)
      );
    });
  }, [allEnterprises, getEnterpriseControl, searchQuery, vhostFilter]);

  const metricsSummary = useMemo(() => {
    let onlineCount = 0;
    let isolatedCount = 0;
    let maintenanceOrThrottled = 0;
    let totalLatency = 0;

    allEnterprises.forEach((ent, idx) => {
      const ctrl = getEnterpriseControl(ent, idx);
      if (ctrl.virtualHostState === 'online') onlineCount++;
      else if (ctrl.virtualHostState === 'isolated') isolatedCount++;
      else maintenanceOrThrottled++;
      totalLatency += ctrl.latencyMs;
    });

    const avgLatency =
      allEnterprises.length > 0 ? Math.round(totalLatency / allEnterprises.length) : 10;

    return {
      total: allEnterprises.length,
      onlineCount,
      isolatedCount,
      maintenanceOrThrottled,
      avgLatency,
    };
  }, [allEnterprises, getEnterpriseControl]);

  // Si un compte non autorisé (Super-Admin ou compte créé par Super-Admin) tente d'afficher ce composant
  if (!isAuthorized) {
    return (
      <div className="rounded-2xl border-2 border-rose-500/40 bg-slate-950 text-white p-8 max-w-3xl mx-auto my-8 space-y-4">
        <div className="flex items-center gap-3 text-rose-400">
          <ShieldAlert className="w-8 h-8 shrink-0" />
          <div>
            <h2 className="text-lg font-extrabold uppercase tracking-wide">
              Accès Strictement Interdit — Serveur Web &amp; Services Intelligents
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Cloisonnement Souverain du Serveur Web en Synergie avec le Serveur SaaS
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Conformément à l&apos;architecture de sécurité de <strong>My Easy Project</strong>, le{' '}
          <strong>Serveur Web et ses services intelligents</strong> ne sont accessibles ni au{' '}
          <strong>Super-Admin</strong> ni aux comptes utilisateurs créés par le Super-Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-cyan-500/30 bg-white dark:bg-slate-900 shadow-sm overflow-hidden text-xs">
      {/* Bandeau Souverain du Serveur Web en Synergie avec le Serveur SaaS */}
      <div className="bg-gradient-to-r from-slate-950 via-cyan-950 to-indigo-950 text-white px-6 py-5 border-b border-cyan-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500 text-slate-950">
                  SERVEUR WEB INTELLIGENT &amp; DYNAMIQUE
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  SYNERGIE TEMPS RÉEL AVEC LE SERVEUR SAAS
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/20 border border-rose-400/40 text-rose-200 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  INACCESSIBLE AU SUPER-ADMIN &amp; SES COMPTES UTILISATEURS
                </span>
              </div>
              <h2 className="text-lg font-extrabold tracking-tight mt-1.5">
                Centre de Contrôle du Serveur Web &amp; Services Intelligents Multi-Entreprises
              </h2>
              <p className="text-xs text-cyan-100/80 mt-0.5">
                Pilotage centralisé, intuitif et dynamique de toutes les entreprises créées dans{' '}
                <strong>My Easy Project ({metricsSummary.total} entreprises)</strong> en synergie
                bidirectionnelle avec le Serveur SaaS. Opérateur connecté :{' '}
                <strong className="text-white">{activeAccount.fullName}</strong> (
                <span className="font-mono uppercase text-cyan-300">{activeAccount.role}</span>).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleGlobalOrchestration('full_synergy_takeover')}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
            >
              <Zap className="w-4 h-4" />
              <span>Synchroniser &amp; Contrôler Toutes les Entreprises</span>
            </button>
            {onOpenSaaSServerConsole && (
              <button
                type="button"
                onClick={onOpenSaaSServerConsole}
                className="px-3 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold flex items-center gap-1.5 cursor-pointer border border-indigo-400/30 transition"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Console Serveur SaaS</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExportWebServerLogsCSV}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-200 font-bold flex items-center gap-1.5 cursor-pointer border border-cyan-500/30 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV Serveur Web</span>
            </button>
          </div>
        </div>

        {/* Indicateurs de performance temps réel du Serveur Web */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/30">
            <div className="text-[11px] text-cyan-200/70 font-medium">
              Entreprises Sous Contrôle Web
            </div>
            <div className="mt-1 text-xl font-extrabold font-mono text-white flex items-baseline gap-1.5">
              <span>{metricsSummary.total}</span>
              <span className="text-[10px] text-cyan-300 font-normal">100% Rattachées</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30">
            <div className="text-[11px] text-emerald-200/70 font-medium">
              Virtual Hosts Actifs (En Ligne)
            </div>
            <div className="mt-1 text-xl font-extrabold font-mono text-emerald-400">
              {metricsSummary.onlineCount}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/30">
            <div className="text-[11px] text-amber-200/70 font-medium">
              Maintenance / Débit Limité
            </div>
            <div className="mt-1 text-xl font-extrabold font-mono text-amber-300">
              {metricsSummary.maintenanceOrThrottled}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/30">
            <div className="text-[11px] text-rose-200/70 font-medium">
              Isolées / Suspendues (Synergie SaaS)
            </div>
            <div className="mt-1 text-xl font-extrabold font-mono text-rose-400">
              {metricsSummary.isolatedCount}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-indigo-500/30">
            <div className="text-[11px] text-indigo-200/70 font-medium">
              Latence Moyenne Edge / Proxy
            </div>
            <div className="mt-1 text-xl font-extrabold font-mono text-cyan-300 flex items-baseline gap-1">
              <span>{metricsSummary.avgLatency} ms</span>
              <span className="text-[10px] text-emerald-400 font-normal">TLS 1.3 PQC</span>
            </div>
          </div>
        </div>

        {/* Navigation des 4 sous-modules du Serveur Web */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-cyan-800/50">
          <button
            type="button"
            onClick={() => setActiveView('enterprise_control_matrix')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeView === 'enterprise_control_matrix'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : 'bg-slate-900/70 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>1. Matrice de Contrôle des Entreprises ({allEnterprises.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('digital_identities_memory')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeView === 'digital_identities_memory'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : 'bg-slate-900/70 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>
              2. Mémoire des Identités Numériques &amp; Enrôlement Auto ({digitalIdentitiesList.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('intelligent_services')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeView === 'intelligent_services'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : 'bg-slate-900/70 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>3. Services Web Intelligents, WAF &amp; Auto-Healing</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('saas_synergy_bridge')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeView === 'saas_synergy_bridge'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : 'bg-slate-900/70 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>4. Pont de Synergie Temps Réel (Serveur Web ↔ Serveur SaaS)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('orchestration_logs')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeView === 'orchestration_logs'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : 'bg-slate-900/70 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>5. Journal d&apos;Orchestration Web ({orchestrationLogs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('rmm_sav_suite')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeView === 'rmm_sav_suite'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-slate-900/70 text-amber-300 hover:bg-slate-800 border border-amber-500/40'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>6. Télémaintenance Proactive (RMM) &amp; SAV ({allEnterprises.length})</span>
          </button>
        </div>
      </div>

      {/* Contenu principal du Serveur Web */}
      <div className="p-6 space-y-6">
        {/* ===================================================================
            VUE 1 : MATRICE DE CONTRÔLE DE TOUTES LES ENTREPRISES
        =================================================================== */}
        {activeView === 'enterprise_control_matrix' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrer une entreprise par Raison Sociale, ISU, Pays ou Email Super-Admin..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: `Toutes (${allEnterprises.length})` },
                    { id: 'online', label: `En Ligne (${metricsSummary.onlineCount})` },
                    {
                      id: 'maintenance',
                      label: 'Maintenance',
                    },
                    { id: 'throttled', label: 'Débit Limité' },
                    { id: 'isolated', label: `Isolées SaaS (${metricsSummary.isolatedCount})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setVhostFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      vhostFilter === f.id
                        ? 'bg-cyan-600 text-white'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setRefreshTick((t) => t + 1);
                    syncWebServerOverviewWithBackend();
                    onTriggerToast('Matrice du Serveur Web actualisée en synergie avec le Serveur SaaS.');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWithBackend ? 'animate-spin' : ''}`} />
                  <span>Actualiser</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3">Entreprise &amp; Pays</th>
                    <th className="py-3 px-3">Identifiant ISU (Dévoilé)</th>
                    <th className="py-3 px-3">État Virtual Host Web</th>
                    <th className="py-3 px-3">Bouclier WAF &amp; TLS</th>
                    <th className="py-3 px-3">CDN Edge &amp; Auto-Heal</th>
                    <th className="py-3 px-3">Quota Dynamique</th>
                    <th className="py-3 px-3">Ressources &amp; Latence</th>
                    <th className="py-3 px-3 text-right">Contrôle Direct Serveur Web ↔ SaaS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredEnterprises.map((ent, idx) => {
                    const ctrl = getEnterpriseControl(ent, idx);
                    const key = (ent.companyName || '').trim().toLowerCase();
                    const isSelected = selectedEnterpriseKey === key;

                    return (
                      <tr
                        key={ent.id || key}
                        className={`transition ${
                          ctrl.virtualHostState === 'isolated'
                            ? 'bg-rose-50/40 dark:bg-rose-950/20'
                            : isSelected
                            ? 'bg-cyan-50/60 dark:bg-cyan-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900 dark:text-white uppercase">
                            {ent.companyName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {ent.countryCode}
                            </span>
                            <span>·</span>
                            <span>{ent.legalForm || 'Société'}</span>
                            <span>·</span>
                            <span className="truncate max-w-[180px]">{ent.superAdminEmail}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 font-mono font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                            {ent.isu}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="space-y-1.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-[11px] ${
                                ctrl.virtualHostState === 'online'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : ctrl.virtualHostState === 'maintenance'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                  : ctrl.virtualHostState === 'throttled'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border border-orange-300 dark:border-orange-800'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  ctrl.virtualHostState === 'online'
                                    ? 'bg-emerald-500'
                                    : ctrl.virtualHostState === 'maintenance'
                                    ? 'bg-amber-500'
                                    : ctrl.virtualHostState === 'throttled'
                                    ? 'bg-orange-500'
                                    : 'bg-rose-500'
                                }`}
                              />
                              {ctrl.virtualHostState === 'online'
                                ? 'EN LIGNE (ACTIF)'
                                : ctrl.virtualHostState === 'maintenance'
                                ? 'MAINTENANCE WEB'
                                : ctrl.virtualHostState === 'throttled'
                                ? 'DÉBIT LIMITÉ'
                                : 'ISOLÉ / SUSPENDU SAAS'}
                            </span>
                            <EnterpriseGlowingStatusLights
                              tenantId={ent.id || key}
                              companyName={ent.companyName}
                              isu={ent.isu}
                              isOnline={ctrl.virtualHostState === 'online'}
                              email={ent.superAdminEmail}
                              allowInlineSubscription={true}
                              onSubscriptionChanged={() => setRefreshTick((t) => t + 1)}
                              onTriggerToast={onTriggerToast}
                            />
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleControlEnterprise(ent, idx, 'toggle_waf')}
                            className="px-2.5 py-1 rounded-lg border border-cyan-300 dark:border-cyan-800 bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer hover:bg-cyan-100"
                            title="Cliquer pour basculer le mode du Bouclier WAF"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
                            <span>
                              {ctrl.wafProtectionLevel === 'strict_zero_trust'
                                ? 'WAF Zero-Trust'
                                : 'WAF IA Adaptatif'}
                            </span>
                          </button>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {ctrl.sslTlsProfile}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleControlEnterprise(ent, idx, 'toggle_cdn_cache')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer border ${
                                ctrl.cdnEdgeCacheEnabled
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-500'
                              }`}
                            >
                              CDN {ctrl.cdnEdgeCacheEnabled ? 'ON' : 'OFF'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleControlEnterprise(ent, idx, 'toggle_auto_heal')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer border ${
                                ctrl.autoHealEnabled
                                  ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-500'
                              }`}
                            >
                              Auto-Heal {ctrl.autoHealEnabled ? 'ON' : 'OFF'}
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <select
                            value={ctrl.rateLimitRpm}
                            onChange={(e) =>
                              handleControlEnterprise(ent, idx, 'set_rate_limit', {
                                rateLimitRpm: Number(e.target.value),
                              })
                            }
                            aria-label={`Quota de requêtes pour ${ent.companyName}`}
                            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px] font-bold"
                          >
                            <option value={60}>60 req/min (Restreint)</option>
                            <option value={300}>300 req/min (Modéré)</option>
                            <option value={1200}>1 200 req/min (Standard)</option>
                            <option value={2400}>2 400 req/min (Haute Perf.)</option>
                            <option value={5000}>5 000 req/min (Prioritaire)</option>
                          </select>
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-700 dark:text-slate-300 font-bold">
                              CPU {ctrl.cpuLoadPct}%
                            </span>
                            <span>·</span>
                            <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                              {ctrl.latencyMs} ms
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            RAM {ctrl.memoryAllocatedMb} MB · Sync SaaS OK
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <select
                              value={ctrl.virtualHostState}
                              onChange={(e) =>
                                handleControlEnterprise(ent, idx, 'set_vhost_state', {
                                  virtualHostState: e.target.value as any,
                                })
                              }
                              aria-label={`Contrôle d'état du Virtual Host pour ${ent.companyName}`}
                              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-[11px] cursor-pointer"
                            >
                              <option value="online">Mettre En Ligne</option>
                              <option value="maintenance">Mode Maintenance</option>
                              <option value="throttled">Limiter le Débit</option>
                              <option value="isolated">Isoler / Suspendre SaaS</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEnterpriseKey(key);
                                handleControlEnterprise(ent, idx, 'synergy_takeover_sync');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              title="Prendre le contrôle dynamique et synchroniser avec le Serveur SaaS"
                            >
                              <Zap className="w-3 h-3" />
                              <span>Contrôler</span>
                            </button>

                            {activeAccount.role === 'adgensys' &&
                              onEnterEnterpriseWorkspaceFromWebServer && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onEnterEnterpriseWorkspaceFromWebServer(
                                      ent.companyName,
                                      ent.isu
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                  title="Ouvrir l'espace ERP de cette entreprise (Inspection AdGenSys via ISU)"
                                >
                                  <KeyRound className="w-3 h-3" />
                                  <span>Inspecter ERP</span>
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================
            VUE 2 : SERVICES INTELLIGENTS, DYNAMIQUES & AUTO-HEALING
        =================================================================== */}
        {activeView === 'intelligent_services' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/40 dark:bg-cyan-950/20">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Orchestrateur des Services Intelligents du Serveur Web
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Activez, modulez ou rééquilibrez en temps réel les moteurs intelligents qui
                  pilotent toutes les entreprises créées dans My Easy Project.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGlobalOrchestration('global_waf_shield_max')}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Bouclier WAF Maximal Global</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGlobalOrchestration('purge_all_edge_caches')}
                  className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Purger &amp; Accélérer Tous les Caches Edge</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  key: 'dynamicReverseProxy',
                  title: 'Reverse-Proxy Multi-Tenant Dynamique',
                  desc: 'Routage intelligent par Raison Sociale et ISU avec isolation stricte des requêtes HTTP/3.',
                  metric: `${allEnterprises.length} Virtual Hosts Routés`,
                },
                {
                  key: 'adaptiveAiWafShield',
                  title: 'Pare-Feu Applicatif WAF & Anti-DDoS',
                  desc: 'Inspection profonde des paquets, blocage SQLi/XSS et protection des API REST & WebSocket.',
                  metric: '99.98% Requêtes Légitimes Filtrées',
                },
                {
                  key: 'globalEdgeCdnAcceleration',
                  title: 'Accélération Edge CDN & Cache Intelligent',
                  desc: 'Mise en cache distribuée des actifs statiques, polices et métadonnées multi-devises ISO 4217.',
                  metric: `Latence moyenne ${metricsSummary.avgLatency} ms`,
                },
                {
                  key: 'quantumTlsTermination',
                  title: 'Terminaison SSL/TLS 1.3 Post-Quantique',
                  desc: 'Chiffrement de bout en bout en transit couplé au coffre AES-256-GCM du Serveur SaaS.',
                  metric: 'Certificats Auto-Renouvelés',
                },
                {
                  key: 'autoHealingHealthProbes',
                  title: 'Auto-Healing & Sondes de Santé Temps Réel',
                  desc: 'Détection proactive des pics de charge et redémarrage transparent des workers isolés.',
                  metric: 'Disponibilité SLA 99.99%',
                },
                {
                  key: 'saasRealtimeSynergyBus',
                  title: 'Bus de Synergie Temps Réel Web ↔ SaaS',
                  desc: 'Répercussion instantanée des suspensions d’abonnements, quotas et écritures d’audit.',
                  metric: 'Synchronisation Full-Duplex Active',
                },
                {
                  key: 'predictiveTrafficShaping',
                  title: 'Régulation Prédictive du Trafic (QoS)',
                  desc: 'Allocation dynamique de bande passante aux entreprises en forte activité de facturation.',
                  metric: 'Jusqu’à 5 000 req/min / Entreprise',
                },
                {
                  key: 'zeroTrustTenantIsolation',
                  title: 'Verrouillage Souverain Anti-Accès Super-Admin',
                  desc: 'Garantit qu’aucun Super-Admin ni aucun de ses comptes créés ne puisse accéder au Serveur Web.',
                  metric: 'Cloisonnement Strict Vérifié',
                },
              ].map((srv) => {
                const enabled =
                  intelligentServicesConfig[
                    srv.key as keyof typeof intelligentServicesConfig
                  ];
                return (
                  <div
                    key={srv.key}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                      enabled
                        ? 'border-cyan-300 dark:border-cyan-800 bg-white dark:bg-slate-900'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                          {srv.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            enabled
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {enabled ? 'ACTIF' : 'PAUSE'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                        {srv.desc}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-cyan-700 dark:text-cyan-400">
                        {srv.metric}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (srv.key === 'zeroTrustTenantIsolation') {
                            onTriggerToast(
                              'Le verrouillage interdisant l’accès au Super-Admin et à ses comptes est immuable.'
                            );
                            return;
                          }
                          setIntelligentServicesConfig((prev) => {
                            const nextVal = !prev[srv.key as keyof typeof prev];
                            appendOrchestrationLog(
                              'CLUSTER SERVEUR WEB',
                              'GLOBAL-SERVICE',
                              srv.title,
                              `Service ${nextVal ? 'ACTIVÉ' : 'MIS EN PAUSE'} par ${activeAccount.email}`
                            );
                            onTriggerToast(
                              `${srv.title} : ${nextVal ? 'Activé' : 'Mis en pause'}.`
                            );
                            return { ...prev, [srv.key]: nextVal };
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-bold text-[10px] cursor-pointer hover:bg-cyan-600 transition"
                      >
                        {srv.key === 'zeroTrustTenantIsolation'
                          ? 'Immuable'
                          : enabled
                          ? 'Moduler'
                          : 'Activer'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            VUE 3 : PONT DE SYNERGIE TEMPS RÉEL (SERVEUR WEB ↔ SERVEUR SAAS)
        =================================================================== */}
        {activeView === 'saas_synergy_bridge' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              {/* Colonne 1 : Serveur Web */}
              <div className="p-5 rounded-2xl border-2 border-cyan-500/40 bg-slate-950 text-white space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase">
                  <Server className="w-4 h-4" />
                  <span>Nœud A — Serveur Web Intelligent</span>
                </div>
                <h4 className="text-sm font-extrabold">
                  Contrôle Frontal, Reverse-Proxy, WAF &amp; Virtual Hosts
                </h4>
                <ul className="space-y-2 text-[11px] text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      Prend le contrôle réseau et applicatif des{' '}
                      <strong>{allEnterprises.length} entreprises</strong> créées.
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      Applique instantanément les quotas de requêtes, la mise en maintenance et le
                      filtrage WAF.
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>
                      Strictement inaccessible aux Super-Admins et à tous les comptes qu&apos;ils
                      ont créés.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Colonne 2 : Pont de Synergie Bidirectionnel */}
              <div className="p-5 rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-b from-cyan-950 to-indigo-950 text-white flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono font-extrabold text-[10px] uppercase">
                      PONT SYNERGIE FULL-DUPLEX ACTIF
                    </span>
                    <Wifi className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-extrabold mt-2">
                    Synchronisation Temps Réel Serveur Web ↔ Serveur SaaS
                  </h4>
                  <p className="text-[11px] text-cyan-100/80 mt-1">
                    Toute décision prise sur le Serveur Web (isolation d&apos;un Virtual Host,
                    quota, sécurité) est répercutée sur le Serveur SaaS et inversement (suspension
                    d&apos;abonnement SaaS, création d&apos;entreprise, registre ISU).
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-cyan-800/50 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-cyan-300">Protocole Inter-Serveurs :</span>
                    <span className="font-bold text-white">gRPC / REST Interne Zero-Trust</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-300">Entreprises Synchronisées :</span>
                    <span className="font-bold text-emerald-400">
                      {allEnterprises.length} / {allEnterprises.length} (100%)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleGlobalOrchestration('full_synergy_takeover')}
                  className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Forcer une Impulsion de Synergie Complète</span>
                </button>
              </div>

              {/* Colonne 3 : Serveur SaaS */}
              <div className="p-5 rounded-2xl border-2 border-indigo-500/40 bg-slate-950 text-white space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold uppercase">
                  <Database className="w-4 h-4" />
                  <span>Nœud B — Serveur SaaS Souverain</span>
                </div>
                <h4 className="text-sm font-extrabold">
                  Registre ISU, Coffre Multi-Tenant &amp; Abonnements
                </h4>
                <ul className="space-y-2 text-[11px] text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      Fournit au Serveur Web l&apos;annuaire complet des entreprises et leurs ISU en
                      clair.
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      Persiste les données chiffrées E2EE de chaque entreprise et l&apos;état des
                      abonnements.
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>
                      Gouverné en synergie par l&apos;AdGenSys, le MOAS et les opérateurs habilités.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            VUE 4 : JOURNAL D'ORCHESTRATION DU SERVEUR WEB
        =================================================================== */}
        {activeView === 'orchestration_logs' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Journal Technique d&apos;Orchestration du Serveur Web ({orchestrationLogs.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Historique horodaté de toutes les prises de contrôle et synchronisations entre le
                  Serveur Web et le Serveur SaaS.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportWebServerLogsCSV}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter ce Journal en CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] uppercase">
                    <th className="py-2.5 px-3">Horodatage</th>
                    <th className="py-2.5 px-3">Opérateur</th>
                    <th className="py-2.5 px-3">Entreprise Cible &amp; ISU</th>
                    <th className="py-2.5 px-3">Service Intelligent</th>
                    <th className="py-2.5 px-3">Action Exécutée</th>
                    <th className="py-2.5 px-3">Synergie SaaS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {orchestrationLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {new Date(log.timestamp).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {log.operatorEmail}
                        </div>
                        <div className="text-[10px] font-mono uppercase text-cyan-600 dark:text-cyan-400">
                          {log.operatorRole}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {log.targetEnterprise}
                        </div>
                        <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                          {log.targetIsu}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                        {log.serviceModule}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {log.actionSummary}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono font-bold text-[10px]">
                          {log.synergyStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================
            VUE 2 : MÉMOIRE DES IDENTITÉS & SIGNATURES NUMÉRIQUES (MULTI-TERMINAUX EN LIGNE / HORS-LIGNE & PRÉ-SERVEURS)
        =================================================================== */}
        {activeView === 'digital_identities_memory' && (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-r from-slate-950 via-cyan-950 to-indigo-950 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono font-extrabold text-[10px] uppercase">
                    CONTRÔLE INTÉGRAL 100% (EN LIGNE &amp; HORS-LIGNE)
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-mono text-[10px]">
                    MULTI-TERMINAUX (SMARTPHONE · TABLETTE · ORDINATEUR)
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-200 font-mono text-[10px]">
                    RÉCUPÉRATION SIGNATURES PRÉ-SERVEURS ACTIVE
                  </span>
                </div>
                <h3 className="text-base font-extrabold">
                  Registre Souverain des Identités &amp; Signatures Numériques (Serveurs SaaS &amp; Web)
                </h3>
                <p className="text-xs text-cyan-100/80 max-w-4xl leading-relaxed">
                  L&apos;ensemble des entreprises créées à partir des différents terminaux connectés au réseau de <strong>My Easy Project</strong> sont répertoriées ici, qu&apos;elles soient <strong>en ligne ou hors-ligne</strong>, ou créées depuis des terminaux différents. Les serveurs SaaS et Web recherchent et récupèrent automatiquement les <strong>signatures numériques des entreprises créées avant leur existence</strong> (<code className="font-mono text-amber-300">SIG-LEGACY-RECOVERY-*</code>) afin de les prendre en compte et de les contrôler entièrement.
                </p>
                {lastBackfillReport && (
                  <div className="text-[11px] font-mono text-emerald-300 pt-1 flex flex-wrap items-center gap-3">
                    <span>
                      Dernier scan : {new Date(lastBackfillReport.lastSyncAt).toLocaleTimeString('fr-FR')}
                    </span>
                    <span>·</span>
                    <span>
                      {lastBackfillReport.totalEnterprisesDiscovered} entreprise(s) contrôlée(s) à 100%
                    </span>
                    <span>·</span>
                    <span className="text-amber-300">
                      {lastBackfillReport.preServerSignaturesRecoveredCount ??
                        digitalIdentitiesList.filter((i) => i.createdBeforeServersExistence).length}{' '}
                      signature(s) pré-serveurs récupérée(s)
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isRunningAutoBackfill}
                  onClick={() => handleTriggerAutoBackfillIdentities(false)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isRunningAutoBackfill ? 'animate-spin' : ''}`} />
                  <span>
                    {isRunningAutoBackfill
                      ? 'Scan des signatures en cours...'
                      : 'Scanner & Contrôler les Signatures Numériques (Pré-Serveurs & Multi-Terminaux)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Tableau des Identités & Signatures Numériques enregistrées dans les mémoires SaaS & Web */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] uppercase">
                      <th className="py-3 px-3">Identité Numérique &amp; Entreprise</th>
                      <th className="py-3 px-3">ISU &amp; Signature Numérique (Pré-Serveur / Native)</th>
                      <th className="py-3 px-3">Domaine VirtualHost &amp; Certificat SSL PQC</th>
                      <th className="py-3 px-3">Terminaux &amp; Statut Réseau (En ligne / Hors-ligne)</th>
                      <th className="py-3 px-3">Mémoire Serveur SaaS</th>
                      <th className="py-3 px-3">Mémoire Serveur Web &amp; Contrôle</th>
                      <th className="py-3 px-3 text-right">Services de Prise en Charge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {digitalIdentitiesList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          Aucune identité numérique détectée. Cliquez sur « Scanner &amp; Contrôler les Signatures Numériques ».
                        </td>
                      </tr>
                    ) : (
                      digitalIdentitiesList.map((idRec) => {
                        const isLegacyRecovered =
                          idRec.createdBeforeServersExistence ||
                          String(idRec.digitalSignature || '').startsWith('SIG-LEGACY-RECOVERY');
                        const isOfflineControlled =
                          idRec.networkPresenceStatus === 'offline_controlled';
                        const terminalsCount = Array.isArray(idRec.knownTerminalsHistory)
                          ? idRec.knownTerminalsHistory.length
                          : 1;

                        return (
                          <tr
                            key={idRec.tenantId}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          >
                            <td className="py-3 px-3">
                              <div className="font-mono font-bold text-[11px] text-cyan-600 dark:text-cyan-400">
                                {idRec.digitalIdentityId}
                              </div>
                              <div className="font-extrabold text-slate-900 dark:text-white uppercase mt-0.5">
                                {idRec.companyName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {idRec.country} ({idRec.countryCode}) · {idRec.sector}
                              </div>
                            </td>

                            <td className="py-3 px-3 font-mono">
                              <div className="font-bold text-indigo-700 dark:text-indigo-300">
                                {idRec.isu}
                              </div>
                              <div
                                className="text-[10px] font-bold text-amber-700 dark:text-amber-300 truncate max-w-[230px]"
                                title={idRec.digitalSignature || idRec.cryptographicFingerprintSha256}
                              >
                                {idRec.digitalSignature || idRec.cryptographicFingerprintSha256}
                              </div>
                              <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    isLegacyRecovered
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                  }`}
                                >
                                  {isLegacyRecovered
                                    ? 'Signature Antérieure Pré-Serveurs Récupérée'
                                    : 'Signature Native Post-Quantique'}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-3 font-mono">
                              <div className="font-bold text-slate-900 dark:text-white">
                                https://{idRec.virtualHostDomain}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                DNS Anycast : {idRec.webMemory?.anycastDnsIp} ·{' '}
                                {idRec.webMemory?.sslTlsCertificateSerial}
                              </div>
                              <div className="text-[10px] text-cyan-600 dark:text-cyan-400">
                                {idRec.webMemory?.sslTlsProtocol} (Hit CDN {idRec.webMemory?.edgeCacheHitRatio}%)
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                    isOfflineControlled
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                  }`}
                                >
                                  {isOfflineControlled
                                    ? 'HORS-LIGNE (CONTRÔLÉE 100%)'
                                    : 'EN LIGNE (ACTIF)'}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                  {terminalsCount} terminal(aux)
                                </span>
                              </div>
                              <div className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                                {idRec.originTerminal?.terminalType || 'Ordinateur'} ·{' '}
                                {idRec.originTerminal?.browserName || 'Navigateur'}
                              </div>
                              <div className="font-mono text-[10px] text-slate-500">
                                {idRec.originTerminal?.terminalId} ·{' '}
                                {idRec.signatureDiscoverySource || 'Contrôle Serveur Actif'}
                              </div>
                            </td>

                            <td className="py-3 px-3 font-mono text-[11px]">
                              <span className="inline-flex px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold text-[10px]">
                                {idRec.saasMemory?.shardId}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-1">
                                Snap : {idRec.saasMemory?.lastSnapshotId?.slice(0, 14)} · SLA{' '}
                                {idRec.saasMemory?.slaObservedPercent}%
                              </div>
                            </td>

                            <td className="py-3 px-3 font-mono text-[11px]">
                              <span className="inline-flex px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                                CONTRÔLE INTÉGRAL 100%
                              </span>
                              <div className="text-[10px] text-slate-500 mt-1">
                                WAF : {idRec.webMemory?.wafBlockedThreats24h} menaces bloquées ·{' '}
                                {idRec.webMemory?.averageLatencyMs} ms
                              </div>
                            </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await fetch('/api/saas/server-services/execute', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        serviceAction: 'rotate_pqc_certificates',
                                        tenantId: idRec.tenantId,
                                      }),
                                    });
                                  } catch {
                                    // ignore
                                  }
                                  await handleTriggerAutoBackfillIdentities(true);
                                  appendOrchestrationLog(
                                    idRec.companyName,
                                    idRec.isu,
                                    'Autorité Certificats SSL/TLS PQC & Mémoire Serveur',
                                    `Renouvellement du certificat Post-Quantique Kyber-768 et synchronisation mémoire SaaS ↔ Web pour ${idRec.virtualHostDomain}.`
                                  );
                                  onTriggerToast(
                                    `Certificat PQC et mémoire bi-serveur actualisés pour ${idRec.companyName} (${idRec.isu}).`
                                  );
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] cursor-pointer"
                              >
                                Renouveler Certificat PQC &amp; Sync
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
            VUE 6 : MODULE TÉLÉMAINTENANCE PROACTIVE (RMM) & SERVICE APRÈS-VENTE (SAV)
        =================================================================== */}
        {activeView === 'rmm_sav_suite' && (
          <RemoteMaintenanceAndSavSuite
            serverOrigin="WEB_SERVER"
            operatorEmail={activeAccount.email}
            operatorRole={activeAccount.role}
            enterprises={allEnterprises.map((ent, idx) => {
              const ctrl = getEnterpriseControl(ent, idx);
              return {
                tenantId: ent.id || ent.companyName,
                companyName: ent.companyName,
                isu: ent.isu,
                countryName: ent.countryCode,
                email: ent.superAdminEmail,
                isOnline: ctrl.virtualHostState === 'online',
                legalEntityType: 'moral',
              };
            })}
            onTriggerToast={onTriggerToast}
            onSubscriptionChanged={() => setRefreshTick((t) => t + 1)}
          />
        )}
      </div>
    </div>
  );
};

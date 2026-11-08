import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  CheckCircle2,
  Sliders,
  Users,
  Briefcase,
  Layers,
  CreditCard,
  MessageSquare,
  Globe,
  FileText,
  FolderKanban,
  BarChart3,
  Package,
  Building2,
  UserCheck,
  Wallet,
  Bell,
  RefreshCw,
  Download,
  Plus,
  Search,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { LocalAccountRecord } from './AuthPortal';

export interface AccessPointItemDefinition {
  id: string;
  code: string;
  label: string;
  category: 'modules_erp' | 'services_cloud' | 'fonctionnalites_metier';
  description: string;
  tabId?: string;
  permissionFlag?:
    | 'canManageProjects'
    | 'canValidateInvoices'
    | 'canRecordPayments'
    | 'canManageTeam'
    | 'canExportFinancialAudits'
    | 'canManageStockAndOrders'
    | 'canModifyRubriqueCosts'
    | 'canUploadProjectDocuments'
    | 'canManagePayrollAndHR';
  restrictedToAdGenSysAndMoas?: boolean;
}

export interface FunctionAccessPolicy {
  functionId: string;
  functionLabel: string;
  roleId: 'super_admin' | 'manager' | 'accountant' | 'collaborator' | 'viewer' | string;
  department: string;
  description: string;
  isLockedSuperAdmin?: boolean;
  isCustomFunction?: boolean;
  allowedModules: string[];
  allowedServices: string[];
  allowedFeatures: string[];
  accessLevelByPoint: Record<string, 'none' | 'read' | 'write' | 'full'>;
  updatedAt: string;
  updatedBy: string;
}

export interface UserSpecificAccessOverride {
  accountId: string;
  fullName: string;
  email: string;
  functionId: string;
  enabled: boolean;
  grantedPoints: string[];
  revokedPoints: string[];
  updatedAt: string;
  updatedBy: string;
}

export interface TenantAccessPointsConfig {
  tenantId: string;
  companyName: string;
  functions: FunctionAccessPolicy[];
  userOverrides: Record<string, UserSpecificAccessOverride>;
  updatedAt: string;
  updatedBy: string;
}

export const ACCESS_POINTS_CATALOG: AccessPointItemDefinition[] = [
  // 1. Modules Principaux de l'Application ERP
  {
    id: 'mod_dashboard',
    code: 'MOD-SYNTHESE',
    label: 'Synthèse & Tableau de Bord Financier',
    category: 'modules_erp',
    description: 'Indicateurs financiers, filtres par client/projet, graphiques budgétaires et alertes prioritaires.',
    tabId: 'dashboard',
  },
  {
    id: 'mod_projects',
    code: 'MOD-PROJETS',
    label: 'Gestion & Suivi des Projets',
    category: 'modules_erp',
    description: 'Dossiers de projets, rentabilité temps réel, cahiers des charges PDF, référentiel documentaire et rubriques.',
    tabId: 'projects',
  },
  {
    id: 'mod_executive_suite',
    code: 'MOD-PILOTAGE-360',
    label: 'Pilotage Exécutif 360° (Gantt, Trésorerie, QHSE, CRM)',
    category: 'modules_erp',
    description: 'Diagramme de Gantt synchronisé temps réel, prévisions de trésorerie à 90j, marchés, garanties et QHSE.',
    tabId: 'executive_suite',
  },
  {
    id: 'mod_documents',
    code: 'MOD-FACTURATION',
    label: 'Facturation (Devis, Proformas, Factures)',
    category: 'modules_erp',
    description: 'Émission, chiffrage par rubrique, suivi des règlements et export PDF officiel des pièces commerciales.',
    tabId: 'documents',
  },
  {
    id: 'mod_accounting_fiscal',
    code: 'MOD-COMPTA-FISCAL',
    label: 'Comptabilité & Liasse Fiscale',
    category: 'modules_erp',
    description: 'Plan comptable SYSCOHADA / PCG / IFRS, grand livre, balance, liasse fiscale et exports FEC / XML / Excel.',
    tabId: 'accounting_fiscal',
  },
  {
    id: 'mod_clients',
    code: 'MOD-CLIENTS',
    label: 'Répertoire & Dossiers Clients',
    category: 'modules_erp',
    description: 'Fiches clients, historique de facturation, encours, relances et coordonnées certifiées.',
    tabId: 'clients',
  },
  {
    id: 'mod_catalog',
    code: 'MOD-CATALOGUE',
    label: 'Catalogue Produits & Matériaux',
    category: 'modules_erp',
    description: 'Articles, prix unitaires, seuils critiques de stock et génération rapide de bons de commande.',
    tabId: 'catalog',
  },
  {
    id: 'mod_warehouse',
    code: 'MOD-MAGASINS',
    label: 'Magasins, Stocks & Logistique',
    category: 'modules_erp',
    description: 'Mouvements d’entrée/sortie de stock par chantier, inventaires multi-dépôts et fournisseurs.',
    tabId: 'warehouse',
  },
  {
    id: 'mod_employees',
    code: 'MOD-PERSONNEL',
    label: 'Personnel & Ressources Humaines',
    category: 'modules_erp',
    description: 'Fiches salariés, matricules, contrats, affectations par corps d’état et rémunérations.',
    tabId: 'employees',
  },
  {
    id: 'mod_attendance',
    code: 'MOD-POINTAGE',
    label: 'Pointage Biométrique & Présences',
    category: 'modules_erp',
    description: 'Suivi des heures de présence chantier/bureau, émargement quotidien et contrôle horaire.',
    tabId: 'attendance',
  },
  {
    id: 'mod_payroll',
    code: 'MOD-PAIE',
    label: 'Paie & Bulletins de Salaire',
    category: 'modules_erp',
    description: 'Calcul des salaires nets, retenues fiscales/sociales, primes et édition des bulletins de paie.',
    tabId: 'payroll',
  },
  {
    id: 'mod_team',
    code: 'MOD-COLLABORATEURS',
    label: 'Gestion des Collaborateurs & Équipes',
    category: 'modules_erp',
    description: 'Comptes collaborateurs de l’entreprise, plages horaires d’accès et habilitations.',
    tabId: 'team',
  },
  {
    id: 'mod_alerts',
    code: 'MOD-ALERTES',
    label: 'Centre d’Alertes & Notifications',
    category: 'modules_erp',
    description: 'Alertes d’échéances J-7/J-3, dépassements budgétaires, stocks critiques et rappels automatiques.',
    tabId: 'alerts',
  },
  {
    id: 'mod_offline_sync',
    code: 'MOD-SYNC-OFFLINE',
    label: 'Journal de Synchronisation Hors-Ligne',
    category: 'modules_erp',
    description: 'Suivi de la file d’attente hors-ligne, synchronisation Cloud multi-terminaux et audit technique.',
    tabId: 'offline_sync_logs',
  },
  {
    id: 'mod_security',
    code: 'MOD-PARAMETRES',
    label: 'Paramètres, Identité & Sécurité',
    category: 'modules_erp',
    description: 'Chiffrement E2EE, double authentification 2FA, charte documentaire et préférences.',
    tabId: 'security',
  },

  // 2. Services Cloud & Intégrations Externes
  {
    id: 'srv_stripe',
    code: 'SRV-STRIPE',
    label: 'Service Stripe & Paiements (Exclusivité L’AdGenSys & MOAS)',
    category: 'services_cloud',
    description:
      'STRICTEMENT RÉSERVÉ À L’ADGENSYS ET AU MOAS : Encaissements plateforme, Stripe Billing, Treasury et gouvernance financière centrale.',
    tabId: 'stripe_hub',
    restrictedToAdGenSysAndMoas: true,
  },
  {
    id: 'srv_twilio',
    code: 'SRV-TWILIO',
    label: 'Service Twilio (SMS, WhatsApp Business, Verify OTP, Voice & SendGrid)',
    category: 'services_cloud',
    description: 'Envoi de notifications transactionnelles SMS/WhatsApp, vérification OTP 2FA, appels vocaux et e-mails SendGrid.',
    tabId: 'twilio_hub',
  },
  {
    id: 'srv_vercel',
    code: 'SRV-VERCEL',
    label: 'Service Vercel Cloud & Edge (Exclusivité L’AdGenSys & MOAS)',
    category: 'services_cloud',
    description:
      'STRICTEMENT RÉSERVÉ À L’ADGENSYS ET AU MOAS : Supervision des déploiements Edge, pare-feu WAF, domaines et infrastructure Cloud.',
    tabId: 'vercel_hub',
    restrictedToAdGenSysAndMoas: true,
  },

  // 3. Fonctionnalités & Capacités Métier Granulaires
  {
    id: 'feat_manage_projects',
    code: 'FCT-PILOTAGE-PROJETS',
    label: 'Création, Modification & Clôture de Projets / Gantt',
    category: 'fonctionnalites_metier',
    description: 'Autorise la création de projets, la modification des phases du Gantt temps réel et l’édition des cahiers des charges.',
    permissionFlag: 'canManageProjects',
  },
  {
    id: 'feat_validate_invoices',
    code: 'FCT-VALIDATION-FACTURES',
    label: 'Validation Officielle des Devis, Proformas & Factures',
    category: 'fonctionnalites_metier',
    description: 'Autorise le passage d’un document du statut Brouillon au statut Validé / Envoyé et la signature électronique.',
    permissionFlag: 'canValidateInvoices',
  },
  {
    id: 'feat_record_payments',
    code: 'FCT-ENCAISSEMENTS',
    label: 'Enregistrement des Paiements Clients & Acomptes',
    category: 'fonctionnalites_metier',
    description: 'Autorise l’imputation des règlements clients, la génération des reçus et le rapprochement de trésorerie.',
    permissionFlag: 'canRecordPayments',
  },
  {
    id: 'feat_manage_team',
    code: 'FCT-GESTION-COMPTES',
    label: 'Administration des Comptes Collaborateurs & Horaires',
    category: 'fonctionnalites_metier',
    description: 'Autorise la création/modification des collaborateurs, la réinitialisation de mots de passe et les plages horaires.',
    permissionFlag: 'canManageTeam',
  },
  {
    id: 'feat_modify_rubrique_costs',
    code: 'FCT-IMPUTATION-RUBRIQUES',
    label: 'Imputation & Ajustement des Coûts Réels / Devis par Rubrique',
    category: 'fonctionnalites_metier',
    description: 'Autorise la saisie des coûts réels de fournitures et main-d’œuvre par rubrique et l’ajout dans l’historique.',
    permissionFlag: 'canModifyRubriqueCosts',
  },
  {
    id: 'feat_export_financial_audits',
    code: 'FCT-EXPORT-AUDIT-CSV-PDF',
    label: 'Exportation Audit Financier Externe (CSV, PDF, Excel, FEC)',
    category: 'fonctionnalites_metier',
    description: 'Autorise l’export CSV de l’analyse comparative des coûts réels vs devis et les exports comptables officiels.',
    permissionFlag: 'canExportFinancialAudits',
  },
  {
    id: 'feat_manage_stock_orders',
    code: 'FCT-STOCK-COMMANDES',
    label: 'Gestion des Seuils Critiques de Stock & Bons de Commande',
    category: 'fonctionnalites_metier',
    description: 'Autorise la modification des seuils d’alerte stock et la génération en 1 clic des bons de commande fournisseurs.',
    permissionFlag: 'canManageStockAndOrders',
  },
  {
    id: 'feat_upload_project_docs',
    code: 'FCT-DEPOT-DOCUMENTS-PROJET',
    label: 'Téléversement de Pièces Jointes dans le Dépôt Projet',
    category: 'fonctionnalites_metier',
    description: 'Autorise l’ajout et l’indexation directe de documents techniques ou administratifs sur chaque carte Projet.',
    permissionFlag: 'canUploadProjectDocuments',
  },
  {
    id: 'feat_manage_payroll_hr',
    code: 'FCT-EDITION-PAIE-RH',
    label: 'Édition des Bulletins de Paie & Contrats RH',
    category: 'fonctionnalites_metier',
    description: 'Autorise la génération des fiches de paie mensuelles, le paramétrage des primes et la gestion contractuelle.',
    permissionFlag: 'canManagePayrollAndHR',
  },
];

export function buildDefaultFunctionAccessPolicies(): FunctionAccessPolicy[] {
  const now = new Date().toISOString();
  const allModuleIds = ACCESS_POINTS_CATALOG.filter((p) => p.category === 'modules_erp').map((p) => p.id);
  const allServiceIds = ACCESS_POINTS_CATALOG.filter(
    (p) => p.category === 'services_cloud' && !p.restrictedToAdGenSysAndMoas
  ).map((p) => p.id);
  const allFeatureIds = ACCESS_POINTS_CATALOG.filter((p) => p.category === 'fonctionnalites_metier').map((p) => p.id);

  const makeLevelMap = (
    enabledIds: string[],
    defaultLevel: 'read' | 'write' | 'full' = 'write'
  ): Record<string, 'none' | 'read' | 'write' | 'full'> => {
    const map: Record<string, 'none' | 'read' | 'write' | 'full'> = {};
    const set = new Set(enabledIds);
    for (const item of ACCESS_POINTS_CATALOG) {
      if (item.restrictedToAdGenSysAndMoas) {
        map[item.id] = 'none';
      } else {
        map[item.id] = set.has(item.id) ? defaultLevel : 'none';
      }
    }
    return map;
  };

  const managerEnabled = [
    'mod_dashboard',
    'mod_projects',
    'mod_executive_suite',
    'mod_documents',
    'mod_clients',
    'mod_catalog',
    'mod_warehouse',
    'mod_employees',
    'mod_attendance',
    'mod_team',
    'mod_alerts',
    'mod_offline_sync',
    'mod_security',
    'srv_twilio',
    'feat_manage_projects',
    'feat_validate_invoices',
    'feat_modify_rubrique_costs',
    'feat_export_financial_audits',
    'feat_manage_stock_orders',
    'feat_upload_project_docs',
  ];

  const accountantEnabled = [
    'mod_dashboard',
    'mod_projects',
    'mod_documents',
    'mod_accounting_fiscal',
    'mod_clients',
    'mod_catalog',
    'mod_payroll',
    'mod_alerts',
    'mod_offline_sync',
    'mod_security',
    'srv_twilio',
    'feat_validate_invoices',
    'feat_record_payments',
    'feat_modify_rubrique_costs',
    'feat_export_financial_audits',
    'feat_manage_payroll_hr',
  ];

  const collaboratorEnabled = [
    'mod_dashboard',
    'mod_projects',
    'mod_executive_suite',
    'mod_documents',
    'mod_clients',
    'mod_catalog',
    'mod_warehouse',
    'mod_attendance',
    'mod_alerts',
    'mod_offline_sync',
    'mod_security',
    'srv_twilio',
    'feat_manage_projects',
    'feat_modify_rubrique_costs',
    'feat_manage_stock_orders',
    'feat_upload_project_docs',
  ];

  const viewerEnabled = [
    'mod_dashboard',
    'mod_projects',
    'mod_documents',
    'mod_accounting_fiscal',
    'mod_clients',
    'mod_alerts',
    'mod_offline_sync',
    'mod_security',
    'feat_export_financial_audits',
  ];

  return [
    {
      functionId: 'fn_super_admin',
      functionLabel: 'Direction Générale / Super-Admin',
      roleId: 'super_admin',
      department: 'Direction Générale',
      description:
        'Contrôle total sur tous les modules de l’entreprise, le service Twilio et les fonctionnalités métier (Stripe & Paiements et Vercel Cloud & Edge sont exclusivement réservés à L’AdGenSys et au MOAS).',
      isLockedSuperAdmin: true,
      allowedModules: allModuleIds,
      allowedServices: allServiceIds,
      allowedFeatures: allFeatureIds,
      accessLevelByPoint: makeLevelMap([...allModuleIds, ...allServiceIds, ...allFeatureIds], 'full'),
      updatedAt: now,
      updatedBy: 'Système (Souveraineté Super-Admin)',
    },
    {
      functionId: 'fn_manager',
      functionLabel: 'Directeur / Chef de Projet',
      roleId: 'manager',
      department: 'Direction des Opérations & Projets',
      description:
        'Pilotage complet des projets, Gantt, devis/proformas, stocks chantiers, équipes terrain et services opérationnels.',
      allowedModules: managerEnabled.filter((id) => id.startsWith('mod_')),
      allowedServices: managerEnabled.filter((id) => id.startsWith('srv_')),
      allowedFeatures: managerEnabled.filter((id) => id.startsWith('feat_')),
      accessLevelByPoint: makeLevelMap(managerEnabled, 'write'),
      updatedAt: now,
      updatedBy: 'Super-Admin',
    },
    {
      functionId: 'fn_accountant',
      functionLabel: 'Responsable Financier / Comptable (DAF)',
      roleId: 'accountant',
      department: 'Direction Administrative & Financière',
      description:
        'Validation des factures, encaissements clients, comptabilité OHADA/IFRS, liasse fiscale, paie et audit financier.',
      allowedModules: accountantEnabled.filter((id) => id.startsWith('mod_')),
      allowedServices: accountantEnabled.filter((id) => id.startsWith('srv_')),
      allowedFeatures: accountantEnabled.filter((id) => id.startsWith('feat_')),
      accessLevelByPoint: makeLevelMap(accountantEnabled, 'write'),
      updatedAt: now,
      updatedBy: 'Super-Admin',
    },
    {
      functionId: 'fn_collaborator',
      functionLabel: 'Collaborateur / Ingénieur d’Affaires & Chantier',
      roleId: 'collaborator',
      department: 'Équipe Technique & Commerciale',
      description:
        'Suivi opérationnel des chantiers, préparation des devis, gestion des stocks magasins, pointage et dépôt documentaire.',
      allowedModules: collaboratorEnabled.filter((id) => id.startsWith('mod_')),
      allowedServices: collaboratorEnabled.filter((id) => id.startsWith('srv_')),
      allowedFeatures: collaboratorEnabled.filter((id) => id.startsWith('feat_')),
      accessLevelByPoint: makeLevelMap(collaboratorEnabled, 'write'),
      updatedAt: now,
      updatedBy: 'Super-Admin',
    },
    {
      functionId: 'fn_viewer',
      functionLabel: 'Auditeur / Contrôleur de Gestion',
      roleId: 'viewer',
      department: 'Audit Interne & Conformité',
      description:
        'Consultation en lecture seule des tableaux de bord, projets, factures, comptabilité et export CSV d’audit externe.',
      allowedModules: viewerEnabled.filter((id) => id.startsWith('mod_')),
      allowedServices: viewerEnabled.filter((id) => id.startsWith('srv_')),
      allowedFeatures: viewerEnabled.filter((id) => id.startsWith('feat_')),
      accessLevelByPoint: makeLevelMap(viewerEnabled, 'read'),
      updatedAt: now,
      updatedBy: 'Super-Admin',
    },
  ];
}

export function getAccessPointsStorageKey(tenantId: string): string {
  return `mep_access_points_config_v1_${tenantId || 'default_tenant'}`;
}

export function loadTenantAccessPointsConfig(
  tenantId: string,
  companyName: string
): TenantAccessPointsConfig {
  const key = getAccessPointsStorageKey(tenantId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as TenantAccessPointsConfig;
      if (parsed && Array.isArray(parsed.functions) && parsed.functions.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return {
    tenantId: tenantId || 'default_tenant',
    companyName: companyName || 'MON ENTREPRISE',
    functions: buildDefaultFunctionAccessPolicies(),
    userOverrides: {},
    updatedAt: new Date().toISOString(),
    updatedBy: 'Super-Admin',
  };
}

export function saveTenantAccessPointsConfig(config: TenantAccessPointsConfig): void {
  const key = getAccessPointsStorageKey(config.tenantId);
  try {
    localStorage.setItem(key, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('mep-access-points-updated', { detail: config }));
  } catch {
    // ignore storage errors
  }
}

export function resolveEffectiveAccessForAccount(
  account: LocalAccountRecord | null | undefined,
  config: TenantAccessPointsConfig
): {
  allowedTabs: string[];
  permissions: {
    canManageTeam: boolean;
    canValidateInvoices: boolean;
    canRecordPayments: boolean;
    canManageProjects: boolean;
    canExportFinancialAudits: boolean;
    canManageStockAndOrders: boolean;
    canModifyRubriqueCosts: boolean;
    canUploadProjectDocuments: boolean;
    canManagePayrollAndHR: boolean;
  };
  matchedFunction: FunctionAccessPolicy;
} {
  const functions = config?.functions?.length ? config.functions : buildDefaultFunctionAccessPolicies();
  const roleId = account?.role || 'super_admin';

  if (roleId === 'super_admin' || account?.canActAsSuperAdmin) {
    const saFn = functions.find((f) => f.roleId === 'super_admin') || functions[0];
    const isAdGenSysOrMoas =
      roleId === 'adgensys' || roleId === 'moas' || Boolean(account?.canActAsAdGenSys);
    return {
      allowedTabs: [
        'dashboard',
        'offline_sync_logs',
        'projects',
        'executive_suite',
        'documents',
        ...(isAdGenSysOrMoas ? ['stripe_hub', 'vercel_hub'] : []),
        'twilio_hub',
        'accounting_fiscal',
        'clients',
        'catalog',
        'warehouse',
        'employees',
        'attendance',
        'payroll',
        'team',
        'access_points',
        'alerts',
        'trash',
        'security',
      ],
      permissions: {
        canManageTeam: true,
        canValidateInvoices: true,
        canRecordPayments: true,
        canManageProjects: true,
        canExportFinancialAudits: true,
        canManageStockAndOrders: true,
        canModifyRubriqueCosts: true,
        canUploadProjectDocuments: true,
        canManagePayrollAndHR: true,
      },
      matchedFunction: saFn,
    };
  }

  // Chercher d'abord une correspondance exacte par intitulé de fonction (functionTitle) ou par rôle (roleId)
  const normTitle = (account?.functionTitle || '').trim().toLowerCase();
  const matchedFunction =
    (normTitle
      ? functions.find((f) => f.functionLabel.trim().toLowerCase() === normTitle)
      : undefined) ||
    functions.find((f) => f.roleId === roleId) ||
    functions[functions.length - 1];

  const activePointIds = new Set<string>([
    ...(matchedFunction.allowedModules || []),
    ...(matchedFunction.allowedServices || []),
    ...(matchedFunction.allowedFeatures || []),
  ]);

  // Appliquer les dérogations individuelles éventuelles définies par le Super-Admin pour cet utilisateur
  const userOverride = account?.id ? config?.userOverrides?.[account.id] : undefined;
  if (userOverride && userOverride.enabled) {
    (userOverride.grantedPoints || []).forEach((pt) => activePointIds.add(pt));
    (userOverride.revokedPoints || []).forEach((pt) => activePointIds.delete(pt));
  }

  // Verrouillage souverain : Stripe & Paiements et Vercel Cloud & Edge ne sont accessibles que par L'AdGenSys et le MOAS
  activePointIds.delete('srv_stripe');
  activePointIds.delete('srv_vercel');

  const allowedTabs: string[] = [];
  ACCESS_POINTS_CATALOG.forEach((pt) => {
    if (pt.tabId && !pt.restrictedToAdGenSysAndMoas && activePointIds.has(pt.id)) {
      allowedTabs.push(pt.tabId);
    }
  });
  if (!allowedTabs.includes('dashboard')) {
    allowedTabs.unshift('dashboard');
  }

  return {
    allowedTabs,
    permissions: {
      canManageProjects: activePointIds.has('feat_manage_projects'),
      canValidateInvoices: activePointIds.has('feat_validate_invoices'),
      canRecordPayments: activePointIds.has('feat_record_payments'),
      canManageTeam: activePointIds.has('feat_manage_team'),
      canModifyRubriqueCosts: activePointIds.has('feat_modify_rubrique_costs'),
      canExportFinancialAudits: activePointIds.has('feat_export_financial_audits'),
      canManageStockAndOrders: activePointIds.has('feat_manage_stock_orders'),
      canUploadProjectDocuments: activePointIds.has('feat_upload_project_docs'),
      canManagePayrollAndHR: activePointIds.has('feat_manage_payroll_hr'),
    },
    matchedFunction,
  };
}

interface AccessPointsConfigurationModuleProps {
  tenantId: string;
  companyName: string;
  isSuperAdmin: boolean;
  currentOperatorName: string;
  collaborators: LocalAccountRecord[];
  accessConfig: TenantAccessPointsConfig;
  onUpdateAccessConfig: (nextConfig: TenantAccessPointsConfig, summaryMessage: string) => void;
  onAssignUserFunction?: (accountId: string, roleId: LocalAccountRecord['role'], functionTitle: string, department: string) => void;
}

export const AccessPointsConfigurationModule: React.FC<AccessPointsConfigurationModuleProps> = ({
  tenantId,
  companyName,
  isSuperAdmin,
  currentOperatorName,
  collaborators,
  accessConfig,
  onUpdateAccessConfig,
  onAssignUserFunction,
}) => {
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>(
    () => accessConfig.functions[1]?.functionId || accessConfig.functions[0]?.functionId || 'fn_manager'
  );
  const [activeViewMode, setActiveViewMode] = useState<'by_function' | 'global_matrix' | 'by_user'>('by_function');
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'modules_erp' | 'services_cloud' | 'fonctionnalites_metier'
  >('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Création d'une nouvelle fonction métier personnalisée par le Super-Admin
  const [newFnLabel, setNewFnLabel] = useState<string>('');
  const [newFnDepartment, setNewFnDepartment] = useState<string>('Direction Technique & Chantiers');
  const [newFnBaseRole, setNewFnBaseRole] = useState<'manager' | 'accountant' | 'collaborator' | 'viewer'>('collaborator');
  const [newFnDescription, setNewFnDescription] = useState<string>('');
  const [showNewFnForm, setShowNewFnForm] = useState<boolean>(false);

  // Sélection d'un collaborateur pour dérogation individuelle
  const [selectedUserId, setSelectedUserId] = useState<string>(() => collaborators[0]?.id || '');

  useEffect(() => {
    if (!accessConfig.functions.some((f) => f.functionId === selectedFunctionId)) {
      setSelectedFunctionId(accessConfig.functions[0]?.functionId || 'fn_super_admin');
    }
  }, [accessConfig.functions, selectedFunctionId]);

  const selectedFunction = useMemo(
    () =>
      accessConfig.functions.find((f) => f.functionId === selectedFunctionId) ||
      accessConfig.functions[0],
    [accessConfig.functions, selectedFunctionId]
  );

  const filteredAccessPoints = useMemo(() => {
    return ACCESS_POINTS_CATALOG.filter((pt) => {
      if (categoryFilter !== 'all' && pt.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          pt.label.toLowerCase().includes(q) ||
          pt.code.toLowerCase().includes(q) ||
          pt.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [categoryFilter, searchQuery]);

  const isPointEnabledInFunction = (fn: FunctionAccessPolicy, pointId: string): boolean => {
    const pt = ACCESS_POINTS_CATALOG.find((p) => p.id === pointId);
    if (pt?.restrictedToAdGenSysAndMoas) return false;
    if (fn.isLockedSuperAdmin || fn.roleId === 'super_admin') return true;
    return (
      fn.allowedModules.includes(pointId) ||
      fn.allowedServices.includes(pointId) ||
      fn.allowedFeatures.includes(pointId)
    );
  };

  const handleTogglePointForFunction = (functionId: string, point: AccessPointItemDefinition) => {
    if (!isSuperAdmin || point.restrictedToAdGenSysAndMoas) return;
    const targetFn = accessConfig.functions.find((f) => f.functionId === functionId);
    if (!targetFn || targetFn.isLockedSuperAdmin || targetFn.roleId === 'super_admin') return;

    const currentlyEnabled = isPointEnabledInFunction(targetFn, point.id);
    const nowIso = new Date().toISOString();

    const updatedFunctions = accessConfig.functions.map((fn) => {
      if (fn.functionId !== functionId) return fn;

      const toggleInList = (list: string[]) =>
        currentlyEnabled ? list.filter((id) => id !== point.id) : Array.from(new Set([...list, point.id]));

      const nextModules = point.category === 'modules_erp' ? toggleInList(fn.allowedModules) : fn.allowedModules;
      const nextServices = point.category === 'services_cloud' ? toggleInList(fn.allowedServices) : fn.allowedServices;
      const nextFeatures =
        point.category === 'fonctionnalites_metier' ? toggleInList(fn.allowedFeatures) : fn.allowedFeatures;

      const nextLevel: 'none' | 'read' | 'write' | 'full' = currentlyEnabled
        ? 'none'
        : fn.roleId === 'viewer'
          ? 'read'
          : 'write';

      return {
        ...fn,
        allowedModules: nextModules,
        allowedServices: nextServices,
        allowedFeatures: nextFeatures,
        accessLevelByPoint: {
          ...(fn.accessLevelByPoint || {}),
          [point.id]: nextLevel,
        },
        updatedAt: nowIso,
        updatedBy: currentOperatorName,
      };
    });

    const nextConfig: TenantAccessPointsConfig = {
      ...accessConfig,
      functions: updatedFunctions,
      updatedAt: nowIso,
      updatedBy: currentOperatorName,
    };

    onUpdateAccessConfig(
      nextConfig,
      `Point d'accès « ${point.label} » ${currentlyEnabled ? 'révoqué' : 'accordé'} pour la fonction « ${targetFn.functionLabel} ».`
    );
  };

  const handleSetAccessLevelForFunctionPoint = (
    functionId: string,
    point: AccessPointItemDefinition,
    level: 'none' | 'read' | 'write' | 'full'
  ) => {
    if (!isSuperAdmin || point.restrictedToAdGenSysAndMoas) return;
    const targetFn = accessConfig.functions.find((f) => f.functionId === functionId);
    if (!targetFn || targetFn.isLockedSuperAdmin || targetFn.roleId === 'super_admin') return;

    const shouldEnable = level !== 'none';
    const nowIso = new Date().toISOString();

    const updatedFunctions = accessConfig.functions.map((fn) => {
      if (fn.functionId !== functionId) return fn;

      const updateList = (list: string[]) =>
        shouldEnable ? Array.from(new Set([...list, point.id])) : list.filter((id) => id !== point.id);

      return {
        ...fn,
        allowedModules: point.category === 'modules_erp' ? updateList(fn.allowedModules) : fn.allowedModules,
        allowedServices: point.category === 'services_cloud' ? updateList(fn.allowedServices) : fn.allowedServices,
        allowedFeatures:
          point.category === 'fonctionnalites_metier' ? updateList(fn.allowedFeatures) : fn.allowedFeatures,
        accessLevelByPoint: {
          ...(fn.accessLevelByPoint || {}),
          [point.id]: level,
        },
        updatedAt: nowIso,
        updatedBy: currentOperatorName,
      };
    });

    onUpdateAccessConfig(
      {
        ...accessConfig,
        functions: updatedFunctions,
        updatedAt: nowIso,
        updatedBy: currentOperatorName,
      },
      `Niveau d'accès « ${level.toUpperCase()} » appliqué sur « ${point.label} » pour « ${targetFn.functionLabel} ».`
    );
  };

  const handleBulkToggleCategoryForFunction = (
    functionId: string,
    category: 'modules_erp' | 'services_cloud' | 'fonctionnalites_metier',
    enableAll: boolean
  ) => {
    if (!isSuperAdmin) return;
    const targetFn = accessConfig.functions.find((f) => f.functionId === functionId);
    if (!targetFn || targetFn.isLockedSuperAdmin || targetFn.roleId === 'super_admin') return;

    const categoryIds = ACCESS_POINTS_CATALOG.filter(
      (p) => p.category === category && !p.restrictedToAdGenSysAndMoas
    ).map((p) => p.id);
    const nowIso = new Date().toISOString();

    const updatedFunctions = accessConfig.functions.map((fn) => {
      if (fn.functionId !== functionId) return fn;
      const nextLevelMap = { ...(fn.accessLevelByPoint || {}) };
      categoryIds.forEach((id) => {
        nextLevelMap[id] = enableAll ? 'write' : 'none';
      });
      return {
        ...fn,
        allowedModules:
          category === 'modules_erp' ? (enableAll ? categoryIds : ['mod_dashboard']) : fn.allowedModules,
        allowedServices:
          category === 'services_cloud' ? (enableAll ? categoryIds : []) : fn.allowedServices,
        allowedFeatures:
          category === 'fonctionnalites_metier' ? (enableAll ? categoryIds : []) : fn.allowedFeatures,
        accessLevelByPoint: nextLevelMap,
        updatedAt: nowIso,
        updatedBy: currentOperatorName,
      };
    });

    onUpdateAccessConfig(
      {
        ...accessConfig,
        functions: updatedFunctions,
        updatedAt: nowIso,
        updatedBy: currentOperatorName,
      },
      `${enableAll ? 'Activation complète' : 'Restriction'} de la catégorie pour la fonction « ${targetFn.functionLabel} ».`
    );
  };

  const handleCreateCustomFunction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    const cleanLabel = newFnLabel.trim();
    if (!cleanLabel) return;

    const baseFn =
      accessConfig.functions.find((f) => f.roleId === newFnBaseRole) || accessConfig.functions[1];
    const nowIso = new Date().toISOString();
    const newFn: FunctionAccessPolicy = {
      functionId: `fn_custom_${Date.now()}`,
      functionLabel: cleanLabel,
      roleId: newFnBaseRole,
      department: newFnDepartment.trim() || 'Direction Opérationnelle',
      description:
        newFnDescription.trim() ||
        `Fonction personnalisée créée par le Super-Admin (basée sur le profil ${baseFn.functionLabel}).`,
      isCustomFunction: true,
      allowedModules: [...baseFn.allowedModules],
      allowedServices: [...baseFn.allowedServices],
      allowedFeatures: [...baseFn.allowedFeatures],
      accessLevelByPoint: { ...baseFn.accessLevelByPoint },
      updatedAt: nowIso,
      updatedBy: currentOperatorName,
    };

    const nextConfig: TenantAccessPointsConfig = {
      ...accessConfig,
      functions: [...accessConfig.functions, newFn],
      updatedAt: nowIso,
      updatedBy: currentOperatorName,
    };

    onUpdateAccessConfig(
      nextConfig,
      `Nouvelle fonction métier « ${cleanLabel} » ajoutée au référentiel des points d'accès.`
    );
    setSelectedFunctionId(newFn.functionId);
    setNewFnLabel('');
    setNewFnDescription('');
    setShowNewFnForm(false);
  };

  const handleToggleUserOverridePoint = (userAcc: LocalAccountRecord, point: AccessPointItemDefinition) => {
    if (!isSuperAdmin || userAcc.role === 'super_admin') return;
    const nowIso = new Date().toISOString();
    const existing: UserSpecificAccessOverride = accessConfig.userOverrides?.[userAcc.id] || {
      accountId: userAcc.id,
      fullName: userAcc.fullName,
      email: userAcc.email,
      functionId: selectedFunction.functionId,
      enabled: true,
      grantedPoints: [],
      revokedPoints: [],
      updatedAt: nowIso,
      updatedBy: currentOperatorName,
    };

    const effective = resolveEffectiveAccessForAccount(userAcc, accessConfig);
    const baseFnHasPoint = isPointEnabledInFunction(effective.matchedFunction, point.id);
    const currentlyGranted =
      (baseFnHasPoint && !existing.revokedPoints.includes(point.id)) ||
      existing.grantedPoints.includes(point.id);

    let nextGranted = [...existing.grantedPoints];
    let nextRevoked = [...existing.revokedPoints];

    if (currentlyGranted) {
      nextGranted = nextGranted.filter((id) => id !== point.id);
      if (baseFnHasPoint && !nextRevoked.includes(point.id)) {
        nextRevoked.push(point.id);
      }
    } else {
      nextRevoked = nextRevoked.filter((id) => id !== point.id);
      if (!baseFnHasPoint && !nextGranted.includes(point.id)) {
        nextGranted.push(point.id);
      }
    }

    const nextConfig: TenantAccessPointsConfig = {
      ...accessConfig,
      userOverrides: {
        ...(accessConfig.userOverrides || {}),
        [userAcc.id]: {
          ...existing,
          enabled: true,
          grantedPoints: nextGranted,
          revokedPoints: nextRevoked,
          updatedAt: nowIso,
          updatedBy: currentOperatorName,
        },
      },
      updatedAt: nowIso,
      updatedBy: currentOperatorName,
    };

    onUpdateAccessConfig(
      nextConfig,
      `Droit d'accès individuel « ${point.label} » ${currentlyGranted ? 'retiré' : 'attribué'} pour ${userAcc.fullName}.`
    );
  };

  const handleResetToDefaultMatrix = () => {
    if (!isSuperAdmin) return;
    const nextConfig: TenantAccessPointsConfig = {
      tenantId,
      companyName,
      functions: buildDefaultFunctionAccessPolicies(),
      userOverrides: {},
      updatedAt: new Date().toISOString(),
      updatedBy: currentOperatorName,
    };
    onUpdateAccessConfig(
      nextConfig,
      'Matrice des points d’accès réinitialisée aux profils standards de l’entreprise.'
    );
  };

  const handleExportAccessMatrixToCSV = () => {
    const headers = [
      'Code_Point_Acces',
      'Categorie',
      'Module_Service_Fonctionnalite',
      ...accessConfig.functions.map((f) => f.functionLabel.replace(/;/g, ',')),
    ];
    const lines = [headers.join(';')];
    ACCESS_POINTS_CATALOG.forEach((pt) => {
      const row = [
        pt.code,
        pt.category === 'modules_erp'
          ? 'Module ERP'
          : pt.category === 'services_cloud'
          ? 'Service Cloud'
          : 'Fonctionnalite Metier',
        `"${pt.label.replace(/"/g, '""')}"`,
        ...accessConfig.functions.map((fn) =>
          isPointEnabledInFunction(fn, pt.id)
            ? `AUTORISE (${(fn.accessLevelByPoint?.[pt.id] || 'write').toUpperCase()})`
            : 'BLOQUE'
        ),
      ];
      lines.push(row.join(';'));
    });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Matrice_Points_Acces_${companyName.replace(/\s+/g, '_')}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* En-tête Souverain du Module Paramétrage des Points d'Accès */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-[#0A2558] to-slate-900 p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-mono">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>GOUVERNANCE SOUVERAINE SUPER-ADMIN</span>
              <span>·</span>
              <span>MATRICE RBAC PAR FONCTION, MODULE, SERVICE &amp; FONCTIONNALITÉ</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Paramétrage des Points d&apos;Accès
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              Définissez avec précision les droits d&apos;accès des utilisateurs de <strong className="text-white">{companyName}</strong> en fonction des différents <strong className="text-amber-300">modules applicatifs</strong>, <strong className="text-sky-300">services Cloud (Stripe, Twilio, Vercel)</strong> et <strong className="text-emerald-300">fonctionnalités métier</strong>, selon les différentes fonctions exercées au sein de l&apos;entreprise.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportAccessMatrixToCSV}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter Matrice CSV</span>
            </button>
            {isSuperAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setShowNewFnForm((v) => !v)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nouvelle Fonction d&apos;Utilisateur</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToDefaultMatrix}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Restaurer les droits d'accès par défaut"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Réinitialiser</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Synthèse chiffrée en temps réel */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-slate-300 font-medium">Fonctions d&apos;Utilisateurs Configurées</div>
            <div className="text-lg font-extrabold font-mono text-white mt-0.5">
              {accessConfig.functions.length} fonctions
            </div>
            <div className="text-[11px] text-slate-400">
              Hiérarchie &amp; profils métiers actifs
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-slate-300 font-medium">Modules ERP Contrôlés</div>
            <div className="text-lg font-extrabold font-mono text-sky-300 mt-0.5">
              {ACCESS_POINTS_CATALOG.filter((p) => p.category === 'modules_erp').length} modules
            </div>
            <div className="text-[11px] text-slate-400">
              Navigation &amp; espaces opérationnels
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-slate-300 font-medium">Services Cloud &amp; Connecteurs</div>
            <div className="text-lg font-extrabold font-mono text-amber-300 mt-0.5">
              {ACCESS_POINTS_CATALOG.filter((p) => p.category === 'services_cloud').length} services
            </div>
            <div className="text-[11px] text-slate-400">
              Stripe, Twilio &amp; Vercel Edge
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-slate-300 font-medium">Fonctionnalités &amp; Actions Métier</div>
            <div className="text-lg font-extrabold font-mono text-emerald-300 mt-0.5">
              {ACCESS_POINTS_CATALOG.filter((p) => p.category === 'fonctionnalites_metier').length} capacités
            </div>
            <div className="text-[11px] text-slate-400">
              Validations, règlements, paie, audits
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire de création d'une nouvelle Fonction d'Utilisateur par le Super-Admin */}
      {showNewFnForm && isSuperAdmin && (
        <form
          onSubmit={handleCreateCustomFunction}
          className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-slate-900 p-5 space-y-4 text-xs shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-amber-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Ajouter une Nouvelle Fonction d&apos;Utilisateur au Référentiel des Points d&apos;Accès
              </h3>
              <p className="text-[11px] text-slate-500">
                Créez un poste ou une fonction spécifique (ex. Conducteur de Travaux, Chef Magasinier, Contrôleur Budgétaire, Responsable RH) et personnalisez ses points d&apos;accès.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewFnForm(false)}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold cursor-pointer"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Intitulé de la Fonction *
              </label>
              <input
                type="text"
                required
                value={newFnLabel}
                onChange={(e) => setNewFnLabel(e.target.value)}
                placeholder="Ex: Conducteur de Travaux Principal"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Département / Direction
              </label>
              <input
                type="text"
                value={newFnDepartment}
                onChange={(e) => setNewFnDepartment(e.target.value)}
                placeholder="Ex: Direction Technique & Chantiers"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Profil de Base Hérité
              </label>
              <select
                value={newFnBaseRole}
                onChange={(e) => setNewFnBaseRole(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold text-slate-900 dark:text-white"
              >
                <option value="manager">Directeur / Chef de Projet</option>
                <option value="accountant">Responsable Financier / Comptable</option>
                <option value="collaborator">Collaborateur / Ingénieur</option>
                <option value="viewer">Auditeur / Lecture Seule</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Périmètre de Responsabilité
              </label>
              <input
                type="text"
                value={newFnDescription}
                onChange={(e) => setNewFnDescription(e.target.value)}
                placeholder="Description des attributions..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
            >
              Créer la Fonction et Configurer ses Points d&apos;Accès
            </button>
          </div>
        </form>
      )}

      {/* Barre de sélection du mode d'administration des Points d'Accès */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveViewMode('by_function')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeViewMode === 'by_function'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            1. Paramétrage par Fonction d&apos;Utilisateur
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('global_matrix')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeViewMode === 'global_matrix'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            2. Matrice Croisée Globale (Fonctions × Points d&apos;Accès)
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('by_user')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeViewMode === 'by_user'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            3. Attribution &amp; Droits par Collaborateur ({collaborators.length})
          </button>
        </div>

        {/* Filtres par Catégorie (Modules, Services, Fonctionnalités) + Recherche */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="all">Tous les Points d&apos;Accès ({ACCESS_POINTS_CATALOG.length})</option>
            <option value="modules_erp">
              Modules de l&apos;Application ({ACCESS_POINTS_CATALOG.filter((p) => p.category === 'modules_erp').length})
            </option>
            <option value="services_cloud">
              Services Cloud Stripe/Twilio/Vercel ({ACCESS_POINTS_CATALOG.filter((p) => p.category === 'services_cloud').length})
            </option>
            <option value="fonctionnalites_metier">
              Fonctionnalités Métier ({ACCESS_POINTS_CATALOG.filter((p) => p.category === 'fonctionnalites_metier').length})
            </option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer un module, service, droit..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 w-56"
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODE 1 : PARAMÉTRAGE DÉTAILLÉ PAR FONCTION D'UTILISATEUR
      ===================================================================== */}
      {activeViewMode === 'by_function' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Colonne gauche : Liste des Fonctions d'Utilisateurs */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 px-1">
              Fonctions des Utilisateurs ({accessConfig.functions.length})
            </div>
            <div className="space-y-2.5">
              {accessConfig.functions.map((fn) => {
                const isSelected = fn.functionId === selectedFunction.functionId;
                const enabledCount =
                  fn.allowedModules.length + fn.allowedServices.length + fn.allowedFeatures.length;
                const matchingUsersCount = collaborators.filter(
                  (c) =>
                    c.functionTitle?.trim().toLowerCase() === fn.functionLabel.trim().toLowerCase() ||
                    c.role === fn.roleId
                ).length;

                return (
                  <button
                    key={fn.functionId}
                    type="button"
                    onClick={() => setSelectedFunctionId(fn.functionId)}
                    className={`w-full text-left p-4 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-500 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {fn.functionLabel}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {fn.department} · {matchingUsersCount} utilisateur(s)
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                        {enabledCount}/{ACCESS_POINTS_CATALOG.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                      {fn.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colonne droite : Points d'Accès de la Fonction sélectionnée */}
          <div className="lg:col-span-8 space-y-5">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold">
                    FONCTION SÉLECTIONNÉE · {selectedFunction.department.toUpperCase()}
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {selectedFunction.functionLabel}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedFunction.description}</p>
                </div>

                {selectedFunction.isLockedSuperAdmin ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Accès Intégral Souverain (Non restreignable)</span>
                  </div>
                ) : (
                  isSuperAdmin && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          handleBulkToggleCategoryForFunction(selectedFunction.functionId, 'modules_erp', true);
                          handleBulkToggleCategoryForFunction(selectedFunction.functionId, 'services_cloud', true);
                          handleBulkToggleCategoryForFunction(
                            selectedFunction.functionId,
                            'fonctionnalites_metier',
                            true
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                      >
                        Tout Autoriser
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleBulkToggleCategoryForFunction(selectedFunction.functionId, 'services_cloud', false);
                          handleBulkToggleCategoryForFunction(
                            selectedFunction.functionId,
                            'fonctionnalites_metier',
                            false
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                      >
                        Restreindre en Lecture Seule
                      </button>
                    </div>
                  )
                )}
              </div>

              {/* Groupes : 1. Modules ERP, 2. Services Cloud, 3. Fonctionnalités Métier */}
              {(
                [
                  {
                    cat: 'modules_erp' as const,
                    title: '1. Modules Principaux de l’Application (Points d’Accès Navigation)',
                    subtitle: 'Définit quels onglets et espaces de travail sont visibles et accessibles pour cette fonction.',
                  },
                  {
                    cat: 'services_cloud' as const,
                    title: '2. Services Cloud & Intégrations Temps Réel (Stripe, Twilio, Vercel)',
                    subtitle: 'Définit l’accès aux consoles de paiement Stripe, de messagerie Twilio et d’infrastructure Vercel.',
                  },
                  {
                    cat: 'fonctionnalites_metier' as const,
                    title: '3. Fonctionnalités & Capacités Opérationnelles Granulaires',
                    subtitle: 'Définit les actions sensibles autorisées (validation de factures, encaissements, audits CSV, stocks, paie).',
                  },
                ] as const
              )
                .filter((g) => categoryFilter === 'all' || categoryFilter === g.cat)
                .map((group) => {
                  const groupPoints = filteredAccessPoints.filter((p) => p.category === group.cat);
                  if (groupPoints.length === 0) return null;

                  return (
                    <div key={group.cat} className="space-y-3 pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {group.title}
                          </h3>
                          <p className="text-[11px] text-slate-500">{group.subtitle}</p>
                        </div>
                        {!selectedFunction.isLockedSuperAdmin && isSuperAdmin && (
                          <div className="flex items-center gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={() =>
                                handleBulkToggleCategoryForFunction(selectedFunction.functionId, group.cat, true)
                              }
                              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                            >
                              Activer tout le groupe
                            </button>
                            <span className="text-slate-300">·</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleBulkToggleCategoryForFunction(selectedFunction.functionId, group.cat, false)
                              }
                              className="text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                            >
                              Désactiver le groupe
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        {groupPoints.map((pt) => {
                          const enabled = isPointEnabledInFunction(selectedFunction, pt.id);
                          const currentLevel = pt.restrictedToAdGenSysAndMoas
                            ? 'none'
                            : selectedFunction.isLockedSuperAdmin
                              ? 'full'
                              : enabled
                                ? selectedFunction.accessLevelByPoint?.[pt.id] || 'write'
                                : 'none';

                          return (
                            <div
                              key={pt.id}
                              className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                                pt.restrictedToAdGenSysAndMoas
                                  ? 'bg-rose-50/50 dark:bg-rose-950/20'
                                  : enabled
                                    ? 'bg-white dark:bg-slate-900'
                                    : 'bg-slate-50/70 dark:bg-slate-950/60 opacity-75'
                              }`}
                            >
                              <div className="space-y-0.5 pr-3">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-mono text-[10px] font-bold text-slate-400">
                                    {pt.code}
                                  </span>
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {pt.label}
                                  </span>
                                  {pt.restrictedToAdGenSysAndMoas && (
                                    <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] font-extrabold uppercase">
                                      Exclusivité L&apos;AdGenSys &amp; MOAS
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500">{pt.description}</p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {pt.restrictedToAdGenSysAndMoas ? (
                                  <span className="px-3 py-1.5 rounded-lg bg-rose-950/90 border border-rose-500/60 text-rose-200 text-[11px] font-bold flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                                    <span>Réservé L&apos;AdGenSys &amp; MOAS</span>
                                  </span>
                                ) : (
                                  <>
                                    <select
                                      disabled={!isSuperAdmin || Boolean(selectedFunction.isLockedSuperAdmin)}
                                      value={currentLevel}
                                      onChange={(e) =>
                                        handleSetAccessLevelForFunctionPoint(
                                          selectedFunction.functionId,
                                          pt,
                                          e.target.value as 'none' | 'read' | 'write' | 'full'
                                        )
                                      }
                                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 disabled:opacity-60"
                                    >
                                      <option value="none">Aucun accès (Verrouillé)</option>
                                      <option value="read">Consultation (Lecture seule)</option>
                                      <option value="write">Exécution &amp; Saisie (Lecture / Écriture)</option>
                                      <option value="full">Contrôle Complet (Validation &amp; Admin)</option>
                                    </select>

                                    <button
                                      type="button"
                                      disabled={!isSuperAdmin || Boolean(selectedFunction.isLockedSuperAdmin)}
                                      onClick={() =>
                                        handleTogglePointForFunction(selectedFunction.functionId, pt)
                                      }
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed ${
                                        enabled
                                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                          : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      {enabled ? (
                                        <>
                                          <Unlock className="w-3.5 h-3.5" />
                                          <span>Autorisé</span>
                                        </>
                                      ) : (
                                        <>
                                          <Lock className="w-3.5 h-3.5" />
                                          <span>Bloqué</span>
                                        </>
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODE 2 : MATRICE CROISÉE GLOBALE (FONCTIONS × MODULES / SERVICES / FONCTIONNALITÉS)
      ===================================================================== */}
      {activeViewMode === 'global_matrix' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Matrice Croisée des Points d&apos;Accès par Fonction d&apos;Utilisateur
              </h2>
              <p className="text-xs text-slate-500">
                Cliquez directement sur une cellule pour accorder ou révoquer l&apos;accès d&apos;une fonction à un module, un service ou une fonctionnalité.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500">
              Dernière mise à jour : {new Date(accessConfig.updatedAt).toLocaleString('fr-FR')} par {accessConfig.updatedBy}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] uppercase">
                  <th className="py-3 px-4 min-w-[260px]">Point d&apos;Accès (Module / Service / Fonctionnalité)</th>
                  <th className="py-3 px-3">Catégorie</th>
                  {accessConfig.functions.map((fn) => (
                    <th key={fn.functionId} className="py-3 px-3 text-center min-w-[140px]">
                      <div>{fn.functionLabel}</div>
                      <div className="text-[9px] font-mono text-slate-400 font-normal mt-0.5">
                        {fn.department}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredAccessPoints.map((pt) => (
                  <tr key={pt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{pt.label}</div>
                      <div className="text-[10px] font-mono text-slate-400">{pt.code}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {pt.category === 'modules_erp'
                        ? 'Module ERP'
                        : pt.category === 'services_cloud'
                        ? 'Service Cloud'
                        : 'Fonctionnalité'}
                    </td>
                    {accessConfig.functions.map((fn) => {
                      const enabled = isPointEnabledInFunction(fn, pt.id);
                      const locked = Boolean(fn.isLockedSuperAdmin || fn.roleId === 'super_admin');
                      return (
                        <td key={fn.functionId} className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            disabled={!isSuperAdmin || locked}
                            onClick={() => handleTogglePointForFunction(fn.functionId, pt)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer disabled:cursor-not-allowed ${
                              enabled
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {enabled ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Autorisé</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>Bloqué</span>
                              </>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODE 3 : ATTRIBUTION DE FONCTION & DROITS SPÉCIFIQUES PAR COLLABORATEUR
      ===================================================================== */}
      {activeViewMode === 'by_user' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 px-1">
              Collaborateurs de l&apos;Entreprise ({collaborators.length})
            </div>
            <div className="space-y-2">
              {collaborators.map((collab) => {
                const isSelected = collab.id === selectedUserId;
                const effective = resolveEffectiveAccessForAccount(collab, accessConfig);
                return (
                  <button
                    key={collab.id}
                    type="button"
                    onClick={() => setSelectedUserId(collab.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-500'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {collab.fullName}
                      </span>
                      <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                        {effective.allowedTabs.length} onglets actifs
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Fonction : <strong className="text-slate-700 dark:text-slate-300">{collab.functionTitle || effective.matchedFunction.functionLabel}</strong>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {collab.email}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-8">
            {(() => {
              const targetUser =
                collaborators.find((c) => c.id === selectedUserId) || collaborators[0];
              if (!targetUser) {
                return (
                  <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-xs text-slate-500">
                    Aucun collaborateur enregistré pour le moment.
                  </div>
                );
              }
              const effective = resolveEffectiveAccessForAccount(targetUser, accessConfig);

              return (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                        HABILITATIONS INDIVIDUELLES &amp; FONCTION D&apos;UTILISATEUR
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {targetUser.fullName} ({targetUser.email})
                      </h3>
                      <p className="text-slate-500 mt-0.5">
                        Fonction rattachée : <strong>{effective.matchedFunction.functionLabel}</strong> · {effective.allowedTabs.length} module(s)/service(s) autorisé(s)
                      </p>
                    </div>

                    {isSuperAdmin && targetUser.role !== 'super_admin' && onAssignUserFunction && (
                      <div className="flex items-center gap-2">
                        <label className="font-bold text-slate-600 dark:text-slate-300">
                          Changer de Fonction :
                        </label>
                        <select
                          value={effective.matchedFunction.functionId}
                          onChange={(e) => {
                            const chosenFn = accessConfig.functions.find(
                              (f) => f.functionId === e.target.value
                            );
                            if (chosenFn) {
                              onAssignUserFunction(
                                targetUser.id,
                                chosenFn.roleId as LocalAccountRecord['role'],
                                chosenFn.functionLabel,
                                chosenFn.department
                              );
                            }
                          }}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-semibold text-slate-900 dark:text-white"
                        >
                          {accessConfig.functions
                            .filter((f) => !f.isLockedSuperAdmin)
                            .map((f) => (
                              <option key={f.functionId} value={f.functionId}>
                                {f.functionLabel} ({f.department})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {filteredAccessPoints.map((pt) => {
                      const override = accessConfig.userOverrides?.[targetUser.id];
                      const baseHas = isPointEnabledInFunction(effective.matchedFunction, pt.id);
                      const isGranted =
                        targetUser.role === 'super_admin' ||
                        (baseHas && !override?.revokedPoints?.includes(pt.id)) ||
                        Boolean(override?.grantedPoints?.includes(pt.id));

                      return (
                        <div
                          key={pt.id}
                          className="p-3 flex items-center justify-between gap-3 bg-white dark:bg-slate-900"
                        >
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {pt.label}
                            </div>
                            <div className="text-[11px] text-slate-500">{pt.description}</div>
                          </div>
                          <button
                            type="button"
                            disabled={!isSuperAdmin || targetUser.role === 'super_admin'}
                            onClick={() => handleToggleUserOverridePoint(targetUser, pt)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                              isGranted
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {isGranted ? (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Accès Actif</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Accès Bloqué</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

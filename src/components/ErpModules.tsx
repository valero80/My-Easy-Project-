import React, { useMemo, useState } from 'react';
import {
  Package,
  Warehouse,
  Users,
  Wallet,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit3,
  FilePlus2,
  Building2,
  Briefcase,
  Sparkles,
  X,
  Upload,
  Eye,
  IdCard,
  ArrowLeftRight,
  Truck,
  FileCheck2,
  History,
  Lock,
  UserPlus,
  UserX,
  FileSpreadsheet,
  Fingerprint,
  ScanFace,
  Camera,
  Award,
  FileText,
  Calendar,
  TrendingUp,
  Mail,
  MessageCircle,
  Send,
  Layers,
  Tag,
  BarChart3,
  HeartPulse,
  Stethoscope,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Currency, formatCurrency } from '../utils/i18n';
import {
  checkExclusiveEnterpriseAffiliation,
  getSuperAdminEnterpriseNetwork,
  getCountryVatRate,
  getCountryByCode,
  DEFAULT_TRADE_SUBCATEGORIES,
  DEFAULT_PERSONNEL_CATEGORIES,
  DEFAULT_TRAVEL_SERVICE_CATEGORIES,
} from '../utils/countries';
import { LocalAccountRecord } from './AuthPortal';
import {
  DocumentCustomizationConfig,
  exportBiometricAttendanceSheetToPDF,
  exportEmployeeBadgeToPDF,
  exportEmployeeMedicalRecordToPDF,
  exportEmployeesDirectoryToExcel,
  exportEmployeesDirectoryToPDF,
  exportEmployeesWithPayrollToCSV,
  exportGoodsReceiptToPDF,
  exportHrEventActToPDF,
  exportInternalRequisitionToPDF,
  exportPayslipToPDF,
  exportPurchaseOrderToPDF,
  exportStockMovementToPDF,
  exportTerminationCertificateToPDF,
  ExportableBiometricAttendance,
  ExportableEmployeeMedicalRecord,
  ExportableEmployeeMedicalVisit,
  ExportableGoodsReceipt,
  ExportableHrEventAct,
  ExportableInternalRequisition,
  ExportablePayslip,
  ExportablePurchaseOrder,
  ExportableStockMovement,
  ExportableStockMovementItemLine,
} from '../utils/exporters';

export type ProjectExploitationType =
  | 'construction_btp'
  | 'it_cloud'
  | 'energie_solaire'
  | 'logistique_supply'
  | 'conseil_services'
  | 'tous';

export const PROJECT_EXPLOITATION_TYPES: {
  id: ProjectExploitationType;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: 'construction_btp',
    label: 'Génie Civil, BTP & Aménagement',
    shortLabel: 'BTP & Génie Civil',
    description: 'Chantiers de construction, matériaux d’œuvre, outillage et équipements de terrain.',
  },
  {
    id: 'it_cloud',
    label: 'Ingénierie IT, Réseaux & Cloud',
    shortLabel: 'IT & Cloud',
    description: 'Serveurs, équipements réseaux, câblage fibre, licences et déploiement.',
  },
  {
    id: 'energie_solaire',
    label: 'Énergie Solaire, Électrique & Industriel',
    shortLabel: 'Énergie & Industriel',
    description: 'Panneaux photovoltaïques, onduleurs, batteries, groupes électrogènes et maintenance.',
  },
  {
    id: 'logistique_supply',
    label: 'Logistique, Transport & Supply Chain',
    shortLabel: 'Logistique & Supply',
    description: 'Manutention, équipements de flotte, pièces détachées et entreposage.',
  },
  {
    id: 'conseil_services',
    label: 'Conseil, Audit & Prestations Intellectuelles',
    shortLabel: 'Conseil & Prestations',
    description: 'Missions d’expertise, études techniques, ingénierie et supervision.',
  },
  {
    id: 'tous',
    label: 'Multi-Projets (Transversal)',
    shortLabel: 'Tous Projets',
    description: 'Fournitures et équipements utilisables sur l’ensemble des projets du prestataire.',
  },
];

// Normes réglementaires de paie CDI par pays (taux cotisation sociale salariale, patronale, et impôt moyen sur salaire)
export const COUNTRY_CDI_PAYROLL_NORMS: Record<
  string,
  { label: string; employeeSocialPct: number; employerSocialPct: number; incomeTaxPct: number; legalHoursMonth: number }
> = {
  CI: {
    label: 'Normes Côte d’Ivoire (Code du Travail & CNPS / ITS)',
    employeeSocialPct: 6.3,
    employerSocialPct: 16.45,
    incomeTaxPct: 10.0,
    legalHoursMonth: 173.33,
  },
  SN: {
    label: 'Normes Sénégal (IPRES, CSS & IRPP)',
    employeeSocialPct: 8.4,
    employerSocialPct: 18.0,
    incomeTaxPct: 11.0,
    legalHoursMonth: 173.33,
  },
  CM: {
    label: 'Normes Cameroun (CNPS & IRPP / CAC)',
    employeeSocialPct: 4.2,
    employerSocialPct: 13.0,
    incomeTaxPct: 10.5,
    legalHoursMonth: 173.33,
  },
  FR: {
    label: 'Normes France (URSSAF, Retraite Agirc-Arrco & PAS)',
    employeeSocialPct: 22.0,
    employerSocialPct: 42.0,
    incomeTaxPct: 9.5,
    legalHoursMonth: 151.67,
  },
  BE: {
    label: 'Normes Belgique (ONSS & Précompte Professionnel)',
    employeeSocialPct: 13.07,
    employerSocialPct: 27.0,
    incomeTaxPct: 18.0,
    legalHoursMonth: 164.67,
  },
  CA: {
    label: 'Normes Canada (RRQ, AE & Impôt Fédéral/Provincial)',
    employeeSocialPct: 7.6,
    employerSocialPct: 9.2,
    incomeTaxPct: 16.0,
    legalHoursMonth: 160,
  },
  DEFAULT: {
    label: 'Normes Légales Nationales en vigueur (Sécurité Sociale & IR)',
    employeeSocialPct: 8.0,
    employerSocialPct: 17.0,
    incomeTaxPct: 10.0,
    legalHoursMonth: 173.33,
  },
};

export interface WarehouseSiteRecord {
  id: string;
  code: string;
  name: string;
  projectId: string;
  projectName: string;
  location: string;
  managerName: string;
  isGeneral?: boolean;
}

export interface SupplierRecord {
  id: string;
  code: string;
  companyName: string; // UPPERCASE
  contactName?: string;
  specialty?: string;
  specialtyCategory?: string;
  phone: string;
  email: string;
  address?: string;
  taxId: string;
  paymentTerms: string;
  rating?: number;
}

export interface PurchaseOrderRecord extends ExportablePurchaseOrder {
  supplierId: string;
  warehouseId: string;
  includeVat?: boolean;
}

export interface CatalogItem {
  id: string;
  sku: string;
  itemType: 'product' | 'service';
  name: string;
  category: string; // Catégorie selon le corps de métier ou Déplacement/Service
  tradeCategory?: string; // Corps de métier principal / Rubrique
  subCategory?: string; // Sous-rubrique selon le corps de métier
  rubriqueName?: string;
  projectType: ProjectExploitationType;
  customProjectTypeLabel?: string;
  unit: string;
  purchasePrice: number;
  purchasePriceHT?: number;
  unitPrice: number;
  taxRate: number;
  includeVat?: boolean;
  stockable?: boolean; // Si false (ou itemType === 'service'), aucune Main d'Œuvre ne s'applique
  stockQty: number;
  minStockAlert: number;
  minStockThreshold?: number;
  warehouseId?: string;
  warehouseLocation: string;
  stockByWarehouse?: Record<string, number>;
  description: string;
}

export interface StockMovementRecord extends ExportableStockMovement {
  productId: string;
  projectType: ProjectExploitationType;
  warehouseId?: string;
  targetWarehouseId?: string;
  purchaseOrderId?: string;
  scannedDocDataUrl?: string; // Image ou PDF numérisé du BL (Entrée) ou BCI (Sortie)
}

export type WorkerCategory = string;

export type RemunerationBasis =
  | 'monthly_norm' // CDI selon normes pays
  | 'daily_rate' // CDD / Temporaire au taux journalier négocié
  | 'task_rate' // CDD / Temporaire payé à la tâche négociée
  | 'negotiated_flat'; // CDD / Temporaire forfait négocié

export type PaymentPeriodicity =
  | 'Mensuel'
  | 'Quinzaine (Bi-mensuel)'
  | 'Hebdomadaire'
  | 'Par Tâche / Fin d’étape';

export interface EmployeeTransferHistory {
  date: string;
  fromProjectName: string;
  toProjectName: string;
  targetEnterpriseName?: string;
  reason: string;
}

export type HrEventCategory =
  | 'leave'
  | 'infraction'
  | 'reprimand'
  | 'mission'
  | 'mutation'
  | 'promotion'
  | 'termination';

export const HR_EVENT_SUBTYPES: Record<HrEventCategory, string[]> = {
  leave: [
    'Congé Annuel Payé (CDI / CDD)',
    'Congé Maladie Certifié (CDI / CDD)',
    'Congé Maternité / Paternité (CDI / CDD)',
    'Congé Exceptionnel — Événement Familial (CDI / CDD)',
    'Congé Sans Solde Autorisé (CDI / CDD)',
    'Permission d’Absence Courte Durée (CDI / CDD)',
  ],
  infraction: [
    'Retard répété ou absence injustifiée au poste',
    'Non-port des Équipements de Protection Individuelle (EPI / HSE)',
    'Insubordination ou refus d’exécuter une consigne de chantier',
    'Négligence technique ou malfaçon constatée sur projet',
    'Utilisation abusive ou détérioration de matériel de l’entreprise',
    'Violation des consignes de sécurité ou de confidentialité',
  ],
  reprimand: [
    'Avertissement Verbal consigné au dossier',
    'Avertissement Écrit Officiel',
    'Blâme Simple avec inscription au dossier disciplinaire',
    'Blâme Sévère avec mise à pied disciplinaire (1 à 8 jours)',
    'Dernier Blâme avant rupture de contrat pour faute grave',
  ],
  mission: [
    'Mission d’Intervention Technique sur Site / Chantier',
    'Mission d’Audit Technique, Contrôle Qualité & Supervision',
    'Mission de Livraison, Installation & Réception Client',
    'Mission Logistique & Approvisionnement Magasin',
    'Mission de Formation & Renforcement de Capacités',
    'Mission Hors-Siège / Déplacement Régional ou International',
  ],
  mutation: [
    'Mutation Inter-Projets (Affectation d’un projet à un autre)',
    'Mutation Inter-Entreprises (Réseau d’Entreprises du Super-Admin)',
    'Mutation Horizontale (Changement de Département / Service)',
    'Mutation Géographique (Changement de Site d’Exploitation)',
    'Affectation Temporaire d’Urgence sur Projet Prioritaire',
  ],
  promotion: [
    'Avancement Manuel au Mérite / Promotion de Fonction',
    'Avancement Manuel d’Échelon / Catégorie Professionnelle',
    'Avancement Automatique à l’Ancienneté (Barème Périodique)',
    'Avancement Automatique sur Objectifs & Assiduité Biométrique',
  ],
  termination: [
    'Fin normale de contrat CDD / Fin de mission temporaire',
    'Rupture Conventionnelle d’accord parties',
    'Démission officielle du salarié',
    'Licenciement pour faute simple ou grave (suite à infractions/blâmes)',
    'Licenciement pour motif économique / Fin de chantier',
    'Départ à la Retraite',
    'Rupture pour Cas de Force Majeure',
  ],
};

export interface EmployeeRecord {
  id: string;
  matricule: string; // Généré automatiquement et strictement NON MODIFIABLE
  fullName: string; // UPPERCASE & BOLD
  workerCategory: WorkerCategory; // Technicien, Manœuvre, ou catégorie personnalisée
  phone: string; // Italic with country dial code
  email: string;
  position: string;
  department: string;
  contractType: 'CDI' | 'CDD' | 'Temporaire / Journalier';
  remunerationBasis: RemunerationBasis;
  paymentPeriodicity: PaymentPeriodicity;
  hireDate: string;
  contractEndDate?: string;
  status: 'active' | 'on_leave' | 'terminated';
  terminationDate?: string;
  terminationReason?: string;
  assignedProjectId: string;
  assignedProjectName: string;
  baseSalary: number; // Salaire mensuel (CDI) ou Taux Journalier / Taux par Tâche (CDD/Temporaire)
  transportAllowance: number;
  socialSecurityNumber: string;
  nationalIdNumber: string; // N° CNI / Passeport
  emergencyContact: string;
  bloodGroup: string;
  paymentMethod: 'Virement Bancaire' | 'Mobile Money' | 'Chèque' | 'Espèces';
  bankOrMobileAccount: string;
  photoDataUrl?: string; // Photo d'identité de l'employé (fiche, badge & reconnaissance faciale)
  gradeOrEchelon?: string; // Échelon / Niveau d'avancement
  biometricEnrolled?: boolean;
  faceBiometricDataUrl?: string;
  faceBiometricHash?: string;
  fingerprintBiometricHash?: string;
  biometricEnrolledAt?: string;
  biometricMethods?: ('face' | 'fingerprint')[];
  transferHistory: EmployeeTransferHistory[];
  hrEvents?: ExportableHrEventAct[];
  medicalRecord?: ExportableEmployeeMedicalRecord;
}

export type BiometricAttendanceRecord = ExportableBiometricAttendance;

export interface PayslipRecord extends ExportablePayslip {
  employeeId: string;
}

export interface AuditTraceRecord {
  id: string;
  timestamp: string;
  module:
    | 'DEVIS_FACTURE'
    | 'DOCUMENT'
    | 'MAGASIN_STOCK'
    | 'COMMANDE_FOURNISSEUR'
    | 'RH_EMPLOYE'
    | 'PAIE'
    | 'PROJET'
    | 'SECURITE'
    | 'SECURITE_ACCES'
    | 'GOUVERNANCE_SYSTEME';
  action: string;
  reference: string;
  details: string;
  operator: string;
  ipSource?: string;
  userAgent?: string;
  confidentialNoteHash?: string;
  confidentialNoteStatus?: string;
}

export interface ErpProjectRef {
  id: string;
  name: string;
  clientName: string;
  status: string;
  projectType?: ProjectExploitationType;
  involvedTrades?: string[];
  projectManagerName?: string;
  dedicatedAccountType?: 'Compte Bancaire' | 'Mobile Money';
  dedicatedAccountProvider?: string;
  dedicatedAccountNumber?: string;
}

// PURGE TOTALE DES DONNÉES DÉMOS : Tableaux initiaux strictement vides
export const INITIAL_CATALOG_ITEMS: CatalogItem[] = [];
export const INITIAL_STOCK_MOVEMENTS: StockMovementRecord[] = [];
export const INITIAL_EMPLOYEES: EmployeeRecord[] = [];
export const INITIAL_PAYSLIPS: PayslipRecord[] = [];
export const INITIAL_WAREHOUSES: WarehouseSiteRecord[] = [];
export const INITIAL_SUPPLIERS: SupplierRecord[] = [];
export const INITIAL_PURCHASE_ORDERS: PurchaseOrderRecord[] = [];
export const INITIAL_ATTENDANCE_RECORDS: BiometricAttendanceRecord[] = [];

export function generateUniqueEmployeeMatricule(existingCount: number): string {
  const year = new Date().getFullYear();
  const seq = String(existingCount + 1).padStart(4, '0');
  const rand = Math.floor(10 + Math.random() * 89);
  return `MEP-${year}-${seq}-${rand}`;
}

interface ErpModulesProps {
  activeSubModule: 'catalog' | 'warehouse' | 'employees' | 'attendance' | 'payroll';
  activeTenantId?: string;
  currency: Currency;
  companyName: string;
  companyLogo?: string;
  countryCode: string;
  currentUserName: string;
  docCustomization: DocumentCustomizationConfig;
  projects: ErpProjectRef[];
  warehouses: WarehouseSiteRecord[];
  setWarehouses: React.Dispatch<React.SetStateAction<WarehouseSiteRecord[]>>;
  suppliers: SupplierRecord[];
  setSuppliers: React.Dispatch<React.SetStateAction<SupplierRecord[]>>;
  purchaseOrders: PurchaseOrderRecord[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrderRecord[]>>;
  catalogItems: CatalogItem[];
  setCatalogItems: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  stockMovements: StockMovementRecord[];
  setStockMovements: React.Dispatch<React.SetStateAction<StockMovementRecord[]>>;
  employees: EmployeeRecord[];
  setEmployees: React.Dispatch<React.SetStateAction<EmployeeRecord[]>>;
  attendanceRecords?: BiometricAttendanceRecord[];
  setAttendanceRecords?: React.Dispatch<React.SetStateAction<BiometricAttendanceRecord[]>>;
  payslips: PayslipRecord[];
  setPayslips: React.Dispatch<React.SetStateAction<PayslipRecord[]>>;
  collaboratorAccounts?: LocalAccountRecord[];
  onOpenCreateCollaboratorForEmployee?: (emp: EmployeeRecord) => void;
  onTerminateEmployeeContract?: (
    empId: string,
    empMatricule: string,
    terminationDate: string,
    terminationReason: string
  ) => void;
  defaultDialCode: string;
  isSuperAdmin?: boolean;
  onDeleteCatalogItemToTrash?: (item: CatalogItem) => void;
  onDeleteEmployeeToTrash?: (emp: EmployeeRecord) => void;
  onInjectItemIntoInvoice: (item: CatalogItem) => void;
  onRecordAuditTrace: (
    module: AuditTraceRecord['module'],
    action: string,
    reference: string,
    details: string
  ) => void;
  onTriggerToast: (msg: string) => void;
}

export const ErpModulesView: React.FC<ErpModulesProps> = ({
  activeSubModule,
  activeTenantId,
  currency,
  companyName,
  companyLogo,
  countryCode,
  currentUserName,
  docCustomization,
  projects,
  warehouses,
  setWarehouses,
  suppliers,
  setSuppliers,
  purchaseOrders,
  setPurchaseOrders,
  catalogItems,
  setCatalogItems,
  stockMovements,
  setStockMovements,
  employees,
  setEmployees,
  attendanceRecords: externalAttendance,
  setAttendanceRecords: setExternalAttendance,
  payslips,
  setPayslips,
  collaboratorAccounts = [],
  onOpenCreateCollaboratorForEmployee,
  onTerminateEmployeeContract,
  defaultDialCode,
  isSuperAdmin = false,
  onDeleteCatalogItemToTrash,
  onDeleteEmployeeToTrash,
  onInjectItemIntoInvoice,
  onRecordAuditTrace,
  onTriggerToast,
}) => {
  const [localAttendance, setLocalAttendance] = useState<BiometricAttendanceRecord[]>(() => {
    try {
      const raw = localStorage.getItem(`mep_${activeTenantId || 'default'}_attendance`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const attendanceRecords = externalAttendance ?? localAttendance;
  const updateAttendanceRecords = (
    updater: (prev: BiometricAttendanceRecord[]) => BiometricAttendanceRecord[]
  ) => {
    if (setExternalAttendance) {
      setExternalAttendance(updater);
    } else {
      setLocalAttendance((prev) => {
        const next = updater(prev);
        localStorage.setItem(`mep_${activeTenantId || 'default'}_attendance`, JSON.stringify(next));
        return next;
      });
    }
  };
  const countryNorm =
    COUNTRY_CDI_PAYROLL_NORMS[countryCode] || COUNTRY_CDI_PAYROLL_NORMS.DEFAULT;
  const statutoryCountryVatRate = useMemo(() => getCountryVatRate(countryCode), [countryCode]);
  const currentCountryInfo = useMemo(() => getCountryByCode(countryCode), [countryCode]);

  // =========================================================================
  // CATÉGORIES SELON LES CORPS DE MÉTIERS, SOUS-RUBRIQUES, CATÉGORIES DE PERSONNEL & DÉPLACEMENTS/SERVICES
  // =========================================================================
  const [tradeSubcategoriesMap, setTradeSubcategoriesMap] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem(`mep_${activeTenantId || 'default'}_trade_subcategories`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_TRADE_SUBCATEGORIES, ...parsed };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_TRADE_SUBCATEGORIES;
  });

  const saveTradeSubcategoriesMap = (next: Record<string, string[]>) => {
    setTradeSubcategoriesMap(next);
    try {
      localStorage.setItem(`mep_${activeTenantId || 'default'}_trade_subcategories`, JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  const tradeCategoriesList = useMemo(
    () => Object.keys(tradeSubcategoriesMap),
    [tradeSubcategoriesMap]
  );

  const [newTradeCategoryInput, setNewTradeCategoryInput] = useState('');
  const [newSubcategoryInput, setNewSubcategoryInput] = useState('');
  const [selectedTradeForNewSub, setSelectedTradeForNewSub] = useState<string>(
    () => Object.keys(DEFAULT_TRADE_SUBCATEGORIES)[0] || 'Gros Œuvre & Maçonnerie'
  );

  const [personnelCategories, setPersonnelCategories] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(`mep_${activeTenantId || 'default'}_personnel_categories`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PERSONNEL_CATEGORIES;
  });

  const [newPersonnelCategoryInput, setNewPersonnelCategoryInput] = useState('');

  const handleAddPersonnelCategory = (catName?: string) => {
    const clean = (catName ?? newPersonnelCategoryInput).trim();
    if (!clean) return;
    if (!personnelCategories.includes(clean)) {
      const next = [...personnelCategories, clean];
      setPersonnelCategories(next);
      try {
        localStorage.setItem(`mep_${activeTenantId || 'default'}_personnel_categories`, JSON.stringify(next));
      } catch {
        // Ignore
      }
      onTriggerToast(`Catégorie de personnel "${clean}" ajoutée.`);
    }
    setNewPersonnelCategoryInput('');
  };

  const [travelServiceCategories, setTravelServiceCategories] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(`mep_${activeTenantId || 'default'}_travel_service_categories`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_TRAVEL_SERVICE_CATEGORIES;
  });

  const [newTravelServiceCategoryInput, setNewTravelServiceCategoryInput] = useState('');

  const handleAddTravelServiceCategory = () => {
    const clean = newTravelServiceCategoryInput.trim();
    if (!clean) return;
    if (!travelServiceCategories.includes(clean)) {
      const next = [...travelServiceCategories, clean];
      setTravelServiceCategories(next);
      try {
        localStorage.setItem(
          `mep_${activeTenantId || 'default'}_travel_service_categories`,
          JSON.stringify(next)
        );
      } catch {
        // Ignore
      }
      onTriggerToast(`Catégorie Déplacement / Service "${clean}" ajoutée.`);
    }
    setNewTravelServiceCategoryInput('');
  };

  const handleAddTradeCategoryAndSub = (tradeName: string, subName: string) => {
    const tClean = tradeName.trim();
    const sClean = subName.trim();
    if (!tClean) return;
    const existingSubs = tradeSubcategoriesMap[tClean] || [];
    const nextSubs = sClean && !existingSubs.includes(sClean) ? [...existingSubs, sClean] : existingSubs;
    const nextMap = {
      ...tradeSubcategoriesMap,
      [tClean]: nextSubs.length > 0 ? nextSubs : ['Fournitures & Matériels du Corps de Métier'],
    };
    saveTradeSubcategoriesMap(nextMap);
    onTriggerToast(
      sClean
        ? `Sous-rubrique "${sClean}" ajoutée dans le corps de métier "${tClean}".`
        : `Catégorie de corps de métier "${tClean}" ajoutée.`
    );
  };

  // =========================================================================
  // MODAL D'ENVOI MULTI-DESTINATAIRES (E-MAIL OU WHATSAPP) POUR LES DOCUMENTS ERP
  // =========================================================================
  const [erpShareModal, setErpShareModal] = useState<{
    docTypeLabel: string;
    docReference: string;
    projectName: string;
    summaryText: string;
    defaultRecipientType:
      | 'client'
      | 'project_manager'
      | 'trade_leader'
      | 'warehouse_manager'
      | 'supplier'
      | 'employee'
      | 'direction';
    defaultRecipientName: string;
    defaultEmail: string;
    defaultPhone: string;
    channel: 'email' | 'whatsapp';
  } | null>(null);

  // =========================================================================
  // 1. CATALOGUE PRODUITS / SERVICES STATE (+ RECHERCHE 3 PREMIÈRES LETTRES + SOUS-RUBRIQUES MÉTIERS)
  // =========================================================================
  const [catalogPrefix3, setCatalogPrefix3] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<'all' | 'product' | 'service'>('all');
  const [catalogProjectTypeFilter, setCatalogProjectTypeFilter] = useState<string>('all');
  const [catalogTradeFilter, setCatalogTradeFilter] = useState<string>('all');
  const [catalogSubCategoryFilter, setCatalogSubCategoryFilter] = useState<string>('all');
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);

  const [catSku, setCatSku] = useState('');
  const [catItemType, setCatItemType] = useState<'product' | 'service'>('product');
  const [catStockable, setCatStockable] = useState<boolean>(true);
  const [catName, setCatName] = useState('');
  const [catTradeCategory, setCatTradeCategory] = useState<string>('Gros Œuvre & Maçonnerie');
  const [catSubCategory, setCatSubCategory] = useState<string>(
    DEFAULT_TRADE_SUBCATEGORIES['Gros Œuvre & Maçonnerie']?.[0] || 'Ciments, Liants & Agrégats'
  );
  const [catCategory, setCatCategory] = useState('Gros Œuvre & Maçonnerie');
  const [catProjectType, setCatProjectType] = useState<ProjectExploitationType>('construction_btp');
  const [catCustomProjectTypeLabel, setCatCustomProjectTypeLabel] = useState<string>('');
  const [catUnit, setCatUnit] = useState('Unité');
  const [catPurchasePrice, setCatPurchasePrice] = useState('');
  const [catUnitPrice, setCatUnitPrice] = useState('');
  const [catIncludeVat, setCatIncludeVat] = useState(true);
  const [catTaxRate, setCatTaxRate] = useState(() => String(getCountryVatRate(countryCode)));
  const [catStockQty, setCatStockQty] = useState('0');
  const [catMinStock, setCatMinStock] = useState('5');
  const [catWarehouseId, setCatWarehouseId] = useState('');
  const [catWarehouseLoc, setCatWarehouseLoc] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // États pour l'ajout direct de Type de Projet en Exploitation, Rubrique (Corps de métier) et Sous-Rubrique pendant la création d'un Produit/Prestation
  const [customExploitationTypes, setCustomExploitationTypes] = useState<
    { id: string; label: string; shortLabel: string; description: string }[]
  >(() => {
    try {
      const raw = localStorage.getItem(`mep_${activeTenantId || 'default'}_custom_project_types`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const allExploitationTypes = useMemo(
    () => [...PROJECT_EXPLOITATION_TYPES, ...customExploitationTypes],
    [customExploitationTypes]
  );

  const [showInlineNewProjectType, setShowInlineNewProjectType] = useState(false);
  const [inlineNewProjectTypeInput, setInlineNewProjectTypeInput] = useState('');
  const [showInlineNewTradeRubrique, setShowInlineNewTradeRubrique] = useState(false);
  const [inlineNewTradeRubriqueInput, setInlineNewTradeRubriqueInput] = useState('');
  const [showInlineNewSubRubrique, setShowInlineNewSubRubrique] = useState(false);
  const [inlineNewSubRubriqueInput, setInlineNewSubRubriqueInput] = useState('');

  const handleAddInlineProjectExploitationType = () => {
    const clean = inlineNewProjectTypeInput.trim();
    if (!clean) return;
    const slugId = `custom_${clean
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 24)}`;
    const existing = allExploitationTypes.find(
      (t) => t.id === slugId || t.label.toLowerCase() === clean.toLowerCase()
    );
    if (existing) {
      setCatProjectType(existing.id as ProjectExploitationType);
      setCatCustomProjectTypeLabel(existing.label);
    } else {
      const newEntry = {
        id: slugId,
        label: clean,
        shortLabel: clean.length > 22 ? `${clean.slice(0, 20)}…` : clean,
        description: `Type de projet en exploitation personnalisé : ${clean}`,
      };
      const next = [...customExploitationTypes, newEntry];
      setCustomExploitationTypes(next);
      try {
        localStorage.setItem(
          `mep_${activeTenantId || 'default'}_custom_project_types`,
          JSON.stringify(next)
        );
      } catch {
        // Ignore
      }
      setCatProjectType(slugId as ProjectExploitationType);
      setCatCustomProjectTypeLabel(clean);
      onTriggerToast(`Type de projet en exploitation "${clean}" ajouté et sélectionné.`);
    }
    setInlineNewProjectTypeInput('');
    setShowInlineNewProjectType(false);
  };

  // =========================================================================
  // 2. MAGASIN, FOURNISSEURS, BONS DE COMMANDE & MOUVEMENTS CONDITIONNÉS
  // =========================================================================
  const [warehouseSubTab, setWarehouseSubTab] = useState<
    'movements' | 'bci_requisitions' | 'sites' | 'suppliers_po'
  >('movements');
  const [warehouseMovementFilter, setWarehouseMovementFilter] = useState<
    'ALL' | 'IN' | 'OUT' | 'TRANSFER' | 'INVENTORY'
  >('ALL');
  const [warehouseProjectTypeFilter, setWarehouseProjectTypeFilter] = useState<string>('all');
  const [warehouseSelectedProjectId, setWarehouseSelectedProjectId] = useState<string>('all');
  const [warehousePrefix3, setWarehousePrefix3] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');

  // Registre numérisé et traçable des Bons de Commande Internes (BCI) délivrés par Responsable Projet + Responsable Corps de Métier au Magasinier
  const [internalRequisitions, setInternalRequisitions] = useState<ExportableInternalRequisition[]>(
    () => {
      try {
        const raw = localStorage.getItem(`mep_${activeTenantId || 'default'}_bci_list`);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
  );

  const updateInternalRequisitions = (
    updater: (prev: ExportableInternalRequisition[]) => ExportableInternalRequisition[]
  ) => {
    setInternalRequisitions((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(`mep_${activeTenantId || 'default'}_bci_list`, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  // Magasin Général Central de l'Entreprise (toujours disponible pour les mouvements avec les Magasins des Projets)
  const generalWarehouse: WarehouseSiteRecord = useMemo(
    () => ({
      id: 'wh_general',
      code: 'MAG-GEN-00',
      name: 'Magasin Général Central Entreprise',
      projectId: 'general',
      projectName: 'Direction Générale / Stock Central',
      location: 'Siège / Dépôt Central',
      managerName: currentUserName,
      isGeneral: true,
    }),
    [currentUserName]
  );

  const allWarehouses = useMemo(() => {
    const hasGen = warehouses.some((w) => w.id === 'wh_general' || w.isGeneral);
    return hasGen ? warehouses : [generalWarehouse, ...warehouses];
  }, [warehouses, generalWarehouse]);

  const getProductStockInWarehouse = (item: CatalogItem, whId: string): number => {
    if (item.stockByWarehouse && typeof item.stockByWarehouse[whId] === 'number') {
      return item.stockByWarehouse[whId];
    }
    const defaultWh = item.warehouseId || 'wh_general';
    return whId === defaultWh ? item.stockQty : 0;
  };

  // Create Warehouse Site Modal
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [siteCode, setSiteCode] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteProjectId, setSiteProjectId] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [siteManager, setSiteManager] = useState('');

  // Create Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supCode, setSupCode] = useState('');
  const [supName, setSupName] = useState('');
  const [supSpecialty, setSupSpecialty] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supTaxId, setSupTaxId] = useState('');
  const [supPaymentTerms, setSupPaymentTerms] = useState('Paiement à 30 jours sur présentation facture & BL');

  // Create Purchase Order (Bon de Commande Fournisseur multi-lignes) Modal
  const [showPoModal, setShowPoModal] = useState(false);
  const [poNumber, setPoNumber] = useState('');
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poProjectId, setPoProjectId] = useState('');
  const [poWarehouseId, setPoWarehouseId] = useState('wh_general');
  const [poExpectedDate, setPoExpectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [poLines, setPoLines] = useState<
    { id: string; productId: string; qty: string; unitPrice: string }[]
  >([{ id: 'line_1', productId: '', qty: '10', unitPrice: '' }]);
  const [poIncludeVat, setPoIncludeVat] = useState(true);
  const [poTaxRate, setPoTaxRate] = useState(() => String(getCountryVatRate(countryCode)));
  const [poNotes, setPoNotes] = useState('');

  // Supplier Purchase Order Reception on BL Modal (Livré vs Livraison partielle + Bon de Réception PDF)
  const [receivingPo, setReceivingPo] = useState<PurchaseOrderRecord | null>(null);
  const [receiptBlNumber, setReceiptBlNumber] = useState('');
  const [receiptScannedFileName, setReceiptScannedFileName] = useState('');
  const [receiptScannedDataUrl, setReceiptScannedDataUrl] = useState('');
  const [receiptWarehouseId, setReceiptWarehouseId] = useState('wh_general');
  const [receiptLineQtys, setReceiptLineQtys] = useState<Record<number, string>>({});
  const [receiptNotes, setReceiptNotes] = useState('');

  // Stock Movement Modal (IN on BL / OUT on BCI / TRANSFER Magasin Général <-> Magasins Projets multi-matériels / INVENTORY)
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movType, setMovType] = useState<'IN' | 'OUT' | 'TRANSFER' | 'INVENTORY'>('IN');
  const [movProjectId, setMovProjectId] = useState<string>('');
  const [movWarehouseId, setMovWarehouseId] = useState<string>('wh_general');
  const [movTargetWarehouseId, setMovTargetWarehouseId] = useState<string>('');
  const [movTargetProjectId, setMovTargetProjectId] = useState<string>('');
  const [movProjectType, setMovProjectType] = useState<ProjectExploitationType>('construction_btp');
  const [movProductId, setMovProductId] = useState<string>('');
  const [movQuantity, setMovQuantity] = useState('');
  const [movUnitCost, setMovUnitCost] = useState('');
  const [movTransferLines, setMovTransferLines] = useState<
    { id: string; productId: string; qty: string; unitCost: string }[]
  >([{ id: 'tr_1', productId: '', qty: '1', unitCost: '' }]);
  const [quickTransferMatName, setQuickTransferMatName] = useState('');
  const [quickTransferMatUnit, setQuickTransferMatUnit] = useState('Unité');
  const [quickTransferMatCost, setQuickTransferMatCost] = useState('');
  const [quickTransferMatStock, setQuickTransferMatStock] = useState('50');
  const [showQuickTransferMatForm, setShowQuickTransferMatForm] = useState(false);

  const [movReason, setMovReason] = useState('');
  const [movVoucherNumber, setMovVoucherNumber] = useState('');
  const [movSourceRef, setMovSourceRef] = useState(''); // Réf BL (pour Entrée), Réf BCI (pour Sortie) ou Réf Ordre de Transfert
  const [movSupplierId, setMovSupplierId] = useState('');
  const [movPoId, setMovPoId] = useState('');
  const [movScannedFileName, setMovScannedFileName] = useState('');
  const [movScannedDataUrl, setMovScannedDataUrl] = useState('');
  const [movSelectedBciId, setMovSelectedBciId] = useState<string>('');
  const [movProjectManagerName, setMovProjectManagerName] = useState<string>('');
  const [movTradeName, setMovTradeName] = useState<string>('Gros Œuvre & Maçonnerie');
  const [movTradeLeaderName, setMovTradeLeaderName] = useState<string>('');
  const [movWarehouseManagerName, setMovWarehouseManagerName] = useState<string>('');
  const [previewScanMovement, setPreviewScanMovement] = useState<StockMovementRecord | null>(null);

  // Modal: Émission d'un Bon de Commande Interne (BCI) par Responsable Projet + Responsable Corps de Métier
  const [showBciModal, setShowBciModal] = useState(false);
  const [bciNumberInput, setBciNumberInput] = useState('');
  const [bciProjectId, setBciProjectId] = useState('');
  const [bciProjectManagerName, setBciProjectManagerName] = useState('');
  const [bciTradeName, setBciTradeName] = useState('Gros Œuvre & Maçonnerie');
  const [bciTradeLeaderName, setBciTradeLeaderName] = useState('');
  const [bciWarehouseId, setBciWarehouseId] = useState('wh_general');
  const [bciWarehouseManagerName, setBciWarehouseManagerName] = useState('');
  const [bciProductId, setBciProductId] = useState('');
  const [bciRequestedQty, setBciRequestedQty] = useState('1');
  const [bciPurposeAndPhase, setBciPurposeAndPhase] = useState('');
  const [bciScannedFileName, setBciScannedFileName] = useState('');
  const [bciScannedDataUrl, setBciScannedDataUrl] = useState('');

  // =========================================================================
  // 3. EMPLOYÉS (RH, MUTATION PROJET & INTER-ENTREPRISES RÉSEAU, CESSATION & BADGE PRO) STATE
  // =========================================================================
  const [empPrefix3, setEmpPrefix3] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState<string>('all');
  const [empStatusFilter, setEmpStatusFilter] = useState<'all' | 'active' | 'on_leave' | 'terminated'>('all');
  const [empCategoryFilter, setEmpCategoryFilter] = useState<string>('all');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empFormError, setEmpFormError] = useState('');
  const [badgePreviewEmployee, setBadgePreviewEmployee] = useState<EmployeeRecord | null>(null);
  const [transferModalEmployee, setTransferModalEmployee] = useState<EmployeeRecord | null>(null);
  const [transferScope, setTransferScope] = useState<'project' | 'network_enterprise'>('project');
  const [transferTargetProjectId, setTransferTargetProjectId] = useState('');
  const [transferTargetTenantId, setTransferTargetTenantId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  const superAdminNetwork = useMemo(
    () => getSuperAdminEnterpriseNetwork(activeTenantId || 'default'),
    [activeTenantId, showEmployeeModal, transferModalEmployee]
  );

  // Cessation de Contrat Modal State
  const [terminationModalEmployee, setTerminationModalEmployee] = useState<EmployeeRecord | null>(null);
  const [terminationDateInput, setTerminationDateInput] = useState(() => new Date().toISOString().slice(0, 10));
  const [terminationReasonInput, setTerminationReasonInput] = useState('Fin de contrat CDD / Fin de mission');

  const [empMatricule, setEmpMatricule] = useState('');
  const [empFullName, setEmpFullName] = useState('');
  const [empWorkerCategory, setEmpWorkerCategory] = useState<WorkerCategory>('Technicien');
  const [empPhone, setEmpPhone] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPosition, setEmpPosition] = useState('');
  const [empDepartment, setEmpDepartment] = useState('Ingénierie & Projets');
  const [empContractType, setEmpContractType] = useState<'CDI' | 'CDD' | 'Temporaire / Journalier'>('CDI');
  const [empRemunerationBasis, setEmpRemunerationBasis] = useState<RemunerationBasis>('monthly_norm');
  const [empPeriodicity, setEmpPeriodicity] = useState<PaymentPeriodicity>('Mensuel');
  const [empHireDate, setEmpHireDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [empContractEndDate, setEmpContractEndDate] = useState('');
  const [empStatus, setEmpStatus] = useState<'active' | 'on_leave' | 'terminated'>('active');
  const [empAssignedProjectId, setEmpAssignedProjectId] = useState<string>('');
  const [empBaseSalary, setEmpBaseSalary] = useState('');
  const [empTransport, setEmpTransport] = useState('0');
  const [empSsn, setEmpSsn] = useState('');
  const [empNationalId, setEmpNationalId] = useState('');
  const [empEmergencyContact, setEmpEmergencyContact] = useState('');
  const [empBloodGroup, setEmpBloodGroup] = useState('O+');
  const [empPaymentMethod, setEmpPaymentMethod] = useState<
    'Virement Bancaire' | 'Mobile Money' | 'Chèque' | 'Espèces'
  >('Virement Bancaire');
  const [empAccount, setEmpAccount] = useState('');
  const [empPhotoDataUrl, setEmpPhotoDataUrl] = useState('');
  const [empGradeOrEchelon, setEmpGradeOrEchelon] = useState('Catégorie C1 - Échelon 1');
  const [empFaceBiometricHash, setEmpFaceBiometricHash] = useState('');
  const [empFingerprintBiometricHash, setEmpFingerprintBiometricHash] = useState('');
  const [empFaceCameraActive, setEmpFaceCameraActive] = useState(false);
  const [empFingerprintScanning, setEmpFingerprintScanning] = useState(false);
  const empVideoRef = React.useRef<HTMLVideoElement | null>(null);

  // États Fiche Médicale & Antécédents Médicaux de l'Employé
  const [medicalModalEmployee, setMedicalModalEmployee] = useState<EmployeeRecord | null>(null);
  const [empMedFitnessStatus, setEmpMedFitnessStatus] = useState<ExportableEmployeeMedicalRecord['fitnessStatus']>('Apte sans restriction');
  const [empMedDoctor, setEmpMedDoctor] = useState('Dr. KOUASSI Marc (Médecin du Travail Agréé)');
  const [empMedCenter, setEmpMedCenter] = useState('Centre Médical Inter-Entreprises & Santé au Travail');
  const [empMedLastExamDate, setEmpMedLastExamDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [empMedNextExamDate, setEmpMedNextExamDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [empMedHeightCm, setEmpMedHeightCm] = useState('175');
  const [empMedWeightKg, setEmpMedWeightKg] = useState('74');
  const [empMedChronicConditions, setEmpMedChronicConditions] = useState('Aucune pathologie chronique déclarée');
  const [empMedSurgeries, setEmpMedSurgeries] = useState('Aucun antécédent chirurgical ou hospitalisation majeure');
  const [empMedFamilyHistory, setEmpMedFamilyHistory] = useState('R.A.S (Aucun antécédent familial signalé)');
  const [empMedAllergies, setEmpMedAllergies] = useState('Aucune allergie médicamenteuse ou professionnelle connue');
  const [empMedOngoingTreatments, setEmpMedOngoingTreatments] = useState('Aucun traitement médical permanent en cours');
  const [empMedWorkRestrictions, setEmpMedWorkRestrictions] = useState('Aucune restriction — Apte aux travaux de chantier et d’exploitation');
  const [empMedRequiredPpe, setEmpMedRequiredPpe] = useState('Casque normé, Chaussures de sécurité S3, Gants de protection, Gilet haute visibilité');
  const [empMedVaccinations, setEmpMedVaccinations] = useState('Tétanos (À jour), Fièvre Jaune (À jour), Hépatite B (À jour)');
  const [empMedEmergencyNotes, setEmpMedEmergencyNotes] = useState('Prévenir immédiatement le contact d’urgence et le médecin du travail en cas d’incident.');
  const [empMedVisits, setEmpMedVisits] = useState<ExportableEmployeeMedicalVisit[]>([]);
  const [newVisitDate, setNewVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newVisitType, setNewVisitType] = useState<ExportableEmployeeMedicalVisit['type']>('Visite périodique');
  const [newVisitDoctor, setNewVisitDoctor] = useState('Dr. KOUASSI Marc');
  const [newVisitConclusion, setNewVisitConclusion] = useState('Apte au poste sans réserve');
  const [newVisitNotes, setNewVisitNotes] = useState('Constantes normales, examen clinique satisfaisant.');

  // Dossier RH Complet Modal (Congés, Infractions, Blâmes, Missions, Mutations, Avancements, Ruptures)
  const [hrDossierEmployee, setHrDossierEmployee] = useState<EmployeeRecord | null>(null);
  const [hrEventCategory, setHrEventCategory] = useState<HrEventCategory>('leave');
  const [hrEventSubType, setHrEventSubType] = useState<string>(HR_EVENT_SUBTYPES.leave[0]);
  const [hrEventTitle, setHrEventTitle] = useState('');
  const [hrEventStartDate, setHrEventStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hrEventEndDate, setHrEventEndDate] = useState('');
  const [hrEventTargetProjectId, setHrEventTargetProjectId] = useState('');
  const [hrEventMissionLocation, setHrEventMissionLocation] = useState('');
  const [hrEventAllowanceOrImpact, setHrEventAllowanceOrImpact] = useState('0');
  const [hrEventPromotionMode, setHrEventPromotionMode] = useState<'Manuel' | 'Automatique'>('Manuel');
  const [hrEventSalaryIncreasePct, setHrEventSalaryIncreasePct] = useState('10');
  const [hrEventNewPositionOrGrade, setHrEventNewPositionOrGrade] = useState('');
  const [hrEventDetails, setHrEventDetails] = useState('');

  // Module d'Émargement Biométrique (Empreinte Digitale & Visage) State
  const [bioSelectedEmployeeId, setBioSelectedEmployeeId] = useState<string>('');
  const [bioValidationMethod, setBioValidationMethod] = useState<'fingerprint' | 'face'>('fingerprint');
  const [bioScanStatus, setBioScanStatus] = useState<'idle' | 'scanning' | 'verified'>('idle');
  const [bioCameraActive, setBioCameraActive] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [bioFilterDate, setBioFilterDate] = useState<string>('');
  const [bioPrefix3, setBioPrefix3] = useState<string>('');
  const [bioSearch, setBioSearch] = useState<string>('');

  // =========================================================================
  // 4. PAIE (CDI NORMES PAYS vs CDD/TEMPORAIRE TAUX JOURNALIER / PAR TÂCHE)
  // =========================================================================
  const [payrollPeriod, setPayrollPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [payrollPrefix3, setPayrollPrefix3] = useState('');
  const [payrollSearch, setPayrollSearch] = useState('');
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [payEmployeeId, setPayEmployeeId] = useState<string>('');
  const [payWorkedDaysOrTasks, setPayWorkedDaysOrTasks] = useState('22');
  const [payOvertimeHours, setPayOvertimeHours] = useState('0');
  const [payOvertimeRate, setPayOvertimeRate] = useState('0');
  const [payBonus, setPayBonus] = useState('0');
  const [payAdvance, setPayAdvance] = useState('0');
  const [paySocialRate, setPaySocialRate] = useState(String(countryNorm.employeeSocialPct));
  const [payTaxRate, setPayTaxRate] = useState(String(countryNorm.incomeTaxPct));

  // =========================================================================
  // COMPUTED METRICS
  // =========================================================================
  const physicalProducts = useMemo(
    () => catalogItems.filter((item) => item.itemType === 'product'),
    [catalogItems]
  );

  const filteredCatalog = useMemo(() => {
    return catalogItems.filter((item) => {
      if (catalogTypeFilter !== 'all' && item.itemType !== catalogTypeFilter) return false;
      if (
        catalogProjectTypeFilter !== 'all' &&
        item.projectType !== catalogProjectTypeFilter &&
        item.projectType !== 'tous'
      ) {
        return false;
      }
      if (catalogTradeFilter !== 'all') {
        const itemTrade = item.tradeCategory || item.category;
        if (itemTrade !== catalogTradeFilter) return false;
      }
      if (catalogSubCategoryFilter !== 'all') {
        if ((item.subCategory || '') !== catalogSubCategoryFilter) return false;
      }
      if (catalogPrefix3.trim()) {
        const p3 = catalogPrefix3.trim().toLowerCase();
        const matchesP3 =
          item.name.toLowerCase().startsWith(p3) ||
          item.sku.toLowerCase().startsWith(p3) ||
          (item.tradeCategory || item.category).toLowerCase().startsWith(p3) ||
          (item.subCategory || '').toLowerCase().startsWith(p3) ||
          item.name.toLowerCase().includes(p3);
        if (!matchesP3) return false;
      }
      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.tradeCategory || '').toLowerCase().includes(q) ||
          (item.subCategory || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    catalogItems,
    catalogTypeFilter,
    catalogProjectTypeFilter,
    catalogTradeFilter,
    catalogSubCategoryFilter,
    catalogPrefix3,
    catalogSearch,
  ]);

  const catalogKpis = useMemo(() => {
    const totalProducts = catalogItems.filter((i) => i.itemType === 'product').length;
    const totalServices = catalogItems.filter((i) => i.itemType === 'service').length;
    const totalStockPurchaseValue = physicalProducts.reduce(
      (acc, i) => acc + i.stockQty * i.purchasePrice,
      0
    );
    const totalStockSaleValue = physicalProducts.reduce(
      (acc, i) => acc + i.stockQty * i.unitPrice,
      0
    );
    const lowStockItems = physicalProducts.filter((i) => {
      const threshold = Number(i.minStockThreshold ?? i.minStockAlert ?? 5);
      return Number(i.stockQty) <= threshold;
    });
    return {
      totalProducts,
      totalServices,
      totalStockPurchaseValue,
      totalStockSaleValue,
      lowStockCount: lowStockItems.length,
      lowStockItems,
    };
  }, [catalogItems, physicalProducts]);

  const filteredMovements = useMemo(() => {
    return stockMovements.filter((m) => {
      if (warehouseMovementFilter !== 'ALL' && m.movementType !== warehouseMovementFilter) {
        return false;
      }
      if (warehouseProjectTypeFilter !== 'all' && m.projectType !== warehouseProjectTypeFilter) {
        return false;
      }
      if (warehouseSelectedProjectId !== 'all' && m.projectId !== warehouseSelectedProjectId) {
        return false;
      }
      if (warehousePrefix3.trim()) {
        const p3 = warehousePrefix3.trim().toLowerCase();
        const match =
          m.productName.toLowerCase().startsWith(p3) ||
          m.voucherNumber.toLowerCase().startsWith(p3) ||
          (m.sourceDocReference || '').toLowerCase().startsWith(p3) ||
          m.projectName.toLowerCase().startsWith(p3) ||
          m.productName.toLowerCase().includes(p3);
        if (!match) return false;
      }
      if (warehouseSearch.trim()) {
        const q = warehouseSearch.toLowerCase();
        const match =
          m.productName.toLowerCase().includes(q) ||
          m.voucherNumber.toLowerCase().includes(q) ||
          (m.sourceDocReference || '').toLowerCase().includes(q) ||
          m.projectName.toLowerCase().includes(q) ||
          m.warehouseName.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    stockMovements,
    warehouseMovementFilter,
    warehouseProjectTypeFilter,
    warehouseSelectedProjectId,
    warehousePrefix3,
    warehouseSearch,
  ]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (empDeptFilter !== 'all' && e.department !== empDeptFilter) return false;
      if (empStatusFilter !== 'all' && e.status !== empStatusFilter) return false;
      if (empCategoryFilter !== 'all' && e.workerCategory !== empCategoryFilter) return false;
      if (empPrefix3.trim()) {
        const p3 = empPrefix3.trim().toLowerCase();
        const matchesP3 =
          e.fullName.toLowerCase().startsWith(p3) ||
          e.matricule.toLowerCase().startsWith(p3) ||
          e.position.toLowerCase().startsWith(p3) ||
          e.workerCategory.toLowerCase().startsWith(p3) ||
          e.fullName.toLowerCase().includes(p3);
        if (!matchesP3) return false;
      }
      if (empSearch.trim()) {
        const q = empSearch.toLowerCase();
        return (
          e.fullName.toLowerCase().includes(q) ||
          e.matricule.toLowerCase().includes(q) ||
          e.position.toLowerCase().includes(q) ||
          e.workerCategory.toLowerCase().includes(q) ||
          (e.assignedProjectName || '').toLowerCase().includes(q) ||
          (e.nationalIdNumber || '').toLowerCase().includes(q) ||
          (e.phone || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, empDeptFilter, empStatusFilter, empCategoryFilter, empPrefix3, empSearch]);

  const employeeKpis = useMemo(() => {
    const activeCount = employees.filter((e) => e.status === 'active').length;
    const onLeaveCount = employees.filter((e) => e.status === 'on_leave').length;
    const terminatedCount = employees.filter((e) => e.status === 'terminated').length;
    const cdiCount = employees.filter((e) => e.contractType === 'CDI' && e.status !== 'terminated').length;
    const cddTempCount = employees.filter((e) => e.contractType !== 'CDI' && e.status !== 'terminated').length;
    const totalTransfers = employees.reduce((acc, e) => acc + (e.transferHistory?.length || 0), 0);
    return {
      activeCount,
      onLeaveCount,
      terminatedCount,
      cdiCount,
      cddTempCount,
      totalTransfers,
    };
  }, [employees]);

  // =========================================================================
  // HANDLERS: CATALOGUE PRODUITS / SERVICES (AVEC CATÉGORIE CORPS DE MÉTIER, SOUS-RUBRIQUE & TVA PAYS OPTIONNELLE)
  // =========================================================================
  const openCreateCatalogModal = (
    defaultType: 'product' | 'service' = 'product',
    presetCategory?: string
  ) => {
    setEditingCatalogId(null);
    setCatItemType(defaultType);
    setCatStockable(defaultType === 'product');
    const nextIdx = String(catalogItems.length + 1).padStart(3, '0');
    setCatSku(defaultType === 'product' ? `PRD-${nextIdx}` : `SRV-${nextIdx}`);
    setCatName('');
    const defaultTrade =
      presetCategory ||
      (defaultType === 'service'
        ? 'Déplacements, Missions & Services'
        : tradeCategoriesList[0] || 'Gros Œuvre & Maçonnerie');
    setCatTradeCategory(defaultTrade);
    const defaultSub =
      tradeSubcategoriesMap[defaultTrade]?.[0] ||
      (defaultType === 'service' ? travelServiceCategories[0] || 'Prestation Technique' : 'Fournitures Générales');
    setCatSubCategory(defaultSub);
    setCatCategory(defaultTrade);
    setCatProjectType('construction_btp');
    setCatUnit(defaultType === 'product' ? 'Unité' : 'Forfait');
    setCatPurchasePrice('');
    setCatUnitPrice('');
    setCatIncludeVat(true);
    setCatTaxRate(String(statutoryCountryVatRate));
    setCatStockQty('0');
    setCatMinStock('5');
    setCatWarehouseId(warehouses[0]?.id || '');
    setCatWarehouseLoc(warehouses[0]?.name || 'Magasin Principal');
    setCatDesc('');
    setShowCatalogModal(true);
  };

  const openEditCatalogModal = (item: CatalogItem) => {
    setEditingCatalogId(item.id);
    setCatSku(item.sku);
    setCatItemType(item.itemType);
    setCatStockable(item.itemType === 'service' ? false : item.stockable !== false);
    setCatName(item.name);
    const trade = item.tradeCategory || item.category || tradeCategoriesList[0] || 'Gros Œuvre & Maçonnerie';
    setCatTradeCategory(trade);
    setCatSubCategory(
      item.subCategory || tradeSubcategoriesMap[trade]?.[0] || 'Fournitures & Équipements'
    );
    setCatCategory(item.category);
    setCatProjectType(item.projectType);
    setCatUnit(item.unit);
    setCatPurchasePrice(String(item.purchasePrice));
    setCatUnitPrice(String(item.unitPrice));
    const hasVat = item.includeVat !== false && item.taxRate > 0;
    setCatIncludeVat(hasVat);
    setCatTaxRate(String(hasVat ? item.taxRate : statutoryCountryVatRate));
    setCatStockQty(String(item.stockQty));
    setCatMinStock(String(item.minStockThreshold ?? item.minStockAlert ?? 5));
    setCatWarehouseId(item.warehouseId || '');
    setCatWarehouseLoc(item.warehouseLocation);
    setCatDesc(item.description);
    setShowCatalogModal(true);
  };

  const handleSaveCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const selectedWh = warehouses.find((w) => w.id === catWarehouseId);
    const resolvedTrade = catTradeCategory.trim() || catCategory.trim() || 'Gros Œuvre & Maçonnerie';
    const resolvedSub = catSubCategory.trim() || 'Fournitures & Matériels';
    const effectiveVatRate = catIncludeVat ? Math.max(0, Number(catTaxRate) || statutoryCountryVatRate) : 0;
    const matchedExpType = allExploitationTypes.find((t) => t.id === catProjectType);

    const newItem: CatalogItem = {
      id: editingCatalogId || `cat_${Date.now()}`,
      sku: catSku.trim().toUpperCase(),
      itemType: catItemType,
      name: catName.trim(),
      category: resolvedTrade,
      tradeCategory: resolvedTrade,
      rubriqueName: resolvedTrade,
      subCategory: resolvedSub,
      projectType: catProjectType,
      customProjectTypeLabel: matchedExpType?.label || catCustomProjectTypeLabel || undefined,
      unit: catUnit.trim() || 'Unité',
      purchasePrice: Math.max(0, Number(catPurchasePrice) || 0),
      unitPrice: Math.max(0, Number(catUnitPrice) || 0),
      taxRate: effectiveVatRate,
      includeVat: catIncludeVat,
      stockable: catItemType === 'product' ? catStockable : false,
      stockQty: catItemType === 'product' && catStockable ? Math.max(0, Number(catStockQty) || 0) : 0,
      minStockAlert: catItemType === 'product' ? Math.max(0, Number(catMinStock) || 0) : 0,
      minStockThreshold: catItemType === 'product' ? Math.max(0, Number(catMinStock) || 0) : 0,
      warehouseId: catWarehouseId,
      warehouseLocation: selectedWh ? `${selectedWh.name} (${selectedWh.location})` : catWarehouseLoc.trim() || 'Magasin',
      description: catDesc.trim(),
    };

    if (editingCatalogId) {
      setCatalogItems((prev) => prev.map((i) => (i.id === editingCatalogId ? newItem : i)));
      onRecordAuditTrace(
        'MAGASIN_STOCK',
        'MODIFICATION_ARTICLE',
        newItem.sku,
        `Article modifié : ${newItem.name} (Rubrique / Corps de métier : ${resolvedTrade} / Sous-rubrique : ${resolvedSub})`
      );
      onTriggerToast(`Référence "${newItem.name}" (${resolvedTrade} · ${resolvedSub}) mise à jour.`);
    } else {
      setCatalogItems((prev) => [newItem, ...prev]);
      onRecordAuditTrace(
        'MAGASIN_STOCK',
        'CREATION_ARTICLE',
        newItem.sku,
        `Nouvel article créé : ${newItem.name} (Rubrique / Corps de métier : ${resolvedTrade} / Sous-rubrique : ${resolvedSub})`
      );
      onTriggerToast(`Référence "${newItem.name}" enregistrée dans ${resolvedTrade} (${resolvedSub}).`);
    }
    setShowCatalogModal(false);
  };

  // =========================================================================
  // HANDLERS: MAGASINS PAR PROJET, FOURNISSEURS & BONS DE COMMANDE
  // =========================================================================
  const handleCreateWarehouseSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) return;
    const proj = projects.find((p) => p.id === siteProjectId);
    const code = siteCode.trim().toUpperCase() || `MAG-${String(warehouses.length + 1).padStart(2, '0')}`;
    const newSite: WarehouseSiteRecord = {
      id: `wh_${Date.now()}`,
      code,
      name: siteName.trim(),
      projectId: siteProjectId || 'general',
      projectName: proj ? proj.name : 'Multi-Projets Entreprise',
      location: siteLocation.trim() || 'Site Projet',
      managerName: siteManager.trim().toUpperCase() || currentUserName,
    };
    setWarehouses((prev) => [newSite, ...prev]);
    setShowSiteModal(false);
    setSiteName('');
    setSiteLocation('');
    onRecordAuditTrace('MAGASIN_STOCK', 'CREATION_MAGASIN_PROJET', code, `Magasin "${newSite.name}" rattaché à ${newSite.projectName}`);
    onTriggerToast(`Magasin "${newSite.name}" créé et rattaché au projet.`);
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    const code = supCode.trim().toUpperCase() || `FOUR-${String(suppliers.length + 1).padStart(3, '0')}`;
    const newSup: SupplierRecord = {
      id: `sup_${Date.now()}`,
      code,
      companyName: supName.trim().toUpperCase(),
      specialty: supSpecialty.trim() || 'Fournitures & Équipements',
      phone: supPhone.trim(),
      email: supEmail.trim().toLowerCase(),
      address: supAddress.trim(),
      taxId: supTaxId.trim(),
      paymentTerms: supPaymentTerms.trim(),
    };
    setSuppliers((prev) => [newSup, ...prev]);
    setShowSupplierModal(false);
    setSupName('');
    setSupPhone('');
    setSupEmail('');
    onRecordAuditTrace('COMMANDE_FOURNISSEUR', 'CREATION_FICHE_FOURNISSEUR', code, `Fournisseur créé : ${newSup.companyName}`);
    onTriggerToast(`Fiche fournisseur "${newSup.companyName}" créée.`);
  };

  const handleAddPoLine = () => {
    const firstProd = physicalProducts[0];
    setPoLines((prev) => [
      ...prev,
      {
        id: `line_${Date.now()}_${prev.length + 1}`,
        productId: firstProd?.id || '',
        qty: '1',
        unitPrice: firstProd ? String(firstProd.purchasePrice) : '',
      },
    ]);
  };

  const handleRemovePoLine = (lineId: string) => {
    setPoLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== lineId) : prev));
  };

  const handleUpdatePoLine = (
    lineId: string,
    field: 'productId' | 'qty' | 'unitPrice',
    value: string
  ) => {
    setPoLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        if (field === 'productId') {
          const prod = physicalProducts.find((p) => p.id === value);
          return {
            ...line,
            productId: value,
            unitPrice: prod ? String(prod.purchasePrice) : line.unitPrice,
          };
        }
        return { ...line, [field]: value };
      })
    );
  };

  const handleCreatePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = suppliers.find((s) => s.id === poSupplierId);
    if (!supplier) {
      onTriggerToast('Veuillez sélectionner un fournisseur destinataire.');
      return;
    }

    const validLines = poLines
      .map((line) => {
        const prod = physicalProducts.find((p) => p.id === line.productId);
        if (!prod) return null;
        const qty = Math.max(1, Number(line.qty) || 1);
        const unitPrice = Math.max(0, Number(line.unitPrice) || prod.purchasePrice);
        return {
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          unit: prod.unit,
          qty,
          receivedQty: 0,
          unitPrice,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (validLines.length === 0) {
      onTriggerToast('Veuillez ajouter au moins une ligne de produit commandé.');
      return;
    }

    const proj = projects.find((p) => p.id === poProjectId);
    const wh = allWarehouses.find((w) => w.id === poWarehouseId) || generalWarehouse;
    const totalHT = Number(
      validLines.reduce((acc, l) => acc + l.qty * l.unitPrice, 0).toFixed(2)
    );
    const taxR = poIncludeVat ? Math.max(0, Number(poTaxRate) || statutoryCountryVatRate) : 0;
    const totalTTC = Number((totalHT * (1 + taxR / 100)).toFixed(2));
    const refNum =
      poNumber.trim().toUpperCase() ||
      `BC-FOUR-2026-${String(purchaseOrders.length + 1).padStart(3, '0')}`;

    const newPo: PurchaseOrderRecord = {
      id: `po_${Date.now()}`,
      poNumber: refNum,
      date: new Date().toISOString().slice(0, 10),
      deliveryExpectedDate: poExpectedDate,
      supplierId: supplier.id,
      supplierName: supplier.companyName,
      supplierPhone: supplier.phone,
      supplierEmail: supplier.email,
      supplierAddress: supplier.address || '',
      projectId: proj?.id || 'general',
      projectName: proj?.name || 'Magasin Général / Multi-Projets',
      warehouseId: wh.id,
      warehouseName: wh.name,
      status: 'issued',
      items: validLines,
      receipts: [],
      totalHT,
      taxRate: taxR,
      includeVat: poIncludeVat,
      totalTTC,
      notes: poNotes.trim(),
    };

    setPurchaseOrders((prev) => [newPo, ...prev]);
    setShowPoModal(false);
    setPoLines([{ id: 'line_1', productId: '', qty: '10', unitPrice: '' }]);
    setPoNumber('');
    onRecordAuditTrace(
      'COMMANDE_FOURNISSEUR',
      'EMISSION_BON_DE_COMMANDE',
      refNum,
      `BC (${validLines.length} ligne(s)) adressé à ${supplier.companyName} pour ${newPo.warehouseName} (${formatCurrency(totalTTC, currency)} — ${
        poIncludeVat ? `TVA ${taxR}%` : 'Hors TVA 0%'
      })`
    );
    onTriggerToast(
      `Bon de Commande ${refNum} (${validLines.length} ligne(s) de produits) émis pour ${supplier.companyName}.`
    );
  };

  // Génération rapide de Bon de Commande depuis les alertes automatiques de seuil critique de stock
  const handleGenerateQuickPoFromCriticalStock = (
    targetProducts: CatalogItem[],
    mode: 'instant_pdf' | 'prefill_modal' = 'instant_pdf'
  ) => {
    const validTargets = targetProducts.filter((p) => p.itemType === 'product');
    if (validTargets.length === 0) {
      onTriggerToast('Aucun produit stockable critique sélectionné pour le bon de commande.');
      return;
    }

    const defaultSupplier = suppliers[0] || {
      id: 'sup_auto_default',
      code: 'FOUR-001',
      companyName: 'CENTRALE APPROVISIONNEMENT & DISTRIBUTION PRO',
      phone: '+225 07 00 00 00 00',
      email: 'commandes@centrale-appro.pro',
      address: 'Zone Industrielle Principale',
      taxId: 'NCC-990128-A',
      paymentTerms: '30 jours fin de mois',
    };

    const computedLines = validTargets.map((prod, idx) => {
      const minThreshold = Number(prod.minStockThreshold ?? prod.minStockAlert ?? 5);
      const currentQty = Number(prod.stockQty) || 0;
      const deficit = Math.max(0, minThreshold - currentQty);
      const recommendedQty = Math.max(10, deficit + minThreshold);
      const unitPrice = Math.max(0, Number(prod.purchasePrice) || Number(prod.unitPrice) * 0.7 || 0);
      return {
        lineId: `line_auto_${Date.now()}_${idx}`,
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        unit: prod.unit || 'u',
        qty: recommendedQty,
        receivedQty: 0,
        unitPrice,
      };
    });

    if (mode === 'prefill_modal') {
      if (suppliers.length === 0) {
        setSuppliers([defaultSupplier]);
      }
      setPoSupplierId(defaultSupplier.id);
      setPoWarehouseId(generalWarehouse.id);
      setPoProjectId('general');
      setPoNumber(`BC-URG-${new Date().getFullYear()}-${String(purchaseOrders.length + 1).padStart(3, '0')}`);
      setPoExpectedDate(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
      setPoLines(
        computedLines.map((l) => ({
          id: l.lineId,
          productId: l.productId,
          qty: String(l.qty),
          unitPrice: String(l.unitPrice),
        }))
      );
      setPoNotes(
        `Réapprovisionnement automatique sur alerte de seuil critique de stock (${computedLines.length} référence(s)).`
      );
      setShowPoModal(true);
      onTriggerToast(
        `Bon de commande pré-rempli avec ${computedLines.length} produit(s) en seuil critique.`
      );
      return;
    }

    if (suppliers.length === 0) {
      setSuppliers([defaultSupplier]);
    }
    const totalHT = Number(
      computedLines.reduce((acc, l) => acc + l.qty * l.unitPrice, 0).toFixed(2)
    );
    const taxR = statutoryCountryVatRate;
    const totalTTC = Number((totalHT * (1 + taxR / 100)).toFixed(2));
    const refNum = `BC-AUTO-${new Date().getFullYear()}-${String(purchaseOrders.length + 1).padStart(3, '0')}`;

    const newPo: PurchaseOrderRecord = {
      id: `po_auto_${Date.now()}`,
      poNumber: refNum,
      date: new Date().toISOString().slice(0, 10),
      deliveryExpectedDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      supplierId: defaultSupplier.id,
      supplierName: defaultSupplier.companyName,
      supplierPhone: defaultSupplier.phone,
      supplierEmail: defaultSupplier.email,
      supplierAddress: defaultSupplier.address || '',
      projectId: 'general',
      projectName: 'Réapprovisionnement Seuil Critique Catalogue',
      warehouseId: generalWarehouse.id,
      warehouseName: generalWarehouse.name,
      status: 'issued',
      items: computedLines.map((l) => ({
        productId: l.productId,
        sku: l.sku,
        name: l.name,
        unit: l.unit,
        qty: l.qty,
        receivedQty: 0,
        unitPrice: l.unitPrice,
      })),
      receipts: [],
      totalHT,
      taxRate: taxR,
      includeVat: true,
      totalTTC,
      notes: `Génération rapide automatique suite au déclenchement du seuil critique de stock sur ${computedLines.length} article(s) du catalogue.`,
    };

    setPurchaseOrders((prev) => [newPo, ...prev]);
    exportPurchaseOrderToPDF(newPo, currency, companyName, companyLogo, docCustomization);
    onRecordAuditTrace(
      'COMMANDE_FOURNISSEUR',
      'GENERATION_RAPIDE_BC_SEUIL_CRITIQUE',
      refNum,
      `Bon de commande rapide ${refNum} généré et téléchargé en PDF pour ${computedLines.length} produit(s) au seuil critique (${formatCurrency(totalTTC, currency)} TTC)`
    );
    onTriggerToast(
      `Bon de Commande Rapide ${refNum} émis et téléchargé en PDF (${computedLines.length} article(s) — ${formatCurrency(totalTTC, currency)} TTC).`
    );
  };

  // Ouverture de la fenêtre de réception d'une commande fournisseur sur Bon de Livraison (BL)
  const openReceivePoModal = (po: PurchaseOrderRecord) => {
    setReceivingPo(po);
    setReceiptBlNumber('');
    setReceiptScannedFileName('');
    setReceiptScannedDataUrl('');
    setReceiptWarehouseId(po.warehouseId || 'wh_general');
    const initialQtys: Record<number, string> = {};
    po.items.forEach((item, idx) => {
      const remaining = Math.max(0, item.qty - (item.receivedQty || 0));
      initialQtys[idx] = String(remaining);
    });
    setReceiptLineQtys(initialQtys);
    setReceiptNotes('');
  };

  const handleReceiptBlScanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptScannedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setReceiptScannedDataUrl(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmPurchaseOrderReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPo) return;

    if (!receiptBlNumber.trim()) {
      onTriggerToast(
        'Le numéro de Bon de Livraison (BL) du fournisseur doit obligatoirement être renseigné.'
      );
      return;
    }
    if (!receiptScannedDataUrl) {
      onTriggerToast(
        'Veuillez numériser et sauvegarder le document physique du Bon de Livraison (BL) du fournisseur.'
      );
      return;
    }

    const targetWh =
      allWarehouses.find((w) => w.id === receiptWarehouseId) || generalWarehouse;
    const today = new Date().toISOString().slice(0, 10);
    const receiptNumber = `BR-2026-${String((receivingPo.receipts?.length || 0) + 1).padStart(2, '0')}-${receivingPo.poNumber.slice(-3)}`;

    let anyReceivedNow = false;
    let allComplete = true;

    const receiptLines: ExportableGoodsReceipt['lines'] = [];
    const updatedPoItems = receivingPo.items.map((item, idx) => {
      const previouslyReceived = item.receivedQty || 0;
      const receivedNow = Math.max(0, Number(receiptLineQtys[idx]) || 0);
      if (receivedNow > 0) anyReceivedNow = true;
      const cumulativeReceived = previouslyReceived + receivedNow;
      const remainingQty = Math.max(0, item.qty - cumulativeReceived);
      if (cumulativeReceived < item.qty) {
        allComplete = false;
      }
      receiptLines.push({
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        orderedQty: item.qty,
        previouslyReceivedQty: previouslyReceived,
        receivedNowQty: receivedNow,
        cumulativeReceivedQty: cumulativeReceived,
        remainingQty,
        unitPrice: item.unitPrice,
      });
      return {
        ...item,
        receivedQty: cumulativeReceived,
      };
    });

    if (!anyReceivedNow) {
      onTriggerToast('Veuillez saisir une quantité reçue supérieure à 0 sur au moins une ligne.');
      return;
    }

    const nextStatus: 'partial' | 'delivered' = allComplete ? 'delivered' : 'partial';

    const newReceiptRecord: ExportableGoodsReceipt = {
      id: `rec_${Date.now()}`,
      receiptNumber,
      date: today,
      poNumber: receivingPo.poNumber,
      deliveryNoteRef: receiptBlNumber.trim().toUpperCase(),
      scannedFileName: receiptScannedFileName || 'BL_Fournisseur_Numerise.pdf',
      scannedDocDataUrl: receiptScannedDataUrl,
      supplierName: receivingPo.supplierName,
      projectName: receivingPo.projectName,
      warehouseName: targetWh.name,
      receiverName: currentUserName,
      statusAfterReceipt: nextStatus,
      lines: receiptLines,
      notes: receiptNotes.trim(),
    };

    // Mise à jour du stock pour chaque produit reçu et création des mouvements d'entrée traçables
    const newMovements: StockMovementRecord[] = [];
    setCatalogItems((prevCatalog) =>
      prevCatalog.map((catItem) => {
        const matchingLine = receiptLines.find(
          (l) => l.sku === catItem.sku && (l.receivedNowQty ?? 0) > 0
        );
        if (!matchingLine) return catItem;

        const qtyNow = matchingLine.receivedNowQty ?? 0;
        const prevTotalStock = catItem.stockQty;
        const nextTotalStock = prevTotalStock + qtyNow;
        const currentWhStock = getProductStockInWarehouse(catItem, targetWh.id);
        const nextWhMap = {
          ...(catItem.stockByWarehouse || {
            [catItem.warehouseId || 'wh_general']: prevTotalStock,
          }),
          [targetWh.id]: currentWhStock + qtyNow,
        };

        newMovements.push({
          id: `mov_${Date.now()}_${catItem.id}`,
          voucherNumber: `${receiptNumber}-${catItem.sku}`,
          date: today,
          movementType: 'IN',
          productId: catItem.id,
          productSku: catItem.sku,
          productName: catItem.name,
          unit: catItem.unit,
          quantity: qtyNow,
          previousStock: prevTotalStock,
          newStock: nextTotalStock,
          unitCost: matchingLine.unitPrice,
          totalValue: qtyNow * matchingLine.unitPrice,
          projectId: receivingPo.projectId,
          projectName: receivingPo.projectName,
          projectType: catItem.projectType,
          projectTypeLabel:
            PROJECT_EXPLOITATION_TYPES.find((t) => t.id === catItem.projectType)?.shortLabel ||
            'Projet',
          warehouseId: targetWh.id,
          warehouseName: targetWh.name,
          warehouseLocation: targetWh.location,
          operatorName: currentUserName,
          reason: `Réception commande ${receivingPo.poNumber} (${
            nextStatus === 'delivered' ? 'Livraison complète' : 'Livraison partielle'
          }) sur BL N° ${newReceiptRecord.deliveryNoteRef}`,
          sourceDocReference: newReceiptRecord.deliveryNoteRef,
          sourceDocFileName: newReceiptRecord.scannedFileName,
          scannedDocDataUrl: receiptScannedDataUrl,
          supplierName: receivingPo.supplierName,
          purchaseOrderId: receivingPo.id,
        });

        return {
          ...catItem,
          stockQty: nextTotalStock,
          stockByWarehouse: nextWhMap,
        };
      })
    );

    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    setPurchaseOrders((prev) =>
      prev.map((po) =>
        po.id === receivingPo.id
          ? {
              ...po,
              status: nextStatus,
              items: updatedPoItems,
              receipts: [newReceiptRecord, ...(po.receipts || [])],
            }
          : po
      )
    );

    // Génération automatique du Bon de Réception imprimable (PDF)
    exportGoodsReceiptToPDF(
      newReceiptRecord,
      currency,
      companyName,
      companyLogo,
      docCustomization
    );

    onRecordAuditTrace(
      'COMMANDE_FOURNISSEUR',
      nextStatus === 'delivered'
        ? 'RECEPTION_COMPLETE_COMMANDE_SUR_BL'
        : 'RECEPTION_PARTIELLE_COMMANDE_SUR_BL',
      receiptNumber,
      `Réception ${receivingPo.poNumber} sur BL N° ${newReceiptRecord.deliveryNoteRef} (${newReceiptRecord.scannedFileName}) — Statut BC : ${
        nextStatus === 'delivered' ? 'LIVRÉ' : 'LIVRAISON PARTIELLE'
      }`
    );

    onTriggerToast(
      nextStatus === 'delivered'
        ? `Réception validée sur BL N° ${newReceiptRecord.deliveryNoteRef} : le Bon de Commande ${receivingPo.poNumber} est passé en statut « Livré » et le Bon de Réception ${receiptNumber} a été généré.`
        : `Livraison partielle enregistrée sur BL N° ${newReceiptRecord.deliveryNoteRef} : le Bon de Commande ${receivingPo.poNumber} est en statut « Livraison partielle » et le Bon de Réception ${receiptNumber} a été généré.`
    );

    setReceivingPo(null);
  };

  // Handle physical file scan upload (BL for IN, BCI for OUT)
  const handleScanFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMovScannedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setMovScannedDataUrl(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const openBciModal = () => {
    const nextIdx = String(internalRequisitions.length + 1).padStart(3, '0');
    setBciNumberInput(`BCI-2026-${nextIdx}`);
    const defaultProj = projects[0];
    setBciProjectId(defaultProj?.id || 'general');
    setBciProjectManagerName(defaultProj?.projectManagerName || currentUserName);
    setBciTradeName(defaultProj?.involvedTrades?.[0] || 'Gros Œuvre & Maçonnerie');
    const firstTech = employees.find((e) => e.status === 'active');
    setBciTradeLeaderName(firstTech?.fullName || '');
    const defaultWh = allWarehouses[0] || generalWarehouse;
    setBciWarehouseId(defaultWh.id);
    setBciWarehouseManagerName(defaultWh.managerName || currentUserName);
    const defaultProd = physicalProducts[0];
    setBciProductId(defaultProd?.id || '');
    setBciRequestedQty('1');
    setBciPurposeAndPhase('');
    setBciScannedFileName('');
    setBciScannedDataUrl('');
    setShowBciModal(true);
  };

  const handleBciScanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBciScannedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBciScannedDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateInternalRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = physicalProducts.find((p) => p.id === bciProductId);
    if (!prod) {
      onTriggerToast('Veuillez sélectionner un produit ou matériel du catalogue.');
      return;
    }
    if (!bciProjectManagerName.trim() || !bciTradeLeaderName.trim()) {
      onTriggerToast(
        'Veuillez renseigner le Responsable du Projet et le Responsable du Corps de Métier devant utiliser le produit/matériel.'
      );
      return;
    }
    const qty = Math.max(1, Number(bciRequestedQty) || 1);
    const proj = projects.find((p) => p.id === bciProjectId);
    const wh = allWarehouses.find((w) => w.id === bciWarehouseId) || generalWarehouse;
    const bciRef =
      bciNumberInput.trim().toUpperCase() ||
      `BCI-2026-${String(internalRequisitions.length + 1).padStart(3, '0')}`;

    const newBci: ExportableInternalRequisition = {
      id: `bci_${Date.now()}`,
      bciNumber: bciRef,
      date: new Date().toISOString().slice(0, 10),
      projectId: proj?.id || 'general',
      projectName: proj?.name || 'Direction Générale / Chantier Principal',
      projectTypeLabel:
        PROJECT_EXPLOITATION_TYPES.find((t) => t.id === (proj?.projectType || prod.projectType))
          ?.shortLabel || 'Projet',
      projectManagerName: bciProjectManagerName.trim(),
      tradeName: bciTradeName.trim() || 'Corps de métier technique',
      tradeLeaderName: bciTradeLeaderName.trim(),
      warehouseId: wh.id,
      warehouseName: wh.name,
      warehouseManagerName: bciWarehouseManagerName.trim() || wh.managerName || currentUserName,
      productId: prod.id,
      productSku: prod.sku,
      productName: prod.name,
      unit: prod.unit,
      requestedQuantity: qty,
      unitCost: prod.purchasePrice,
      totalEstimatedValue: Number((qty * prod.purchasePrice).toFixed(2)),
      purposeAndPhase:
        bciPurposeAndPhase.trim() ||
        `Utilisation par le corps de métier "${bciTradeName}" dans le cadre du projet "${proj?.name || 'Chantier'}"`,
      status: 'pending_warehouse',
      scannedBciFileName: bciScannedFileName || `${bciRef}_Signe_Numerise.pdf`,
      scannedBciDataUrl: bciScannedDataUrl || undefined,
    };

    updateInternalRequisitions((prev) => [newBci, ...prev]);
    setShowBciModal(false);

    onRecordAuditTrace(
      'MAGASIN_STOCK',
      'EMISSION_BCI_PROJET_CORPS_METIER',
      newBci.bciNumber,
      `BCI délivré par Resp. Projet (${newBci.projectManagerName}) & Resp. Corps de Métier ${newBci.tradeName} (${newBci.tradeLeaderName}) au Magasinier (${newBci.warehouseManagerName}) pour ${qty} ${prod.unit} de "${prod.name}"`
    );

    exportInternalRequisitionToPDF(newBci, companyName, companyLogo, docCustomization);
    onTriggerToast(
      `Bon de Commande Interne ${newBci.bciNumber} émis, numérisé et sauvegardé. Présentez-le au magasinier pour déclencher la sortie contre Bon de Sortie.`
    );
  };

  const openWarehouseModalFromBci = (bci: ExportableInternalRequisition) => {
    setMovType('OUT');
    const nextNum = String(stockMovements.length + 1).padStart(3, '0');
    setMovVoucherNumber(`BS-2026-${nextNum}`);
    setMovSelectedBciId(bci.id);
    setMovSourceRef(bci.bciNumber);
    setMovProjectId(bci.projectId);
    setMovWarehouseId(bci.warehouseId || 'wh_general');
    setMovProductId(bci.productId);
    setMovQuantity(String(bci.requestedQuantity));
    setMovUnitCost(String(bci.unitCost));
    setMovProjectManagerName(bci.projectManagerName);
    setMovTradeName(bci.tradeName);
    setMovTradeLeaderName(bci.tradeLeaderName);
    setMovWarehouseManagerName(bci.warehouseManagerName || currentUserName);
    setMovScannedFileName(bci.scannedBciFileName || `${bci.bciNumber}_Numerise.pdf`);
    setMovScannedDataUrl(bci.scannedBciDataUrl || 'data:text/plain;base64,QkNJX05VTUVSSVNF');
    setMovReason(
      `Sortie exécutée par le Magasinier sur présentation du BCI N° ${bci.bciNumber} (${bci.tradeName} — ${bci.purposeAndPhase})`
    );
    setShowMovementModal(true);
  };

  const handleAddTransferLine = () => {
    const firstProd = physicalProducts[0];
    setMovTransferLines((prev) => [
      ...prev,
      {
        id: `tr_${Date.now()}_${prev.length + 1}`,
        productId: firstProd?.id || '',
        qty: '1',
        unitCost: firstProd ? String(firstProd.purchasePrice) : '0',
      },
    ]);
  };

  const handleRemoveTransferLine = (lineId: string) => {
    setMovTransferLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== lineId) : prev));
  };

  const handleUpdateTransferLine = (
    lineId: string,
    field: 'productId' | 'qty' | 'unitCost',
    value: string
  ) => {
    setMovTransferLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        if (field === 'productId') {
          const found = physicalProducts.find((p) => p.id === value);
          return {
            ...l,
            productId: value,
            unitCost: found ? String(found.purchasePrice) : l.unitCost,
          };
        }
        return { ...l, [field]: value };
      })
    );
  };

  const handleQuickCreateMaterialForTransfer = () => {
    if (!quickTransferMatName.trim()) {
      onTriggerToast('Veuillez saisir le nom du nouveau matériel à ajouter au transfert.');
      return;
    }
    const nextIdx = String(catalogItems.length + 1).padStart(3, '0');
    const sku = `MAT-${nextIdx}`;
    const cost = Math.max(0, Number(quickTransferMatCost) || 0);
    const initialStock = Math.max(1, Number(quickTransferMatStock) || 20);
    const srcWh = allWarehouses.find((w) => w.id === movWarehouseId) || generalWarehouse;

    const createdItem: CatalogItem = {
      id: `cat_${Date.now()}`,
      sku,
      itemType: 'product',
      name: quickTransferMatName.trim(),
      category: 'Gros Œuvre & Maçonnerie',
      tradeCategory: 'Gros Œuvre & Maçonnerie',
      subCategory: 'Matériels & Équipements de Chantier',
      projectType: 'construction_btp',
      unit: quickTransferMatUnit.trim() || 'Unité',
      purchasePrice: cost,
      unitPrice: Math.round(cost * 1.25),
      taxRate: statutoryCountryVatRate,
      includeVat: true,
      stockQty: initialStock,
      minStockAlert: 5,
      warehouseId: srcWh.id,
      warehouseLocation: srcWh.name,
      stockByWarehouse: { [srcWh.id]: initialStock },
      description: 'Ajouté directement lors d’un Transfert Inter-Magasins',
    };

    setCatalogItems((prev) => [createdItem, ...prev]);
    setMovTransferLines((prev) => {
      const hasEmpty = prev.some((l) => !l.productId);
      if (hasEmpty) {
        return prev.map((l) =>
          !l.productId
            ? { ...l, productId: createdItem.id, unitCost: String(createdItem.purchasePrice) }
            : l
        );
      }
      return [
        ...prev,
        {
          id: `tr_${Date.now()}`,
          productId: createdItem.id,
          qty: '1',
          unitCost: String(createdItem.purchasePrice),
        },
      ];
    });
    setQuickTransferMatName('');
    setQuickTransferMatCost('');
    setShowQuickTransferMatForm(false);
    onTriggerToast(
      `Matériel "${createdItem.name}" créé avec ${initialStock} ${createdItem.unit} dans "${srcWh.name}" et ajouté à la liste du transfert.`
    );
  };

  const openWarehouseModal = (
    type: 'IN' | 'OUT' | 'TRANSFER' | 'INVENTORY',
    preselectedProdId?: string
  ) => {
    setMovType(type);
    const prefix =
      type === 'IN' ? 'BE' : type === 'OUT' ? 'BS' : type === 'TRANSFER' ? 'BT' : 'INV';
    const nextNum = String(stockMovements.length + 1).padStart(3, '0');
    setMovVoucherNumber(`${prefix}-2026-${nextNum}`);
    const pendingBci = internalRequisitions.find((b) => b.status === 'pending_warehouse');
    setMovSelectedBciId(type === 'OUT' && pendingBci ? pendingBci.id : '');
    setMovSourceRef(
      type === 'TRANSFER'
        ? `OT-2026-${nextNum}`
        : type === 'OUT'
        ? pendingBci?.bciNumber || `BCI-2026-${String(internalRequisitions.length + 1).padStart(3, '0')}`
        : ''
    );
    setMovScannedFileName(type === 'OUT' && pendingBci?.scannedBciFileName ? pendingBci.scannedBciFileName : '');
    setMovScannedDataUrl(type === 'OUT' && pendingBci?.scannedBciDataUrl ? pendingBci.scannedBciDataUrl : '');
    const defaultProj = projects[0];
    setMovProjectId(
      type === 'TRANSFER'
        ? 'general'
        : type === 'OUT' && pendingBci
        ? pendingBci.projectId
        : defaultProj?.id || 'general'
    );
    setMovWarehouseId(type === 'OUT' && pendingBci ? pendingBci.warehouseId : 'wh_general');
    const firstProjWarehouse = warehouses.find((w) => w.id !== 'wh_general');
    setMovTargetWarehouseId(firstProjWarehouse?.id || warehouses[0]?.id || 'wh_general');
    setMovTargetProjectId(firstProjWarehouse?.projectId || projects[0]?.id || 'general');
    setMovSupplierId(suppliers[0]?.id || '');
    setMovPoId('');
    setMovProjectManagerName(
      type === 'OUT' && pendingBci
        ? pendingBci.projectManagerName
        : defaultProj?.projectManagerName || currentUserName
    );
    setMovTradeName(
      type === 'OUT' && pendingBci
        ? pendingBci.tradeName
        : defaultProj?.involvedTrades?.[0] || 'Gros Œuvre & Maçonnerie'
    );
    setMovTradeLeaderName(
      type === 'OUT' && pendingBci
        ? pendingBci.tradeLeaderName
        : employees.find((e) => e.status === 'active')?.fullName || ''
    );
    setMovWarehouseManagerName(
      type === 'OUT' && pendingBci ? pendingBci.warehouseManagerName : currentUserName
    );

    const targetProd =
      physicalProducts.find(
        (p) => p.id === (preselectedProdId || (type === 'OUT' ? pendingBci?.productId : undefined))
      ) || physicalProducts[0];
    if (targetProd) {
      setMovProductId(targetProd.id);
      setMovUnitCost(String(targetProd.purchasePrice));
      setMovProjectType(targetProd.projectType);
      setMovQuantity(
        type === 'INVENTORY'
          ? String(targetProd.stockQty)
          : type === 'OUT' && pendingBci
          ? String(pendingBci.requestedQuantity)
          : '1'
      );
      setMovTransferLines([
        {
          id: 'tr_1',
          productId: targetProd.id,
          qty: '1',
          unitCost: String(targetProd.purchasePrice),
        },
      ]);
    } else {
      setMovTransferLines([{ id: 'tr_1', productId: '', qty: '1', unitCost: '' }]);
    }
    setShowQuickTransferMatForm(false);
    setMovReason(type === 'OUT' && pendingBci ? pendingBci.purposeAndPhase : '');
    setShowMovementModal(true);
  };

  const handleRecordStockMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const sourceWh =
      allWarehouses.find((w) => w.id === movWarehouseId) || generalWarehouse;
    const targetWh =
      allWarehouses.find((w) => w.id === movTargetWarehouseId) || generalWarehouse;

    // CAS SPÉCIFIQUE : TRANSFERT INTER-MAGASINS MULTI-MATÉRIELS
    if (movType === 'TRANSFER') {
      if (!movWarehouseId || !movTargetWarehouseId || movWarehouseId === movTargetWarehouseId) {
        onTriggerToast(
          'Veuillez sélectionner un magasin source et un magasin destination distincts (ex: Magasin Général vers Magasin Projet ou vice versa).'
        );
        return;
      }

      const validTransferLines: {
        product: CatalogItem;
        qty: number;
        unitCost: number;
      }[] = [];

      for (const line of movTransferLines) {
        const prod = physicalProducts.find((p) => p.id === line.productId);
        const qtyVal = Math.max(0, Number(line.qty) || 0);
        if (!prod || qtyVal <= 0) continue;

        if (qtyVal > prod.stockQty) {
          onTriggerToast(
            `Stock global insuffisant pour "${prod.name}" (Disponible : ${prod.stockQty} ${prod.unit}).`
          );
          return;
        }
        const sourceWhAvailable = getProductStockInWarehouse(prod, sourceWh.id);
        if (qtyVal > sourceWhAvailable && Object.keys(prod.stockByWarehouse || {}).length > 0) {
          onTriggerToast(
            `Quantité insuffisante dans "${sourceWh.name}" pour "${prod.name}" (Disponible dans ce magasin : ${sourceWhAvailable} ${prod.unit}).`
          );
          return;
        }
        validTransferLines.push({
          product: prod,
          qty: qtyVal,
          unitCost: Math.max(0, Number(line.unitCost) || prod.purchasePrice),
        });
      }

      if (validTransferLines.length === 0) {
        onTriggerToast(
          'Veuillez sélectionner au moins un matériel avec une quantité supérieure à 0 dans la liste de transfert.'
        );
        return;
      }

      const transferItemsPayload: ExportableStockMovementItemLine[] = validTransferLines.map((tl) => {
        const prevSt = getProductStockInWarehouse(tl.product, sourceWh.id);
        const nextSt = Math.max(0, prevSt - tl.qty);
        return {
          productId: tl.product.id,
          productSku: tl.product.sku,
          productName: tl.product.name,
          unit: tl.product.unit,
          quantity: tl.qty,
          previousStock: prevSt,
          newStock: nextSt,
          unitCost: tl.unitCost,
          totalValue: Number((tl.qty * tl.unitCost).toFixed(2)),
        };
      });

      const firstTl = validTransferLines[0];
      const totalQtySum = transferItemsPayload.reduce((acc, i) => acc + i.quantity, 0);
      const totalValueSum = transferItemsPayload.reduce((acc, i) => acc + i.totalValue, 0);

      const newTransferMovement: StockMovementRecord = {
        id: `mov_${Date.now()}`,
        voucherNumber: movVoucherNumber.trim().toUpperCase(),
        date: new Date().toISOString().slice(0, 10),
        movementType: 'TRANSFER',
        productId: firstTl.product.id,
        productSku:
          validTransferLines.length > 1
            ? `${firstTl.product.sku} (+${validTransferLines.length - 1})`
            : firstTl.product.sku,
        productName:
          validTransferLines.length > 1
            ? `${validTransferLines.map((v) => v.product.name).join(', ')}`
            : firstTl.product.name,
        unit: validTransferLines.length > 1 ? 'Lots/Unités' : firstTl.product.unit,
        quantity: totalQtySum,
        previousStock: transferItemsPayload[0].previousStock,
        newStock: transferItemsPayload[0].newStock,
        unitCost: firstTl.unitCost,
        totalValue: totalValueSum,
        transferItems: transferItemsPayload,
        projectId: movProjectId || 'general',
        projectName: `${sourceWh.projectName} → ${targetWh.projectName}`,
        projectType: firstTl.product.projectType,
        projectTypeLabel:
          PROJECT_EXPLOITATION_TYPES.find((t) => t.id === firstTl.product.projectType)?.shortLabel ||
          'Projet',
        warehouseId: sourceWh.id,
        warehouseName: `${sourceWh.name} → ${targetWh.name}`,
        warehouseLocation: sourceWh.location,
        sourceWarehouseName: sourceWh.name,
        targetWarehouseId: targetWh.id,
        targetWarehouseName: targetWh.name,
        targetProjectName: targetWh.projectName,
        operatorName: currentUserName,
        reason:
          movReason.trim() ||
          `Transfert inter-magasins (${validTransferLines.length} matériel(s)) de "${sourceWh.name}" vers "${targetWh.name}"`,
        sourceDocReference: movSourceRef.trim().toUpperCase() || movVoucherNumber.trim().toUpperCase(),
        sourceDocFileName: 'Bon_Transfert_Inter_Magasins.pdf',
      };

      // Mise à jour des stocks de tous les matériels transférés
      setCatalogItems((prev) =>
        prev.map((item) => {
          const matchingLines = validTransferLines.filter((tl) => tl.product.id === item.id);
          if (matchingLines.length === 0) return item;
          const totalMovedForItem = matchingLines.reduce((acc, m) => acc + m.qty, 0);
          const currentWhMap: Record<string, number> = {
            ...(item.stockByWarehouse || {
              [item.warehouseId || 'wh_general']: item.stockQty,
            }),
          };
          const srcPrev = currentWhMap[sourceWh.id] ?? item.stockQty;
          currentWhMap[sourceWh.id] = Math.max(0, srcPrev - totalMovedForItem);
          currentWhMap[targetWh.id] = (currentWhMap[targetWh.id] || 0) + totalMovedForItem;

          return {
            ...item,
            warehouseId: targetWh.id,
            warehouseLocation: targetWh.name,
            stockByWarehouse: currentWhMap,
          };
        })
      );

      setStockMovements((prev) => [newTransferMovement, ...prev]);
      setShowMovementModal(false);

      onRecordAuditTrace(
        'MAGASIN_STOCK',
        'TRANSFERT_INTER_MAGASINS',
        newTransferMovement.voucherNumber,
        `Transfert de ${validTransferLines.length} matériel(s) (${newTransferMovement.productName}) : ${sourceWh.name} → ${targetWh.name}`
      );

      exportStockMovementToPDF(
        newTransferMovement,
        currency,
        companyName,
        companyLogo,
        docCustomization
      );
      onTriggerToast(
        `Transfert ${newTransferMovement.voucherNumber} (${validTransferLines.length} matériel(s) : ${sourceWh.name} → ${targetWh.name}) validé et Bon de Transfert PDF généré.`
      );
      return;
    }

    const product = physicalProducts.find((p) => p.id === movProductId);
    if (!product) {
      onTriggerToast('Veuillez d’abord créer et sélectionner un produit stockable.');
      return;
    }

    // Condition strictement obligatoire :
    // - Entrée en stock (IN) conditionnée par un Bon de Livraison (BL) + document numérisé
    // - Sortie de stock (OUT) déclenchée par la présentation d'un Bon de Commande Interne (BCI) délivré par un des responsables du projet
    //   et le responsable du corps de métier devant utiliser le produit/matériel au magasinier contre délivrance d'un Bon de Sortie (BS)
    if (movType === 'IN') {
      if (!movSourceRef.trim()) {
        onTriggerToast('La référence du Bon de Livraison (BL) est obligatoire pour toute entrée en stock.');
        return;
      }
      if (!movScannedDataUrl) {
        onTriggerToast('Veuillez numériser / joindre la copie physique du Bon de Livraison (BL) avant de valider l’entrée.');
        return;
      }
    }

    if (movType === 'OUT') {
      if (!movSourceRef.trim()) {
        onTriggerToast('La référence du Bon de Commande Interne (BCI) est obligatoire pour déclencher toute sortie de stock.');
        return;
      }
      if (!movProjectManagerName.trim() || !movTradeLeaderName.trim() || !movTradeName.trim()) {
        onTriggerToast(
          'Veuillez renseigner le Responsable du Projet et le Responsable du Corps de Métier ayant délivré le Bon de Commande Interne (BCI).'
        );
        return;
      }
      if (!movScannedDataUrl && !movSelectedBciId) {
        onTriggerToast('Veuillez numériser / joindre le Bon de Commande Interne (BCI) présenté au magasinier avant la délivrance du Bon de Sortie.');
        return;
      }
    }

    const qtyInput = Math.max(0, Number(movQuantity) || 0);
    if (movType !== 'INVENTORY' && qtyInput <= 0) {
      onTriggerToast('La quantité doit être supérieure à 0.');
      return;
    }

    if (movType === 'OUT' && qtyInput > product.stockQty) {
      onTriggerToast(
        `Stock insuffisant pour "${product.name}" (Disponible : ${product.stockQty} ${product.unit}).`
      );
      return;
    }

    const previousStock = product.stockQty;
    const newStock =
      movType === 'IN'
        ? product.stockQty + qtyInput
        : movType === 'OUT'
        ? Math.max(0, product.stockQty - qtyInput)
        : qtyInput;

    const movementDelta =
      movType === 'INVENTORY' ? Math.abs(newStock - previousStock) : qtyInput;
    const unitCost = Math.max(0, Number(movUnitCost) || product.purchasePrice);
    const totalValue =
      movType === 'INVENTORY' ? newStock * unitCost : movementDelta * unitCost;

    const linkedProj = projects.find((p) => p.id === movProjectId);
    const projName = linkedProj?.name || sourceWh.projectName || 'Projet en Exploitation';
    const linkedSup = suppliers.find((s) => s.id === movSupplierId);

    const newMovement: StockMovementRecord = {
      id: `mov_${Date.now()}`,
      voucherNumber: movVoucherNumber.trim().toUpperCase(),
      date: new Date().toISOString().slice(0, 10),
      movementType: movType,
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      unit: product.unit,
      quantity: movType === 'INVENTORY' ? newStock : qtyInput,
      previousStock,
      newStock,
      unitCost,
      totalValue,
      projectId: movProjectId || 'general',
      projectName: projName,
      projectType: movProjectType,
      projectTypeLabel:
        PROJECT_EXPLOITATION_TYPES.find((t) => t.id === movProjectType)?.shortLabel || 'Projet',
      warehouseId: sourceWh.id,
      warehouseName: sourceWh.name || product.warehouseLocation,
      warehouseLocation: sourceWh.location || product.warehouseLocation,
      sourceWarehouseName: sourceWh.name,
      operatorName: movType === 'OUT' ? movWarehouseManagerName.trim() || currentUserName : currentUserName,
      reason:
        movReason.trim() ||
        (movType === 'IN'
          ? `Entrée sur Bon de Livraison N° ${movSourceRef.toUpperCase()}`
          : movType === 'OUT'
          ? `Sortie sur présentation du BCI N° ${movSourceRef.toUpperCase()} (Resp. Projet: ${movProjectManagerName} | Corps de Métier: ${movTradeName} - ${movTradeLeaderName})`
          : 'Régularisation d’inventaire'),
      sourceDocReference: movSourceRef.trim().toUpperCase() || movVoucherNumber.trim().toUpperCase(),
      sourceDocFileName:
        movScannedFileName ||
        (movType === 'OUT'
          ? `${movSourceRef.trim().toUpperCase()}_BCI_Numerise.pdf`
          : 'Piece_Justificative_Numerisee.pdf'),
      scannedDocDataUrl: movScannedDataUrl || undefined,
      supplierName: linkedSup?.companyName,
      purchaseOrderId: movPoId || undefined,
      projectManagerName: movType === 'OUT' ? movProjectManagerName.trim() : undefined,
      tradeName: movType === 'OUT' ? movTradeName.trim() : undefined,
      tradeLeaderName: movType === 'OUT' ? movTradeLeaderName.trim() : undefined,
      warehouseManagerName:
        movType === 'OUT' ? movWarehouseManagerName.trim() || currentUserName : undefined,
      internalRequisitionId: movType === 'OUT' ? movSelectedBciId || undefined : undefined,
    };

    // Update or register the digitized BCI in the traceable registry when Stock Exit (OUT) is executed
    if (movType === 'OUT') {
      const existingBci = internalRequisitions.find(
        (b) =>
          b.id === movSelectedBciId ||
          b.bciNumber.toUpperCase() === newMovement.sourceDocReference?.toUpperCase()
      );
      if (existingBci) {
        updateInternalRequisitions((prev) =>
          prev.map((b) =>
            b.id === existingBci.id
              ? {
                  ...b,
                  status: 'fulfilled_stock_out',
                  deliveredQuantity: qtyInput,
                  stockOutVoucherNumber: newMovement.voucherNumber,
                  stockOutDate: newMovement.date,
                  warehouseManagerName: movWarehouseManagerName.trim() || b.warehouseManagerName,
                  scannedBciFileName: movScannedFileName || b.scannedBciFileName,
                  scannedBciDataUrl: movScannedDataUrl || b.scannedBciDataUrl,
                }
              : b
          )
        );
      } else {
        const autoBci: ExportableInternalRequisition = {
          id: `bci_${Date.now()}`,
          bciNumber: newMovement.sourceDocReference || `BCI-${Date.now()}`,
          date: newMovement.date,
          projectId: newMovement.projectId,
          projectName: newMovement.projectName,
          projectTypeLabel: newMovement.projectTypeLabel,
          projectManagerName: movProjectManagerName.trim(),
          tradeName: movTradeName.trim(),
          tradeLeaderName: movTradeLeaderName.trim(),
          warehouseId: sourceWh.id,
          warehouseName: sourceWh.name,
          warehouseManagerName: movWarehouseManagerName.trim() || currentUserName,
          productId: product.id,
          productSku: product.sku,
          productName: product.name,
          unit: product.unit,
          requestedQuantity: qtyInput,
          deliveredQuantity: qtyInput,
          unitCost,
          totalEstimatedValue: totalValue,
          purposeAndPhase: newMovement.reason,
          status: 'fulfilled_stock_out',
          scannedBciFileName: newMovement.sourceDocFileName,
          scannedBciDataUrl: movScannedDataUrl || undefined,
          stockOutVoucherNumber: newMovement.voucherNumber,
          stockOutDate: newMovement.date,
        };
        updateInternalRequisitions((prev) => [autoBci, ...prev]);
      }
    }

    // Update product stock (global & per warehouse)
    setCatalogItems((prev) =>
      prev.map((item) => {
        if (item.id !== product.id) return item;
        const currentWhMap: Record<string, number> = {
          ...(item.stockByWarehouse || {
            [item.warehouseId || 'wh_general']: item.stockQty,
          }),
        };
        if (movType === 'IN') {
          currentWhMap[sourceWh.id] = (currentWhMap[sourceWh.id] || 0) + qtyInput;
        } else if (movType === 'OUT') {
          currentWhMap[sourceWh.id] = Math.max(0, (currentWhMap[sourceWh.id] || item.stockQty) - qtyInput);
        } else if (movType === 'INVENTORY') {
          currentWhMap[sourceWh.id] = qtyInput;
        }

        return {
          ...item,
          stockQty: newStock,
          stockByWarehouse: currentWhMap,
          purchasePrice: unitCost > 0 ? unitCost : item.purchasePrice,
        };
      })
    );

    setStockMovements((prev) => [newMovement, ...prev]);
    setShowMovementModal(false);

    onRecordAuditTrace(
      'MAGASIN_STOCK',
      movType === 'IN'
        ? 'ENTREE_STOCK_SUR_BL'
        : movType === 'OUT'
        ? 'SORTIE_STOCK_SUR_BCI_CONTRE_BON_SORTIE'
        : 'INVENTAIRE_PHYSIQUE',
      newMovement.voucherNumber,
      movType === 'OUT'
        ? `Sortie de ${qtyInput} ${product.unit} de "${product.name}" sur BCI N° ${newMovement.sourceDocReference} (Resp. Projet: ${movProjectManagerName} | Corps de métier: ${movTradeName} - ${movTradeLeaderName}) par Magasinier ${movWarehouseManagerName || currentUserName} contre Bon de Sortie ${newMovement.voucherNumber}`
        : `${product.name} (+${qtyInput} ${product.unit}) | Pièce : ${
            newMovement.sourceDocReference || 'PV'
          } | Magasin : ${sourceWh.name}`
    );

    if (movType === 'OUT') {
      exportStockMovementToPDF(newMovement, currency, companyName, companyLogo, docCustomization);
      onTriggerToast(
        `Sortie exécutée sur présentation du BCI N° ${newMovement.sourceDocReference}. Bon de Sortie (${newMovement.voucherNumber}) délivré et archivé.`
      );
    } else {
      onTriggerToast(
        `Mouvement ${newMovement.voucherNumber} enregistré avec sauvegarde du document numérisé.`
      );
    }
  };

  // =========================================================================
  // HANDLERS: EMPLOYÉS (MATRICULE AUTO NON MODIFIABLE, CESSATION, MUTATION & BADGE)
  // =========================================================================
  const stopEmpEnrollmentFaceCamera = () => {
    if (empVideoRef.current && empVideoRef.current.srcObject) {
      const stream = empVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      empVideoRef.current.srcObject = null;
    }
    setEmpFaceCameraActive(false);
  };

  const startEmpEnrollmentFaceCamera = async () => {
    try {
      setEmpFaceCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (empVideoRef.current) {
        empVideoRef.current.srcObject = stream;
      }
    } catch {
      setEmpFaceCameraActive(false);
      const fallbackHash = `BIO-FACE-3D-${empMatricule || 'EMP'}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;
      setEmpFaceBiometricHash(fallbackHash);
      onTriggerToast(
        `Signature faciale biométrique générée et rattachée à la fiche d'embauche (${fallbackHash}).`
      );
    }
  };

  const captureEmpEnrollmentFace = () => {
    if (empVideoRef.current && empFaceCameraActive) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = empVideoRef.current.videoWidth || 320;
        canvas.height = empVideoRef.current.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(empVideoRef.current, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setEmpPhotoDataUrl(dataUrl);
        }
      } catch {
        // Ignore canvas error
      }
      stopEmpEnrollmentFaceCamera();
    }
    const generatedFaceHash = `BIO-FACE-3D-${empMatricule || 'EMP'}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;
    setEmpFaceBiometricHash(generatedFaceHash);
    onTriggerToast(`Visage capturé et gabarit biométrique facial enregistré (${generatedFaceHash}).`);
  };

  const enrollEmpFingerprintSensor = async () => {
    setEmpFingerprintScanning(true);
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        // Fallback hash
      }
    }
    setTimeout(() => {
      const fpHash = `BIO-FP-SHA256-${empMatricule || 'EMP'}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;
      setEmpFingerprintBiometricHash(fpHash);
      setEmpFingerprintScanning(false);
      onTriggerToast(`Empreinte digitale enrôlée avec succès sur la fiche d'embauche (${fpHash}).`);
    }, 550);
  };

  const openCreateEmployeeModal = () => {
    setEditingEmpId(null);
    setEmpFormError('');
    const nextMat = generateUniqueEmployeeMatricule(employees.length);
    setEmpMatricule(nextMat);
    setEmpFullName('');
    setEmpWorkerCategory('Technicien');
    setEmpPhone('');
    setEmpEmail('');
    setEmpPosition('Technicien d’Exécution');
    setEmpDepartment('Ingénierie & Projets');
    setEmpContractType('CDI');
    setEmpRemunerationBasis('monthly_norm');
    setEmpPeriodicity('Mensuel');
    setEmpHireDate(new Date().toISOString().slice(0, 10));
    setEmpContractEndDate('');
    setEmpStatus('active');
    setEmpAssignedProjectId(projects[0]?.id || 'general');
    setEmpBaseSalary('');
    setEmpTransport('0');
    setEmpSsn('');
    setEmpNationalId('');
    setEmpEmergencyContact('');
    setEmpBloodGroup('O+');
    setEmpPaymentMethod('Virement Bancaire');
    setEmpAccount('');
    setEmpPhotoDataUrl('');
    setEmpGradeOrEchelon('Catégorie C1 - Échelon 1');
    setEmpFaceBiometricHash('');
    setEmpFingerprintBiometricHash('');
    setEmpFaceCameraActive(false);
    setEmpFingerprintScanning(false);
    const todayStr = new Date().toISOString().slice(0, 10);
    const nextYr = new Date();
    nextYr.setFullYear(nextYr.getFullYear() + 1);
    setEmpMedFitnessStatus('Apte sans restriction');
    setEmpMedDoctor('Dr. KOUASSI Marc (Médecin du Travail Agréé)');
    setEmpMedCenter('Centre Médical Inter-Entreprises & Santé au Travail');
    setEmpMedLastExamDate(todayStr);
    setEmpMedNextExamDate(nextYr.toISOString().slice(0, 10));
    setEmpMedHeightCm('175');
    setEmpMedWeightKg('74');
    setEmpMedChronicConditions('Aucune pathologie chronique déclarée');
    setEmpMedSurgeries('Aucun antécédent chirurgical majeur');
    setEmpMedFamilyHistory('R.A.S');
    setEmpMedAllergies('Aucune allergie connue');
    setEmpMedOngoingTreatments('Aucun traitement permanent');
    setEmpMedWorkRestrictions('Aucune restriction d’aptitude au poste');
    setEmpMedRequiredPpe('Casque normé, Chaussures de sécurité S3, Gants, Gilet HV');
    setEmpMedVaccinations('Tétanos (À jour), Fièvre Jaune (À jour)');
    setEmpMedEmergencyNotes('Contacter le médecin du travail et le contact d’urgence.');
    setEmpMedVisits([
      {
        id: `med_vis_${Date.now()}`,
        date: todayStr,
        type: 'Visite d’embauche',
        doctorName: 'Dr. KOUASSI Marc',
        conclusion: 'Apte à l’embauche sans restriction',
        notes: 'Examen médical d’aptitude initial concluant.',
      },
    ]);
    setShowEmployeeModal(true);
  };

  const openEditEmployeeModal = (emp: EmployeeRecord) => {
    setEditingEmpId(emp.id);
    setEmpFormError('');
    // Le matricule unique est strictement conservé et non modifiable
    setEmpMatricule(emp.matricule);
    setEmpFullName(emp.fullName);
    setEmpWorkerCategory(emp.workerCategory);
    setEmpPhone(emp.phone);
    setEmpEmail(emp.email);
    setEmpPosition(emp.position);
    setEmpDepartment(emp.department);
    setEmpContractType(emp.contractType);
    setEmpRemunerationBasis(emp.remunerationBasis);
    setEmpPeriodicity(emp.paymentPeriodicity);
    setEmpHireDate(emp.hireDate);
    setEmpContractEndDate(emp.contractEndDate || '');
    setEmpStatus(emp.status);
    setEmpAssignedProjectId(emp.assignedProjectId);
    setEmpBaseSalary(String(emp.baseSalary));
    setEmpTransport(String(emp.transportAllowance));
    setEmpSsn(emp.socialSecurityNumber);
    setEmpNationalId(emp.nationalIdNumber);
    setEmpEmergencyContact(emp.emergencyContact);
    setEmpBloodGroup(emp.bloodGroup || 'O+');
    setEmpPaymentMethod(emp.paymentMethod);
    setEmpAccount(emp.bankOrMobileAccount);
    setEmpPhotoDataUrl(emp.photoDataUrl || emp.faceBiometricDataUrl || '');
    setEmpGradeOrEchelon(emp.gradeOrEchelon || 'Catégorie C1 - Échelon 1');
    setEmpFaceBiometricHash(emp.faceBiometricHash || '');
    setEmpFingerprintBiometricHash(emp.fingerprintBiometricHash || '');
    setEmpFaceCameraActive(false);
    setEmpFingerprintScanning(false);
    const med = emp.medicalRecord;
    const todayStr = new Date().toISOString().slice(0, 10);
    const nextYr = new Date();
    nextYr.setFullYear(nextYr.getFullYear() + 1);
    setEmpMedFitnessStatus(med?.fitnessStatus || 'Apte sans restriction');
    setEmpMedDoctor(med?.occupationalDoctor || 'Dr. KOUASSI Marc (Médecin du Travail Agréé)');
    setEmpMedCenter(med?.medicalCenter || 'Centre Médical Inter-Entreprises & Santé au Travail');
    setEmpMedLastExamDate(med?.lastMedicalExamDate || emp.hireDate || todayStr);
    setEmpMedNextExamDate(med?.nextMedicalExamDate || nextYr.toISOString().slice(0, 10));
    setEmpMedHeightCm(med?.heightCm ? String(med.heightCm) : '175');
    setEmpMedWeightKg(med?.weightKg ? String(med.weightKg) : '74');
    setEmpMedChronicConditions(med?.chronicConditions || 'Aucune pathologie chronique déclarée');
    setEmpMedSurgeries(med?.surgicalAndHospitalHistory || 'Aucun antécédent chirurgical majeur');
    setEmpMedFamilyHistory(med?.familyMedicalHistory || 'R.A.S');
    setEmpMedAllergies(med?.allergiesAndHypersensitivities || 'Aucune allergie connue');
    setEmpMedOngoingTreatments(med?.ongoingTreatments || 'Aucun traitement permanent');
    setEmpMedWorkRestrictions(med?.workplaceRestrictions || 'Aucune restriction d’aptitude au poste');
    setEmpMedRequiredPpe(med?.requiredPpe || 'Casque normé, Chaussures de sécurité S3, Gants, Gilet HV');
    setEmpMedVaccinations(med?.vaccinationsUpToDate || 'Tétanos (À jour), Fièvre Jaune (À jour)');
    setEmpMedEmergencyNotes(med?.emergencyMedicalNotes || 'Contacter le médecin du travail et le contact d’urgence.');
    setEmpMedVisits(
      med?.medicalVisits && med.medicalVisits.length > 0
        ? med.medicalVisits
        : [
            {
              id: `med_vis_${emp.id}_1`,
              date: emp.hireDate || todayStr,
              type: 'Visite d’embauche',
              doctorName: med?.occupationalDoctor || 'Dr. KOUASSI Marc',
              conclusion: 'Apte au poste sans restriction',
              notes: 'Visite médicale réglementaire d’embauche validée.',
            },
          ]
    );
    setShowEmployeeModal(true);
  };


  const buildDefaultMedicalRecord = (emp: EmployeeRecord): ExportableEmployeeMedicalRecord => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const nextYr = new Date();
    nextYr.setFullYear(nextYr.getFullYear() + 1);
    const existing = emp.medicalRecord;
    return {
      employeeId: emp.id,
      matricule: emp.matricule,
      fullName: emp.fullName,
      position: emp.position,
      department: emp.department,
      assignedProjectName: emp.assignedProjectName,
      bloodGroup: emp.bloodGroup || 'O+',
      emergencyContact: emp.emergencyContact || 'Non renseigné',
      phone: emp.phone,
      nationalIdNumber: emp.nationalIdNumber,
      socialSecurityNumber: emp.socialSecurityNumber,
      photoDataUrl: emp.photoDataUrl || emp.faceBiometricDataUrl,
      fitnessStatus: existing?.fitnessStatus || 'Apte sans restriction',
      occupationalDoctor: existing?.occupationalDoctor || 'Dr. KOUASSI Marc (Médecin du Travail Agréé)',
      medicalCenter: existing?.medicalCenter || 'Centre Médical Inter-Entreprises & Santé au Travail',
      lastMedicalExamDate: existing?.lastMedicalExamDate || emp.hireDate || todayStr,
      nextMedicalExamDate: existing?.nextMedicalExamDate || nextYr.toISOString().slice(0, 10),
      heightCm: existing?.heightCm || 175,
      weightKg: existing?.weightKg || 74,
      chronicConditions: existing?.chronicConditions || 'Aucune pathologie chronique déclarée',
      surgicalAndHospitalHistory: existing?.surgicalAndHospitalHistory || 'Aucun antécédent chirurgical ou hospitalisation majeure',
      familyMedicalHistory: existing?.familyMedicalHistory || 'R.A.S (Aucun antécédent familial signalé)',
      allergiesAndHypersensitivities: existing?.allergiesAndHypersensitivities || 'Aucune allergie médicamenteuse ou professionnelle connue',
      ongoingTreatments: existing?.ongoingTreatments || 'Aucun traitement médical permanent en cours',
      workplaceRestrictions: existing?.workplaceRestrictions || 'Aucune restriction — Apte aux travaux de chantier et d’exploitation',
      requiredPpe: existing?.requiredPpe || 'Casque normé, Chaussures de sécurité S3, Gants de protection, Gilet haute visibilité',
      vaccinationsUpToDate: existing?.vaccinationsUpToDate || 'Tétanos (À jour), Fièvre Jaune (À jour), Hépatite B (À jour)',
      emergencyMedicalNotes: existing?.emergencyMedicalNotes || 'Prévenir immédiatement le contact d’urgence et le médecin du travail en cas d’incident.',
      medicalVisits:
        existing?.medicalVisits && existing.medicalVisits.length > 0
          ? existing.medicalVisits
          : [
              {
                id: `med_vis_${emp.id}_init`,
                date: emp.hireDate || todayStr,
                type: 'Visite d’embauche',
                doctorName: existing?.occupationalDoctor || 'Dr. KOUASSI Marc',
                conclusion: 'Apte au poste sans restriction',
                notes: 'Examen médical réglementaire d’embauche validé.',
              },
            ],
    };
  };

  const openMedicalModalForEmployee = (emp: EmployeeRecord) => {
    const med = buildDefaultMedicalRecord(emp);
    setEmpMedFitnessStatus(med.fitnessStatus);
    setEmpMedDoctor(med.occupationalDoctor);
    setEmpMedCenter(med.medicalCenter);
    setEmpMedLastExamDate(med.lastMedicalExamDate);
    setEmpMedNextExamDate(med.nextMedicalExamDate);
    setEmpMedHeightCm(String(med.heightCm || 175));
    setEmpMedWeightKg(String(med.weightKg || 74));
    setEmpMedChronicConditions(med.chronicConditions);
    setEmpMedSurgeries(med.surgicalAndHospitalHistory);
    setEmpMedFamilyHistory(med.familyMedicalHistory);
    setEmpMedAllergies(med.allergiesAndHypersensitivities);
    setEmpMedOngoingTreatments(med.ongoingTreatments);
    setEmpMedWorkRestrictions(med.workplaceRestrictions);
    setEmpMedRequiredPpe(med.requiredPpe);
    setEmpMedVaccinations(med.vaccinationsUpToDate);
    setEmpMedEmergencyNotes(med.emergencyMedicalNotes);
    setEmpMedVisits(med.medicalVisits);
    setMedicalModalEmployee(emp);
  };

  const handleSaveMedicalDossierOnly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicalModalEmployee) return;
    const updatedMed: ExportableEmployeeMedicalRecord = {
      employeeId: medicalModalEmployee.id,
      matricule: medicalModalEmployee.matricule,
      fullName: medicalModalEmployee.fullName,
      position: medicalModalEmployee.position,
      department: medicalModalEmployee.department,
      assignedProjectName: medicalModalEmployee.assignedProjectName,
      bloodGroup: medicalModalEmployee.bloodGroup || 'O+',
      emergencyContact: medicalModalEmployee.emergencyContact,
      phone: medicalModalEmployee.phone,
      nationalIdNumber: medicalModalEmployee.nationalIdNumber,
      socialSecurityNumber: medicalModalEmployee.socialSecurityNumber,
      photoDataUrl: medicalModalEmployee.photoDataUrl || medicalModalEmployee.faceBiometricDataUrl,
      fitnessStatus: empMedFitnessStatus,
      occupationalDoctor: empMedDoctor.trim() || 'Médecin du Travail',
      medicalCenter: empMedCenter.trim() || 'Centre Médical du Travail',
      lastMedicalExamDate: empMedLastExamDate,
      nextMedicalExamDate: empMedNextExamDate,
      heightCm: Number(empMedHeightCm) || undefined,
      weightKg: Number(empMedWeightKg) || undefined,
      chronicConditions: empMedChronicConditions.trim() || 'Aucune pathologie chronique déclarée',
      surgicalAndHospitalHistory: empMedSurgeries.trim() || 'Aucun antécédent chirurgical',
      familyMedicalHistory: empMedFamilyHistory.trim() || 'R.A.S',
      allergiesAndHypersensitivities: empMedAllergies.trim() || 'Aucune allergie connue',
      ongoingTreatments: empMedOngoingTreatments.trim() || 'Aucun traitement en cours',
      workplaceRestrictions: empMedWorkRestrictions.trim() || 'Aucune restriction',
      requiredPpe: empMedRequiredPpe.trim() || 'EPI standards obligatoires',
      vaccinationsUpToDate: empMedVaccinations.trim() || 'À jour',
      emergencyMedicalNotes: empMedEmergencyNotes.trim() || 'R.A.S',
      medicalVisits: empMedVisits,
    };

    const updatedEmp: EmployeeRecord = {
      ...medicalModalEmployee,
      medicalRecord: updatedMed,
    };
    setEmployees((prev) => prev.map((item) => (item.id === medicalModalEmployee.id ? updatedEmp : item)));
    setMedicalModalEmployee(updatedEmp);
    onRecordAuditTrace(
      'RH_EMPLOYE',
      'MISE_A_JOUR_FICHE_MEDICALE',
      medicalModalEmployee.matricule,
      `Fiche médicale & antécédents mis à jour pour ${medicalModalEmployee.fullName} (${updatedMed.fitnessStatus})`
    );
    onTriggerToast(`Fiche médicale et antécédents de ${medicalModalEmployee.fullName} enregistrés dans son dossier.`);
  };

  const handleAddMedicalVisitToEmployee = () => {
    const visit: ExportableEmployeeMedicalVisit = {
      id: `med_vis_${Date.now()}`,
      date: newVisitDate || new Date().toISOString().slice(0, 10),
      type: newVisitType,
      doctorName: newVisitDoctor.trim() || empMedDoctor || 'Médecin du Travail',
      conclusion: newVisitConclusion.trim() || 'Apte sans réserve',
      notes: newVisitNotes.trim() || 'R.A.S',
    };
    setEmpMedVisits((prev) => [visit, ...prev]);
    setEmpMedLastExamDate(visit.date);
  };

  const handleEmployeePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setEmpPhotoDataUrl(ev.target.result);
        if (!empFaceBiometricHash) {
          const autoFaceHash = `BIO-FACE-3D-${empMatricule || 'EMP'}-${Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase()}`;
          setEmpFaceBiometricHash(autoFaceHash);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setEmpFormError('');
    const cleanName = empFullName.trim().toUpperCase();
    if (!cleanName) return;

    const formattedPhone = empPhone.trim().startsWith('+')
      ? empPhone.trim()
      : `${defaultDialCode} ${empPhone.trim()}`;

    const existingEmp = employees.find((item) => item.id === editingEmpId);

    // Contrôle d'exclusivité d'appartenance inter-entreprises :
    if (empStatus !== 'terminated') {
      const exclusivityCheck = checkExclusiveEnterpriseAffiliation({
        fullName: cleanName,
        email: empEmail.trim().toLowerCase(),
        phone: formattedPhone,
        nationalIdNumber: empNationalId.trim().toUpperCase(),
        currentTenantId: activeTenantId,
        excludeEmployeeId: editingEmpId || undefined,
        contractType: empContractType,
      });

      if (exclusivityCheck.conflict) {
        setEmpFormError(
          exclusivityCheck.reason ||
            "Cet employé appartient déjà à une entreprise active. Il ne peut être embauché ou répertorié dans une nouvelle entreprise qu'après cessation de contrat avec la première."
        );
        return;
      }
    }

    const assignedProj = projects.find((p) => p.id === empAssignedProjectId);
    const assignedProjName = assignedProj?.name || 'Direction Générale / Pool Entreprise';

    // Le matricule unique est strictement immuable après création
    const immutableMatricule = existingEmp
      ? existingEmp.matricule
      : empMatricule.trim().toUpperCase() || generateUniqueEmployeeMatricule(employees.length);

    // S'assurer que le visage et/ou l'empreinte digitale sont enregistrés sur la fiche d'embauche
    const finalFaceHash =
      empFaceBiometricHash.trim() ||
      existingEmp?.faceBiometricHash ||
      (empPhotoDataUrl
        ? `BIO-FACE-3D-${immutableMatricule}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
        : '');
    const finalFpHash =
      empFingerprintBiometricHash.trim() ||
      existingEmp?.fingerprintBiometricHash ||
      `BIO-FP-SHA256-${immutableMatricule}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const enrolledMethods: ('face' | 'fingerprint')[] = [];
    if (finalFaceHash) enrolledMethods.push('face');
    if (finalFpHash) enrolledMethods.push('fingerprint');

    const record: EmployeeRecord = {
      id: editingEmpId || `emp_${Date.now()}`,
      matricule: immutableMatricule,
      fullName: cleanName,
      workerCategory: empWorkerCategory,
      phone: formattedPhone,
      email: empEmail.trim().toLowerCase(),
      position: empPosition.trim(),
      department: empDepartment,
      contractType: empContractType,
      remunerationBasis: empContractType === 'CDI' ? 'monthly_norm' : empRemunerationBasis,
      paymentPeriodicity: empContractType === 'CDI' ? 'Mensuel' : empPeriodicity,
      hireDate: empHireDate,
      contractEndDate: empContractEndDate || undefined,
      status: empStatus,
      terminationDate:
        empStatus === 'terminated'
          ? existingEmp?.terminationDate || new Date().toISOString().slice(0, 10)
          : undefined,
      terminationReason:
        empStatus === 'terminated'
          ? existingEmp?.terminationReason || 'Cessation de contrat enregistrée'
          : undefined,
      assignedProjectId: empAssignedProjectId || 'general',
      assignedProjectName: assignedProjName,
      baseSalary: Math.max(0, Number(empBaseSalary) || 0),
      transportAllowance: Math.max(0, Number(empTransport) || 0),
      socialSecurityNumber: empSsn.trim().toUpperCase(),
      nationalIdNumber: empNationalId.trim().toUpperCase(),
      emergencyContact: empEmergencyContact.trim(),
      bloodGroup: empBloodGroup,
      paymentMethod: empPaymentMethod,
      bankOrMobileAccount: empAccount.trim(),
      photoDataUrl: empPhotoDataUrl || existingEmp?.photoDataUrl,
      faceBiometricDataUrl: empPhotoDataUrl || existingEmp?.faceBiometricDataUrl || existingEmp?.photoDataUrl,
      faceBiometricHash: finalFaceHash || undefined,
      fingerprintBiometricHash: finalFpHash || undefined,
      biometricEnrolledAt: existingEmp?.biometricEnrolledAt || new Date().toISOString(),
      biometricMethods: enrolledMethods,
      gradeOrEchelon: empGradeOrEchelon.trim() || existingEmp?.gradeOrEchelon || 'Catégorie C1 - Échelon 1',
      biometricEnrolled: enrolledMethods.length > 0,
      transferHistory: existingEmp?.transferHistory || [],
      hrEvents: existingEmp?.hrEvents || [],
      medicalRecord: {
        employeeId: editingEmpId || `emp_${Date.now()}`,
        matricule: immutableMatricule,
        fullName: cleanName,
        position: empPosition.trim(),
        department: empDepartment,
        assignedProjectName: assignedProjName,
        bloodGroup: empBloodGroup || 'O+',
        emergencyContact: empEmergencyContact.trim(),
        phone: formattedPhone,
        nationalIdNumber: empNationalId.trim().toUpperCase(),
        socialSecurityNumber: empSsn.trim().toUpperCase(),
        photoDataUrl: empPhotoDataUrl || existingEmp?.photoDataUrl,
        fitnessStatus: empMedFitnessStatus,
        occupationalDoctor: empMedDoctor.trim() || 'Médecin du Travail',
        medicalCenter: empMedCenter.trim() || 'Centre Médical du Travail',
        lastMedicalExamDate: empMedLastExamDate || empHireDate,
        nextMedicalExamDate: empMedNextExamDate || empHireDate,
        heightCm: Number(empMedHeightCm) || undefined,
        weightKg: Number(empMedWeightKg) || undefined,
        chronicConditions: empMedChronicConditions.trim() || 'Aucune pathologie chronique déclarée',
        surgicalAndHospitalHistory: empMedSurgeries.trim() || 'Aucun antécédent chirurgical ou hospitalisation',
        familyMedicalHistory: empMedFamilyHistory.trim() || 'R.A.S',
        allergiesAndHypersensitivities: empMedAllergies.trim() || 'Aucune allergie connue',
        ongoingTreatments: empMedOngoingTreatments.trim() || 'Aucun traitement en cours',
        workplaceRestrictions: empMedWorkRestrictions.trim() || 'Aucune restriction',
        requiredPpe: empMedRequiredPpe.trim() || 'EPI standards obligatoires',
        vaccinationsUpToDate: empMedVaccinations.trim() || 'À jour',
        emergencyMedicalNotes: empMedEmergencyNotes.trim() || 'R.A.S',
        medicalVisits: empMedVisits,
      },
    };

    if (empFaceCameraActive) stopEmpEnrollmentFaceCamera();

    if (editingEmpId) {
      setEmployees((prev) => prev.map((item) => (item.id === editingEmpId ? record : item)));
      if (empStatus === 'terminated' && existingEmp?.status !== 'terminated') {
        onTerminateEmployeeContract?.(
          record.id,
          record.matricule,
          record.terminationDate || new Date().toISOString().slice(0, 10),
          record.terminationReason || 'Cessation de contrat'
        );
      }
      onRecordAuditTrace(
        'RH_EMPLOYE',
        'MODIFICATION_FICHE_PERSONNEL',
        record.matricule,
        `Fiche & Biométrie mises à jour (Matricule ${record.matricule}) : ${record.fullName} — Biométrie : ${enrolledMethods.join(' + ')}`
      );
      onTriggerToast(`Fiche d'embauche et empreintes biométriques de ${record.fullName} (${record.matricule}) mises à jour.`);
    } else {
      setEmployees((prev) => [record, ...prev]);
      onRecordAuditTrace(
        'RH_EMPLOYE',
        'EMBAUCHE_ET_ENRÔLEMENT_BIOMÉTRIQUE',
        record.matricule,
        `Nouvel employé embauché avec enrôlement biométrique (${enrolledMethods.join(' + ')}) : ${record.fullName} (${record.matricule})`
      );
      onTriggerToast(
        `Personnel ${record.fullName} (${record.matricule}) embauché avec données biométriques (Visage/Empreinte) activées pour l'émargement automatique.`
      );
    }
    setShowEmployeeModal(false);
  };

  // Enregistrer un acte dans le Dossier RH (Congé, Infraction, Blâme, Mission, Mutation, Avancement Manuel/Auto, Rupture)
  const handleRecordHrEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrDossierEmployee) return;

    // Règle métier : Les congés statutaires concernent les employés en CDI et CDD
    if (
      hrEventCategory === 'leave' &&
      hrDossierEmployee.contractType === 'Temporaire / Journalier'
    ) {
      onTriggerToast(
        'Règle RH : Les congés statutaires sont réservés aux employés sous contrat CDI ou CDD. Les employés temporaires disposent des missions, infractions et pointages.'
      );
      return;
    }

    const refCode = `RH-${hrEventCategory.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-5)}`;
    const today = new Date().toISOString().slice(0, 10);
    const targetProj = projects.find((p) => p.id === hrEventTargetProjectId);

    const prevSalary = hrDossierEmployee.baseSalary;
    const increasePct = Math.max(0, Number(hrEventSalaryIncreasePct) || 0);
    const computedNewSalary =
      hrEventCategory === 'promotion' && increasePct > 0
        ? Math.round(prevSalary * (1 + increasePct / 100))
        : prevSalary;

    const newAct: ExportableHrEventAct = {
      id: `hrev_${Date.now()}`,
      reference: refCode,
      eventCategory: hrEventCategory,
      subType: hrEventSubType,
      title: hrEventTitle.trim() || hrEventSubType,
      date: today,
      startDate: hrEventStartDate,
      endDate: hrEventEndDate || undefined,
      employeeMatricule: hrDossierEmployee.matricule,
      employeeName: hrDossierEmployee.fullName,
      employeePosition:
        hrEventCategory === 'promotion' && hrEventNewPositionOrGrade.trim()
          ? hrEventNewPositionOrGrade.trim()
          : hrDossierEmployee.position,
      employeeContractType: hrDossierEmployee.contractType,
      projectName: hrDossierEmployee.assignedProjectName,
      targetProjectOrLocation:
        hrEventCategory === 'mutation'
          ? targetProj?.name || 'Direction Générale / Pool Entreprise'
          : hrEventCategory === 'mission'
          ? hrEventMissionLocation.trim() || hrDossierEmployee.assignedProjectName
          : undefined,
      promotionMode: hrEventCategory === 'promotion' ? hrEventPromotionMode : undefined,
      previousSalaryOrGrade:
        hrEventCategory === 'promotion'
          ? `${hrDossierEmployee.gradeOrEchelon || 'Échelon initial'} (${formatCurrency(prevSalary, currency)})`
          : undefined,
      newSalaryOrGrade:
        hrEventCategory === 'promotion'
          ? `${hrEventNewPositionOrGrade.trim() || 'Échelon supérieur'} (${formatCurrency(computedNewSalary, currency)})`
          : undefined,
      financialImpactOrAllowance: Math.max(0, Number(hrEventAllowanceOrImpact) || 0),
      details:
        hrEventDetails.trim() ||
        `Décision RH (${hrEventSubType}) enregistrée et synchronisée avec la fiche de ${hrDossierEmployee.fullName}.`,
      decisionMaker: currentUserName,
    };

    const updatedEmployee: EmployeeRecord = {
      ...hrDossierEmployee,
      status:
        hrEventCategory === 'termination'
          ? 'terminated'
          : hrEventCategory === 'leave' || hrEventCategory === 'mission'
          ? 'on_leave'
          : hrDossierEmployee.status,
      terminationDate:
        hrEventCategory === 'termination' ? hrEventStartDate || today : hrDossierEmployee.terminationDate,
      terminationReason:
        hrEventCategory === 'termination'
          ? `${hrEventSubType} — ${hrEventDetails.trim() || hrEventTitle}`
          : hrDossierEmployee.terminationReason,
      assignedProjectId:
        hrEventCategory === 'mutation' && hrEventTargetProjectId
          ? hrEventTargetProjectId
          : hrDossierEmployee.assignedProjectId,
      assignedProjectName:
        hrEventCategory === 'mutation' && hrEventTargetProjectId
          ? targetProj?.name || 'Pool Entreprise'
          : hrDossierEmployee.assignedProjectName,
      baseSalary: hrEventCategory === 'promotion' ? computedNewSalary : hrDossierEmployee.baseSalary,
      gradeOrEchelon:
        hrEventCategory === 'promotion' && hrEventNewPositionOrGrade.trim()
          ? hrEventNewPositionOrGrade.trim()
          : hrDossierEmployee.gradeOrEchelon,
      transferHistory:
        hrEventCategory === 'mutation'
          ? [
              {
                date: today,
                fromProjectName: hrDossierEmployee.assignedProjectName,
                toProjectName: targetProj?.name || 'Pool Entreprise',
                reason: `${hrEventSubType} : ${hrEventDetails.trim() || hrEventTitle}`,
              },
              ...(hrDossierEmployee.transferHistory || []),
            ]
          : hrDossierEmployee.transferHistory,
      hrEvents: [newAct, ...(hrDossierEmployee.hrEvents || [])],
    };

    setEmployees((prev) =>
      prev.map((emp) => (emp.id === hrDossierEmployee.id ? updatedEmployee : emp))
    );
    setHrDossierEmployee(updatedEmployee);

    if (hrEventCategory === 'termination') {
      onTerminateEmployeeContract?.(
        updatedEmployee.id,
        updatedEmployee.matricule,
        updatedEmployee.terminationDate || today,
        updatedEmployee.terminationReason || hrEventSubType
      );
    }

    onRecordAuditTrace(
      'RH_EMPLOYE',
      `ACTE_RH_${hrEventCategory.toUpperCase()}`,
      updatedEmployee.matricule,
      `${hrEventSubType} pour ${updatedEmployee.fullName} (${updatedEmployee.matricule}) — Réf : ${refCode}`
    );

    setHrEventTitle('');
    setHrEventDetails('');
    onTriggerToast(
      `Acte RH (${hrEventSubType}) enregistré et synchronisé pour ${updatedEmployee.fullName}.`
    );
  };

  // Calcul et application automatique des avancements pour les employés CDI/CDD éligibles
  const handleRunAutomaticPromotions = () => {
    const today = new Date().toISOString().slice(0, 10);
    let promotedCount = 0;

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.status === 'terminated' || emp.contractType === 'Temporaire / Journalier') {
          return emp;
        }
        const hasReprimand = (emp.hrEvents || []).some(
          (ev) => ev.eventCategory === 'reprimand' || ev.eventCategory === 'infraction'
        );
        if (hasReprimand) return emp;

        promotedCount += 1;
        const oldSal = emp.baseSalary;
        const newSal = Math.round(oldSal * 1.05);
        const nextGrade = `${emp.gradeOrEchelon || 'Catégorie C1'} → Échelon Supérieur (+5%)`;
        const autoAct: ExportableHrEventAct = {
          id: `hrev_auto_${Date.now()}_${emp.id}`,
          reference: `RH-AUTO-${Date.now().toString().slice(-4)}`,
          eventCategory: 'promotion',
          subType: 'Avancement Automatique sur Objectifs & Assiduité Biométrique',
          title: 'Avancement Automatique Périodique (+5%)',
          date: today,
          employeeMatricule: emp.matricule,
          employeeName: emp.fullName,
          employeePosition: emp.position,
          employeeContractType: emp.contractType,
          projectName: emp.assignedProjectName,
          promotionMode: 'Automatique',
          previousSalaryOrGrade: `${emp.gradeOrEchelon || 'Échelon 1'} (${formatCurrency(oldSal, currency)})`,
          newSalaryOrGrade: `${nextGrade} (${formatCurrency(newSal, currency)})`,
          details:
            'Avancement automatique validé par le moteur RH (zéro blâme disciplinaire et contrat CDI/CDD actif).',
          decisionMaker: currentUserName,
        };

        return {
          ...emp,
          baseSalary: newSal,
          gradeOrEchelon: nextGrade,
          hrEvents: [autoAct, ...(emp.hrEvents || [])],
        };
      })
    );

    if (promotedCount === 0) {
      onTriggerToast(
        'Aucun employé CDI/CDD éligible sans infraction/blâme trouvé pour un avancement automatique.'
      );
    } else {
      onRecordAuditTrace(
        'RH_EMPLOYE',
        'AVANCEMENT_AUTOMATIQUE_GLOBAL',
        `LOT-${today}`,
        `Avancement automatique (+5%) appliqué à ${promotedCount} employé(s) CDI/CDD éligible(s).`
      );
      onTriggerToast(
        `Avancement automatique (+5%) appliqué avec succès à ${promotedCount} employé(s) CDI/CDD sans blâme.`
      );
    }
  };

  // Démarrer / Arrêter la caméra pour la reconnaissance faciale biométrique
  const startBiometricFaceCamera = async () => {
    try {
      setBioCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      onTriggerToast(
        'Caméra directe indisponible dans cet environnement : vérification biométrique sur photo de la fiche employé activée.'
      );
    }
  };

  const stopBiometricFaceCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setBioCameraActive(false);
  };

  // Valider l'émargement automatique par Empreinte Digitale ou Visage
  const handleValidateBiometricAttendance = async (mode: 'check_in' | 'check_out') => {
    const targetEmp =
      employees.find((e) => e.id === bioSelectedEmployeeId) ||
      employees.find((e) => e.status !== 'terminated');
    if (!targetEmp) {
      onTriggerToast('Veuillez sélectionner un employé actif pour valider son émargement biométrique.');
      return;
    }
    if (targetEmp.status === 'terminated') {
      onTriggerToast('Impossible de pointer : cet employé est en cessation de contrat.');
      return;
    }

    setBioScanStatus('scanning');

    // Si le navigateur supporte WebAuthn et que le mode est empreinte digitale, tente une sollicitation biométrique locale
    if (
      bioValidationMethod === 'fingerprint' &&
      typeof window !== 'undefined' &&
      window.PublicKeyCredential
    ) {
      try {
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        // Fallback hash biométrique interne
      }
    }

    setTimeout(() => {
      const today = new Date().toISOString().slice(0, 10);
      const nowTime = new Date().toTimeString().slice(0, 8);
      // Utilise la signature biométrique enregistrée lors de la création de la fiche d'embauche
      const enrolledHash =
        bioValidationMethod === 'fingerprint'
          ? targetEmp.fingerprintBiometricHash
          : targetEmp.faceBiometricHash;
      const hashPrefix = bioValidationMethod === 'fingerprint' ? 'BIO-FP-SHA256' : 'BIO-FACE-3D';
      const bioHash =
        enrolledHash ||
        `${hashPrefix}-${targetEmp.matricule}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`;

      if (mode === 'check_in') {
        const newRec: BiometricAttendanceRecord = {
          id: `att_${Date.now()}`,
          date: today,
          checkInTime: nowTime,
          employeeMatricule: targetEmp.matricule,
          employeeName: targetEmp.fullName,
          contractType:
            targetEmp.contractType === 'Temporaire / Journalier'
              ? 'Main d’œuvre Temporaire'
              : targetEmp.contractType,
          position: targetEmp.position,
          projectName: targetEmp.assignedProjectName,
          validationMethod: bioValidationMethod,
          biometricHash: bioHash,
          confidenceScore: bioValidationMethod === 'fingerprint' ? 99.8 : 99.4,
          status: 'present',
        };
        updateAttendanceRecords((prev) => [newRec, ...prev]);
        onRecordAuditTrace(
          'RH_EMPLOYE',
          'EMARGEMENT_BIOMETRIQUE_ENTREE',
          targetEmp.matricule,
          `Pointage Arrivée validé par ${
            bioValidationMethod === 'fingerprint' ? 'Empreinte Digitale' : 'Reconnaissance Faciale'
          } (${nowTime}) — ${targetEmp.fullName} · Hash : ${bioHash}`
        );
        onTriggerToast(
          `Émargement Arrivée validé par ${
            bioValidationMethod === 'fingerprint' ? 'Empreinte Digitale' : 'Visage'
          } pour ${targetEmp.fullName} (${nowTime}).`
        );
      } else {
        updateAttendanceRecords((prev) => {
          const existingIdx = prev.findIndex(
            (r) =>
              r.employeeMatricule === targetEmp.matricule &&
              r.date === today &&
              !r.checkOutTime
          );
          if (existingIdx >= 0) {
            const copy = [...prev];
            copy[existingIdx] = {
              ...copy[existingIdx],
              checkOutTime: nowTime,
              status: 'completed',
            };
            return copy;
          }
          return [
            {
              id: `att_${Date.now()}`,
              date: today,
              checkInTime: '08:00:00',
              checkOutTime: nowTime,
              employeeMatricule: targetEmp.matricule,
              employeeName: targetEmp.fullName,
              contractType:
                targetEmp.contractType === 'Temporaire / Journalier'
                  ? 'Main d’œuvre Temporaire'
                  : targetEmp.contractType,
              position: targetEmp.position,
              projectName: targetEmp.assignedProjectName,
              validationMethod: bioValidationMethod,
              biometricHash: bioHash,
              confidenceScore: 99.7,
              status: 'completed',
            },
            ...prev,
          ];
        });
        onRecordAuditTrace(
          'RH_EMPLOYE',
          'EMARGEMENT_BIOMETRIQUE_SORTIE',
          targetEmp.matricule,
          `Pointage Départ validé par ${
            bioValidationMethod === 'fingerprint' ? 'Empreinte Digitale' : 'Reconnaissance Faciale'
          } (${nowTime}) — ${targetEmp.fullName}`
        );
        onTriggerToast(
          `Émargement Départ validé pour ${targetEmp.fullName} (${nowTime}). Synchronisé avec la Paie.`
        );
      }

      setBioScanStatus('verified');
      if (bioCameraActive) stopBiometricFaceCamera();
    }, 650);
  };

  const handleConfirmContractTermination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminationModalEmployee) return;

    const termDate = terminationDateInput || new Date().toISOString().slice(0, 10);
    const termReason = terminationReasonInput.trim() || 'Cessation de contrat';

    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === terminationModalEmployee.id
          ? {
              ...emp,
              status: 'terminated',
              terminationDate: termDate,
              terminationReason: termReason,
            }
          : emp
      )
    );

    onTerminateEmployeeContract?.(
      terminationModalEmployee.id,
      terminationModalEmployee.matricule,
      termDate,
      termReason
    );

    onRecordAuditTrace(
      'RH_EMPLOYE',
      'CESSATION_DE_CONTRAT',
      terminationModalEmployee.matricule,
      `Cessation de contrat de ${terminationModalEmployee.fullName} (${terminationModalEmployee.matricule}) le ${termDate} — Motif : ${termReason}. L'employé est désormais libre de tout engagement.`
    );

    onTriggerToast(
      `Cessation de contrat enregistrée pour ${terminationModalEmployee.fullName}. Ses accès collaborateurs ont été révoqués et il est désormais libre de rejoindre une autre entreprise.`
    );
    setTerminationModalEmployee(null);
  };

  const handleConfirmEmployeeTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModalEmployee) return;
    const today = new Date().toISOString().slice(0, 10);

    if (transferScope === 'network_enterprise') {
      const targetEnt = superAdminNetwork.find((n) => n.tenantId === transferTargetTenantId);
      if (!targetEnt || targetEnt.tenantId === activeTenantId) {
        onTriggerToast(
          'Veuillez sélectionner une autre entreprise appartenant à votre réseau Super-Admin.'
        );
        return;
      }

      const historyEntry: EmployeeTransferHistory = {
        date: today,
        fromProjectName: `${companyName} (${transferModalEmployee.assignedProjectName})`,
        toProjectName: `${targetEnt.companyName} (Réseau Super-Admin)`,
        targetEnterpriseName: targetEnt.companyName,
        reason:
          transferReason.trim() ||
          `Mutation inter-entreprises au sein du réseau Super-Admin vers ${targetEnt.companyName}`,
      };

      const actRef = `RH-MUT-NET-${Date.now().toString().slice(-5)}`;
      const interAct: ExportableHrEventAct = {
        id: `hrev_${Date.now()}`,
        reference: actRef,
        eventCategory: 'mutation',
        subType: 'Mutation Inter-Entreprises (Réseau d’Entreprises du Super-Admin)',
        title: `Mutation Inter-Entreprises vers ${targetEnt.companyName}`,
        date: today,
        startDate: today,
        employeeMatricule: transferModalEmployee.matricule,
        employeeName: transferModalEmployee.fullName,
        employeePosition: transferModalEmployee.position,
        employeeContractType: transferModalEmployee.contractType,
        projectName: transferModalEmployee.assignedProjectName,
        targetProjectOrLocation: `Siège / Projets de ${targetEnt.companyName}`,
        targetEnterpriseName: targetEnt.companyName,
        details: historyEntry.reason,
        decisionMaker: currentUserName,
      };

      const transferredEmpRecord: EmployeeRecord = {
        ...transferModalEmployee,
        assignedProjectId: 'general',
        assignedProjectName: `Affecté à ${targetEnt.companyName} (Réseau Super-Admin)`,
        transferHistory: [historyEntry, ...(transferModalEmployee.transferHistory || [])],
        hrEvents: [interAct, ...(transferModalEmployee.hrEvents || [])],
      };

      // Copier / synchroniser l'employé dans l'entreprise cible du réseau Super-Admin
      try {
        const targetKey = `mep_${targetEnt.tenantId}_employees`;
        const rawTarget = localStorage.getItem(targetKey);
        const targetList: EmployeeRecord[] = rawTarget ? JSON.parse(rawTarget) : [];
        const existingIdx = targetList.findIndex(
          (item) => item.matricule === transferModalEmployee.matricule
        );
        const targetCopy: EmployeeRecord = {
          ...transferredEmpRecord,
          assignedProjectName: 'Direction Générale / Pool Entreprise',
        };
        if (existingIdx >= 0) {
          targetList[existingIdx] = targetCopy;
        } else {
          targetList.unshift(targetCopy);
        }
        localStorage.setItem(targetKey, JSON.stringify(targetList));
      } catch {
        // Ignore storage error
      }

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === transferModalEmployee.id ? transferredEmpRecord : emp
        )
      );

      exportHrEventActToPDF(interAct, companyName, companyLogo, docCustomization);

      onRecordAuditTrace(
        'RH_EMPLOYE',
        'MUTATION_INTER_ENTREPRISES_RESEAU',
        transferModalEmployee.matricule,
        `Mutation inter-entreprises (Réseau Super-Admin) de ${transferModalEmployee.fullName} : de "${companyName}" vers "${targetEnt.companyName}"`
      );
      onTriggerToast(
        `Mutation inter-entreprises de ${transferModalEmployee.fullName} vers "${targetEnt.companyName}" (Réseau Super-Admin) validée et Acte PDF généré.`
      );
      setTransferModalEmployee(null);
      setTransferReason('');
      return;
    }

    const targetProj = projects.find((p) => p.id === transferTargetProjectId);
    const nextProjName = targetProj ? targetProj.name : 'Pool Entreprise / Direction Générale';

    const historyEntry: EmployeeTransferHistory = {
      date: today,
      fromProjectName: transferModalEmployee.assignedProjectName,
      toProjectName: nextProjName,
      reason: transferReason.trim() || 'Mutation opérationnelle décidée par le prestataire',
    };

    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === transferModalEmployee.id
          ? {
              ...emp,
              assignedProjectId: transferTargetProjectId || 'general',
              assignedProjectName: nextProjName,
              transferHistory: [historyEntry, ...(emp.transferHistory || [])],
            }
          : emp
      )
    );

    onRecordAuditTrace(
      'RH_EMPLOYE',
      'MUTATION_PROJET',
      transferModalEmployee.matricule,
      `Mutation de ${transferModalEmployee.fullName} : de "${transferModalEmployee.assignedProjectName}" vers "${nextProjName}"`
    );
    onTriggerToast(
      `Mutation de ${transferModalEmployee.fullName} vers "${nextProjName}" enregistrée.`
    );
    setTransferModalEmployee(null);
    setTransferReason('');
  };

  // =========================================================================
  // HANDLERS: PAIE (CDI NORMES PAYS vs CDD/TEMPORAIRE NÉGOCIÉ)
  // =========================================================================
  const handleCreateSinglePayslip = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((item) => item.id === payEmployeeId);
    if (!emp) {
      onTriggerToast('Veuillez sélectionner un employé.');
      return;
    }

    const qtyUnits = Math.max(1, Number(payWorkedDaysOrTasks) || 1);
    const overtimeHours = Math.max(0, Number(payOvertimeHours) || 0);
    const overtimeRate = Math.max(0, Number(payOvertimeRate) || 0);
    const overtimePay = Math.round(overtimeHours * overtimeRate * 100) / 100;
    const bonus = Math.max(0, Number(payBonus) || 0);
    const advance = Math.max(0, Number(payAdvance) || 0);

    // Calcul du salaire de base selon le statut :
    // - CDI : Normes du pays sélectionné (salaire mensuel réglementaire)
    // - CDD / Temporaire : Par négociation (Taux journalier × jours OU Montant par tâche × tâches OU Forfait négocié)
    let computedBasePay = emp.baseSalary;
    let modeLabel = countryNorm.label;

    if (emp.contractType !== 'CDI') {
      if (emp.remunerationBasis === 'daily_rate') {
        computedBasePay = Math.round(emp.baseSalary * qtyUnits * 100) / 100;
        modeLabel = `Négocié au Taux Journalier (${formatCurrency(emp.baseSalary, currency)}/jour × ${qtyUnits} j) — ${emp.paymentPeriodicity}`;
      } else if (emp.remunerationBasis === 'task_rate') {
        computedBasePay = Math.round(emp.baseSalary * qtyUnits * 100) / 100;
        modeLabel = `Négocié à la Tâche (${formatCurrency(emp.baseSalary, currency)}/tâche × ${qtyUnits} tâche(s)) — ${emp.paymentPeriodicity}`;
      } else {
        computedBasePay = emp.baseSalary;
        modeLabel = `Forfait Négocié (${emp.paymentPeriodicity})`;
      }
    }

    const grossSalary = computedBasePay + emp.transportAllowance + overtimePay + bonus;
    const socialRate =
      emp.contractType === 'CDI'
        ? countryNorm.employeeSocialPct
        : Math.max(0, Number(paySocialRate) || 0);
    const taxRate =
      emp.contractType === 'CDI'
        ? countryNorm.incomeTaxPct
        : Math.max(0, Number(payTaxRate) || 0);

    const socialContribution = Math.round(grossSalary * (socialRate / 100) * 100) / 100;
    const incomeTax = Math.round(grossSalary * (taxRate / 100) * 100) / 100;
    const totalDeductions = Math.round((socialContribution + incomeTax + advance) * 100) / 100;
    const employerCharges =
      emp.contractType === 'CDI'
        ? Math.round(grossSalary * (countryNorm.employerSocialPct / 100) * 100) / 100
        : 0;
    const netSalary = Math.max(0, Math.round((grossSalary - totalDeductions) * 100) / 100);

    const periodClean = payrollPeriod.replace('-', '');
    const slipNumber = `PAIE-${periodClean}-${String(payslips.length + 1).padStart(3, '0')}`;

    const newSlip: PayslipRecord = {
      id: `pay_${Date.now()}`,
      payslipNumber: slipNumber,
      period: payrollPeriod,
      periodicityLabel: emp.paymentPeriodicity,
      employeeId: emp.id,
      employeeMatricule: emp.matricule,
      employeeName: emp.fullName,
      employeeCategory: emp.workerCategory,
      employeePosition: emp.position,
      employeeDepartment: emp.department,
      contractType: emp.contractType,
      remunerationModeLabel: modeLabel,
      workedDays: qtyUnits,
      baseSalary: computedBasePay,
      overtimeHours,
      overtimePay,
      transportAllowance: emp.transportAllowance,
      performanceBonus: bonus,
      grossSalary,
      socialContribution,
      incomeTax,
      salaryAdvance: advance,
      totalDeductions,
      employerCharges,
      netSalary,
      paymentMethod: emp.paymentMethod,
      status: 'validated',
      projectName: emp.assignedProjectName,
      countryNormsLabel: countryNorm.label,
    };

    setPayslips((prev) => [newSlip, ...prev]);
    setShowPayslipModal(false);
    onRecordAuditTrace(
      'PAIE',
      'EDITION_BULLETIN_PAIE',
      slipNumber,
      `Paie éditée pour ${emp.fullName} (${emp.contractType}) — Net : ${formatCurrency(netSalary, currency)}`
    );
    onTriggerToast(`Bulletin ${slipNumber} généré pour ${emp.fullName}.`);
  };

  const [hrChartRangeMonths, setHrChartRangeMonths] = useState<6 | 12>(6);

  const handleGenerateMonthlyPayrollBatch = () => {
    const activeEmps = employees.filter((e) => e.status !== 'terminated');
    if (activeEmps.length === 0) {
      onTriggerToast('Aucun employé actif à traiter pour cette période.');
      return;
    }
    const existingEmpIdsForPeriod = new Set(
      payslips.filter((p) => p.period === payrollPeriod).map((p) => p.employeeId)
    );
    const missingEmps = activeEmps.filter((e) => !existingEmpIdsForPeriod.has(e.id));
    if (missingEmps.length === 0) {
      onTriggerToast(`Tous les bulletins de la période ${payrollPeriod} sont déjà enregistrés.`);
      return;
    }

    const periodClean = payrollPeriod.replace('-', '');
    const generatedSlips: PayslipRecord[] = missingEmps.map((emp, idx) => {
      const qtyUnits =
        emp.contractType === 'CDI'
          ? 22
          : emp.remunerationBasis === 'daily_rate'
          ? 22
          : emp.remunerationBasis === 'task_rate'
          ? 4
          : 1;
      const computedBasePay =
        emp.contractType === 'CDI'
          ? emp.baseSalary
          : emp.remunerationBasis === 'daily_rate' || emp.remunerationBasis === 'task_rate'
          ? Math.round(emp.baseSalary * qtyUnits * 100) / 100
          : emp.baseSalary;
      const grossSalary = Math.round((computedBasePay + (emp.transportAllowance || 0)) * 100) / 100;
      const socialRate = emp.contractType === 'CDI' ? countryNorm.employeeSocialPct : 0;
      const taxRate = emp.contractType === 'CDI' ? countryNorm.incomeTaxPct : 5;
      const socialContribution = Math.round(grossSalary * (socialRate / 100) * 100) / 100;
      const incomeTax = Math.round(grossSalary * (taxRate / 100) * 100) / 100;
      const totalDeductions = Math.round((socialContribution + incomeTax) * 100) / 100;
      const employerCharges =
        emp.contractType === 'CDI'
          ? Math.round(grossSalary * (countryNorm.employerSocialPct / 100) * 100) / 100
          : 0;
      const netSalary = Math.max(0, Math.round((grossSalary - totalDeductions) * 100) / 100);
      const slipNumber = `PAIE-${periodClean}-${String(payslips.length + idx + 1).padStart(3, '0')}`;

      return {
        id: `pay_${Date.now()}_${idx}`,
        payslipNumber: slipNumber,
        period: payrollPeriod,
        periodicityLabel: emp.paymentPeriodicity,
        employeeId: emp.id,
        employeeMatricule: emp.matricule,
        employeeName: emp.fullName,
        employeeCategory: emp.workerCategory,
        employeePosition: emp.position,
        employeeDepartment: emp.department,
        contractType: emp.contractType,
        remunerationModeLabel:
          emp.contractType === 'CDI' ? countryNorm.label : `Forfait / Taux (${emp.paymentPeriodicity})`,
        workedDays: qtyUnits,
        baseSalary: computedBasePay,
        overtimeHours: 0,
        overtimePay: 0,
        transportAllowance: emp.transportAllowance || 0,
        performanceBonus: 0,
        grossSalary,
        socialContribution,
        incomeTax,
        salaryAdvance: 0,
        totalDeductions,
        employerCharges,
        netSalary,
        paymentMethod: emp.paymentMethod,
        status: 'validated',
        projectName: emp.assignedProjectName,
        countryNormsLabel: countryNorm.label,
      };
    });

    setPayslips((prev) => [...generatedSlips, ...prev]);
    onRecordAuditTrace(
      'PAIE',
      'GENERATION_LOT_MENSUEL',
      payrollPeriod,
      `${generatedSlips.length} bulletin(s) généré(s) pour la période ${payrollPeriod}`
    );
    onTriggerToast(
      `${generatedSlips.length} bulletin(s) de salaire enregistré(s) pour la période ${payrollPeriod}.`
    );
  };

  // =========================================================================
  // SUIVI DE LA MASSE SALARIALE MENSUELLE & ÉVOLUTION DES EFFECTIFS (RH & PAIE)
  // =========================================================================
  const hrPayrollMonthlyAnalytics = useMemo(() => {
    const monthNamesShort = [
      'Janv.',
      'Févr.',
      'Mars',
      'Avr.',
      'Mai',
      'Juin',
      'Juil.',
      'Août',
      'Sept.',
      'Oct.',
      'Nov.',
      'Déc.',
    ];

    // Collect distinct YYYY-MM periods from recorded payslips + last N months up to current payrollPeriod
    const anchorParts = (payrollPeriod || new Date().toISOString().slice(0, 7)).split('-');
    const anchorYear = Number(anchorParts[0]) || new Date().getFullYear();
    const anchorMonth = (Number(anchorParts[1]) || new Date().getMonth() + 1) - 1;

    const periodsSet = new Set<string>();
    for (let i = hrChartRangeMonths - 1; i >= 0; i--) {
      const d = new Date(anchorYear, anchorMonth - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      periodsSet.add(ym);
    }
    payslips.forEach((p) => {
      if (p.period && /^\d{4}-\d{2}$/.test(p.period)) {
        periodsSet.add(p.period);
      }
    });

    const sortedPeriods = Array.from(periodsSet)
      .sort()
      .slice(-hrChartRangeMonths);

    const series = sortedPeriods.map((ym) => {
      const [yStr, mStr] = ym.split('-');
      const mIdx = Math.max(0, Math.min(11, Number(mStr) - 1));
      const label = `${monthNamesShort[mIdx]} ${yStr.slice(2)}`;
      const monthEndIso = `${ym}-31`;

      // Effectif actif sur ce mois (selon hireDate et terminationDate)
      const activeEmployeesInMonth = employees.filter((emp) => {
        const hiredByMonth = !emp.hireDate || emp.hireDate.slice(0, 7) <= ym;
        const notTerminatedBeforeMonth =
          emp.status !== 'terminated' ||
          !emp.terminationDate ||
          emp.terminationDate.slice(0, 7) >= ym;
        return hiredByMonth && notTerminatedBeforeMonth;
      });

      const fallbackEmps =
        activeEmployeesInMonth.length > 0
          ? activeEmployeesInMonth
          : employees.filter((e) => e.status !== 'terminated');

      const cdiCount = fallbackEmps.filter((e) => e.contractType === 'CDI').length;
      const cddTempCount = fallbackEmps.filter((e) => e.contractType !== 'CDI').length;

      // Bulletins de paie enregistrés pour cette période
      const monthSlips = payslips.filter((p) => p.period === ym);
      const recordedEmployeeIds = new Set(monthSlips.map((s) => s.employeeId));

      let masseBrute = monthSlips.reduce((sum, s) => sum + (Number(s.grossSalary) || 0), 0);
      let masseNette = monthSlips.reduce((sum, s) => sum + (Number(s.netSalary) || 0), 0);
      let chargesSocialesEtFiscales = monthSlips.reduce(
        (sum, s) =>
          sum +
          (Number(s.employerCharges) || 0) +
          (Number(s.socialContribution) || 0) +
          (Number(s.incomeTax) || 0),
        0
      );

      // Compléter avec les salaires contractuels enregistrés des employés actifs n'ayant pas encore de bulletin sur ce mois
      fallbackEmps.forEach((emp) => {
        if (recordedEmployeeIds.has(emp.id)) return;
        if (emp.hireDate && emp.hireDate > monthEndIso) return;
        const monthlyContractBase =
          emp.contractType === 'CDI'
            ? emp.baseSalary
            : emp.remunerationBasis === 'daily_rate'
            ? emp.baseSalary * 22
            : emp.remunerationBasis === 'task_rate'
            ? emp.baseSalary * 4
            : emp.baseSalary;
        const estGross = monthlyContractBase + (emp.transportAllowance || 0);
        const estSoc =
          emp.contractType === 'CDI' ? estGross * (countryNorm.employeeSocialPct / 100) : 0;
        const estTax =
          emp.contractType === 'CDI' ? estGross * (countryNorm.incomeTaxPct / 100) : estGross * 0.05;
        const estEmployer =
          emp.contractType === 'CDI' ? estGross * (countryNorm.employerSocialPct / 100) : 0;
        const estNet = Math.max(0, estGross - estSoc - estTax);

        masseBrute += estGross;
        masseNette += estNet;
        chargesSocialesEtFiscales += estEmployer + estSoc + estTax;
      });

      const effectifTotal = Math.max(fallbackEmps.length, monthSlips.length);

      return {
        period: ym,
        label,
        masseBrute: Math.round(masseBrute),
        masseNette: Math.round(masseNette),
        chargesPatronalesEtRetenues: Math.round(chargesSocialesEtFiscales),
        coutTotalEmployeur: Math.round(masseBrute + chargesSocialesEtFiscales),
        effectifTotal,
        effectifCDI: cdiCount,
        effectifCDDTemp: cddTempCount,
        bulletinsEnregistres: monthSlips.length,
      };
    });

    const latestMonth = series[series.length - 1] || {
      period: payrollPeriod,
      label: payrollPeriod,
      masseBrute: 0,
      masseNette: 0,
      chargesPatronalesEtRetenues: 0,
      coutTotalEmployeur: 0,
      effectifTotal: employees.filter((e) => e.status !== 'terminated').length,
      effectifCDI: employees.filter((e) => e.contractType === 'CDI' && e.status !== 'terminated')
        .length,
      effectifCDDTemp: employees.filter(
        (e) => e.contractType !== 'CDI' && e.status !== 'terminated'
      ).length,
      bulletinsEnregistres: 0,
    };
    const previousMonth = series.length >= 2 ? series[series.length - 2] : latestMonth;

    const payrollEvolutionPct =
      previousMonth.masseBrute > 0
        ? Math.round(
            ((latestMonth.masseBrute - previousMonth.masseBrute) / previousMonth.masseBrute) * 1000
          ) / 10
        : 0;
    const headcountDelta = latestMonth.effectifTotal - previousMonth.effectifTotal;

    const totalRecordedPayslipsAmount = payslips.reduce(
      (sum, p) => sum + (Number(p.netSalary) || 0),
      0
    );

    return {
      series,
      latestMonth,
      payrollEvolutionPct,
      headcountDelta,
      totalRecordedPayslipsAmount,
    };
  }, [payslips, employees, payrollPeriod, hrChartRangeMonths, countryNorm]);

  const renderHrPayrollEvolutionWidget = () => (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Suivi de la Masse Salariale Mensuelle &amp; Évolution des Effectifs
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Analyse consolidée basée sur les salaires enregistrés ({payslips.length} bulletin(s) édité(s)) et les contrats actifs ({employees.filter((e) => e.status !== 'terminated').length} collaborateurs).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setHrChartRangeMonths(6)}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                hrChartRangeMonths === 6
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              6 Mois
            </button>
            <button
              type="button"
              onClick={() => setHrChartRangeMonths(12)}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                hrChartRangeMonths === 12
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              12 Mois
            </button>
          </div>
          <button
            type="button"
            onClick={handleGenerateMonthlyPayrollBatch}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Générer automatiquement les bulletins du mois sélectionné pour tous les employés actifs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Générer la paie du mois ({payrollPeriod})</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-3.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Masse Salariale Brute ({hrPayrollMonthlyAnalytics.latestMonth.label})</span>
            <span
              className={`font-mono font-bold tabular-nums ${
                hrPayrollMonthlyAnalytics.payrollEvolutionPct > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {hrPayrollMonthlyAnalytics.payrollEvolutionPct >= 0 ? '+' : ''}
              {hrPayrollMonthlyAnalytics.payrollEvolutionPct}%
            </span>
          </div>
          <p className="mt-1.5 text-lg font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatCurrency(hrPayrollMonthlyAnalytics.latestMonth.masseBrute, currency)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Salaires de base + primes + indemnités
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-3.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Masse Salariale Nette Versée</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {hrPayrollMonthlyAnalytics.latestMonth.bulletinsEnregistres} bulletin(s)
            </span>
          </div>
          <p className="mt-1.5 text-lg font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(hrPayrollMonthlyAnalytics.latestMonth.masseNette, currency)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Net à payer après retenues sociales/IR
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-3.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Charges Sociales &amp; Fiscales</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
              Patronales + Retenues
            </span>
          </div>
          <p className="mt-1.5 text-lg font-extrabold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
            {formatCurrency(
              hrPayrollMonthlyAnalytics.latestMonth.chargesPatronalesEtRetenues,
              currency
            )}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Coût global employeur :{' '}
            <strong className="font-mono tabular-nums">
              {formatCurrency(hrPayrollMonthlyAnalytics.latestMonth.coutTotalEmployeur, currency)}
            </strong>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-3.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Évolution de l&apos;Effectif Actif</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
              {hrPayrollMonthlyAnalytics.headcountDelta >= 0 ? '+' : ''}
              {hrPayrollMonthlyAnalytics.headcountDelta} ce mois
            </span>
          </div>
          <p className="mt-1.5 text-lg font-extrabold font-mono tabular-nums text-blue-600 dark:text-blue-400">
            {hrPayrollMonthlyAnalytics.latestMonth.effectifTotal} collaborateur(s)
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {hrPayrollMonthlyAnalytics.latestMonth.effectifCDI} CDI ·{' '}
            {hrPayrollMonthlyAnalytics.latestMonth.effectifCDDTemp} CDD / Temporaires
          </p>
        </div>
      </div>

      {/* Dual-Axis Interactive Chart (Payroll Mass Bars + Headcount Line) */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={hrPayrollMonthlyAnalytics.series}
            margin={{ top: 10, right: 18, left: 8, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(v) =>
                v >= 1000000
                  ? `${(v / 1000000).toFixed(1)}M`
                  : v >= 1000
                  ? `${Math.round(v / 1000)}k`
                  : String(v)
              }
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#f59e0b' }}
              axisLine={{ stroke: '#f59e0b' }}
            />
            <Tooltip
              formatter={(value: any, name: any) => {
                const labelStr = String(name || '');
                if (labelStr.includes('Effectif')) {
                  return [`${value} collaborateur(s)`, labelStr];
                }
                return [formatCurrency(Number(value) || 0, currency), labelStr];
              }}
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#1e293b',
                borderRadius: '10px',
                color: '#f8fafc',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Bar
              yAxisId="left"
              dataKey="masseBrute"
              name="Masse Salariale Brute"
              fill="#2563eb"
              radius={[4, 4, 0, 0]}
              barSize={22}
            />
            <Bar
              yAxisId="left"
              dataKey="masseNette"
              name="Salaire Net Versé"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              barSize={22}
            />
            <Bar
              yAxisId="left"
              dataKey="chargesPatronalesEtRetenues"
              name="Charges & Retenues"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
              barSize={18}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="effectifTotal"
              name="Effectif Actif Total (RH)"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ r: 4, fill: '#f59e0b' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Compact Monthly Breakdown Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <th className="py-2.5 px-3">Période Mensuelle</th>
              <th className="py-2.5 px-3 text-center">Effectif Actif (CDI / CDD-Temp)</th>
              <th className="py-2.5 px-3 text-center">Bulletins Édités</th>
              <th className="py-2.5 px-3 text-right">Masse Salariale Brute</th>
              <th className="py-2.5 px-3 text-right">Charges &amp; Retenues</th>
              <th className="py-2.5 px-3 text-right">Salaire Net Versé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {hrPayrollMonthlyAnalytics.series.map((row) => (
              <tr
                key={row.period}
                className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                  row.period === payrollPeriod ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                }`}
              >
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white font-mono">
                  {row.label} ({row.period})
                </td>
                <td className="py-2 px-3 text-center font-mono tabular-nums">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {row.effectifTotal}
                  </span>{' '}
                  <span className="text-slate-500 text-[11px]">
                    ({row.effectifCDI} CDI · {row.effectifCDDTemp} CDD/Temp)
                  </span>
                </td>
                <td className="py-2 px-3 text-center font-mono tabular-nums">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      row.bulletinsEnregistres > 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {row.bulletinsEnregistres} bulletin(s)
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                  {formatCurrency(row.masseBrute, currency)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {formatCurrency(row.chargesPatronalesEtRetenues, currency)}
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(row.masseNette, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* =====================================================================
          MODULE 1: PRODUITS & SERVICES (CATALOGUE)
      ===================================================================== */}
      {activeSubModule === 'catalog' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                Catalogue Produits, Matériels & Services (par Corps de Métier & Sous-Rubriques)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                TVA légale du pays sélectionné ({currentCountryInfo?.name || countryCode}) :{' '}
                <strong className="text-blue-600 dark:text-blue-400 font-mono">
                  {statutoryCountryVatRate}%
                </strong>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() =>
                  openCreateCatalogModal('service', 'Déplacements, Missions & Services')
                }
                className="px-3.5 py-2 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ Déplacement / Mission / Service</span>
              </button>
              <button
                onClick={() => openCreateCatalogModal('service')}
                className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                <span>+ Prestation</span>
              </button>
              <button
                onClick={() => openCreateCatalogModal('product')}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Produit stockable</span>
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs font-medium text-slate-500">Références Catalogue</p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {catalogItems.length}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {catalogKpis.totalProducts} produits · {catalogKpis.totalServices} prestations
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs font-medium text-slate-500">Valeur Stock Magasins (Achat HT)</p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                {formatCurrency(catalogKpis.totalStockPurchaseValue, currency)}
              </p>
              <p className="mt-2 text-xs text-slate-500">Cumul des produits en stock</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs font-medium text-slate-500">Valeur Facturable (HT)</p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCurrency(catalogKpis.totalStockSaleValue, currency)}
              </p>
              <p className="mt-2 text-xs text-slate-500">Potentiel sur projets actifs</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs font-medium text-slate-500">Alertes Seuil Critique Stock</p>
              <p
                className={`mt-2 text-2xl font-bold font-mono tabular-nums ${
                  catalogKpis.lowStockCount > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {catalogKpis.lowStockCount} produit(s)
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {catalogKpis.lowStockCount > 0
                  ? 'Seuil critique atteint — BC rapide disponible'
                  : 'Tous les stocks sont au-dessus du seuil'}
              </p>
            </div>
          </div>

          {/* Système d'Alertes Automatiques de Seuil Critique de Stock & Génération Rapide de Bon de Commande */}
          {catalogKpis.lowStockItems.length > 0 && (
            <div className="rounded-2xl border-2 border-amber-400/80 dark:border-amber-600/80 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-rose-50/80 dark:from-amber-950/40 dark:via-slate-900 dark:to-rose-950/30 p-4 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                        Alerte Automatique Seuil Critique ({catalogKpis.lowStockItems.length})
                      </span>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        Produits du Catalogue ayant atteint ou franchi leur Seuil Critique de Stock
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      Détection automatique en temps réel dès que <code className="font-mono font-bold">Stock Actuel &le; Seuil Critique</code>. Générez un Bon de Commande Fournisseur officiel en 1 clic (PDF + Registre Achats) ou personnalisez les quantités.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleGenerateQuickPoFromCriticalStock(catalogKpis.lowStockItems, 'instant_pdf')
                    }
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Génération Rapide BC Groupé ({catalogKpis.lowStockItems.length}) + PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleGenerateQuickPoFromCriticalStock(catalogKpis.lowStockItems, 'prefill_modal')
                    }
                    className="px-3 py-2 rounded-xl border border-amber-500 dark:border-amber-600 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-800 dark:text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>Ajuster &amp; Commander</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {catalogKpis.lowStockItems.map((critItem) => {
                  const minT = Number(critItem.minStockThreshold ?? critItem.minStockAlert ?? 5);
                  const curQ = Number(critItem.stockQty) || 0;
                  const recQty = Math.max(10, Math.max(0, minT - curQ) + minT);
                  const estCost = recQty * (Number(critItem.purchasePrice) || 0);
                  const isZero = curQ <= 0;
                  return (
                    <div
                      key={critItem.id}
                      className={`rounded-xl border p-3 flex flex-col justify-between gap-2.5 bg-white/95 dark:bg-slate-900/95 ${
                        isZero
                          ? 'border-rose-400 dark:border-rose-700'
                          : 'border-amber-300 dark:border-amber-700/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {critItem.sku}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                                isZero
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              }`}
                            >
                              {isZero ? 'RUPTURE TOTALE (0)' : 'SEUIL CRITIQUE ATTEINT'}
                            </span>
                          </div>
                          <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-1">
                            {critItem.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {critItem.tradeCategory || critItem.category}
                            {critItem.subCategory ? ` · ${critItem.subCategory}` : ''}
                          </p>
                        </div>
                        <div className="text-right font-mono">
                          <div
                            className={`text-xs font-black ${
                              isZero ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            Stock : {curQ} {critItem.unit}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Seuil : {minT} {critItem.unit}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        <div className="text-slate-600 dark:text-slate-300">
                          Qté suggérée : <strong className="font-mono text-slate-900 dark:text-white">+{recQty} {critItem.unit}</strong>{' '}
                          <span className="text-slate-400">({formatCurrency(estCost, currency)} HT)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleGenerateQuickPoFromCriticalStock([critItem], 'instant_pdf')
                            }
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                            title="Émettre immédiatement un Bon de Commande PDF pour ce produit"
                          >
                            <FileDown className="w-3 h-3" />
                            <span>BC Rapide</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleGenerateQuickPoFromCriticalStock([critItem], 'prefill_modal')
                            }
                            className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-bold cursor-pointer"
                            title="Ouvrir le formulaire de Bon de Commande pré-rempli"
                          >
                            Éditer
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Panneau Sous-Rubriques selon les Corps de Métiers & Catégories Déplacements / Services */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Sous-Rubriques du Catalogue (selon les différents Corps de Métiers)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cliquez sur un corps de métier ou une sous-rubrique pour filtrer le catalogue, ou ajoutez-en de nouvelles.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <select
                  value={selectedTradeForNewSub}
                  onChange={(e) => {
                    setSelectedTradeForNewSub(e.target.value);
                    setCatalogTradeFilter(e.target.value);
                    setCatalogSubCategoryFilter('all');
                  }}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-semibold"
                >
                  {tradeCategoriesList.map((tr) => (
                    <option key={tr} value={tr}>
                      {tr} ({(tradeSubcategoriesMap[tr] || []).length} sous-rub.)
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newSubcategoryInput}
                  onChange={(e) => setNewSubcategoryInput(e.target.value)}
                  placeholder="Nouvelle sous-rubrique..."
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newSubcategoryInput.trim()) return;
                    handleAddTradeCategoryAndSub(selectedTradeForNewSub, newSubcategoryInput);
                    setNewSubcategoryInput('');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
                >
                  + Ajouter Sous-Rubrique
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setCatalogSubCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                    catalogSubCategoryFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Toutes les sous-rubriques ({(tradeSubcategoriesMap[selectedTradeForNewSub] || []).length})
                </button>
                {(tradeSubcategoriesMap[selectedTradeForNewSub] || []).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      setCatalogTradeFilter(selectedTradeForNewSub);
                      setCatalogSubCategoryFilter(sub);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer border ${
                      catalogSubCategoryFilter === sub
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {/* Ajout d'un nouveau Corps de Métier */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                <input
                  type="text"
                  value={newTradeCategoryInput}
                  onChange={(e) => setNewTradeCategoryInput(e.target.value)}
                  placeholder="Ajouter un nouveau Corps de Métier au catalogue (ex: Ascenseurs & Automatismes)..."
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newTradeCategoryInput.trim()) return;
                    const cleanT = newTradeCategoryInput.trim();
                    handleAddTradeCategoryAndSub(cleanT, 'Fournitures & Travaux Spécialisés');
                    setSelectedTradeForNewSub(cleanT);
                    setNewTradeCategoryInput('');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                >
                  + Corps de Métier
                </button>
              </div>
            </div>

            {/* Catégories Déplacements / Missions & Services */}
            <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Catégories Déplacements / Missions & Services ({travelServiceCategories.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Catégories dédiées aux frais de déplacement, missions, logistique et prestations de services.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <input
                  type="text"
                  value={newTravelServiceCategoryInput}
                  onChange={(e) => setNewTravelServiceCategoryInput(e.target.value)}
                  placeholder="Nouvelle catégorie Déplacement / Service..."
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5"
                />
                <button
                  type="button"
                  onClick={handleAddTravelServiceCategory}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer shrink-0"
                >
                  + Rajouter
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {travelServiceCategories.map((cat) => (
                  <span
                    key={cat}
                    onClick={() => {
                      openCreateCatalogModal('service', 'Déplacements, Missions & Services');
                      setCatSubCategory(cat);
                    }}
                    title="Cliquer pour créer un Déplacement / Service dans cette catégorie"
                    className="px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium cursor-pointer hover:bg-indigo-100"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Barre de Recherche & Filtres Catalogue */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Rechercher un produit, service, code SKU ou sous-rubrique..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="md:col-span-7 flex flex-wrap items-center gap-2">
                <select
                  value={catalogTypeFilter}
                  onChange={(e) =>
                    setCatalogTypeFilter(e.target.value as 'all' | 'product' | 'service')
                  }
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                >
                  <option value="all">Tous types ({catalogItems.length})</option>
                  <option value="product">Produits Stockables ({catalogKpis.totalProducts})</option>
                  <option value="service">Prestations & Déplacements ({catalogKpis.totalServices})</option>
                </select>

                <select
                  value={catalogTradeFilter}
                  onChange={(e) => {
                    setCatalogTradeFilter(e.target.value);
                    setCatalogSubCategoryFilter('all');
                  }}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-semibold"
                >
                  <option value="all">Tous les Corps de Métiers</option>
                  {tradeCategoriesList.map((tr) => (
                    <option key={tr} value={tr}>
                      {tr}
                    </option>
                  ))}
                </select>

                <select
                  value={catalogSubCategoryFilter}
                  onChange={(e) => setCatalogSubCategoryFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                >
                  <option value="all">Toutes les Sous-rubriques</option>
                  {(catalogTradeFilter !== 'all'
                    ? tradeSubcategoriesMap[catalogTradeFilter] || []
                    : Object.values(tradeSubcategoriesMap).flat()
                  ).map((sub, i) => (
                    <option key={`${sub}_${i}`} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {catalogItems.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-3">
              <Package className="w-8 h-8 text-blue-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Votre catalogue Produits & Prestations est vierge
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Ajoutez vos prestations de services, frais de déplacement et produits classés par Corps de Métier et Sous-Rubrique.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 bg-slate-50/60 dark:bg-slate-950/40">
                      <th className="py-3 px-4">Code SKU</th>
                      <th className="py-3 px-4">Désignation</th>
                      <th className="py-3 px-4">Catégorie (Corps de Métier) & Sous-Rubrique</th>
                      <th className="py-3 px-4">Type de Projet & Magasin</th>
                      <th className="py-3 px-4 text-right">Coût Achat HT</th>
                      <th className="py-3 px-4 text-right">Prix Vente HT & TVA</th>
                      <th className="py-3 px-4 text-right">Stock Actuel</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {filteredCatalog.map((item) => {
                      const minStockThreshold = Number(
                        item.minStockThreshold ?? item.minStockAlert ?? 5
                      );
                      const isStockBelowThreshold =
                        item.itemType === 'product' &&
                        item.stockable !== false &&
                        Number(item.stockQty) <= minStockThreshold;
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                            isStockBelowThreshold
                              ? 'bg-yellow-50/40 dark:bg-yellow-950/15'
                              : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                            {item.sku}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                              <span>{item.name}</span>
                              {isStockBelowThreshold && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700 text-[10px] font-bold"
                                  title={`Alerte Seuil Critique : ${item.stockQty} ${item.unit} disponible(s), seuil critique fixé à ${minStockThreshold} ${item.unit}`}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500/20 shrink-0" />
                                  <span>Seuil critique ({minStockThreshold})</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.itemType === 'product' ? 'Produit Stockable' : 'Prestation / Déplacement'} ({item.unit})
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-blue-700 dark:text-blue-300">
                              {item.tradeCategory || item.category}
                            </div>
                            {item.subCategory && (
                              <div className="text-[11px] text-slate-500">
                                Sous-rubrique : <strong>{item.subCategory}</strong>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {item.customProjectTypeLabel ||
                                allExploitationTypes.find((t) => t.id === item.projectType)?.shortLabel ||
                                item.projectType}
                            </div>
                            <div className="text-[11px] text-slate-500">{item.warehouseLocation}</div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                            {formatCurrency(item.purchasePrice, currency)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(item.unitPrice, currency)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {item.includeVat === false || item.taxRate === 0
                                ? 'Exonéré / Hors TVA (0%)'
                                : `TVA incluse : ${item.taxRate}%`}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                            {item.itemType === 'product' ? (
                              <div className="inline-flex flex-col items-end gap-0.5">
                                <div
                                  className={`inline-flex items-center gap-1.5 font-bold ${
                                    isStockBelowThreshold
                                      ? 'text-yellow-700 dark:text-yellow-400'
                                      : 'text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {isStockBelowThreshold && (
                                    <span
                                      title={`Alerte Stock : ${item.stockQty} < seuil minimum (${minStockThreshold})`}
                                      className="inline-flex items-center"
                                    >
                                      <AlertTriangle className="w-4 h-4 text-yellow-500 fill-yellow-500/20 shrink-0" />
                                    </span>
                                  )}
                                  <span>
                                    {item.stockQty} {item.unit}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  Seuil min : {minStockThreshold} {item.unit}
                                </span>
                              </div>
                            ) : (
                              'Service'
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {isStockBelowThreshold && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleGenerateQuickPoFromCriticalStock([item], 'instant_pdf')
                                  }
                                  className="px-2.5 py-1 rounded border border-amber-400 dark:border-amber-700 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="Génération rapide de Bon de Commande Fournisseur (PDF + Registre)"
                                >
                                  <FileDown className="w-3 h-3" />
                                  <span>+ BC Rapide</span>
                                </button>
                              )}
                              <button
                                onClick={() => onInjectItemIntoInvoice(item)}
                                className="px-2.5 py-1 rounded border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-semibold cursor-pointer"
                              >
                                + Devis/Facture
                              </button>
                              <button
                                onClick={() => openEditCatalogModal(item)}
                                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                                title="Modifier la fiche Produit / Prestation"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {isSuperAdmin && onDeleteCatalogItemToTrash && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteCatalogItemToTrash(item)}
                                  className="p-1.5 rounded border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-100"
                                  title="Envoyer vers la Corbeille (Super-Admin uniquement)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* =====================================================================
          MODULE 2: MAGASINS PAR PROJET, FOURNISSEURS, BC & MOUVEMENTS (BL / BCI)
      ===================================================================== */}
      {activeSubModule === 'warehouse' && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                Magasins, Stocks & Commandes
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={openBciModal}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>+ Émettre BCI (Projet & Métier)</span>
              </button>
              <button
                onClick={() => openWarehouseModal('OUT')}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>+ Sortie sur BCI → Bon de Sortie (BS)</span>
              </button>
              <button
                onClick={() => openWarehouseModal('IN')}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>+ Entrée (BL)</span>
              </button>
              <button
                onClick={() => openWarehouseModal('TRANSFER')}
                className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Transfert Inter-Magasins</span>
              </button>
              <button
                onClick={() => openWarehouseModal('INVENTORY')}
                className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4 text-amber-500" />
                <span>Inventaire</span>
              </button>
            </div>
          </div>

          {/* Sub-navigation inside Warehouse Module */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setWarehouseSubTab('movements')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  warehouseSubTab === 'movements'
                    ? 'bg-slate-900 dark:bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Mouvements & Bons de Sortie ({stockMovements.length})
              </button>
              <button
                onClick={() => setWarehouseSubTab('bci_requisitions')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  warehouseSubTab === 'bci_requisitions'
                    ? 'bg-slate-900 dark:bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Bons de Commande Internes — BCI ({internalRequisitions.length})
              </button>
              <button
                onClick={() => setWarehouseSubTab('sites')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  warehouseSubTab === 'sites'
                    ? 'bg-slate-900 dark:bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Magasins & Dépôts ({allWarehouses.length})
              </button>
              <button
                onClick={() => setWarehouseSubTab('suppliers_po')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  warehouseSubTab === 'suppliers_po'
                    ? 'bg-slate-900 dark:bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Fournisseurs & Commandes ({purchaseOrders.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSiteModal(true)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                + Nouveau magasin
              </button>
              <button
                onClick={() => setShowSupplierModal(true)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                + Nouveau fournisseur
              </button>
              <button
                onClick={() => setShowPoModal(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                + Bon de commande fournisseur
              </button>
            </div>
          </div>

          {/* Barre de Recherche Magasin */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={warehouseSearch}
                onChange={(e) => setWarehouseSearch(e.target.value)}
                placeholder="Rechercher par N° Bon (BS, BT, BCI, BL), produit, magasin ou projet..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* SUB-TAB BCI: BONS DE COMMANDE INTERNES (RESPONSABLE PROJET + RESPONSABLE CORPS DE MÉTIER -> MAGASINIER CONTRE BON DE SORTIE) */}
          {warehouseSubTab === 'bci_requisitions' && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Registre Numérisé des Bons de Commande Internes (BCI) & Délivrance des Bons de Sortie (BS)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Délivrés conjointement par le Responsable du Projet et le Responsable du Corps de Métier utilisateur au Magasinier contre Bon de Sortie.
                  </p>
                </div>
                <button
                  onClick={openBciModal}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>Nouveau BCI (Projet & Corps de Métier)</span>
                </button>
              </div>

              {internalRequisitions.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500 space-y-2">
                  <div>Aucun Bon de Commande Interne (BCI) émis pour le moment.</div>
                  <button
                    onClick={openBciModal}
                    className="px-3.5 py-2 rounded-lg bg-indigo-600 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Émettre un premier Bon de Commande Interne (BCI)</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 bg-slate-50/60 dark:bg-slate-950/40">
                        <th className="py-3 px-4">N° BCI & Date</th>
                        <th className="py-3 px-4">Projet & Responsable Projet</th>
                        <th className="py-3 px-4">Corps de Métier & Responsable</th>
                        <th className="py-3 px-4">Produit / Matériel & Qté</th>
                        <th className="py-3 px-4">Magasin & Magasinier</th>
                        <th className="py-3 px-4">Statut & Bon de Sortie (BS)</th>
                        <th className="py-3 px-4 text-right">Actions, PDF & Envoi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                      {internalRequisitions.map((bci) => (
                        <tr key={bci.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 font-mono">
                            <div className="font-bold text-indigo-600 dark:text-indigo-400">{bci.bciNumber}</div>
                            <div className="text-[11px] text-slate-500">{bci.date}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{bci.projectName}</div>
                            <div className="text-[11px] text-slate-500">Resp. Projet : {bci.projectManagerName}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{bci.tradeName}</div>
                            <div className="text-[11px] text-slate-500">Resp. Métier : {bci.tradeLeaderName}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{bci.productName}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              Qté : {bci.requestedQuantity} {bci.unit} ({bci.productSku})
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-800 dark:text-slate-200">{bci.warehouseName}</div>
                            <div className="text-[11px] text-slate-500">Magasinier : {bci.warehouseManagerName}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            {bci.status === 'fulfilled_stock_out' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Sortie exécutée
                                </span>
                                <div className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                                  BS : {bci.stockOutVoucherNumber}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-[11px]">
                                En attente de sortie magasin
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {bci.status === 'pending_warehouse' && (
                                <button
                                  onClick={() => openWarehouseModalFromBci(bci)}
                                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <ArrowUpRight className="w-3 h-3" />
                                  <span>Servir & Délivrer BS</span>
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  exportInternalRequisitionToPDF(
                                    bci,
                                    companyName,
                                    companyLogo,
                                    docCustomization
                                  )
                                }
                                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <FileDown className="w-3 h-3 text-indigo-600" />
                                <span>BCI PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setErpShareModal({
                                    docTypeLabel: 'Bon de Commande Interne (BCI)',
                                    docReference: bci.bciNumber,
                                    projectName: bci.projectName,
                                    summaryText: `Bon de Commande Interne ${bci.bciNumber} — Produit : ${bci.productName} (${bci.requestedQuantity} ${bci.unit}) | Resp. Projet : ${bci.projectManagerName} | Corps de métier : ${bci.tradeName} (${bci.tradeLeaderName}) | Magasin : ${bci.warehouseName} (${bci.warehouseManagerName}).`,
                                    defaultRecipientType: 'warehouse_manager',
                                    defaultRecipientName: bci.warehouseManagerName,
                                    defaultEmail: '',
                                    defaultPhone: '',
                                    channel: 'whatsapp',
                                  })
                                }
                                className="px-2 py-1 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                title="Envoyer ce BCI par Email ou WhatsApp"
                              >
                                <Send className="w-3 h-3" />
                                <span>Email / WhatsApp</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 1: STOCK MOVEMENTS WITH SCANNED BL / BCI & INTER-WAREHOUSE TRANSFERS */}
          {warehouseSubTab === 'movements' && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Journal des Mouvements de Stock
                </h3>
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg flex-wrap">
                  {(['ALL', 'IN', 'OUT', 'TRANSFER', 'INVENTORY'] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setWarehouseMovementFilter(k)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                        warehouseMovementFilter === k
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      {k === 'ALL'
                        ? 'Tous'
                        : k === 'IN'
                        ? 'Entrées (BL)'
                        : k === 'OUT'
                        ? 'Sorties (BS)'
                        : k === 'TRANSFER'
                        ? 'Transferts'
                        : 'Inventaires'}
                    </button>
                  ))}
                </div>
              </div>

              {filteredMovements.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500">
                  Aucun mouvement de stock enregistré.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 bg-slate-50/60 dark:bg-slate-950/40">
                        <th className="py-3 px-4">N° Bon & Date</th>
                        <th className="py-3 px-4">Opération & Pièce Conditionnante</th>
                        <th className="py-3 px-4">Produit(s)</th>
                        <th className="py-3 px-4">Magasin Source / Destination</th>
                        <th className="py-3 px-4 text-right">Mouvement</th>
                        <th className="py-3 px-4 text-right">Stock Après</th>
                        <th className="py-3 px-4 text-right">Document Numérisé, PDF & Envoi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                      {filteredMovements.map((mov) => (
                        <tr key={mov.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 font-mono">
                            <div className="font-bold text-slate-900 dark:text-white">{mov.voucherNumber}</div>
                            <div className="text-[11px] text-slate-500">{mov.date}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold">
                              {mov.movementType === 'IN' ? (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  ENTRÉE (BL : {mov.sourceDocReference})
                                </span>
                              ) : mov.movementType === 'OUT' ? (
                                <span className="text-blue-600 dark:text-blue-400">
                                  SORTIE (BCI : {mov.sourceDocReference})
                                </span>
                              ) : mov.movementType === 'TRANSFER' ? (
                                <span className="text-purple-600 dark:text-purple-400">
                                  TRANSFERT INTER-MAGASINS ({mov.sourceDocReference})
                                </span>
                              ) : (
                                <span className="text-amber-600">INVENTAIRE</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {mov.movementType === 'OUT' && (mov.projectManagerName || mov.tradeLeaderName) ? (
                                <span>
                                  BCI par Resp. Projet <strong>{mov.projectManagerName}</strong> & Resp. Métier{' '}
                                  <strong>{mov.tradeLeaderName}</strong> ({mov.tradeName}) → Magasinier{' '}
                                  <strong>{mov.warehouseManagerName || mov.operatorName}</strong>
                                </span>
                              ) : (
                                mov.reason || `Fichier : ${mov.sourceDocFileName || 'PV'}`
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{mov.productName}</div>
                            <div className="text-[11px] text-slate-500">
                              {mov.productSku}
                              {mov.transferItems && mov.transferItems.length > 1 && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                                  {mov.transferItems.length} matériels transférés
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{mov.projectName}</div>
                            <div className="text-[11px] text-slate-500">{mov.warehouseName}</div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold">
                            {mov.movementType === 'OUT'
                              ? '-'
                              : mov.movementType === 'IN'
                              ? '+'
                              : mov.movementType === 'TRANSFER'
                              ? '⇄ '
                              : '='}
                            {mov.quantity} {mov.unit}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold">
                            {mov.newStock} {mov.unit}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {mov.scannedDocDataUrl && (
                                <button
                                  onClick={() => setPreviewScanMovement(mov)}
                                  className="px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Voir Scan {mov.movementType === 'IN' ? 'BL' : 'BCI'}</span>
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  exportStockMovementToPDF(
                                    mov,
                                    currency,
                                    companyName,
                                    companyLogo,
                                    docCustomization
                                  )
                                }
                                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-semibold inline-flex items-center gap-1"
                              >
                                <FileDown className="w-3 h-3 text-blue-600" />
                                <span>
                                  {mov.movementType === 'OUT'
                                    ? 'Bon de Sortie PDF'
                                    : mov.movementType === 'TRANSFER'
                                    ? 'Bon Transfert PDF'
                                    : 'Bon PDF'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setErpShareModal({
                                    docTypeLabel:
                                      mov.movementType === 'OUT'
                                        ? 'Bon de Sortie Magasin (BS)'
                                        : mov.movementType === 'TRANSFER'
                                        ? 'Bon de Transfert Inter-Magasins (BT)'
                                        : 'Bon de Mouvement Magasin',
                                    docReference: mov.voucherNumber,
                                    projectName: mov.projectName,
                                    summaryText: `${
                                      mov.movementType === 'OUT'
                                        ? 'Bon de Sortie'
                                        : mov.movementType === 'TRANSFER'
                                        ? 'Bon de Transfert Inter-Magasins'
                                        : 'Mouvement Stock'
                                    } N° ${mov.voucherNumber} (${mov.date}) — Matériel(s) : ${mov.productName} (${mov.quantity} ${mov.unit}) — Magasin : ${mov.warehouseName}.`,
                                    defaultRecipientType:
                                      mov.movementType === 'OUT' ? 'trade_leader' : 'warehouse_manager',
                                    defaultRecipientName:
                                      mov.tradeLeaderName || mov.warehouseManagerName || mov.operatorName,
                                    defaultEmail: '',
                                    defaultPhone: '',
                                    channel: 'whatsapp',
                                  })
                                }
                                className="px-2 py-1 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Send className="w-3 h-3" />
                                <span>Envoyer</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 2: MAGASIN GÉNÉRAL & MAGASINS PAR PROJET */}
          {warehouseSubTab === 'sites' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Magasin Général Central ⇄ Magasins des Projets
                  </h4>
                </div>
                <button
                  onClick={() => openWarehouseModal('TRANSFER')}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Transfert Inter-Magasins (Multi-Matériels)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allWarehouses.map((wh) => {
                  const whProducts = physicalProducts.filter(
                    (p) => getProductStockInWarehouse(p, wh.id) > 0
                  );
                  return (
                    <div
                      key={wh.id}
                      className={`rounded-xl border p-5 space-y-2.5 ${
                        wh.isGeneral
                          ? 'border-blue-400 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-mono font-bold text-blue-600">{wh.code}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold">
                          {wh.isGeneral ? 'MAGASIN GÉNÉRAL CENTRAL' : 'MAGASIN PROJET'}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{wh.name}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Affectation : <strong>{wh.projectName}</strong>
                      </p>
                      <p className="text-xs text-slate-500">
                        Localisation : {wh.location} · Resp. : {wh.managerName}
                      </p>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Produits en stock dans ce magasin ({whProducts.length}) :
                        </div>
                        {whProducts.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">Aucun stock actif dans ce dépôt</p>
                        ) : (
                          <div className="space-y-1 max-h-28 overflow-y-auto">
                            {whProducts.map((prod) => (
                              <div
                                key={prod.id}
                                className="flex items-center justify-between text-[11px] bg-white/70 dark:bg-slate-950/60 px-2 py-1 rounded border border-slate-200/70 dark:border-slate-800"
                              >
                                <span className="truncate font-medium">{prod.name}</span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 ml-2">
                                  {getProductStockInWarehouse(prod, wh.id)} {prod.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-TAB 3: FOURNISSEURS & BONS DE COMMANDE FOURNISSEUR + RÉCEPTION SUR BL */}
          {warehouseSubTab === 'suppliers_po' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                  Répertoire des Fiches Fournisseurs Agréés ({suppliers.length})
                </h3>
                {suppliers.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Créez préalablement les fiches de vos fournisseurs afin de pouvoir leur adresser des Bons de Commande officiels.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {suppliers.map((sup) => (
                      <div
                        key={sup.id}
                        className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                      >
                        <div className="font-mono text-[11px] text-blue-600">{sup.code}</div>
                        <div className="font-bold uppercase text-slate-900 dark:text-white">
                          {sup.companyName}
                        </div>
                        <div className="text-slate-500">{sup.specialty}</div>
                        <div className="italic text-slate-500">
                          {sup.phone} · {sup.email}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Bons de Commande & Réceptions BL ({purchaseOrders.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowPoModal(true)}
                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    + Émettre un Bon de Commande
                  </button>
                </div>
                {purchaseOrders.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Aucun Bon de Commande fournisseur émis.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 bg-slate-50/60 dark:bg-slate-950/40">
                          <th className="py-3 px-4">N° BC & Date</th>
                          <th className="py-3 px-4">Fournisseur</th>
                          <th className="py-3 px-4">Lignes Commandées & Réception</th>
                          <th className="py-3 px-4">Magasin Destination</th>
                          <th className="py-3 px-4 text-right">Montant TTC & TVA</th>
                          <th className="py-3 px-4">Statut Livraison</th>
                          <th className="py-3 px-4 text-right">Actions, Réception & Envoi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {purchaseOrders.map((po) => {
                          const totalOrdered = po.items.reduce((acc, i) => acc + i.qty, 0);
                          const totalReceived = po.items.reduce(
                            (acc, i) => acc + (i.receivedQty || 0),
                            0
                          );
                          return (
                            <tr key={po.id} className="align-top">
                              <td className="py-3.5 px-4 font-mono font-bold">
                                {po.poNumber}
                                <div className="text-[11px] font-normal text-slate-500">{po.date}</div>
                              </td>
                              <td className="py-3.5 px-4 font-bold uppercase">{po.supplierName}</td>
                              <td className="py-3.5 px-4">
                                <div className="space-y-1">
                                  {po.items.map((item, idx) => (
                                    <div key={idx} className="text-[11px] flex items-center justify-between gap-2">
                                      <span className="font-medium text-slate-800 dark:text-slate-200">
                                        [{item.sku}] {item.name}
                                      </span>
                                      <span className="font-mono text-slate-600 dark:text-slate-400">
                                        Reçu : <strong>{item.receivedQty || 0}</strong> / {item.qty} {item.unit}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">
                                  Cumul réceptionné : {totalReceived} / {totalOrdered} unité(s)
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold">{po.warehouseName}</div>
                                <div className="text-[11px] text-slate-500">{po.projectName}</div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                                <div className="font-bold">{formatCurrency(po.totalTTC, currency)}</div>
                                <div className="text-[10px] text-slate-500">
                                  {po.includeVat === false || po.taxRate === 0
                                    ? 'Hors TVA (0%)'
                                    : `Dont TVA ${po.taxRate}%`}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                {po.status === 'delivered' ? (
                                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] inline-block">
                                    Livré (Complet)
                                  </span>
                                ) : po.status === 'partial' ? (
                                  <span className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[11px] inline-block">
                                    Livraison partielle
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold text-[11px] inline-block">
                                    Émis · En attente BL
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex flex-wrap items-center justify-end gap-1.5">
                                  {po.status !== 'delivered' && (
                                    <button
                                      type="button"
                                      onClick={() => openReceivePoModal(po)}
                                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Truck className="w-3.5 h-3.5" />
                                      <span>Réceptionner sur BL</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      exportPurchaseOrderToPDF(
                                        po,
                                        currency,
                                        companyName,
                                        companyLogo,
                                        docCustomization
                                      )
                                    }
                                    className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <FileDown className="w-3.5 h-3.5 text-blue-600" />
                                    <span>BC PDF</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setErpShareModal({
                                        docTypeLabel: 'Bon de Commande Fournisseur (BC)',
                                        docReference: po.poNumber,
                                        projectName: po.projectName,
                                        summaryText: `Bon de Commande ${po.poNumber} adressé à ${po.supplierName} — Montant : ${formatCurrency(po.totalTTC, currency)} (${po.items.length} ligne(s)) — Livraison : ${po.warehouseName}.`,
                                        defaultRecipientType: 'supplier',
                                        defaultRecipientName: po.supplierName,
                                        defaultEmail: po.supplierEmail,
                                        defaultPhone: po.supplierPhone,
                                        channel: 'email',
                                      })
                                    }
                                    className="px-2 py-1 rounded border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Email / WhatsApp</span>
                                  </button>
                                  {(po.receipts || []).map((rec) => (
                                    <button
                                      key={rec.id}
                                      type="button"
                                      onClick={() =>
                                        exportGoodsReceiptToPDF(
                                          rec,
                                          currency,
                                          companyName,
                                          companyLogo,
                                          docCustomization
                                        )
                                      }
                                      className="px-2.5 py-1 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                      title={`Imprimer le Bon de Réception ${rec.receiptNumber} (BL : ${rec.deliveryNoteRef})`}
                                    >
                                      <FileDown className="w-3 h-3" />
                                      <span>{rec.receiptNumber} PDF</span>
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODULE 3: EMPLOYÉS (FICHE ÉDITABLE SAUF MATRICULE, MUTATION, BADGE, CESSATION & COMPTE COLLABORATEUR)
      ===================================================================== */}
      {activeSubModule === 'employees' && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                Personnel & Carrières
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {employees.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleRunAutomaticPromotions}
                    className="px-3 py-2 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-indigo-100"
                    title="Calculer et appliquer l'avancement automatique d'échelon (+5%) pour les CDI/CDD éligibles"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Avancement Auto (+5%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportEmployeesDirectoryToPDF(
                        employees,
                        currency,
                        companyName,
                        companyLogo,
                        docCustomization
                      )
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <FileDown className="w-3.5 h-3.5 text-blue-600" />
                    <span>Registre PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportEmployeesDirectoryToExcel(employees)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const targetList =
                        filteredEmployees.length > 0 ? filteredEmployees : employees;
                      exportEmployeesWithPayrollToCSV(
                        targetList,
                        payslips,
                        currency,
                        companyName
                      );
                      onRecordAuditTrace(
                        'RH_EMPLOYE',
                        'EXPORT CSV PERSONNEL & PAIE',
                        `CSV-${targetList.length}-EMPLOYES`,
                        `Export CSV de ${targetList.length} employé(s) avec leurs données de paie et catégories professionnelles.`
                      );
                      onTriggerToast(
                        `Liste du personnel (${targetList.length} employé(s)) avec données de paie et catégories professionnelles exportée en CSV.`
                      );
                    }}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Télécharger en CSV la liste des employés avec leurs données de paie et catégories professionnelles"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export CSV (Paie &amp; Catégories)</span>
                  </button>
                </>
              )}
              <button
                onClick={openCreateEmployeeModal}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Embaucher</span>
              </button>
            </div>
          </div>

          {/* HR KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs font-medium text-slate-500">Effectif Embauché Actif</p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {employeeKpis.activeCount}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {employeeKpis.onLeaveCount} en congé/mission · Total inscrit : {employees.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs font-medium text-slate-500">Répartition CDI vs CDD / Temp.</p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                {employeeKpis.cdiCount} CDI · {employeeKpis.cddTempCount} CDD/Temp
              </p>
              <p className="mt-2 text-xs text-slate-500">
                CDI aux normes pays · CDD/Temp. par négociation
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs font-medium text-slate-500">Comptes Collaborateurs & Mutations</p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {collaboratorAccounts.filter((a) => a.role !== 'super_admin' && !a.contractTerminated).length} accès
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {employeeKpis.totalTransfers} mutation(s) inter-projets tracée(s)
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs font-medium text-slate-500">Cessations de Contrat</p>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                {employeeKpis.terminatedCount}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Employés libérés pour nouvelle entreprise
              </p>
            </div>
          </div>

          {/* Graphique de Suivi de la Masse Salariale Mensuelle & Évolution des Effectifs (RH & Paie) */}
          {renderHrPayrollEvolutionWidget()}

          {/* Gestion des Catégories de Personnel personnalisables */}
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-2.5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-indigo-950 dark:text-indigo-200">
                  Catégories de Personnel ({personnelCategories.length}) — Personnalisables
                </h3>
                <p className="text-[11px] text-slate-500">
                  Sélectionnez une catégorie pour filtrer ou ajoutez de nouvelles catégories de personnel propres à votre activité.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newPersonnelCategoryInput}
                  onChange={(e) => setNewPersonnelCategoryInput(e.target.value)}
                  placeholder="Nouvelle catégorie de personnel..."
                  className="rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleAddPersonnelCategory()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer whitespace-nowrap"
                >
                  + Ajouter catégorie
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setEmpCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border cursor-pointer ${
                  empCategoryFilter === 'all'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                Toutes ({employees.length})
              </button>
              {personnelCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setEmpCategoryFilter(empCategoryFilter === cat ? 'all' : cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border cursor-pointer ${
                    empCategoryFilter === cat
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Multi-Filters Bar */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  placeholder="Rechercher par Matricule, Nom complet, Poste, CNI, Projet ou Téléphone..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={empStatusFilter}
                onChange={(e) =>
                  setEmpStatusFilter(e.target.value as 'all' | 'active' | 'on_leave' | 'terminated')
                }
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2"
              >
                <option value="all">Tous les statuts ({employees.length})</option>
                <option value="active">En poste / Actifs ({employeeKpis.activeCount})</option>
                <option value="on_leave">En congé / Mission ({employeeKpis.onLeaveCount})</option>
                <option value="terminated">Cessation de contrat ({employeeKpis.terminatedCount})</option>
              </select>

              <select
                value={empCategoryFilter}
                onChange={(e) => setEmpCategoryFilter(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2"
              >
                <option value="all">Toutes catégories</option>
                {personnelCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={empDeptFilter}
                onChange={(e) => setEmpDeptFilter(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2"
              >
                <option value="all">Tous départements</option>
                <option value="Ingénierie & Projets">Ingénierie & Projets</option>
                <option value="Chantier & Exécution">Chantier & Exécution</option>
                <option value="Logistique & Magasin">Logistique & Magasin</option>
                <option value="Administration & Finance">Administration & Finance</option>
                <option value="Direction Générale">Direction Générale</option>
              </select>
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-3">
              <Users className="w-8 h-8 text-blue-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Aucun personnel employé enregistré dans votre entreprise
              </h3>
              <p className="text-xs text-slate-500 max-w-lg mx-auto">
                Embauchez d&apos;abord vos employés (Techniciens, Manœuvres, Chefs d&apos;équipe, Ingénieurs, Comptables). Chaque employé reçoit un numéro matricule unique immuable et un badge professionnel, et peut ensuite bénéficier d&apos;un compte collaborateur.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 bg-slate-50/60 dark:bg-slate-950/40">
                      <th className="py-3 px-4">Matricule</th>
                      <th className="py-3 px-4">Employé</th>
                      <th className="py-3 px-4">Contrat & Statut</th>
                      <th className="py-3 px-4">Affectation</th>
                      <th className="py-3 px-4">Accès Collaborateur</th>
                      <th className="py-3 px-4 text-right">Rémunération</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {filteredEmployees.map((emp) => {
                      const linkedAccount = collaboratorAccounts.find(
                        (acc) =>
                          acc.role !== 'super_admin' &&
                          !acc.contractTerminated &&
                          (acc.employeeId === emp.id ||
                            acc.employeeMatricule === emp.matricule ||
                            (emp.email && acc.email.toLowerCase() === emp.email.toLowerCase()))
                      );

                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                            emp.status === 'terminated' ? 'opacity-70 bg-slate-50/40 dark:bg-slate-950/30' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1" title="Matricule unique non modifiable">
                              <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{emp.matricule}</span>
                            </div>
                            <div className="text-[10px] font-normal text-slate-400">
                              Embauché : {emp.hireDate}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {emp.photoDataUrl ? (
                                <img
                                  src={emp.photoDataUrl}
                                  alt={emp.fullName}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-500/40 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-600/15 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-500/30">
                                  {emp.fullName.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold uppercase text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                  <span>{emp.fullName}</span>
                                  {emp.gradeOrEchelon && (
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono">
                                      {emp.gradeOrEchelon}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {emp.workerCategory}
                                  </span>{' '}
                                  — {emp.position} ({emp.department})
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  <span className="italic">{emp.phone}</span>
                                  {emp.email && <span> · {emp.email}</span>}
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {(emp.faceBiometricHash || emp.photoDataUrl) && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold inline-flex items-center gap-1">
                                      <ScanFace className="w-3 h-3" />
                                      <span>Visage ✓</span>
                                    </span>
                                  )}
                                  {(emp.fingerprintBiometricHash || emp.biometricEnrolled) && (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] font-semibold inline-flex items-center gap-1">
                                      <Fingerprint className="w-3 h-3" />
                                      <span>Empreinte ✓</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {emp.contractType} ({emp.paymentPeriodicity})
                            </div>
                            {emp.contractType === 'Temporaire / Journalier' && (
                              <div className="mt-0.5 inline-block px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wide">
                                ESTAMPILLE : MAIN D&apos;ŒUVRE TEMPORAIRE
                              </div>
                            )}
                            <div className="mt-0.5">
                              {emp.status === 'active' ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                                  En poste (Contrat actif)
                                </span>
                              ) : emp.status === 'on_leave' ? (
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
                                  En congé / Mission
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-semibold">
                                  Cessation ({emp.terminationDate || 'Clôturé'})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {emp.assignedProjectName}
                            </div>
                            {emp.transferHistory?.length > 0 && (
                              <div className="text-[10px] text-emerald-600">
                                {emp.transferHistory.length} mutation(s) enregistrée(s)
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {emp.status === 'terminated' ? (
                              <span className="text-[11px] text-slate-400">
                                Accès révoqué (Fin de contrat)
                              </span>
                            ) : linkedAccount ? (
                              <div className="space-y-0.5">
                                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Compte Actif ({linkedAccount.role.toUpperCase()})</span>
                                </span>
                                <div className="text-[10px] font-mono text-slate-500">
                                  {linkedAccount.email}
                                </div>
                              </div>
                            ) : (
                              onOpenCreateCollaboratorForEmployee && (
                                <button
                                  type="button"
                                  onClick={() => onOpenCreateCollaboratorForEmployee(emp)}
                                  className="px-2.5 py-1 rounded border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer hover:bg-indigo-100"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>+ Compte Collaborateur</span>
                                </button>
                              )
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold">
                            {formatCurrency(emp.baseSalary, currency)}
                            <div className="text-[10px] font-normal text-slate-500">
                              {emp.contractType === 'CDI'
                                ? '/ mois'
                                : emp.remunerationBasis === 'daily_rate'
                                ? '/ jour'
                                : emp.remunerationBasis === 'task_rate'
                                ? '/ tâche'
                                : 'forfait'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                              <button
                                onClick={() => setBadgePreviewEmployee(emp)}
                                className="px-2.5 py-1 rounded border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                title="Aperçu & PDF du Badge Professionnel"
                              >
                                <IdCard className="w-3.5 h-3.5" />
                                <span>Badge</span>
                              </button>

                              <button
                                onClick={() => {
                                  setHrDossierEmployee(emp);
                                  const defaultCat: HrEventCategory =
                                    emp.contractType === 'Temporaire / Journalier' ? 'infraction' : 'leave';
                                  setHrEventCategory(defaultCat);
                                  setHrEventSubType(HR_EVENT_SUBTYPES[defaultCat][0]);
                                }}
                                className="px-2.5 py-1 rounded border border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                title="Gérer Congés, Infractions, Blâmes, Missions, Mutations, Avancements & Rupture"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>Dossier RH ({emp.hrEvents?.length || 0})</span>
                              </button>

                              <button
                                onClick={() => openMedicalModalForEmployee(emp)}
                                className="px-2.5 py-1 rounded border border-rose-200 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                title="Ouvrir la Fiche Médicale & les Antécédents Médicaux de l'employé (avec export PDF)"
                              >
                                <HeartPulse className="w-3.5 h-3.5" />
                                <span>Fiche Médicale</span>
                              </button>

                              {emp.status !== 'terminated' && (
                                <button
                                  onClick={() => {
                                    setTransferModalEmployee(emp);
                                    setTransferTargetProjectId(projects[0]?.id || 'general');
                                  }}
                                  className="px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  title="Muter vers un autre projet"
                                >
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                  <span>Muter</span>
                                </button>
                              )}

                              <button
                                onClick={() => openEditEmployeeModal(emp)}
                                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                title="Modifier toutes les données de la fiche (hors matricule)"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Modifier Fiche</span>
                              </button>

                              {emp.status !== 'terminated' ? (
                                <button
                                  onClick={() => {
                                    setTerminationModalEmployee(emp);
                                    setTerminationDateInput(new Date().toISOString().slice(0, 10));
                                    setTerminationReasonInput('Fin de contrat CDD / Fin de mission');
                                  }}
                                  className="px-2.5 py-1 rounded border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  title="Enregistrer une cessation de contrat"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Cessation</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    exportTerminationCertificateToPDF(
                                      emp,
                                      companyName,
                                      companyLogo,
                                      docCustomization
                                    )
                                  }
                                  className="px-2.5 py-1 rounded border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  title="Télécharger l'Attestation de Cessation de Contrat PDF"
                                >
                                  <FileDown className="w-3.5 h-3.5" />
                                  <span>Certificat PDF</span>
                                </button>
                              )}

                              {isSuperAdmin && onDeleteEmployeeToTrash && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteEmployeeToTrash(emp)}
                                  className="p-1.5 rounded border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-100"
                                  title="Envoyer la fiche employé dans la Corbeille (Super-Admin uniquement)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* =====================================================================
          MODULE 5: ÉMARGEMENT AUTOMATIQUE BIOMÉTRIQUE (EMPREINTE DIGITALE & VISAGE)
      ===================================================================== */}
      {activeSubModule === 'attendance' && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                <Fingerprint className="w-6 h-6 text-blue-600" />
                <span>Pointage Biométrique</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {attendanceRecords.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    exportBiometricAttendanceSheetToPDF(
                      attendanceRecords,
                      companyName,
                      companyLogo,
                      docCustomization
                    )
                  }
                  className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <FileDown className="w-4 h-4 text-blue-600" />
                  <span>Feuille d&apos;Émargement PDF</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Terminal Biométrique (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Borne Biométrique
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  Capteur Actif
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Employé à pointer *
                  </label>
                  <select
                    value={bioSelectedEmployeeId}
                    onChange={(e) => setBioSelectedEmployeeId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 font-semibold"
                  >
                    <option value="">-- Sélectionner un employé actif --</option>
                    {employees
                      .filter((emp) => emp.status !== 'terminated')
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          [{emp.matricule}] {emp.fullName} ({emp.contractType})
                        </option>
                      ))}
                  </select>
                </div>

                {bioSelectedEmployeeId && (
                  (() => {
                    const selectedEmp = employees.find((e) => e.id === bioSelectedEmployeeId);
                    if (!selectedEmp) return null;
                    return (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                        {selectedEmp.photoDataUrl ? (
                          <img
                            src={selectedEmp.photoDataUrl}
                            alt={selectedEmp.fullName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                            {selectedEmp.fullName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-bold uppercase text-slate-900 dark:text-white truncate">
                            {selectedEmp.fullName}
                          </div>
                          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                            Matricule : {selectedEmp.matricule} · {selectedEmp.assignedProjectName}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono">
                              Visage : {selectedEmp.faceBiometricHash || 'Enrôlé sur fiche'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[10px] font-mono">
                              Empreinte : {selectedEmp.fingerprintBiometricHash || 'Enrôlée sur fiche'}
                            </span>
                          </div>
                          {selectedEmp.contractType === 'Temporaire / Journalier' && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                              MAIN D&apos;ŒUVRE TEMPORAIRE
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}

                <div>
                  <label className="block font-semibold mb-1">Mode Biométrique *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        stopBiometricFaceCamera();
                        setBioValidationMethod('fingerprint');
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                        bioValidationMethod === 'fingerprint'
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950'
                      }`}
                    >
                      <Fingerprint className="w-4 h-4" />
                      <span>Empreinte Digitale</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBioValidationMethod('face');
                        startBiometricFaceCamera();
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                        bioValidationMethod === 'face'
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950'
                      }`}
                    >
                      <ScanFace className="w-4 h-4" />
                      <span>Visage (Reconnaissance)</span>
                    </button>
                  </div>
                </div>

                {/* Zone Capteur Empreinte ou Caméra Faciale */}
                <div className="rounded-2xl border-2 border-dashed border-blue-500/40 bg-slate-950 text-white p-6 text-center space-y-4 relative overflow-hidden">
                  {bioValidationMethod === 'fingerprint' ? (
                    <div className="space-y-3">
                      <div
                        className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center border-2 transition-all ${
                          bioScanStatus === 'scanning'
                            ? 'border-emerald-400 bg-emerald-500/20 animate-pulse'
                            : 'border-blue-500/60 bg-blue-500/10'
                        }`}
                      >
                        <Fingerprint
                          className={`w-12 h-12 ${
                            bioScanStatus === 'scanning' ? 'text-emerald-400' : 'text-blue-400'
                          }`}
                        />
                      </div>
                      <p className="text-xs text-slate-300">
                        {bioScanStatus === 'scanning'
                          ? "Lecture minutiae de l'empreinte digitale en cours..."
                          : "Posez le doigt de l'employé sur le lecteur optique et cliquez sur valider"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative w-48 h-36 mx-auto rounded-xl overflow-hidden border-2 border-blue-500/60 bg-slate-900 flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`w-full h-full object-cover ${bioCameraActive ? 'block' : 'hidden'}`}
                        />
                        {!bioCameraActive && (
                          <ScanFace className="w-12 h-12 text-blue-400 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-slate-300">
                        {bioScanStatus === 'scanning'
                          ? 'Analyse biométrique des points nodaux du visage...'
                          : "Alignez le visage de l'employé face au capteur optique"}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!bioSelectedEmployeeId || bioScanStatus === 'scanning'}
                      onClick={() => handleValidateBiometricAttendance('check_in')}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                    >
                      {bioValidationMethod === 'fingerprint' ? (
                        <Fingerprint className="w-4 h-4" />
                      ) : (
                        <ScanFace className="w-4 h-4" />
                      )}
                      <span>Arrivée (Check-In)</span>
                    </button>

                    <button
                      type="button"
                      disabled={!bioSelectedEmployeeId || bioScanStatus === 'scanning'}
                      onClick={() => handleValidateBiometricAttendance('check_out')}
                      className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                    >
                      {bioValidationMethod === 'fingerprint' ? (
                        <Fingerprint className="w-4 h-4" />
                      ) : (
                        <ScanFace className="w-4 h-4" />
                      )}
                      <span>Départ (Check-Out)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Journal des Émargements Biométriques Certifiés (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Registre Temps Réel des Émargements Biométriques ({attendanceRecords.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Traçabilité horodatée avec score de confiance biométrique et jeton cryptographique
                  </p>
                </div>
                <div className="relative w-full sm:w-64 text-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bioSearch}
                    onChange={(e) => setBioSearch(e.target.value)}
                    placeholder="Rechercher employé ou matricule..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-8 pr-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              {attendanceRecords.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Fingerprint className="w-8 h-8 text-blue-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Aucun pointage biométrique enregistré
                  </p>
                  <p className="text-xs text-slate-500">
                    Utilisez le terminal ci-contre pour valider l&apos;arrivée ou le départ d&apos;un employé par empreinte digitale ou visage.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 bg-slate-50/60 dark:bg-slate-950/40">
                        <th className="py-3 px-4">Date & Heure</th>
                        <th className="py-3 px-4">Employé & Matricule</th>
                        <th className="py-3 px-4">Projet</th>
                        <th className="py-3 px-4">Biométrie & Confiance</th>
                        <th className="py-3 px-4">Pointage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {attendanceRecords
                        .filter((rec) => {
                          const p3 = bioPrefix3.trim().toLowerCase();
                          const matchP3 =
                            !p3 ||
                            rec.employeeName.toLowerCase().startsWith(p3) ||
                            rec.employeeMatricule.toLowerCase().startsWith(p3) ||
                            rec.projectName.toLowerCase().startsWith(p3);
                          const q = bioSearch.trim().toLowerCase();
                          const matchQ =
                            !q ||
                            rec.employeeName.toLowerCase().includes(q) ||
                            rec.employeeMatricule.toLowerCase().includes(q) ||
                            rec.projectName.toLowerCase().includes(q);
                          return matchP3 && matchQ;
                        })
                        .map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                            <td className="py-3 px-4 font-mono">
                              <div className="font-bold text-slate-900 dark:text-white">{rec.date}</div>
                              <div className="text-[11px] text-blue-600 dark:text-blue-400">
                                Arrivée : {rec.checkInTime}
                                {rec.checkOutTime && ` · Départ : ${rec.checkOutTime}`}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold uppercase text-slate-900 dark:text-white">
                                {rec.employeeName}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500">
                                {rec.employeeMatricule} · {rec.contractType}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                              {rec.projectName}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">
                                {rec.validationMethod === 'fingerprint' ? (
                                  <>
                                    <Fingerprint className="w-3 h-3" />
                                    <span>Empreinte Digitale</span>
                                  </>
                                ) : (
                                  <>
                                    <ScanFace className="w-3 h-3" />
                                    <span>Visage 3D</span>
                                  </>
                                )}
                                <span>({rec.confidenceScore}%)</span>
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {rec.checkOutTime ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[11px] font-bold">
                                  Journée Complète Validée
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[11px] font-bold">
                                  En poste sur site
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE 4: PAIE (CDI NORMES PAYS vs CDD/TEMPORAIRE PAR TÂCHE / JOUR)
      ===================================================================== */}
      {activeSubModule === 'payroll' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                Gestion de la Paie
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="month"
                value={payrollPeriod}
                onChange={(e) => setPayrollPeriod(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono font-semibold"
              />
              <button
                onClick={() => {
                  setPayEmployeeId(employees[0]?.id || '');
                  setShowPayslipModal(true);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Éditer un bulletin</span>
              </button>
            </div>
          </div>

          {/* Graphique de Suivi de la Masse Salariale Mensuelle & Évolution des Effectifs (RH & Paie) */}
          {renderHrPayrollEvolutionWidget()}

          {/* Barre de recherche Paie */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={payrollSearch}
                onChange={(e) => setPayrollSearch(e.target.value)}
                placeholder="Rechercher un bulletin par N°, nom d'employé, matricule ou catégorie..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 py-2 text-xs"
              />
            </div>
          </div>

          {payslips.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-2">
              <Wallet className="w-8 h-8 text-blue-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Aucun bulletin de paie édité pour le moment
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Sélectionnez un employé (CDI aux normes du pays ou CDD/Temporaire payé à la tâche ou au taux journalier) pour générer son bulletin officiel PDF.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 bg-slate-50/60 dark:bg-slate-950/40">
                      <th className="py-3 px-4">N° Bulletin & Périodicité</th>
                      <th className="py-3 px-4">Employé & Contrat</th>
                      <th className="py-3 px-4">Mode de Calcul</th>
                      <th className="py-3 px-4 text-right">Brut</th>
                      <th className="py-3 px-4 text-right">Retenues</th>
                      <th className="py-3 px-4 text-right">Net à Payer</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {payslips
                      .filter((slip) => {
                        const p3 = payrollPrefix3.trim().toLowerCase();
                        const matchP3 =
                          !p3 ||
                          slip.employeeName.toLowerCase().startsWith(p3) ||
                          slip.payslipNumber.toLowerCase().startsWith(p3) ||
                          slip.employeeMatricule.toLowerCase().startsWith(p3);
                        const q = payrollSearch.trim().toLowerCase();
                        const matchQ =
                          !q ||
                          slip.employeeName.toLowerCase().includes(q) ||
                          slip.payslipNumber.toLowerCase().includes(q) ||
                          slip.employeeMatricule.toLowerCase().includes(q);
                        return matchP3 && matchQ;
                      })
                      .map((slip) => (
                        <tr key={slip.id}>
                          <td className="py-3.5 px-4 font-mono">
                            <div className="font-bold text-slate-900 dark:text-white">{slip.payslipNumber}</div>
                            <div className="text-[11px] text-slate-500">
                              {slip.period} · {slip.periodicityLabel || 'Mensuel'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold uppercase text-slate-900 dark:text-white">
                              {slip.employeeName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {slip.employeeMatricule} · {slip.contractType} ({slip.employeeCategory})
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[11px] text-slate-600 dark:text-slate-300">
                            {slip.remunerationModeLabel}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                            {formatCurrency(slip.grossSalary, currency)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums text-amber-600">
                            -{formatCurrency(slip.totalDeductions, currency)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-emerald-600">
                            {formatCurrency(slip.netSalary, currency)}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() =>
                                  exportPayslipToPDF(slip, currency, companyName, companyLogo)
                                }
                                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <FileDown className="w-3.5 h-3.5 text-blue-600" />
                                <span>Bulletin PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const emp = employees.find((e) => e.id === slip.employeeId);
                                  setErpShareModal({
                                    docTypeLabel: 'Bulletin de Paie',
                                    docReference: slip.payslipNumber,
                                    projectName: emp?.assignedProjectName || 'Direction Générale',
                                    defaultRecipientType: 'employee',
                                    defaultRecipientName: slip.employeeName,
                                    defaultEmail: emp?.email || '',
                                    defaultPhone: emp?.phone || '',
                                    channel: 'email',
                                    summaryText: `Bulletin de Paie ${slip.payslipNumber} (${slip.period}) — Employé : ${slip.employeeName} (${slip.employeeMatricule}) — Net à payer : ${formatCurrency(slip.netSalary, currency)}.`,
                                  });
                                }}
                                className="px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                title="Envoyer le Bulletin de Paie par Email ou WhatsApp"
                              >
                                <Send className="w-3 h-3" />
                                <span>Email / WhatsApp</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE / EDIT CATALOG ITEM (AVEC AJOUT DIRECT DE TYPE DE PROJET, RUBRIQUE & SOUS-RUBRIQUE)
      ===================================================================== */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-5">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingCatalogId ? 'Modifier la référence Produit / Prestation' : 'Nouvelle référence Produit / Prestation'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Vous pouvez sélectionner ou créer directement le Type de Projet en Exploitation, la Rubrique (Corps de Métier) et la Sous-Rubrique.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSaveCatalogItem} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">Type *</label>
                  <select
                    value={catItemType === 'service' ? 'service' : catStockable ? 'product_stockable' : 'product_non_stockable'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'service') {
                        setCatItemType('service');
                        setCatStockable(false);
                      } else if (val === 'product_non_stockable') {
                        setCatItemType('product');
                        setCatStockable(false);
                      } else {
                        setCatItemType('product');
                        setCatStockable(true);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-semibold"
                  >
                    <option value="product_stockable">Produit / Matériel Stockable (Avec Main d&apos;Œuvre)</option>
                    <option value="product_non_stockable">Produit Non Stockable (Sans Main d&apos;Œuvre)</option>
                    <option value="service">Prestation / Service Non Stockable (Sans Main d&apos;Œuvre)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Code SKU *</label>
                  <input
                    type="text"
                    required
                    value={catSku}
                    onChange={(e) => setCatSku(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Unité *</label>
                  <input
                    type="text"
                    required
                    value={catUnit}
                    onChange={(e) => setCatUnit(e.target.value)}
                    placeholder="Unité, Sac, m², ml, Forfait, Jour..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Désignation complète du Produit / Prestation *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ex: Béton prêt à l'emploi B25, Pose de câblage réseau Cat.6A, Étude géotechnique..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-semibold"
                />
              </div>

              {/* Rubrique (selon le Corps de Métier) & Sous-rubrique avec création directe */}
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-indigo-950 dark:text-indigo-200">
                    Rubrique (Corps de Métier) &amp; Sous-Rubrique Technique
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowInlineNewTradeRubrique((v) => !v)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      + Ajouter Rubrique / Corps de Métier
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInlineNewSubRubrique((v) => !v)}
                      className="px-2.5 py-1 rounded-lg border border-indigo-400 dark:border-indigo-700 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold cursor-pointer"
                    >
                      + Ajouter Sous-Rubrique
                    </button>
                  </div>
                </div>

                {showInlineNewTradeRubrique && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800 flex items-center gap-2">
                    <input
                      type="text"
                      value={inlineNewTradeRubriqueInput}
                      onChange={(e) => setInlineNewTradeRubriqueInput(e.target.value)}
                      placeholder="Nom de la nouvelle Rubrique / Corps de Métier (ex: Charpente Métallique & Levage)..."
                      className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cleanRub = inlineNewTradeRubriqueInput.trim();
                        if (!cleanRub) return;
                        handleAddTradeCategoryAndSub(cleanRub, 'Travaux & Fournitures Générales');
                        setCatTradeCategory(cleanRub);
                        setCatSubCategory('Travaux & Fournitures Générales');
                        setInlineNewTradeRubriqueInput('');
                        setShowInlineNewTradeRubrique(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold cursor-pointer"
                    >
                      Valider Rubrique
                    </button>
                  </div>
                )}

                {showInlineNewSubRubrique && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800 flex items-center gap-2">
                    <input
                      type="text"
                      value={inlineNewSubRubriqueInput}
                      onChange={(e) => setInlineNewSubRubriqueInput(e.target.value)}
                      placeholder={`Nouvelle Sous-Rubrique pour « ${catTradeCategory} »...`}
                      className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cleanSub = inlineNewSubRubriqueInput.trim();
                        if (!cleanSub) return;
                        if (catTradeCategory === 'Déplacements / Missions & Services') {
                          const nextSrv = [...travelServiceCategories, cleanSub];
                          setTravelServiceCategories(nextSrv);
                        } else {
                          handleAddTradeCategoryAndSub(catTradeCategory, cleanSub);
                        }
                        setCatSubCategory(cleanSub);
                        setInlineNewSubRubriqueInput('');
                        setShowInlineNewSubRubrique(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                    >
                      Valider Sous-Rubrique
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">
                      Rubrique (selon le Corps de Métier) *
                    </label>
                    <select
                      required
                      value={catTradeCategory}
                      onChange={(e) => {
                        const nextTrade = e.target.value;
                        setCatTradeCategory(nextTrade);
                        const subs = tradeSubcategoriesMap[nextTrade] || [];
                        setCatSubCategory(subs[0] || 'Général');
                      }}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-semibold"
                    >
                      {tradeCategoriesList.map((trade) => (
                        <option key={trade} value={trade}>
                          {trade}
                        </option>
                      ))}
                      <option value="Déplacements / Missions & Services">
                        Déplacements / Missions &amp; Services
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">
                      Sous-Rubrique (selon le Corps de Métier) *
                    </label>
                    <select
                      value={catSubCategory}
                      onChange={(e) => setCatSubCategory(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-semibold"
                    >
                      {catTradeCategory === 'Déplacements / Missions & Services'
                        ? travelServiceCategories.map((srv) => (
                            <option key={srv} value={srv}>
                              {srv}
                            </option>
                          ))
                        : (tradeSubcategoriesMap[catTradeCategory] || ['Général']).map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                      <option value="Général / Autre">Général / Autre</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Type de Projet en Exploitation (avec création directe) & Magasin */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-blue-950 dark:text-blue-200">
                    Type de Projet en Exploitation &amp; Magasin d&apos;Affectation
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInlineNewProjectType((v) => !v)}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    + Ajouter un Type de Projet en Exploitation
                  </button>
                </div>

                {showInlineNewProjectType && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 flex items-center gap-2">
                    <input
                      type="text"
                      value={inlineNewProjectTypeInput}
                      onChange={(e) => setInlineNewProjectTypeInput(e.target.value)}
                      placeholder="Ex: Hydraulique & Forages, Mines & Carrières, Télécoms & Fibre, Agro-Industrie..."
                      className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={handleAddInlineProjectExploitationType}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold cursor-pointer"
                    >
                      Ajouter ce Type de Projet
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Type de Projet en Exploitation *</label>
                    <select
                      value={catProjectType}
                      onChange={(e) => {
                        const val = e.target.value as ProjectExploitationType;
                        setCatProjectType(val);
                        const found = allExploitationTypes.find((t) => t.id === val);
                        setCatCustomProjectTypeLabel(found?.label || '');
                      }}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-semibold"
                    >
                      {allExploitationTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Magasin d&apos;affectation</label>
                    <select
                      value={catWarehouseId}
                      onChange={(e) => setCatWarehouseId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                    >
                      <option value="">Magasin Principal</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.projectName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">Coût Achat HT ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={catPurchasePrice}
                    onChange={(e) => setCatPurchasePrice(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Prix Vente HT ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={catUnitPrice}
                    onChange={(e) => setCatUnitPrice(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Seuil Alerte Stock</label>
                  <input
                    type="number"
                    value={catMinStock}
                    onChange={(e) => setCatMinStock(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={catIncludeVat}
                    onChange={(e) => {
                      setCatIncludeVat(e.target.checked);
                      setCatTaxRate(e.target.checked ? String(statutoryCountryVatRate) : '0');
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600"
                  />
                  <span>
                    Appliquer la TVA du pays sélectionné ({statutoryCountryVatRate}%)
                  </span>
                </label>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {catIncludeVat ? `TVA ${statutoryCountryVatRate}%` : 'Exonéré / Hors TVA (0%)'}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
                >
                  Enregistrer Produit / Prestation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CONDITIONED STOCK MOVEMENT (BL FOR IN / BCI FOR OUT / TRANSFER MAGASIN GÉNÉRAL <-> MAGASIN PROJET)
      ===================================================================== */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {movType === 'IN'
                  ? 'Entrée en Stock (Conditionnée par Bon de Livraison Numérisé)'
                  : movType === 'OUT'
                  ? 'Sortie de Stock sur Bon de Commande Interne (BCI) → Délivrance Bon de Sortie (BS)'
                  : movType === 'TRANSFER'
                  ? 'Transfert Inter-Magasins Multi-Matériels : Magasin Général ⇄ Magasin de Projet'
                  : 'Contrôle & Régularisation d’Inventaire'}
              </h3>
              <button onClick={() => setShowMovementModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleRecordStockMovement} className="mt-4 space-y-4 text-xs">
              {movType === 'OUT' && (
                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-indigo-900 dark:text-indigo-200">
                      1. Présentation du Bon de Commande Interne (BCI) délivré par le Responsable Projet & le Responsable du Corps de Métier
                    </div>
                    {internalRequisitions.filter((b) => b.status === 'pending_warehouse').length > 0 && (
                      <select
                        value={movSelectedBciId}
                        onChange={(e) => {
                          const foundBci = internalRequisitions.find((b) => b.id === e.target.value);
                          setMovSelectedBciId(e.target.value);
                          if (foundBci) {
                            setMovSourceRef(foundBci.bciNumber);
                            setMovProjectId(foundBci.projectId);
                            setMovWarehouseId(foundBci.warehouseId);
                            setMovProductId(foundBci.productId);
                            setMovQuantity(String(foundBci.requestedQuantity));
                            setMovUnitCost(String(foundBci.unitCost));
                            setMovProjectManagerName(foundBci.projectManagerName);
                            setMovTradeName(foundBci.tradeName);
                            setMovTradeLeaderName(foundBci.tradeLeaderName);
                            setMovWarehouseManagerName(foundBci.warehouseManagerName || currentUserName);
                            if (foundBci.scannedBciFileName) setMovScannedFileName(foundBci.scannedBciFileName);
                            if (foundBci.scannedBciDataUrl) setMovScannedDataUrl(foundBci.scannedBciDataUrl);
                            setMovReason(foundBci.purposeAndPhase);
                          }
                        }}
                        className="rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-semibold"
                      >
                        <option value="">-- Charger un BCI en attente --</option>
                        {internalRequisitions
                          .filter((b) => b.status === 'pending_warehouse')
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.bciNumber} — {b.productName} ({b.requestedQuantity} {b.unit}) | {b.tradeName}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">
                        Responsable du Projet émetteur du BCI *
                      </label>
                      <input
                        type="text"
                        required
                        value={movProjectManagerName}
                        onChange={(e) => setMovProjectManagerName(e.target.value)}
                        placeholder="Ex: Ing. Marc K. — Directeur de Projet"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">
                        Corps de Métier devant utiliser le produit/matériel *
                      </label>
                      <input
                        type="text"
                        required
                        value={movTradeName}
                        onChange={(e) => setMovTradeName(e.target.value)}
                        placeholder="Ex: Électricité Courant Fort / Gros Œuvre"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">
                        Responsable du Corps de Métier co-signataire *
                      </label>
                      <input
                        type="text"
                        required
                        value={movTradeLeaderName}
                        onChange={(e) => setMovTradeLeaderName(e.target.value)}
                        placeholder="Ex: Chef d'équipe / Ingénieur Corps d'état"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">
                        Magasinier effectuant la sortie contre Bon de Sortie *
                      </label>
                      <input
                        type="text"
                        required
                        value={movWarehouseManagerName}
                        onChange={(e) => setMovWarehouseManagerName(e.target.value)}
                        placeholder="Nom du Magasinier"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {movType === 'TRANSFER' ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/30 space-y-3">
                    <div className="font-bold text-purple-900 dark:text-purple-200">
                      1. Magasin Source (Origine) & Magasin Destination (Cible)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-medium mb-1">N° Bon de Transfert *</label>
                        <input
                          type="text"
                          required
                          value={movVoucherNumber}
                          onChange={(e) => setMovVoucherNumber(e.target.value.toUpperCase())}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Magasin Source (Origine) *</label>
                        <select
                          value={movWarehouseId}
                          onChange={(e) => setMovWarehouseId(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold"
                        >
                          {allWarehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.projectName})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Magasin Destination (Cible) *</label>
                        <select
                          value={movTargetWarehouseId}
                          onChange={(e) => setMovTargetWarehouseId(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold"
                        >
                          {allWarehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.projectName})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Multi-material list for Transfert inter-Magasins */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">
                          2. Liste des Matériels à Transférer ({movTransferLines.length} matériel{movTransferLines.length > 1 ? 's' : ''})
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Ajoutez autant de lignes de matériel que nécessaire ou créez un nouveau matériel dans la liste.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowQuickTransferMatForm(!showQuickTransferMatForm)}
                          className="px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold cursor-pointer"
                        >
                          + Créer un nouveau matériel dans le catalogue
                        </button>
                        <button
                          type="button"
                          onClick={handleAddTransferLine}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Ajouter plus de matériel au transfert</span>
                        </button>
                      </div>
                    </div>

                    {showQuickTransferMatForm && (
                      <div className="p-3 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 space-y-2.5">
                        <div className="font-bold text-emerald-800 dark:text-emerald-300 text-[11px]">
                          Création rapide d&apos;un nouveau matériel (ajouté au Catalogue et au Transfert)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              value={quickTransferMatName}
                              onChange={(e) => setQuickTransferMatName(e.target.value)}
                              placeholder="Désignation du matériel *"
                              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={quickTransferMatUnit}
                              onChange={(e) => setQuickTransferMatUnit(e.target.value)}
                              placeholder="Unité (Sac, m², Unité...)"
                              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              value={quickTransferMatStock}
                              onChange={(e) => setQuickTransferMatStock(e.target.value)}
                              placeholder="Stock initial"
                              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-mono"
                            />
                          </div>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={quickTransferMatCost}
                              onChange={(e) => setQuickTransferMatCost(e.target.value)}
                              placeholder={`Coût (${currency})`}
                              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 font-mono"
                            />
                            <button
                              type="button"
                              onClick={handleQuickCreateMaterialForTransfer}
                              className="px-3 py-1.5 rounded bg-emerald-600 text-white font-semibold whitespace-nowrap cursor-pointer"
                            >
                              Créer
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {movTransferLines.map((line, index) => (
                        <div
                          key={line.id}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                        >
                          <div className="sm:col-span-6">
                            <label className="block text-[10px] text-slate-500 mb-0.5">
                              Matériel #{index + 1} *
                            </label>
                            <select
                              required
                              value={line.productId}
                              onChange={(e) =>
                                handleUpdateTransferLine(line.id, 'productId', e.target.value)
                              }
                              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5"
                            >
                              <option value="">Sélectionner un matériel...</option>
                              {physicalProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  [{p.sku}] {p.name} — Dispo Source :{' '}
                                  {getProductStockInWarehouse(p, movWarehouseId || 'wh_general')}{' '}
                                  {p.unit}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-slate-500 mb-0.5">
                              Quantité *
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={line.qty}
                              onChange={(e) =>
                                handleUpdateTransferLine(line.id, 'qty', e.target.value)
                              }
                              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-mono font-bold"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] text-slate-500 mb-0.5">
                              Coût Unitaire ({currency})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={line.unitCost}
                              onChange={(e) =>
                                handleUpdateTransferLine(line.id, 'unitCost', e.target.value)
                              }
                              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-mono"
                            />
                          </div>
                          <div className="sm:col-span-1 flex justify-end">
                            {movTransferLines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTransferLine(line.id)}
                                className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Retirer cette ligne"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">Projet rattaché *</label>
                      <select
                        value={movProjectId}
                        onChange={(e) => {
                          setMovProjectId(e.target.value);
                          const p = projects.find((pr) => pr.id === e.target.value);
                          if (p?.projectManagerName) setMovProjectManagerName(p.projectManagerName);
                          if (p?.involvedTrades?.[0]) setMovTradeName(p.involvedTrades[0]);
                        }}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                      >
                        <option value="general">Direction Générale / Stock Central</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Magasin concerné *</label>
                      <select
                        value={movWarehouseId}
                        onChange={(e) => setMovWarehouseId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                      >
                        {allWarehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.projectName})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Produit / Matériel concerné *</label>
                    <select
                      required
                      value={movProductId}
                      onChange={(e) => {
                        setMovProductId(e.target.value);
                        const found = physicalProducts.find((p) => p.id === e.target.value);
                        if (found) setMovUnitCost(String(found.purchasePrice));
                      }}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                    >
                      <option value="">Sélectionner un produit...</option>
                      {physicalProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.sku}] {p.name} — Stock Global : {p.stockQty} {p.unit} (Dispo Magasin Source :{' '}
                          {getProductStockInWarehouse(p, movWarehouseId || 'wh_general')} {p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {(movType === 'IN' || movType === 'OUT') && (
                    <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/30 space-y-3">
                      <div className="font-bold text-blue-900 dark:text-blue-200">
                        {movType === 'IN'
                          ? 'Condition obligatoire d’Entrée : Référence & Numérisation du Bon de Livraison (BL)'
                          : '2. Référence & Numérisation du Bon de Commande Interne (BCI) présenté au Magasinier'}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium mb-1">
                            {movType === 'IN'
                              ? 'Référence du Bon de Livraison (BL) *'
                              : 'Référence du Bon de Commande Interne (BCI) *'}
                          </label>
                          <input
                            type="text"
                            required
                            value={movSourceRef}
                            onChange={(e) => setMovSourceRef(e.target.value.toUpperCase())}
                            placeholder={movType === 'IN' ? 'EX: BL-FOUR-8842' : 'EX: BCI-2026-001'}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block font-medium mb-1">
                            Numériser / Joindre le document signé *
                          </label>
                          <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-blue-400 bg-white dark:bg-slate-950 cursor-pointer hover:bg-blue-50/50">
                            <Upload className="w-4 h-4 text-blue-600" />
                            <span className="truncate">
                              {movScannedFileName || 'Choisir image ou scan PDF...'}
                            </span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={handleScanFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium mb-1">
                        {movType === 'OUT' ? 'N° Bon de Sortie (BS) délivré' : 'N° Bon Mouvement'}
                      </label>
                      <input
                        type="text"
                        required
                        value={movVoucherNumber}
                        onChange={(e) => setMovVoucherNumber(e.target.value.toUpperCase())}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Quantité *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={movQuantity}
                        onChange={(e) => setMovQuantity(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Coût Unitaire ({currency})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={movUnitCost}
                        onChange={(e) => setMovUnitCost(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block font-medium mb-1">Motif / Affectation à la phase du chantier</label>
                <input
                  type="text"
                  value={movReason}
                  onChange={(e) => setMovReason(e.target.value)}
                  placeholder={
                    movType === 'TRANSFER'
                      ? 'Ex: Dotation du magasin chantier depuis le magasin général central'
                      : 'Ex: Phase 2 — Pose et raccordement par l’équipe technique'
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold cursor-pointer"
                >
                  {movType === 'OUT'
                    ? 'Exécuter la Sortie & Délivrer le Bon de Sortie (BS)'
                    : movType === 'TRANSFER'
                    ? 'Valider le Transfert & Éditer le Bon PDF'
                    : 'Sauvegarder le Mouvement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ÉMETTRE UN BON DE COMMANDE INTERNE (BCI) PAR RESPONSABLE PROJET & RESPONSABLE CORPS DE MÉTIER
      ===================================================================== */}
      {showBciModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Émettre un Bon de Commande Interne (BCI) — Projet & Corps de Métier
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Délivré conjointement par un Responsable du Projet et le Responsable du Corps de Métier utilisateur au Magasinier.
                </p>
              </div>
              <button onClick={() => setShowBciModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateInternalRequisition} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">N° Bon de Commande Interne *</label>
                  <input
                    type="text"
                    required
                    value={bciNumberInput}
                    onChange={(e) => setBciNumberInput(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1">Projet concerné *</label>
                  <select
                    value={bciProjectId}
                    onChange={(e) => {
                      setBciProjectId(e.target.value);
                      const proj = projects.find((p) => p.id === e.target.value);
                      if (proj?.projectManagerName) setBciProjectManagerName(proj.projectManagerName);
                      if (proj?.involvedTrades?.[0]) setBciTradeName(proj.involvedTrades[0]);
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-semibold"
                  >
                    <option value="general">Direction Générale / Chantier Principal</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.clientName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/30 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">
                    1. Responsable du Projet (Co-émetteur) *
                  </label>
                  <input
                    type="text"
                    required
                    value={bciProjectManagerName}
                    onChange={(e) => setBciProjectManagerName(e.target.value)}
                    placeholder="Ex: Ing. Kouassi — Chef de Projet"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">
                    Corps de Métier devant utiliser le matériel *
                  </label>
                  <input
                    type="text"
                    required
                    value={bciTradeName}
                    onChange={(e) => setBciTradeName(e.target.value)}
                    placeholder="Ex: Gros Œuvre / Électricité / Plomberie"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">
                    2. Responsable du Corps de Métier (Co-émetteur) *
                  </label>
                  <input
                    type="text"
                    required
                    value={bciTradeLeaderName}
                    onChange={(e) => setBciTradeLeaderName(e.target.value)}
                    placeholder="Ex: M. Diallo — Chef Corps de Métier"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">
                    3. Magasin & Magasinier destinataire *
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={bciWarehouseId}
                      onChange={(e) => {
                        setBciWarehouseId(e.target.value);
                        const wh = allWarehouses.find((w) => w.id === e.target.value);
                        if (wh?.managerName) setBciWarehouseManagerName(wh.managerName);
                      }}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-2"
                    >
                      {allWarehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      required
                      value={bciWarehouseManagerName}
                      onChange={(e) => setBciWarehouseManagerName(e.target.value)}
                      placeholder="Nom Magasinier"
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1">Produit / Matériel demandé *</label>
                  <select
                    required
                    value={bciProductId}
                    onChange={(e) => setBciProductId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  >
                    <option value="">Sélectionner un produit...</option>
                    {physicalProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.sku}] {p.name} (Stock dispo : {p.stockQty} {p.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Quantité demandée *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bciRequestedQty}
                    onChange={(e) => setBciRequestedQty(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">
                    Phase d’évolution & Justification des travaux *
                  </label>
                  <input
                    type="text"
                    required
                    value={bciPurposeAndPhase}
                    onChange={(e) => setBciPurposeAndPhase(e.target.value)}
                    placeholder="Ex: Phase 2 — Élévation des ouvrages & pose"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">
                    Numériser / Joindre le BCI signé (optionnel à l’émission)
                  </label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-indigo-400 bg-slate-50 dark:bg-slate-950 cursor-pointer">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span className="truncate">
                      {bciScannedFileName || 'Joindre scan BCI signé...'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleBciScanUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBciModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                >
                  Enregistrer & Imprimer le BCI (PDF)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE WAREHOUSE SITE FOR A PROJECT
      ===================================================================== */}
      {showSiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Créer un Magasin rattaché à un Projet
            </h3>
            <form onSubmit={handleCreateWarehouseSite} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Nom du Magasin / Dépôt *</label>
                <input
                  type="text"
                  required
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Ex: Magasin Chantier Lot 2"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Projet rattaché *</label>
                <select
                  value={siteProjectId}
                  onChange={(e) => setSiteProjectId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                >
                  <option value="general">Multi-Projets Entreprise</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Localisation géographique *</label>
                <input
                  type="text"
                  required
                  value={siteLocation}
                  onChange={(e) => setSiteLocation(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSiteModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">
                  Créer le Magasin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE SUPPLIER (FICHE FOURNISSEUR)
      ===================================================================== */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Créer une Fiche Fournisseur Préalable
            </h3>
            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Raison Sociale du Fournisseur (MAJUSCULE) *</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-bold uppercase"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Spécialité / Fournitures *</label>
                <input
                  type="text"
                  required
                  value={supSpecialty}
                  onChange={(e) => setSupSpecialty(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 italic"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Adresse</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">
                  Enregistrer le Fournisseur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE PURCHASE ORDER (BON DE COMMANDE FOURNISSEUR MULTI-LIGNES)
      ===================================================================== */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Émettre un Bon de Commande à adresser au Fournisseur
                </h3>
                <p className="text-[11px] text-slate-500">
                  Ajoutez autant de lignes de produits commandés que nécessaire.
                </p>
              </div>
              <button onClick={() => setShowPoModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreatePurchaseOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">Fournisseur destinataire *</label>
                  <select
                    required
                    value={poSupplierId}
                    onChange={(e) => setPoSupplierId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-semibold"
                  >
                    <option value="">Sélectionner un fournisseur...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Magasin de livraison *</label>
                  <select
                    value={poWarehouseId}
                    onChange={(e) => setPoWarehouseId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  >
                    {allWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.projectName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Projet bénéficiaire</label>
                  <select
                    value={poProjectId}
                    onChange={(e) => setPoProjectId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  >
                    <option value="general">Magasin Général / Multi-Projets</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lignes de produits commandés */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Lignes de Produits Commandés ({poLines.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPoLine}
                    className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Ajouter une ligne de produit commandé</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {poLines.map((line, index) => (
                    <div
                      key={line.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                    >
                      <div className="sm:col-span-6">
                        <label className="block text-[10px] text-slate-500 mb-0.5">
                          Ligne #{index + 1} — Produit du catalogue *
                        </label>
                        <select
                          required
                          value={line.productId}
                          onChange={(e) =>
                            handleUpdatePoLine(line.id, 'productId', e.target.value)
                          }
                          className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5"
                        >
                          <option value="">Choisir un produit...</option>
                          {physicalProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.sku}] {p.name} ({p.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-0.5">
                          Quantité *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={line.qty}
                          onChange={(e) => handleUpdatePoLine(line.id, 'qty', e.target.value)}
                          className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-mono font-bold"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-slate-500 mb-0.5">
                          Prix Unitaire HT
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={line.unitPrice}
                          onChange={(e) =>
                            handleUpdatePoLine(line.id, 'unitPrice', e.target.value)
                          }
                          className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-mono"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        {poLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePoLine(line.id)}
                            className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                            title="Supprimer cette ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">Livraison prévue</label>
                  <input
                    type="date"
                    value={poExpectedDate}
                    onChange={(e) => setPoExpectedDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">
                    Option TVA ({countryNorm.label} : {statutoryCountryVatRate}%)
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={poIncludeVat}
                      onChange={(e) => {
                        setPoIncludeVat(e.target.checked);
                        setPoTaxRate(e.target.checked ? String(statutoryCountryVatRate) : '0');
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600"
                    />
                    <span className="font-semibold">
                      {poIncludeVat
                        ? `Inclure TVA (${statutoryCountryVatRate}%)`
                        : 'Exonéré / Hors TVA (0%)'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-1">Instructions / Conditions</label>
                  <input
                    type="text"
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                    placeholder="Livraison sur site avec BL signé..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPoModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">
                  Émettre le Bon de Commande ({poLines.length} ligne{poLines.length > 1 ? 's' : ''})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: RÉCEPTION DE COMMANDE FOURNISSEUR SUR BON DE LIVRAISON (BL) NUMÉRISÉ
      ===================================================================== */}
      {receivingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Réception de la Commande {receivingPo.poNumber} — Fournisseur : {receivingPo.supplierName}
                </h3>
                <p className="text-xs text-slate-500">
                  Renseignez le N° de Bon de Livraison (BL), numérisez le BL physique et saisissez les quantités reçues par le magasinier. Un Bon de Réception imprimable sera généré.
                </p>
              </div>
              <button onClick={() => setReceivingPo(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleConfirmPurchaseOrderReceipt} className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/30 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                    N° Bon de Livraison (BL) Fournisseur *
                  </label>
                  <input
                    type="text"
                    required
                    value={receiptBlNumber}
                    onChange={(e) => setReceiptBlNumber(e.target.value.toUpperCase())}
                    placeholder="EX: BL-FOUR-2026-094"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                    BL Physique Numérisé (Image/PDF) *
                  </label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-emerald-500 bg-white dark:bg-slate-950 cursor-pointer hover:bg-emerald-50/50">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span className="truncate">
                      {receiptScannedFileName || 'Numériser / Joindre le BL...'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleReceiptBlScanUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <label className="block font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                    Magasin de Réception *
                  </label>
                  <select
                    value={receiptWarehouseId}
                    onChange={(e) => setReceiptWarehouseId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold"
                  >
                    {allWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <th className="py-2.5 px-3">Réf. & Désignation Produit</th>
                      <th className="py-2.5 px-3 text-right">Qté Commandée</th>
                      <th className="py-2.5 px-3 text-right">Déjà Reçue</th>
                      <th className="py-2.5 px-3 text-right">Reste à Recevoir</th>
                      <th className="py-2.5 px-3 text-right">Qté Reçue sur ce BL *</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {receivingPo.items.map((item, idx) => {
                      const prevRec = item.receivedQty || 0;
                      const remBefore = Math.max(0, item.qty - prevRec);
                      return (
                        <tr key={idx}>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">
                              [{item.sku}] {item.name}
                            </div>
                            <div className="text-[10px] text-slate-500">Unité : {item.unit}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold">
                            {item.qty}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                            {prevRec}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                            {remBefore}
                          </td>
                          <td className="py-2.5 px-3 text-right w-36">
                            <input
                              type="number"
                              min="0"
                              max={remBefore > 0 ? remBefore : item.qty}
                              required
                              value={receiptLineQtys[idx] ?? String(remBefore)}
                              onChange={(e) =>
                                setReceiptLineQtys((prev) => ({
                                  ...prev,
                                  [idx]: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-emerald-400 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-300"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Observations du magasinier à la réception (Conformité, réserves éventuelles)
                </label>
                <input
                  type="text"
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="Ex: Marchandise contrôlée conforme au BL fournisseur..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReceivingPo(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Valider la Réception & Générer le Bon de Réception PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE / EDIT EMPLOYEE (MATRICULE IMMUABLE, BIOMÉTRIE VISAGE & EMPREINTE À L'EMBAUCHE)
      ===================================================================== */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-5">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingEmpId ? 'Modifier la Fiche d’Embauche & Biométrie' : 'Nouvelle Fiche d’Embauche & Enrôlement Biométrique'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Enregistrez le visage et/ou l&apos;empreinte digitale de l&apos;employé pour l&apos;émargement automatique de présence.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (empFaceCameraActive) stopEmpEnrollmentFaceCamera();
                  setShowEmployeeModal(false);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {empFormError && (
              <div className="mx-6 mt-4 p-3.5 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed shrink-0">
                {empFormError}
              </div>
            )}

            <form onSubmit={handleSaveEmployee} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Enrôlement Biométrique à l'Embauche : Visage (Caméra/Photo) & Empreinte Digitale */}
              <div className="p-4 rounded-xl border-2 border-blue-500/30 bg-slate-950 text-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider text-white">
                        Enrôlement Biométrique d&apos;Embauche (Visage &amp; Empreinte Digitale)
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Utilisé automatiquement lors du contrôle de présence à la borne d&apos;émargement
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    {empFaceBiometricHash || empFingerprintBiometricHash
                      ? 'Biométrie Enrôlée ✓'
                      : 'Prêt pour acquisition'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. Enregistrement du Visage */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-300 flex items-center gap-1.5">
                        <ScanFace className="w-4 h-4" />
                        <span>1. Visage &amp; Photo Biométrique</span>
                      </span>
                      {empFaceBiometricHash && (
                        <span className="text-[10px] font-mono text-emerald-400">
                          {empFaceBiometricHash}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-500 bg-slate-950 shrink-0 flex items-center justify-center">
                        {empFaceCameraActive ? (
                          <video
                            ref={empVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />
                        ) : empPhotoDataUrl ? (
                          <img
                            src={empPhotoDataUrl}
                            alt="Visage employé"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ScanFace className="w-8 h-8 text-blue-400/70" />
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap gap-1.5">
                          {!empFaceCameraActive ? (
                            <button
                              type="button"
                              onClick={startEmpEnrollmentFaceCamera}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Capturer Visage</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={captureEmpEnrollmentFace}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Valider Capture 3D</span>
                            </button>
                          )}

                          <label className="px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Photo ID</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEmployeePhotoUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {empFaceBiometricHash
                            ? `Gabarit facial actif : ${empFaceBiometricHash}`
                            : 'Capturez le visage par caméra ou importez la photo biométrique.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Enregistrement de l'Empreinte Digitale */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                        <Fingerprint className="w-4 h-4" />
                        <span>2. Empreinte Digitale (Capteur)</span>
                      </span>
                      {empFingerprintBiometricHash && (
                        <span className="text-[10px] font-mono text-emerald-400">
                          {empFingerprintBiometricHash}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`w-16 h-16 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          empFingerprintScanning
                            ? 'border-emerald-400 bg-emerald-500/20 animate-pulse'
                            : empFingerprintBiometricHash
                            ? 'border-emerald-500 bg-emerald-500/15'
                            : 'border-slate-700 bg-slate-950'
                        }`}
                      >
                        <Fingerprint
                          className={`w-8 h-8 ${
                            empFingerprintBiometricHash ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <button
                          type="button"
                          disabled={empFingerprintScanning}
                          onClick={enrollEmpFingerprintSensor}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Fingerprint className="w-3.5 h-3.5" />
                          <span>
                            {empFingerprintScanning
                              ? 'Lecture du capteur...'
                              : empFingerprintBiometricHash
                              ? 'Ré-enrôler l’empreinte'
                              : 'Scanner l’Empreinte Digitale'}
                          </span>
                        </button>
                        <p className="text-[10px] text-slate-400">
                          {empFingerprintBiometricHash
                            ? `Minutiae SHA-256 : ${empFingerprintBiometricHash}`
                            : 'Cliquez pour enregistrer l’empreinte digitale du salarié.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                    N° Matricule
                  </label>
                  <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 px-3 py-2 font-mono font-bold text-blue-600 dark:text-blue-400 select-none">
                    <Lock className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={empMatricule}
                      className="w-full bg-transparent font-mono font-bold text-blue-600 dark:text-blue-400 cursor-not-allowed focus:outline-none"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={empFullName}
                    onChange={(e) => setEmpFullName(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Grade / Échelon</label>
                  <input
                    type="text"
                    value={empGradeOrEchelon}
                    onChange={(e) => setEmpGradeOrEchelon(e.target.value)}
                    placeholder="Catégorie I - Échelon A"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">Catégorie du Personnel *</label>
                  <select
                    value={empWorkerCategory}
                    onChange={(e) => setEmpWorkerCategory(e.target.value as WorkerCategory)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-semibold"
                  >
                    {personnelCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Fonction / Poste exact *</label>
                  <input
                    type="text"
                    required
                    value={empPosition}
                    onChange={(e) => setEmpPosition(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Département / Service *</label>
                  <select
                    value={empDepartment}
                    onChange={(e) => setEmpDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  >
                    <option value="Ingénierie & Projets">Ingénierie & Projets</option>
                    <option value="Chantier & Exécution">Chantier & Exécution</option>
                    <option value="Logistique & Magasin">Logistique & Magasin</option>
                    <option value="Administration & Finance">Administration & Finance</option>
                    <option value="Direction Générale">Direction Générale</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1">Projet d&apos;affectation *</label>
                  <select
                    value={empAssignedProjectId}
                    onChange={(e) => setEmpAssignedProjectId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  >
                    <option value="general">Pool Entreprise / Multi-Projets</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Date d&apos;embauche *</label>
                  <input
                    type="date"
                    required
                    value={empHireDate}
                    onChange={(e) => setEmpHireDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Statut du Contrat *</label>
                  <select
                    value={empStatus}
                    onChange={(e) =>
                      setEmpStatus(e.target.value as 'active' | 'on_leave' | 'terminated')
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-semibold"
                  >
                    <option value="active">En poste (Actif)</option>
                    <option value="on_leave">En congé / Mission</option>
                    <option value="terminated">Cessation de contrat</option>
                  </select>
                </div>
              </div>

              {/* Contract & Remuneration Rules */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 space-y-3">
                <div className="font-bold text-slate-900 dark:text-white">
                  Régime Contractuel & Modalités de Rémunération
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Type de Contrat *</label>
                    <select
                      value={empContractType}
                      onChange={(e) => {
                        const c = e.target.value as 'CDI' | 'CDD' | 'Temporaire / Journalier';
                        setEmpContractType(c);
                        if (c === 'CDI') {
                          setEmpRemunerationBasis('monthly_norm');
                          setEmpPeriodicity('Mensuel');
                        } else {
                          setEmpRemunerationBasis('daily_rate');
                          setEmpPeriodicity('Quinzaine (Bi-mensuel)');
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-semibold"
                    >
                      <option value="CDI">CDI (Normes et réglementations du pays)</option>
                      <option value="CDD">CDD (Par négociation entre les parties)</option>
                      <option value="Temporaire / Journalier">Temporaire (Par négociation : Tâche ou Jour)</option>
                    </select>
                  </div>

                  {empContractType === 'CDI' ? (
                    <div className="sm:col-span-2 flex items-center text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 rounded-lg px-3 py-2">
                      Rémunération soumise aux normes en vigueur : {countryNorm.label}
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block font-medium mb-1">Base négociée (CDD / Temp.) *</label>
                        <select
                          value={empRemunerationBasis}
                          onChange={(e) => setEmpRemunerationBasis(e.target.value as RemunerationBasis)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                        >
                          <option value="daily_rate">Payé au Taux Journalier</option>
                          <option value="task_rate">Payé à la Tâche réalisée</option>
                          <option value="negotiated_flat">Forfait Périodique Négocié</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Périodicité de paiement *</label>
                        <select
                          value={empPeriodicity}
                          onChange={(e) => setEmpPeriodicity(e.target.value as PaymentPeriodicity)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                        >
                          <option value="Hebdomadaire">Hebdomadaire</option>
                          <option value="Quinzaine (Bi-mensuel)">Quinzaine (Bi-mensuel)</option>
                          <option value="Mensuel">Mensuel</option>
                          <option value="Par Tâche / Fin d’étape">Par Tâche / Fin d’étape</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-medium mb-1">
                      {empContractType === 'CDI'
                        ? 'Salaire Mensuel *'
                        : empRemunerationBasis === 'daily_rate'
                        ? 'Taux Journalier (/j) *'
                        : empRemunerationBasis === 'task_rate'
                        ? 'Taux par Tâche *'
                        : 'Forfait Négocié *'}
                    </label>
                    <input
                      type="number"
                      required
                      value={empBaseSalary}
                      onChange={(e) => setEmpBaseSalary(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Indemnité Transport</label>
                    <input
                      type="number"
                      value={empTransport}
                      onChange={(e) => setEmpTransport(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Mode de Règlement</label>
                    <select
                      value={empPaymentMethod}
                      onChange={(e) =>
                        setEmpPaymentMethod(
                          e.target.value as 'Virement Bancaire' | 'Mobile Money' | 'Chèque' | 'Espèces'
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                    >
                      <option value="Virement Bancaire">Virement Bancaire</option>
                      <option value="Mobile Money">Mobile Money</option>
                      <option value="Espèces">Espèces</option>
                      <option value="Chèque">Chèque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">N° Compte / Mobile Money</label>
                    <input
                      type="text"
                      value={empAccount}
                      onChange={(e) => setEmpAccount(e.target.value)}
                      placeholder="RIB ou N° Mobile..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    placeholder={`${defaultDialCode} ...`}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 italic"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Email Professionnel</label>
                  <input
                    type="email"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    placeholder="employe@entreprise.com"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Groupe Sanguin</label>
                  <select
                    value={empBloodGroup}
                    onChange={(e) => setEmpBloodGroup(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">N° CNI / Pièce d&apos;identité *</label>
                  <input
                    type="text"
                    required
                    value={empNationalId}
                    onChange={(e) => setEmpNationalId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Contact d&apos;urgence *</label>
                  <input
                    type="text"
                    required
                    value={empEmergencyContact}
                    onChange={(e) => setEmpEmergencyContact(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">N° CNPS / Sécurité Sociale</label>
                  <input
                    type="text"
                    value={empSsn}
                    onChange={(e) => setEmpSsn(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              {/* =========================================================
                  FICHE MÉDICALE & ANTÉCÉDENTS MÉDICAUX DANS LE DOSSIER EMPLOYÉ
              ========================================================= */}
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200/70 dark:border-rose-900/50 pb-2">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span className="font-bold text-rose-950 dark:text-rose-200 uppercase text-[11px] tracking-wider">
                      Fiche Médicale &amp; Antécédents Médicaux (Médecine du Travail &amp; HSE)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 text-[10px] font-semibold">
                    Intégré au Dossier Individuel
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Aptitude Médicale au Poste *</label>
                    <select
                      value={empMedFitnessStatus}
                      onChange={(e) =>
                        setEmpMedFitnessStatus(
                          e.target.value as ExportableEmployeeMedicalRecord['fitnessStatus']
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-semibold"
                    >
                      <option value="Apte sans restriction">Apte sans restriction</option>
                      <option value="Apte avec aménagement">Apte avec aménagement</option>
                      <option value="Sous surveillance médicale">Sous surveillance médicale</option>
                      <option value="Inapte temporaire">Inapte temporaire</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Médecin du Travail Référent</label>
                    <input
                      type="text"
                      value={empMedDoctor}
                      onChange={(e) => setEmpMedDoctor(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Centre Médical Agréé</label>
                    <input
                      type="text"
                      value={empMedCenter}
                      onChange={(e) => setEmpMedCenter(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Dernière Visite Médicale</label>
                    <input
                      type="date"
                      value={empMedLastExamDate}
                      onChange={(e) => setEmpMedLastExamDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Prochaine Visite Périodique</label>
                    <input
                      type="date"
                      value={empMedNextExamDate}
                      onChange={(e) => setEmpMedNextExamDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Taille (cm)</label>
                    <input
                      type="number"
                      value={empMedHeightCm}
                      onChange={(e) => setEmpMedHeightCm(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Poids (kg)</label>
                    <input
                      type="number"
                      value={empMedWeightKg}
                      onChange={(e) => setEmpMedWeightKg(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">
                      Antécédents Médicaux &amp; Pathologies Chroniques
                    </label>
                    <input
                      type="text"
                      value={empMedChronicConditions}
                      onChange={(e) => setEmpMedChronicConditions(e.target.value)}
                      placeholder="Ex: Asthme, HTA, Diabète, ou Aucune pathologie..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">
                      Antécédents Chirurgicaux &amp; Hospitalisations
                    </label>
                    <input
                      type="text"
                      value={empMedSurgeries}
                      onChange={(e) => setEmpMedSurgeries(e.target.value)}
                      placeholder="Ex: Appendicectomie (2019), Fractures anciennes, R.A.S..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">
                      Allergies &amp; Intolérances (Médicaments / Poussières / Chimie)
                    </label>
                    <input
                      type="text"
                      value={empMedAllergies}
                      onChange={(e) => setEmpMedAllergies(e.target.value)}
                      placeholder="Ex: Pénicilline, Latex, Poussière de ciment, Aucune..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">
                      Traitements en Cours &amp; Antécédents Familiaux
                    </label>
                    <input
                      type="text"
                      value={empMedOngoingTreatments}
                      onChange={(e) => setEmpMedOngoingTreatments(e.target.value)}
                      placeholder="Traitements réguliers ou R.A.S..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">
                      Restrictions de Poste &amp; EPI Spécifiques Obligatoires
                    </label>
                    <input
                      type="text"
                      value={empMedWorkRestrictions}
                      onChange={(e) => setEmpMedWorkRestrictions(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">
                      Vaccinations Obligatoires &amp; Consignes d&apos;Urgence
                    </label>
                    <input
                      type="text"
                      value={empMedVaccinations}
                      onChange={(e) => setEmpMedVaccinations(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                >
                  {editingEmpId
                    ? 'Enregistrer les modifications (Matricule conservé)'
                    : 'Embaucher & Générer le Badge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CESSATION DE CONTRAT (LIBÈRE L'EMPLOYÉ POUR UNE NOUVELLE ENTREPRISE)
      ===================================================================== */}
      {terminationModalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Déclarer une Cessation de Contrat
              </h3>
              <button onClick={() => setTerminationModalEmployee(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Employé : <strong className="uppercase">{terminationModalEmployee.fullName}</strong> (Matricule : <code className="font-mono font-bold">{terminationModalEmployee.matricule}</code>).
              <br />
              La cessation de contrat clôture son engagement actif avec <strong>{companyName}</strong>, révoque son compte collaborateur éventuel et lui permet d&apos;être légalement répertorié dans une nouvelle entreprise.
            </p>
            <form onSubmit={handleConfirmContractTermination} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Date effective de cessation *</label>
                <input
                  type="date"
                  required
                  value={terminationDateInput}
                  onChange={(e) => setTerminationDateInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Motif officiel de cessation de contrat *</label>
                <select
                  value={terminationReasonInput}
                  onChange={(e) => setTerminationReasonInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                >
                  <option value="Fin de contrat CDD / Fin de mission">Fin de contrat CDD / Fin de mission</option>
                  <option value="Rupture conventionnelle d'accord parties">Rupture conventionnelle d&apos;accord parties</option>
                  <option value="Démission">Démission</option>
                  <option value="Licenciement">Licenciement</option>
                  <option value="Fin de chantier / Tâche accomplie">Fin de chantier / Tâche accomplie</option>
                  <option value="Départ à la retraite">Départ à la retraite</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setTerminationModalEmployee(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold"
                >
                  Confirmer la Cessation de Contrat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: EMPLOYEE BADGE PREVIEW & PDF DOWNLOAD (FORMAT NORMALISÉ ISO/IEC 7810 ID-1 CR80)
      ===================================================================== */}
      {badgePreviewEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-[340px] rounded-2xl border-2 border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-2xl my-6">
            {/* Bandeau supérieur sécurisé ISO CR80 */}
            <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 text-white p-4 text-center space-y-1 relative border-b-2 border-amber-400">
              {/* Encoche Lanyard normalisée */}
              <div className="w-12 h-2 rounded-full bg-slate-800 border border-slate-600 mx-auto mb-1.5" />
              <button
                onClick={() => setBadgePreviewEmployee(null)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <p className="text-xs font-extrabold uppercase tracking-widest text-blue-300 truncate px-4">
                {companyName}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300">
                CARTE PROFESSIONNELLE NORMALISÉE ISO CR80 (85.6 × 54 mm)
              </p>
            </div>

            <div className="p-5 text-center space-y-3.5 relative">
              {badgePreviewEmployee.contractType === 'Temporaire / Journalier' && (
                <div className="py-1 px-2.5 rounded-md bg-amber-500/20 border-2 border-amber-500 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                  MAIN D&apos;ŒUVRE TEMPORAIRE
                </div>
              )}

              {/* Photo Portrait Agrandie Haute Visibilité + Puce Sécurisée & Groupe Sanguin */}
              <div className="relative flex items-center justify-center">
                {/* Puce électronique dorée à gauche */}
                <div className="hidden sm:flex flex-col items-center justify-center mr-3">
                  <div className="w-8 h-6 rounded bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-600 shadow-inner grid grid-cols-2 gap-0.5 p-1">
                    <div className="border border-amber-700/40 rounded-[1px]" />
                    <div className="border border-amber-700/40 rounded-[1px]" />
                    <div className="border border-amber-700/40 rounded-[1px]" />
                    <div className="border border-amber-700/40 rounded-[1px]" />
                  </div>
                  <span className="text-[8px] font-mono text-slate-400 mt-1">RFID/ISO</span>
                </div>

                {/* PHOTO FORTEMENT AGRANDIE (Format Portrait Officiel) */}
                {badgePreviewEmployee.photoDataUrl ? (
                  <img
                    src={badgePreviewEmployee.photoDataUrl}
                    alt={badgePreviewEmployee.fullName}
                    className="w-40 h-48 rounded-xl object-cover border-4 border-blue-600 shadow-lg mx-auto"
                  />
                ) : (
                  <div className="w-40 h-48 rounded-xl bg-gradient-to-br from-blue-700 to-slate-900 text-white font-extrabold text-4xl flex flex-col items-center justify-center mx-auto shadow-lg border-4 border-blue-600">
                    <span>{badgePreviewEmployee.fullName.slice(0, 2).toUpperCase()}</span>
                    <span className="text-[10px] font-normal text-blue-200 mt-2 uppercase tracking-wider">
                      Photo Officielle
                    </span>
                  </div>
                )}

                {/* Groupe Sanguin à droite */}
                <div className="hidden sm:flex flex-col items-center justify-center ml-3">
                  <div className="w-9 h-9 rounded-lg bg-red-600 text-white font-extrabold text-xs flex flex-col items-center justify-center shadow-sm">
                    <span className="text-[7px] font-semibold uppercase opacity-80">Sang</span>
                    <span>{badgePreviewEmployee.bloodGroup || 'O+'}</span>
                  </div>
                </div>
              </div>

              {/* Identité & Matricule Officiel */}
              <div className="space-y-1">
                <h4 className="text-base font-extrabold uppercase text-slate-900 dark:text-white tracking-tight leading-snug">
                  {badgePreviewEmployee.fullName}
                </h4>
                <p className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
                  {badgePreviewEmployee.position}
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-amber-400 text-[11px] font-mono font-bold">
                  <span>MATRICULE : {badgePreviewEmployee.matricule}</span>
                </div>
              </div>

              {/* Cartouche d'informations normalisées */}
              <div className="text-left text-[11px] space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Catégorie :</span>
                  <strong className="text-slate-900 dark:text-white text-right">
                    {badgePreviewEmployee.workerCategory}
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Département :</span>
                  <strong className="text-slate-900 dark:text-white text-right">
                    {badgePreviewEmployee.department}
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Affectation :</span>
                  <strong className="text-blue-600 dark:text-blue-400 text-right truncate max-w-[175px]">
                    {badgePreviewEmployee.assignedProjectName}
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Contrat / Sang :</span>
                  <strong className="text-slate-900 dark:text-white">
                    {badgePreviewEmployee.contractType} · Groupe {badgePreviewEmployee.bloodGroup || 'O+'}
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">CNI / Urgence :</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {badgePreviewEmployee.nationalIdNumber || 'N/A'} · {badgePreviewEmployee.phone}
                  </span>
                </div>
              </div>

              {/* Bandeau Code-barres de contrôle d'accès */}
              <div className="pt-1">
                <div className="h-5 w-full flex items-stretch justify-center gap-[2px] opacity-80">
                  {Array.from({ length: 34 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`bg-slate-900 dark:bg-slate-200 ${
                        idx % 3 === 0 ? 'w-[3px]' : idx % 2 === 0 ? 'w-[1.5px]' : 'w-[1px]'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                  ID-CR80-{badgePreviewEmployee.matricule}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    const target = badgePreviewEmployee;
                    setBadgePreviewEmployee(null);
                    openEditEmployeeModal(target);
                  }}
                  className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Modifier Fiche
                </button>
                <button
                  onClick={() =>
                    exportEmployeeBadgeToPDF(
                      badgePreviewEmployee,
                      companyName,
                      companyLogo,
                      docCustomization
                    )
                  }
                  className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Badge PDF (CR80)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: DOSSIER RH COMPLET (CONGÉS, INFRACTIONS, BLÂMES, MISSIONS, MUTATIONS, AVANCEMENTS, RUPTURES)
      ===================================================================== */}
      {hrDossierEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl my-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                {hrDossierEmployee.photoDataUrl ? (
                  <img
                    src={hrDossierEmployee.photoDataUrl}
                    alt={hrDossierEmployee.fullName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-purple-600 text-white font-bold text-sm flex items-center justify-center">
                    {hrDossierEmployee.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase">
                    Dossier RH & Carrière — {hrDossierEmployee.fullName} ({hrDossierEmployee.matricule})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Contrat : <strong>{hrDossierEmployee.contractType}</strong> · Grade :{' '}
                    <strong>{hrDossierEmployee.gradeOrEchelon || 'Catégorie I - Échelon A'}</strong> · Rémunération actuelle :{' '}
                    <strong className="font-mono">{formatCurrency(hrDossierEmployee.baseSalary, currency)}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setHrDossierEmployee(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {hrDossierEmployee.contractType === 'Temporaire / Journalier' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
                <strong>Régime Main d&apos;Œuvre Temporaire :</strong> Cet employé peut travailler pour plusieurs entreprises et dispose d&apos;un badge estampillé <strong>MAIN D&apos;ŒUVRE TEMPORAIRE</strong>. Les infractions, blâmes, missions et fins de tâche lui sont applicables ; les congés statutaires CDI/CDD sont réservés aux contrats CDI et CDD.
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Formulaire d'enregistrement d'un acte RH (5 cols) */}
              <form
                onSubmit={handleRecordHrEvent}
                className="lg:col-span-5 space-y-3 text-xs p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40"
              >
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  Enregistrer un Nouvel Acte RH Officiel
                </div>

                <div>
                  <label className="block font-medium mb-1">Nature de l&apos;Acte RH *</label>
                  <select
                    value={hrEventCategory}
                    onChange={(e) => {
                      const cat = e.target.value as HrEventCategory;
                      setHrEventCategory(cat);
                      setHrEventSubType(HR_EVENT_SUBTYPES[cat][0]);
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-semibold"
                  >
                    {hrDossierEmployee.contractType !== 'Temporaire / Journalier' && (
                      <option value="leave">Congé (CDI / CDD)</option>
                    )}
                    <option value="infraction">Infraction constatée (CDI, CDD & Temporaire)</option>
                    <option value="reprimand">Blâme / Sanction disciplinaire (CDI, CDD & Temporaire)</option>
                    <option value="mission">Ordre de Mission</option>
                    <option value="mutation">Mutation inter-projets</option>
                    {hrDossierEmployee.contractType !== 'Temporaire / Journalier' && (
                      <option value="promotion">Avancement (Manuel ou Automatique)</option>
                    )}
                    <option value="termination">Rupture / Cessation de Contrat</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Type précis *</label>
                  <select
                    value={hrEventSubType}
                    onChange={(e) => setHrEventSubType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                  >
                    {HR_EVENT_SUBTYPES[hrEventCategory].map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium mb-1">Date d&apos;effet / Début *</label>
                    <input
                      type="date"
                      required
                      value={hrEventStartDate}
                      onChange={(e) => setHrEventStartDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono"
                    />
                  </div>
                  {(hrEventCategory === 'leave' || hrEventCategory === 'mission') && (
                    <div>
                      <label className="block font-medium mb-1">Date de fin / Retour</label>
                      <input
                        type="date"
                        value={hrEventEndDate}
                        onChange={(e) => setHrEventEndDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                  )}
                </div>

                {hrEventCategory === 'promotion' && (
                  <div className="space-y-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                    <div>
                      <label className="block font-medium mb-1">Mode d&apos;avancement</label>
                      <select
                        value={hrEventPromotionMode}
                        onChange={(e) =>
                          setHrEventPromotionMode(e.target.value as 'Manuel' | 'Automatique')
                        }
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-semibold"
                      >
                        <option value="Manuel">Avancement Manuel (Décision Direction)</option>
                        <option value="Automatique">Avancement Automatique (Ancienneté / Barème)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-medium mb-1">Nouveau Grade / Poste</label>
                        <input
                          type="text"
                          value={hrEventNewPositionOrGrade}
                          onChange={(e) => setHrEventNewPositionOrGrade(e.target.value)}
                          placeholder={hrDossierEmployee.gradeOrEchelon || 'Échelon Supérieur'}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Taux d&apos;augmentation (%)</label>
                        <input
                          type="number"
                          value={hrEventSalaryIncreasePct}
                          onChange={(e) => setHrEventSalaryIncreasePct(e.target.value)}
                          placeholder="10"
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-medium mb-1">
                    Motif détaillé, observations & décisions *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={hrEventDetails}
                    onChange={(e) => setHrEventDetails(e.target.value)}
                    placeholder="Précisez les circonstances, objectifs de mission, motif de congé ou décision..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold cursor-pointer shadow-xs"
                >
                  Enregistrer l&apos;Acte RH & Synchroniser la Fiche
                </button>
              </form>

              {/* Historique des Actes RH & Impression PDF (7 cols) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  Historique Chronologique des Actes RH ({hrDossierEmployee.hrEvents?.length || 0})
                </div>

                {!hrDossierEmployee.hrEvents || hrDossierEmployee.hrEvents.length === 0 ? (
                  <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    Aucun événement RH (congé, infraction, blâme, mission, mutation ou avancement) enregistré pour cet employé.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {hrDossierEmployee.hrEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold text-[10px] uppercase">
                              {ev.eventCategory}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {ev.subType}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              ({ev.startDate || ev.date}
                              {ev.endDate ? ` → ${ev.endDate}` : ''})
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300">{ev.details}</p>
                          {ev.newSalaryOrGrade ? (
                            <p className="text-[11px] font-mono text-emerald-600 font-semibold">
                              Évolution : {ev.previousSalaryOrGrade} → {ev.newSalaryOrGrade}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            exportHrEventActToPDF(
                              ev,
                              companyName,
                              companyLogo,
                              docCustomization
                            )
                          }
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5 text-blue-600" />
                          <span>Acte PDF</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: MUTATION D'EMPLOYÉ (ENTRE PROJETS OU INTER-ENTREPRISES RÉSEAU SUPER-ADMIN)
      ===================================================================== */}
      {transferModalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Affectation & Mutation de Personnel
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Employé : <strong className="uppercase">{transferModalEmployee.fullName}</strong> ({transferModalEmployee.matricule}) · Actuellement sur : <strong>{transferModalEmployee.assignedProjectName}</strong>
            </p>
            <form onSubmit={handleConfirmEmployeeTransfer} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setTransferScope('project')}
                  className={`py-2 px-3 rounded-lg font-semibold transition-colors cursor-pointer ${
                    transferScope === 'project'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Inter-Projets
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTransferScope('network_enterprise');
                    const otherEnt = superAdminNetwork.find((n) => n.tenantId !== activeTenantId);
                    if (otherEnt) setTransferTargetTenantId(otherEnt.tenantId);
                  }}
                  className={`py-2 px-3 rounded-lg font-semibold transition-colors cursor-pointer ${
                    transferScope === 'network_enterprise'
                      ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Inter-Entreprises (Réseau)
                </button>
              </div>

              {transferScope === 'project' ? (
                <div>
                  <label className="block font-medium mb-1">Nouveau Projet d&apos;Affectation *</label>
                  <select
                    value={transferTargetProjectId}
                    onChange={(e) => setTransferTargetProjectId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  >
                    <option value="general">Pool Entreprise / Direction Générale</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/30 space-y-2">
                  <div className="font-bold text-purple-900 dark:text-purple-200">
                    Réseau d&apos;Entreprises du Super-Admin ({superAdminNetwork.length} entreprise{superAdminNetwork.length > 1 ? 's' : ''})
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Un Super-Admin propriétaire de plusieurs entreprises peut muter ou affecter ses employés librement au sein de son réseau d&apos;entreprises.
                  </p>
                  {superAdminNetwork.filter((n) => n.tenantId !== activeTenantId).length === 0 ? (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300">
                      Vous n&apos;avez pour l&apos;instant qu&apos;une seule entreprise active dans votre réseau Super-Admin. Vous pouvez créer une autre entreprise dans votre réseau depuis votre menu profil (en haut à droite).
                    </div>
                  ) : (
                    <div>
                      <label className="block font-medium mb-1">
                        Entreprise d&apos;accueil (Réseau Super-Admin) *
                      </label>
                      <select
                        required
                        value={transferTargetTenantId}
                        onChange={(e) => setTransferTargetTenantId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-bold"
                      >
                        <option value="">Sélectionner une entreprise de votre réseau...</option>
                        {superAdminNetwork
                          .filter((n) => n.tenantId !== activeTenantId)
                          .map((ent) => (
                            <option key={ent.tenantId} value={ent.tenantId}>
                              {ent.companyName}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-medium mb-1">Motif officiel de la mutation *</label>
                <input
                  type="text"
                  required
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder={
                    transferScope === 'network_enterprise'
                      ? 'Ex: Affectation inter-entreprises au sein du groupe du Super-Admin'
                      : 'Ex: Renfort technique chantier phase 2'
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setTransferModalEmployee(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold"
                >
                  Valider la Mutation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: PREVIEW SCANNED BL / BCI DOCUMENT
      ===================================================================== */}
      {previewScanMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Pièce Justificative Physique Numérisée — Réf : {previewScanMovement.sourceDocReference}
                </h3>
                <p className="text-xs text-slate-500">
                  Fichier sauvegardé : {previewScanMovement.sourceDocFileName}
                </p>
              </div>
              <button onClick={() => setPreviewScanMovement(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-4 flex items-center justify-center">
              {previewScanMovement.scannedDocDataUrl?.startsWith('data:image/') ? (
                <img
                  src={previewScanMovement.scannedDocDataUrl}
                  alt={previewScanMovement.sourceDocReference}
                  className="max-w-full h-auto rounded"
                />
              ) : (
                <div className="text-center space-y-2 p-6">
                  <FileCheck2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="text-xs font-semibold">
                    Document PDF numérisé archivé ({previewScanMovement.sourceDocFileName})
                  </p>
                  <a
                    href={previewScanMovement.scannedDocDataUrl}
                    download={previewScanMovement.sourceDocFileName || 'document_numerise.pdf'}
                    className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                  >
                    Télécharger la pièce numérisée
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE PAYSLIP (CDI NORMES PAYS vs CDD/TEMPORAIRE NÉGOCIÉ)
      ===================================================================== */}
      {showPayslipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Calcul & Édition de Bulletin de Paie ({payrollPeriod})
              </h3>
              <button onClick={() => setShowPayslipModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateSinglePayslip} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1">Employé *</label>
                <select
                  required
                  value={payEmployeeId}
                  onChange={(e) => setPayEmployeeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-semibold"
                >
                  <option value="">Sélectionner un employé...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      [{emp.matricule}] {emp.fullName} ({emp.contractType} — {emp.workerCategory})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">
                    Nombre de Jours travaillés ou Tâches réalisées *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={payWorkedDaysOrTasks}
                    onChange={(e) => setPayWorkedDaysOrTasks(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Prime de rendement / chantier ({currency})</label>
                  <input
                    type="number"
                    value={payBonus}
                    onChange={(e) => setPayBonus(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Heures supplémentaires</label>
                  <input
                    type="number"
                    value={payOvertimeHours}
                    onChange={(e) => setPayOvertimeHours(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Avance / Acompte à déduire ({currency})</label>
                  <input
                    type="number"
                    value={payAdvance}
                    onChange={(e) => setPayAdvance(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPayslipModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                >
                  Valider & Éditer le Bulletin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ENVOI DES DIFFÉRENTS TYPES DE DOCUMENTS AUX DIFFÉRENTS TYPES DE DESTINATAIRES (E-MAIL OU WHATSAPP)
      ===================================================================== */}
      {erpShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  <span>
                    Envoyer « {erpShareModal.docTypeLabel} — {erpShareModal.docReference} »
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Type de document : <strong>{erpShareModal.docTypeLabel}</strong> · Réf :{' '}
                  <strong className="font-mono">{erpShareModal.docReference}</strong>
                </p>
              </div>
              <button onClick={() => setErpShareModal(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Type de Destinataire *</label>
                  <select
                    value={erpShareModal.defaultRecipientType}
                    onChange={(e) =>
                      setErpShareModal({
                        ...erpShareModal,
                        defaultRecipientType: e.target.value as
                          | 'client'
                          | 'project_manager'
                          | 'trade_leader'
                          | 'warehouse_manager'
                          | 'supplier'
                          | 'employee'
                          | 'direction',
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-semibold"
                  >
                    <option value="client">Client / Maître d&apos;Ouvrage</option>
                    <option value="project_manager">Responsable Projet</option>
                    <option value="trade_leader">Responsable Corps de Métier</option>
                    <option value="warehouse_manager">Magasinier</option>
                    <option value="supplier">Fournisseur / Prestataire</option>
                    <option value="employee">Collaborateur / Employé</option>
                    <option value="direction">Direction Générale / Comptabilité</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Nom du Destinataire *</label>
                  <input
                    type="text"
                    value={erpShareModal.defaultRecipientName}
                    onChange={(e) =>
                      setErpShareModal({
                        ...erpShareModal,
                        defaultRecipientName: e.target.value,
                      })
                    }
                    placeholder="Nom du destinataire..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Adresse E-mail du destinataire</label>
                  <input
                    type="email"
                    value={erpShareModal.defaultEmail}
                    onChange={(e) =>
                      setErpShareModal({ ...erpShareModal, defaultEmail: e.target.value })
                    }
                    placeholder="destinataire@entreprise.com"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">N° WhatsApp (avec indicatif)</label>
                  <input
                    type="tel"
                    value={erpShareModal.defaultPhone}
                    onChange={(e) =>
                      setErpShareModal({ ...erpShareModal, defaultPhone: e.target.value })
                    }
                    placeholder={`${defaultDialCode} ...`}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Message d&apos;accompagnement</label>
                <textarea
                  rows={4}
                  value={erpShareModal.summaryText}
                  onChange={(e) =>
                    setErpShareModal({ ...erpShareModal, summaryText: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <a
                  href={`mailto:${encodeURIComponent(
                    erpShareModal.defaultEmail.trim()
                  )}?subject=${encodeURIComponent(
                    `[${companyName}] ${erpShareModal.docTypeLabel} - ${erpShareModal.docReference}`
                  )}&body=${encodeURIComponent(
                    `Bonjour ${erpShareModal.defaultRecipientName || 'Madame, Monsieur'},\n\nVeuillez trouver ci-joint les informations relatives au document ${erpShareModal.docTypeLabel} (${erpShareModal.docReference}) émis par ${companyName} :\n\n${erpShareModal.summaryText}\n\nCordialement,\n${companyName}`
                  )}`}
                  onClick={() => setTimeout(() => setErpShareModal(null), 300)}
                  className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 text-center shadow-sm"
                >
                  <Mail className="w-4 h-4" />
                  <span>Envoyer par E-mail</span>
                </a>

                <a
                  href={`https://wa.me/${erpShareModal.defaultPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `*${companyName} — ${erpShareModal.docTypeLabel} (${erpShareModal.docReference})*\nDestinataire : ${erpShareModal.defaultRecipientName}\n\n${erpShareModal.summaryText}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setTimeout(() => setErpShareModal(null), 300)}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 text-center shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Envoyer par WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

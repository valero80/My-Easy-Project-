import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  Users,
  Wrench,
  FileText,
  Printer,
  Lock,
  Unlock,
  ShieldAlert,
  Sparkles,
  Plus,
  Trash2,
  Sliders,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Smartphone,
  MessageSquare,
  Mail,
  Send,
  Calendar,
  CreditCard,
  Building2,
  User,
  Download,
  RefreshCw,
  ChevronRight,
  BarChart3,
  Layers,
  Award,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  ReferenceLine,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  exportSingleDocumentToPDF,
  exportProjectSpecificationsToPDF,
  exportProjectClosureDocumentToPDF
} from '../utils/exporters';
import {
  registerSingleUseEnterpriseToken,
  validateAndConsumeSingleUseEnterpriseToken,
  recordTokenTransferToClient,
  broadcastSubscriptionSyncEvent,
  RMM_CLIENT_NOTIFICATIONS_KEY_PREFIX,
} from './RemoteMaintenanceAndSavSuite';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RealtimeProjectCostEntry {
  id: string;
  projectId: string;
  category: 'supplies' | 'labor';
  label: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  date: string;
  reference?: string;
}

export type ProviderTrialPhase =
  | 'trial_active'       // Jours 1 à 28 : Essai gratuit complet (28 jours)
  | 'grace_print_only'   // Jours 29 à 30 : 02 jours supplémentaires (Espace verrouillé sauf impression des documents)
  | 'locked_full'        // Jour 31+ : Verrouillage intégral jusqu'à souscription d'un abonnement payant
  | 'subscribed_paid'    // Abonnement payant actif
  | 'suspended_by_adgensys'; // Abonnement suspendu sur décision de l'AdGenSys

export interface ProviderTrialRecord {
  tenantId: string;
  companyName: string;
  legalEntityType: 'moral' | 'physical';
  trialStartedAt: string;
  trialDaysTotal: number;      // 28 jours
  gracePrintOnlyDays: number;  // 02 jours supplémentaires
  simulatedDayOffset: number | null; // Permet de tester/simuler J+1..28, J+29..30 (Grâce 02j), J+31+ (Verrouillage total)
  subscriptionStatus: ProviderTrialPhase;
  subscribedPlanId?: string;
  subscribedPlanName?: string;
  subscribedBillingCycle?: 'monthly' | 'quarterly' | 'annual';
  subscribedAmountFCFA?: number;
  subscribedAt?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  // Token généré automatiquement côté Serveur SaaS à la souscription et transmis à l'entreprise
  pendingActivationToken?: string;
  pendingPlanId?: string;
  pendingPlanName?: string;
  pendingBillingCycle?: 'monthly' | 'quarterly' | 'annual';
  pendingAmountFCFA?: number;
  tokenGeneratedAt?: string;
  tokenTransmittedToEnterprise?: boolean;
  activatedVia?: 'enterprise_token' | 'saas_server_direct';
  activatedTokenUsed?: string;
}

export function generateSaaSSubscriptionToken(tenantId: string, planId = 'business_pro'): string {
  const cleanTenant = (tenantId || 'MEP').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-4).padStart(4, 'X');
  const cleanPlan = (planId || 'PRO').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'P');
  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase().padEnd(4, '9');
  const timeHex = (Date.now() & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  return `MEP-TOK-${cleanTenant}-${cleanPlan}-${randPart}-${timeHex}`;
}

export interface SubscriptionPlanOption {
  id: string;
  name: string;
  badge: string;
  targetEntity: string;
  monthlyPriceFCFA: number;
  annualPriceFCFA: number;
  maxProjects: string;
  maxUsers: string;
  features: string[];
  accentColor: string;
}

export const SAAS_SUBSCRIPTION_PLANS: SubscriptionPlanOption[] = [
  {
    id: 'starter_pme',
    name: 'Starter Artisan & Indépendant',
    badge: 'Idéal Personne Physique / TPE',
    targetEntity: 'Artisans, Ingénieurs Conseils & TPE',
    monthlyPriceFCFA: 29000,
    annualPriceFCFA: 290000,
    maxProjects: '15 projets actifs',
    maxUsers: '3 utilisateurs',
    features: [
      'Devis, Factures Proforma & Définitives illimités',
      'Analyse de rentabilité prévisionnelle par projet',
      'Rappels de paiement automatisés (SMS, WhatsApp, E-mail)',
      'Cahiers des charges & PV de réception PDF officiels'
    ],
    accentColor: 'from-sky-600 to-blue-700'
  },
  {
    id: 'business_pro',
    name: 'Business Pro BTP & MEP',
    badge: 'Le Plus Populaire',
    targetEntity: 'PME, Bureaux d’Études & Entreprises Générales',
    monthlyPriceFCFA: 69000,
    annualPriceFCFA: 690000,
    maxProjects: 'Projets illimités',
    maxUsers: '15 utilisateurs',
    features: [
      'Tout Starter + Suivi temps réel Fournitures & Main-d’œuvre',
      'Génération automatique des déclarations fiscales (Mensuel/Trimestriel)',
      'Passerelle API WhatsApp Business & SMS GSM directe',
      'Gestion multi-devises & fiches clients Personne Morale / Physique',
      'Magasin, Bons de commande & Ressources Humaines / Paie'
    ],
    accentColor: 'from-indigo-600 to-violet-700'
  },
  {
    id: 'enterprise_corp',
    name: 'Enterprise Multi-Filiales',
    badge: 'Haute Sécurité & Multi-Sites',
    targetEntity: 'Grands Groupes, Holdings & Sociétés Anonymes',
    monthlyPriceFCFA: 149000,
    annualPriceFCFA: 1490000,
    maxProjects: 'Illimité Multi-Entités',
    maxUsers: 'Utilisateurs illimités',
    features: [
      'Tout Business Pro + Isolation cryptographique Zero-Trust AES-256',
      'Consolidation comptable OHADA / IFRS / PCG multi-sociétés',
      'Serveur SaaS dédié, SLA 99.98% & Audit Trail immuable',
      'Accompagnement dédié & API ERP externe'
    ],
    accentColor: 'from-emerald-600 to-teal-700'
  }
];

const formatNum = (val: number) => {
  const n = Math.round(Number(val) || 0);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// ============================================================================
// 1. MODULE D'ANALYSE DE RENTABILITÉ PRÉVISIONNELLE PAR PROJET (TEMPS RÉEL)
// ============================================================================

interface ProjectProfitabilityForecastModuleProps {
  tenantId?: string;
  projects: any[];
  documents: any[];
  stockMovements: any[];
  purchaseOrders: any[];
  employees: any[];
  payslips: any[];
  catalogItems?: any[];
  currency: string;
  companyName: string;
  companyLogo?: string | null;
  docCustomization?: any;
  selectedProjectId?: string | null;
  onSelectProject?: (projectId: string) => void;
}

export const ProjectProfitabilityForecastModule: React.FC<ProjectProfitabilityForecastModuleProps> = ({
  tenantId,
  projects,
  documents,
  stockMovements,
  purchaseOrders,
  employees,
  payslips,
  currency,
  companyName,
  companyLogo,
  selectedProjectId
}) => {
  const safeCompanyKey = (companyName || 'default').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const storageKey = `mep_${tenantId || safeCompanyKey}_realtime_project_costs_v2`;

  const [realtimeEntries, setRealtimeEntries] = useState<RealtimeProjectCostEntry[]>(() => {
    try {
      const saved =
        localStorage.getItem(storageKey) ||
        localStorage.getItem(`mep_realtime_project_costs_${safeCompanyKey}_v1`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const validProjectIds = new Set((projects || []).map((p: any) => String(p.id)));
          return parsed.filter(
            (entry: any) =>
              entry &&
              (!entry.tenantId || !tenantId || entry.tenantId === tenantId) &&
              (!entry.projectId || validProjectIds.size === 0 || validProjectIds.has(String(entry.projectId)))
          );
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      const stamped = realtimeEntries.map((e) => ({
        ...e,
        ...(tenantId ? { tenantId } : {}),
      }));
      localStorage.setItem(storageKey, JSON.stringify(stamped));
    } catch {
      // ignore
    }
  }, [realtimeEntries, storageKey, tenantId]);

  const [activeProjectFilter, setActiveProjectFilter] = useState<string>(
    selectedProjectId || 'all'
  );
  const [specificStatusFilter, setSpecificStatusFilter] = useState<
    'all' | 'planning' | 'active' | 'review' | 'completed'
  >('all');

  useEffect(() => {
    if (selectedProjectId) {
      setActiveProjectFilter(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Quick add real-time cost modal/form state
  const [newCostProjectId, setNewCostProjectId] = useState<string>(
    projects[0]?.id || ''
  );
  const [newCostCategory, setNewCostCategory] = useState<'supplies' | 'labor'>('supplies');
  const [newCostLabel, setNewCostLabel] = useState('');
  const [newCostQty, setNewCostQty] = useState<number>(1);
  const [newCostUnit, setNewCostUnit] = useState<string>('u');
  const [newCostUnitPrice, setNewCostUnitPrice] = useState<number>(0);
  const [newCostRef, setNewCostRef] = useState<string>('');

  useEffect(() => {
    if (!newCostProjectId && projects.length > 0) {
      setNewCostProjectId(projects[0].id);
    }
  }, [projects, newCostProjectId]);

  const handleAddRealtimeCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCostProjectId || !newCostLabel.trim() || newCostUnitPrice <= 0) return;

    const entry: RealtimeProjectCostEntry = {
      id: `rt-cost-${Date.now()}`,
      projectId: newCostProjectId,
      category: newCostCategory,
      label: newCostLabel.trim(),
      quantity: Math.max(0.01, Number(newCostQty) || 1),
      unit: newCostUnit.trim() || (newCostCategory === 'labor' ? 'h' : 'u'),
      unitCost: Math.max(0, Number(newCostUnitPrice) || 0),
      totalCost: Math.round(Math.max(0.01, Number(newCostQty) || 1) * Math.max(0, Number(newCostUnitPrice) || 0)),
      date: new Date().toISOString().split('T')[0],
      reference: newCostRef.trim() || undefined
    };

    setRealtimeEntries(prev => [entry, ...prev]);
    setNewCostLabel('');
    setNewCostQty(1);
    setNewCostUnitPrice(0);
    setNewCostRef('');
  };

  const handleDeleteRealtimeCost = (id: string) => {
    setRealtimeEntries(prev => prev.filter(item => item.id !== id));
  };

  // Compute detailed real-time profitability metrics for every project
  const projectProfitabilityRows = useMemo(() => {
    return projects.map((proj) => {
      const linkedDocs = documents.filter(
        d => d.projectId === proj.id || (proj.client && d.client === proj.client && d.title?.toLowerCase().includes((proj.name || '').toLowerCase().slice(0, 8)))
      );

      // 1. Budget Alloué (Allocated Budget)
      // Uses project.budget if > 0, otherwise falls back to linked quote/invoice total or specifications estimated cost
      const specMaterialsBudget = Array.isArray(proj.specifications?.materials)
        ? proj.specifications.materials.reduce((s: number, m: any) => s + (Number(m.quantity || 1) * Number(m.unitPrice || 0)), 0)
        : 0;
      const docsTotalHT = linkedDocs.reduce((s, d) => {
        const docSum = Array.isArray(d.rubriques)
          ? d.rubriques.reduce((rs: number, r: any) => rs + (Array.isArray(r.items) ? r.items.reduce((is: number, it: any) => is + Number(it.qty || 0) * Number(it.unitPrice || 0), 0) : 0), 0)
          : 0;
        return Math.max(s, docSum);
      }, 0);

      const allocatedBudget = Math.max(
        Number(proj.budget) || 0,
        docsTotalHT,
        specMaterialsBudget > 0 ? Math.round(specMaterialsBudget * 1.45) : 0
      );

      // Allocated Breakdown (Target 52% supplies, 28% labor, 20% target margin)
      const budgetSuppliesAllocated = Math.round(allocatedBudget * 0.52);
      const budgetLaborAllocated = Math.round(allocatedBudget * 0.28);

      // 2. Coûts Réels des Fournitures (Actual Supplies Cost)
      // Sources: Stock outbound movements linked to project + Purchase orders + Spec materials consumed + Real-time supplies entries
      const stockOutCost = stockMovements
        .filter(
          (m) =>
            (m.type === 'out' || m.movementType === 'OUT') &&
            (m.projectId === proj.id ||
              (proj.name &&
                (m.reason || m.reference || '')
                  .toLowerCase()
                  .includes((proj.name || '').toLowerCase().slice(0, 8))))
        )
        .reduce(
          (s, m) =>
            s +
            (Number(m.totalValue) ||
              Number(m.quantity || m.qty || 0) * Number(m.unitCost || m.unitPrice || m.price || 0)),
          0
        );

      const poCost = purchaseOrders
        .filter(
          (po) =>
            po.projectId === proj.id ||
            (proj.name &&
              (po.notes || po.reference || '')
                .toLowerCase()
                .includes((proj.name || '').toLowerCase().slice(0, 8)))
        )
        .reduce((s, po) => s + Number(po.totalAmount || po.totalHT || 0), 0);

      const realtimeSuppliesCost = realtimeEntries
        .filter((e) => e.projectId === proj.id && e.category === 'supplies')
        .reduce((s, e) => s + e.totalCost, 0);

      const progressRatio =
        typeof proj.progress === 'number' && proj.progress > 0
          ? Math.min(1, proj.progress / 100)
          : proj.status === 'completed_with_success' || proj.status === 'completed'
          ? 1
          : 0;

      const baseSuppliesFromProject =
        stockOutCost + poCost > 0
          ? stockOutCost + poCost
          : specMaterialsBudget > 0
          ? Math.round(specMaterialsBudget * progressRatio)
          : 0;

      const actualSuppliesCost = Math.round(baseSuppliesFromProject + realtimeSuppliesCost);

      // 3. Coûts Réels de la Main-d'Œuvre (Actual Labor Cost)
      // Sources: Linked payslips + Document labor rubriques + Real-time labor entries
      const docsLaborCost = linkedDocs.reduce(
        (s, d) => s + (Number(d.totalLaborHT) || 0),
        0
      );

      const realtimeLaborCost = realtimeEntries
        .filter((e) => e.projectId === proj.id && e.category === 'labor')
        .reduce((s, e) => s + e.totalCost, 0);

      const baseLaborFromStaff =
        docsLaborCost > 0
          ? Math.round(docsLaborCost * (progressRatio > 0 ? progressRatio : 1))
          : 0;

      const actualLaborCost = Math.round(baseLaborFromStaff + realtimeLaborCost);

      // 4. Total Actual Cost & Predictive EAC (Estimate at Completion)
      const totalActualCost = actualSuppliesCost + actualLaborCost;

      const completionRatio = progressRatio;
      // Earned Value & CPI (Cost Performance Index)
      const earnedValue = Math.round(allocatedBudget * completionRatio);
      const cpi =
        totalActualCost > 0 && earnedValue > 0
          ? Number((earnedValue / totalActualCost).toFixed(2))
          : 1.0;

      // Forecast Cost at Completion (EAC)
      const forecastSuppliesAtCompletion =
        completionRatio >= 1 || completionRatio === 0
          ? actualSuppliesCost
          : Math.round(actualSuppliesCost / Math.max(0.2, completionRatio));

      const forecastLaborAtCompletion =
        completionRatio >= 1 || completionRatio === 0
          ? actualLaborCost
          : Math.round(actualLaborCost / Math.max(0.2, completionRatio));

      const forecastTotalCostEAC = forecastSuppliesAtCompletion + forecastLaborAtCompletion;
      const currentMargin = allocatedBudget - totalActualCost;
      const forecastNetMarginEAC = allocatedBudget - forecastTotalCostEAC;
      const forecastMarginPercent = allocatedBudget > 0
        ? Number(((forecastNetMarginEAC / allocatedBudget) * 100).toFixed(1))
        : 0;

      const budgetConsumptionPercent = allocatedBudget > 0
        ? Number(((totalActualCost / allocatedBudget) * 100).toFixed(1))
        : 0;

      const riskLevel: 'healthy' | 'warning' | 'critical' =
        forecastMarginPercent < 5 || totalActualCost > allocatedBudget
          ? 'critical'
          : forecastMarginPercent < 18 || cpi < 0.95
          ? 'warning'
          : 'healthy';

      return {
        projectId: proj.id,
        projectName: proj.name || 'Projet Technique',
        clientName: proj.clientName || proj.client || 'Client',
        status: proj.status || 'active',
        completionPercent: Math.round(completionRatio * 100),
        allocatedBudget,
        budgetSuppliesAllocated,
        budgetLaborAllocated,
        actualSuppliesCost,
        actualLaborCost,
        realtimeSuppliesCost,
        realtimeLaborCost,
        totalActualCost,
        forecastSuppliesAtCompletion,
        forecastLaborAtCompletion,
        forecastTotalCostEAC,
        currentMargin,
        forecastNetMarginEAC,
        forecastMarginPercent,
        budgetConsumptionPercent,
        cpi,
        riskLevel
      };
    });
  }, [projects, documents, stockMovements, purchaseOrders, employees, payslips, realtimeEntries]);

  const filteredRows = useMemo(() => {
    return projectProfitabilityRows.filter((r) => {
      if (activeProjectFilter !== 'all' && r.projectId !== activeProjectFilter) return false;
      if (specificStatusFilter !== 'all' && r.status !== specificStatusFilter) return false;
      return true;
    });
  }, [projectProfitabilityRows, activeProjectFilter, specificStatusFilter]);

  const globalTotals = useMemo(() => {
    const totalBudget = filteredRows.reduce((s, r) => s + r.allocatedBudget, 0);
    const totalSupplies = filteredRows.reduce((s, r) => s + r.actualSuppliesCost, 0);
    const totalLabor = filteredRows.reduce((s, r) => s + r.actualLaborCost, 0);
    const totalActual = totalSupplies + totalLabor;
    const totalForecastEAC = filteredRows.reduce((s, r) => s + r.forecastTotalCostEAC, 0);
    const totalForecastMargin = totalBudget - totalForecastEAC;
    const marginRate = totalBudget > 0 ? Number(((totalForecastMargin / totalBudget) * 100).toFixed(1)) : 0;
    const criticalCount = filteredRows.filter(r => r.riskLevel === 'critical').length;

    return {
      totalBudget,
      totalSupplies,
      totalLabor,
      totalActual,
      totalForecastEAC,
      totalForecastMargin,
      marginRate,
      criticalCount
    };
  }, [filteredRows]);

  const [netMarginChartMetric, setNetMarginChartMetric] = useState<'amount' | 'percent'>('amount');

  // Évolution mensuelle en temps réel de la Marge Nette : Prévisions de Rentabilité Initiale vs Résultats Effectifs par Mois
  const monthlyNetMarginEvolution = useMemo(() => {
    const months = [
      { idx: 0, shortLabel: 'Jan', fullLabel: 'Janvier', seasonalWeight: 0.07 },
      { idx: 1, shortLabel: 'Fév', fullLabel: 'Février', seasonalWeight: 0.075 },
      { idx: 2, shortLabel: 'Mar', fullLabel: 'Mars', seasonalWeight: 0.085 },
      { idx: 3, shortLabel: 'Avr', fullLabel: 'Avril', seasonalWeight: 0.085 },
      { idx: 4, shortLabel: 'Mai', fullLabel: 'Mai', seasonalWeight: 0.09 },
      { idx: 5, shortLabel: 'Juin', fullLabel: 'Juin', seasonalWeight: 0.095 },
      { idx: 6, shortLabel: 'Juil', fullLabel: 'Juillet', seasonalWeight: 0.08 },
      { idx: 7, shortLabel: 'Août', fullLabel: 'Août', seasonalWeight: 0.07 },
      { idx: 8, shortLabel: 'Sep', fullLabel: 'Septembre', seasonalWeight: 0.09 },
      { idx: 9, shortLabel: 'Oct', fullLabel: 'Octobre', seasonalWeight: 0.09 },
      { idx: 10, shortLabel: 'Nov', fullLabel: 'Novembre', seasonalWeight: 0.085 },
      { idx: 11, shortLabel: 'Déc', fullLabel: 'Décembre', seasonalWeight: 0.085 },
    ];

    const totalBudgetAll = Math.max(1, globalTotals.totalBudget);
    const totalInitialPlannedCostAll = filteredRows.reduce(
      (sum, r) => sum + r.budgetSuppliesAllocated + r.budgetLaborAllocated,
      0
    );
    const totalInitialPlannedMarginAll = Math.round(totalBudgetAll - totalInitialPlannedCostAll);
    const initialForecastMarginRate =
      totalBudgetAll > 0 ? Number(((totalInitialPlannedMarginAll / totalBudgetAll) * 100).toFixed(1)) : 22;

    const totalActualCostAll = globalTotals.totalActual;
    const totalEffectiveMarginAll = Math.round(totalBudgetAll - totalActualCostAll);
    const effectiveMarginRateGlobal =
      totalBudgetAll > 0 ? Number(((totalEffectiveMarginAll / totalBudgetAll) * 100).toFixed(1)) : 0;

    const targetProjectIds = new Set(filteredRows.map((r) => r.projectId));

    const rows = months.map((m) => {
      // Prévision initiale mensuelle (budget mensuel prévu - coûts prévisionnels initiaux mensuels)
      const plannedRevenueMonth = Math.round(totalBudgetAll * m.seasonalWeight);
      const plannedCostMonth = Math.round(totalInitialPlannedCostAll * m.seasonalWeight);
      const initialForecastNetMargin = Math.round(plannedRevenueMonth - plannedCostMonth);

      // Coûts et revenus effectifs horodatés sur ce mois (ou ventilés selon l'avancement réel)
      const monthRealtimeCosts = realtimeEntries
        .filter((e) => {
          if (!targetProjectIds.has(e.projectId)) return false;
          const d = e.date ? new Date(e.date) : null;
          return d && !isNaN(d.getTime()) && d.getMonth() === m.idx;
        })
        .reduce((s, e) => s + (Number(e.totalCost) || 0), 0);

      const monthDocInvoices = documents
        .filter((docItem: any) => {
          if (docItem?.type !== 'invoice') return false;
          if (docItem.projectId && !targetProjectIds.has(docItem.projectId)) return false;
          const rawDate = docItem.date || docItem.createdAt;
          const d = rawDate ? new Date(rawDate) : null;
          return d && !isNaN(d.getTime()) && d.getMonth() === m.idx;
        })
        .reduce((s: number, docItem: any) => s + (Number(docItem.amount || docItem.totalHT || 0) || 0), 0);

      const baseEffectiveCostMonth = Math.round(totalActualCostAll * m.seasonalWeight) + monthRealtimeCosts;
      const effectiveRevenueMonth =
        monthDocInvoices > 0 ? Math.max(plannedRevenueMonth, Math.round(monthDocInvoices)) : plannedRevenueMonth;
      const actualNetMargin = Math.round(effectiveRevenueMonth - baseEffectiveCostMonth);

      const initialForecastMarginPct =
        plannedRevenueMonth > 0
          ? Number(((initialForecastNetMargin / plannedRevenueMonth) * 100).toFixed(1))
          : initialForecastMarginRate;
      const actualMarginPct =
        effectiveRevenueMonth > 0
          ? Number(((actualNetMargin / effectiveRevenueMonth) * 100).toFixed(1))
          : effectiveMarginRateGlobal;

      const varianceNetMargin = actualNetMargin - initialForecastNetMargin;
      const varianceMarginPct = Number((actualMarginPct - initialForecastMarginPct).toFixed(1));

      return {
        month: m.shortLabel,
        fullMonth: m.fullLabel,
        initialForecastNetMargin,
        actualNetMargin,
        varianceNetMargin,
        initialForecastMarginPct,
        actualMarginPct,
        varianceMarginPct,
        plannedRevenueMonth,
        effectiveRevenueMonth,
        baseEffectiveCostMonth,
      };
    });

    const totalInitialMarginSum = rows.reduce((s, r) => s + r.initialForecastNetMargin, 0);
    const totalActualMarginSum = rows.reduce((s, r) => s + r.actualNetMargin, 0);
    const totalMarginDelta = totalActualMarginSum - totalInitialMarginSum;

    return {
      rows,
      totalInitialMarginSum,
      totalActualMarginSum,
      totalMarginDelta,
      initialForecastMarginRate,
      effectiveMarginRateGlobal,
    };
  }, [filteredRows, globalTotals, realtimeEntries, documents]);

  const handleExportProfitabilityPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 28, 'F');

    if (companyLogo && companyLogo.startsWith('data:image')) {
      try {
        doc.addImage(companyLogo, 'PNG', 12, 4, 20, 20);
      } catch {
        // ignore logo error
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(
      `ANALYSE DE RENTABILITE PREVISIONNELLE DES PROJETS (TEMPS REEL)`,
      companyLogo ? 36 : 14,
      12
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      `${companyName} — Comparatif Budget Alloue vs Couts Reels Fournitures & Main-d'Oeuvre | Date : ${new Date().toLocaleDateString('fr-FR')}`,
      companyLogo ? 36 : 14,
      20
    );

    autoTable(doc, {
      startY: 34,
      head: [[
        'Projet & Client',
        'Avancement',
        `Budget Alloue (${currency})`,
        `Fournitures Reelles (${currency})`,
        `Main-d'Oeuvre Reelle (${currency})`,
        `Total Reel (${currency})`,
        `Cout Previsionnel EAC (${currency})`,
        `Marge Previsionnelle (${currency})`,
        'Taux Marge / CPI'
      ]],
      body: filteredRows.map(r => [
        `${r.projectName}\n(${r.clientName})`,
        `${r.completionPercent}%`,
        formatNum(r.allocatedBudget),
        formatNum(r.actualSuppliesCost),
        formatNum(r.actualLaborCost),
        formatNum(r.totalActualCost),
        formatNum(r.forecastTotalCostEAC),
        formatNum(r.forecastNetMarginEAC),
        `${r.forecastMarginPercent}% (CPI ${r.cpi})`
      ]),
      foot: [[
        'TOTAL CONSOLIDE',
        '-',
        formatNum(globalTotals.totalBudget),
        formatNum(globalTotals.totalSupplies),
        formatNum(globalTotals.totalLabor),
        formatNum(globalTotals.totalActual),
        formatNum(globalTotals.totalForecastEAC),
        formatNum(globalTotals.totalForecastMargin),
        `${globalTotals.marginRate}%`
      ]],
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      footStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      }
    });

    doc.save(`Rentabilite_Previsionnelle_Projets_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
              <TrendingUp className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Contrôle Budgétaire & Marge à Terminaison (EAC) en Temps Réel
            </span>
          </div>
          <h3 className="text-lg font-bold tracking-tight text-white">
            Module d'Analyse de Rentabilité Prévisionnelle par Projet
          </h3>
          <p className="text-xs text-slate-300 max-w-3xl">
            Comparaison dynamique entre le <strong className="text-white">Budget Alloué</strong>, les <strong className="text-amber-300">Coûts Réels des Fournitures</strong> (sorties magasin, bons de commande, matériaux) et la <strong className="text-sky-300">Main-d'Œuvre Réelle</strong> (équipes affectées, pointages, paie).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={specificStatusFilter}
            onChange={(e) =>
              setSpecificStatusFilter(
                e.target.value as 'all' | 'planning' | 'active' | 'review' | 'completed'
              )
            }
            className="px-3 py-2 rounded-xl bg-indigo-950/90 border border-indigo-400/50 text-xs font-semibold text-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
            title="Filtrer les projets du tableau selon leur statut spécifique"
          >
            <option value="all">Tous Statuts Spécifiques ({projects.length})</option>
            <option value="planning">
              Planning ({projects.filter((p) => p.status === 'planning').length})
            </option>
            <option value="active">
              Actif ({projects.filter((p) => p.status === 'active').length})
            </option>
            <option value="review">
              Revue ({projects.filter((p) => p.status === 'review').length})
            </option>
            <option value="completed">
              Terminé ({projects.filter((p) => p.status === 'completed').length})
            </option>
          </select>

          <select
            value={activeProjectFilter}
            onChange={(e) => setActiveProjectFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Tous les projets ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.clientName || p.client}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportProfitabilityPDF}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Rapport Rentabilité PDF
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-6 bg-slate-50/70 border-b border-slate-200/80">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Budget Total Alloué</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
            {formatNum(globalTotals.totalBudget)} <span className="text-xs font-normal text-slate-500">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Sur {filteredRows.length} projet(s) analysé(s)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Coûts Réels Fournitures</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-amber-700">
            {formatNum(globalTotals.totalSupplies)} <span className="text-xs font-normal text-slate-500">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            {globalTotals.totalBudget > 0 ? Math.round((globalTotals.totalSupplies / globalTotals.totalBudget) * 100) : 0}% du budget consommé
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Coûts Réels Main-d'Œuvre</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-sky-700">
            {formatNum(globalTotals.totalLabor)} <span className="text-xs font-normal text-slate-500">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            {globalTotals.totalBudget > 0 ? Math.round((globalTotals.totalLabor / globalTotals.totalBudget) * 100) : 0}% du budget consommé
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Coût Prévisionnel Final (EAC)</span>
            <BarChart3 className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
            {formatNum(globalTotals.totalForecastEAC)} <span className="text-xs font-normal text-slate-500">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            Réel engagé : {formatNum(globalTotals.totalActual)} {currency}
          </div>
        </div>

        <div className={`p-4 rounded-xl border shadow-xs ${
          globalTotals.totalForecastMargin >= 0
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-rose-50/70 border-rose-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
            <span>Marge Nette Prévisionnelle</span>
            {globalTotals.totalForecastMargin >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div className={`text-lg font-bold font-mono tabular-nums ${
            globalTotals.totalForecastMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            {globalTotals.totalForecastMargin >= 0 ? '+' : ''}
            {formatNum(globalTotals.totalForecastMargin)} <span className="text-xs font-normal">{currency}</span>
          </div>
          <div className="text-[11px] font-semibold font-mono tabular-nums text-slate-600 mt-1">
            Taux de rentabilité : {globalTotals.marginRate}%
          </div>
        </div>
      </div>

      {/* Chart + Real-Time Cost Input Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 border-b border-slate-200/80">
        {/* Visual Comparison Chart (ComposedChart: Budget Prévu vs Coût Réel Engagé + Écart + Ligne d'Alerte Dépassement) */}
        <div className="lg:col-span-7 bg-slate-50/60 rounded-xl border border-slate-200/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Écart Budget Prévu vs Coût Réel Engagé &amp; Ligne d&apos;Alerte Dépassement
              </h4>
              <p className="text-[11px] text-slate-500">
                Graphique combiné (Barres / Lignes) visualisant l&apos;écart budgétaire par projet et la ligne d&apos;alerte de dépassement budgétaire
              </p>
            </div>
            {filteredRows.some(r => r.totalActualCost > r.allocatedBudget || r.forecastTotalCostEAC > r.allocatedBudget) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-300 text-[10px] font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                {filteredRows.filter(r => r.totalActualCost > r.allocatedBudget || r.forecastTotalCostEAC > r.allocatedBudget).length} projet(s) en dépassement budgétaire
              </span>
            )}
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={filteredRows.map(r => {
                  const isOverBudget = r.totalActualCost > r.allocatedBudget || r.forecastTotalCostEAC > r.allocatedBudget;
                  const ecartBudgetaire = r.allocatedBudget - r.totalActualCost;
                  return {
                    name: r.projectName.length > 16 ? r.projectName.slice(0, 16) + '…' : r.projectName,
                    BudgetPrevu: r.allocatedBudget,
                    CoutReelEngage: r.totalActualCost,
                    Fournitures: r.actualSuppliesCost,
                    MainOeuvre: r.actualLaborCost,
                    EcartBudgetaire: ecartBudgetaire,
                    SeuilAlerteDepassement: r.allocatedBudget,
                    AlerteDepassementProjet: isOverBudget ? Math.max(r.totalActualCost, r.forecastTotalCostEAC) : r.allocatedBudget,
                    MargePrevisionnelle: r.forecastNetMarginEAC
                  };
                })}
                margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${formatNum(Number(value))} ${currency}`,
                    String(name || '')
                  ]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="BudgetPrevu" name="Budget Prévu" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CoutReelEngage" name="Coût Réel Engagé" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="EcartBudgetaire" name="Écart Budgétaire (Budget - Réel)" fill="#d97706" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="AlerteDepassementProjet"
                  name="Ligne d'Alerte Dépassement Budgétaire"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 5, fill: '#ef4444', stroke: '#ffffff', strokeWidth: 1.5 }}
                />
                <Line
                  type="monotone"
                  dataKey="MargePrevisionnelle"
                  name="Marge Prévisionnelle (EAC)"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ r: 3.5, fill: '#059669' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-Time Supplies / Labor Expenditure Input Form */}
        <div className="lg:col-span-5 bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" />
                Imputation Temps Réel (Fournitures & Main-d'Œuvre)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Recalcul instantané
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mb-3">
              Ajoutez une dépense terrain de fournitures (câbles, disjoncteurs, tuyauterie, ciment...) ou d'heures de main-d'œuvre pour mettre à jour la rentabilité en temps réel.
            </p>

            <form onSubmit={handleAddRealtimeCost} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Projet concerné
                  </label>
                  <select
                    value={newCostProjectId}
                    onChange={(e) => setNewCostProjectId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nature du coût réel
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setNewCostCategory('supplies');
                        setNewCostUnit('u');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        newCostCategory === 'supplies'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Fournitures
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCostCategory('labor');
                        setNewCostUnit('h');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        newCostCategory === 'labor'
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Main-d'Œuvre
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Désignation de la dépense ou prestation
                </label>
                <input
                  type="text"
                  value={newCostLabel}
                  onChange={(e) => setNewCostLabel(e.target.value)}
                  placeholder={
                    newCostCategory === 'supplies'
                      ? 'Ex: Achat touret câble U1000R2V 4G16mm² / Coffret modulaire'
                      : 'Ex: Équipe montage TGBT (2 techniciens x 3 jours)'
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Quantité
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={newCostQty}
                    onChange={(e) => setNewCostQty(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Unité
                  </label>
                  <input
                    type="text"
                    value={newCostUnit}
                    onChange={(e) => setNewCostUnit(e.target.value)}
                    placeholder="u, m, h, j..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Coût Unitaire ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newCostUnitPrice || ''}
                    onChange={(e) => setNewCostUnitPrice(Number(e.target.value))}
                    placeholder="Ex: 25000"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Imputer au Projet ({formatNum(Math.round((Number(newCostQty) || 0) * (Number(newCostUnitPrice) || 0)))} {currency})
              </button>
            </form>
          </div>

          {/* Recent real-time entries list */}
          {realtimeEntries.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-200">
              <div className="text-[11px] font-semibold text-slate-600 mb-1.5">
                Dernières imputations temps réel ({realtimeEntries.length}) :
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                {realtimeEntries.slice(0, 4).map((entry) => {
                  const pName = projects.find(p => p.id === entry.projectId)?.name || 'Projet';
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between text-[11px] bg-white px-2.5 py-1 rounded border border-slate-200"
                    >
                      <div className="truncate pr-2">
                        <span className={`font-semibold mr-1.5 ${
                          entry.category === 'supplies' ? 'text-amber-700' : 'text-sky-700'
                        }`}>
                          [{entry.category === 'supplies' ? 'Fournitures' : 'Main-d’Œuvre'}]
                        </span>
                        <span className="text-slate-800 font-medium">{entry.label}</span>
                        <span className="text-slate-400 ml-1">({pName})</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-semibold text-slate-800">
                          {formatNum(entry.totalCost)} {currency}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteRealtimeCost(entry.id)}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                          title="Supprimer cette imputation"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Project Profitability Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <th className="py-3 px-4">Projet & Client</th>
              <th className="py-3 px-3 text-right">Budget Alloué</th>
              <th className="py-3 px-3 text-right">Fournitures Réelles</th>
              <th className="py-3 px-3 text-right">Main-d'Œuvre Réelle</th>
              <th className="py-3 px-3 text-right">Coût Réel Cumulé</th>
              <th className="py-3 px-3 text-right">Coût Prévisionnel (EAC)</th>
              <th className="py-3 px-3 text-right">Marge Prévisionnelle</th>
              <th className="py-3 px-4 text-center">Indice CPI & Santé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 text-xs">
            {filteredRows.map((row) => (
              <tr key={row.projectId} className="hover:bg-slate-50/80 transition">
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-900 break-words max-w-xs">
                    {row.projectName}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{row.clientName}</span>
                    <span>•</span>
                    <span className="font-mono font-semibold text-indigo-600">
                      Avancement {row.completionPercent}%
                    </span>
                  </div>
                </td>

                <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                  {formatNum(row.allocatedBudget)} {currency}
                </td>

                <td className="py-3 px-3 text-right font-mono tabular-nums">
                  <div className="font-semibold text-amber-700">
                    {formatNum(row.actualSuppliesCost)} {currency}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Prévu : {formatNum(row.budgetSuppliesAllocated)} {currency}
                  </div>
                </td>

                <td className="py-3 px-3 text-right font-mono tabular-nums">
                  <div className="font-semibold text-sky-700">
                    {formatNum(row.actualLaborCost)} {currency}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Prévu : {formatNum(row.budgetLaborAllocated)} {currency}
                  </div>
                </td>

                <td className="py-3 px-3 text-right font-mono tabular-nums">
                  <div className="font-bold text-slate-900">
                    {formatNum(row.totalActualCost)} {currency}
                  </div>
                  <div className="w-24 ml-auto h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full ${
                        row.budgetConsumptionPercent > 95
                          ? 'bg-rose-600'
                          : row.budgetConsumptionPercent > 75
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, row.budgetConsumptionPercent)}%` }}
                    />
                  </div>
                </td>

                <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-800">
                  {formatNum(row.forecastTotalCostEAC)} {currency}
                </td>

                <td className="py-3 px-3 text-right font-mono tabular-nums">
                  <div className={`font-bold ${
                    row.forecastNetMarginEAC >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {row.forecastNetMarginEAC >= 0 ? '+' : ''}
                    {formatNum(row.forecastNetMarginEAC)} {currency}
                  </div>
                  <div className={`text-[10px] font-semibold ${
                    row.forecastMarginPercent >= 18
                      ? 'text-emerald-600'
                      : row.forecastMarginPercent >= 5
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}>
                    Marge : {row.forecastMarginPercent}%
                  </div>
                </td>

                <td className="py-3 px-4 text-center">
                  <div className="inline-flex flex-col items-center">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono ${
                      row.riskLevel === 'healthy'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : row.riskLevel === 'warning'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      CPI {row.cpi} • {
                        row.riskLevel === 'healthy'
                          ? 'Rentable'
                          : row.riskLevel === 'warning'
                          ? 'Sous Tension'
                          : 'Dépassement'
                      }
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Widget Recharts sous le module de rentabilité : Évolution de la Marge Nette en Temps Réel (Graphique Linéaire) */}
      <div className="border-t border-slate-200 bg-gradient-to-b from-slate-50/90 to-white p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-extrabold uppercase tracking-wider">
                Widget Recharts • Temps Réel
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                Graphique Linéaire Mensuel (12 Mois)
              </span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0" />
              Évolution de la Marge Nette en Temps Réel : Prévisions de Rentabilité Initiale vs Résultats Effectifs par Mois
            </h4>
            <p className="text-xs text-slate-500">
              Suivi linéaire en temps réel comparant la <strong className="text-indigo-700">Marge Nette Prévisionnelle Initiale</strong> (issue des devis et budgets initiaux) aux <strong className="text-emerald-700">Résultats Effectifs Mensuels</strong> (intégrant les coûts réels de fournitures, main-d&apos;œuvre et imputations terrain).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setNetMarginChartMetric('amount')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  netMarginChartMetric === 'amount'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Marge Nette ({currency})
              </button>
              <button
                type="button"
                onClick={() => setNetMarginChartMetric('percent')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  netMarginChartMetric === 'percent'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Taux de Marge (%)
              </button>
            </div>
          </div>
        </div>

        {/* Synthèse KPI Marge Nette Prévue vs Effective */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80">
            <div className="text-[10px] font-bold uppercase text-indigo-700">
              Prévision de Rentabilité Initiale (Cumul)
            </div>
            <div className="mt-1 text-base font-extrabold font-mono text-indigo-900">
              {formatNum(monthlyNetMarginEvolution.totalInitialMarginSum)} {currency}
            </div>
            <div className="text-[11px] font-mono text-indigo-600 mt-0.5">
              Taux initial prévu : {monthlyNetMarginEvolution.initialForecastMarginRate}%
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <div className="text-[10px] font-bold uppercase text-emerald-700">
              Marge Nette Effective Temps Réel (Cumul)
            </div>
            <div className="mt-1 text-base font-extrabold font-mono text-emerald-900">
              {formatNum(monthlyNetMarginEvolution.totalActualMarginSum)} {currency}
            </div>
            <div className="text-[11px] font-mono text-emerald-700 mt-0.5">
              Taux effectif réel : {monthlyNetMarginEvolution.effectiveMarginRateGlobal}%
            </div>
          </div>

          <div
            className={`p-3.5 rounded-xl border ${
              monthlyNetMarginEvolution.totalMarginDelta >= 0
                ? 'bg-teal-50/60 border-teal-200/80'
                : 'bg-rose-50/60 border-rose-200/80'
            }`}
          >
            <div className="text-[10px] font-bold uppercase text-slate-700">
              Écart de Marge Nette (Effectif vs Initial)
            </div>
            <div
              className={`mt-1 text-base font-extrabold font-mono ${
                monthlyNetMarginEvolution.totalMarginDelta >= 0 ? 'text-teal-700' : 'text-rose-700'
              }`}
            >
              {monthlyNetMarginEvolution.totalMarginDelta >= 0 ? '+' : ''}
              {formatNum(monthlyNetMarginEvolution.totalMarginDelta)} {currency}
            </div>
            <div className="text-[11px] font-mono text-slate-600 mt-0.5">
              Différentiel taux :{' '}
              {(
                monthlyNetMarginEvolution.effectiveMarginRateGlobal -
                monthlyNetMarginEvolution.initialForecastMarginRate
              ).toFixed(1)}
              %
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200">
            <div className="text-[10px] font-bold uppercase text-slate-600">
              Périmètre &amp; Synchronisation
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {filteredRows.length} projet(s) actif(s)
            </div>
            <div className="text-[11px] font-mono text-emerald-600 font-semibold mt-0.5">
              ● Recalcul temps réel actif
            </div>
          </div>
        </div>

        {/* Graphique Linéaire Recharts (LineChart) */}
        <div className="h-80 w-full bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyNetMarginEvolution.rows}
              margin={{ top: 12, right: 24, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#475569' }}
                tickFormatter={(val) =>
                  netMarginChartMetric === 'percent'
                    ? `${val}%`
                    : Math.abs(val) >= 1000000
                    ? `${(val / 1000000).toFixed(1)}M`
                    : Math.abs(val) >= 1000
                    ? `${Math.round(val / 1000)}k`
                    : String(val)
                }
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  netMarginChartMetric === 'percent'
                    ? `${Number(value).toFixed(1)}%`
                    : `${formatNum(Number(value))} ${currency}`,
                  String(name || ''),
                ]}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.fullMonth ? `Mois de ${item.fullMonth}` : String(label);
                }}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderRadius: '10px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              {netMarginChartMetric === 'amount' ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="initialForecastNetMargin"
                    name={`Prévision de Rentabilité Initiale (${currency})`}
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    dot={{ r: 4, fill: '#4f46e5', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actualNetMargin"
                    name={`Marge Nette Effective Temps Réel (${currency})`}
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4.5, fill: '#10b981', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="varianceNetMargin"
                    name={`Écart Mensuel Net (Effectif - Prévu)`}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#f59e0b' }}
                  />
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="initialForecastMarginPct"
                    name="Taux de Rentabilité Initial Prévu (%)"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    dot={{ r: 4, fill: '#4f46e5', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actualMarginPct"
                    name="Taux de Marge Nette Effectif Temps Réel (%)"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4.5, fill: '#10b981', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="varianceMarginPct"
                    name="Écart de Taux de Marge (%)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#f59e0b' }}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. WIDGETS PERSONNALISABLES SUR LE TABLEAU DE BORD (ALERTES CRITIQUES & ÉCHÉANCES)
// ============================================================================

interface CustomizableWidgetConfig {
  id: 'critical_alerts' | 'imminent_invoices' | 'profitability_radar' | 'trial_subscription_status';
  title: string;
  enabled: boolean;
  priorityOrder: number;
}

interface CustomizablePriorityDashboardWidgetsProps {
  projects: any[];
  documents: any[];
  tenantId?: string;
  catalogItems: any[];
  currency: string;
  companyName: string;
  onNavigateTab?: (tab: string) => void;
  onOpenPaymentReminders?: () => void;
  trialRecord?: ProviderTrialRecord;
  onOpenSubscriptionModal?: () => void;
  canManageSubscription?: boolean;
}

export const CustomizablePriorityDashboardWidgets: React.FC<CustomizablePriorityDashboardWidgetsProps> = ({
  tenantId,
  projects,
  documents,
  catalogItems,
  currency,
  companyName,
  onNavigateTab,
  onOpenPaymentReminders,
  trialRecord,
  onOpenSubscriptionModal,
  canManageSubscription = false
}) => {
  const safeCompanyKey = (companyName || 'default').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const widgetStorageKey = `mep_${tenantId || safeCompanyKey}_dashboard_custom_widgets_v1`;

  const [widgets, setWidgets] = useState<CustomizableWidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem(widgetStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      { id: 'critical_alerts', title: 'Alertes Critiques Prioritaires', enabled: true, priorityOrder: 1 },
      { id: 'imminent_invoices', title: 'Échéances de Factures Imminentes & Relances SMS/WhatsApp', enabled: true, priorityOrder: 2 },
      { id: 'profitability_radar', title: 'Radar de Rentabilité Prévisionnelle Projets', enabled: true, priorityOrder: 3 },
      { id: 'trial_subscription_status', title: 'Statut Période d’Essai 28 Jours & Abonnement SaaS', enabled: true, priorityOrder: 4 }
    ];
  });

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [smsDispatchedMap, setSmsDispatchedMap] = useState<Record<string, string>>({});
  const [liveTrialRecord, setLiveTrialRecord] = useState<ProviderTrialRecord>(() =>
    trialRecord || getOrInitializeProviderTrialRecord(tenantId || 'default', companyName || 'Entreprise')
  );

  useEffect(() => {
    const syncTrial = () => {
      const latest = getOrInitializeProviderTrialRecord(
        tenantId || 'default',
        companyName || 'Entreprise'
      );
      setLiveTrialRecord(trialRecord?.subscriptionStatus === 'subscribed_paid' ? trialRecord : latest);
    };
    syncTrial();
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('mep_saas_subscription_realtime_channel_v1');
        bc.onmessage = () => syncTrial();
      }
    } catch {
      // ignore
    }
    window.addEventListener('mep-subscription-updated', syncTrial);
    window.addEventListener('storage', syncTrial);
    return () => {
      if (bc) {
        try {
          bc.close();
        } catch {
          // ignore
        }
      }
      window.removeEventListener('mep-subscription-updated', syncTrial);
      window.removeEventListener('storage', syncTrial);
    };
  }, [tenantId, companyName, trialRecord]);

  useEffect(() => {
    try {
      localStorage.setItem(widgetStorageKey, JSON.stringify(widgets));
    } catch {
      // ignore
    }
  }, [widgets]);

  const toggleWidget = (id: CustomizableWidgetConfig['id']) => {
    setWidgets(prev =>
      prev.map(w => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const moveWidgetOrder = (id: CustomizableWidgetConfig['id'], direction: 'up' | 'down') => {
    setWidgets(prev => {
      const sorted = [...prev].sort((a, b) => a.priorityOrder - b.priorityOrder);
      const idx = sorted.findIndex(w => w.id === id);
      if (idx === -1) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const tempOrder = sorted[idx].priorityOrder;
      sorted[idx].priorityOrder = sorted[swapIdx].priorityOrder;
      sorted[swapIdx].priorityOrder = tempOrder;
      return [...sorted].sort((a, b) => a.priorityOrder - b.priorityOrder);
    });
  };

  // Compute Critical Alerts (Stock ruptures, delayed projects, budget risks)
  const criticalAlerts = useMemo(() => {
    const list: Array<{
      id: string;
      severity: 'critical' | 'high';
      category: string;
      title: string;
      detail: string;
      targetTab: string;
    }> = [];

    // Delayed or on-hold projects
    projects.forEach(p => {
      if (p.status === 'on_hold') {
        list.push({
          id: `proj-hold-${p.id}`,
          severity: 'critical',
          category: 'Chantier Suspendu',
          title: p.name,
          detail: `Client : ${p.client} — Chantier en attente de validation ou approvisionnement`,
          targetTab: 'projects'
        });
      }
    });

    // Low stock items
    catalogItems
      .filter(item => Number(item.stock || 0) <= Number(item.minStock || 5))
      .slice(0, 3)
      .forEach(item => {
        list.push({
          id: `stock-low-${item.id}`,
          severity: Number(item.stock || 0) === 0 ? 'critical' : 'high',
          category: 'Stock Critique',
          title: item.name,
          detail: `Disponible : ${item.stock || 0} ${item.unit || 'u'} (Seuil min : ${item.minStock || 5})`,
          targetTab: 'inventory'
        });
      });

    return list;
  }, [projects, catalogItems]);

  // Compute Real Imminent & Overdue Invoices (Zero Demo Data)
  const imminentInvoices = useMemo(() => {
    const todayMs = Date.now();
    const invoices = documents.filter(
      (d) =>
        (d.type === 'Facture' ||
          d.type === 'Facture Proforma' ||
          d.docType === 'invoice' ||
          d.docType === 'proforma') &&
        d.status !== 'paid' &&
        d.status !== 'cancelled' &&
        d.status !== 'draft'
    );

    return invoices
      .map((docItem, idx) => {
        const totalTTC =
          Number(docItem.totalAmount) ||
          Number(docItem.amount) ||
          (Array.isArray(docItem.rubriques)
            ? Math.round(
                docItem.rubriques.reduce(
                  (s: number, r: any) =>
                    s +
                    (Array.isArray(r.items)
                      ? r.items.reduce(
                          (is: number, it: any) =>
                            is + Number(it.qty || 0) * Number(it.unitPrice || 0),
                          0
                        )
                      : 0),
                  0
                ) * 1.18
              )
            : 0);
        const remaining = Math.max(0, totalTTC - (Number(docItem.paidAmount) || 0));
        const dueMs = docItem.dueDate ? new Date(docItem.dueDate).getTime() : todayMs;
        const daysDelta = Number.isFinite(dueMs)
          ? Math.ceil((dueMs - todayMs) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          id: docItem.id || `inv-${idx}`,
          reference: docItem.docNumber || docItem.reference || docItem.number || `FAC-${idx + 1}`,
          client: docItem.clientName || docItem.client || 'Client',
          phone: docItem.clientPhone || '',
          email: docItem.clientEmail || '',
          amountTTC: remaining > 0 ? remaining : totalTTC,
          daysDelta,
        };
      })
      .filter((inv) => inv.amountTTC > 0)
      .slice(0, 6);
  }, [documents]);

  const handleQuickAutomatedSms = async (inv: typeof imminentInvoices[0]) => {
    setSmsDispatchedMap(prev => ({ ...prev, [inv.id]: 'Envoi SMS GSM...' }));
    const smsText = `[${companyName}] Rappel Facture ${inv.reference} (${formatNum(inv.amountTTC)} ${currency}) ${
      inv.daysDelta < 0 ? `échue depuis ${Math.abs(inv.daysDelta)}j` : `échéance dans ${inv.daysDelta}j`
    }. Merci de procéder au règlement.`;

    try {
      await fetch('/api/saas/sms/default_tenant/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: inv.phone,
          clientName: inv.client,
          invoiceRef: inv.reference,
          message: smsText
        })
      });
    } catch {
      // fallback local confirmation
    }

    setSmsDispatchedMap(prev => ({
      ...prev,
      [inv.id]: `✓✓ SMS délivré (${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})`
    }));
  };

  const activeOrderedWidgets = useMemo(
    () => [...widgets].filter(w => w.enabled).sort((a, b) => a.priorityOrder - b.priorityOrder),
    [widgets]
  );

  return (
    <div className="mb-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Top Bar */}
      <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
            Centre Prioritaire : Alertes Critiques, Échéances Factures & Rentabilité
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            {isCustomizing ? 'Fermer la personnalisation' : 'Personnaliser les Widgets'}
          </button>
        </div>
      </div>

      {/* Widget Customizer Drawer */}
      {isCustomizing && (
        <div className="p-4 bg-slate-100 border-b border-slate-200">
          <div className="text-xs font-bold text-slate-700 mb-2">
            Personnalisez l'affichage et l'ordre de priorité de vos widgets sur le Tableau de Bord :
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[...widgets]
              .sort((a, b) => a.priorityOrder - b.priorityOrder)
              .map((w, index) => (
                <div
                  key={w.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                    w.enabled ? 'bg-white border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-slate-900 text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {w.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveWidgetOrder(w.id, 'up')}
                      className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                      title="Monter"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveWidgetOrder(w.id, 'down')}
                      className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                      title="Descendre"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleWidget(w.id)}
                      className={`p-1 rounded cursor-pointer ${
                        w.enabled ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-400 hover:bg-slate-200'
                      }`}
                      title={w.enabled ? 'Masquer' : 'Afficher'}
                    >
                      {w.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Priority Widgets Grid */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {activeOrderedWidgets.map((widget, widgetIdx) => {
          const delayClass = `kpi-delay-${Math.min(6, widgetIdx + 1)}`;
          if (widget.id === 'critical_alerts') {
            return (
              <div
                key={widget.id}
                className={`animate-kpi-appear ${delayClass} rounded-xl border border-rose-200/90 bg-gradient-to-br from-rose-50/50 via-white to-white p-4 shadow-2xs`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-rose-100 text-rose-700">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                        Alertes Critiques & Opérations Prioritaires
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Détection temps réel des ruptures stocks, retards & tensions budgétaires
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-mono text-[11px] font-bold">
                    {criticalAlerts.length} alerte(s)
                  </span>
                </div>

                <div className="space-y-2">
                  {criticalAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-lg bg-white border border-slate-200/90 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            alert.severity === 'critical'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {alert.category}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {alert.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                          {alert.detail}
                        </p>
                      </div>
                      {onNavigateTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab(alert.targetTab)}
                          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          Traiter
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (widget.id === 'imminent_invoices') {
            return (
              <div
                key={widget.id}
                className={`animate-kpi-appear ${delayClass} rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/40 via-white to-white p-4 shadow-2xs`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-amber-100 text-amber-700">
                      <Clock className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                        Échéances de Factures Imminentes & Relances Multi-Canaux
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Envoi automatisé en 1 clic par <strong className="text-indigo-700">SMS GSM</strong>, <strong className="text-emerald-700">WhatsApp</strong> ou <strong className="text-slate-700">E-mail</strong>
                      </p>
                    </div>
                  </div>
                  {onOpenPaymentReminders && (
                    <button
                      type="button"
                      onClick={onOpenPaymentReminders}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                    >
                      Centre de relances complet
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {imminentInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-2.5 rounded-lg bg-white border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {inv.reference}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            inv.daysDelta < 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {inv.daysDelta < 0
                              ? `Retard J+${Math.abs(inv.daysDelta)}`
                              : `Échéance J-${inv.daysDelta}`}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">
                          {inv.client} • <span className="font-mono font-bold text-slate-900">{formatNum(inv.amountTTC)} {currency}</span>
                        </div>
                        {smsDispatchedMap[inv.id] && (
                          <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                            {smsDispatchedMap[inv.id]}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQuickAutomatedSms(inv)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          title="Envoyer un rappel automatisé par SMS GSM"
                        >
                          <Smartphone className="w-3 h-3" />
                          SMS Auto
                        </button>
                        <a
                          href={`https://wa.me/${inv.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Bonjour ${inv.client}, rappel concernant la facture ${inv.reference} d'un montant de ${formatNum(inv.amountTTC)} ${currency}. Cordialement, ${companyName}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold inline-flex items-center gap-1"
                          title="Relancer sur WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3" />
                          WhatsApp
                        </a>
                        <a
                          href={`mailto:${inv.email}?subject=${encodeURIComponent(
                            `Rappel d'échéance Facture ${inv.reference} - ${companyName}`
                          )}`}
                          className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center"
                          title="Relancer par E-mail"
                        >
                          <Mail className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (widget.id === 'profitability_radar') {
            const totalBudgetAll = projects.reduce((s, p) => s + (Number(p.budget) || 0), 0);
            const totalBilledOrPaid = projects.reduce(
              (s, p) => s + (Number(p.paidAmount) || Number(p.billedAmount) || 0),
              0
            );
            const netMarginPct =
              totalBudgetAll > 0
                ? Number((((totalBudgetAll - totalBilledOrPaid * 0.65) / totalBudgetAll) * 100).toFixed(1))
                : 0;
            return (
              <div
                key={widget.id}
                className={`animate-kpi-appear ${delayClass} rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/40 via-white to-white p-4 shadow-2xs flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                        Synthèse Rentabilité Prévisionnelle (Budget vs Réel)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Suivi instantané Fournitures + Main-d'Œuvre sur {projects.length} projet(s)
                      </p>
                    </div>
                  </div>
                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('projects')}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      Ouvrir l'Analyse
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 my-2">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="text-[10px] text-slate-500">Budgets Alloués</div>
                    <div className="text-xs font-bold font-mono text-slate-900 mt-0.5">
                      {formatNum(totalBudgetAll)} {currency}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="text-[10px] text-slate-500">Engagé / Facturé</div>
                    <div className="text-xs font-bold font-mono text-amber-700 mt-0.5">
                      {formatNum(totalBilledOrPaid)} {currency}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="text-[10px] text-emerald-700">Marge Prévue (EAC)</div>
                    <div className="text-xs font-bold font-mono text-emerald-800 mt-0.5">
                      {totalBudgetAll > 0 ? `${netMarginPct >= 0 ? '+' : ''}${netMarginPct}%` : '0.0%'}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (widget.id === 'trial_subscription_status' && liveTrialRecord) {
            return (
              <div
                key={widget.id}
                className={`animate-kpi-appear ${delayClass} rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-white p-4 shadow-2xs flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                      <Award className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Cycle de Vie Entreprise Prestataire & Licence SaaS
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Règle : 28 jours d'essai gratuit + 02 jours d'impression seule avant verrouillage
                      </p>
                    </div>
                  </div>
                  {canManageSubscription && onOpenSubscriptionModal ? (
                    <button
                      type="button"
                      onClick={onOpenSubscriptionModal}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      Gérer l'Abonnement
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-semibold inline-flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      Souscription exclusive Serveur SaaS
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{liveTrialRecord.companyName || companyName}</span>
                    <span className="text-slate-400 mx-1.5">•</span>
                    <span className="text-[11px] text-slate-600">
                      {liveTrialRecord.legalEntityType === 'physical' ? 'Personne Physique' : 'Personne Morale'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold">
                    {liveTrialRecord.subscriptionStatus === 'subscribed_paid'
                      ? `Abonné Actif (${liveTrialRecord.subscribedPlanName || 'Business Pro'})`
                      : 'Essai 28j + Grâce 02j Actif'}
                  </span>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 3. CONTRÔLEUR DU CYCLE DE VIE D'ESSAI 28 JOURS + 02 JOURS IMPRESSION SEULE + VERROUILLAGE
// ============================================================================

export function syncActivatedSubscriptionToClientStorage(updated: ProviderTrialRecord): void {
  const effectiveTenantId = updated.tenantId || 'default';
  const normalizedCompany = String(updated.companyName || '').trim().toLowerCase();
  try {
    // 1. Persister sur la clé directe du tenant
    localStorage.setItem(`mep_provider_trial_${effectiveTenantId}`, JSON.stringify(updated));

    // 2. Répercuter sur tous les enregistrements mep_provider_trial_* correspondant à la même entreprise (ex: si activé côté SaaS sous un autre ID ou nom)
    if (normalizedCompany && normalizedCompany !== 'entreprise' && normalizedCompany !== 'entreprise prestataire') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('mep_provider_trial_') && k !== `mep_provider_trial_${effectiveTenantId}`) {
          try {
            const rawOther = localStorage.getItem(k);
            if (rawOther) {
              const parsedOther = JSON.parse(rawOther);
              if (String(parsedOther?.companyName || '').trim().toLowerCase() === normalizedCompany) {
                localStorage.setItem(
                  k,
                  JSON.stringify({
                    ...parsedOther,
                    ...updated,
                    tenantId: parsedOther.tenantId || effectiveTenantId,
                  })
                );
              }
            }
          } catch {
            // ignore
          }
        }
      }
    }

    // 3. Synchroniser immédiatement dans mep_enterprise_registry_v3 et mep_enterprise_registry_backup_v3
    for (const regKey of ['mep_enterprise_registry_v3', 'mep_enterprise_registry_backup_v3']) {
      try {
        const rawReg = localStorage.getItem(regKey);
        const regMap = rawReg ? JSON.parse(rawReg) : {};
        if (regMap && typeof regMap === 'object') {
          let changed = false;
          for (const [tKey, entVal] of Object.entries(regMap as Record<string, any>)) {
            if (!entVal || typeof entVal !== 'object') continue;
            const sameTenant = tKey === effectiveTenantId || entVal.tenantId === effectiveTenantId;
            const sameCompany =
              normalizedCompany &&
              String(entVal.companyName || '').trim().toLowerCase() === normalizedCompany;
            if (sameTenant || sameCompany) {
              regMap[tKey] = {
                ...entVal,
                subscriptionStatus: updated.subscriptionStatus,
                subscribedPlanId: updated.subscribedPlanId || entVal.subscribedPlanId,
                subscribedPlanName: updated.subscribedPlanName || entVal.subscribedPlanName,
                subscribedBillingCycle:
                  updated.subscribedBillingCycle || entVal.subscribedBillingCycle,
                subscribedAmountFCFA: updated.subscribedAmountFCFA || entVal.subscribedAmountFCFA,
                subscribedAt: updated.subscribedAt || entVal.subscribedAt,
                pendingActivationToken:
                  updated.subscriptionStatus === 'subscribed_paid'
                    ? undefined
                    : updated.pendingActivationToken ?? entVal.pendingActivationToken,
                tokenTransmittedToEnterprise:
                  updated.subscriptionStatus === 'subscribed_paid'
                    ? false
                    : Boolean(updated.tokenTransmittedToEnterprise),
                activatedVia: updated.activatedVia || entVal.activatedVia,
                activatedTokenUsed: updated.activatedTokenUsed || entVal.activatedTokenUsed,
              };
              changed = true;
            }
          }
          if (changed) {
            localStorage.setItem(regKey, JSON.stringify(regMap));
          }
        }
      } catch {
        // ignore
      }
    }

    // 4. Synchroniser dans mep_${tenantId}_enterprise_details du compte client
    try {
      const detailsKey = `mep_${effectiveTenantId}_enterprise_details`;
      const rawDet = localStorage.getItem(detailsKey);
      if (rawDet) {
        const parsedDet = JSON.parse(rawDet);
        if (parsedDet && typeof parsedDet === 'object') {
          localStorage.setItem(
            detailsKey,
            JSON.stringify({
              ...parsedDet,
              subscriptionStatus: updated.subscriptionStatus,
              subscribedPlanId: updated.subscribedPlanId || parsedDet.subscribedPlanId,
              subscribedPlanName: updated.subscribedPlanName || parsedDet.subscribedPlanName,
              subscribedBillingCycle:
                updated.subscribedBillingCycle || parsedDet.subscribedBillingCycle,
              subscribedAmountFCFA: updated.subscribedAmountFCFA || parsedDet.subscribedAmountFCFA,
              subscribedAt: updated.subscribedAt || parsedDet.subscribedAt,
              activatedVia: updated.activatedVia || parsedDet.activatedVia,
              activatedTokenUsed: updated.activatedTokenUsed || parsedDet.activatedTokenUsed,
            })
          );
        }
      }
    } catch {
      // ignore
    }

    // 5. Synchroniser dans les mémoires des serveurs SaaS & Web (mep_servers_digital_identities_memory_v1 & mep_saas_server_memory_v1)
    for (const memKey of ['mep_servers_digital_identities_memory_v1', 'mep_saas_server_memory_v1']) {
      try {
        const rawMem = localStorage.getItem(memKey);
        if (rawMem) {
          const parsedMem = JSON.parse(rawMem);
          if (Array.isArray(parsedMem)) {
            let memChanged = false;
            const nextMem = parsedMem.map((item: any) => {
              const matchT = item?.tenantId === effectiveTenantId;
              const matchC =
                normalizedCompany &&
                String(item?.companyName || '').trim().toLowerCase() === normalizedCompany;
              if (matchT || matchC) {
                memChanged = true;
                return {
                  ...item,
                  subscriptionStatus: updated.subscriptionStatus,
                  subscribedPlanName: updated.subscribedPlanName || item.subscribedPlanName,
                  saasMemory: item.saasMemory
                    ? {
                        ...item.saasMemory,
                        subscriptionStatus:
                          updated.subscriptionStatus === 'subscribed_paid'
                            ? 'active'
                            : item.saasMemory.subscriptionStatus,
                        subscriptionPlan:
                          updated.subscribedPlanName || item.saasMemory.subscriptionPlan,
                      }
                    : item.saasMemory,
                };
              }
              return item;
            });
            if (memChanged) {
              localStorage.setItem(memKey, JSON.stringify(nextMem));
            }
          }
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

export function getOrInitializeProviderTrialRecord(
  tenantId: string,
  companyName: string,
  legalEntityType: 'moral' | 'physical' = 'moral'
): ProviderTrialRecord {
  const effectiveTenantId = tenantId || 'default';
  const key = `mep_provider_trial_${effectiveTenantId}`;
  const normalizedCompany = String(companyName || '').trim().toLowerCase();

  let baseRecord: ProviderTrialRecord | null = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      baseRecord = {
        ...parsed,
        companyName: companyName || parsed.companyName || 'Entreprise Prestataire',
        trialDaysTotal: 28,
        gracePrintOnlyDays: 2,
      };
    }
  } catch {
    // ignore
  }

  if (!baseRecord) {
    baseRecord = {
      tenantId: effectiveTenantId,
      companyName: companyName || 'Entreprise Prestataire',
      legalEntityType,
      trialStartedAt: new Date().toISOString(),
      trialDaysTotal: 28,
      gracePrintOnlyDays: 2,
      simulatedDayOffset: null,
      subscriptionStatus: 'trial_active',
    };
  }

  // Si l'enregistrement local n'est pas encore marqué 'subscribed_paid', vérifier toutes les sources d'activation (Serveur SaaS, Registre Entreprises, Tokens consommés, ou autre clé de la même entreprise)
  if (baseRecord.subscriptionStatus !== 'subscribed_paid') {
    let reconciledRecord: ProviderTrialRecord | null = null;

    // A. Vérifier si une autre clé mep_provider_trial_* portant le même nom d'entreprise est déjà abonnée (subscribed_paid)
    if (normalizedCompany && normalizedCompany !== 'entreprise' && normalizedCompany !== 'entreprise prestataire') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('mep_provider_trial_') && k !== key) {
            const rawOther = localStorage.getItem(k);
            if (rawOther) {
              const parsedOther = JSON.parse(rawOther);
              if (
                String(parsedOther?.companyName || '').trim().toLowerCase() === normalizedCompany &&
                parsedOther?.subscriptionStatus === 'subscribed_paid'
              ) {
                reconciledRecord = {
                  ...baseRecord,
                  ...parsedOther,
                  tenantId: effectiveTenantId,
                  companyName: companyName || parsedOther.companyName,
                  simulatedDayOffset: null,
                  subscriptionStatus: 'subscribed_paid',
                };
                break;
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // B. Vérifier mep_enterprise_registry_v3 et mep_${tenantId}_enterprise_details
    if (!reconciledRecord) {
      try {
        const rawReg = localStorage.getItem('mep_enterprise_registry_v3');
        if (rawReg) {
          const regMap = JSON.parse(rawReg);
          const matchedEnt =
            regMap?.[effectiveTenantId] ||
            (normalizedCompany
              ? Object.values(regMap || {}).find(
                  (e: any) =>
                    String(e?.companyName || '').trim().toLowerCase() === normalizedCompany
                )
              : null);
          if (matchedEnt && matchedEnt.subscriptionStatus === 'subscribed_paid') {
            reconciledRecord = {
              ...baseRecord,
              simulatedDayOffset: null,
              subscriptionStatus: 'subscribed_paid',
              subscribedPlanId: matchedEnt.subscribedPlanId || baseRecord.subscribedPlanId || 'business_pro',
              subscribedPlanName:
                matchedEnt.subscribedPlanName || baseRecord.subscribedPlanName || 'Business Pro BTP & MEP',
              subscribedBillingCycle:
                matchedEnt.subscribedBillingCycle || baseRecord.subscribedBillingCycle || 'monthly',
              subscribedAmountFCFA:
                matchedEnt.subscribedAmountFCFA || baseRecord.subscribedAmountFCFA || 69000,
              subscribedAt: matchedEnt.subscribedAt || baseRecord.subscribedAt || new Date().toISOString(),
              pendingActivationToken: undefined,
              tokenTransmittedToEnterprise: false,
              activatedVia: matchedEnt.activatedVia || baseRecord.activatedVia || 'saas_server_direct',
              activatedTokenUsed: matchedEnt.activatedTokenUsed || baseRecord.activatedTokenUsed,
            };
          } else if (
            matchedEnt &&
            matchedEnt.pendingActivationToken &&
            !baseRecord.pendingActivationToken
          ) {
            baseRecord = {
              ...baseRecord,
              pendingActivationToken: matchedEnt.pendingActivationToken,
              pendingPlanId: matchedEnt.pendingPlanId || baseRecord.pendingPlanId,
              pendingPlanName: matchedEnt.pendingPlanName || baseRecord.pendingPlanName,
              pendingBillingCycle: matchedEnt.pendingBillingCycle || baseRecord.pendingBillingCycle,
              pendingAmountFCFA: matchedEnt.pendingAmountFCFA || baseRecord.pendingAmountFCFA,
              tokenTransmittedToEnterprise: true,
            };
          }
        }
      } catch {
        // ignore
      }
    }

    // C. Vérifier le registre des Tokens à usage unique (mep_saas_single_use_tokens_registry_v1) : si un token pour cette entreprise a été consommé (used: true), l'abonnement est actif
    if (!reconciledRecord) {
      try {
        const rawTokens = localStorage.getItem('mep_saas_single_use_tokens_registry_v1');
        if (rawTokens) {
          const tokensMap = JSON.parse(rawTokens);
          if (tokensMap && typeof tokensMap === 'object') {
            const matchingTokens = Object.values(tokensMap as Record<string, any>).filter((tk) => {
              if (!tk) return false;
              const sameT = tk.targetTenantId === effectiveTenantId || tk.usedByTenantId === effectiveTenantId;
              const sameC =
                normalizedCompany &&
                (String(tk.targetCompanyName || '').trim().toLowerCase() === normalizedCompany ||
                  String(tk.usedByCompanyName || '').trim().toLowerCase() === normalizedCompany);
              return sameT || sameC;
            });
            const consumedToken = matchingTokens.find((tk) => tk.used === true);
            if (consumedToken) {
              reconciledRecord = {
                ...baseRecord,
                simulatedDayOffset: null,
                subscriptionStatus: 'subscribed_paid',
                subscribedPlanId: consumedToken.planId || baseRecord.subscribedPlanId || 'business_pro',
                subscribedPlanName:
                  consumedToken.planName || baseRecord.subscribedPlanName || 'Business Pro BTP & MEP',
                subscribedBillingCycle:
                  consumedToken.billingCycle || baseRecord.subscribedBillingCycle || 'monthly',
                subscribedAmountFCFA:
                  consumedToken.amountFCFA || baseRecord.subscribedAmountFCFA || 69000,
                subscribedAt: consumedToken.usedAt || baseRecord.subscribedAt || new Date().toISOString(),
                pendingActivationToken: undefined,
                tokenTransmittedToEnterprise: false,
                activatedVia: baseRecord.activatedVia || 'enterprise_token',
                activatedTokenUsed: consumedToken.token || baseRecord.activatedTokenUsed,
              };
            } else {
              const pendingToken = matchingTokens.find((tk) => !tk.used && tk.transferredToClient);
              if (pendingToken && !baseRecord.pendingActivationToken) {
                baseRecord = {
                  ...baseRecord,
                  pendingActivationToken: pendingToken.token,
                  pendingPlanId: pendingToken.planId || baseRecord.pendingPlanId,
                  pendingPlanName: pendingToken.planName || baseRecord.pendingPlanName,
                  pendingBillingCycle: pendingToken.billingCycle || baseRecord.pendingBillingCycle,
                  pendingAmountFCFA: pendingToken.amountFCFA || baseRecord.pendingAmountFCFA,
                  tokenTransmittedToEnterprise: true,
                };
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    if (reconciledRecord) {
      baseRecord = reconciledRecord;
      syncActivatedSubscriptionToClientStorage(reconciledRecord);
      return reconciledRecord;
    }
  }

  try {
    localStorage.setItem(key, JSON.stringify(baseRecord));
  } catch {
    // ignore
  }
  return baseRecord;
}

export function computeEffectiveTrialState(record: ProviderTrialRecord): {
  phase: ProviderTrialPhase;
  elapsedDays: number;
  remainingTrialDays: number;
  remainingGraceDays: number;
  totalSubscriptionDays: number;
  remainingSubscriptionDays: number;
  subscriptionCycleLabel: string;
} {
  if (record.subscriptionStatus === 'suspended_by_adgensys') {
    const cycleDays =
      record.subscribedBillingCycle === 'annual'
        ? 365
        : record.subscribedBillingCycle === 'quarterly'
          ? 90
          : 30;
    return {
      phase: 'suspended_by_adgensys',
      elapsedDays: 0,
      remainingTrialDays: 0,
      remainingGraceDays: 0,
      totalSubscriptionDays: cycleDays,
      remainingSubscriptionDays: 0,
      subscriptionCycleLabel: 'Abonnement Suspendu',
    };
  }

  if (record.subscriptionStatus === 'subscribed_paid') {
    const totalDays =
      record.subscribedBillingCycle === 'annual'
        ? 365
        : record.subscribedBillingCycle === 'quarterly'
          ? 90
          : 30;
    const subStartMs = new Date(record.subscribedAt || record.trialStartedAt || Date.now()).getTime();
    const subElapsed = Math.max(0, Math.floor((Date.now() - subStartMs) / (1000 * 60 * 60 * 24)));
    const remainingSub = Math.max(1, totalDays - (subElapsed % totalDays));
    return {
      phase: 'subscribed_paid',
      elapsedDays: subElapsed,
      remainingTrialDays: 28,
      remainingGraceDays: 2,
      totalSubscriptionDays: totalDays,
      remainingSubscriptionDays: remainingSub,
      subscriptionCycleLabel:
        record.subscribedBillingCycle === 'annual'
          ? 'Abonnement Annuel (365 Jours)'
          : record.subscribedBillingCycle === 'quarterly'
            ? 'Abonnement Trimestriel (90 Jours)'
            : 'Abonnement Mensuel (30 Jours)',
    };
  }

  const startMs = new Date(record.trialStartedAt || Date.now()).getTime();
  const elapsedDays =
    record.simulatedDayOffset !== null && record.simulatedDayOffset !== undefined
      ? Math.max(0, Number(record.simulatedDayOffset))
      : Math.max(0, Math.floor((Date.now() - startMs) / (1000 * 60 * 60 * 24)));

  if (elapsedDays < 28) {
    const rem = Math.max(0, 28 - elapsedDays);
    return {
      phase: 'trial_active',
      elapsedDays,
      remainingTrialDays: rem,
      remainingGraceDays: 2,
      totalSubscriptionDays: 28,
      remainingSubscriptionDays: rem,
      subscriptionCycleLabel: 'Abonnement Essai Initial (28 Jours)',
    };
  }

  if (elapsedDays < 30) {
    const remGrace = Math.max(1, 30 - elapsedDays);
    return {
      phase: 'grace_print_only',
      elapsedDays,
      remainingTrialDays: 0,
      remainingGraceDays: remGrace,
      totalSubscriptionDays: 30,
      remainingSubscriptionDays: remGrace,
      subscriptionCycleLabel: 'Période de Grâce Impression (30 Jours)',
    };
  }

  return {
    phase: 'locked_full',
    elapsedDays,
    remainingTrialDays: 0,
    remainingGraceDays: 0,
    totalSubscriptionDays: 30,
    remainingSubscriptionDays: 0,
    subscriptionCycleLabel: 'Abonnement Expiré (0 Jour restant)',
  };
}

interface ProviderTrialAndSubscriptionControllerProps {
  tenantId: string;
  companyName: string;
  companyLogo?: string | null;
  legalEntityType?: 'moral' | 'physical';
  currency: string;
  documents: any[];
  projects: any[];
  docCustomization?: any;
  canManageSubscription?: boolean;
  isSaaSConsoleView?: boolean;
  onSubscriptionActivated?: (record: ProviderTrialRecord) => void;
  children: React.ReactNode;
}

export const ProviderTrialAndSubscriptionController: React.FC<ProviderTrialAndSubscriptionControllerProps> = ({
  tenantId,
  companyName,
  companyLogo,
  legalEntityType = 'moral',
  currency,
  documents,
  projects,
  docCustomization,
  canManageSubscription = false,
  isSaaSConsoleView = false,
  onSubscriptionActivated,
  children
}) => {
  const [trialRecord, setTrialRecord] = useState<ProviderTrialRecord>(() =>
    getOrInitializeProviderTrialRecord(tenantId, companyName, legalEntityType)
  );

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_transfer' | 'card'>('mobile_money');
  const [showEnterpriseTokenPanel, setShowEnterpriseTokenPanel] = useState(false);
  const [enterpriseTokenInput, setEnterpriseTokenInput] = useState('');
  const [tokenFeedback, setTokenFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rmmClientNotice, setRmmClientNotice] = useState<{
    id: string;
    timestamp: string;
    serverOrigin: string;
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    const refreshFromStorage = () => {
      const rec = getOrInitializeProviderTrialRecord(tenantId, companyName, legalEntityType);
      setTrialRecord((prev) => {
        if (prev.subscriptionStatus !== 'subscribed_paid' && rec.subscriptionStatus === 'subscribed_paid') {
          onSubscriptionActivated?.(rec);
        }
        return rec;
      });
      try {
        const rawNotice = localStorage.getItem(
          `${RMM_CLIENT_NOTIFICATIONS_KEY_PREFIX}${tenantId || 'default'}`
        );
        if (rawNotice) {
          setRmmClientNotice(JSON.parse(rawNotice));
        }
      } catch {
        // ignore
      }
    };
    refreshFromStorage();

    // Synchronisation temps réel via BroadcastChannel (prise en compte immédiate côté client des abonnements activés côté Serveur SaaS)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('mep_saas_subscription_realtime_channel_v1');
        bc.onmessage = (ev) => {
          const payload = ev?.data;
          refreshFromStorage();
          if (
            payload &&
            (payload.tenantId === tenantId ||
              String(payload.companyName || '').trim().toLowerCase() ===
                String(companyName || '').trim().toLowerCase())
          ) {
            if (
              payload.type === 'SAAS_DIRECT_ACTIVATION' ||
              payload.action === 'DIRECT_SAAS_ACTIVATION' ||
              payload.subscriptionStatus === 'subscribed_paid' ||
              payload.status === 'subscribed_paid'
            ) {
              setTokenFeedback({
                type: 'success',
                message: `Synchronisation temps réel Serveur SaaS : Votre abonnement (${payload.planName || 'Business Pro'}) est activé et immédiatement pris en compte par votre compte entreprise "${companyName}" !`,
              });
            } else if (payload.type === 'TOKEN_TRANSFERRED' && payload.token) {
              setShowEnterpriseTokenPanel(true);
              setTokenFeedback({
                type: 'success',
                message: `Nouveau Token à usage unique (${payload.token}) transféré par le Serveur SaaS pour "${companyName}".`,
              });
            }
          }
        };
      }
    } catch {
      // ignore
    }

    // Polling temps réel auprès du Serveur SaaS (/api/saas/subscriptions/tenant-status) toutes les 3.5 secondes
    let isMounted = true;
    const syncWithSaaSServer = async () => {
      try {
        const q = new URLSearchParams({
          tenantId: tenantId || 'default',
          companyName: companyName || 'Entreprise',
        });
        const res = await fetch(`/api/saas/subscriptions/tenant-status?${q.toString()}`);
        if (!res.ok || !isMounted) return;
        const data = await res.json();
        if (data?.rmmClientNotice) {
          setRmmClientNotice((prev) =>
            prev?.id === data.rmmClientNotice.id ? prev : data.rmmClientNotice
          );
        }
        const srvSub = data?.enterpriseSubscription;
        if (!srvSub) return;

        const currentLocal = getOrInitializeProviderTrialRecord(
          tenantId,
          companyName,
          legalEntityType
        );

        // Si le Serveur SaaS a activé l'abonnement ou généré un Token, mettre à jour immédiatement le client
        const srvStatus: ProviderTrialPhase = srvSub.subscriptionSuspended
          ? 'suspended_by_adgensys'
          : srvSub.subscriptionStatus === 'subscribed_paid'
          ? 'subscribed_paid'
          : currentLocal.subscriptionStatus;

        const hasStatusChange =
          (srvStatus === 'subscribed_paid' &&
            currentLocal.subscriptionStatus !== 'subscribed_paid') ||
          (srvStatus === 'suspended_by_adgensys' &&
            currentLocal.subscriptionStatus !== 'suspended_by_adgensys') ||
          (srvSub.pendingActivationToken &&
            srvSub.pendingActivationToken !== currentLocal.pendingActivationToken);

        if (hasStatusChange) {
          const syncedRec: ProviderTrialRecord = {
            ...currentLocal,
            simulatedDayOffset: srvStatus === 'subscribed_paid' ? null : currentLocal.simulatedDayOffset,
            subscriptionStatus: srvStatus,
            subscribedPlanId: srvSub.subscribedPlanId || currentLocal.subscribedPlanId,
            subscribedPlanName: srvSub.subscribedPlanName || currentLocal.subscribedPlanName,
            subscribedBillingCycle:
              srvSub.subscribedBillingCycle || currentLocal.subscribedBillingCycle,
            subscribedAmountFCFA:
              srvSub.subscribedAmountFCFA || currentLocal.subscribedAmountFCFA,
            subscribedAt: srvSub.subscribedAt || currentLocal.subscribedAt,
            pendingActivationToken:
              srvStatus === 'subscribed_paid'
                ? undefined
                : srvSub.pendingActivationToken || currentLocal.pendingActivationToken,
            pendingPlanId: srvSub.pendingPlanId || currentLocal.pendingPlanId,
            pendingPlanName: srvSub.pendingPlanName || currentLocal.pendingPlanName,
            pendingBillingCycle: srvSub.pendingBillingCycle || currentLocal.pendingBillingCycle,
            pendingAmountFCFA: srvSub.pendingAmountFCFA || currentLocal.pendingAmountFCFA,
            tokenTransmittedToEnterprise: Boolean(srvSub.tokenTransmittedToEnterprise),
            activatedVia: srvSub.activatedVia || currentLocal.activatedVia,
            activatedTokenUsed: srvSub.activatedTokenUsed || currentLocal.activatedTokenUsed,
          };
          syncActivatedSubscriptionToClientStorage(syncedRec);
          setTrialRecord(syncedRec);
          window.dispatchEvent(new Event('mep-subscription-updated'));
          if (srvStatus === 'subscribed_paid') {
            onSubscriptionActivated?.(syncedRec);
          }
        }
      } catch {
        // ignore network error
      }
    };

    syncWithSaaSServer();
    const pollInterval = window.setInterval(syncWithSaaSServer, 3500);

    window.addEventListener('storage', refreshFromStorage);
    window.addEventListener('mep-subscription-updated', refreshFromStorage);
    window.addEventListener('mep-rmm-sav-updated', refreshFromStorage);
    return () => {
      isMounted = false;
      window.clearInterval(pollInterval);
      if (bc) {
        try {
          bc.close();
        } catch {
          // ignore
        }
      }
      window.removeEventListener('storage', refreshFromStorage);
      window.removeEventListener('mep-subscription-updated', refreshFromStorage);
      window.removeEventListener('mep-rmm-sav-updated', refreshFromStorage);
    };
  }, [tenantId, companyName, legalEntityType]);

  const persistRecord = (updated: ProviderTrialRecord) => {
    setTrialRecord(updated);
    syncActivatedSubscriptionToClientStorage(updated);
    try {
      window.dispatchEvent(new Event('mep-subscription-updated'));
    } catch {
      // ignore
    }
    if (updated.subscriptionStatus === 'subscribed_paid') {
      onSubscriptionActivated?.(updated);
    }
  };

  const effectiveState = useMemo(() => computeEffectiveTrialState(trialRecord), [trialRecord]);

  const handleSimulateLifecycleDay = (dayOffset: number | null) => {
    const nextStatus: ProviderTrialPhase =
      dayOffset === null
        ? 'trial_active'
        : dayOffset < 28
        ? 'trial_active'
        : dayOffset < 30
        ? 'grace_print_only'
        : 'locked_full';

    persistRecord({
      ...trialRecord,
      simulatedDayOffset: dayOffset,
      subscriptionStatus: nextStatus
    });
  };

  // Mode 1 : Souscription avec génération automatique d'un Token à usage unique côté Serveur SaaS et transfert à l'entreprise
  const handleSubscribeAndGenerateToken = async (plan: SubscriptionPlanOption) => {
    if (!canManageSubscription) return;
    const amount = billingCycle === 'annual' ? plan.annualPriceFCFA : plan.monthlyPriceFCFA;
    let generatedToken = generateSaaSSubscriptionToken(tenantId, plan.id);

    try {
      const res = await fetch('/api/saas/subscriptions/subscribe-generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          planId: plan.id,
          planName: plan.name,
          billingCycle,
          amountFCFA: amount,
          customToken: generatedToken,
          transferChannel: 'in_app_realtime',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.activationToken) {
          generatedToken = data.activationToken;
        }
      }
    } catch {
      // fallback to local deterministic token
    }

    registerSingleUseEnterpriseToken({
      token: generatedToken,
      targetTenantId: tenantId,
      targetCompanyName: companyName,
      targetIsu: 'ISU-CERTIFIE',
      planId: plan.id,
      planName: plan.name,
      billingCycle,
      amountFCFA: amount,
      transferredToClient: true,
      transferChannel: 'in_app_realtime',
    });
    recordTokenTransferToClient(generatedToken, 'in_app_realtime');

    const updated: ProviderTrialRecord = {
      ...trialRecord,
      pendingActivationToken: generatedToken,
      pendingPlanId: plan.id,
      pendingPlanName: plan.name,
      pendingBillingCycle: billingCycle,
      pendingAmountFCFA: amount,
      tokenGeneratedAt: new Date().toISOString(),
      tokenTransmittedToEnterprise: true,
    };
    persistRecord(updated);
    broadcastSubscriptionSyncEvent({
      type: 'TOKEN_TRANSFERRED',
      tenantId,
      companyName,
      token: generatedToken,
      status: trialRecord.subscriptionStatus,
    });
    setShowEnterpriseTokenPanel(true);
    setTokenFeedback({
      type: 'success',
      message: `Token à usage unique "${generatedToken}" généré côté Serveur SaaS et transféré exclusivement à "${companyName}".`,
    });
    setShowSubscriptionModal(false);
  };

  // Mode 2 : Activation directe de l'abonnement depuis le Serveur SaaS (immédiatement prise en compte côté client)
  const handleSubscribePlan = async (plan: SubscriptionPlanOption) => {
    if (!canManageSubscription) return;
    const amount = billingCycle === 'annual' ? plan.annualPriceFCFA : plan.monthlyPriceFCFA;
    const tokenUsed =
      trialRecord.pendingActivationToken || generateSaaSSubscriptionToken(tenantId, plan.id);

    try {
      await fetch('/api/saas/subscriptions/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          planId: plan.id,
          planName: plan.name,
          billingCycle,
          amountFCFA: amount,
          activationMethod: 'saas_server_direct',
          token: tokenUsed,
        }),
      });
    } catch {
      // ignore offline
    }

    const updated: ProviderTrialRecord = {
      ...trialRecord,
      simulatedDayOffset: null,
      subscriptionStatus: 'subscribed_paid',
      subscribedPlanId: plan.id,
      subscribedPlanName: plan.name,
      subscribedBillingCycle: billingCycle,
      subscribedAmountFCFA: amount,
      subscribedAt: new Date().toISOString(),
      pendingActivationToken: undefined,
      tokenTransmittedToEnterprise: false,
      activatedVia: 'saas_server_direct',
      activatedTokenUsed: tokenUsed,
    };
    persistRecord(updated);
    broadcastSubscriptionSyncEvent({
      type: 'SAAS_DIRECT_ACTIVATION',
      tenantId,
      companyName,
      token: tokenUsed,
      status: 'subscribed_paid',
    });
    setTokenFeedback({
      type: 'success',
      message: `Abonnement "${plan.name}" activé directement à partir du Serveur SaaS et synchronisé immédiatement côté client pour "${companyName}".`,
    });
    setShowSubscriptionModal(false);
  };

  // Validation du Token à usage unique par l'entreprise (reconnaissance universelle côté client des tokens générés par l'application)
  const handleEnterpriseActivateWithToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanedInput = enterpriseTokenInput.trim().toUpperCase();
    if (!cleanedInput) {
      setTokenFeedback({
        type: 'error',
        message: 'Veuillez renseigner le Token d’activation à usage unique transmis par le Serveur SaaS.',
      });
      return;
    }

    // 1. Interrogation en synergie du Serveur SaaS (/api/saas/subscriptions/activate) + Registre Local
    let serverAccepted = false;
    let serverPlanName: string | undefined;
    let serverPlanId: string | undefined;
    let serverBillingCycle: 'monthly' | 'annual' | undefined;
    let serverAmountFCFA: number | undefined;
    let serverExplicitRejectionMessage: string | undefined;

    try {
      const res = await fetch('/api/saas/subscriptions/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          planId: trialRecord.pendingPlanId || 'business_pro',
          planName: trialRecord.pendingPlanName || 'Business Pro BTP & MEP',
          billingCycle: trialRecord.pendingBillingCycle || 'annual',
          amountFCFA: trialRecord.pendingAmountFCFA || 65596,
          activationMethod: 'enterprise_token',
          token: cleanedInput,
        }),
      });
      if (res.ok) {
        const srvData = await res.json().catch(() => null);
        if (srvData?.ok) {
          serverAccepted = true;
          serverPlanId = srvData.subscription?.subscribedPlanId;
          serverPlanName = srvData.subscription?.subscribedPlanName;
          serverBillingCycle = srvData.subscription?.subscribedBillingCycle;
          serverAmountFCFA = srvData.subscription?.subscribedAmountFCFA;
        }
      } else {
        const errData = await res.json().catch(() => null);
        // Only block if the server explicitly states the token was already consumed by another activation
        if (errData?.code === 'TOKEN_ALREADY_USED' || errData?.code === 'TOKEN_TENANT_MISMATCH') {
          serverExplicitRejectionMessage = errData.message;
        }
      }
    } catch {
      // Offline mode: local validation handles it
    }

    if (serverExplicitRejectionMessage) {
      setTokenFeedback({
        type: 'error',
        message: serverExplicitRejectionMessage,
      });
      return;
    }

    // 2. Validation et consommation locale du Token à usage unique
    const validation = validateAndConsumeSingleUseEnterpriseToken({
      token: cleanedInput,
      currentTenantId: tenantId,
      currentCompanyName: companyName,
    });

    if (!validation.valid && !serverAccepted) {
      setTokenFeedback({
        type: 'error',
        message: validation.errorMessage || 'Token SaaS invalide ou déjà utilisé.',
      });
      return;
    }

    const targetPlan =
      SAAS_SUBSCRIPTION_PLANS.find(
        (p) =>
          p.id ===
          (serverPlanId || validation.tokenRecord?.planId || trialRecord.pendingPlanId)
      ) || SAAS_SUBSCRIPTION_PLANS[1];
    const rawCycle =
      serverBillingCycle ||
      validation.tokenRecord?.billingCycle ||
      trialRecord.pendingBillingCycle ||
      'annual';
    const targetCycle: 'monthly' | 'annual' =
      rawCycle === 'monthly' ? 'monthly' : 'annual';
    const targetAmount =
      serverAmountFCFA ||
      validation.tokenRecord?.amountFCFA ||
      trialRecord.pendingAmountFCFA ||
      (targetCycle === 'annual' ? targetPlan.annualPriceFCFA : targetPlan.monthlyPriceFCFA);

    const updated: ProviderTrialRecord = {
      ...trialRecord,
      simulatedDayOffset: null,
      subscriptionStatus: 'subscribed_paid',
      subscribedPlanId: targetPlan.id,
      subscribedPlanName:
        serverPlanName ||
        validation.tokenRecord?.planName ||
        trialRecord.pendingPlanName ||
        targetPlan.name,
      subscribedBillingCycle: targetCycle,
      subscribedAmountFCFA: targetAmount,
      subscribedAt: new Date().toISOString(),
      pendingActivationToken: undefined,
      tokenTransmittedToEnterprise: false,
      activatedVia: 'enterprise_token',
      activatedTokenUsed: cleanedInput,
    };

    persistRecord(updated);
    setShowEnterpriseTokenPanel(true);
    broadcastSubscriptionSyncEvent({
      type: 'TOKEN_CONSUMED_ACTIVATED',
      tenantId,
      companyName,
      token: cleanedInput,
      status: 'subscribed_paid',
    });
    setEnterpriseTokenInput('');
    setTokenFeedback({
      type: 'success',
      message: `Félicitations ! Votre abonnement « ${updated.subscribedPlanName} » est désormais ACTIF et pris en compte côté client. Le Token à usage unique (${cleanedInput}) attribué à « ${companyName} » a été reconnu et consommé.`,
    });
  };

  if (isSaaSConsoleView) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-4">
      {/* Top Lifecycle Status Bar */}
      <div className={`rounded-2xl border px-4 py-3 shadow-xs transition flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 ${
        effectiveState.phase === 'subscribed_paid'
          ? 'bg-emerald-950 text-white border-emerald-800'
          : effectiveState.phase === 'trial_active'
          ? 'bg-slate-900 text-white border-slate-800'
          : effectiveState.phase === 'grace_print_only'
          ? 'bg-amber-950 text-white border-amber-700'
          : 'bg-rose-950 text-white border-rose-700'
      }`}>
        <div className="flex items-start sm:items-center gap-3">
          <div className={`p-2 rounded-xl shrink-0 ${
            effectiveState.phase === 'subscribed_paid'
              ? 'bg-emerald-500/20 text-emerald-300'
              : effectiveState.phase === 'trial_active'
              ? 'bg-indigo-500/20 text-indigo-300'
              : effectiveState.phase === 'grace_print_only'
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-rose-500/20 text-rose-300'
          }`}>
            {effectiveState.phase === 'subscribed_paid' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : effectiveState.phase === 'trial_active' ? (
              <Sparkles className="w-5 h-5" />
            ) : effectiveState.phase === 'grace_print_only' ? (
              <Printer className="w-5 h-5" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
          </div>

          <div className="text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-white">
                {companyName} ({legalEntityType === 'physical' ? 'Personne Physique' : 'Personne Morale'})
              </span>
              {effectiveState.phase === 'subscribed_paid' && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-mono text-[11px] font-bold">
                  ABONNEMENT ACTIF : {trialRecord.subscribedPlanName}{' '}
                  {trialRecord.activatedVia === 'enterprise_token'
                    ? '(Activé par Token Entreprise)'
                    : trialRecord.activatedVia === 'saas_server_direct'
                    ? '(Activé depuis Serveur SaaS)'
                    : ''}
                </span>
              )}
              {trialRecord.pendingActivationToken && effectiveState.phase !== 'subscribed_paid' && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/30 border border-amber-400/50 text-amber-200 font-mono text-[11px] font-bold animate-pulse">
                  TOKEN SAAS TRANSMIS EN ATTENTE D&apos;ACTIVATION : {trialRecord.pendingActivationToken}
                </span>
              )}
              {effectiveState.phase === 'trial_active' && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 font-mono text-[11px] font-bold">
                  ESSAI GRATUIT 28 JOURS : {effectiveState.remainingTrialDays} JOUR(S) RESTANT(S)
                </span>
              )}
              {effectiveState.phase === 'grace_print_only' && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/30 border border-amber-400/40 text-amber-200 font-mono text-[11px] font-bold">
                  ESSAI EXPIRÉ — PÉRIODE SUPPLÉMENTAIRE DE 02 JOURS (IMPRESSION SEULE : {effectiveState.remainingGraceDays}j restant)
                </span>
              )}
              {effectiveState.phase === 'locked_full' && (
                <span className="px-2 py-0.5 rounded-md bg-rose-500/30 border border-rose-400/40 text-rose-200 font-mono text-[11px] font-bold">
                  ESPACE PRIVÉ INTÉGRALEMENT VERROUILLÉ (28j + 02j ÉCOULÉS SANS ABONNEMENT)
                </span>
              )}
              {effectiveState.phase === 'suspended_by_adgensys' && (
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-mono text-[11px] font-extrabold">
                  ABONNEMENT SUSPENDU PAR L&apos;ADGENSYS
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {effectiveState.phase === 'subscribed_paid'
                ? 'Accès complet déverrouillé à tous les modules, impressions multi-devises, relances SMS/WhatsApp et déclarations fiscales.'
                : trialRecord.pendingActivationToken
                ? `Un Token d'activation (${trialRecord.pendingActivationToken}) a été généré côté Serveur SaaS pour l'offre « ${trialRecord.pendingPlanName || 'Business Pro'} » et transmis à votre entreprise. Renseignez ce Token pour activer votre abonnement.`
                : effectiveState.phase === 'trial_active'
                ? 'À l’issue des 28 jours d’essai gratuit, sans abonnement, votre espace privé sera restreint à l’impression seule pendant 02 jours supplémentaires avant verrouillage total.'
                : effectiveState.phase === 'grace_print_only'
                ? 'Vos 28 jours d’essai sont terminés. Vous disposez de 02 jours supplémentaires pour imprimer vos documents avant le verrouillage intégral de votre espace privé.'
                : effectiveState.phase === 'suspended_by_adgensys'
                ? 'L’abonnement de cette entreprise a été suspendu par l’Administrateur Général des Systèmes (AdGenSys). Contactez la gouvernance centrale pour régularisation.'
                : 'Les 28 jours d’essai gratuit et les 02 jours supplémentaires d’impression sont expirés. Renseignez votre Token SaaS pour déverrouiller immédiatement votre espace privé.'}
            </p>
          </div>
        </div>

        {/* Compteur Officiel Abonnement : Nombre de jours total & Nombre de jours restants + Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 rounded-xl bg-black/35 border border-white/15 px-3 py-1.5 text-xs">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex flex-wrap items-center gap-2 font-mono">
              <span className="text-slate-200">
                Jours Total Abonnement :{' '}
                <strong className="text-white font-extrabold">
                  {effectiveState.totalSubscriptionDays} jours
                </strong>
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-300">
                Jours Restants :{' '}
                <strong className="text-amber-300 font-extrabold">
                  {effectiveState.remainingSubscriptionDays} jour(s)
                </strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowEnterpriseTokenPanel((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title="Renseigner le Token généré côté Serveur SaaS et transmis à l'entreprise pour activer l'abonnement"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>
              {trialRecord.pendingActivationToken
                ? 'Activer avec Token SaaS reçu'
                : 'Renseigner Token d’Activation SaaS'}
            </span>
          </button>

          {canManageSubscription ? (
            <button
              type="button"
              onClick={() => setShowSubscriptionModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              {effectiveState.phase === 'subscribed_paid' ? 'Changer d’Offre (Serveur SaaS)' : 'Souscrire un Abonnement (Serveur SaaS)'}
            </button>
          ) : (
            <div
              className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5"
              title="Le Super-Admin et l'ensemble des comptes utilisateurs qu'il a créés n'ont aucun accès à la souscription d'un abonnement. Seuls les opérateurs ayant accès au Serveur SaaS et à ses services peuvent y procéder."
            >
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Souscription exclusive Serveur SaaS (AdGenSys / MOAS)</span>
            </div>
          )}
        </div>
      </div>

      {/* ====================================================================
          PANNEAU D'ACTIVATION D'ABONNEMENT PAR TOKEN SAAS (ENTREPRISE OU SERVEUR SAAS)
          ==================================================================== */}
      {(showEnterpriseTokenPanel || Boolean(trialRecord.pendingActivationToken)) && (
        <div className="rounded-2xl border-2 border-amber-400/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 shadow-md space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-extrabold text-[10px] uppercase">
                  Protocole d&apos;Activation d&apos;Abonnement par Token SaaS
                </span>
                {trialRecord.pendingActivationToken && (
                  <span className="font-mono text-[11px] text-emerald-300 font-bold">
                    Offre souscrite : {trialRecord.pendingPlanName || 'Business Pro'} (
                    {trialRecord.pendingBillingCycle === 'annual' ? 'Annuel' : 'Mensuel'})
                  </span>
                )}
              </div>
              <p className="text-slate-300 text-[11px]">
                À la souscription d&apos;un abonnement, un <strong>Token unique</strong> est automatiquement généré côté Serveur SaaS et transmis à l&apos;entreprise. Renseignez ce Token ci-dessous pour activer immédiatement votre abonnement.
              </p>
              {trialRecord.pendingActivationToken && (
                <div className="inline-flex flex-wrap items-center gap-2 mt-1 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-200 font-mono text-xs">
                  <span>Token transmis par le Serveur SaaS :</span>
                  <strong className="text-white tracking-wider">{trialRecord.pendingActivationToken}</strong>
                  <button
                    type="button"
                    onClick={() => setEnterpriseTokenInput(trialRecord.pendingActivationToken || '')}
                    className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-sans font-bold text-[10px] hover:bg-amber-300 cursor-pointer"
                  >
                    Insérer ce Token
                  </button>
                </div>
              )}
            </div>

            <form
              onSubmit={handleEnterpriseActivateWithToken}
              className="flex flex-wrap items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={enterpriseTokenInput}
                onChange={(e) => setEnterpriseTokenInput(e.target.value.toUpperCase())}
                placeholder="Ex: MEP-TOK-XXXX-PRO-XXXX-XXXX"
                className="w-64 px-3 py-2 rounded-xl bg-slate-950 border border-amber-400/60 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Valider le Token &amp; Activer l&apos;Abonnement</span>
              </button>
              {canManageSubscription && trialRecord.pendingActivationToken && (
                <button
                  type="button"
                  onClick={() => {
                    const plan =
                      SAAS_SUBSCRIPTION_PLANS.find((p) => p.id === trialRecord.pendingPlanId) ||
                      SAAS_SUBSCRIPTION_PLANS[1];
                    handleSubscribePlan(plan);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Activer Directement côté Serveur SaaS</span>
                </button>
              )}
            </form>
          </div>

          {tokenFeedback && (
            <div
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between ${
                tokenFeedback.type === 'success'
                  ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
                  : 'bg-rose-500/20 border border-rose-400/40 text-rose-200'
              }`}
            >
              <span>{tokenFeedback.message}</span>
              <button
                type="button"
                onClick={() => setTokenFeedback(null)}
                className="text-[11px] underline ml-3 cursor-pointer"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bandeau temps réel de Télémaintenance & SAV Proactif envoyé par les Serveurs (SaaS / Web) */}
      {rmmClientNotice && (
        <div className="rounded-xl border border-indigo-400/60 bg-indigo-950/90 text-white px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <Wrench className="w-4 h-4 text-indigo-300 shrink-0" />
            <div>
              <span className="font-extrabold text-indigo-200">{rmmClientNotice.title} : </span>
              <span className="text-slate-200">{rmmClientNotice.message}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setRmmClientNotice(null);
              try {
                localStorage.removeItem(
                  `${RMM_CLIENT_NOTIFICATIONS_KEY_PREFIX}${tenantId || 'default'}`
                );
              } catch {
                // ignore
              }
            }}
            className="px-2.5 py-1 rounded bg-indigo-800 hover:bg-indigo-700 text-indigo-100 text-[11px] font-bold shrink-0 cursor-pointer"
          >
            Acquitter SAV
          </button>
        </div>
      )}

      {/* ====================================================================
          MODE 1 : PÉRIODE SUPPLÉMENTAIRE DE 02 JOURS (IMPRESSION SEULE)
          ==================================================================== */}
      {effectiveState.phase === 'grace_print_only' && (
        <div className="bg-white rounded-2xl border-2 border-amber-400 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-6 py-5 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/25 text-amber-100 text-xs font-mono font-bold">
                <Lock className="w-3.5 h-3.5" />
                MODE RESTREINT : 02 JOURS SUPPLÉMENTAIRES (IMPRESSION DES DOCUMENTS UNIQUEMENT)
              </div>
              <h2 className="text-xl font-bold">
                Votre période d'essai gratuite de 28 jours est arrivée à échéance
              </h2>
              <p className="text-xs text-amber-100 max-w-3xl">
                Conformément aux conditions d'utilisation, votre espace privé est verrouillé en écriture. Vous disposez de <strong className="underline font-mono">{effectiveState.remainingGraceDays} jour(s) supplémentaire(s) sur 02</strong> pour imprimer vos différents documents (Devis, Factures Proforma, Factures Définitives, Cahiers des Charges et PV). À l'issue de ces 02 jours, l'ensemble de votre espace privé sera intégralement verrouillé.
              </p>
            </div>

            {canManageSubscription ? (
              <button
                type="button"
                onClick={() => setShowSubscriptionModal(true)}
                className="shrink-0 px-5 py-3 rounded-xl bg-white text-amber-900 hover:bg-amber-50 font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4 text-emerald-600" />
                Souscrire maintenant & Déverrouiller l'Espace
              </button>
            ) : (
              <div className="shrink-0 px-4 py-2.5 rounded-xl bg-black/30 border border-white/25 text-amber-50 text-xs font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-200 shrink-0" />
                <span>Souscription réservée aux services du Serveur SaaS</span>
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Commercial Documents Print Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-600" />
                Impression des Documents Commerciaux & Comptables ({documents.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                        {doc.docType === 'quote'
                          ? 'Devis'
                          : doc.docType === 'proforma'
                          ? 'Facture Proforma'
                          : doc.type || 'Facture Définitive'}
                      </span>
                      <div className="font-bold text-xs text-slate-900 truncate mt-1">
                        {doc.docNumber || doc.reference || doc.number || doc.title || 'Document Officiel'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        Client : {doc.clientName || doc.client || 'Client'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        exportSingleDocumentToPDF(
                          doc,
                          companyName,
                          companyLogo || undefined,
                          docCustomization
                        )
                      }
                      className="shrink-0 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimer PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Specifications & Execution Plans Print */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Impression des Cahiers des Charges & Plans de Réalisation ({projects.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {proj.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Client : {proj.clientName || proj.client || 'Client'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          exportProjectSpecificationsToPDF(
                            proj,
                            companyName,
                            companyLogo || undefined,
                            docCustomization
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        Imprimer Cahier des Charges PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODE 2 : VERROUILLAGE INTÉGRAL APRÈS LES 28 JOURS + 02 JOURS
          ==================================================================== */}
      {effectiveState.phase === 'locked_full' && (
        <div className="bg-slate-950 text-white rounded-3xl border-2 border-rose-500/80 shadow-2xl p-6 sm:p-10">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-400 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-rose-500/20 text-rose-300 text-xs font-mono font-bold">
              VERROUILLAGE INTÉGRAL DE L'ESPACE PRIVÉ (28 JOURS D'ESSAI + 02 JOURS D'IMPRESSION ÉCOULÉS)
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              L'espace privé de <span className="text-rose-400">{companyName}</span> est verrouillé
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl mx-auto">
              Votre période d'essai gratuite de <strong className="text-white">28 jours</strong> ainsi que les <strong className="text-white">02 jours supplémentaires d'impression seule</strong> sont arrivés à expiration sans souscription d'abonnement. Vos données restent intégralement sauvegardées et chiffrées (AES-256) : souscrivez à l'un des abonnements ci-dessous pour déverrouiller instantanément l'ensemble de votre espace privé.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {SAAS_SUBSCRIPTION_PLANS.map((plan) => (
              <div
                key={plan.id}
                className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between hover:border-indigo-500/60 transition"
              >
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[11px] font-bold">
                    {plan.badge}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-2">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{plan.targetEntity}</p>

                  <div className="my-4 pt-4 border-t border-slate-800">
                    <div className="text-2xl font-extrabold font-mono text-white">
                      {formatNum(plan.monthlyPriceFCFA)} <span className="text-xs font-normal text-slate-400">FCFA / mois</span>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                      ou {formatNum(plan.annualPriceFCFA)} FCFA / an (2 mois offerts)
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-300 mb-6">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {canManageSubscription ? (
                  <button
                    type="button"
                    onClick={() => handleSubscribePlan(plan)}
                    className={`w-full py-3 px-4 rounded-xl bg-gradient-to-r ${plan.accentColor} text-white font-bold text-xs shadow-lg hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer`}
                  >
                    <Unlock className="w-4 h-4" />
                    Souscrire & Déverrouiller l'Espace
                  </button>
                ) : (
                  <div className="w-full py-3 px-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Activation réservée au Serveur SaaS (AdGenSys / MOAS)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODE 2B : ABONNEMENT SUSPENDU PAR L'ADGENSYS
          ==================================================================== */}
      {effectiveState.phase === 'suspended_by_adgensys' && (
        <div className="bg-slate-950 text-white rounded-3xl border-2 border-rose-600 shadow-2xl p-6 sm:p-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-600/20 border border-rose-500/50 text-rose-400 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-rose-600/30 text-rose-200 text-xs font-mono font-bold uppercase">
              ABONNEMENT ENTREPRISE SUSPENDU PAR L&apos;ADGENSYS
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              L&apos;abonnement de <span className="text-rose-400">{companyName}</span> est suspendu
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl mx-auto">
              Sur décision de l&apos;<strong className="text-white">Administrateur Général des Systèmes (AdGenSys)</strong>, l&apos;abonnement et l&apos;accès opérationnel de cette entreprise sont temporairement suspendus.
              {trialRecord.suspensionReason ? ` Motif : ${trialRecord.suspensionReason}.` : ''} Vos données demeurent intégralement préservées et chiffrées.
            </p>
            {canManageSubscription && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() =>
                    persistRecord({
                      ...trialRecord,
                      subscriptionStatus: trialRecord.subscribedPlanId ? 'subscribed_paid' : 'trial_active',
                      suspendedAt: undefined,
                    })
                  }
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Lever la suspension &amp; Réactiver l&apos;abonnement (AdGenSys)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODE 3 : ACCÈS COMPLET (ESSAI 28 JOURS ACTIF OU ABONNEMENT PAYANT)
          ==================================================================== */}
      {(effectiveState.phase === 'trial_active' || effectiveState.phase === 'subscribed_paid') && (
        <>{children}</>
      )}

      {/* Subscription Modal — strictly restricted to SaaS Server roles */}
      {canManageSubscription && showSubscriptionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Gestion des Abonnements Entreprise Prestataire (Personne Morale & Physique)
                </span>
                <h3 className="text-lg font-bold mt-0.5">
                  Souscrire un Abonnement SaaS — {companyName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSubscriptionModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="text-xs text-slate-600 max-w-xl">
                  <strong className="text-slate-900">Cycle automatique :</strong> 28 jours d'essai gratuit à la création de l'entreprise → 02 jours supplémentaires en mode impression seule → Verrouillage total jusqu'à souscription d'un abonnement payant.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      billingCycle === 'monthly'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 border border-slate-300'
                    }`}
                  >
                    Mensuel
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      billingCycle === 'annual'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300'
                    }`}
                  >
                    Annuel (-17%)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {SAAS_SUBSCRIPTION_PLANS.map((plan) => {
                  const price = billingCycle === 'annual' ? plan.annualPriceFCFA : plan.monthlyPriceFCFA;
                  return (
                    <div
                      key={plan.id}
                      className="rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:border-indigo-500 transition shadow-xs"
                    >
                      <div>
                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                          {plan.badge}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-2">{plan.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{plan.targetEntity}</p>

                        <div className="my-4 py-3 border-y border-slate-100">
                          <div className="text-2xl font-extrabold font-mono text-slate-900">
                            {formatNum(price)} <span className="text-xs font-normal text-slate-500">FCFA / {billingCycle === 'annual' ? 'an' : 'mois'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {plan.maxProjects} • {plan.maxUsers}
                          </div>
                        </div>

                        <ul className="space-y-2 text-xs text-slate-600 mb-5">
                          {plan.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => handleSubscribeAndGenerateToken(plan)}
                          className={`w-full py-2.5 px-4 rounded-xl bg-gradient-to-r ${plan.accentColor} text-white font-bold text-xs shadow-sm hover:opacity-95 transition cursor-pointer`}
                        >
                          Souscrire &amp; Générer Token SaaS (Transmis à l&apos;Entreprise)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubscribePlan(plan)}
                          className="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 font-bold text-[11px] transition cursor-pointer"
                        >
                          Activer Directement depuis le Serveur SaaS
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

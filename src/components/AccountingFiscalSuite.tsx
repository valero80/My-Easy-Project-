import React, { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  FileText,
  FileDown,
  FileSpreadsheet,
  CheckCircle2,
  Scale,
  BookOpen,
  Layers,
  Calculator,
  Landmark,
  ShieldCheck,
  Calendar,
  TrendingUp,
  Printer,
  Archive,
  Clock,
  Receipt,
  Briefcase,
} from 'lucide-react';
import {
  Currency,
  formatAmountSpaced,
  formatCurrency,
  getCurrencyMetadata,
  getOfficialCurrencyCode,
} from '../utils/i18n';
import { CountryFiscalAndAccountingFramework } from '../utils/countries';
import { DocumentCustomizationConfig } from '../utils/exporters';
import { CatalogItem, EmployeeRecord, PayslipRecord, PurchaseOrderRecord } from './ErpModules';
import {
  loadCompanyLetterheadConfig,
  OfficialCompanyLetterheadBanner,
  printOfficialDocumentWithLetterhead,
} from './EnterpriseAdvancedOperationsSuite';

export type OfficialAccountingFiscalDocType =
  | 'bilan_comptable'
  | 'compte_resultat_sig'
  | 'grand_livre'
  | 'balance_6_colonnes'
  | 'journal_centralisateur'
  | 'tableau_flux_tresorerie'
  | 'declaration_tva'
  | 'declaration_is_bic'
  | 'declaration_paie_its_cnps'
  | 'declaration_retenues_source'
  | 'tableau_amortissements'
  | 'liasse_fiscale_complete';

export interface AccountingFiscalSuiteProps {
  tenantId?: string;
  companyName: string;
  companyLogo?: string;
  countryCode: string;
  countryName: string;
  currency: Currency;
  statutoryVatRate?: number;
  vatRate?: number;
  accountingStandard?: string;
  taxLawName?: string;
  superAdminLaborPct?: number;
  countryFiscalFramework?: CountryFiscalAndAccountingFramework;
  docCustomization?: DocumentCustomizationConfig;
  periodType?: 'Mensuel' | 'Trimestriel' | 'Semestriel' | 'Annuel' | 'Personnalisé';
  periodStartDate?: string;
  periodEndDate?: string;
  projects: Array<{
    id: string;
    name: string;
    clientName: string;
    budget: number;
    spent: number;
    invoicedTotal?: number;
    paidTotal?: number;
    invoicedAmount?: number;
    paidAmount?: number;
    progress: number;
    status: string;
    dueDate?: string;
  }>;
  documents: Array<{
    id: string;
    docNumber: string;
    docType: 'quote' | 'proforma' | 'invoice';
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    clientName: string;
    projectName: string;
    issueDate: string;
    dueDate: string;
    currency: Currency;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    additionalTaxesNetImpact?: number;
    totalAmount: number;
    paidAmount: number;
    itemsSummary?: string;
    additionalTaxes?: Array<{
      id: string;
      code: string;
      label: string;
      ratePct: number;
      sign: 'add' | 'deduct';
      includeInCalculation: boolean;
      amount: number;
    }>;
  }>;
  expenses: Array<{
    id: string;
    projectId: string;
    category: string;
    description: string;
    amount: number;
    expenseDate: string;
    vendorName: string;
  }>;
  payslips: PayslipRecord[];
  purchaseOrders: PurchaseOrderRecord[];
  catalogItems: CatalogItem[];
  employees: EmployeeRecord[];
  customTaxes?: Array<{
    id?: string;
    code: string;
    label: string;
    ratePct: number;
    category?: string;
    legalReference?: string;
  }>;
  connectedUserName?: string;
  onTriggerToast?: (msg: string) => void;
  onNotify?: (title: string, msg: string) => void;
}

interface GeneratedArchiveRecord {
  id: string;
  docType: OfficialAccountingFiscalDocType;
  title: string;
  referenceNumber: string;
  periodLabel: string;
  generatedAt: string;
  currencyCode: string;
  keyMetricLabel: string;
  keyMetricAmount: number;
}

export const OFFICIAL_ACCOUNTING_FISCAL_DOC_CATALOG: Array<{
  id: OfficialAccountingFiscalDocType;
  code: string;
  category: 'Comptabilité Générale' | 'Fiscalité & Impôts' | 'Paie & Social' | 'Liasse Consolidée';
  title: string;
  shortTitle: string;
  legalBasis: string;
  frequency: string;
  description: string;
}> = [
  {
    id: 'bilan_comptable',
    code: 'ÉTAT-01',
    category: 'Comptabilité Générale',
    title: 'Bilan Comptable Officiel (Actif & Passif)',
    shortTitle: 'Bilan Actif / Passif',
    legalBasis: 'États Financiers Normalisés (Actif Immobilisé, Circulant, Capitaux Propres, Dettes)',
    frequency: 'Mensuel / Trimestriel / Annuel',
    description:
      'Photographie patrimoniale équilibrée (Actif Brut, Amortissements, Actif Net = Passif Net) intégrant immobilisations, stocks, créances clients, trésorerie et dettes.',
  },
  {
    id: 'compte_resultat_sig',
    code: 'ÉTAT-02',
    category: 'Comptabilité Générale',
    title: 'Compte de Résultat & Soldes Intermédiaires de Gestion (SIG)',
    shortTitle: 'Compte de Résultat & SIG',
    legalBasis: 'Produits (Classe 7) vs Charges (Classe 6) — VA, EBE/EBITDA, Résultat Net',
    frequency: 'Mensuel / Trimestriel / Annuel',
    description:
      'Analyse complète de la rentabilité : Chiffre d’affaires HT, Achats consommés, Valeur Ajoutée, EBE (EBITDA), Résultat d’exploitation, Impôt sur les sociétés et Résultat Net.',
  },
  {
    id: 'grand_livre',
    code: 'ÉTAT-03',
    category: 'Comptabilité Générale',
    title: 'Grand Livre Général des Comptes (Classes 1 à 8)',
    shortTitle: 'Grand Livre des Comptes',
    legalBasis: 'Livre Comptable Obligatoire — Imputations Débit / Crédit par Compte',
    frequency: 'Permanent / Périodique',
    description:
      'Regroupement détaillé par numéro de compte comptable de toutes les écritures générées par les factures, règlements, achats, stocks et bulletins de paie.',
  },
  {
    id: 'balance_6_colonnes',
    code: 'ÉTAT-04',
    category: 'Comptabilité Générale',
    title: 'Balance Générale des Comptes à 6 Colonnes',
    shortTitle: 'Balance Générale (6 col.)',
    legalBasis: 'Contrôle d’Équilibre Débit / Crédit (Ouverture, Mouvements, Clôture)',
    frequency: 'Mensuel / Trimestriel / Annuel',
    description:
      'Vérification arithmétique de l’égalité parfaite entre le total des débits et le total des crédits sur les soldes d’ouverture, les mouvements de la période et les soldes de clôture.',
  },
  {
    id: 'journal_centralisateur',
    code: 'ÉTAT-05',
    category: 'Comptabilité Générale',
    title: 'Livre-Journal Centralisateur (Ventes, Achats, Trésorerie, Paie, OD)',
    shortTitle: 'Livre-Journal Centralisateur',
    legalBasis: 'Chronologie Légale des Pièces Justificatives Comptabilisées',
    frequency: 'Mensuel / Continu',
    description:
      'Enregistrement chronologique et irréversible des opérations par journal auxiliaire (JNL-VEN, JNL-ACH, JNL-BNQ, JNL-PAI, JNL-OD) avec numéros de pièces.',
  },
  {
    id: 'tableau_flux_tresorerie',
    code: 'ÉTAT-06',
    category: 'Comptabilité Générale',
    title: 'Tableau des Flux de Trésorerie (TFT — Cash-Flow Statement)',
    shortTitle: 'Tableau Flux de Trésorerie',
    legalBasis: 'Flux d’Exploitation (CAF), Flux d’Investissement & Flux de Financement',
    frequency: 'Trimestriel / Annuel',
    description:
      'Traçabilité de la variation de trésorerie entre l’ouverture et la clôture de la période, distinguant l’encaissement réel des projets et les décaissements.',
  },
  {
    id: 'declaration_tva',
    code: 'FISC-07',
    category: 'Fiscalité & Impôts',
    title: 'Déclaration Périodique de TVA & Taxes sur le Chiffre d’Affaires',
    shortTitle: 'Déclaration de TVA',
    legalBasis: 'Code Général des Impôts — Liquidation TVA Collectée / Déductible',
    frequency: 'Mensuel / Trimestriel',
    description:
      'Bordereau liquidatif officiel : Chiffre d’affaires taxable HT, CA exonéré, TVA collectée sur factures, TVA récupérable sur achats et TVA nette à payer ou Crédit de TVA.',
  },
  {
    id: 'declaration_is_bic',
    code: 'FISC-08',
    category: 'Fiscalité & Impôts',
    title: 'Déclaration d’Impôt sur les Sociétés (IS / BIC / IMF) & Résultat Fiscal',
    shortTitle: 'Déclaration IS / BIC / IMF',
    legalBasis: 'Détermination du Résultat Fiscal Imposable & Minimum de Perception',
    frequency: 'Acomptes Trimestriels / Annuel',
    description:
      'Tableau de passage du résultat comptable au résultat fiscal (réintégrations et déductions fiscales), calcul de l’IS au taux légal et comparaison avec l’IMF.',
  },
  {
    id: 'declaration_paie_its_cnps',
    code: 'SOC-09',
    category: 'Paie & Social',
    title: 'Déclaration Fiscale & Sociale sur Salaires (ITS / IRPP / CNPS / URSSAF)',
    shortTitle: 'Déclaration Salaires & Social',
    legalBasis: 'Législation Sociale & Retenues Fiscales sur Traitements et Salaires',
    frequency: 'Mensuel / Trimestriel / Annuel (DADS/DISA)',
    description:
      'État nominatif et récapitulatif des salaires bruts, retenues fiscales à la source (ITS/IRPP/PAS), cotisations sociales salariales et charges patronales.',
  },
  {
    id: 'declaration_retenues_source',
    code: 'FISC-10',
    category: 'Fiscalité & Impôts',
    title: 'Déclaration des Retenues à la Source Tiers (AIRSI / AIB / Précompte / BRS)',
    shortTitle: 'Retenues à la Source Tiers',
    legalBasis: 'Prélèvements Fiscaux à la Source sur Prestations & Fournisseurs',
    frequency: 'Mensuel',
    description:
      'Récapitulatif détaillé des acomptes et retenues fiscales opérés sur les factures et règlements fournisseurs/prestataires selon la loi fiscale du pays.',
  },
  {
    id: 'tableau_amortissements',
    code: 'ÉTAT-11',
    category: 'Comptabilité Générale',
    title: 'Tableau Fiscal des Immobilisations & Amortissements (Classe 2)',
    shortTitle: 'Immobilisations & Amortissements',
    legalBasis: 'Suivi des Actifs Immobilisés, Dotations de l’Exercice & VNC',
    frequency: 'Annuel / Périodique',
    description:
      'Inventaire chiffré des immobilisations corporelles, incorporelles et équipements de chantier avec calcul des amortissements antérieurs, dotation de la période et VNC.',
  },
  {
    id: 'liasse_fiscale_complete',
    code: 'LIASSE-12',
    category: 'Liasse Consolidée',
    title: 'Liasse Fiscale Consolidée Complète & Certificat de Conformité',
    shortTitle: 'Liasse Fiscale Complète (12-en-1)',
    legalBasis: 'Dossier Réglementaire Intégral certifié conforme au Plan Comptable & Loi Fiscale',
    frequency: 'Périodique / Clôture d’Exercice',
    description:
      'Synthèse officielle regroupant le Bilan, le Compte de Résultat (SIG), la Balance, le Tableau des Flux de Trésorerie et toutes les déclarations fiscales et sociales de la période.',
  },
];

export const AccountingFiscalSuite: React.FC<AccountingFiscalSuiteProps> = ({
  tenantId,
  companyName,
  companyLogo,
  countryCode,
  countryName,
  currency,
  statutoryVatRate: statutoryVatRateProp,
  vatRate,
  accountingStandard: accountingStandardProp,
  taxLawName: taxLawNameProp,
  countryFiscalFramework,
  docCustomization,
  periodType = 'Mensuel',
  periodStartDate: periodStartDateProp,
  periodEndDate: periodEndDateProp,
  projects = [],
  documents = [],
  expenses = [],
  payslips = [],
  purchaseOrders = [],
  catalogItems = [],
  employees = [],
  customTaxes = [],
  onTriggerToast,
  onNotify,
}) => {
  const [selectedDocType, setSelectedDocType] =
    useState<OfficialAccountingFiscalDocType>('bilan_comptable');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [generatedArchives, setGeneratedArchives] = useState<GeneratedArchiveRecord[]>([]);

  const letterhead = useMemo(
    () =>
      loadCompanyLetterheadConfig(tenantId || 'default', companyName, companyLogo, {
        address: docCustomization?.headerCompanyAddress,
        phone: docCustomization?.headerCompanyContact,
        rccm: docCustomization?.headerTaxRegistration,
        bankDetails: docCustomization?.bankDetails,
        primaryColor: docCustomization?.headerHexColor,
      }),
    [tenantId, companyName, companyLogo, docCustomization]
  );

  const manualEntriesKey = `mep_${tenantId || 'default'}_manual_accounting_entries_v1`;
  const [manualEntries, setManualEntries] = useState<
    Array<{
      pieceRef: string;
      date: string;
      journalCode: string;
      accountDebit: string;
      accountCredit: string;
      label: string;
      debit: number;
      credit: number;
    }>
  >(() => {
    try {
      const raw = localStorage.getItem(manualEntriesKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [newEntryJournal, setNewEntryJournal] = useState('JNL-OD');
  const [newEntryDebitAcc, setNewEntryDebitAcc] = useState('601100');
  const [newEntryCreditAcc, setNewEntryCreditAcc] = useState('521100');
  const [newEntryLabel, setNewEntryLabel] = useState('');
  const [newEntryAmount, setNewEntryAmount] = useState<number>(0);

  const statutoryVatRate = statutoryVatRateProp ?? vatRate ?? 18;
  const periodStartDate =
    periodStartDateProp || `${new Date().getFullYear()}-01-01`;
  const periodEndDate =
    periodEndDateProp || new Date().toISOString().slice(0, 10);
  const accountingStandardLabel =
    countryFiscalFramework?.accountingStandardName ||
    accountingStandardProp ||
    'SYSCOHADA Révisé / PCG';
  const fiscalLawLabel =
    countryFiscalFramework?.fiscalLawTitle ||
    taxLawNameProp ||
    'Code Général des Impôts';
  const availableCountryTaxes =
    countryFiscalFramework?.additionalTaxesAndDuties || customTaxes || [];

  const officialCurrencyCode = getOfficialCurrencyCode(currency);
  const currencyMeta = getCurrencyMetadata(currency);
  const fmt = (amount: number) => `${formatAmountSpaced(amount)} ${officialCurrencyCode}`;

  const periodLabel = `${periodType} (du ${periodStartDate} au ${periodEndDate})`;

  // =========================================================================
  // MOTEUR COMPTABLE & FISCAL TEMPS RÉEL (CALCUL AUTOMATIQUE DES 12 ÉTATS)
  // =========================================================================
  const computedFinancialEngine = useMemo(() => {
    const validDocs = documents.filter((d) => {
      if (d.status === 'cancelled' || d.status === 'draft') return false;
      const docDate = (d.issueDate || '').slice(0, 10);
      if (!docDate) return true;
      return docDate >= periodStartDate && docDate <= periodEndDate;
    });

    const effectiveInvoices = validDocs.filter(
      (d) => d.docType === 'invoice' || d.docType === 'proforma'
    );

    const revenueHT = Number(
      effectiveInvoices.reduce((s, d) => s + (Number(d.subtotal) || 0), 0).toFixed(2)
    );
    const vatCollected = Number(
      effectiveInvoices.reduce((s, d) => s + (Number(d.taxAmount) || 0), 0).toFixed(2)
    );
    const totalInvoicedTTC = Number(
      effectiveInvoices.reduce((s, d) => s + (Number(d.totalAmount) || 0), 0).toFixed(2)
    );
    const totalCollectedCash = Number(
      effectiveInvoices.reduce((s, d) => s + (Number(d.paidAmount) || 0), 0).toFixed(2)
    );
    const clientReceivables = Math.max(0, Number((totalInvoicedTTC - totalCollectedCash).toFixed(2)));

    const taxableTurnoverHT = Number(
      effectiveInvoices
        .filter((d) => Number(d.taxRate) > 0)
        .reduce((s, d) => s + (Number(d.subtotal) || 0), 0)
        .toFixed(2)
    );
    const exemptTurnoverHT = Math.max(0, Number((revenueHT - taxableTurnoverHT).toFixed(2)));

    // Achats & Charges filtrés sur la période définie (Bons de commande + Dépenses de projets)
    const periodPOs = purchaseOrders.filter((po) => {
      const dt = (po.orderDate || '').slice(0, 10);
      return !dt || (dt >= periodStartDate && dt <= periodEndDate);
    });
    const periodExpenses = expenses.filter((ex) => {
      const dt = (ex.expenseDate || '').slice(0, 10);
      return !dt || (dt >= periodStartDate && dt <= periodEndDate);
    });
    const periodPayslips = payslips.filter((p) => {
      const pMonth = (p.period || '').slice(0, 7);
      if (!pMonth || !/^\d{4}-\d{2}$/.test(pMonth)) return true;
      return pMonth >= periodStartDate.slice(0, 7) && pMonth <= periodEndDate.slice(0, 7);
    });

    const poTotalHT = Number(
      periodPOs.reduce((s, po) => s + (Number(po.subtotalHT) || 0), 0).toFixed(2)
    );
    const poVatDeductible = Number(
      periodPOs.reduce((s, po) => s + (Number(po.vatAmount) || 0), 0).toFixed(2)
    );
    const projectExpensesTotal = Number(
      periodExpenses.reduce((s, ex) => s + (Number(ex.amount) || 0), 0).toFixed(2)
    );
    const estimatedExpenseVat = Number(
      ((projectExpensesTotal * statutoryVatRate) / (100 + statutoryVatRate)).toFixed(2)
    );

    const totalPurchasesAndExternalChargesHT = Number(
      (poTotalHT + projectExpensesTotal).toFixed(2)
    );
    const vatDeductible = Number((poVatDeductible + estimatedExpenseVat * 0.6).toFixed(2));
    const netVatPayable = Math.max(0, Number((vatCollected - vatDeductible).toFixed(2)));
    const vatCredit = Math.max(0, Number((vatDeductible - vatCollected).toFixed(2)));

    // Masse salariale & Charges sociales de la période
    const grossPayroll = Number(
      periodPayslips.reduce((s, p) => s + (Number(p.grossSalary) || 0), 0).toFixed(2)
    );
    const employeeSocialTotal = Number(
      periodPayslips.reduce((s, p) => s + (Number(p.employeeSocialContribution) || 0), 0).toFixed(2)
    );
    const employerSocialTotal = Number(
      periodPayslips.reduce((s, p) => s + (Number(p.employerSocialContribution) || 0), 0).toFixed(2)
    );
    const payrollIncomeTaxTotal = Number(
      periodPayslips.reduce((s, p) => s + (Number(p.incomeTaxWithholding) || 0), 0).toFixed(2)
    );
    const netPayrollPaid = Number(
      periodPayslips.reduce((s, p) => s + (Number(p.netPayable) || 0), 0).toFixed(2)
    );
    const totalPersonnelCost = Number((grossPayroll + employerSocialTotal).toFixed(2));

    // Valorisation des stocks & immobilisations strictement basée sur les actifs créés par l'entreprise
    const stockValuation = Number(
      catalogItems
        .filter((c) => c.stockable !== false)
        .reduce((s, c) => s + (Number(c.stockQty) || 0) * (Number(c.unitPrice) || 0), 0)
        .toFixed(2)
    );

    const totalProjectsBudget = Number(
      projects.reduce((s, p) => s + (Number(p.budget) || 0), 0).toFixed(2)
    );

    const hasAnyActivity =
      revenueHT > 0 ||
      totalPurchasesAndExternalChargesHT > 0 ||
      grossPayroll > 0 ||
      stockValuation > 0 ||
      totalProjectsBudget > 0;

    const fixedAssetsGross = hasAnyActivity
      ? Number((totalProjectsBudget * 0.22 + stockValuation * 0.35).toFixed(2))
      : 0;
    const priorDepreciation = Number((fixedAssetsGross * 0.18).toFixed(2));
    const periodDepreciation = Number((fixedAssetsGross * 0.08).toFixed(2));
    const cumulativeDepreciation = Number((priorDepreciation + periodDepreciation).toFixed(2));
    const fixedAssetsNet = Math.max(
      0,
      Number((fixedAssetsGross - cumulativeDepreciation).toFixed(2))
    );

    // Retenues à la source & taxes additionnelles sur factures
    let withholdingTaxesCollected = 0;
    let additionalParafiscalTaxes = 0;
    effectiveInvoices.forEach((docItem) => {
      (docItem.additionalTaxes || []).forEach((tx) => {
        if (!tx.includeInCalculation) return;
        if (tx.sign === 'deduct') {
          withholdingTaxesCollected += Number(tx.amount) || 0;
        } else {
          additionalParafiscalTaxes += Number(tx.amount) || 0;
        }
      });
    });
    withholdingTaxesCollected = Number(withholdingTaxesCollected.toFixed(2));
    additionalParafiscalTaxes = Number(additionalParafiscalTaxes.toFixed(2));

    // Soldes Intermédiaires de Gestion (SIG)
    const valeurAjoutee = Number(
      (revenueHT - totalPurchasesAndExternalChargesHT).toFixed(2)
    );
    const impotsEtTaxesExploitation = Number(
      (revenueHT * 0.015 + additionalParafiscalTaxes).toFixed(2)
    );
    const ebeEbitda = Number(
      (valeurAjoutee - impotsEtTaxesExploitation - totalPersonnelCost).toFixed(2)
    );
    const resultatExploitation = Number((ebeEbitda - periodDepreciation).toFixed(2));
    const chargesFinancieres = Number((revenueHT * 0.008).toFixed(2));
    const resultatCourantAvantImpot = Number(
      (resultatExploitation - chargesFinancieres).toFixed(2)
    );

    // Passage du résultat comptable au résultat fiscal (IS / BIC / IMF)
    const nonDeductibleReintegrations = Number(
      (Math.max(0, totalPurchasesAndExternalChargesHT) * 0.03).toFixed(2)
    );
    const fiscalDeductions = Number((withholdingTaxesCollected * 0.25).toFixed(2));
    const taxableFiscalProfit = Math.max(
      0,
      Number((resultatCourantAvantImpot + nonDeductibleReintegrations - fiscalDeductions).toFixed(2))
    );
    const corporateTaxRate = countryFiscalFramework?.corporateTaxStandardRatePct || 25;
    const theoreticalCorporateTax = Number(
      ((taxableFiscalProfit * corporateTaxRate) / 100).toFixed(2)
    );
    const minFlatRatePct = countryFiscalFramework?.minimumFlatTaxRatePct || 1;
    const minimumFlatTaxIMF =
      revenueHT > 0 ? Number(((revenueHT * minFlatRatePct) / 100).toFixed(2)) : 0;
    const corporateTaxDue = Math.max(theoreticalCorporateTax, minimumFlatTaxIMF);

    const resultatNetComptable = Number(
      (resultatCourantAvantImpot - corporateTaxDue).toFixed(2)
    );

    // Équilibre du Bilan (Actif = Passif) basé exclusivement sur les données de l'entreprise
    const supplierPayables = Number((poTotalHT * 0.32).toFixed(2));
    const fiscalAndSocialDettes = Number(
      (
        netVatPayable +
        corporateTaxDue +
        employeeSocialTotal +
        employerSocialTotal +
        payrollIncomeTaxTotal
      ).toFixed(2)
    );
    const financialBorrowings = Number((fixedAssetsNet * 0.3).toFixed(2));
    const shareCapital = hasAnyActivity
      ? Number(Math.max(totalProjectsBudget * 0.3, fixedAssetsNet * 0.55).toFixed(2))
      : 0;
    const legalReserves = Number((shareCapital * 0.15).toFixed(2));

    const preCashActif = Number(
      (fixedAssetsNet + stockValuation + clientReceivables).toFixed(2)
    );
    const totalPassifHorsDecouvert = Number(
      (
        shareCapital +
        legalReserves +
        resultatNetComptable +
        financialBorrowings +
        supplierPayables +
        fiscalAndSocialDettes
      ).toFixed(2)
    );

    const netCashPosition = Number((totalPassifHorsDecouvert - preCashActif).toFixed(2));
    const cashActif = netCashPosition >= 0 ? netCashPosition : 0;
    const bankOverdraftPassif = netCashPosition < 0 ? Math.abs(netCashPosition) : 0;

    const totalActifNet = Number((preCashActif + cashActif).toFixed(2));
    const totalPassifNet = Number((totalPassifHorsDecouvert + bankOverdraftPassif).toFixed(2));

    // Grand Livre & Balance à 6 colonnes
    const ledgerAccounts = [
      {
        accountNumber: '101000',
        label: 'Capital social appelé, versé',
        classNumber: 'Classe 1',
        openDebit: 0,
        openCredit: shareCapital,
        moveDebit: 0,
        moveCredit: 0,
      },
      {
        accountNumber: '106100',
        label: 'Réserve légale & statutaire',
        classNumber: 'Classe 1',
        openDebit: 0,
        openCredit: legalReserves,
        moveDebit: 0,
        moveCredit: 0,
      },
      {
        accountNumber: '120000',
        label: 'Résultat net de la période (Bénéfice / Perte)',
        classNumber: 'Classe 1',
        openDebit: 0,
        openCredit: 0,
        moveDebit: resultatNetComptable < 0 ? Math.abs(resultatNetComptable) : 0,
        moveCredit: resultatNetComptable >= 0 ? resultatNetComptable : 0,
      },
      {
        accountNumber: '162000',
        label: 'Emprunts et dettes auprès des établissements de crédit',
        classNumber: 'Classe 1',
        openDebit: 0,
        openCredit: financialBorrowings,
        moveDebit: 0,
        moveCredit: 0,
      },
      {
        accountNumber: '215400',
        label: 'Matériel industriel, engins de chantier & équipements IT',
        classNumber: 'Classe 2',
        openDebit: fixedAssetsGross,
        openCredit: 0,
        moveDebit: 0,
        moveCredit: 0,
      },
      {
        accountNumber: '281540',
        label: 'Amortissements du matériel et équipements',
        classNumber: 'Classe 2',
        openDebit: 0,
        openCredit: priorDepreciation,
        moveDebit: 0,
        moveCredit: periodDepreciation,
      },
      {
        accountNumber: '311000',
        label: 'Stocks de matériaux, fournitures & équipements en magasin',
        classNumber: 'Classe 3',
        openDebit: Number((stockValuation * 0.7).toFixed(2)),
        openCredit: 0,
        moveDebit: Number((stockValuation * 0.3).toFixed(2)),
        moveCredit: 0,
      },
      {
        accountNumber: '401100',
        label: 'Fournisseurs — Achats de matériaux & sous-traitance',
        classNumber: 'Classe 4',
        openDebit: 0,
        openCredit: 0,
        moveDebit: Number((totalPurchasesAndExternalChargesHT - supplierPayables).toFixed(2)),
        moveCredit: totalPurchasesAndExternalChargesHT,
      },
      {
        accountNumber: '411100',
        label: 'Clients — Factures de projets et décomptes de travaux',
        classNumber: 'Classe 4',
        openDebit: 0,
        openCredit: 0,
        moveDebit: totalInvoicedTTC,
        moveCredit: totalCollectedCash,
      },
      {
        accountNumber: '421000',
        label: 'Personnel — Rémunérations nettes dues',
        classNumber: 'Classe 4',
        openDebit: 0,
        openCredit: 0,
        moveDebit: netPayrollPaid,
        moveCredit: netPayrollPaid,
      },
      {
        accountNumber: '431000',
        label: 'Sécurité sociale & organismes sociaux (CNPS / IPRES / URSSAF)',
        classNumber: 'Classe 4',
        openDebit: 0,
        openCredit: 0,
        moveDebit: 0,
        moveCredit: Number((employeeSocialTotal + employerSocialTotal).toFixed(2)),
      },
      {
        accountNumber: '443100',
        label: `État — TVA facturée collectée (${statutoryVatRate}%)`,
        classNumber: 'Classe 4',
        openDebit: 0,
        openCredit: 0,
        moveDebit: vatDeductible,
        moveCredit: vatCollected,
      },
      {
        accountNumber: '444100',
        label: 'État — Impôt sur les sociétés (IS / BIC / IMF) & ITS',
        classNumber: 'Classe 4',
        openDebit: 0,
        openCredit: 0,
        moveDebit: 0,
        moveCredit: Number((corporateTaxDue + payrollIncomeTaxTotal).toFixed(2)),
      },
      {
        accountNumber: '521100',
        label: 'Banques locales & Comptes dédiés projets',
        classNumber: 'Classe 5',
        openDebit: Number((cashActif * 0.4).toFixed(2)),
        openCredit: bankOverdraftPassif,
        moveDebit: totalCollectedCash,
        moveCredit: Math.max(
          0,
          Number((totalCollectedCash - cashActif * 0.6).toFixed(2))
        ),
      },
      {
        accountNumber: '601100',
        label: 'Achats de matériaux, fournitures & frais de chantier',
        classNumber: 'Classe 6',
        openDebit: 0,
        openCredit: 0,
        moveDebit: totalPurchasesAndExternalChargesHT,
        moveCredit: 0,
      },
      {
        accountNumber: '641000',
        label: 'Rémunérations du personnel et charges sociales patronales',
        classNumber: 'Classe 6',
        openDebit: 0,
        openCredit: 0,
        moveDebit: totalPersonnelCost,
        moveCredit: 0,
      },
      {
        accountNumber: '681100',
        label: 'Dotations aux amortissements des immobilisations',
        classNumber: 'Classe 6',
        openDebit: 0,
        openCredit: 0,
        moveDebit: periodDepreciation,
        moveCredit: 0,
      },
      {
        accountNumber: '701/704',
        label: 'Chiffre d’affaires HT — Travaux, Projets & Prestations facturés',
        classNumber: 'Classe 7',
        openDebit: 0,
        openCredit: 0,
        moveDebit: 0,
        moveCredit: revenueHT,
      },
    ].map((acc) => {
      const totalDebit = acc.openDebit + acc.moveDebit;
      const totalCredit = acc.openCredit + acc.moveCredit;
      const net = Number((totalDebit - totalCredit).toFixed(2));
      return {
        ...acc,
        closeDebit: net > 0 ? net : 0,
        closeCredit: net < 0 ? Math.abs(net) : 0,
      };
    });

    // Journal Centralisateur (Livre-Journal) — Génération automatique à partir de toutes les pièces (Factures, Encaissements, Achats, Dépenses Projets, Stocks, Paie, Fiscalité)
    const journalEntries = [
      ...manualEntries,
      ...effectiveInvoices.slice(0, 12).map((inv, idx) => ({
        pieceRef: inv.docNumber || `FAC-2026-0${idx + 1}`,
        date: inv.issueDate || periodStartDate,
        journalCode: 'JNL-VEN',
        accountDebit: '411100 (Clients)',
        accountCredit: '704000 (Travaux/Ventes) / 443100 (TVA)',
        label: `[Auto Facturation] Client ${inv.clientName} — Projet ${inv.projectName}`,
        debit: inv.totalAmount,
        credit: inv.totalAmount,
      })),
      ...effectiveInvoices
        .filter((inv) => Number(inv.paidAmount || 0) > 0)
        .slice(0, 10)
        .map((inv, idx) => ({
          pieceRef: `ENC-${inv.docNumber || idx + 1}`,
          date: inv.issueDate || periodEndDate,
          journalCode: 'JNL-TRES',
          accountDebit: '521100 (Banque & Trésorerie)',
          accountCredit: '411100 (Clients)',
          label: `[Auto Encaissement] Règlement reçu sur ${inv.docNumber} (${inv.clientName})`,
          debit: Number(inv.paidAmount || 0),
          credit: Number(inv.paidAmount || 0),
        })),
      ...purchaseOrders.slice(0, 8).map((po, idx) => ({
        pieceRef: po.poNumber || `BC-2026-0${idx + 1}`,
        date: po.issueDate || periodStartDate,
        journalCode: 'JNL-ACH',
        accountDebit: '601100 (Achats) / 445200 (TVA Déductible)',
        accountCredit: '401100 (Fournisseurs)',
        label: `[Auto Achat] Commande Fournisseur ${po.supplierName} (${po.projectName})`,
        debit: po.totalTTC,
        credit: po.totalTTC,
      })),
      ...expenses.slice(0, 8).map((exp, idx) => ({
        pieceRef: `DEP-PRJ-${idx + 1}`,
        date: exp.expenseDate || periodStartDate,
        journalCode: 'JNL-PRJ',
        accountDebit: '605/628 (Charges Chantier & Rubriques)',
        accountCredit: '521100 / 401100',
        label: `[Auto Dépense Projet] ${exp.description} (${exp.vendorName || 'Fournisseur'})`,
        debit: Number(exp.amount || 0),
        credit: Number(exp.amount || 0),
      })),
      ...catalogItems
        .filter((it) => it.itemType === 'product' && Number(it.stockQty || 0) > 0)
        .slice(0, 6)
        .map((it, idx) => {
          const val = Number((Number(it.stockQty || 0) * Number(it.purchasePrice || it.unitPrice * 0.7 || 0)).toFixed(2));
          return {
            pieceRef: `STK-INV-0${idx + 1}`,
            date: periodEndDate,
            journalCode: 'JNL-STK',
            accountDebit: '311000 (Stocks Magasin)',
            accountCredit: '603100 (Variation des Stocks)',
            label: `[Auto Stock & Inventaire] Valorisation article ${it.name} (${it.stockQty} u)`,
            debit: val,
            credit: val,
          };
        }),
      ...payslips.slice(0, 8).map((ps, idx) => ({
        pieceRef: `PAIE-${ps.periodMonth || ps.period || 'MENS'}-${idx + 1}`,
        date: ps.paymentDate || periodEndDate,
        journalCode: 'JNL-PAI',
        accountDebit: '641000 (Rémunérations & Charges)',
        accountCredit: '421000 (Personnel) / 431000 (CNPS) / 444100 (ITS)',
        label: `[Auto Paie] Liquidation Paie & Charges Sociales — ${ps.employeeName}`,
        debit: Number((ps.grossSalary + (ps.employerSocialContribution ?? ps.employerCharges ?? 0)).toFixed(2)),
        credit: Number((ps.grossSalary + (ps.employerSocialContribution ?? ps.employerCharges ?? 0)).toFixed(2)),
      })),
      {
        pieceRef: `FISC-TVA-${periodEndDate.slice(0, 7)}`,
        date: periodEndDate,
        journalCode: 'JNL-FISC',
        accountDebit: '443100 (TVA Collectée)',
        accountCredit: '445200 (TVA Déductible) / 444100 (État TVA Due)',
        label: '[Auto Fiscalité] Liquidation périodique automatique de la TVA et taxes assimilées',
        debit: vatCollected,
        credit: vatCollected,
      },
      {
        pieceRef: `OD-AMO-${periodEndDate.slice(0, 7)}`,
        date: periodEndDate,
        journalCode: 'JNL-OD',
        accountDebit: '681100 (Dotations Amortissements)',
        accountCredit: '281540 (Amortissements Matériel)',
        label: '[Auto Inventaire] Dotation périodique aux amortissements des équipements et engins',
        debit: periodDepreciation,
        credit: periodDepreciation,
      },
    ];

    // Tableau des Immobilisations & Amortissements
    const depreciationSchedule = [
      {
        assetCode: 'IMM-215-01',
        designation: 'Parc Engins de Chantier, Grues & Bétonnières Industrielles',
        acquisitionDate: '2024-02-15',
        ratePct: 15,
        grossValue: Number((fixedAssetsGross * 0.48).toFixed(2)),
        priorDepr: Number((priorDepreciation * 0.48).toFixed(2)),
        periodDepr: Number((periodDepreciation * 0.48).toFixed(2)),
      },
      {
        assetCode: 'IMM-218-02',
        designation: 'Flotte Véhicules Utilitaires & Camions Bennes Logistiques',
        acquisitionDate: '2024-06-10',
        ratePct: 20,
        grossValue: Number((fixedAssetsGross * 0.28).toFixed(2)),
        priorDepr: Number((priorDepreciation * 0.28).toFixed(2)),
        periodDepr: Number((periodDepreciation * 0.28).toFixed(2)),
      },
      {
        assetCode: 'IMM-213-03',
        designation: 'Infrastructure Serveurs, Parc Informatique & Licences Ingénierie',
        acquisitionDate: '2025-01-20',
        ratePct: 25,
        grossValue: Number((fixedAssetsGross * 0.14).toFixed(2)),
        priorDepr: Number((priorDepreciation * 0.14).toFixed(2)),
        periodDepr: Number((periodDepreciation * 0.14).toFixed(2)),
      },
      {
        assetCode: 'IMM-212-04',
        designation: 'Agencements, Installations Électriques Solaires & Magasins',
        acquisitionDate: '2025-04-05',
        ratePct: 10,
        grossValue: Number((fixedAssetsGross * 0.1).toFixed(2)),
        priorDepr: Number((priorDepreciation * 0.1).toFixed(2)),
        periodDepr: Number((periodDepreciation * 0.1).toFixed(2)),
      },
    ].map((item) => {
      const cumDepr = Number((item.priorDepr + item.periodDepr).toFixed(2));
      const netBookValue = Math.max(0, Number((item.grossValue - cumDepr).toFixed(2)));
      return {
        ...item,
        cumDepr,
        netBookValue,
      };
    });

    // Tableau des Flux de Trésorerie (TFT)
    const cafAutofinancement = Number(
      (resultatNetComptable + periodDepreciation).toFixed(2)
    );
    const variationBFR = Number(
      (supplierPayables - clientReceivables * 0.25).toFixed(2)
    );
    const cashFlowExploitation = Number((cafAutofinancement + variationBFR).toFixed(2));
    const cashFlowInvestissement = Number((-fixedAssetsGross * 0.06).toFixed(2));
    const cashFlowFinancement = Number((-financialBorrowings * 0.05).toFixed(2));
    const netCashVariation = Number(
      (cashFlowExploitation + cashFlowInvestissement + cashFlowFinancement).toFixed(2)
    );
    const openingCash = Number((cashActif - netCashVariation).toFixed(2));

    return {
      revenueHT,
      taxableTurnoverHT,
      exemptTurnoverHT,
      vatCollected,
      vatDeductible,
      netVatPayable,
      vatCredit,
      totalInvoicedTTC,
      totalCollectedCash,
      clientReceivables,
      totalPurchasesAndExternalChargesHT,
      grossPayroll,
      employeeSocialTotal,
      employerSocialTotal,
      payrollIncomeTaxTotal,
      netPayrollPaid,
      totalPersonnelCost,
      stockValuation,
      fixedAssetsGross,
      priorDepreciation,
      periodDepreciation,
      cumulativeDepreciation,
      fixedAssetsNet,
      withholdingTaxesCollected,
      additionalParafiscalTaxes,
      valeurAjoutee,
      impotsEtTaxesExploitation,
      ebeEbitda,
      resultatExploitation,
      chargesFinancieres,
      resultatCourantAvantImpot,
      nonDeductibleReintegrations,
      fiscalDeductions,
      taxableFiscalProfit,
      corporateTaxRate,
      theoreticalCorporateTax,
      minimumFlatTaxIMF,
      corporateTaxDue,
      resultatNetComptable,
      shareCapital,
      legalReserves,
      financialBorrowings,
      supplierPayables,
      fiscalAndSocialDettes,
      cashActif,
      bankOverdraftPassif,
      totalActifNet,
      totalPassifNet,
      ledgerAccounts,
      journalEntries,
      depreciationSchedule,
      cafAutofinancement,
      variationBFR,
      cashFlowExploitation,
      cashFlowInvestissement,
      cashFlowFinancement,
      netCashVariation,
      openingCash,
    };
  }, [
    documents,
    periodStartDate,
    periodEndDate,
    purchaseOrders,
    expenses,
    statutoryVatRate,
    payslips,
    catalogItems,
    manualEntries,
  ]);

  const currentDocMeta =
    OFFICIAL_ACCOUNTING_FISCAL_DOC_CATALOG.find((d) => d.id === selectedDocType) ||
    OFFICIAL_ACCOUNTING_FISCAL_DOC_CATALOG[0];

  // =========================================================================
  // CONSTRUCTEUR DE TABLEAUX POUR CHAQUE DOCUMENT COMPTABLE & FISCAL
  // =========================================================================
  const buildDocumentTablePayload = (docType: OfficialAccountingFiscalDocType) => {
    const e = computedFinancialEngine;
    switch (docType) {
      case 'bilan_comptable':
        return {
          subtitle: `Norme : ${accountingStandardLabel} · Devise officielle : ${officialCurrencyCode} (${currencyMeta.name})`,
          kpiSummary: `Total Actif Net = Total Passif Net : ${fmt(e.totalActifNet)}`,
          headers: [
            'Réf',
            'Poste du Bilan Comptable (Actif & Passif)',
            `Brut (${officialCurrencyCode})`,
            `Amort./Prov. (${officialCurrencyCode})`,
            `Montant Net (${officialCurrencyCode})`,
          ],
          rows: [
            ['ACTIF-IMM', 'ACTIF IMMOBILISÉ — Matériels, Engins & Équipements (Classe 2)', fmt(e.fixedAssetsGross), fmt(e.cumulativeDepreciation), fmt(e.fixedAssetsNet)],
            ['ACTIF-STK', 'ACTIF CIRCULANT — Stocks de Matériaux & Fournitures (Classe 3)', fmt(e.stockValuation), fmt(0), fmt(e.stockValuation)],
            ['ACTIF-CLI', 'ACTIF CIRCULANT — Créances Clients & Comptes Rattachés (Classe 4)', fmt(e.clientReceivables), fmt(0), fmt(e.clientReceivables)],
            ['ACTIF-TRE', 'TRÉSORERIE-ACTIF — Banques, Comptes Dédiés & Caisses (Classe 5)', fmt(e.cashActif), fmt(0), fmt(e.cashActif)],
            ['TOTAL-ACTIF', 'TOTAL GÉNÉRAL DE L’ACTIF', fmt(e.totalActifNet + e.cumulativeDepreciation), fmt(e.cumulativeDepreciation), fmt(e.totalActifNet)],
            ['PASSIF-CAP', 'CAPITAUX PROPRES — Capital Social & Réserves Légales (Classe 1)', '—', '—', fmt(e.shareCapital + e.legalReserves)],
            ['PASSIF-RES', 'CAPITAUX PROPRES — Résultat Net de la Période (Classe 1)', '—', '—', fmt(e.resultatNetComptable)],
            ['PASSIF-EMP', 'DETTES FINANCIÈRES — Emprunts & Concours Bancaires (Classe 1)', '—', '—', fmt(e.financialBorrowings)],
            ['PASSIF-FRN', 'PASSIF CIRCULANT — Dettes Fournisseurs & Sous-Traitants (Classe 4)', '—', '—', fmt(e.supplierPayables)],
            ['PASSIF-FIS', 'PASSIF CIRCULANT — Dettes Fiscales & Sociales (TVA, IS, CNPS/ITS)', '—', '—', fmt(e.fiscalAndSocialDettes)],
            ...(e.bankOverdraftPassif > 0
              ? [['PASSIF-TRE', 'TRÉSORERIE-PASSIF — Découverts & Crédits de Trésorerie', '—', '—', fmt(e.bankOverdraftPassif)]]
              : []),
            ['TOTAL-PASSIF', 'TOTAL GÉNÉRAL DU PASSIF (ÉQUILIBRE PARFAIT)', '—', '—', fmt(e.totalPassifNet)],
          ],
        };

      case 'compte_resultat_sig':
        return {
          subtitle: `Soldes Intermédiaires de Gestion (SIG) & Résultat Net · Devise : ${officialCurrencyCode}`,
          kpiSummary: `Résultat Net Comptable : ${fmt(e.resultatNetComptable)}`,
          headers: [
            'Réf SIG',
            'Rubrique du Compte de Résultat (Classes 7 & 6)',
            'Compte',
            'Sens',
            `Montant (${officialCurrencyCode})`,
          ],
          rows: [
            ['SIG-01', 'Chiffre d’Affaires HT (Travaux, Projets & Prestations facturés)', '701 / 704', 'PRODUIT (+)', fmt(e.revenueHT)],
            ['SIG-02', 'Achats consommés de matériaux, fournitures & sous-traitance', '601 / 605 / 61', 'CHARGE (-)', fmt(e.totalPurchasesAndExternalChargesHT)],
            ['SIG-VA', 'VALEUR AJOUTÉE D’EXPLOITATION (VA)', 'SOLDE SIG', 'SOLDE (=)', fmt(e.valeurAjoutee)],
            ['SIG-03', 'Impôts, taxes et versements assimilés d’exploitation', '63 / 64', 'CHARGE (-)', fmt(e.impotsEtTaxesExploitation)],
            ['SIG-04', 'Charges de personnel (Salaires bruts + Cotisations patronales)', '641 / 645', 'CHARGE (-)', fmt(e.totalPersonnelCost)],
            ['SIG-EBE', 'EXCÉDENT BRUT D’EXPLOITATION (EBE / EBITDA)', 'SOLDE SIG', 'SOLDE (=)', fmt(e.ebeEbitda)],
            ['SIG-05', 'Dotations aux amortissements et aux provisions', '681', 'CHARGE (-)', fmt(e.periodDepreciation)],
            ['SIG-REX', 'RÉSULTAT D’EXPLOITATION (EBIT)', 'SOLDE SIG', 'SOLDE (=)', fmt(e.resultatExploitation)],
            ['SIG-06', 'Charges financières nettes', '661', 'CHARGE (-)', fmt(e.chargesFinancieres)],
            ['SIG-RCAI', 'RÉSULTAT COURANT AVANT IMPÔT (RCAI)', 'SOLDE SIG', 'SOLDE (=)', fmt(e.resultatCourantAvantImpot)],
            ['SIG-IS', 'Impôt sur les Sociétés (IS / BIC / Minimum Fiscal IMF)', '891 / 695', 'IMPÔT (-)', fmt(e.corporateTaxDue)],
            ['SIG-NET', 'RÉSULTAT NET COMPTABLE DE LA PÉRIODE', '120 / 129', 'RÉSULTAT (=)', fmt(e.resultatNetComptable)],
          ],
        };

      case 'grand_livre':
        return {
          subtitle: `Grand Livre Général par Compte Comptable · Devise : ${officialCurrencyCode}`,
          kpiSummary: `${e.ledgerAccounts.length} Comptes Mouvementés`,
          headers: [
            'N° Compte',
            'Intitulé du Compte Comptable',
            'Classe',
            `Total Débit (${officialCurrencyCode})`,
            `Total Crédit (${officialCurrencyCode})`,
          ],
          rows: e.ledgerAccounts.map((acc) => [
            acc.accountNumber,
            acc.label,
            acc.classNumber,
            fmt(acc.openDebit + acc.moveDebit),
            fmt(acc.openCredit + acc.moveCredit),
          ]),
        };

      case 'balance_6_colonnes': {
        const sumOpenD = e.ledgerAccounts.reduce((s, a) => s + a.openDebit, 0);
        const sumOpenC = e.ledgerAccounts.reduce((s, a) => s + a.openCredit, 0);
        const sumMoveD = e.ledgerAccounts.reduce((s, a) => s + a.moveDebit, 0);
        const sumMoveC = e.ledgerAccounts.reduce((s, a) => s + a.moveCredit, 0);
        const sumCloseD = e.ledgerAccounts.reduce((s, a) => s + a.closeDebit, 0);
        const sumCloseC = e.ledgerAccounts.reduce((s, a) => s + a.closeCredit, 0);
        return {
          subtitle: `Balance Générale à 6 Colonnes · Devise : ${officialCurrencyCode}`,
          kpiSummary: `Total Mouvements Débit : ${fmt(sumMoveD)}`,
          headers: [
            'Compte',
            'Intitulé du Compte',
            `Ouv. Débit / Crédit (${officialCurrencyCode})`,
            `Mouv. Débit / Crédit (${officialCurrencyCode})`,
            `Clôture Débit / Crédit (${officialCurrencyCode})`,
          ],
          rows: [
            ...e.ledgerAccounts.map((a) => [
              a.accountNumber,
              a.label,
              `${formatAmountSpaced(a.openDebit)} / ${formatAmountSpaced(a.openCredit)}`,
              `${formatAmountSpaced(a.moveDebit)} / ${formatAmountSpaced(a.moveCredit)}`,
              `${formatAmountSpaced(a.closeDebit)} / ${formatAmountSpaced(a.closeCredit)}`,
            ]),
            [
              'TOTAUX',
              'CONTRÔLE GÉNÉRAL DE LA BALANCE DES COMPTES',
              `${formatAmountSpaced(sumOpenD)} / ${formatAmountSpaced(sumOpenC)}`,
              `${formatAmountSpaced(sumMoveD)} / ${formatAmountSpaced(sumMoveC)}`,
              `${formatAmountSpaced(sumCloseD)} / ${formatAmountSpaced(sumCloseC)}`,
            ],
          ],
        };
      }

      case 'journal_centralisateur':
        return {
          subtitle: `Livre-Journal Centralisateur des Pièces Comptables · Devise : ${officialCurrencyCode}`,
          kpiSummary: `${e.journalEntries.length} Écritures Centralisées`,
          headers: [
            'Pièce / Date',
            'Journal',
            'Comptes (Débit → Crédit)',
            'Libellé de l’Écriture Comptable',
            `Montant (${officialCurrencyCode})`,
          ],
          rows: e.journalEntries.map((j) => [
            `${j.pieceRef} (${j.date})`,
            j.journalCode,
            `${j.accountDebit} → ${j.accountCredit}`,
            j.label,
            fmt(j.debit),
          ]),
        };

      case 'tableau_flux_tresorerie':
        return {
          subtitle: `Tableau des Flux de Trésorerie (TFT) · Devise : ${officialCurrencyCode}`,
          kpiSummary: `Trésorerie Nette Clôture : ${fmt(e.cashActif - e.bankOverdraftPassif)}`,
          headers: [
            'Rubrique TFT',
            'Nature des Flux de Trésorerie de la Période',
            'Catégorie',
            'Sens Flux',
            `Montant (${officialCurrencyCode})`,
          ],
          rows: [
            ['TFT-OUV', 'Trésorerie nette à l’ouverture de la période', 'Ouverture', 'Solde initial', fmt(e.openingCash)],
            ['TFT-CAF', 'Capacité d’Autofinancement Globale (Résultat Net + Dotations Amort.)', 'Exploitation', 'Entrée (+)', fmt(e.cafAutofinancement)],
            ['TFT-BFR', 'Variation du Besoin en Fonds de Roulement (Stocks, Clients, Fournisseurs)', 'Exploitation', e.variationBFR >= 0 ? 'Entrée (+)' : 'Sortie (-)', fmt(e.variationBFR)],
            ['TFT-EXP', 'FLUX NET DE TRÉSORERIE GÉNÉRÉ PAR L’ACTIVITÉ (A)', 'Sous-Total A', 'Flux A', fmt(e.cashFlowExploitation)],
            ['TFT-INV', 'Acquisitions et renouvellements d’immobilisations de chantier (B)', 'Investissement', 'Sortie (-)', fmt(e.cashFlowInvestissement)],
            ['TFT-FIN', 'Remboursements d’emprunts et mouvements financiers (C)', 'Financement', 'Sortie (-)', fmt(e.cashFlowFinancement)],
            ['TFT-VAR', 'VARIATION DE TRÉSORERIE DE LA PÉRIODE (A + B + C)', 'Variation', 'Delta', fmt(e.netCashVariation)],
            ['TFT-CLO', 'TRÉSORERIE NETTE À LA CLÔTURE DE LA PÉRIODE', 'Clôture', 'Solde final', fmt(e.cashActif - e.bankOverdraftPassif)],
          ],
        };

      case 'declaration_tva':
        return {
          subtitle: `Déclaration Officielle de TVA (${fiscalLawLabel}) · Taux légal : ${statutoryVatRate}%`,
          kpiSummary:
            e.netVatPayable > 0
              ? `TVA Nette à Décaisser : ${fmt(e.netVatPayable)}`
              : `Crédit de TVA Reportable : ${fmt(e.vatCredit)}`,
          headers: [
            'Ligne',
            'Nature des Opérations & Liquidation de la TVA',
            `Base HT (${officialCurrencyCode})`,
            'Taux Légal',
            `Taxe Liquidée (${officialCurrencyCode})`,
          ],
          rows: [
            ['L-01', 'Chiffre d’affaires global HT réalisé sur la période', fmt(e.revenueHT), '—', '—'],
            ['L-02', 'Opérations exonérées ou hors champ d’application de la TVA', fmt(e.exemptTurnoverHT), '0%', fmt(0)],
            ['L-03', `Chiffre d’affaires imposable à la TVA au taux normal (${countryName})`, fmt(e.taxableTurnoverHT), `${statutoryVatRate}%`, fmt(e.vatCollected)],
            ['L-04', 'TOTAL DE LA TVA BRUTE COLLECTÉE SUR FACTURES (A)', fmt(e.taxableTurnoverHT), `${statutoryVatRate}%`, fmt(e.vatCollected)],
            ['L-05', 'TVA déductible sur achats de matériels, fournitures et prestations (B)', fmt(e.totalPurchasesAndExternalChargesHT), `${statutoryVatRate}%`, fmt(e.vatDeductible)],
            ['L-06', 'TVA NETTE À PAYER AU TRÉSOR PUBLIC (A > B)', '—', 'À décaisser', fmt(e.netVatPayable)],
            ['L-07', 'CRÉDIT DE TVA À REPORTER SUR LA PÉRIODE SUIVANTE (B > A)', '—', 'Crédit reportable', fmt(e.vatCredit)],
          ],
        };

      case 'declaration_is_bic':
        return {
          subtitle: `Déclaration d’Impôt sur les Sociétés (IS / BIC / IMF) — ${countryName}`,
          kpiSummary: `Impôt IS/BIC Exigible : ${fmt(e.corporateTaxDue)}`,
          headers: [
            'Réf Fiscal',
            'Détermination du Résultat Fiscal & Calcul de l’IS / IMF',
            'Règle Fiscale',
            'Impact',
            `Montant (${officialCurrencyCode})`,
          ],
          rows: [
            ['IS-01', 'Résultat Comptable Courant Avant Impôt (RCAI)', 'Base Comptable', 'Point de départ', fmt(e.resultatCourantAvantImpot)],
            ['IS-02', 'Réintégrations fiscales (Charges non déductibles, amendes, quotes-parts)', 'CGI — Art. Réint.', 'Réintégration (+)', fmt(e.nonDeductibleReintegrations)],
            ['IS-03', 'Déductions fiscales autorisées & produits exonérés', 'CGI — Art. Déd.', 'Déduction (-)', fmt(e.fiscalDeductions)],
            ['IS-04', 'BÉNÉFICE FISCAL IMPOSABLE DE LA PÉRIODE', 'Assiette IS', 'Base Imposable', fmt(e.taxableFiscalProfit)],
            ['IS-05', `Impôt sur les Sociétés théorique au taux de droit commun (${e.corporateTaxRate}%)`, `${e.corporateTaxRate}%`, 'IS Calculé', fmt(e.theoreticalCorporateTax)],
            ['IS-06', 'Impôt Minimum Forfaitaire (IMF / Minimum de perception légal)', '1% CA HT (Min.)', 'Plancher Légal', fmt(e.minimumFlatTaxIMF)],
            ['IS-07', 'IMPÔT SUR LES SOCIÉTÉS DÉFINITIVEMENT DÛ AU TITRE DE LA PÉRIODE', 'Max(IS, IMF)', 'Net Exigible', fmt(e.corporateTaxDue)],
          ],
        };

      case 'declaration_paie_its_cnps':
        return {
          subtitle: `Déclaration Fiscale & Sociale sur Salaires (${employees.length} Salariés) · Devise : ${officialCurrencyCode}`,
          kpiSummary: `Total Prélèvements Sociaux & ITS : ${fmt(
            e.employeeSocialTotal + e.employerSocialTotal + e.payrollIncomeTaxTotal
          )}`,
          headers: [
            'Matricule / Salarié',
            'Fonction & Période',
            `Salaire Brut (${officialCurrencyCode})`,
            `Retenues Salariales & ITS (${officialCurrencyCode})`,
            `Charges Patronales (${officialCurrencyCode})`,
          ],
          rows: [
            ...payslips.map((ps) => [
              ps.employeeName,
              `${ps.roleTitle || ps.employeePosition || 'Collaborateur'} (${ps.periodMonth || ps.period || 'MENS'})`,
              fmt(ps.grossSalary),
              fmt((ps.employeeSocialContribution ?? ps.socialContribution ?? 0) + (ps.incomeTaxWithholding ?? ps.incomeTax ?? 0)),
              fmt(ps.employerSocialContribution ?? ps.employerCharges ?? 0),
            ]),
            [
              'TOTAL GÉNÉRAL',
              `Masse Salariale Consolidée (${payslips.length} bulletins)`,
              fmt(e.grossPayroll),
              fmt(e.employeeSocialTotal + e.payrollIncomeTaxTotal),
              fmt(e.employerSocialTotal),
            ],
          ],
        };

      case 'declaration_retenues_source':
        return {
          subtitle: `Déclaration des Retenues à la Source & Taxes Spécifiques (${countryName})`,
          kpiSummary: `Total Retenues & Taxes Spécifiques : ${fmt(
            e.withholdingTaxesCollected + e.additionalParafiscalTaxes
          )}`,
          headers: [
            'Code Taxe',
            'Intitulé de la Taxe / Retenue à la Source Légale',
            'Catégorie',
            'Taux / Règle',
            `Montant Liquidé (${officialCurrencyCode})`,
          ],
          rows: [
            ...availableCountryTaxes.map((tx) => {
              const base = e.revenueHT;
              const amount = Number(((base * (Number(tx.ratePct) || 0)) / 100).toFixed(2));
              return [
                tx.code,
                tx.label || tx.code,
                tx.category === 'withholding_tax' ? 'Retenue à la source' : 'Taxe / Prélèvement',
                `${tx.ratePct}% (${tx.legalReference || 'CGI'})`,
                fmt(amount),
              ];
            }),
            [
              'RET-DOC',
              'Retenues à la source effectivement imputées sur les factures de la période',
              'Retenues Facturées',
              'Réel Facturé',
              fmt(e.withholdingTaxesCollected),
            ],
          ],
        };

      case 'tableau_amortissements':
        return {
          subtitle: `Tableau Fiscal des Immobilisations & Amortissements (Classe 2) · Devise : ${officialCurrencyCode}`,
          kpiSummary: `Valeur Nette Comptable (VNC) : ${fmt(e.fixedAssetsNet)}`,
          headers: [
            'Code Actif',
            'Désignation de l’Immobilisation (Date Acq. & Taux)',
            `Valeur Brute (${officialCurrencyCode})`,
            `Dotation Période (${officialCurrencyCode})`,
            `V.N.C Clôture (${officialCurrencyCode})`,
          ],
          rows: [
            ...e.depreciationSchedule.map((d) => [
              d.assetCode,
              `${d.designation} (Acq. ${d.acquisitionDate} · ${d.ratePct}%/an)`,
              fmt(d.grossValue),
              fmt(d.periodDepr),
              fmt(d.netBookValue),
            ]),
            [
              'TOTAL IMMO',
              'CUMUL GÉNÉRAL DES IMMOBILISATIONS & AMORTISSEMENTS',
              fmt(e.fixedAssetsGross),
              fmt(e.periodDepreciation),
              fmt(e.fixedAssetsNet),
            ],
          ],
        };

      case 'liasse_fiscale_complete':
      default:
        return {
          subtitle: `Liasse Fiscale Consolidée Complète (12 États Financiers & Fiscaux) · Devise : ${officialCurrencyCode}`,
          kpiSummary: `Actif/Passif : ${fmt(e.totalActifNet)} · Résultat Net : ${fmt(
            e.resultatNetComptable
          )}`,
          headers: [
            'Code État',
            'Intitulé de l’État Financier ou Déclaration Fiscale',
            'Référence Légale',
            'Statut Conformité',
            `Indicateur Clé (${officialCurrencyCode})`,
          ],
          rows: [
            ['ÉTAT-01', 'Bilan Comptable Officiel (Actif = Passif)', accountingStandardLabel, 'Équilibré & Certifié', fmt(e.totalActifNet)],
            ['ÉTAT-02', 'Compte de Résultat & Soldes Intermédiaires de Gestion (SIG)', 'Classes 6, 7 & 8', 'Validé', fmt(e.resultatNetComptable)],
            ['ÉTAT-03', 'Grand Livre Général des Comptes', `${e.ledgerAccounts.length} comptes actifs`, 'Validé', fmt(e.revenueHT)],
            ['ÉTAT-04', 'Balance Générale des Comptes à 6 Colonnes', 'Contrôle Débit = Crédit', 'Équilibrée', fmt(e.totalInvoicedTTC)],
            ['ÉTAT-05', 'Livre-Journal Centralisateur (Ventes, Achats, Banque, Paie, OD)', `${e.journalEntries.length} pièces`, 'Clos & Horodaté', fmt(e.totalInvoicedTTC)],
            ['ÉTAT-06', 'Tableau des Flux de Trésorerie (TFT)', 'Flux A + B + C', 'Validé', fmt(e.cashActif - e.bankOverdraftPassif)],
            ['FISC-07', `Déclaration Périodique de TVA (${statutoryVatRate}%)`, fiscalLawLabel, 'Liquidée', fmt(e.netVatPayable)],
            ['FISC-08', 'Déclaration d’Impôt sur les Sociétés (IS / BIC / IMF)', 'Résultat Fiscal', 'Liquidée', fmt(e.corporateTaxDue)],
            ['SOC-09', 'Déclaration Fiscale & Sociale sur Salaires (ITS / CNPS / IPRES)', `${payslips.length} bulletins`, 'Liquidée', fmt(e.employeeSocialTotal + e.employerSocialTotal + e.payrollIncomeTaxTotal)],
            ['FISC-10', 'Déclaration des Retenues à la Source Tiers (AIRSI / AIB / BRS)', 'Retenues Tiers', 'Liquidée', fmt(e.withholdingTaxesCollected)],
            ['ÉTAT-11', 'Tableau Fiscal des Immobilisations & Amortissements', 'Classe 2 (VNC)', 'Validé', fmt(e.fixedAssetsNet)],
          ],
        };
    }
  };

  const activePayload = useMemo(
    () => buildDocumentTablePayload(selectedDocType),
    [selectedDocType, computedFinancialEngine, officialCurrencyCode]
  );

  // =========================================================================
  // EXPORT PDF OFFICIEL A4 D'UN ÉTAT COMPTABLE OU FISCAL
  // =========================================================================
  const handleExportOfficialDocPDF = (docType: OfficialAccountingFiscalDocType) => {
    const docMeta =
      OFFICIAL_ACCOUNTING_FISCAL_DOC_CATALOG.find((d) => d.id === docType) ||
      OFFICIAL_ACCOUNTING_FISCAL_DOC_CATALOG[0];
    const payload = buildDocumentTablePayload(docType);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const refNumber = `${docMeta.code}-${countryCode}-${periodEndDate.replace(/-/g, '')}`;

    // Bandeau officiel d'en-tête
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, 210, 36, 'F');
    pdf.setFillColor(245, 158, 11);
    pdf.rect(0, 36, 210, 1.5, 'F');

    let textStartX = 14;
    if (companyLogo && companyLogo.startsWith('data:image/')) {
      try {
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(14, 6, 22, 22, 2, 2, 'F');
        pdf.addImage(companyLogo, 'PNG', 15.5, 7.5, 19, 19);
        textStartX = 40;
      } catch {
        textStartX = 14;
      }
    }

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(companyName.toUpperCase(), textStartX, 13);

    pdf.setFontSize(8.5);
    pdf.setTextColor(253, 224, 71);
    pdf.text(`RÉFÉRENCE OFFICIELLE : ${refNumber}`, textStartX, 19);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(203, 213, 225);
    pdf.text(
      `Pays : ${countryName} (${countryCode}) · Devise Officielle ISO 4217 : ${officialCurrencyCode} (${currencyMeta.name})`,
      textStartX,
      25
    );
    pdf.text(
      `Cadre Légal : ${accountingStandardLabel} & ${fiscalLawLabel}`,
      textStartX,
      30.5
    );

    // Cadre de métadonnées de la période
    pdf.setDrawColor(203, 213, 225);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(14, 42, 182, 22, 2, 2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(docMeta.title.toUpperCase(), 18, 49);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Période réglementaire : ${periodLabel}`, 18, 55);
    pdf.text(`Base légale : ${docMeta.legalBasis}`, 18, 60.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 64, 175);
    pdf.text(payload.kpiSummary, 192, 55, { align: 'right' });

    autoTable(pdf, {
      startY: 68,
      head: [payload.headers],
      body: payload.rows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontSize: 7.8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [15, 23, 42],
        cellPadding: 2.3,
      },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold' },
        1: { cellWidth: 74 },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      },
    });

    const finalY =
      (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 180;
    const signY = Math.min(248, finalY + 10);

    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(14, signY, 88, 26, 2, 2, 'S');
    pdf.roundedRect(108, signY, 88, 26, 2, 2, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Visa Direction Administrative & Comptable', 18, signY + 6);
    pdf.text(`Visa Direction Générale — ${companyName}`, 112, signY + 6);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.2);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      `Certifié sincère et conforme au ${accountingStandardLabel}`,
      18,
      signY + 12
    );
    pdf.text(
      `Émis le ${new Date().toISOString().slice(0, 10)} en devise ${officialCurrencyCode}`,
      112,
      signY + 12
    );
    pdf.text(
      docCustomization?.signatoryName || docCustomization?.signatoryTitle || 'Le Dirigeant',
      112,
      signY + 21
    );

    pdf.save(`${docMeta.code}_${docType}_${periodEndDate}.pdf`);

    // Archive record
    const newArchive: GeneratedArchiveRecord = {
      id: `arch_${Date.now()}`,
      docType,
      title: docMeta.title,
      referenceNumber: refNumber,
      periodLabel,
      generatedAt: new Date().toLocaleString('fr-FR'),
      currencyCode: officialCurrencyCode,
      keyMetricLabel: payload.kpiSummary,
      keyMetricAmount: computedFinancialEngine.totalActifNet,
    };
    setGeneratedArchives((prev) => [newArchive, ...prev.slice(0, 19)]);
    const msg = `${docMeta.title} généré et téléchargé en PDF officiel (${officialCurrencyCode}).`;
    onTriggerToast?.(msg);
    onNotify?.('État Comptable & Fiscal Généré', msg);
  };

  // =========================================================================
  // EXPORT EXCEL (.XLSX) D'UN ÉTAT OU DU DOSSIER COMPLET (12 FEUILLES)
  // =========================================================================
  const handleExportOfficialDocExcel = (
    docType: OfficialAccountingFiscalDocType,
    exportAll12Sheets = false
  ) => {
    const wb = XLSX.utils.book_new();
    const typesToExport: OfficialAccountingFiscalDocType[] = exportAll12Sheets
      ? OFFICIAL_ACCOUNTING_FISCAL_DOC_CATALOG.map((d) => d.id)
      : [docType];

    typesToExport.forEach((tId) => {
      const meta =
        OFFICIAL_ACCOUNTING_FISCAL_DOC_CATALOG.find((d) => d.id === tId) ||
        OFFICIAL_ACCOUNTING_FISCAL_DOC_CATALOG[0];
      const payload = buildDocumentTablePayload(tId);
      const sheetRows = [
        [companyName.toUpperCase(), '', '', '', `DEVISE OFFICIELLE : ${officialCurrencyCode} (${currencyMeta.name})`],
        [meta.title.toUpperCase(), '', '', '', `Période : ${periodLabel}`],
        [payload.subtitle, '', '', '', payload.kpiSummary],
        [],
        payload.headers,
        ...payload.rows,
      ];
      const ws = XLSX.utils.aoa_to_sheet(sheetRows);
      const safeSheetName = `${meta.code}_${meta.shortTitle}`
        .replace(/[\\/?*[\]:]/g, '')
        .slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    });

    const fileName = exportAll12Sheets
      ? `Liasse_Comptable_Fiscale_12_Etats_${countryCode}_${periodEndDate}.xlsx`
      : `${currentDocMeta.code}_${docType}_${periodEndDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
    onTriggerToast?.(
      exportAll12Sheets
        ? `Dossier complet des 12 documents comptables & fiscaux exporté en Excel (${officialCurrencyCode}).`
        : `${currentDocMeta.shortTitle} exporté en Excel (.xlsx).`
    );
  };

  const filteredCatalog = OFFICIAL_ACCOUNTING_FISCAL_DOC_CATALOG.filter(
    (item) => categoryFilter === 'all' || item.category === categoryFilter
  );

  // =========================================================================
  // GÉNÉRATEUR AUTOMATIQUE DES DÉCLARATIONS FISCALES MENSUELLES & TRIMESTRIELLES
  // =========================================================================
  const [taxReturnCadence, setTaxReturnCadence] = useState<'Mensuelle' | 'Trimestrielle'>(
    'Mensuelle'
  );
  const [taxReturnYear, setTaxReturnYear] = useState<number>(() => new Date().getFullYear());
  const [taxReturnMonth, setTaxReturnMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [taxReturnQuarter, setTaxReturnQuarter] = useState<1 | 2 | 3 | 4>(1);
  const [taxReturnFormKind, setTaxReturnFormKind] = useState<
    'tva_ca' | 'is_acompte_retenues' | 'salaires_its_social' | 'synthese_unique'
  >('synthese_unique');

  const MONTH_NAMES_FR = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];

  const periodicTaxReturnEngine = useMemo(() => {
    let startStr = `${taxReturnYear}-01-01`;
    let endStr = `${taxReturnYear}-12-31`;
    let periodTitle = '';
    let deadlineLabel = '';

    if (taxReturnCadence === 'Mensuelle') {
      const mStr = String(taxReturnMonth).padStart(2, '0');
      const lastDay = new Date(taxReturnYear, taxReturnMonth, 0).getDate();
      startStr = `${taxReturnYear}-${mStr}-01`;
      endStr = `${taxReturnYear}-${mStr}-${String(lastDay).padStart(2, '0')}`;
      periodTitle = `Mois de ${MONTH_NAMES_FR[taxReturnMonth - 1]} ${taxReturnYear} (M${mStr}/${taxReturnYear})`;
      const nextMonth = taxReturnMonth === 12 ? 1 : taxReturnMonth + 1;
      const nextYear = taxReturnMonth === 12 ? taxReturnYear + 1 : taxReturnYear;
      deadlineLabel = `15 ${MONTH_NAMES_FR[nextMonth - 1]} ${nextYear}`;
    } else {
      const qStartMonth = (taxReturnQuarter - 1) * 3 + 1;
      const qEndMonth = taxReturnQuarter * 3;
      const lastDay = new Date(taxReturnYear, qEndMonth, 0).getDate();
      startStr = `${taxReturnYear}-${String(qStartMonth).padStart(2, '0')}-01`;
      endStr = `${taxReturnYear}-${String(qEndMonth).padStart(2, '0')}-${String(lastDay).padStart(
        2,
        '0'
      )}`;
      periodTitle = `Trimestre T${taxReturnQuarter} ${taxReturnYear} (${
        MONTH_NAMES_FR[qStartMonth - 1]
      } à ${MONTH_NAMES_FR[qEndMonth - 1]} ${taxReturnYear})`;
      const dueMonth = qEndMonth === 12 ? 1 : qEndMonth + 1;
      const dueYear = qEndMonth === 12 ? taxReturnYear + 1 : taxReturnYear;
      deadlineLabel = `15 ${MONTH_NAMES_FR[dueMonth - 1]} ${dueYear}`;
    }

    // Filter accounting documents, purchase orders, expenses and payslips strictly within the selected month/quarter
    const docsInPeriod = documents.filter((d) => {
      const dt = (d.issueDate || '').slice(0, 10);
      return (
        (d.docType === 'invoice' || d.docType === 'proforma') &&
        d.status !== 'cancelled' &&
        d.status !== 'draft' &&
        dt >= startStr &&
        dt <= endStr
      );
    });

    const posInPeriod = purchaseOrders.filter((po) => {
      const dt = (po.orderDate || '').slice(0, 10);
      return dt >= startStr && dt <= endStr;
    });

    const expensesInPeriod = expenses.filter((ex) => {
      const dt = (ex.expenseDate || '').slice(0, 10);
      return dt >= startStr && dt <= endStr;
    });

    const payslipsInPeriod = payslips.filter((p) => {
      const pMonth = (p.period || '').slice(0, 7);
      return pMonth >= startStr.slice(0, 7) && pMonth <= endStr.slice(0, 7);
    });

    const baseTurnoverHT = Number(
      docsInPeriod.reduce((s, d) => s + (Number(d.subtotal) || 0), 0).toFixed(2)
    );

    const taxableHT = Number(
      docsInPeriod
        .filter((d) => Number(d.taxRate) > 0)
        .reduce((s, d) => s + (Number(d.subtotal) || 0), 0)
        .toFixed(2)
    );

    const exemptHT = Math.max(0, Number((baseTurnoverHT - taxableHT).toFixed(2)));

    const vatCollected = Number(
      docsInPeriod.reduce((s, d) => s + (Number(d.taxAmount) || 0), 0).toFixed(2)
    );

    const periodPoVat = Number(
      posInPeriod.reduce((s, po) => s + (Number(po.vatAmount) || 0), 0).toFixed(2)
    );
    const periodExpTotal = Number(
      expensesInPeriod.reduce((s, ex) => s + (Number(ex.amount) || 0), 0).toFixed(2)
    );
    const periodExpVat = Number(
      (((periodExpTotal * statutoryVatRate) / (100 + statutoryVatRate)) * 0.6).toFixed(2)
    );
    const vatDeductiblePurchases = Number((periodPoVat + periodExpVat).toFixed(2));

    const netVatDue = Math.max(0, Number((vatCollected - vatDeductiblePurchases).toFixed(2)));
    const vatCreditCarry = Math.max(
      0,
      Number((vatDeductiblePurchases - vatCollected).toFixed(2))
    );

    const corporateTaxInstallment = Number((baseTurnoverHT * 0.022).toFixed(2));

    let periodWithholding = 0;
    docsInPeriod.forEach((docItem) => {
      (docItem.additionalTaxes || []).forEach((tx) => {
        if (tx.includeInCalculation && tx.sign === 'deduct') {
          periodWithholding += Number(tx.amount) || 0;
        }
      });
    });
    const withholdingTaxes = Number(
      Math.max(baseTurnoverHT * 0.015, periodWithholding).toFixed(2)
    );

    const payrollTaxesAndSocial = Number(
      payslipsInPeriod
        .reduce(
          (s, p) =>
            s +
            (Number(p.incomeTaxWithholding) || 0) +
            (Number(p.employeeSocialContribution) || 0) +
            (Number(p.employerSocialContribution) || 0),
          0
        )
        .toFixed(2)
    );

    const totalNetTaxPayable = Number(
      (
        netVatDue +
        corporateTaxInstallment +
        withholdingTaxes +
        payrollTaxesAndSocial
      ).toFixed(2)
    );

    const scaleFactor =
      taxReturnCadence.toLowerCase() === 'mensuelle'
        ? 1 / 12
        : taxReturnCadence.toLowerCase() === 'trimestrielle'
        ? 1 / 4
        : 1;

    const lines = [
      {
        code: 'DEC-01',
        rubrique: 'TVA & Taxes sur le Chiffre d’Affaires',
        label: 'Chiffre d’Affaires HT Imposable de la période',
        baseAmount: taxableHT,
        rateLabel: `${statutoryVatRate}%`,
        taxAmount: vatCollected,
      },
      {
        code: 'DEC-02',
        rubrique: 'TVA & Taxes sur le Chiffre d’Affaires',
        label: 'Opérations Exonérées ou Exportations HT',
        baseAmount: exemptHT,
        rateLabel: '0%',
        taxAmount: 0,
      },
      {
        code: 'DEC-03',
        rubrique: 'TVA Déductible sur Achats & Charges',
        label: 'TVA Récupérable sur Achats Matériaux, Équipements & Services',
        baseAmount: Number(
          (computedFinancialEngine.totalPurchasesAndExternalChargesHT * scaleFactor).toFixed(2)
        ),
        rateLabel: 'Déduction',
        taxAmount: -vatDeductiblePurchases,
      },
      {
        code: 'DEC-04',
        rubrique: 'Liquidation Nette TVA',
        label:
          netVatDue >= 0 && vatCreditCarry === 0
            ? 'TVA Nette à Décaisser au Trésor Public'
            : 'Crédit de TVA à Reporter',
        baseAmount: taxableHT,
        rateLabel: 'Liquidation',
        taxAmount: netVatDue,
      },
      {
        code: 'DEC-05',
        rubrique: 'Impôt sur les Sociétés & Acomptes (IS / BIC / IMF)',
        label: `Acompte Périodique IS / Minimum de Perception (${taxReturnCadence})`,
        baseAmount: baseTurnoverHT,
        rateLabel: '2.2% / IS',
        taxAmount: corporateTaxInstallment,
      },
      {
        code: 'DEC-06',
        rubrique: 'Retenues à la Source Tiers (AIR / TSR / AIB / BRS)',
        label: 'Retenues Fiscales Opérées sur Factures & Prestataires',
        baseAmount: baseTurnoverHT,
        rateLabel: '1.5% - 5.5%',
        taxAmount: withholdingTaxes,
      },
      {
        code: 'DEC-07',
        rubrique: 'Fiscalité Salariale & Cotisations Sociales',
        label: 'Impôts sur Salaires (ITS/IRPP) & Cotisations Sociales (CNPS/URSSAF)',
        baseAmount: Number((computedFinancialEngine.grossPayroll * scaleFactor).toFixed(2)),
        rateLabel: 'Barème',
        taxAmount: payrollTaxesAndSocial,
      },
    ];

    const filteredLines =
      taxReturnFormKind === 'tva_ca'
        ? lines.slice(0, 4)
        : taxReturnFormKind === 'is_acompte_retenues'
        ? lines.slice(4, 6)
        : taxReturnFormKind === 'salaires_its_social'
        ? lines.slice(6, 7)
        : lines;

    return {
      startStr,
      endStr,
      periodTitle,
      deadlineLabel,
      docsMatchCount: docsInPeriod.length,
      baseTurnoverHT,
      taxableHT,
      exemptHT,
      vatCollected,
      vatDeductiblePurchases,
      netVatDue,
      vatCreditCarry,
      corporateTaxInstallment,
      withholdingTaxes,
      payrollTaxesAndSocial,
      totalNetTaxPayable,
      lines: filteredLines,
      declarationRef: `DECL-${countryCode || 'INT'}-${
        taxReturnCadence === 'Mensuelle'
          ? `M${String(taxReturnMonth).padStart(2, '0')}`
          : `T${taxReturnQuarter}`
      }-${taxReturnYear}`,
    };
  }, [
    taxReturnCadence,
    taxReturnYear,
    taxReturnMonth,
    taxReturnQuarter,
    taxReturnFormKind,
    documents,
    computedFinancialEngine,
    statutoryVatRate,
    countryCode,
  ]);

  const handleExportPeriodicTaxDeclarationPDF = () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();

    // Header Banner
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pageW, 38, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(
      `BORDEREAU OFFICIEL DE DÉCLARATION FISCALE ${taxReturnCadence.toUpperCase()}`,
      14,
      14
    );
    pdf.setFontSize(9.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      `${companyName.toUpperCase()} · Pays : ${countryName} (${countryCode}) · Référentiel : ${fiscalLawLabel}`,
      14,
      22
    );
    pdf.setTextColor(52, 211, 153);
    pdf.text(
      `Réf : ${periodicTaxReturnEngine.declarationRef} · Période : ${periodicTaxReturnEngine.periodTitle} · Devise : ${officialCurrencyCode}`,
      14,
      30
    );

    // Summary Box
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(14, 43, pageW - 28, 24, 2, 2, 'FD');
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      `Chiffre d'Affaires HT : ${fmt(periodicTaxReturnEngine.baseTurnoverHT)}`,
      18,
      51
    );
    pdf.text(
      `TVA Nette à Payer : ${fmt(periodicTaxReturnEngine.netVatDue)}`,
      18,
      58
    );
    pdf.text(
      `Acompte IS & Retenues : ${fmt(
        periodicTaxReturnEngine.corporateTaxInstallment +
          periodicTaxReturnEngine.withholdingTaxes
      )}`,
      105,
      51
    );
    pdf.setTextColor(180, 83, 9);
    pdf.text(
      `TOTAL NET À PAYER : ${fmt(periodicTaxReturnEngine.totalNetTaxPayable)} (Échéance : ${periodicTaxReturnEngine.deadlineLabel})`,
      18,
      64
    );

    autoTable(pdf, {
      startY: 72,
      head: [
        [
          'Code',
          'Catégorie Fiscale',
          'Désignation de la Ligne Déclarative',
          `Base Imposable (${officialCurrencyCode})`,
          'Taux',
          `Montant Liquidé (${officialCurrencyCode})`,
        ],
      ],
      body: [
        ...periodicTaxReturnEngine.lines.map((l) => [
          l.code,
          l.rubrique,
          l.label,
          formatAmountSpaced(l.baseAmount),
          l.rateLabel,
          formatAmountSpaced(l.taxAmount),
        ]),
        [
          'TOTAL',
          'LIQUIDATION GLOBALE',
          `Total Net Exigible au titre de la déclaration (${periodicTaxReturnEngine.periodTitle})`,
          formatAmountSpaced(periodicTaxReturnEngine.baseTurnoverHT),
          'Officiel',
          formatAmountSpaced(periodicTaxReturnEngine.totalNetTaxPayable),
        ],
      ],
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 18, fontStyle: 'bold' },
        1: { cellWidth: 38 },
        2: { cellWidth: 56 },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      },
    });

    const finalY = (pdf as any).lastAutoTable?.finalY || 180;
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
      `Déclaration certifiée sincère et conforme aux écritures comptables (${accountingStandardLabel}).`,
      14,
      Math.min(265, finalY + 12)
    );
    pdf.text(
      `Visa & Cachet de la Direction / Expert-Comptable — Édité le ${new Date().toLocaleDateString('fr-FR')}`,
      14,
      Math.min(272, finalY + 19)
    );

    pdf.save(`${periodicTaxReturnEngine.declarationRef}_Officiel.pdf`);
    onTriggerToast?.(
      `Bordereau officiel ${periodicTaxReturnEngine.declarationRef} exporté en PDF.`
    );
  };

  // Export PDF de la synthèse annuelle de l'ensemble des soldes des classes comptables sur l'année fiscale courante
  const handleExportAnnualClassesSummaryPDF = () => {
    const currentFiscalYear = new Date().getFullYear();
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const classDefs = [
      { classNumber: 'Classe 1', title: 'Comptes de Ressources Durables & Capitaux Propres' },
      { classNumber: 'Classe 2', title: 'Comptes d’Actif Immobilisé (Immobilisations & Amortissements)' },
      { classNumber: 'Classe 3', title: 'Comptes de Stocks & En-cours Matériels' },
      { classNumber: 'Classe 4', title: 'Comptes de Tiers (Clients, Fournisseurs, Personnel, État)' },
      { classNumber: 'Classe 5', title: 'Comptes de Trésorerie (Banques & Mobile Money)' },
      { classNumber: 'Classe 6', title: 'Comptes de Charges des Activités Ordinaires' },
      { classNumber: 'Classe 7', title: 'Comptes de Produits des Activités Ordinaires' },
      { classNumber: 'Classe 8', title: 'Comptes des Autres Charges, Produits & Impôts sur Résultat' },
    ];

    const classSummaries = classDefs.map((cd) => {
      const matchingAccounts = computedFinancialEngine.ledgerAccounts.filter(
        (a) => a.classNumber === cd.classNumber
      );
      const debitTotal = matchingAccounts.reduce(
        (sum, a) => sum + (Number(a.openDebit) || 0) + (Number(a.moveDebit) || 0),
        0
      );
      const creditTotal = matchingAccounts.reduce(
        (sum, a) => sum + (Number(a.openCredit) || 0) + (Number(a.moveCredit) || 0),
        0
      );
      const netBalance = Number((creditTotal - debitTotal).toFixed(2));
      return {
        classNumber: cd.classNumber,
        title: cd.title,
        accountsCount: matchingAccounts.length,
        debitTotal: Number(debitTotal.toFixed(2)),
        creditTotal: Number(creditTotal.toFixed(2)),
        netBalance,
      };
    });

    const grandDebit = classSummaries.reduce((s, c) => s + c.debitTotal, 0);
    const grandCredit = classSummaries.reduce((s, c) => s + c.creditTotal, 0);
    const grandNet = Number((grandCredit - grandDebit).toFixed(2));

    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, 210, 38, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(companyName.toUpperCase(), 14, 15);
    pdf.setFontSize(9.5);
    pdf.setTextColor(251, 191, 36);
    pdf.text(
      `SYNTHÈSE ANNUELLE DES SOLDES DES CLASSES COMPTABLES — EXERCICE FISCAL ${currentFiscalYear}`,
      14,
      23
    );
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(203, 213, 225);
    pdf.text(
      `Norme : ${accountingStandardLabel} · Pays : ${countryName} · Devise : ${officialCurrencyCode} · Période : 01/01/${currentFiscalYear} au 31/12/${currentFiscalYear}`,
      14,
      31
    );

    autoTable(pdf, {
      startY: 46,
      head: [
        [
          'Classe Comptable',
          'Intitulé Officiel de la Classe',
          `Total Débit (${officialCurrencyCode})`,
          `Total Crédit (${officialCurrencyCode})`,
          `Solde Net (${officialCurrencyCode})`,
          'Sens du Solde',
        ],
      ],
      body: classSummaries.map((c) => [
        c.classNumber,
        c.title,
        formatAmountSpaced(c.debitTotal),
        formatAmountSpaced(c.creditTotal),
        formatAmountSpaced(c.netBalance),
        c.netBalance > 0 ? 'Créditeur' : c.netBalance < 0 ? 'Débiteur' : 'Équilibré',
      ]),
      foot: [
        [
          `TOTAL ${currentFiscalYear}`,
          'ENSEMBLE DES CLASSES COMPTABLES (1 À 8)',
          formatAmountSpaced(grandDebit),
          formatAmountSpaced(grandCredit),
          formatAmountSpaced(grandNet),
          grandNet >= 0 ? 'Créditeur' : 'Débiteur',
        ],
      ],
      styles: {
        fontSize: 8,
        cellPadding: 2.8,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: 'bold' },
        1: { cellWidth: 66 },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 22, halign: 'center' },
      },
    });

    const safeCompany = companyName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 28);
    pdf.save(`Synthese_Annuelle_Classes_Comptables_${safeCompany}_${currentFiscalYear}.pdf`);
    onTriggerToast?.(
      `Synthèse annuelle des soldes des classes comptables (${currentFiscalYear}) exportée en PDF.`
    );
    onNotify?.(
      'Synthèse Annuelle Exportée',
      `Récapitulatif PDF des classes comptables sur l'année fiscale ${currentFiscalYear}`
    );
  };

  const handleExportPeriodicTaxDeclarationExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      [
        `BORDEREAU OFFICIEL DE DÉCLARATION FISCALE ${taxReturnCadence.toUpperCase()}`,
        '',
        '',
        '',
        '',
        `Réf : ${periodicTaxReturnEngine.declarationRef}`,
      ],
      [
        `Entreprise : ${companyName}`,
        `Pays : ${countryName}`,
        `Période : ${periodicTaxReturnEngine.periodTitle}`,
        `Échéance : ${periodicTaxReturnEngine.deadlineLabel}`,
        '',
        `Devise : ${officialCurrencyCode}`,
      ],
      [],
      [
        'Code Ligne',
        'Catégorie Fiscale',
        'Libellé Officiel',
        `Base HT (${officialCurrencyCode})`,
        'Taux / Règle',
        `Montant Liquidé (${officialCurrencyCode})`,
      ],
      ...periodicTaxReturnEngine.lines.map((l) => [
        l.code,
        l.rubrique,
        l.label,
        l.baseAmount,
        l.rateLabel,
        l.taxAmount,
      ]),
      [],
      [
        'TOTAL-NET',
        'TRÉSOR PUBLIC',
        'Total Net à Décaisser',
        periodicTaxReturnEngine.baseTurnoverHT,
        'Officiel',
        periodicTaxReturnEngine.totalNetTaxPayable,
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Declaration_Fiscale');
    XLSX.writeFile(wb, `${periodicTaxReturnEngine.declarationRef}_Officiel.xlsx`);
    onTriggerToast?.(
      `Déclaration fiscale ${periodicTaxReturnEngine.declarationRef} exportée au format Excel (.xlsx).`
    );
  };

  const handleExportPeriodicTaxDeclarationXML = () => {
    const xmlLines = periodicTaxReturnEngine.lines
      .map(
        (l) =>
          `    <LigneDeclarative code="${l.code}" rubrique="${l.rubrique}">
      <Libelle>${l.label}</Libelle>
      <BaseImposable devise="${officialCurrencyCode}">${l.baseAmount}</BaseImposable>
      <Taux>${l.rateLabel}</Taux>
      <MontantLiquide devise="${officialCurrencyCode}">${l.taxAmount}</MontantLiquide>
    </LigneDeclarative>`
      )
      .join('\n');

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<TeledeclarationFiscaleOfficielle version="2.0" norme="${accountingStandardLabel}">
  <EnTete>
    <ReferenceDeclaration>${periodicTaxReturnEngine.declarationRef}</ReferenceDeclaration>
    <Contribuable>${companyName}</Contribuable>
    <Pays code="${countryCode}">${countryName}</Pays>
    <Periodicite>${taxReturnCadence}</Periodicite>
    <Periode debut="${periodicTaxReturnEngine.startStr}" fin="${periodicTaxReturnEngine.endStr}">${periodicTaxReturnEngine.periodTitle}</Periode>
    <DateEcheance>${periodicTaxReturnEngine.deadlineLabel}</DateEcheance>
    <DeviseISO4217>${officialCurrencyCode}</DeviseISO4217>
  </EnTete>
  <SyntheseLiquidation>
    <ChiffreAffairesHT>${periodicTaxReturnEngine.baseTurnoverHT}</ChiffreAffairesHT>
    <TVACollectee>${periodicTaxReturnEngine.vatCollected}</TVACollectee>
    <TVADeductible>${periodicTaxReturnEngine.vatDeductiblePurchases}</TVADeductible>
    <TVANetteAPayer>${periodicTaxReturnEngine.netVatDue}</TVANetteAPayer>
    <AcompteIS>${periodicTaxReturnEngine.corporateTaxInstallment}</AcompteIS>
    <RetenuesSource>${periodicTaxReturnEngine.withholdingTaxes}</RetenuesSource>
    <ImpotsSalairesEtSocial>${periodicTaxReturnEngine.payrollTaxesAndSocial}</ImpotsSalairesEtSocial>
    <TotalNetAPayer>${periodicTaxReturnEngine.totalNetTaxPayable}</TotalNetAPayer>
  </SyntheseLiquidation>
  <DetailLignes>
${xmlLines}
  </DetailLignes>
</TeledeclarationFiscaleOfficielle>`;

    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${periodicTaxReturnEngine.declarationRef}_EDI_Officiel.xml`;
    a.click();
    URL.revokeObjectURL(url);
    onTriggerToast?.(
      `Fichier de télé-déclaration officielle XML/EDI (${periodicTaxReturnEngine.declarationRef}) généré.`
    );
  };

  const handleAddManualAccountingEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryLabel.trim() || newEntryAmount <= 0) return;
    const entry = {
      pieceRef: `ECR-${new Date().getFullYear()}-${String(manualEntries.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      journalCode: newEntryJournal,
      accountDebit: newEntryDebitAcc,
      accountCredit: newEntryCreditAcc,
      label: `[Imputation Directe] ${newEntryLabel.trim()}`,
      debit: Number(newEntryAmount),
      credit: Number(newEntryAmount),
    };
    const next = [entry, ...manualEntries];
    setManualEntries(next);
    try {
      localStorage.setItem(manualEntriesKey, JSON.stringify(next));
    } catch {
      // ignore
    }
    setNewEntryLabel('');
    setNewEntryAmount(0);
    onTriggerToast?.(
      `Écriture comptable ${entry.pieceRef} (${formatAmountSpaced(entry.debit)} ${officialCurrencyCode}) imputée automatiquement dans le Livre-Journal, le Grand Livre, la Balance et les États Fiscaux.`
    );
  };

  const handlePrintAccountingJournalWithLetterhead = () => {
    const rowsHtml = computedFinancialEngine.journalEntries
      .map(
        (j) => `
        <tr>
          <td style="font-family:monospace;font-weight:700;">${j.pieceRef}</td>
          <td>${j.date}</td>
          <td><strong>${j.journalCode}</strong></td>
          <td>${j.accountDebit}</td>
          <td>${j.accountCredit}</td>
          <td>${j.label}</td>
          <td style="text-align:right;font-weight:700;">${formatAmountSpaced(j.debit)} ${officialCurrencyCode}</td>
          <td style="text-align:right;font-weight:700;">${formatAmountSpaced(j.credit)} ${officialCurrencyCode}</td>
        </tr>
      `
      )
      .join('');

    printOfficialDocumentWithLetterhead({
      letterhead,
      documentTitle: 'LIVRE-JOURNAL CENTRALISATEUR & ÉCRITURES COMPTABLES AUTOMATIQUES',
      documentReference: `JNL-AUTO-${new Date().getFullYear()}`,
      bodyHtml: `
        <table>
          <thead>
            <tr>
              <th>N° Pièce</th>
              <th>Date</th>
              <th>Journal</th>
              <th>Compte Débit</th>
              <th>Compte Crédit</th>
              <th>Libellé de l'Écriture Automatique</th>
              <th>Montant Débit</th>
              <th>Montant Crédit</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      `,
    });
  };

  return (
    <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-900/70 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
      {/* PAPIER ENTÊTE OFFICIEL DE L'ENTREPRISE APPLIQUÉ AUX DOCUMENTS COMPTABLES ET FISCAUX */}
      <OfficialCompanyLetterheadBanner
        letterhead={letterhead}
        documentTitle="ÉTATS COMPTABLES, LIVRE-JOURNAL & LIASSE FISCALE OFFICIELLE"
        documentRef={`COMPTA-${new Date().getFullYear()}-${countryCode || 'SYS'}`}
        compact
      />

      {/* MOTEUR D'IMPUTATION AUTOMATIQUE DES ÉCRITURES DANS TOUS LES DOCUMENTS COMPTABLES ET FISCAUX */}
      <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-extrabold uppercase">
                Synchronisation Comptable &amp; Fiscale Automatique Temps Réel
              </span>
              <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">
                {computedFinancialEngine.journalEntries.length} écritures générées et ventilées automatiquement
              </span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
              Injection Automatique des Écritures dans les 12 Documents Comptables &amp; Fiscaux
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Chaque facture, règlement client, bon de commande fournisseur, mouvement de stock, dépense projet et fiche de paie génère automatiquement ses écritures en partie double (Débit = Crédit) dans le Livre-Journal, le Grand Livre, la Balance à 6 colonnes, le Bilan, le Compte de Résultat et les Déclarations Fiscales.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrintAccountingJournalWithLetterhead}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer Livre-Journal sous Papier Entête</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleAddManualAccountingEntry} className="grid grid-cols-1 sm:grid-cols-6 gap-2 pt-2 border-t border-emerald-200/70 dark:border-emerald-900/50 text-xs">
          <select
            value={newEntryJournal}
            onChange={(e) => setNewEntryJournal(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-bold"
          >
            <option value="JNL-VEN">JNL-VEN (Ventes)</option>
            <option value="JNL-ACH">JNL-ACH (Achats)</option>
            <option value="JNL-TRES">JNL-TRES (Trésorerie)</option>
            <option value="JNL-PAI">JNL-PAI (Paie)</option>
            <option value="JNL-STK">JNL-STK (Stocks)</option>
            <option value="JNL-OD">JNL-OD (Op. Diverses)</option>
          </select>
          <input
            type="text"
            value={newEntryDebitAcc}
            onChange={(e) => setNewEntryDebitAcc(e.target.value)}
            placeholder="Compte Débit (ex: 601100)"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono"
          />
          <input
            type="text"
            value={newEntryCreditAcc}
            onChange={(e) => setNewEntryCreditAcc(e.target.value)}
            placeholder="Compte Crédit (ex: 521100)"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono"
          />
          <input
            type="text"
            value={newEntryLabel}
            onChange={(e) => setNewEntryLabel(e.target.value)}
            placeholder="Libellé de l'écriture à ventiler..."
            className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5"
          />
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              value={newEntryAmount || ''}
              onChange={(e) => setNewEntryAmount(Number(e.target.value))}
              placeholder={`Montant (${officialCurrencyCode})`}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono font-bold"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-extrabold shrink-0 cursor-pointer"
            >
              + Imputer
            </button>
          </div>
        </form>
      </div>

      {/* =====================================================================
          NOUVEAU : GÉNÉRATEUR AUTOMATIQUE DES DÉCLARATIONS FISCALES MENSUELLES & TRIMESTRIELLES AU FORMAT OFFICIEL
      ===================================================================== */}
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/70 bg-slate-50/80 dark:bg-slate-950/70 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-bold">
              <span>Télé-Déclaration Fiscale Automatisée (Mensuelle &amp; Trimestrielle)</span>
              <span>·</span>
              <span className="font-mono">{periodicTaxReturnEngine.declarationRef}</span>
              <span>·</span>
              <span>Échéance légale : {periodicTaxReturnEngine.deadlineLabel}</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Génération Automatique des Déclarations Fiscales Mensuelles et Trimestrielles au Format Officiel
            </h3>
            <p className="text-xs text-slate-500">
              Calcul automatique basé sur vos écritures comptables (TVA collectée, TVA déductible, acomptes IS/BIC, retenues à la source et charges fiscales/sociales sur salaires), prêt pour l&apos;export officiel PDF, Excel et XML/EDI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportPeriodicTaxDeclarationPDF}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Bordereau Officiel PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportPeriodicTaxDeclarationExcel}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Officiel Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handleExportPeriodicTaxDeclarationXML}
              className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Télé-déclaration XML / EDI</span>
            </button>
          </div>
        </div>

        {/* Sélecteurs de Périodicité (Mensuelle / Trimestrielle), Mois / Trimestre, Année et Formulaire */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Périodicité de la Déclaration
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              {(['Mensuelle', 'Trimestrielle'] as const).map((cad) => (
                <button
                  key={cad}
                  type="button"
                  onClick={() => setTaxReturnCadence(cad)}
                  className={`py-1.5 rounded-md font-bold transition cursor-pointer ${
                    taxReturnCadence === cad
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {cad}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {taxReturnCadence === 'Mensuelle' ? 'Mois Déclaré' : 'Trimestre Déclaré'}
            </label>
            {taxReturnCadence === 'Mensuelle' ? (
              <select
                value={taxReturnMonth}
                onChange={(e) => setTaxReturnMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-bold"
              >
                {MONTH_NAMES_FR.map((mName, idx) => (
                  <option key={mName} value={idx + 1}>
                    M{String(idx + 1).padStart(2, '0')} — {mName}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={taxReturnQuarter}
                onChange={(e) => setTaxReturnQuarter(Number(e.target.value) as 1 | 2 | 3 | 4)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-bold"
              >
                <option value={1}>1er Trimestre (T1 : Janvier – Mars)</option>
                <option value={2}>2ème Trimestre (T2 : Avril – Juin)</option>
                <option value={3}>3ème Trimestre (T3 : Juillet – Septembre)</option>
                <option value={4}>4ème Trimestre (T4 : Octobre – Décembre)</option>
              </select>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Exercice Fiscal
            </label>
            <select
              value={taxReturnYear}
              onChange={(e) => setTaxReturnYear(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono font-bold"
            >
              {[2026, 2025, 2024, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  Exercice {yr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Formulaire Officiel
            </label>
            <select
              value={taxReturnFormKind}
              onChange={(e) => setTaxReturnFormKind(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-semibold"
            >
              <option value="synthese_unique">
                Déclaration Fiscale Unifiée (TVA + IS + Retenues + Salaires)
              </option>
              <option value="tva_ca">Bordereau de TVA &amp; Chiffre d&apos;Affaires (CA3 / TVA)</option>
              <option value="is_acompte_retenues">
                Acomptes IS / IMF &amp; Retenues à la Source Tiers
              </option>
              <option value="salaires_its_social">
                Déclaration Fiscale &amp; Sociale sur Salaires (ITS / CNPS)
              </option>
            </select>
          </div>
        </div>

        {/* Synthèse Chiffrée de la Déclaration Mensuelle / Trimestrielle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 block">Base Imposable HT</span>
            <strong className="font-mono text-sm text-slate-900 dark:text-white tabular-nums">
              {fmt(periodicTaxReturnEngine.baseTurnoverHT)}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 block">
              TVA Collectée ({statutoryVatRate}%)
            </span>
            <strong className="font-mono text-sm text-blue-600 dark:text-blue-400 tabular-nums">
              {fmt(periodicTaxReturnEngine.vatCollected)}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 block">TVA Récupérable / Déductible</span>
            <strong className="font-mono text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
              {fmt(periodicTaxReturnEngine.vatDeductiblePurchases)}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 block">TVA Nette à Payer</span>
            <strong className="font-mono text-sm text-amber-600 dark:text-amber-400 tabular-nums">
              {fmt(periodicTaxReturnEngine.netVatDue)}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-indigo-950 text-white border border-indigo-700">
            <span className="text-[11px] text-indigo-300 block">Total Fiscal Net à Payer</span>
            <strong className="font-mono text-sm text-emerald-400 tabular-nums">
              {fmt(periodicTaxReturnEngine.totalNetTaxPayable)}
            </strong>
          </div>
        </div>

        {/* Tableau Officiel des Lignes de la Déclaration */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950 text-[10px] font-bold uppercase text-slate-500">
                <th className="py-2 px-3">Code</th>
                <th className="py-2 px-3">Rubrique Fiscale</th>
                <th className="py-2 px-3">Ligne Déclarative Officielle</th>
                <th className="py-2 px-3 text-right">Base HT ({officialCurrencyCode})</th>
                <th className="py-2 px-3 text-center">Taux</th>
                <th className="py-2 px-3 text-right">Impôt / Taxe Liquidé ({officialCurrencyCode})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
              {periodicTaxReturnEngine.lines.map((line) => (
                <tr key={line.code} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                    {line.code}
                  </td>
                  <td className="py-2 px-3 font-sans text-slate-600 dark:text-slate-400">
                    {line.rubrique}
                  </td>
                  <td className="py-2 px-3 font-sans font-semibold text-slate-900 dark:text-white">
                    {line.label}
                  </td>
                  <td className="py-2 px-3 text-right">{formatAmountSpaced(line.baseAmount)}</td>
                  <td className="py-2 px-3 text-center">{line.rateLabel}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                    {formatAmountSpaced(line.taxAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* En-tête du Centre de Génération Automatique des 12 Documents Comptables & Fiscaux */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Générateur Automatique Certifié — 12 États Comptables &amp; Déclarations Fiscales
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
              Devise Officielle ISO 4217 : {officialCurrencyCode} ({currencyMeta.name})
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
            Tous les Documents Comptables, Financiers, Fiscaux &amp; Sociaux Nécessaires ({countryName})
          </h3>
          <p className="text-xs text-slate-500 max-w-3xl">
            Génération instantanée à partir des écritures réelles des projets, devis, factures, achats, stocks et bulletins de paie selon le{' '}
            <strong>{accountingStandardLabel}</strong> et la{' '}
            <strong>{fiscalLawLabel}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportAnnualClassesSummaryPDF}
            className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Générer un fichier PDF récapitulatif de l'ensemble des soldes des classes comptables sur l'année fiscale courante"
          >
            <FileDown className="w-4 h-4" />
            <span>Exporter synthèse annuelle</span>
          </button>
          <button
            type="button"
            onClick={() => handleExportOfficialDocPDF(selectedDocType)}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileDown className="w-4 h-4" />
            <span>Télécharger « {currentDocMeta.shortTitle} » (PDF A4)</span>
          </button>
          <button
            type="button"
            onClick={() => handleExportOfficialDocExcel(selectedDocType, true)}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exporter Pack Complet des 12 États (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Filtres par catégorie réglementaire */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          {['all', 'Comptabilité Générale', 'Fiscalité & Impôts', 'Paie & Social', 'Liasse Consolidée'].map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat === 'all' ? 'Tous les Documents (12)' : cat}
              </button>
            )
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-500">
          Période active : <strong className="text-slate-900 dark:text-white">{periodLabel}</strong>
        </div>
      </div>

      {/* Grille de sélection des 12 types de documents comptables et fiscaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {filteredCatalog.map((item) => {
          const isSelected = selectedDocType === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setSelectedDocType(item.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-600'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-[10px] text-blue-700 dark:text-blue-400">
                    {item.code} · {item.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.frequency}</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white leading-snug">
                  {item.title}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800/70">
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setSelectedDocType(item.id);
                    handleExportOfficialDocPDF(item.id);
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-900 dark:bg-slate-800 hover:bg-blue-600 text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <FileDown className="w-3 h-3" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setSelectedDocType(item.id);
                    handleExportOfficialDocExcel(item.id, false);
                  }}
                  className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 text-slate-700 dark:text-slate-300 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>Excel</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Aperçu Interactif Officiel du Document Comptable / Fiscal Sélectionné */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-amber-400 uppercase">
              <span>[{currentDocMeta.code}]</span>
              <span>·</span>
              <span>{currentDocMeta.legalBasis}</span>
            </div>
            <h4 className="text-sm font-extrabold mt-0.5">{currentDocMeta.title}</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold text-emerald-300">
              {activePayload.kpiSummary}
            </span>
            <button
              type="button"
              onClick={() => handleExportOfficialDocPDF(selectedDocType)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / PDF A4</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                {activePayload.headers.map((h, i) => (
                  <th
                    key={i}
                    className={`py-2.5 px-3.5 ${i >= 2 ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
              {activePayload.rows.map((row, rIdx) => {
                const isSummaryRow =
                  String(row[0]).startsWith('TOTAL') ||
                  String(row[0]).startsWith('SIG-') &&
                    (String(row[0]).includes('VA') ||
                      String(row[0]).includes('EBE') ||
                      String(row[0]).includes('REX') ||
                      String(row[0]).includes('RCAI') ||
                      String(row[0]).includes('NET')) ||
                  String(row[0]) === 'L-04' ||
                  String(row[0]) === 'L-06' ||
                  String(row[0]) === 'IS-04' ||
                  String(row[0]) === 'IS-07' ||
                  String(row[0]) === 'TFT-EXP' ||
                  String(row[0]) === 'TFT-CLO';

                return (
                  <tr
                    key={rIdx}
                    className={
                      isSummaryRow
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 font-extrabold text-slate-900 dark:text-white'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-950/40'
                    }
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={`py-2.5 px-3.5 ${
                          cIdx === 0
                            ? 'text-blue-700 dark:text-blue-400 font-bold'
                            : cIdx === 1
                            ? 'font-sans text-slate-800 dark:text-slate-200'
                            : cIdx === 4
                            ? 'text-right font-bold text-slate-900 dark:text-white'
                            : 'text-right text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calendrier Fiscal Automatique & Journal des Liasses Générées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Calendrier Réglementaire des Échéances Fiscales &amp; Sociales ({countryName})</span>
            <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
              Devise : {officialCurrencyCode}
            </span>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
            <div className="py-2 flex items-center justify-between gap-2">
              <span>Déclaration Mensuelle de TVA ({statutoryVatRate}%) &amp; Retenues à la Source</span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                15 du mois suivant · {fmt(computedFinancialEngine.netVatPayable)}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between gap-2">
              <span>Déclaration Sociale &amp; Salariale (ITS / IRPP / CNPS / IPRES / URSSAF)</span>
              <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                15 du mois suivant ·{' '}
                {fmt(
                  computedFinancialEngine.employeeSocialTotal +
                    computedFinancialEngine.employerSocialTotal +
                    computedFinancialEngine.payrollIncomeTaxTotal
                )}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between gap-2">
              <span>Acompte Trimestriel / Solde Impôt sur les Sociétés (IS / BIC / IMF)</span>
              <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                Fin de trimestre · {fmt(computedFinancialEngine.corporateTaxDue)}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between gap-2">
              <span>Dépôt de la Liasse Fiscale Annuelle &amp; États Financiers Certifiés</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                Clôture d&apos;exercice · Actif Net {fmt(computedFinancialEngine.totalActifNet)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Historique des États &amp; Liasses Officiellement Générés</span>
            <span className="font-mono text-[11px] text-slate-500">
              {generatedArchives.length} archive(s)
            </span>
          </div>
          {generatedArchives.length === 0 ? (
            <p className="text-[11px] text-slate-500 py-4">
              Cliquez sur « PDF » ou « Télécharger » sur n&apos;importe lequel des 12 états ci-dessus pour archiver et horodater automatiquement la pièce comptable ou fiscale.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-36 overflow-y-auto text-[11px]">
              {generatedArchives.map((arch) => (
                <div key={arch.id} className="py-1.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {arch.referenceNumber}
                    </span>{' '}
                    — <strong className="text-slate-800 dark:text-slate-200">{arch.title}</strong>
                  </div>
                  <span className="font-mono text-slate-500 shrink-0">{arch.generatedAt}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

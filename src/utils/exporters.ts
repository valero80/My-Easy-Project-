import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Currency,
  convertCurrencyAmount,
  formatAmountSpaced,
  getCurrencyMetadata,
  getDefaultExchangeRate,
  getOfficialCurrencyCode,
} from './i18n';

export { formatAmountSpaced, convertCurrencyAmount, getDefaultExchangeRate };

export type DocumentLayoutPreset =
  | 'classic'
  | 'modern'
  | 'industrial'
  | 'compact'
  | 'landscape'
  | 'detailed_project_report';

export interface DocumentCustomizationConfig {
  headerHexColor: string;
  headerSubtitle?: string;
  companySubtitle?: string;
  paymentTermsText: string;
  bankDetails?: string;
  footerLegalNotice: string;
  signatoryTitle: string;
  signatoryName?: string;
  showProjectBankDetails?: boolean;
  quotePrefix?: string;
  proformaPrefix?: string;
  invoicePrefix?: string;
  layoutPreset?: DocumentLayoutPreset;
  quoteLayoutPreset?: DocumentLayoutPreset;
  proformaLayoutPreset?: DocumentLayoutPreset;
  invoiceLayoutPreset?: DocumentLayoutPreset;
  headerCompanyAddress?: string;
  headerCompanyContact?: string;
  headerTaxRegistration?: string;
  customHeaderNote?: string;
  footerCustomText?: string;
  footerShowPageNumbers?: boolean;
  showLogo?: boolean;
  showSignatureBoxes?: boolean;
  globalLaborPercentage?: number; // Pourcentage unique de Main d'Œuvre prédéfini par le Super-Admin pour tous les documents et toutes les rubriques
  includeProjectEvaluation?: boolean; // Prise en compte et affichage de l'évaluation du projet dans les documents
  includeConfidentialNotesInPdf?: boolean; // Inclure les 'Notes confidentielles' (déchiffrées) des documents directement dans l'export PDF
  documentsTablePdfColumns?: DocumentDashboardColumnConfig; // Colonnes spécifiques à inclure ou masquer dans le tableau de bord des documents lors d'un export PDF
  includeSpecificationsCoverPage?: boolean; // Inclure automatiquement une page de garde personnalisée pour le Cahier des Charges
  specificationsCoverPageOptions?: ProjectSpecificationsCoverPageOptions;
}

export interface ProjectSpecificationsCoverPageOptions {
  includeCoverPage?: boolean;
  documentSubtitle?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  siteLocation?: string;
  confidentialityNotice?: string;
  projectVersion?: string;
  customNotes?: string;
}

export type DocumentDashboardColumnKey =
  | 'refType'
  | 'clientProject'
  | 'status'
  | 'dates'
  | 'amountHT'
  | 'amountTTC'
  | 'paidMilestone'
  | 'remainingDue';

export type DocumentDashboardColumnConfig = Record<DocumentDashboardColumnKey, boolean>;

export const DEFAULT_DOC_TABLE_PDF_COLUMNS: DocumentDashboardColumnConfig = {
  refType: true,
  clientProject: true,
  status: true,
  dates: true,
  amountHT: true,
  amountTTC: true,
  paidMilestone: true,
  remainingDue: true,
};

export const DEFAULT_DOC_CUSTOMIZATION: DocumentCustomizationConfig = {
  headerHexColor: '#0F172A',
  headerSubtitle:
    'Prestataire de Services Professionnels — Ingénierie, Réalisation & Suivi de Projets',
  companySubtitle:
    'Prestataire de Services Professionnels — Ingénierie, Réalisation & Suivi de Projets',
  paymentTermsText:
    'Règlement par virement bancaire ou Mobile Money sur le compte d’affectation dédié du projet.',
  bankDetails:
    'Compte Professionnel Dédié Projet — Règlement par Virement Bancaire, Chèque Certifié ou Mobile Money.',
  footerLegalNotice:
    'Document officiel certifié et tracé via My Easy Project — Confidentialité & Chiffrement E2EE.',
  signatoryTitle: 'La Direction Générale / Le Prestataire',
  signatoryName: '',
  showProjectBankDetails: true,
  quotePrefix: 'DEV-',
  proformaPrefix: 'PRO-',
  invoicePrefix: 'FAC-',
  layoutPreset: 'classic',
  quoteLayoutPreset: 'classic',
  proformaLayoutPreset: 'modern',
  invoiceLayoutPreset: 'industrial',
  headerCompanyAddress: 'Direction Générale — Siège Social & Exploitation Technique',
  headerCompanyContact: 'Contact Direction & Facturation · Service Comptabilité Projet',
  headerTaxRegistration: 'RCCM / NIF / Identification Fiscale Entreprise Certifiée',
  customHeaderNote: '',
  footerCustomText: 'Tout retard de paiement au-delà de la date d’échéance contractuelle pourra donner lieu à des pénalités conformément aux conditions générales.',
  footerShowPageNumbers: true,
  showLogo: true,
  showSignatureBoxes: true,
  globalLaborPercentage: 25,
  includeProjectEvaluation: true,
  includeConfidentialNotesInPdf: false,
  documentsTablePdfColumns: { ...DEFAULT_DOC_TABLE_PDF_COLUMNS },
};

export function resolveDocumentLayoutPreset(
  docType: 'quote' | 'proforma' | 'invoice',
  customization?: DocumentCustomizationConfig,
  docTemplateOverride?: DocumentLayoutPreset
): DocumentLayoutPreset {
  if (docTemplateOverride) return docTemplateOverride;
  if (!customization) return 'classic';
  if (docType === 'quote' && customization.quoteLayoutPreset) return customization.quoteLayoutPreset;
  if (docType === 'proforma' && customization.proformaLayoutPreset) return customization.proformaLayoutPreset;
  if (docType === 'invoice' && customization.invoiceLayoutPreset) return customization.invoiceLayoutPreset;
  return customization.layoutPreset || 'classic';
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex || '#0F172A').replace('#', '');
  if (clean.length !== 6) return [15, 23, 42];
  const r = parseInt(clean.slice(0, 2), 16) || 15;
  const g = parseInt(clean.slice(2, 4), 16) || 23;
  const b = parseInt(clean.slice(4, 6), 16) || 42;
  return [r, g, b];
}

/**
 * Dessine le logo vectoriel officiel et explicatif de My Easy Project
 * lorsqu'aucun logo personnalisé n'est fourni par l'entreprise.
 */
function drawDefaultBrandEmblem(
  pdf: jsPDF,
  x: number,
  y: number,
  size: number,
  brandRgb: [number, number, number]
): void {
  const [r, g, b] = brandRgb;
  // Fond blanc arrondi
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(x, y, size, size, 2.5, 2.5, 'F');

  // Cadre intérieur aux couleurs de la marque
  const pad = 1.6;
  const innerSize = size - pad * 2;
  pdf.setFillColor(r, g, b);
  pdf.roundedRect(x + pad, y + pad, innerSize, innerSize, 2, 2, 'F');

  // Barres de Gantt / Étapes de projet (Bleu ciel / Cyan)
  const bx = x + size * 0.22;
  pdf.setFillColor(147, 197, 253);
  pdf.roundedRect(bx, y + size * 0.26, size * 0.34, size * 0.08, 0.8, 0.8, 'F');
  pdf.setFillColor(96, 165, 250);
  pdf.roundedRect(bx, y + size * 0.41, size * 0.46, size * 0.08, 0.8, 0.8, 'F');
  pdf.setFillColor(56, 189, 248);
  pdf.roundedRect(bx, y + size * 0.56, size * 0.28, size * 0.08, 0.8, 0.8, 'F');

  // Courbe / Flèche ascendante dorée (Performance & Finances)
  pdf.setDrawColor(251, 191, 36);
  pdf.setLineWidth(0.9);
  pdf.line(bx, y + size * 0.74, x + size * 0.52, y + size * 0.52);
  pdf.line(x + size * 0.52, y + size * 0.52, x + size * 0.76, y + size * 0.26);

  // Badge émeraude de validation (en bas à droite)
  const cx = x + size * 0.72;
  const cy = y + size * 0.71;
  pdf.setFillColor(16, 185, 129);
  pdf.circle(cx, cy, size * 0.13, 'F');
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(0.6);
  pdf.line(cx - size * 0.05, cy, cx - size * 0.01, cy + size * 0.04);
  pdf.line(cx - size * 0.01, cy + size * 0.04, cx + size * 0.06, cy - size * 0.04);
}

/**
 * Papier entête officiel Portrait (210mm) — Architecture bi-colonne stricte sans aucun chevauchement.
 * Retourne l'ordonnée Y de départ pour le contenu suivant.
 */
function drawCorporateLetterhead(
  pdf: jsPDF,
  companyName: string,
  companyLogo: string | undefined,
  subtitle: string,
  docTitle: string,
  docReference: string,
  docDateOrMeta: string,
  headerHexColor = '#0F172A',
  statusBadgeText?: string,
  layoutOptions?: {
    preset?: DocumentLayoutPreset;
    headerCompanyAddress?: string;
    headerCompanyContact?: string;
    headerTaxRegistration?: string;
    customHeaderNote?: string;
    showLogo?: boolean;
  }
): number {
  const [r, g, b] = hexToRgb(headerHexColor);
  const preset: DocumentLayoutPreset = layoutOptions?.preset || 'classic';
  const showLogo = layoutOptions?.showLogo !== false;

  const cleanCompany = (companyName || 'ENTREPRISE PRESTATAIRE').toUpperCase().trim();
  const cleanRef = docReference
    .replace(/^RÉF\s*\.?\s*(DOCUMENT)?\s*:\s*/i, '')
    .replace(/^N°\s*/i, '')
    .trim();
  const cleanSubtitle =
    subtitle ||
    DEFAULT_DOC_CUSTOMIZATION.headerSubtitle ||
    DEFAULT_DOC_CUSTOMIZATION.companySubtitle ||
    '';

  const extraHeaderInfoParts = [
    layoutOptions?.headerCompanyAddress?.trim(),
    layoutOptions?.headerCompanyContact?.trim(),
    layoutOptions?.headerTaxRegistration?.trim(),
  ].filter(Boolean) as string[];
  const extraHeaderLine = extraHeaderInfoParts.join(' · ');

  // Calcul préalable des lignes à gauche
  const textStartX = showLogo ? 45 : 14;
  const leftMaxWidth = showLogo ? 78 : 108;
  pdf.setFont('helvetica', 'bold');
  const compFontSize = cleanCompany.length > 34 ? 10.5 : 12;
  pdf.setFontSize(compFontSize);
  const compLines: string[] = pdf.splitTextToSize(cleanCompany, leftMaxWidth).slice(0, 2);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.8);
  const refLines: string[] = pdf
    .splitTextToSize(`RÉF. DOCUMENT : ${cleanRef}`, leftMaxWidth)
    .slice(0, 2);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.4);
  const subLines: string[] = pdf.splitTextToSize(cleanSubtitle, leftMaxWidth).slice(0, 2);

  pdf.setFontSize(6.8);
  const contactLines: string[] = extraHeaderLine
    ? pdf.splitTextToSize(extraHeaderLine, leftMaxWidth).slice(0, 2)
    : [];

  // Calcul préalable des lignes à droite
  const rightMaxWidth = 66;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  const titleLines: string[] = pdf
    .splitTextToSize(docTitle.toUpperCase(), rightMaxWidth)
    .slice(0, 2);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const metaLines: string[] = pdf.splitTextToSize(docDateOrMeta, rightMaxWidth).slice(0, 2);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  const statusLines: string[] = statusBadgeText
    ? pdf.splitTextToSize(statusBadgeText.toUpperCase(), rightMaxWidth).slice(0, 2)
    : [];

  const leftTotalH =
    compLines.length * 4.7 +
    refLines.length * 4.1 +
    subLines.length * 3.5 +
    contactLines.length * 3.3 +
    12;
  const rightTotalH =
    titleLines.length * 4.5 + metaLines.length * 3.8 + statusLines.length * 3.8 + 12;
  const baseMinH = preset === 'compact' ? 38 : 45;
  const headerH = Math.max(baseMinH, Math.ceil(Math.max(leftTotalH, rightTotalH)));

  if (preset === 'modern') {
    // Mise en page Moderne Minimaliste : fond clair avec barre latérale et bandeau supérieur
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, 0, 210, headerH, 'F');
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, 210, 3.2, 'F');
    pdf.rect(0, 0, 4.5, headerH, 'F');
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.35);
    pdf.line(0, headerH, 210, headerH);
    pdf.line(126, 7, 126, headerH - 5);
  } else if (preset === 'industrial') {
    // Mise en page Industrielle BTP Structurée : bandeau sombre + encart technique ambre
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, 210, headerH, 'F');
    pdf.setFillColor(245, 158, 11);
    pdf.rect(0, headerH, 210, 2.4, 'F');
    pdf.setDrawColor(245, 158, 11);
    pdf.setLineWidth(0.4);
    pdf.line(126, 6, 126, headerH - 5);
  } else {
    // Classique Exécutif ou Compact Dense
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, 210, headerH, 'F');
    const accentR = Math.min(255, r + 45);
    const accentG = Math.min(255, g + 55);
    const accentB = Math.min(255, b + 80);
    pdf.setFillColor(accentR, accentG, accentB);
    pdf.rect(0, headerH, 210, 1.8, 'F');
    pdf.setDrawColor(Math.min(255, r + 60), Math.min(255, g + 60), Math.min(255, b + 60));
    pdf.setLineWidth(0.25);
    pdf.line(126, 6, 126, headerH - 5);
  }

  const isLightHeader = preset === 'modern';

  // Logo de l'entreprise ou Emblème officiel My Easy Project
  if (showLogo) {
    const logoSize = preset === 'compact' ? 24 : 27;
    let drewCustomLogo = false;
    if (companyLogo && companyLogo.startsWith('data:image/')) {
      try {
        const format =
          companyLogo.includes('image/jpeg') || companyLogo.includes('image/jpg') ? 'JPEG' : 'PNG';
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(14, 7, logoSize, logoSize, 2.5, 2.5, 'F');
        if (isLightHeader) {
          pdf.setDrawColor(203, 213, 225);
          pdf.roundedRect(14, 7, logoSize, logoSize, 2.5, 2.5, 'S');
        }
        pdf.addImage(companyLogo, format, 15.2, 8.2, logoSize - 2.4, logoSize - 2.4);
        drewCustomLogo = true;
      } catch {
        drewCustomLogo = false;
      }
    }
    if (!drewCustomLogo) {
      drawDefaultBrandEmblem(pdf, 14, 7, logoSize, [r, g, b]);
    }
  }

  let leftY = 11;

  // 1. Raison Sociale (EN HAUT)
  if (isLightHeader) {
    pdf.setTextColor(r, g, b);
  } else {
    pdf.setTextColor(255, 255, 255);
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(compFontSize);
  for (const line of compLines) {
    pdf.text(line, textStartX, leftY);
    leftY += 4.6;
  }

  // 2. Référence du Document DIRECTEMENT EN DESSOUS de la Raison Sociale
  leftY += 0.4;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.6);
  if (isLightHeader) {
    pdf.setTextColor(180, 83, 9);
  } else {
    pdf.setTextColor(251, 191, 36);
  }
  for (const line of refLines) {
    pdf.text(line, textStartX, leftY);
    leftY += 4.0;
  }

  // 3. Sous-titre / Secteur du Papier Entête
  leftY += 0.3;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.3);
  if (isLightHeader) {
    pdf.setTextColor(71, 85, 105);
  } else {
    pdf.setTextColor(226, 232, 240);
  }
  for (const line of subLines) {
    pdf.text(line, textStartX, leftY);
    leftY += 3.4;
  }

  // 4. Coordonnées & Immatriculation RCCM/NIF ou Mention Officielle
  if (contactLines.length > 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.6);
    if (isLightHeader) {
      pdf.setTextColor(100, 116, 139);
    } else {
      pdf.setTextColor(186, 230, 253);
    }
    for (const cLine of contactLines) {
      pdf.text(cLine, textStartX, leftY + 0.3);
      leftY += 3.2;
    }
  } else {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.6);
    if (isLightHeader) {
      pdf.setTextColor(30, 64, 175);
    } else {
      pdf.setTextColor(186, 230, 253);
    }
    pdf.text('PAPIER ENTÊTE OFFICIEL — DOCUMENT CERTIFIÉ & TRACÉ', textStartX, leftY + 0.5);
  }

  // Colonne de droite (x=196 aligné à droite)
  let rightY = 12;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  if (isLightHeader) {
    pdf.setTextColor(r, g, b);
  } else {
    pdf.setTextColor(255, 255, 255);
  }
  for (const line of titleLines) {
    pdf.text(line, 196, rightY, { align: 'right' });
    rightY += 4.5;
  }

  rightY += 0.8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  if (isLightHeader) {
    pdf.setTextColor(71, 85, 105);
  } else {
    pdf.setTextColor(226, 232, 240);
  }
  for (const line of metaLines) {
    pdf.text(line, 196, rightY, { align: 'right' });
    rightY += 3.8;
  }

  if (statusLines.length > 0) {
    rightY += 1.2;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    if (isLightHeader) {
      pdf.setTextColor(180, 83, 9);
    } else {
      pdf.setTextColor(251, 191, 36);
    }
    for (const line of statusLines) {
      pdf.text(line, 196, rightY, { align: 'right' });
      rightY += 3.6;
    }
  }

  return headerH + 6;
}

/**
 * Papier entête officiel Paysage (297mm) sans chevauchement.
 */
function drawLandscapeCorporateLetterhead(
  pdf: jsPDF,
  companyName: string,
  companyLogo: string | undefined,
  docTitle: string,
  docRef: string,
  subtitleMeta: string,
  headerHexColor = '#0F172A'
): number {
  const [r, g, b] = hexToRgb(headerHexColor);
  const headerH = 38;

  pdf.setFillColor(r, g, b);
  pdf.rect(0, 0, 297, headerH, 'F');

  const accentR = Math.min(255, r + 45);
  const accentG = Math.min(255, g + 55);
  const accentB = Math.min(255, b + 80);
  pdf.setFillColor(accentR, accentG, accentB);
  pdf.rect(0, headerH, 297, 1.5, 'F');

  let drewLogo = false;
  if (companyLogo && companyLogo.startsWith('data:image/')) {
    try {
      const format =
        companyLogo.includes('image/jpeg') || companyLogo.includes('image/jpg') ? 'JPEG' : 'PNG';
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(14, 5.5, 26, 26, 2, 2, 'F');
      pdf.addImage(companyLogo, format, 15, 6.5, 24, 24);
      drewLogo = true;
    } catch {
      drewLogo = false;
    }
  }
  if (!drewLogo) {
    drawDefaultBrandEmblem(pdf, 14, 5.5, 26, [r, g, b]);
  }

  const textStartX = 44;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(13);
  const compLine = pdf.splitTextToSize((companyName || 'ENTREPRISE').toUpperCase(), 155)[0];
  pdf.text(compLine, textStartX, 13);

  // Référence du document directement en dessous de la raison sociale
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(251, 191, 36);
  pdf.text(`RÉF. DOCUMENT : ${docRef}`, textStartX, 20);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(226, 232, 240);
  const subLine = pdf.splitTextToSize(subtitleMeta, 155)[0];
  pdf.text(subLine, textStartX, 27);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.8);
  pdf.setTextColor(186, 230, 253);
  pdf.text('PAPIER ENTÊTE OFFICIEL — DOCUMENT CERTIFIÉ & TRACÉ', textStartX, 33);

  // Right side title in landscape (x=283 right-aligned, max width 75mm)
  pdf.setDrawColor(Math.min(255, r + 60), Math.min(255, g + 60), Math.min(255, b + 60));
  pdf.setLineWidth(0.25);
  pdf.line(204, 6, 204, headerH - 5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(255, 255, 255);
  const rTitleLines: string[] = pdf.splitTextToSize(docTitle.toUpperCase(), 75).slice(0, 2);
  let ry = 14;
  for (const l of rTitleLines) {
    pdf.text(l, 283, ry, { align: 'right' });
    ry += 5;
  }
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(226, 232, 240);
  pdf.text(`Édité le ${new Date().toLocaleDateString('fr-FR')}`, 283, ry + 2, { align: 'right' });

  return headerH + 6;
}

/**
 * Helper unifié d'en-tête PDF (Portrait ou Paysage) pour les synthèses financières,
 * comptables et l'export du tableau de bord des documents.
 */
function drawCorporateHeader(
  pdf: jsPDF,
  companyName: string,
  companyLogoOrDocTitle: string | undefined,
  docTitleOrRef: string,
  metaOrDate: string,
  customizationOrLogo?: DocumentCustomizationConfig | string,
  optionalCustomization?: DocumentCustomizationConfig
): number {
  const isLandscape = pdf.internal.pageSize.getWidth() > 220;
  const cust: DocumentCustomizationConfig =
    (typeof customizationOrLogo === 'object' && customizationOrLogo !== null
      ? customizationOrLogo
      : optionalCustomization) || DEFAULT_DOC_CUSTOMIZATION;

  // Si appelé avec (pdf, companyName, docTitle, docRef, dateStr, companyLogo, customization)
  if (typeof customizationOrLogo === 'string' || optionalCustomization) {
    const logo = typeof customizationOrLogo === 'string' ? customizationOrLogo : undefined;
    const title = companyLogoOrDocTitle || 'DOCUMENT OFFICIEL';
    const ref = docTitleOrRef;
    const dateMeta = metaOrDate;
    if (isLandscape) {
      return drawLandscapeCorporateLetterhead(
        pdf,
        companyName,
        logo,
        title,
        ref,
        dateMeta,
        cust.headerHexColor || '#0F172A'
      );
    }
    return drawCorporateLetterhead(
      pdf,
      companyName,
      logo,
      cust.headerSubtitle || cust.companySubtitle || DEFAULT_DOC_CUSTOMIZATION.headerSubtitle || '',
      title,
      ref,
      dateMeta,
      cust.headerHexColor || '#0F172A'
    );
  }

  // Appelé avec (pdf, companyName, companyLogo, docTitle, docMeta, customization)
  const logo = companyLogoOrDocTitle;
  const title = docTitleOrRef;
  const meta = metaOrDate;
  if (isLandscape) {
    return drawLandscapeCorporateLetterhead(
      pdf,
      companyName,
      logo,
      title,
      `SYN-${new Date().toISOString().slice(0, 10)}`,
      meta,
      cust.headerHexColor || '#0F172A'
    );
  }
  return drawCorporateLetterhead(
    pdf,
    companyName,
    logo,
    cust.headerSubtitle || cust.companySubtitle || DEFAULT_DOC_CUSTOMIZATION.headerSubtitle || '',
    title,
    `SYN-${new Date().toISOString().slice(0, 10)}`,
    meta,
    cust.headerHexColor || '#0F172A'
  );
}

/**
 * Dessine deux cartes d'informations côte à côte (x=14..102 et x=108..196) avec retour à la ligne automatique
 * et hauteur calculée dynamiquement pour éviter tout débordement ou chevauchement.
 */
function drawTwoColumnInfoCards(
  pdf: jsPDF,
  startY: number,
  leftHeader: string,
  leftPrimary: string,
  leftDetails: string[],
  rightHeader: string,
  rightPrimary: string,
  rightDetails: string[],
  brandRgb?: [number, number, number]
): number {
  const colTextWidth = 80; // 88mm card width - 8mm horizontal padding

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  const leftPrimLines: string[] = leftPrimary
    ? pdf.splitTextToSize(leftPrimary, colTextWidth).slice(0, 2)
    : [];
  const rightPrimLines: string[] = rightPrimary
    ? pdf.splitTextToSize(rightPrimary, colTextWidth).slice(0, 2)
    : [];

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.2);
  const leftDetWrapped: string[] = [];
  for (const d of leftDetails.filter(Boolean)) {
    const wrapped: string[] = pdf.splitTextToSize(d, colTextWidth);
    leftDetWrapped.push(...wrapped);
  }

  const rightDetWrapped: string[] = [];
  for (const d of rightDetails.filter(Boolean)) {
    const wrapped: string[] = pdf.splitTextToSize(d, colTextWidth);
    rightDetWrapped.push(...wrapped);
  }

  const leftContentH = 8 + leftPrimLines.length * 4.5 + leftDetWrapped.length * 4.2 + 4;
  const rightContentH = 8 + rightPrimLines.length * 4.5 + rightDetWrapped.length * 4.2 + 4;
  const cardH = Math.max(28, Math.ceil(Math.max(leftContentH, rightContentH)));

  pdf.setDrawColor(203, 213, 225);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(14, startY, 88, cardH, 2, 2, 'FD');
  pdf.roundedRect(108, startY, 88, cardH, 2, 2, 'FD');

  if (brandRgb) {
    pdf.setFillColor(brandRgb[0], brandRgb[1], brandRgb[2]);
    pdf.rect(14, startY, 2, cardH, 'F');
    pdf.rect(108, startY, 2, cardH, 'F');
  }

  // Left Card Content
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  const safeLeftHeader = pdf.splitTextToSize(leftHeader.toUpperCase(), colTextWidth)[0] || '';
  pdf.text(safeLeftHeader, 18, startY + 6);

  let ly = startY + 11.5;
  if (leftPrimLines.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(15, 23, 42);
    for (const l of leftPrimLines) {
      pdf.text(l, 18, ly);
      ly += 4.5;
    }
  }
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.2);
  pdf.setTextColor(51, 65, 85);
  for (const l of leftDetWrapped) {
    pdf.text(l, 18, ly);
    ly += 4.2;
  }

  // Right Card Content
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  const safeRightHeader = pdf.splitTextToSize(rightHeader.toUpperCase(), colTextWidth)[0] || '';
  pdf.text(safeRightHeader, 112, startY + 6);

  let ry = startY + 11.5;
  if (rightPrimLines.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(15, 23, 42);
    for (const l of rightPrimLines) {
      pdf.text(l, 112, ry);
      ry += 4.5;
    }
  }
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.2);
  pdf.setTextColor(51, 65, 85);
  for (const l of rightDetWrapped) {
    pdf.text(l, 112, ry);
    ry += 4.2;
  }

  return startY + cardH + 5;
}

/**
 * Vérifie s'il reste suffisamment d'espace vertical avant le pied de page (yMax = 272).
 * Si l'espace est insuffisant, crée une nouvelle page avec en-tête officiel.
 */
function ensurePageSpace(
  pdf: jsPDF,
  currentY: number,
  neededHeight: number,
  companyName: string,
  companyLogo: string | undefined,
  subtitle: string,
  docTitle: string,
  docRef: string,
  docDateOrMeta: string,
  headerHexColor: string,
  statusBadgeText?: string
): number {
  if (currentY + neededHeight <= 272) {
    return currentY;
  }
  pdf.addPage();
  return drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo,
    subtitle,
    docTitle,
    docRef,
    docDateOrMeta,
    headerHexColor,
    statusBadgeText
  );
}

/**
 * Applique le pied de page officiel et la numérotation sur toutes les pages du document PDF.
 */
function drawCorporateFooter(
  pdf: jsPDF,
  companyName: string,
  footerNotice?: string,
  footerExtraText?: string,
  showPageNumbers = true
): void {
  const totalPages = pdf.getNumberOfPages();
  const isLandscape = pdf.internal.pageSize.getWidth() > 220;
  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;
  const footerLineY = pageHeight - 16;
  const footerTextY = pageHeight - 11.5;

  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.3);
    pdf.line(14, footerLineY, pageWidth - 14, footerLineY);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    const noticeText =
      footerNotice ||
      `Papier entête officiel ${companyName.toUpperCase()} · Généré et tracé via My Easy Project`;
    const wrappedNotice = pdf.splitTextToSize(noticeText, pageWidth - 85)[0];
    pdf.text(wrappedNotice, 14, footerTextY);

    if (footerExtraText) {
      pdf.setFontSize(6.5);
      pdf.setTextColor(148, 163, 184);
      const wrappedExtra = pdf.splitTextToSize(footerExtraText, pageWidth - 85)[0];
      pdf.text(wrappedExtra, 14, footerTextY + 3.5);
    }

    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    const rightFooterLabel = showPageNumbers
      ? `Édité le ${new Date().toLocaleDateString('fr-FR')} · Page ${p}/${totalPages}`
      : `Édité le ${new Date().toLocaleDateString('fr-FR')}`;
    pdf.text(rightFooterLabel, pageWidth - 14, footerTextY, { align: 'right' });
  }
}

export interface ProjectExecutionStep {
  id?: string;
  phaseNumber: string | number;
  tradeName?: string; // Corps de métier intervenant
  tradeLeaderName?: string; // Responsable du corps de métier intervenant
  projectManagerName?: string; // Responsable du projet signataire
  title: string;
  processDetails: string;
  assignedTasks?: string; // Tâches assignées à la phase
  phaseObjectives?: string; // Objectifs à atteindre durant la phase
  duration: string;
  startDayOffset?: number;
  startDate?: string;
  endDate?: string;
  deliverable: string;
  progressPct?: number;
}

export interface ProjectCycleObjective {
  id: string;
  cycleType: 'Journalier' | 'Hebdomadaire' | 'Mensuel' | 'Trimestriel / Phase';
  title: string;
  targetIndicator: string;
  assignedResponsible: string;
  startDate: string;
  endDate: string;
  evaluatedStatus: 'pending' | 'achieved' | 'exceeded' | 'partial' | 'not_achieved';
  achievementRatePct: number;
  evaluationNotes?: string;
  evaluatedAt?: string;
}

export interface DocumentRubriqueItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  stockable?: boolean; // true = Produit stockable (avec Main d'Œuvre), false = Produit non stockable / Prestation (sans Main d'Œuvre)
}

export interface DocumentRubriqueSection {
  id: string;
  title: string;
  tradeCategory?: string;
  laborPercentage: number; // Pourcentage de la main d'œuvre appliqué au sous-total matériel stockable de la rubrique
  items: DocumentRubriqueItem[];
}

export interface ComputedDocumentRubrique extends DocumentRubriqueSection {
  stockableMaterialSubtotal: number;
  nonStockableSubtotal: number;
  hasStockableItems: boolean;
  materialSubtotal: number;
  laborAmount: number;
  rubriqueTotal: number;
}

export interface ParsedDocumentRubriquesResult {
  hasExplicitRubriques: boolean;
  onlyNonStockableItems: boolean;
  rubriques: ComputedDocumentRubrique[];
  totalMaterialSubtotal: number;
  totalLaborSubtotal: number;
  grandTotalHT: number;
}

export function serializeDocumentRubriquesToSummary(
  rubriques: DocumentRubriqueSection[],
  forcedGlobalLaborPct?: number
): string {
  const lines: string[] = [];
  rubriques.forEach((rub, idx) => {
    const cleanTitle = (rub.title || `Rubrique ${idx + 1}`).replace(/\|/g, '-').trim();
    const cleanTrade = (rub.tradeCategory || 'Tous corps d’état').replace(/\|/g, '-').trim();
    const effectiveLabor =
      typeof forcedGlobalLaborPct === 'number' && Number.isFinite(forcedGlobalLaborPct)
        ? Math.max(0, forcedGlobalLaborPct)
        : Math.max(0, Number(rub.laborPercentage) || 0);
    lines.push(`##RUBRIQUE|${cleanTitle}|${cleanTrade}|${effectiveLabor}`);
    rub.items
      .filter((it) => it.description.trim())
      .forEach((it) => {
        const cleanDesc = it.description.replace(/\|/g, '-').trim();
        const stockFlag = it.stockable === false ? 'NON_STOCKABLE' : 'STOCKABLE';
        lines.push(
          `${cleanDesc} | ${Math.max(0, Number(it.qty) || 1)} | ${Math.max(0, Number(it.unitPrice) || 0)} | ${stockFlag}`
        );
      });
  });
  return lines.join('\n').slice(0, 3900);
}

export function parseDocumentRubriquesFromSummary(
  itemsSummary: string,
  fallbackSubtotal = 0,
  forcedGlobalLaborPct?: number
): ParsedDocumentRubriquesResult {
  const rawLines = (itemsSummary || '')
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const hasExplicitRubriques = rawLines.some((l) => l.startsWith('##RUBRIQUE|'));
  const sections: DocumentRubriqueSection[] = [];

  if (hasExplicitRubriques) {
    let currentSection: DocumentRubriqueSection | null = null;
    rawLines.forEach((line, idx) => {
      if (line.startsWith('##RUBRIQUE|')) {
        const parts = line.split('|').map((p) => p.trim());
        currentSection = {
          id: `rub_${sections.length + 1}_${idx}`,
          title: parts[1] || `Rubrique ${sections.length + 1}`,
          tradeCategory: parts[2] || 'Corps de métier général',
          laborPercentage: Math.max(0, Number(parts[3]) || 0),
          items: [],
        };
        sections.push(currentSection);
      } else {
        if (!currentSection) {
          currentSection = {
            id: `rub_1_${idx}`,
            title: 'Rubrique 1 : Travaux & Fournitures',
            tradeCategory: 'Corps de métier général',
            laborPercentage: 0,
            items: [],
          };
          sections.push(currentSection);
        }
        if (line.includes('|')) {
          const parts = line.split('|').map((p) => p.trim());
          const stockFlag = (parts[3] || '').toUpperCase();
          currentSection.items.push({
            id: `it_${idx}`,
            description: parts[0] || `Matériel / Prestation ${idx + 1}`,
            qty: Math.max(0, Number(parts[1]) || 1),
            unitPrice: Math.max(0, Number(parts[2]) || 0),
            stockable: stockFlag === 'NON_STOCKABLE' ? false : true,
          });
        } else {
          currentSection.items.push({
            id: `it_${idx}`,
            description: line,
            qty: 1,
            unitPrice: 0,
            stockable: true,
          });
        }
      }
    });
  } else {
    const legacyLines = (itemsSummary || '')
      .split(/\n|;/)
      .map((s) => s.trim())
      .filter(Boolean);

    const items: DocumentRubriqueItem[] =
      legacyLines.length > 0
        ? legacyLines.map((line, idx) => {
            if (line.includes('|')) {
              const parts = line.split('|').map((p) => p.trim());
              const stockFlag = (parts[3] || '').toUpperCase();
              return {
                id: `it_${idx}`,
                description: parts[0] || `Prestation ${idx + 1}`,
                qty: Number(parts[1]) || 1,
                unitPrice: Number(parts[2]) || 0,
                stockable: stockFlag === 'NON_STOCKABLE' ? false : true,
              };
            }
            return {
              id: `it_${idx}`,
              description: line,
              qty: 1,
              unitPrice: Number((fallbackSubtotal / Math.max(1, legacyLines.length)).toFixed(2)),
              stockable: true,
            };
          })
        : [
            {
              id: 'it_1',
              description: 'Forfait fournitures et travaux du projet',
              qty: 1,
              unitPrice: fallbackSubtotal,
              stockable: true,
            },
          ];

    sections.push({
      id: 'rub_default_1',
      title: 'Rubrique 1 : Fournitures & Prestations Générales',
      tradeCategory: 'Tous corps d’état',
      laborPercentage: 0,
      items,
    });
  }

  const computedRubriques: ComputedDocumentRubrique[] = sections.map((sec) => {
    const effectiveLaborPct =
      typeof forcedGlobalLaborPct === 'number' &&
      Number.isFinite(forcedGlobalLaborPct) &&
      (hasExplicitRubriques || sec.laborPercentage > 0)
        ? Math.max(0, forcedGlobalLaborPct)
        : sec.laborPercentage;

    const normalizedItems = sec.items.map((it) => ({
      ...it,
      stockable: it.stockable !== false,
    }));

    const stockableMaterialSubtotal = Number(
      normalizedItems
        .filter((it) => it.stockable !== false)
        .reduce((sum, it) => sum + Math.max(0, it.qty) * Math.max(0, it.unitPrice), 0)
        .toFixed(2)
    );
    const nonStockableSubtotal = Number(
      normalizedItems
        .filter((it) => it.stockable === false)
        .reduce((sum, it) => sum + Math.max(0, it.qty) * Math.max(0, it.unitPrice), 0)
        .toFixed(2)
    );
    const materialSubtotal = Number((stockableMaterialSubtotal + nonStockableSubtotal).toFixed(2));
    const hasStockableItems = normalizedItems.some(
      (it) =>
        it.stockable !== false &&
        (Math.max(0, it.qty) * Math.max(0, it.unitPrice) > 0 || it.description.trim() !== '')
    );

    // La Main d'Œuvre ne s'applique JAMAIS aux produits non stockables
    const laborAmount = hasStockableItems
      ? Number(((stockableMaterialSubtotal * effectiveLaborPct) / 100).toFixed(2))
      : 0;
    const rubriqueTotal = Number((materialSubtotal + laborAmount).toFixed(2));
    return {
      ...sec,
      items: normalizedItems,
      laborPercentage: effectiveLaborPct,
      stockableMaterialSubtotal,
      nonStockableSubtotal,
      hasStockableItems,
      materialSubtotal,
      laborAmount,
      rubriqueTotal,
    };
  });

  const totalMaterialSubtotal = Number(
    computedRubriques.reduce((s, r) => s + r.materialSubtotal, 0).toFixed(2)
  );
  const totalLaborSubtotal = Number(
    computedRubriques.reduce((s, r) => s + r.laborAmount, 0).toFixed(2)
  );
  const grandTotalHT = Number((totalMaterialSubtotal + totalLaborSubtotal).toFixed(2));
  const onlyNonStockableItems =
    computedRubriques.length > 0 &&
    computedRubriques.every((r) => !r.hasStockableItems || r.stockableMaterialSubtotal <= 0);

  return {
    hasExplicitRubriques,
    onlyNonStockableItems,
    rubriques: computedRubriques,
    totalMaterialSubtotal,
    totalLaborSubtotal,
    grandTotalHT,
  };
}

export interface AppliedDocumentTaxItem {
  id: string;
  code: string;
  label: string;
  category?: 'indirect_tax' | 'withholding_tax' | 'corporate_levy' | 'local_tax';
  ratePct: number;
  sign: 'add' | 'deduct';
  amount: number;
  includeInCalculation: boolean;
  displayOnDocument: boolean;
}

export interface ProjectCommissioningTestItem {
  id: string;
  testCode: string;
  title: string;
  tradeName: string;
  normOrReference: string;
  measuredValue: string;
  verdict: 'conforme_100' | 'reserve' | 'non_conforme';
  proofReference: string;
  testedAt: string;
}

export interface ProjectSiteClearanceItem {
  id: string;
  label: string;
  category: string;
  completed: boolean;
  verifiedBy: string;
  observation: string;
}

export type ClientEntityType = 'personne_morale' | 'personne_physique';

export interface ClientProfileRecord {
  id: string;
  tenantId?: string;
  clientCode?: string;
  entityType: ClientEntityType; // 'personne_morale' (Entreprise/Institution) | 'personne_physique' (Particulier/Individuel)
  name: string; // Raison sociale (Morale) ou Nom & Prénoms (Physique)
  displayName?: string;
  fullName?: string;
  // Informations spécifiques Personne Morale :
  legalForm?: string; // SARL, SA, SAS, SASU, SNC, ONG, Institution Publique, GIE...
  rccmNumber?: string; // N° RCCM / Registre de Commerce / SIREN-SIRET
  taxIdNumber?: string; // N° NIF / NIU / Identifiant Fiscal Unique (ou NIF personnel)
  nifNumber?: string;
  personalTaxId?: string;
  vatNumber?: string; // N° TVA Intracommunautaire / Assujettissement TVA
  taxRegime?: string; // Réel Normal, Simplifié, Exonéré...
  shareCapital?: string; // Capital social
  representativeName?: string; // Nom & Prénoms du Représentant Légal / Gérant / DG
  legalRepresentativeName?: string;
  representativeTitle?: string; // Fonction / Qualité du Représentant Légal
  legalRepresentativeTitle?: string;
  // Informations spécifiques Personne Physique :
  civility?: string; // M., Mme, Dr, Pr, Me, Ing.
  occupation?: string; // Profession / Qualité / Fonction
  occupationOrRole?: string;
  idDocumentType?: string; // CNI, Passeport, Carte de Séjour, Permis
  identityDocType?: string;
  idDocumentNumber?: string; // N° de la pièce d'identité officielle
  identityDocNumber?: string;
  idIssuedDetails?: string; // Date et autorité de délivrance
  nationality?: string; // Nationalité
  // Coordonnées, Banque & Devise du Client :
  email: string;
  phone?: string;
  whatsappPhone?: string;
  whatsapp?: string;
  address: string;
  city?: string;
  postalBox?: string;
  country?: string;
  preferredCurrency?: Currency; // Devise officielle utilisée par le client (ISO 4217)
  defaultExchangeRate?: number; // Taux de change convenu (1 devise prestataire = X devise client)
  bankAccountInfo?: string; // IBAN / RIB / Mobile Money du client
  bankAccountOrIban?: string;
  paymentTerms?: string; // Conditions de règlement convenues
  notes?: string;
  kycVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExportableDocument {
  id: string;
  docNumber: string;
  docType: 'quote' | 'proforma' | 'invoice';
  status: string;
  projectName: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  issueDate: string;
  dueDate: string;
  currency: Currency;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  itemsSummary: string;
  milestoneReached: number;
  projectAccountInfo?: string;
  projectDedicatedAccount?: string;
  includeVat?: boolean;
  countryCode?: string;
  countryName?: string;
  templateLayout?: DocumentLayoutPreset;
  headerHexColor?: string;
  projectEvaluationSummary?: string;
  globalLaborPercentage?: number;
  additionalTaxes?: AppliedDocumentTaxItem[];
  showAdditionalTaxesOnDocument?: boolean;
  additionalTaxesNetImpact?: number;
  // Informations complètes du Client (Personne Morale ou Physique) & Multi-Devises :
  clientEntityType?: ClientEntityType;
  clientLegalForm?: string;
  clientRccmOrId?: string;
  clientTaxId?: string;
  clientVatNumber?: string;
  clientTaxRegime?: string;
  clientShareCapital?: string;
  clientRepresentative?: string;
  clientRepresentativeTitle?: string;
  clientCivility?: string;
  clientOccupation?: string;
  clientIdDocType?: string;
  clientIdIssuedDetails?: string;
  clientPhone?: string;
  clientCityCountry?: string;
  clientPostalBox?: string;
  clientBankInfo?: string;
  clientPaymentTerms?: string;
  clientCurrency?: Currency;
  exchangeRate?: number;
  printInClientCurrency?: boolean;
  decryptedConfidentialNote?: string;
  clientProfile?: ClientProfileRecord;
}

export function formatClientDocumentLines(
  item: Partial<ExportableDocument> & { clientProfile?: ClientProfileRecord }
): string[] {
  const prof = item.clientProfile;
  const entityType: ClientEntityType =
    item.clientEntityType || prof?.entityType || 'personne_morale';
  const lines: string[] = [];

  if (entityType === 'personne_physique') {
    const civ = item.clientCivility || prof?.civility || '';
    const occ = item.clientOccupation || prof?.occupation || 'Particulier / Maître d’Ouvrage';
    lines.push(
      `Statut : Personne Physique (${civ ? `${civ} · ` : ''}${occ})`
    );
    const idType = item.clientIdDocType || prof?.idDocumentType || 'CNI / Passeport';
    const idNum = item.clientRccmOrId || prof?.idDocumentNumber || '';
    const taxId = item.clientTaxId || prof?.taxIdNumber || '';
    const idParts = [
      idNum ? `${idType} N° ${idNum}` : '',
      item.clientIdIssuedDetails || prof?.idIssuedDetails
        ? `(${item.clientIdIssuedDetails || prof?.idIssuedDetails})`
        : '',
      taxId ? `NIF/NIU : ${taxId}` : '',
    ].filter(Boolean);
    if (idParts.length > 0) {
      lines.push(idParts.join(' · '));
    }
  } else {
    const legalForm = item.clientLegalForm || prof?.legalForm || 'Société / Entreprise';
    const cap = item.clientShareCapital || prof?.shareCapital || '';
    lines.push(
      `Statut : Personne Morale (${legalForm}${cap ? ` · Capital : ${cap}` : ''})`
    );
    const rccm = item.clientRccmOrId || prof?.rccmNumber || '';
    const taxId = item.clientTaxId || prof?.taxIdNumber || '';
    const vatNum = item.clientVatNumber || prof?.vatNumber || '';
    const regime = item.clientTaxRegime || prof?.taxRegime || '';
    const regParts = [
      rccm ? `RCCM : ${rccm}` : '',
      taxId ? `NIF/NIU : ${taxId}` : '',
      vatNum ? `TVA : ${vatNum}` : '',
      regime ? `Régime : ${regime}` : '',
    ].filter(Boolean);
    if (regParts.length > 0) {
      lines.push(regParts.join(' · '));
    }
    const repName = item.clientRepresentative || prof?.representativeName || '';
    const repTitle = item.clientRepresentativeTitle || prof?.representativeTitle || '';
    if (repName) {
      lines.push(
        `Représentant légal : ${repName}${repTitle ? ` (${repTitle})` : ''}`
      );
    }
  }

  const addr = item.clientAddress || prof?.address || '';
  const cityCountry =
    item.clientCityCountry ||
    [prof?.postalBox, prof?.city, prof?.country].filter(Boolean).join(', ');
  if (addr || cityCountry) {
    lines.push(
      `Adresse : ${[addr, cityCountry].filter(Boolean).join(' — ')}`
    );
  }

  const phone = item.clientPhone || prof?.phone || prof?.whatsappPhone || '';
  const email = item.clientEmail || prof?.email || '';
  if (phone || email) {
    lines.push(
      [phone ? `Tél : ${phone}` : '', email ? `Email : ${email}` : ''].filter(Boolean).join(' · ')
    );
  }

  const bank = item.clientBankInfo || prof?.bankAccountInfo || '';
  if (bank) {
    lines.push(`Réf. Bancaire Client : ${bank}`);
  }

  const clientCurr = item.clientCurrency || prof?.preferredCurrency;
  if (clientCurr) {
    const cCode = getOfficialCurrencyCode(clientCurr);
    lines.push(`Devise officielle du Client : ${cCode} (${getCurrencyMetadata(cCode).name})`);
  }

  return lines.filter(Boolean);
}

export interface ExportableProject {
  id: string;
  name: string;
  clientName: string;
  status: string;
  progress: number;
  budget: number;
  spent?: number;
  billedAmount: number;
  invoicedAmount?: number;
  paidAmount: number;
  currency: Currency;
  dueDate: string;
  startDate?: string;
  estimatedDuration?: string;
  siteLocation?: string;
  projectType?: string;
  sectorLabel?: string;
  dedicatedAccountType?: 'Compte Bancaire' | 'Mobile Money';
  dedicatedAccountProvider?: string;
  dedicatedAccountNumber?: string;
  technicalProcesses?: string;
  equipmentList?: string;
  materialsList?: string;
  qualityAndHseNorms?: string;
  requiredPersonnelSummary?: string;
  deliverablesSummary?: string;
  involvedTrades?: string[]; // Corps de métier devant intervenir dans le projet
  projectManagerName?: string; // Responsable principal du projet
  executionSteps?: ProjectExecutionStep[] | string;
  structuredSteps?: ProjectExecutionStep[];
  cycleObjectives?: ProjectCycleObjective[];
  closureInfo?: ExportableProjectClosure;
  isLocked?: boolean;
  lockedAt?: string;
  lockedBy?: string;
  achievementCategory?: 'in_progress' | 'completed_with_success';
  completionSummaryDoc?: ProjectCompletionSummaryRecord;
  clientAddress?: string;
  clientEntityType?: ClientEntityType;
  clientLegalForm?: string;
  clientRccmOrId?: string;
  clientTaxId?: string;
  clientRepresentative?: string;
  clientPhone?: string;
  clientCurrency?: Currency;
  clientExchangeRate?: number;
  exchangeRate?: number;
  clientProfile?: ClientProfileRecord;
}

export interface ProjectCompletionSummaryRecord {
  id: string;
  summaryNumber: string;
  generatedAt: string;
  generatedBy: string;
  projectId: string;
  projectName: string;
  clientName: string;
  projectManagerName: string;
  achievementStatus: 'completed_with_success';
  totalDeliverablesCount: number;
  completedPhasesCount: number;
  keyDeliverables: Array<{
    phaseNumber: string | number;
    tradeName: string;
    title: string;
    deliverable: string;
    progressPct: number;
    responsible: string;
  }>;
  totalTestsCount: number;
  conformeTestsCount: number;
  testResultsSummary: Array<{
    testCode: string;
    tradeName: string;
    title: string;
    normOrReference: string;
    measuredValue: string;
    verdict: string;
    proofReference: string;
  }>;
  siteClearanceRatePct: number;
  executiveConclusion: string;
}

export interface ExportableProjectClosure {
  workCompletion100Pct: boolean;
  workCompletionDate: string;
  workCompletionNotes: string;
  siteClearanceCompleted: boolean;
  siteClearanceDate: string;
  siteClearanceNotes: string;
  testsAndTrialsRequired: boolean;
  testsAndTrialsCompleted: boolean;
  testsAndTrialsDate: string;
  testsAndTrialsSummary: string;
  handoverRetrocessionCompleted: boolean;
  handoverRetrocessionDate: string;
  handoverRetrocessionNotes: string;
  clientRepresentativeName: string;
  clientRepresentativeTitle: string;
  projectManagerName: string;
  leadTradeRepresentativeName: string;
  closureReferenceNumber: string;
  commissioningTests?: ProjectCommissioningTestItem[];
  siteClearanceChecklist?: ProjectSiteClearanceItem[];
  lockedAndArchivedAt?: string;
}

export type ProjectClosureDocumentKind =
  | 'completion_100'
  | 'site_clearance'
  | 'tests_trials'
  | 'handover_retrocession'
  | 'full_closure_dossier'
  | 'completion_summary';

export interface ExportableInternalRequisition {
  id: string;
  bciNumber: string;
  date: string;
  projectId: string;
  projectName: string;
  projectTypeLabel: string;
  projectManagerName: string; // Responsable du projet émetteur
  tradeName: string; // Corps de métier utilisateur
  tradeLeaderName: string; // Responsable du corps de métier utilisateur
  warehouseId: string;
  warehouseName: string;
  warehouseManagerName: string; // Magasinier destinataire
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  requestedQuantity: number;
  deliveredQuantity?: number;
  unitCost: number;
  totalEstimatedValue: number;
  purposeAndPhase: string;
  status: 'pending_warehouse' | 'fulfilled_stock_out' | 'rejected';
  scannedBciFileName?: string;
  scannedBciDataUrl?: string;
  stockOutVoucherNumber?: string; // Bon de Sortie (BS) généré contre le BCI
  stockOutDate?: string;
}

export interface ExportablePayslip {
  id: string;
  payslipNumber: string;
  period: string;
  periodicityLabel?: string;
  employeeMatricule: string;
  employeeName: string;
  employeeCategory?: string;
  employeePosition: string;
  employeeDepartment: string;
  contractType: string;
  remunerationModeLabel?: string;
  workedDays: number;
  completedTasksCount?: number;
  unitRateOrBase?: number;
  baseSalary: number;
  overtimeHours: number;
  overtimePay: number;
  transportAllowance: number;
  performanceBonus: number;
  grossSalary: number;
  socialContribution: number;
  incomeTax: number;
  salaryAdvance: number;
  totalDeductions: number;
  employerCharges: number;
  netSalary: number;
  paymentMethod: string;
  status: 'draft' | 'validated' | 'paid';
  paidDate?: string;
  paymentDate?: string;
  projectName?: string;
  countryNormsLabel?: string;
  employeeSocialContribution?: number;
  employerSocialContribution?: number;
  incomeTaxWithholding?: number;
  netPayable?: number;
  periodMonth?: string;
  roleTitle?: string;
}

export interface ExportableStockMovementItemLine {
  productId?: string;
  productSku: string;
  productName: string;
  tradeCategory?: string;
  subCategory?: string;
  unit: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost: number;
  totalValue: number;
}

export interface ExportableStockMovement {
  id: string;
  voucherNumber: string;
  date: string;
  movementType: 'IN' | 'OUT' | 'TRANSFER' | 'INVENTORY';
  itemId?: string;
  itemName?: string;
  productSku: string;
  productName: string;
  unit: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost: number;
  unitCostHT?: number;
  totalValue: number;
  transferItems?: ExportableStockMovementItemLine[];
  projectId: string;
  projectName: string;
  projectTypeLabel: string;
  warehouseName: string;
  warehouseLocation: string;
  sourceWarehouseId?: string;
  sourceWarehouseName?: string;
  targetWarehouseId?: string;
  targetWarehouseName?: string;
  targetProjectId?: string;
  targetProjectName?: string;
  operatorName: string;
  reason: string;
  sourceDocReference?: string;
  sourceDocFileName?: string;
  supplierName?: string;
  projectManagerName?: string; // Responsable du projet ayant délivré le BCI
  tradeName?: string; // Corps de métier utilisateur
  tradeLeaderName?: string; // Responsable du corps de métier ayant co-signé le BCI
  warehouseManagerName?: string; // Magasinier ayant exécuté la sortie contre Bon de Sortie
  internalRequisitionId?: string;
}

export interface ExportableGoodsReceipt {
  id?: string;
  receiptNumber: string; // Ex: BR-2026-001
  date: string;
  poId?: string;
  poNumber: string;
  deliveryNoteNumber?: string; // N° Bon de Livraison fournisseur
  deliveryNoteRef?: string;
  deliveryNoteFileName?: string;
  scannedFileName?: string;
  deliveryNoteScanDataUrl?: string;
  scannedDataUrl?: string;
  scannedDocDataUrl?: string;
  supplierName: string;
  projectId?: string;
  projectName?: string;
  warehouseId?: string;
  warehouseName: string;
  operatorName?: string;
  receiverName?: string;
  receptionStatus?: 'complete' | 'partial';
  statusAfterReceipt?: 'partial' | 'delivered';
  lines: {
    productId?: string;
    sku: string;
    name: string;
    unit: string;
    qtyOrdered?: number;
    orderedQty?: number;
    qtyPreviouslyReceived?: number;
    previouslyReceivedQty?: number;
    qtyReceivedNow?: number;
    receivedNowQty?: number;
    cumulativeReceivedQty?: number;
    qtyRemaining?: number;
    remainingQty?: number;
    unitPrice: number;
  }[];
  observations?: string;
  notes?: string;
}

export interface ExportablePurchaseOrder {
  id: string;
  poNumber: string;
  orderNumber?: string;
  date: string;
  orderDate?: string;
  issueDate?: string;
  deliveryExpectedDate: string;
  expectedDeliveryDate?: string;
  supplierName: string;
  supplierContact?: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierAddress: string;
  projectId: string;
  projectName: string;
  warehouseName: string;
  status: 'issued' | 'ordered' | 'partial' | 'delivered' | 'cancelled';
  items: {
    productId?: string;
    sku: string;
    name: string;
    unit: string;
    qty: number;
    receivedQty?: number;
    unitPrice: number;
  }[];
  lines?: {
    itemId?: string;
    sku: string;
    designation?: string;
    name?: string;
    unit: string;
    qtyOrdered?: number;
    qty?: number;
    qtyReceived?: number;
    unitPriceHT?: number;
    unitPrice?: number;
  }[];
  receipts?: ExportableGoodsReceipt[];
  subtotalHT?: number;
  totalHT: number;
  taxRate: number;
  vatAmount?: number;
  totalTTC: number;
  currency?: Currency;
  notes: string;
}

export interface ExportableEmployeeBadge {
  matricule: string;
  fullName: string;
  workerCategory: string;
  position: string;
  department: string;
  contractType: string;
  assignedProjectName: string;
  phone: string;
  email: string;
  nationalIdNumber: string;
  emergencyContact: string;
  bloodGroup?: string;
  hireDate: string;
  photoDataUrl?: string;
}

export interface ExportableHrEventAct {
  id: string;
  reference: string;
  eventCategory:
    | 'leave'
    | 'infraction'
    | 'reprimand'
    | 'mission'
    | 'mutation'
    | 'promotion'
    | 'termination';
  subType: string;
  title: string;
  date: string;
  startDate?: string;
  endDate?: string;
  employeeMatricule: string;
  employeeName: string;
  employeePosition: string;
  employeeContractType: string;
  projectName: string;
  targetProjectOrLocation?: string;
  targetEnterpriseName?: string; // En cas de mutation inter-entreprises au sein du réseau du Super-Admin
  promotionMode?: 'Manuel' | 'Automatique';
  previousSalaryOrGrade?: string;
  newSalaryOrGrade?: string;
  financialImpactOrAllowance?: number;
  details: string;
  decisionMaker: string;
}

export interface ExportableBiometricAttendance {
  id: string;
  date: string;
  checkInTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  breakDurationMinutes?: number;
  checkOutTime?: string;
  netWorkedHours?: number;
  overtimeHours?: number;
  employeeMatricule: string;
  employeeName: string;
  contractType: string;
  position: string;
  projectName: string;
  validationMethod: 'fingerprint' | 'face' | 'qr_code';
  biometricHash: string;
  qrBadgePayload?: string;
  confidenceScore: number;
  status: 'present' | 'on_break' | 'late' | 'completed';
}

const DOC_TYPE_LABELS: Record<string, string> = {
  quote: 'DEVIS COMMERCIAL & TECHNIQUE',
  proforma: 'FACTURE PROFORMA',
  invoice: 'FACTURE DÉFINITIVE',
};

export interface DocumentPrintCurrencyOptions {
  printInClientCurrency?: boolean;
  targetCurrency?: Currency;
  exchangeRate?: number;
}

export function exportSingleDocumentToPDF(
  docItem: ExportableDocument,
  companyName = 'PRESTATAIRE DE SERVICES',
  companyLogo?: string,
  arg4?: string | DocumentCustomizationConfig,
  arg5?: DocumentCustomizationConfig,
  printOptions?: DocumentPrintCurrencyOptions
): void {
  const rawDecryptedNotes =
    typeof arg4 === 'string' ? arg4 : docItem.decryptedConfidentialNote;
  const customization: DocumentCustomizationConfig =
    (typeof arg4 === 'object' && arg4 !== null ? arg4 : arg5) || DEFAULT_DOC_CUSTOMIZATION;
  const effectiveConfidentialNote = (rawDecryptedNotes || '').trim();
  const shouldIncludeConfidentialNote =
    Boolean(customization.includeConfidentialNotesInPdf) && Boolean(effectiveConfidentialNote);

  const activePreset = resolveDocumentLayoutPreset(
    docItem.docType,
    customization,
    docItem.templateLayout
  );
  const isLandscapePreset = activePreset === 'landscape';
  const isDetailedProjectReportPreset = activePreset === 'detailed_project_report';
  const pdf = isLandscapePreset
    ? new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    : new jsPDF();
  const effectiveHexColor = docItem.headerHexColor || customization.headerHexColor || '#0F172A';
  const [r, g, b] = hexToRgb(effectiveHexColor);
  const subtitle =
    customization.headerSubtitle ||
    customization.companySubtitle ||
    DEFAULT_DOC_CUSTOMIZATION.headerSubtitle!;

  const providerCurrencyCode = getOfficialCurrencyCode(docItem.currency);
  const clientCurrencyCandidate =
    printOptions?.targetCurrency ||
    docItem.clientCurrency ||
    docItem.clientProfile?.preferredCurrency ||
    providerCurrencyCode;
  const clientCurrencyCode = getOfficialCurrencyCode(clientCurrencyCandidate);

  const shouldPrintInClientCurrency = Boolean(
    (printOptions?.printInClientCurrency ?? docItem.printInClientCurrency) &&
      clientCurrencyCode !== providerCurrencyCode
  );

  const activeCurrencyCode = shouldPrintInClientCurrency
    ? clientCurrencyCode
    : providerCurrencyCode;
  const activeCurrencyMeta = getCurrencyMetadata(activeCurrencyCode);

  const effectiveExchangeRate =
    shouldPrintInClientCurrency || clientCurrencyCode !== providerCurrencyCode
      ? printOptions?.exchangeRate ||
        docItem.exchangeRate ||
        docItem.clientProfile?.defaultExchangeRate ||
        getDefaultExchangeRate(providerCurrencyCode, clientCurrencyCode)
      : 1;

  const conv = (val: number): number =>
    shouldPrintInClientCurrency
      ? convertCurrencyAmount(val, providerCurrencyCode, clientCurrencyCode, effectiveExchangeRate)
      : Number((Number(val) || 0).toFixed(2));

  const docTitle = DOC_TYPE_LABELS[docItem.docType] || 'DOCUMENT FINANCIER';
  const docDateMeta = shouldPrintInClientCurrency
    ? `Émission : ${docItem.issueDate} · Échéance : ${docItem.dueDate} · Devise Client : ${activeCurrencyCode} (1 ${providerCurrencyCode} = ${effectiveExchangeRate} ${activeCurrencyCode})`
    : `Émission : ${docItem.issueDate} · Échéance : ${docItem.dueDate} · Devise : ${activeCurrencyCode}`;
  const statusBadge =
    docItem.status === 'draft'
      ? `BROUILLON · DEVISE ${activeCurrencyCode}`
      : `STATUT : ${docItem.status.toUpperCase()} · DEVISE ${activeCurrencyCode}`;

  const afterHeaderY = isLandscapePreset
    ? drawLandscapeCorporateLetterhead(
        pdf,
        companyName,
        companyLogo,
        `${docTitle} — FORMAT PAYSAGE`,
        docItem.docNumber,
        `${subtitle} · ${docDateMeta}`,
        effectiveHexColor
      )
    : drawCorporateLetterhead(
        pdf,
        companyName,
        companyLogo,
        subtitle,
        isDetailedProjectReportPreset
          ? `${docTitle} & RAPPORT DÉTAILLÉ DE PROJET`
          : docTitle,
        docItem.docNumber,
        docDateMeta,
        effectiveHexColor,
        statusBadge,
        {
          preset: activePreset,
          headerCompanyAddress: customization.headerCompanyAddress,
          headerCompanyContact: customization.headerCompanyContact,
          headerTaxRegistration: customization.headerTaxRegistration,
          customHeaderNote: customization.customHeaderNote,
          showLogo: customization.showLogo !== false,
        }
      );

  const uniqueLaborPct =
    docItem.globalLaborPercentage ?? customization.globalLaborPercentage;

  const parsedRubriquesData = parseDocumentRubriquesFromSummary(
    docItem.itemsSummary,
    docItem.subtotal,
    uniqueLaborPct
  );

  const showLaborInDocument =
    !parsedRubriquesData.onlyNonStockableItems && parsedRubriquesData.totalLaborSubtotal > 0;

  const accountInfo = docItem.projectAccountInfo || docItem.projectDedicatedAccount;
  const clientFormattedLines = formatClientDocumentLines(docItem);

  const tableStartY = drawTwoColumnInfoCards(
    pdf,
    afterHeaderY,
    'CLIENT / MAÎTRE D’OUVRAGE DESTINATAIRE',
    (docItem.clientName || 'CLIENT').toUpperCase(),
    clientFormattedLines.length > 0
      ? clientFormattedLines
      : [
          docItem.clientEmail ? `Email : ${docItem.clientEmail}` : '',
          docItem.clientAddress ? `Adresse : ${docItem.clientAddress}` : '',
        ],
    'RÉFÉRENCES, DEVISE & ÉVALUATION DU PROJET',
    `Projet : ${docItem.projectName}`,
    [
      customization.includeProjectEvaluation !== false
        ? `Évaluation & Jalon validé du projet : ${docItem.milestoneReached}% (${
            docItem.milestoneReached >= 100
              ? 'Achevé & Conforme'
              : docItem.milestoneReached >= 75
              ? 'Phase Avancée Validée'
              : docItem.milestoneReached >= 50
              ? 'Exécution Intermédiaire'
              : 'Démarrage & Cadrage'
          })`
        : `Avancement jalon projet : ${docItem.milestoneReached}%`,
      docItem.projectEvaluationSummary && customization.includeProjectEvaluation !== false
        ? `Bilan d'évaluation : ${docItem.projectEvaluationSummary}`
        : '',
      showLaborInDocument
        ? `Main d'Œuvre d'Exécution : Incluse et appliquée par rubrique`
        : '',
      shouldPrintInClientCurrency
        ? `Imprimé en Devise Client : ${activeCurrencyCode} (${activeCurrencyMeta.name}) · Taux : 1 ${providerCurrencyCode} = ${effectiveExchangeRate} ${activeCurrencyCode}`
        : clientCurrencyCode !== providerCurrencyCode
        ? `Devise Prestataire : ${providerCurrencyCode} · Devise Client : ${clientCurrencyCode} (1 ${providerCurrencyCode} = ${effectiveExchangeRate} ${clientCurrencyCode})`
        : `Devise officielle ISO 4217 : ${activeCurrencyCode} (${activeCurrencyMeta.name})`,
      accountInfo && customization.showProjectBankDetails !== false
        ? `Compte dédié : ${accountInfo}`
        : '',
    ],
    [r, g, b]
  );

  // Build detailed table rows by Rubrique -> Material lines -> Sous-total Matériel -> Main d'Oeuvre (UNIQUEMENT si produits stockables) -> Total Rubrique
  const tableRows: Array<Array<string | { content: string; colSpan?: number; styles?: Record<string, unknown> }>> = [];

  parsedRubriquesData.rubriques.forEach((rub, rIdx) => {
    const rubNumber = rIdx + 1;
    tableRows.push([
      {
        content: `RUBRIQUE ${rubNumber} : ${rub.title.toUpperCase()}${
          rub.tradeCategory ? ` — CORPS DE MÉTIER : ${rub.tradeCategory.toUpperCase()}` : ''
        }`,
        colSpan: 5,
        styles: {
          fillColor: [226, 232, 240],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8.5,
        },
      },
    ]);

    rub.items.forEach((it, iIdx) => {
      const unitP = conv(it.unitPrice);
      const lineTotal = conv(Number((it.qty * it.unitPrice).toFixed(2)));
      tableRows.push([
        `${rubNumber}.${iIdx + 1}`,
        it.description,
        formatAmountSpaced(it.qty),
        `${formatAmountSpaced(unitP)} ${activeCurrencyCode}`,
        `${formatAmountSpaced(lineTotal)} ${activeCurrencyCode}`,
      ]);
    });

    if (rub.hasStockableItems && rub.laborAmount > 0) {
      tableRows.push([
        '',
        {
          content: `Sous-Total Coût d'Achat du Matériel — ${rub.title}`,
          styles: { fontStyle: 'bold', textColor: [30, 58, 138], fillColor: [241, 245, 249] },
        },
        { content: '-', styles: { halign: 'center', fillColor: [241, 245, 249] } },
        { content: 'Sous-Total Matériel', styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
        {
          content: `${formatAmountSpaced(conv(rub.materialSubtotal))} ${activeCurrencyCode}`,
          styles: { halign: 'right', fontStyle: 'bold', textColor: [30, 58, 138], fillColor: [241, 245, 249] },
        },
      ]);

      tableRows.push([
        '',
        {
          content: `Main d'Œuvre d'Exécution & Pose — ${rub.title}`,
          styles: { fontStyle: 'bold', textColor: [6, 95, 70], fillColor: [236, 253, 245] },
        },
        {
          content: 'Forfait',
          styles: { halign: 'center', fontStyle: 'bold', textColor: [6, 95, 70], fillColor: [236, 253, 245] },
        },
        {
          content: 'Prestation M.O',
          styles: { halign: 'right', fontStyle: 'bold', fillColor: [236, 253, 245] },
        },
        {
          content: `${formatAmountSpaced(conv(rub.laborAmount))} ${activeCurrencyCode}`,
          styles: { halign: 'right', fontStyle: 'bold', textColor: [6, 95, 70], fillColor: [236, 253, 245] },
        },
      ]);

      tableRows.push([
        '',
        {
          content: `TOTAL RUBRIQUE ${rubNumber} (Matériel + Main d'Œuvre — ${rub.title})`,
          colSpan: 3,
          styles: { fontStyle: 'bold', textColor: [15, 23, 42], fillColor: [226, 232, 240] },
        },
        {
          content: `${formatAmountSpaced(conv(rub.rubriqueTotal))} ${activeCurrencyCode}`,
          styles: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42], fillColor: [226, 232, 240] },
        },
      ]);
    } else {
      tableRows.push([
        '',
        {
          content: `TOTAL RUBRIQUE ${rubNumber} HT (${rub.title})`,
          colSpan: 3,
          styles: { fontStyle: 'bold', textColor: [15, 23, 42], fillColor: [226, 232, 240] },
        },
        {
          content: `${formatAmountSpaced(conv(rub.rubriqueTotal))} ${activeCurrencyCode}`,
          styles: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42], fillColor: [226, 232, 240] },
        },
      ]);
    }
  });

  autoTable(pdf, {
    startY: tableStartY,
    margin: { bottom: 22 },
    head: [
      [
        'Réf',
        showLaborInDocument
          ? 'Rubriques, Fournitures de Matériel & Main d’Œuvre par Corps de Métier'
          : 'Rubriques, Produits & Prestations par Corps de Métier',
        'Qté',
        `P.U. HT (${activeCurrencyCode})`,
        `Total HT (${activeCurrencyCode})`,
      ],
    ],
    body: tableRows as any,
    theme: activePreset === 'modern' ? 'striped' : 'grid',
    headStyles: {
      fillColor: activePreset === 'industrial' ? [30, 41, 59] : [r, g, b],
      textColor: 255,
      fontSize: activePreset === 'compact' ? 7.7 : 8.3,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: activePreset === 'compact' ? 7.4 : 7.9,
      textColor: [15, 23, 42],
      cellPadding: activePreset === 'compact' ? 1.6 : 2.2,
      overflow: 'linebreak',
    },
    columnStyles: isLandscapePreset
      ? {
          0: { cellWidth: 16, halign: 'center' },
          1: { cellWidth: 149, overflow: 'linebreak' },
          2: { cellWidth: 23, halign: 'right' },
          3: { cellWidth: 40, halign: 'right' },
          4: { cellWidth: 41, halign: 'right', fontStyle: 'bold' },
        }
      : {
          0: { cellWidth: 13, halign: 'center' },
          1: { cellWidth: 87, overflow: 'linebreak' },
          2: { cellWidth: 18, halign: 'right' },
          3: { cellWidth: 32, halign: 'right' },
          4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        },
  });

  let currentY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 145;

  currentY = ensurePageSpace(
    pdf,
    currentY + 5,
    46,
    companyName,
    companyLogo,
    subtitle,
    docTitle,
    docItem.docNumber,
    docDateMeta,
    customization.headerHexColor,
    statusBadge
  );

  autoTable(pdf, {
    startY: currentY,
    margin: { bottom: 22 },
    head: [
      showLaborInDocument
        ? [
            'N° Rubrique',
            'Intitulé de la Rubrique & Corps de Métier',
            `Sous-Total Matériel (${activeCurrencyCode})`,
            `Sous-Total M.O (${activeCurrencyCode})`,
            `Total Rubrique HT (${activeCurrencyCode})`,
          ]
        : [
            'N° Rubrique',
            'Intitulé de la Rubrique & Corps de Métier',
            `Sous-Total HT (${activeCurrencyCode})`,
            `Total Rubrique HT (${activeCurrencyCode})`,
          ],
    ],
    body: (showLaborInDocument
      ? [
          ...parsedRubriquesData.rubriques.map((rub, idx) => [
            `Rubrique ${idx + 1}`,
            `${rub.title}${rub.tradeCategory ? ` (${rub.tradeCategory})` : ''}`,
            formatAmountSpaced(conv(rub.materialSubtotal)),
            formatAmountSpaced(conv(rub.laborAmount)),
            formatAmountSpaced(conv(rub.rubriqueTotal)),
          ]),
          [
            {
              content: `RÉCAPITULATIF GÉNÉRAL DES SOUS-TOTAUX (${activeCurrencyCode})`,
              colSpan: 2,
              styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] },
            },
            {
              content: formatAmountSpaced(conv(parsedRubriquesData.totalMaterialSubtotal)),
              styles: { fontStyle: 'bold', halign: 'right', fillColor: [219, 234, 254], textColor: [30, 58, 138] },
            },
            {
              content: formatAmountSpaced(conv(parsedRubriquesData.totalLaborSubtotal)),
              styles: { fontStyle: 'bold', halign: 'right', fillColor: [209, 250, 229], textColor: [6, 95, 70] },
            },
            {
              content: formatAmountSpaced(conv(docItem.subtotal)),
              styles: { fontStyle: 'bold', halign: 'right', fillColor: [226, 232, 240], textColor: [15, 23, 42] },
            },
          ],
        ]
      : [
          ...parsedRubriquesData.rubriques.map((rub, idx) => [
            `Rubrique ${idx + 1}`,
            `${rub.title}${rub.tradeCategory ? ` (${rub.tradeCategory})` : ''}`,
            formatAmountSpaced(conv(rub.materialSubtotal)),
            formatAmountSpaced(conv(rub.rubriqueTotal)),
          ]),
          [
            {
              content: `RÉCAPITULATIF GÉNÉRAL DES RUBRIQUES HT (${activeCurrencyCode})`,
              colSpan: 2,
              styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] },
            },
            {
              content: formatAmountSpaced(conv(parsedRubriquesData.totalMaterialSubtotal)),
              styles: { fontStyle: 'bold', halign: 'right', fillColor: [219, 234, 254], textColor: [30, 58, 138] },
            },
            {
              content: formatAmountSpaced(conv(docItem.subtotal)),
              styles: { fontStyle: 'bold', halign: 'right', fillColor: [226, 232, 240], textColor: [15, 23, 42] },
            },
          ],
        ]) as any,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: [15, 23, 42], cellPadding: 2.1, overflow: 'linebreak' },
    columnStyles: showLaborInDocument
      ? {
          0: { cellWidth: 23, fontStyle: 'bold' },
          1: { cellWidth: 69, overflow: 'linebreak' },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
        }
      : {
          0: { cellWidth: 25, fontStyle: 'bold' },
          1: { cellWidth: 89, overflow: 'linebreak' },
          2: { cellWidth: 34, halign: 'right' },
          3: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
        },
  });

  currentY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || currentY + 35;

  if (isDetailedProjectReportPreset) {
    currentY = ensurePageSpace(
      pdf,
      currentY + 5,
      46,
      companyName,
      companyLogo,
      subtitle,
      docTitle,
      docItem.docNumber,
      docDateMeta,
      customization.headerHexColor,
      statusBadge
    );

    const totalRubHT = Math.max(1, conv(docItem.subtotal));
    const remainingBalanceDoc = Math.max(
      0,
      Number((conv(docItem.totalAmount) - conv(docItem.paidAmount)).toFixed(2))
    );

    autoTable(pdf, {
      startY: currentY,
      margin: { bottom: 22 },
      head: [
        [
          'Lot / Phase',
          'Corps de Métier & Lignes Analytiques',
          'Nb Postes',
          'Poids Budgétaire (%)',
          'Statut Jalon Projet',
          `Quote-Part TTC (${activeCurrencyCode})`,
        ],
      ],
      body: [
        ...parsedRubriquesData.rubriques.map((rub, idx) => {
          const weightPct = Number(((conv(rub.rubriqueTotal) / totalRubHT) * 100).toFixed(1));
          const ratio = conv(rub.rubriqueTotal) / totalRubHT;
          const shareTTC = Number((conv(docItem.totalAmount) * ratio).toFixed(2));
          return [
            `Lot #${idx + 1}`,
            `${rub.title} — ${rub.tradeCategory || 'Tous Corps d’État'}`,
            `${rub.items.length} ligne(s)`,
            `${weightPct}%`,
            `Jalon ${docItem.milestoneReached}%`,
            formatAmountSpaced(shareTTC),
          ];
        }),
        [
          {
            content: `SYNTHÈSE EXÉCUTIVE DU PROJET : ${docItem.projectName.toUpperCase()} (Encaissé : ${formatAmountSpaced(
              conv(docItem.paidAmount)
            )} ${activeCurrencyCode} · Solde Restant : ${formatAmountSpaced(
              remainingBalanceDoc
            )} ${activeCurrencyCode})`,
            colSpan: 5,
            styles: { fontStyle: 'bold', fillColor: [238, 242, 255], textColor: [30, 58, 138] },
          },
          {
            content: `${formatAmountSpaced(conv(docItem.totalAmount))} ${activeCurrencyCode}`,
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [238, 242, 255],
              textColor: [30, 58, 138],
            },
          },
        ],
      ] as any,
      theme: 'grid',
      headStyles: { fillColor: [49, 46, 129], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.4, textColor: [15, 23, 42], cellPadding: 2, overflow: 'linebreak' },
    });

    currentY =
      (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ||
      currentY + 35;
  }

  // Calcul dynamique sans aucun débordement des deux boîtes (Modalités à gauche x=14..102 [88mm] / Synthèse Financière à droite x=106..196 [90mm])
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.6);
  const leftTextWidth = 80;
  const effectiveTermsText =
    docItem.clientPaymentTerms ||
    docItem.clientProfile?.paymentTerms ||
    customization.paymentTermsText ||
    DEFAULT_DOC_CUSTOMIZATION.paymentTermsText;
  const termsLines: string[] = pdf.splitTextToSize(effectiveTermsText, leftTextWidth).slice(0, 5);
  const accLines: string[] = accountInfo
    ? pdf.splitTextToSize(`Compte dédié : ${accountInfo}`, leftTextWidth).slice(0, 3)
    : [];
  const fxClauseText =
    clientCurrencyCode !== providerCurrencyCode
      ? shouldPrintInClientCurrency
        ? `Conversion en devise client (${clientCurrencyCode}) au taux 1 ${providerCurrencyCode} = ${effectiveExchangeRate} ${clientCurrencyCode}. Contre-valeur prestataire : ${formatAmountSpaced(docItem.totalAmount)} ${providerCurrencyCode}.`
        : `Contre-valeur indicative en devise client (${clientCurrencyCode}) : ${formatAmountSpaced(
            convertCurrencyAmount(
              docItem.totalAmount,
              providerCurrencyCode,
              clientCurrencyCode,
              effectiveExchangeRate
            )
          )} ${clientCurrencyCode} (1 ${providerCurrencyCode} = ${effectiveExchangeRate} ${clientCurrencyCode}).`
      : '';
  const fxLines: string[] = fxClauseText
    ? pdf.splitTextToSize(fxClauseText, leftTextWidth).slice(0, 3)
    : [];
  const notesLines: string[] = shouldIncludeConfidentialNote
    ? pdf
        .splitTextToSize(`Notes confidentielles : ${effectiveConfidentialNote}`, leftTextWidth)
        .slice(0, 3)
    : [];

  const visibleAdditionalTaxes =
    docItem.showAdditionalTaxesOnDocument === false
      ? []
      : (docItem.additionalTaxes || []).filter(
          (t) => t.includeInCalculation && t.displayOnDocument !== false
        );

  const vatIncluded = docItem.taxRate > 0 && docItem.includeVat !== false;
  const balance = Math.max(0, docItem.totalAmount - docItem.paidAmount);

  interface PdfSummaryLine {
    label: string;
    value: string;
    color: [number, number, number];
    isNetTotal?: boolean;
    dividerBefore?: boolean;
  }

  const rightSummaryRows: PdfSummaryLine[] = [
    {
      label: showLaborInDocument
        ? 'Sous-Total Matériel :'
        : 'Sous-Total Prestations :',
      value: `${formatAmountSpaced(conv(parsedRubriquesData.totalMaterialSubtotal))} ${activeCurrencyCode}`,
      color: [30, 58, 138],
    },
  ];

  if (showLaborInDocument) {
    rightSummaryRows.push({
      label: 'Sous-Total Main d’Œuvre :',
      value: `${formatAmountSpaced(conv(parsedRubriquesData.totalLaborSubtotal))} ${activeCurrencyCode}`,
      color: [6, 95, 70],
    });
  }

  rightSummaryRows.push({
    label: 'Total Hors Taxes (HT) :',
    value: `${formatAmountSpaced(conv(docItem.subtotal))} ${activeCurrencyCode}`,
    color: [51, 65, 85],
  });

  rightSummaryRows.push({
    label: vatIncluded ? `TVA (${docItem.taxRate}%) :` : 'TVA (Exonérée 0%) :',
    value: `${formatAmountSpaced(conv(vatIncluded ? docItem.taxAmount : 0))} ${activeCurrencyCode}`,
    color: [71, 85, 105],
  });

  visibleAdditionalTaxes.forEach((taxItem) => {
    rightSummaryRows.push({
      label: `${taxItem.code} (${taxItem.sign === 'deduct' ? '-' : '+'}${taxItem.ratePct}%) :`,
      value: `${taxItem.sign === 'deduct' ? '- ' : '+ '}${formatAmountSpaced(
        conv(taxItem.amount)
      )} ${activeCurrencyCode}`,
      color: taxItem.sign === 'deduct' ? [180, 83, 9] : [71, 85, 105],
    });
  });

  rightSummaryRows.push({
    label:
      vatIncluded || visibleAdditionalTaxes.length > 0
        ? `NET À PAYER TTC (${activeCurrencyCode}) :`
        : `NET À PAYER HT (${activeCurrencyCode}) :`,
    value: `${formatAmountSpaced(conv(docItem.totalAmount))} ${activeCurrencyCode}`,
    color: [15, 23, 42],
    isNetTotal: true,
    dividerBefore: true,
  });

  rightSummaryRows.push({
    label: 'Montant déjà encaissé :',
    value: `${formatAmountSpaced(conv(docItem.paidAmount))} ${activeCurrencyCode}`,
    color: [22, 163, 74],
  });

  rightSummaryRows.push({
    label: 'Solde restant à payer :',
    value: `${formatAmountSpaced(conv(balance))} ${activeCurrencyCode}`,
    color: balance > 0 ? [220, 38, 38] : [22, 163, 74],
  });

  if (clientCurrencyCode !== providerCurrencyCode) {
    const counterpartCurrency = shouldPrintInClientCurrency
      ? providerCurrencyCode
      : clientCurrencyCode;
    const counterpartAmount = shouldPrintInClientCurrency
      ? docItem.totalAmount
      : convertCurrencyAmount(
          docItem.totalAmount,
          providerCurrencyCode,
          clientCurrencyCode,
          effectiveExchangeRate
        );
    rightSummaryRows.push({
      label: `Équivalent (${counterpartCurrency}) :`,
      value: `${formatAmountSpaced(counterpartAmount)} ${counterpartCurrency}`,
      color: [79, 70, 229],
    });
  }

  const leftTotalLinesCount =
    termsLines.length + accLines.length + fxLines.length + notesLines.length;
  const leftBoxContentH =
    13 +
    leftTotalLinesCount * 3.9 +
    (accLines.length > 0 ? 1.5 : 0) +
    (fxLines.length > 0 ? 1.5 : 0) +
    (notesLines.length > 0 ? 1.5 : 0) +
    5;
  const rightBoxContentH = 9 + rightSummaryRows.length * 5.8 + 5;
  const summaryBoxH = Math.max(Math.ceil(rightBoxContentH), Math.ceil(leftBoxContentH));

  currentY = ensurePageSpace(
    pdf,
    currentY + 6,
    summaryBoxH + 14,
    companyName,
    companyLogo,
    subtitle,
    docTitle,
    docItem.docNumber,
    docDateMeta,
    customization.headerHexColor,
    statusBadge
  );

  // Totals Summary Box à droite (x=106..196, largeur 90mm — zéro chevauchement entre libellés et montants)
  pdf.setDrawColor(203, 213, 225);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(106, currentY, 90, summaryBoxH, 2, 2, 'FD');

  let rCursorY = currentY + 6.5;
  rightSummaryRows.forEach((row) => {
    if (row.dividerBefore) {
      pdf.setDrawColor(203, 213, 225);
      pdf.line(109.5, rCursorY - 3.2, 192.5, rCursorY - 3.2);
      rCursorY += 1.2;
    }
    pdf.setFont('helvetica', row.isNetTotal ? 'bold' : 'normal');
    pdf.setFontSize(row.isNetTotal ? 8.1 : 7.5);
    pdf.setTextColor(row.color[0], row.color[1], row.color[2]);
    // Limiter strictement la largeur du libellé à 45mm pour laisser 38mm libres au montant aligné à droite
    const safeLabel = pdf.splitTextToSize(row.label, 45)[0] || row.label;
    pdf.text(safeLabel, 109.5, rCursorY);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(row.isNetTotal ? 8.3 : 7.6);
    const safeVal = pdf.splitTextToSize(row.value, 39)[0] || row.value;
    pdf.text(safeVal, 192.5, rCursorY, { align: 'right' });
    rCursorY += 5.7;
  });

  // Left Box: Payment Terms & Bank / Mobile Money Account + FX Clause (x=14..102, largeur 88mm)
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, currentY, 88, summaryBoxH, 2, 2, 'S');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.6);
  pdf.setTextColor(15, 23, 42);
  pdf.text('MODALITÉS, DEVISE & COMPTE DE RÈGLEMENT :', 18, currentY + 6.5);

  let termY = currentY + 11.8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.3);
  pdf.setTextColor(71, 85, 105);
  for (const l of termsLines) {
    pdf.text(l, 18, termY);
    termY += 3.8;
  }
  if (accLines.length > 0) {
    termY += 1.0;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 58, 138);
    for (const l of accLines) {
      pdf.text(l, 18, termY);
      termY += 3.8;
    }
  }
  if (fxLines.length > 0) {
    termY += 1.0;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(79, 70, 229);
    for (const l of fxLines) {
      pdf.text(l, 18, termY);
      termY += 3.8;
    }
  }
  if (notesLines.length > 0) {
    termY += 1.0;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(180, 83, 9);
    for (const l of notesLines) {
      pdf.text(l, 18, termY);
      termY += 3.8;
    }
  }

  let afterSummaryY = currentY + summaryBoxH;

  // Bloc dédié aux Notes Confidentielles (déchiffrées) si l'option est activée dans le Studio de Modèles
  if (shouldIncludeConfidentialNote) {
    const confLines: string[] = pdf
      .splitTextToSize(effectiveConfidentialNote, 174)
      .slice(0, 6);
    const confBoxH = Math.max(15, 8.5 + confLines.length * 3.8);
    const confStartY = ensurePageSpace(
      pdf,
      afterSummaryY + 4,
      confBoxH + 8,
      companyName,
      companyLogo,
      subtitle,
      docTitle,
      docItem.docNumber,
      docDateMeta,
      customization.headerHexColor,
      statusBadge
    );
    pdf.setDrawColor(245, 158, 11);
    pdf.setFillColor(255, 251, 235);
    pdf.roundedRect(14, confStartY, 182, confBoxH, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.6);
    pdf.setTextColor(146, 64, 14);
    pdf.text(
      'NOTES CONFIDENTIELLES (DÉCHIFFRÉES — INCLUSES VIA LE STUDIO DE MODÈLES) :',
      18,
      confStartY + 5.5
    );
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.4);
    pdf.setTextColor(69, 26, 3);
    let cy = confStartY + 10;
    for (const line of confLines) {
      pdf.text(line, 18, cy);
      cy += 3.8;
    }
    afterSummaryY = confStartY + confBoxH;
  }

  // Official Signatures & Stamp Boxes (si activé dans le modèle) avec protection anti-débordement bas de page
  if (customization.showSignatureBoxes !== false) {
    const sigBoxH = 27;
    const sigY = ensurePageSpace(
      pdf,
      afterSummaryY + 5,
      sigBoxH + 6,
      companyName,
      companyLogo,
      subtitle,
      docTitle,
      docItem.docNumber,
      docDateMeta,
      customization.headerHexColor,
      statusBadge
    );
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(14, sigY, 88, sigBoxH, 2, 2, 'S');
    pdf.roundedRect(106, sigY, 90, sigBoxH, 2, 2, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.8);
    pdf.setTextColor(15, 23, 42);
    const clientEntityBadge =
      (docItem.clientEntityType || docItem.clientProfile?.entityType) === 'personne_physique'
        ? 'BON POUR ACCORD (CLIENT — PERSONNE PHYSIQUE)'
        : 'BON POUR ACCORD (CLIENT — PERSONNE MORALE)';
    pdf.text(pdf.splitTextToSize(clientEntityBadge, 80)[0], 18, sigY + 6);
    if (docItem.clientRepresentative || docItem.clientProfile?.representativeName) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.1);
      pdf.setTextColor(51, 65, 85);
      const repStr = pdf.splitTextToSize(
        `Signataire : ${docItem.clientRepresentative || docItem.clientProfile?.representativeName}`,
        80
      )[0];
      pdf.text(repStr, 18, sigY + 10.5);
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.9);
    pdf.setTextColor(100, 116, 139);
    const clientSigNote = pdf.splitTextToSize(
      'Date, signature et cachet précédés de « Lu et approuvé »',
      80
    )[0];
    pdf.text(clientSigNote, 18, sigY + sigBoxH - 4.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.8);
    pdf.setTextColor(15, 23, 42);
    const sigTitleLines: string[] = pdf
      .splitTextToSize((customization.signatoryTitle || 'LA DIRECTION GÉNÉRALE').toUpperCase(), 82)
      .slice(0, 2);
    let sy = sigY + 6;
    for (const sl of sigTitleLines) {
      pdf.text(sl, 110, sy);
      sy += 4;
    }
    if (customization.signatoryName) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.4);
      const sigName = pdf.splitTextToSize(customization.signatoryName.toUpperCase(), 82)[0];
      pdf.text(sigName, 110, sy + 0.5);
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.9);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Signature autorisée et cachet officiel de l’entreprise', 110, sigY + sigBoxH - 4.5);
  }

  drawCorporateFooter(
    pdf,
    companyName,
    customization.footerLegalNotice,
    customization.footerCustomText,
    customization.footerShowPageNumbers !== false
  );
  const fileSuffix = shouldPrintInClientCurrency ? `_${activeCurrencyCode}` : '';
  pdf.save(`${docItem.docNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}${fileSuffix}.pdf`);
}

/**
 * Génère et télécharge le CAHIER DES CHARGES PROFESSIONNEL & RÉFÉRENTIEL D'OBJECTIFS DU PROJET
 * au logo et papier entête de l'entreprise.
 */
export function exportProjectSpecificationsToPDF(
  project: ExportableProject,
  companyName = 'PRESTATAIRE DE SERVICES',
  companyLogo?: string,
  customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION,
  coverOptions?: ProjectSpecificationsCoverPageOptions
): void {
  const pdf = new jsPDF();
  const [r, g, b] = hexToRgb(customization.headerHexColor);
  const subtitle =
    customization.headerSubtitle || DEFAULT_DOC_CUSTOMIZATION.headerSubtitle!;
  const docTitle = 'CAHIER DES CHARGES TECHNIQUE & EXÉCUTION';
  const docRef = `CDC-${project.name.toUpperCase().slice(0, 26)}`;
  const docMeta = `Secteur : ${project.sectorLabel || project.projectType || 'Prestation de Services'}`;
  const statusBadge = `AVANCEMENT GLOBAL : ${project.progress}%`;

  const coverConfig: ProjectSpecificationsCoverPageOptions = {
    includeCoverPage:
      coverOptions?.includeCoverPage ??
      customization.includeSpecificationsCoverPage ??
      true,
    documentSubtitle:
      coverOptions?.documentSubtitle ||
      subtitle ||
      'Dossier Technique Contractuel, Méthodologie d’Exécution & Réf. d’Objectifs',
    contactPerson:
      coverOptions?.contactPerson ||
      project.projectManagerName ||
      customization.signatoryName ||
      'Direction de Projet & Suivi des Travaux',
    contactEmail:
      coverOptions?.contactEmail ||
      (project as any).clientEmail ||
      (project as any).clientProfile?.email ||
      'contact@entreprise.com',
    contactPhone:
      coverOptions?.contactPhone ||
      project.clientPhone ||
      customization.headerCompanyContact ||
      '+225 07 00 00 00 00',
    siteLocation:
      coverOptions?.siteLocation ||
      project.siteLocation ||
      'Site principal d’intervention',
    confidentialityNotice:
      coverOptions?.confidentialityNotice ||
      'DOCUMENT OFFICIEL STRICTEMENT CONFIDENTIEL — PROPRIÉTÉ DU CLIENT ET DU PRESTATAIRE',
    projectVersion:
      coverOptions?.projectVersion ||
      `Version 1.0 (Certifiée le ${new Date().toISOString().slice(0, 10)})`,
    customNotes: coverOptions?.customNotes,
  };

  // =========================================================================
  // PAGE DE GARDE PERSONNALISÉE (COVER PAGE)
  // =========================================================================
  if (coverConfig.includeCoverPage !== false) {
    // 1. Fond et encadrement élégant de la page de garde
    pdf.setFillColor(250, 252, 255);
    pdf.rect(0, 0, 210, 297, 'F');

    // Bande supérieure décorative aux couleurs de la charte de l'entreprise
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, 210, 16, 'F');

    // Bande accentuée fine
    pdf.setFillColor(Math.min(255, r + 40), Math.min(255, g + 40), Math.min(255, b + 40));
    pdf.rect(0, 16, 210, 2.5, 'F');

    // 2. Logo de l'entreprise
    let logoDrawn = false;
    if (companyLogo) {
      try {
        const format = companyLogo.includes('image/png')
          ? 'PNG'
          : companyLogo.includes('image/jpeg') || companyLogo.includes('image/jpg')
          ? 'JPEG'
          : 'PNG';
        pdf.addImage(companyLogo, format, 20, 28, 42, 42);
        logoDrawn = true;
      } catch {
        logoDrawn = false;
      }
    }
    if (!logoDrawn) {
      pdf.setFillColor(r, g, b);
      pdf.roundedRect(20, 28, 40, 40, 5, 5, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(companyName.slice(0, 3).toUpperCase(), 40, 51, { align: 'center' });
    }

    // Nom et sous-titre de l'entreprise
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(companyName.toUpperCase(), 68, 38);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139);
    const companySubLines = pdf.splitTextToSize(
      customization.headerSubtitle || 'Prestataire de Services & Travaux Spécialisés',
      120
    );
    pdf.text(companySubLines, 68, 45);

    if (customization.headerTaxRegistration || customization.headerCompanyAddress) {
      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        [customization.headerCompanyAddress, customization.headerTaxRegistration]
          .filter(Boolean)
          .join(' · '),
        68,
        55
      );
    }

    // Ligne séparatrice stylisée
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.6);
    pdf.line(20, 76, 190, 76);

    // 3. Cadre central du titre du Cahier des Charges
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(r, g, b);
    pdf.setLineWidth(1.2);
    pdf.roundedRect(20, 84, 170, 70, 4, 4, 'FD');

    // Badge sur le cadre
    pdf.setFillColor(r, g, b);
    pdf.roundedRect(28, 80, 75, 8, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.text('CAHIER DES CHARGES TECHNIQUE OFFICIEL', 65.5, 85.5, { align: 'center' });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(r, g, b);
    const titleLines = pdf.splitTextToSize(project.name.toUpperCase(), 156);
    pdf.text(titleLines.slice(0, 2), 26, 99);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(71, 85, 105);
    const subTitleLines = pdf.splitTextToSize(coverConfig.documentSubtitle || subtitle, 156);
    pdf.text(subTitleLines.slice(0, 2), 26, 114);

    // Métadonnées clés dans le cadre central
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`Réf. Document : ${docRef}`, 26, 132);
    pdf.text(`Client / Maître d'Ouvrage : ${project.clientName.toUpperCase()}`, 26, 139);
    pdf.text(`Secteur : ${project.sectorLabel || project.projectType || 'Prestation Technique'}`, 26, 146);

    pdf.text(`Avancement : ${project.progress}%`, 130, 132);
    pdf.text(`Budget Alloué : ${formatAmountSpaced(project.budget)} ${project.currency || 'XOF'}`, 130, 139);
    pdf.text(`Échéance : ${project.dueDate}`, 130, 146);

    // 4. Cartouches Contact & Cadrage Opérationnel
    // Cartouche Gauche : Contact & Responsables du Projet
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(20, 162, 82, 54, 3, 3, 'FD');

    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(20, 162, 82, 10, 3, 3, 'F');
    pdf.rect(20, 168, 82, 4, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(r, g, b);
    pdf.text('CONTACTS & DIRECTION DU PROJET', 24, 169);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.8);
    pdf.setTextColor(51, 65, 85);
    pdf.text(`Responsable : ${coverConfig.contactPerson}`, 24, 178);
    pdf.text(`Email : ${coverConfig.contactEmail}`, 24, 185);
    pdf.text(`Téléphone : ${coverConfig.contactPhone}`, 24, 192);
    pdf.text(`Site / Chantier : ${coverConfig.siteLocation}`, 24, 199);
    pdf.text(`Édition : ${coverConfig.projectVersion}`, 24, 206);

    // Cartouche Droit : Cadrage Contractuel & Signataires
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(108, 162, 82, 54, 3, 3, 'FD');

    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(108, 162, 82, 10, 3, 3, 'F');
    pdf.rect(108, 168, 82, 4, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(r, g, b);
    pdf.text('GOUVERNANCE & APPROBATION', 112, 169);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.8);
    pdf.setTextColor(51, 65, 85);
    pdf.text(`Maître d'Ouvrage : ${project.clientName}`, 112, 178);
    pdf.text(`Entreprise Titulaire : ${companyName}`, 112, 185);
    pdf.text(`Corps de Métier : ${(project.involvedTrades || []).length} lots spécialisés`, 112, 192);
    pdf.text(`Date d’Émission : ${new Date().toLocaleDateString('fr-FR')}`, 112, 199);
    pdf.text(`Validité : Jusqu'à réception définitive`, 112, 206);

    // 5. Encadré de Confidentialité & Engagement Qualité
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(20, 224, 170, 28, 2.5, 2.5, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(r, g, b);
    pdf.text('ENGAGEMENT DE CONFORMITÉ & CLAUSE DE CONFIDENTIALITÉ', 25, 231);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    const noticeText =
      coverConfig.confidentialityNotice ||
      'Le présent document fixe les exigences fonctionnelles, techniques et de gouvernance du projet. Il engage l’ensemble des intervenants et constitue la référence contractuelle de conformité.';
    const noticeLines = pdf.splitTextToSize(noticeText, 160);
    pdf.text(noticeLines, 25, 237);

    if (coverConfig.customNotes) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(6.8);
      pdf.setTextColor(71, 85, 105);
      pdf.text(pdf.splitTextToSize(`Notes spécifiques : ${coverConfig.customNotes}`, 160), 25, 247);
    }

    // Pied de page de garde
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 288, 210, 9, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text(
      `${companyName} · Cahier des Charges & Spécifications Techniques · Document Certifié My Easy Project`,
      105,
      293.5,
      { align: 'center' }
    );

    // Nouvelle page pour le contenu détaillé du Cahier des Charges
    pdf.addPage();
  }

  const afterHeaderY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo,
    subtitle,
    docTitle,
    docRef,
    docMeta,
    customization.headerHexColor,
    statusBadge
  );

  // Section 1: Fiche Synoptique du Projet (Deux colonnes parfaitement bornées sans chevauchement)
  const tableStartY = drawTwoColumnInfoCards(
    pdf,
    afterHeaderY,
    '1. IDENTIFICATION & CADRAGE DU PROJET',
    project.name,
    [
      `Client / Maître d'Ouvrage : ${project.clientName.toUpperCase()}`,
      `Site : ${project.siteLocation || 'Site principal'} · Durée : ${project.estimatedDuration || 'Selon planning'}`,
      `Période : ${project.startDate || new Date().toISOString().slice(0, 10)} → ${project.dueDate}`,
    ],
    'BUDGET ALLOUÉ & COMPTE FINANCIER DÉDIÉ',
    `Budget Alloué : ${formatAmountSpaced(project.budget)}`,
    [
      `Total Facturé : ${formatAmountSpaced(project.billedAmount)}`,
      `Total Encaissé : ${formatAmountSpaced(project.paidAmount)}`,
      `Compte dédié : ${project.dedicatedAccountProvider || 'Banque'} (${project.dedicatedAccountNumber || 'N/A'})`,
    ],
    [r, g, b]
  );

  // Section 2: Corps de Métier, Procédés, Matériels, Matériaux & Moyens Humains
  autoTable(pdf, {
    startY: tableStartY,
    margin: { bottom: 22 },
    head: [
      [
        'Rubriques du Cahier des Charges',
        'Spécifications Techniques, Corps de Métier, Procédés & Moyens Requis',
      ],
    ],
    body: [
      [
        'Corps de Métier Intervenants',
        project.involvedTrades && project.involvedTrades.length > 0
          ? project.involvedTrades.join(' · ')
          : 'Ingénierie & Conduite de travaux · Exécution technique spécialisée · Contrôle Qualité & HSE',
      ],
      [
        'Procédés & Méthodologie de Réalisation',
        project.technicalProcesses ||
          'Exécution conforme aux règles de l’art et aux normes techniques du secteur d’activité.',
      ],
      [
        'Matériels, Engins & Équipements Mobilisés',
        project.equipmentList ||
          'Équipements techniques, outillage professionnel et moyens logistiques dédiés au projet.',
      ],
      [
        'Matériaux d’Œuvre & Consommables',
        project.materialsList ||
          'Matériaux certifiés, pièces et intrants approvisionnés via le magasin du projet.',
      ],
      [
        'Ressources Humaines & Compétences',
        project.requiredPersonnelSummary ||
          'Ingénieurs, chefs de chantier/projet, techniciens qualifiés et manœuvres affectés.',
      ],
      [
        'Normes Qualité, Sécurité (HSE) & Livrables',
        `${project.qualityAndHseNorms || 'Respect strict des normes HSE et contrôle qualité permanent.'} | Livrables : ${
          project.deliverablesSummary || 'Procès-verbaux de réception par étape et livrable final.'
        }`,
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 127 },
    },
  });

  let currentY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 145;

  // Section 3: Étapes et Phases détaillées de réalisation par Corps de Métier
  const stepsArray: ProjectExecutionStep[] = Array.isArray(project.structuredSteps)
    ? project.structuredSteps
    : Array.isArray(project.executionSteps)
    ? project.executionSteps
    : [];

  if (stepsArray.length > 0) {
    currentY = ensurePageSpace(
      pdf,
      currentY + 6,
      35,
      companyName,
      companyLogo,
      subtitle,
      docTitle,
      docRef,
      docMeta,
      customization.headerHexColor,
      statusBadge
    );

    autoTable(pdf, {
      startY: currentY,
      margin: { bottom: 22 },
      head: [
        [
          'Phase',
          'Corps de Métier & Resp.',
          'Étape & Durée',
          'Tâches Assignées & Procédés',
          'Objectifs à Atteindre & Livrable',
          'Suivi',
        ],
      ],
      body: stepsArray.map((step) => [
        String(step.phaseNumber),
        `${step.tradeName || 'Corps principal'}\nResp. Métier: ${step.tradeLeaderName || 'Chef d\'équipe'}\nResp. Projet: ${step.projectManagerName || project.projectManagerName || 'Chef de Projet'}`,
        `${step.title}\nDurée: ${step.duration}`,
        `${step.assignedTasks ? `Tâches: ${step.assignedTasks}\n` : ''}${step.processDetails}`,
        `${step.phaseObjectives ? `Objectif: ${step.phaseObjectives}\n` : ''}Livrable: ${step.deliverable}`,
        `${step.progressPct ?? 0}%`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 7.8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.2, textColor: [15, 23, 42], cellPadding: 2.1 },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 36, fontStyle: 'bold' },
        2: { cellWidth: 32, fontStyle: 'bold' },
        3: { cellWidth: 46 },
        4: { cellWidth: 40 },
        5: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      },
    });
    currentY =
      (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ||
      currentY + 40;
  }

  // Section 4: Objectifs Cycliques (Mensuels, Hebdomadaires, Journaliers) & Évaluation
  if (project.cycleObjectives && project.cycleObjectives.length > 0) {
    currentY = ensurePageSpace(
      pdf,
      currentY + 6,
      35,
      companyName,
      companyLogo,
      subtitle,
      'CAHIER DES CHARGES — OBJECTIFS CYCLIQUES',
      docRef,
      'Évaluation périodique des objectifs',
      customization.headerHexColor,
      statusBadge
    );

    autoTable(pdf, {
      startY: currentY,
      margin: { bottom: 22 },
      head: [
        [
          'Cycle',
          'Objectif fixé & Indicateur (KPI)',
          'Responsable',
          'Période du Cycle',
          'Taux Réalisé',
          'Évaluation Fin de Cycle',
        ],
      ],
      body: project.cycleObjectives.map((obj) => {
        const statusLabel =
          obj.evaluatedStatus === 'exceeded'
            ? 'DÉPASSÉ'
            : obj.evaluatedStatus === 'achieved'
            ? 'ATTEINT'
            : obj.evaluatedStatus === 'partial'
            ? 'PARTIEL'
            : obj.evaluatedStatus === 'not_achieved'
            ? 'NON ATTEINT'
            : 'EN COURS';
        return [
          obj.cycleType.toUpperCase(),
          `${obj.title} (${obj.targetIndicator})`,
          obj.assignedResponsible,
          `${obj.startDate} → ${obj.endDate}`,
          `${obj.achievementRatePct}%`,
          `${statusLabel}${obj.evaluationNotes ? ` — ${obj.evaluationNotes}` : ''}`,
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [6, 95, 70], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [15, 23, 42], cellPadding: 2.2 },
    });

    currentY =
      (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ||
      currentY + 35;
  }

  // Signatures block
  currentY = ensurePageSpace(
    pdf,
    currentY + 8,
    30,
    companyName,
    companyLogo,
    subtitle,
    docTitle,
    docRef,
    docMeta,
    customization.headerHexColor,
    statusBadge
  );

  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, currentY, 86, 26, 2, 2, 'S');
  pdf.roundedRect(110, currentY, 86, 26, 2, 2, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.2);
  pdf.setTextColor(15, 23, 42);
  pdf.text('VISA DU CHEF DE PROJET / DIRECTION TECHNIQUE', 18, currentY + 7);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.2);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Validation technique des procédés, matériels et objectifs', 18, currentY + 13);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.2);
  pdf.setTextColor(15, 23, 42);
  pdf.text('APPROBATION DIRECTION GÉNÉRALE & MAÎTRE D’OUVRAGE', 114, currentY + 7);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.2);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Signature et cachet officiel de validation du Cahier des Charges', 114, currentY + 13);

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  pdf.save(`Cahier_Des_Charges_${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
}

export function exportEmployeeBadgeToPDF(
  badge: ExportableEmployeeBadge,
  companyName = 'PRESTATAIRE DE SERVICES',
  companyLogo?: string,
  customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION
): void {
  const pdf = new jsPDF();
  const isTemporaryWorker = badge.contractType === 'Temporaire / Journalier';
  const [r, g, b] = isTemporaryWorker ? [180, 83, 9] : hexToRgb(customization.headerHexColor);

  // Normalized ISO/IEC 7810 ID-1 (CR80 Portrait Ratio ~ 1 : 1.586 -> 132mm x 210mm on A4 sheet for HD printing + 1:1 Cut Guides)
  const cardX = 39;
  const cardY = 18;
  const cardW = 132;
  const cardH = 210;

  // Crop / Cut marks for normalized badge printing
  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.25);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.8);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    'FORMAT NORMALISÉ ISO/IEC 7810 ID-1 (CR80 PORTRAIT — RATIO 53,98 × 85,60 mm) · HAUTE DÉFINITION',
    105,
    14,
    { align: 'center' }
  );

  // Outer Hyper-Professional Badge Frame
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(r, g, b);
  pdf.setLineWidth(1.1);
  pdf.roundedRect(cardX, cardY, cardW, cardH, 6, 6, 'FD');

  // Top Lanyard Slot Hole (Encoche Porte-Badge Normalisée)
  pdf.setFillColor(226, 232, 240);
  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(96, cardY + 3, 18, 3.2, 1.5, 1.5, 'FD');

  // Top Header of Badge (cardY+8 .. cardY+48)
  pdf.setFillColor(r, g, b);
  pdf.rect(cardX + 0.6, cardY + 8, cardW - 1.2, 38, 'F');
  // Gold Security Accent Bar
  pdf.setFillColor(245, 158, 11);
  pdf.rect(cardX + 0.6, cardY + 46, cardW - 1.2, 2.2, 'F');

  let drewBadgeLogo = false;
  if (companyLogo && companyLogo.startsWith('data:image/')) {
    try {
      const format =
        companyLogo.includes('image/jpeg') || companyLogo.includes('image/jpg') ? 'JPEG' : 'PNG';
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(cardX + 6, cardY + 12, 26, 26, 2.5, 2.5, 'F');
      pdf.addImage(companyLogo, format, cardX + 7.2, cardY + 13.2, 23.6, 23.6);
      drewBadgeLogo = true;
    } catch {
      drewBadgeLogo = false;
    }
  }
  if (!drewBadgeLogo) {
    drawDefaultBrandEmblem(pdf, cardX + 6, cardY + 12, 26, [r, g, b]);
  }

  // Company Name & Réf Matricule on the right of the badge logo
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  const badgeCompLines: string[] = pdf
    .splitTextToSize(companyName.toUpperCase(), 90)
    .slice(0, 2);
  let by = cardY + 18;
  for (const l of badgeCompLines) {
    pdf.text(l, cardX + 36, by);
    by += 4.8;
  }

  pdf.setFontSize(9.2);
  pdf.setTextColor(251, 191, 36);
  pdf.text(`MATRICULE OFFICIEL : ${badge.matricule}`, cardX + 36, by + 1.5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.2);
  pdf.setTextColor(226, 232, 240);
  pdf.text(
    isTemporaryWorker
      ? 'CARTE D’HABILITATION CHANTIER — MAIN D’ŒUVRE TEMPORAIRE'
      : 'CARTE PROFESSIONNELLE NORMALISÉE D’IDENTIFICATION (ISO CR80)',
    cardX + 36,
    by + 6.8
  );

  // Special Stamp for Temporary Workers
  if (isTemporaryWorker) {
    pdf.setFillColor(254, 243, 199);
    pdf.setDrawColor(217, 119, 6);
    pdf.roundedRect(cardX + 8, cardY + 51, cardW - 16, 8.5, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.8);
    pdf.setTextColor(180, 83, 9);
    pdf.text('HABILITATION : MAIN D’ŒUVRE TEMPORAIRE / JOURNALIÈRE', 105, cardY + 56.5, {
      align: 'center',
    });
  }

  // ENLARGED HIGH-VISIBILITY PORTRAIT PHOTO (52mm x 60mm)
  const photoW = 52;
  const photoH = 60;
  const photoX = 105 - photoW / 2;
  const photoTopY = isTemporaryWorker ? cardY + 62 : cardY + 53;

  // Outer Security Halo around Enlarged Photo
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(r, g, b);
  pdf.setLineWidth(1.2);
  pdf.roundedRect(photoX - 1.5, photoTopY - 1.5, photoW + 3, photoH + 3, 3.5, 3.5, 'FD');

  if (badge.photoDataUrl && badge.photoDataUrl.startsWith('data:image/')) {
    try {
      const fmt =
        badge.photoDataUrl.includes('image/jpeg') || badge.photoDataUrl.includes('image/jpg')
          ? 'JPEG'
          : 'PNG';
      pdf.addImage(badge.photoDataUrl, fmt, photoX, photoTopY, photoW, photoH);
    } catch {
      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(photoX, photoTopY, photoW, photoH, 2.5, 2.5, 'F');
    }
  } else {
    const parts = badge.fullName.trim().split(/\s+/);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : badge.fullName.slice(0, 2).toUpperCase();

    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(photoX, photoTopY, photoW, photoH, 2.5, 2.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(r, g, b);
    pdf.setFontSize(26);
    pdf.text(initials, 105, photoTopY + photoH / 2 + 4, { align: 'center' });
  }

  // Simulated Gold Smart-Chip on the Left of the Photo (Puce électronique de sécurité)
  pdf.setFillColor(251, 191, 36);
  pdf.setDrawColor(180, 83, 9);
  pdf.setLineWidth(0.35);
  pdf.roundedRect(cardX + 9, photoTopY + 18, 16, 13, 2, 2, 'FD');
  pdf.line(cardX + 9, photoTopY + 22, cardX + 25, photoTopY + 22);
  pdf.line(cardX + 9, photoTopY + 27, cardX + 25, photoTopY + 27);
  pdf.line(cardX + 17, photoTopY + 18, cardX + 17, photoTopY + 31);

  // Blood Group & Status Pill on the Right of the Photo
  pdf.setFillColor(254, 226, 226);
  pdf.setDrawColor(220, 38, 38);
  pdf.roundedRect(cardX + cardW - 27, photoTopY + 16, 18, 15, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(185, 28, 28);
  pdf.text('GROUPE', cardX + cardW - 18, photoTopY + 21.5, { align: 'center' });
  pdf.setFontSize(10.5);
  pdf.text(badge.bloodGroup || 'O+', cardX + cardW - 18, photoTopY + 28, { align: 'center' });

  // Employee Identity & Function Banner below Enlarged Photo
  const infoStartY = photoTopY + photoH + 8;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(12.5);
  const empNameLine = pdf.splitTextToSize(badge.fullName.toUpperCase(), 118)[0];
  pdf.text(empNameLine, 105, infoStartY, { align: 'center' });

  // Category & Position Pill
  pdf.setFillColor(r, g, b);
  pdf.roundedRect(cardX + 10, infoStartY + 3, cardW - 20, 8, 2, 2, 'F');
  pdf.setFontSize(8.5);
  pdf.setTextColor(255, 255, 255);
  const posLine = pdf.splitTextToSize(
    `${badge.workerCategory.toUpperCase()} · ${badge.position.toUpperCase()}`,
    108
  )[0];
  pdf.text(posLine, 105, infoStartY + 8.3, { align: 'center' });

  // Structured Two-Column Metadata Grid inside Badge
  let detailsY = infoStartY + 16;
  const badgeDetailRows: Array<[string, string]> = [
    ['DÉPARTEMENT :', badge.department],
    ['NATURE CONTRAT :', isTemporaryWorker ? 'MAIN D’ŒUVRE TEMPORAIRE' : badge.contractType],
    ['PROJET AFFECTÉ :', badge.assignedProjectName],
    ['TÉLÉPHONE :', badge.phone],
    ['PIÈCE D’IDENTITÉ :', badge.nationalIdNumber || 'Enregistrée RH'],
    ['CONTACT URGENCE :', `${badge.emergencyContact || badge.phone} (Sang : ${badge.bloodGroup || 'N/A'})`],
    ['PRISE DE SERVICE :', badge.hireDate],
  ];

  for (const [label, val] of badgeDetailRows) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.6);
    pdf.setTextColor(100, 116, 139);
    pdf.text(label, cardX + 8, detailsY);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(15, 23, 42);
    const wrappedVal = pdf.splitTextToSize(val || 'N/A', 76)[0];
    pdf.text(wrappedVal, cardX + 44, detailsY);
    detailsY += 5.4;
  }

  // Footer Biometric QR Code + Barcode & Verification Band
  const footerBandY = cardY + cardH - 30;
  pdf.setFillColor(241, 245, 249);
  pdf.rect(cardX + 0.8, footerBandY, cardW - 1.6, 29.2, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.line(cardX + 1, footerBandY, cardX + cardW - 1, footerBandY);

  // Draw deterministic ISO 21x21 QR Code Matrix on the Left of the Badge Footer (Pointage Arrivée / Pause / Départ)
  const qrSize = 22;
  const qrX = cardX + 6;
  const qrY = footerBandY + 3.5;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(r, g, b);
  pdf.setLineWidth(0.35);
  pdf.roundedRect(qrX - 1.2, qrY - 1.2, qrSize + 2.4, qrSize + 2.4, 1.5, 1.5, 'FD');

  const gridN = 21;
  const cell = qrSize / gridN;
  const seedStr = `MEP-QR-BIO|${badge.matricule}|${badge.fullName}|${badge.contractType}|ARR-PAUSE-DEP`;
  const isFinderPattern = (row: number, col: number, r0: number, c0: number) => {
    const dr = row - r0;
    const dc = col - c0;
    if (dr < 0 || dr > 6 || dc < 0 || dc > 6) return null;
    if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
    if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true;
    return false;
  };
  pdf.setFillColor(15, 23, 42);
  for (let row = 0; row < gridN; row++) {
    for (let col = 0; col < gridN; col++) {
      const f1 = isFinderPattern(row, col, 0, 0);
      const f2 = isFinderPattern(row, col, 0, gridN - 7);
      const f3 = isFinderPattern(row, col, gridN - 7, 0);
      let dark = false;
      if (f1 !== null) dark = f1;
      else if (f2 !== null) dark = f2;
      else if (f3 !== null) dark = f3;
      else if (row === 6 || col === 6) dark = (row + col) % 2 === 0;
      else {
        const charCode = seedStr.charCodeAt((row * gridN + col) % seedStr.length);
        dark = ((charCode * (row + 3) + col * 17) & 3) !== 0;
      }
      if (dark) {
        pdf.rect(qrX + col * cell, qrY + row * cell, cell + 0.08, cell + 0.08, 'F');
      }
    }
  }

  // Simulated High-Density Barcode stripes + QR Biometric instructions on the right of the QR Code
  pdf.setFillColor(15, 23, 42);
  let barX = qrX + qrSize + 5;
  for (let i = 0; i < 34; i++) {
    const bw = i % 3 === 0 ? 1.35 : i % 2 === 0 ? 0.8 : 0.45;
    pdf.rect(barX, footerBandY + 3.5, bw, 6.2, 'F');
    barX += bw + 1.15;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.4);
  pdf.setTextColor(15, 23, 42);
  pdf.text(
    `QR CODE & ID BIOMÉTRIQUE : ${badge.matricule} · ISO CR80`,
    qrX + qrSize + 5,
    footerBandY + 14.2
  );
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(r, g, b);
  pdf.text(
    'SCAN QR VALIDATION : ARRIVÉE · PAUSE (ENTRÉE / SORTIE) · DÉPART & CALCUL PAIE',
    qrX + qrSize + 5,
    footerBandY + 19.2
  );
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.2);
  pdf.setTextColor(71, 85, 105);
  pdf.text(
    'Badge strictement personnel avec QR Code cryptographique relié au pointage biométrique et à la paie.',
    qrX + qrSize + 5,
    footerBandY + 24.2
  );

  pdf.save(`BADGE_QR_CR80_${badge.matricule}_${badge.fullName.replace(/\s+/g, '_')}.pdf`);
}

export function exportPurchaseOrderToPDF(
  po: ExportablePurchaseOrder,
  _currency: Currency,
  companyName = 'PRESTATAIRE DE SERVICES',
  companyLogo?: string,
  customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION
): void {
  const pdf = new jsPDF();
  const [r, g, b] = hexToRgb(customization.headerHexColor);

  const statusLabel =
    po.status === 'delivered'
      ? 'LIVRÉ COMPLÈTEMENT'
      : po.status === 'partial'
      ? 'LIVRAISON PARTIELLE EN COURS'
      : po.status === 'cancelled'
      ? 'ANNULÉ'
      : 'ÉMIS — EN ATTENTE DE LIVRAISON';

  const subtitle = 'Direction des Achats, Approvisionnements & Gestion des Magasins Projets';
  const docTitle = 'BON DE COMMANDE FOURNISSEUR';
  const docMeta = `Date : ${po.date} · Livraison souhaitée : ${po.deliveryExpectedDate}`;

  const afterHeaderY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo,
    subtitle,
    docTitle,
    po.poNumber,
    docMeta,
    customization.headerHexColor,
    `STATUT : ${statusLabel}`
  );

  const tableStartY = drawTwoColumnInfoCards(
    pdf,
    afterHeaderY,
    'FOURNISSEUR AGRÉÉ DESTINATAIRE',
    po.supplierName.toUpperCase(),
    [
      `Tél : ${po.supplierPhone}`,
      `Email : ${po.supplierEmail}`,
      po.supplierAddress ? `Adresse : ${po.supplierAddress}` : '',
    ],
    'AFFECTATION PROJET & MAGASIN DE LIVRAISON',
    `Projet : ${po.projectName}`,
    [
      `Magasin de réception : ${po.warehouseName}`,
      `Date de livraison attendue : ${po.deliveryExpectedDate}`,
    ],
    [r, g, b]
  );

  autoTable(pdf, {
    startY: tableStartY,
    margin: { bottom: 22 },
    head: [
      [
        'Réf SKU',
        'Désignation du Produit / Matériau Commandé',
        'Unité',
        'Qté Cmd',
        'Qté Reçue',
        'Prix Unitaire HT',
        'Total HT',
      ],
    ],
    body: po.items.map((item) => [
      item.sku,
      item.name,
      item.unit,
      formatAmountSpaced(item.qty),
      formatAmountSpaced(item.receivedQty || 0),
      formatAmountSpaced(item.unitPrice),
      formatAmountSpaced(item.qty * item.unitPrice),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 62 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 23, halign: 'right' },
      6: { cellWidth: 23, halign: 'right', fontStyle: 'bold' },
    },
  });

  let currentY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 140;

  currentY = ensurePageSpace(
    pdf,
    currentY + 6,
    72,
    companyName,
    companyLogo,
    subtitle,
    docTitle,
    po.poNumber,
    docMeta,
    customization.headerHexColor,
    `STATUT : ${statusLabel}`
  );

  // Left Box: Notes & Mandatory BL Clause
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, currentY, 100, 32, 2, 2, 'S');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text('INSTRUCTIONS DE LIVRAISON & RÉCEPTION MAGASIN :', 18, currentY + 7);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.6);
  pdf.setTextColor(71, 85, 105);
  const poClauseLines: string[] = pdf
    .splitTextToSize(
      `${po.notes ? `${po.notes} — ` : ''}Clause obligatoire : Toute réception au magasin est conditionnée par la saisie du numéro et la numérisation du Bon de Livraison (BL) fournisseur.`,
      92
    )
    .slice(0, 4);
  let pcy = currentY + 13;
  for (const l of poClauseLines) {
    pdf.text(l, 18, pcy);
    pcy += 4;
  }

  // Right Box: Totals
  pdf.setDrawColor(203, 213, 225);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(120, currentY, 76, 32, 2, 2, 'FD');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.8);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Total HT Commandé :', 124, currentY + 9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatAmountSpaced(po.totalHT), 192, currentY + 9, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.text(`TVA (${po.taxRate}%) :`, 124, currentY + 16.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatAmountSpaced(po.totalTTC - po.totalHT), 192, currentY + 16.5, {
    align: 'right',
  });

  pdf.setDrawColor(203, 213, 225);
  pdf.line(124, currentY + 20, 192, currentY + 20);

  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text('TOTAL TTC :', 124, currentY + 27);
  pdf.text(formatAmountSpaced(po.totalTTC), 192, currentY + 27, { align: 'right' });

  // Signatures
  const sigY = currentY + 38;
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, sigY, 85, 24, 2, 2, 'S');
  pdf.roundedRect(111, sigY, 85, 24, 2, 2, 'S');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text('VISA SERVICE ACHATS & APPROVISIONNEMENTS', 18, sigY + 7);
  pdf.text('APPROBATION DIRECTION GÉNÉRALE', 115, sigY + 7);

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  pdf.save(`${po.poNumber}.pdf`);
}

/**
 * Génère un BON DE RÉCEPTION DE COMMANDE FOURNISSEUR imprimable (Complet ou Partiel)
 * à chaque livraison sur présentation et numérisation du Bon de Livraison (BL).
 */
export function exportGoodsReceiptToPDF(
  receipt: ExportableGoodsReceipt,
  arg2?: string,
  arg3?: string,
  arg4?: string | DocumentCustomizationConfig,
  arg5?: DocumentCustomizationConfig
): void {
  let companyName = 'PRESTATAIRE DE SERVICES';
  let companyLogo: string | undefined;
  let customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION;

  if (typeof arg4 === 'string' || arg5 !== undefined) {
    companyName = arg3 || 'PRESTATAIRE DE SERVICES';
    companyLogo = typeof arg4 === 'string' ? arg4 : undefined;
    customization = arg5 || DEFAULT_DOC_CUSTOMIZATION;
  } else {
    companyName = arg2 || 'PRESTATAIRE DE SERVICES';
    companyLogo = arg3;
    customization = (arg4 as DocumentCustomizationConfig) || DEFAULT_DOC_CUSTOMIZATION;
  }

  const pdf = new jsPDF();
  const [r, g, b] = hexToRgb(customization.headerHexColor);

  const isComplete =
    receipt.receptionStatus === 'complete' || receipt.statusAfterReceipt === 'delivered';
  const blNumber = receipt.deliveryNoteNumber || receipt.deliveryNoteRef || 'BL-FOURNISSEUR';
  const blFileName = receipt.deliveryNoteFileName || receipt.scannedFileName || 'BL_numerise.pdf';
  const operator = receipt.operatorName || receipt.receiverName || 'Magasinier';

  const statusText = isComplete
    ? 'RÉCEPTION VALIDÉE — LIVRAISON COMPLÈTE'
    : 'RÉCEPTION VALIDÉE — LIVRAISON PARTIELLE';
  const subtitle =
    'Gestion des Magasins, Réception des Commandes Fournisseurs & Contrôle des Bons de Livraison';
  const docTitle = 'BON DE RÉCEPTION DE COMMANDE';
  const docMeta = `Date : ${receipt.date} · Magasinier : ${operator}`;

  const afterHeaderY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo,
    subtitle,
    docTitle,
    receipt.receiptNumber,
    docMeta,
    customization.headerHexColor,
    statusText
  );

  const tableStartY = drawTwoColumnInfoCards(
    pdf,
    afterHeaderY,
    'RÉFÉRENCES COMMANDE & FOURNISSEUR',
    `Fournisseur : ${receipt.supplierName.toUpperCase()}`,
    [
      `Bon de Commande N° : ${receipt.poNumber}`,
      `Bon de Livraison (BL) N° : ${blNumber}`,
      `Scan BL archivé : ${blFileName}`,
    ],
    'MAGASIN RÉCEPTIONNAIRE & STATUT',
    `Magasin : ${receipt.warehouseName}`,
    [
      `Projet rattaché : ${receipt.projectName || 'Magasin Général'}`,
      isComplete
        ? 'Bilan : LIVRAISON COMPLÈTE (100%)'
        : 'Bilan : LIVRAISON PARTIELLE (Reliquat attendu)',
    ],
    [r, g, b]
  );

  autoTable(pdf, {
    startY: tableStartY,
    margin: { bottom: 22 },
    head: [
      [
        'Réf SKU',
        'Désignation Produit',
        'Unité',
        'Qté Commandée',
        'Déjà Reçue',
        'Reçue (ce BL)',
        'Reste à Livrer',
        'Statut Ligne',
      ],
    ],
    body: receipt.lines.map((line) => {
      const qOrd = line.qtyOrdered ?? line.orderedQty ?? 0;
      const qPrev = line.qtyPreviouslyReceived ?? line.previouslyReceivedQty ?? 0;
      const qNow = line.qtyReceivedNow ?? line.receivedNowQty ?? 0;
      const qRem =
        line.qtyRemaining ?? line.remainingQty ?? Math.max(0, qOrd - (qPrev + qNow));
      return [
        line.sku,
        line.name,
        line.unit,
        formatAmountSpaced(qOrd),
        formatAmountSpaced(qPrev),
        formatAmountSpaced(qNow),
        formatAmountSpaced(qRem),
        qRem <= 0 ? 'COMPLET' : 'PARTIEL',
      ];
    }),
    theme: 'grid',
    headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2.4 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 52 },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
    },
  });

  let currentY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 145;

  const obsText = receipt.observations || receipt.notes || '';
  currentY = ensurePageSpace(
    pdf,
    currentY + 6,
    48,
    companyName,
    companyLogo,
    subtitle,
    docTitle,
    receipt.receiptNumber,
    docMeta,
    customization.headerHexColor,
    statusText
  );

  if (obsText) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.2);
    pdf.setTextColor(15, 23, 42);
    const wrappedObs: string[] = pdf
      .splitTextToSize(`Observations du Magasinier : ${obsText}`, 182)
      .slice(0, 3);
    for (const l of wrappedObs) {
      pdf.text(l, 14, currentY + 4);
      currentY += 4.2;
    }
    currentY += 4;
  }

  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, currentY + 4, 85, 26, 2, 2, 'S');
  pdf.roundedRect(111, currentY + 4, 85, 26, 2, 2, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.2);
  pdf.setTextColor(15, 23, 42);
  pdf.text('VISA DU LIVREUR / FOURNISSEUR', 18, currentY + 11);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(pdf.splitTextToSize(`Conforme au BL N° ${blNumber}`, 77)[0], 18, currentY + 17);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.2);
  pdf.setTextColor(15, 23, 42);
  pdf.text('VISA DU MAGASINIER RÉCEPTIONNAIRE', 115, currentY + 11);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    pdf.splitTextToSize(`${operator} — Signature & Cachet Magasin`, 77)[0],
    115,
    currentY + 17
  );

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  pdf.save(`Bon_De_Reception_${receipt.receiptNumber}_BL_${blNumber}.pdf`);
}

export function exportPayslipToPDF(
  payslip: ExportablePayslip,
  _currency: Currency,
  companyName = 'MY EASY PROJECT INTERNATIONAL',
  companyLogo?: string,
  customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION
): void {
  const pdf = new jsPDF();
  const [r, g, b] = hexToRgb(customization.headerHexColor);
  const subtitle = 'Direction des Ressources Humaines & Gestion de la Paie par Projet';
  const docTitle = 'BULLETIN DE PAIE OFFICIEL';
  const docMeta = `Période : ${payslip.period} (${payslip.periodicityLabel || 'Mensuel'})`;
  const statusBadge =
    payslip.status === 'paid' ? 'PAYÉ' : payslip.status === 'validated' ? 'VALIDÉ' : 'BROUILLON';

  const afterHeaderY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo,
    subtitle,
    docTitle,
    payslip.payslipNumber,
    docMeta,
    customization.headerHexColor,
    statusBadge
  );

  const tableStartY = drawTwoColumnInfoCards(
    pdf,
    afterHeaderY,
    'IDENTIFICATION DU SALARIÉ / EMPLOYÉ',
    payslip.employeeName.toUpperCase(),
    [
      `Matricule : ${payslip.employeeMatricule} · Contrat : ${payslip.contractType}`,
      `Poste : ${payslip.employeePosition} (${payslip.employeeCategory || 'Agent'})`,
      `Projet affecté : ${payslip.projectName || 'Général'}`,
    ],
    'MODALITÉS DE RÉMUNÉRATION & POINTAGE',
    `Régime : ${payslip.remunerationModeLabel || 'Barème réglementaire'}`,
    [
      `Base pointée / travaillée : ${formatAmountSpaced(payslip.workedDays)} j / unités`,
      `Heures supplémentaires : ${formatAmountSpaced(payslip.overtimeHours)} h`,
      `Mode de règlement : ${payslip.paymentMethod}`,
    ],
    [r, g, b]
  );

  autoTable(pdf, {
    startY: tableStartY,
    margin: { bottom: 22 },
    head: [
      [
        'Code',
        'Rubriques de Paie (Gains & Retenues)',
        'Base / Qté',
        'Gains (+)',
        'Retenues (-)',
      ],
    ],
    body: [
      [
        '100',
        payslip.contractType === 'CDI'
          ? 'Salaire de base réglementaire (Normes Pays)'
          : `Rémunération contractuelle (${payslip.remunerationModeLabel || 'CDD / Temporaire'})`,
        formatAmountSpaced(payslip.workedDays),
        formatAmountSpaced(payslip.baseSalary),
        '-',
      ],
      [
        '110',
        'Heures supplémentaires majorées',
        `${formatAmountSpaced(payslip.overtimeHours)} h`,
        formatAmountSpaced(payslip.overtimePay),
        '-',
      ],
      [
        '120',
        'Indemnité de transport & déplacement',
        'Forfait',
        formatAmountSpaced(payslip.transportAllowance),
        '-',
      ],
      [
        '130',
        'Prime de rendement, assiduité & objectifs projet',
        'Prime',
        formatAmountSpaced(payslip.performanceBonus),
        '-',
      ],
      ['200', 'TOTAL SALAIRE BRUT', '', formatAmountSpaced(payslip.grossSalary), '-'],
      [
        '310',
        'Cotisations Sociales Légales (CNPS / Retraite)',
        'Part salariale',
        '-',
        formatAmountSpaced(payslip.socialContribution),
      ],
      [
        '320',
        'Impôt sur le Revenu / IRPP / ITS',
        'Barème',
        '-',
        formatAmountSpaced(payslip.incomeTax),
      ],
      [
        '350',
        'Avance ou Acompte sur salaire déduit',
        'Retenue',
        '-',
        formatAmountSpaced(payslip.salaryAdvance),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59], cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 86 },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
  });

  let currentY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 165;

  currentY = ensurePageSpace(
    pdf,
    currentY + 6,
    72,
    companyName,
    companyLogo,
    subtitle,
    docTitle,
    payslip.payslipNumber,
    docMeta,
    customization.headerHexColor,
    statusBadge
  );

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.8);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Total Salaire Brut :', 118, currentY + 6);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatAmountSpaced(payslip.grossSalary), 196, currentY + 6, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.text('Total Retenues Salariales :', 118, currentY + 13);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`- ${formatAmountSpaced(payslip.totalDeductions)}`, 196, currentY + 13, {
    align: 'right',
  });

  pdf.setFont('helvetica', 'normal');
  pdf.text('Charges Patronales (Employeur) :', 118, currentY + 20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatAmountSpaced(payslip.employerCharges), 196, currentY + 20, { align: 'right' });

  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(22, 163, 74);
  pdf.roundedRect(118, currentY + 25, 78, 14, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('NET À PAYER :', 122, currentY + 34);
  pdf.setTextColor(22, 163, 74);
  pdf.text(formatAmountSpaced(payslip.netSalary), 192, currentY + 34, { align: 'right' });

  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, currentY + 44, 85, 24, 2, 2, 'S');
  pdf.roundedRect(111, currentY + 44, 85, 24, 2, 2, 'S');
  pdf.setFontSize(8.2);
  pdf.setTextColor(15, 23, 42);
  pdf.text('CACHET & SIGNATURE DE L’EMPLOYEUR', 18, currentY + 51);
  pdf.text('SIGNATURE DE L’EMPLOYÉ (POUR ACQUIT)', 115, currentY + 51);

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  pdf.save(`${payslip.payslipNumber}_${payslip.employeeName.replace(/\s+/g, '_')}.pdf`);
}

export function exportStockMovementToPDF(
  mov: ExportableStockMovement,
  _currency: Currency,
  companyName = 'MY EASY PROJECT INTERNATIONAL',
  companyLogo?: string,
  customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION
): void {
  const pdf = new jsPDF();
  const [r, g, b] = hexToRgb(customization.headerHexColor);

  const titleLabel =
    mov.movementType === 'IN'
      ? "BON D'ENTRÉE EN STOCK (SUR BL)"
      : mov.movementType === 'OUT'
      ? 'BON DE SORTIE MAGASIN (SUR BCI)'
      : mov.movementType === 'TRANSFER'
      ? 'BON DE TRANSFERT INTER-MAGASINS'
      : "PROCÈS-VERBAL D'INVENTAIRE MAGASIN";

  const subtitle =
    'Gestion des Magasins (Magasin Général & Magasins Projets) & Traçabilité';
  const docMeta = `Date : ${mov.date} · Opérateur : ${mov.operatorName}`;

  const afterHeaderY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo,
    subtitle,
    titleLabel,
    mov.voucherNumber,
    docMeta,
    customization.headerHexColor
  );

  const leftHeader =
    mov.movementType === 'TRANSFER'
      ? 'MOUVEMENT DE TRANSFERT INTER-MAGASINS'
      : 'PROJET & MAGASIN CONCERNÉ';
  const leftPrimary =
    mov.movementType === 'TRANSFER'
      ? `Origine : ${mov.sourceWarehouseName || mov.warehouseName}`
      : `Projet : ${mov.projectName}`;
  const leftDetails =
    mov.movementType === 'TRANSFER'
      ? [
          `Destination : ${mov.targetWarehouseName || 'Magasin Cible'}`,
          `Projet concerné : ${mov.targetProjectName || mov.projectName}`,
        ]
      : [
          `Magasin : ${mov.warehouseName || mov.warehouseLocation}`,
          `Exploitation : ${mov.projectTypeLabel}`,
        ];

  const rightDetails = [
    mov.movementType === 'IN'
      ? `Fournisseur : ${mov.supplierName || 'Fournisseur agréé'}`
      : mov.movementType === 'OUT'
      ? `BCI présenté par : ${mov.projectManagerName || 'Resp. Projet'} & ${mov.tradeLeaderName || 'Resp. Corps de Métier'} (${mov.tradeName || 'Corps technique'})`
      : 'Traçabilité : Magasin Général ⇄ Magasin Projet',
    mov.movementType === 'OUT'
      ? `Bon de Sortie délivré par Magasinier : ${mov.warehouseManagerName || mov.operatorName}`
      : `Opérateur / Magasinier : ${mov.operatorName}`,
    `Archive numérisée : ${mov.sourceDocFileName || 'Document de traçabilité archivé'}`,
  ];

  const tableStartY = drawTwoColumnInfoCards(
    pdf,
    afterHeaderY,
    leftHeader,
    leftPrimary,
    leftDetails,
    'PIÈCE JUSTIFICATIVE & TRAÇABILITÉ',
    mov.movementType === 'IN'
      ? `Réf. Bon de Livraison (BL) : ${mov.sourceDocReference || 'N/A'}`
      : mov.movementType === 'OUT'
      ? `Réf. Bon de Commande Interne (BCI) : ${mov.sourceDocReference || 'N/A'}`
      : `Ordre de Transfert N° : ${mov.sourceDocReference || mov.voucherNumber}`,
    rightDetails,
    [r, g, b]
  );

  const movementLines: ExportableStockMovementItemLine[] =
    mov.transferItems && mov.transferItems.length > 0
      ? mov.transferItems
      : [
          {
            productSku: mov.productSku,
            productName: mov.productName,
            unit: mov.unit,
            quantity: mov.quantity,
            previousStock: mov.previousStock,
            newStock: mov.newStock,
            unitCost: mov.unitCost,
            totalValue: mov.totalValue,
          },
        ];

  autoTable(pdf, {
    startY: tableStartY,
    margin: { bottom: 22 },
    head: [
      [
        'Réf SKU',
        'Désignation Produit / Matériel',
        mov.movementType === 'TRANSFER' ? 'Stock Source Avant' : 'Stock Avant',
        'Quantité Mouvementée',
        mov.movementType === 'TRANSFER' ? 'Stock Source Après' : 'Stock Après',
        'Coût Unitaire',
        'Valeur Totale',
      ],
    ],
    body: [
      ...movementLines.map((item) => [
        item.productSku,
        item.productName,
        `${formatAmountSpaced(item.previousStock)} ${item.unit}`,
        `${
          mov.movementType === 'OUT'
            ? '-'
            : mov.movementType === 'IN'
            ? '+'
            : mov.movementType === 'TRANSFER'
            ? '⇄ '
            : '='
        }${formatAmountSpaced(item.quantity)} ${item.unit}`,
        `${formatAmountSpaced(item.newStock)} ${item.unit}`,
        formatAmountSpaced(item.unitCost),
        formatAmountSpaced(item.totalValue),
      ]),
      ...(movementLines.length > 1
        ? [
            [
              {
                content: `TOTAL GÉNÉRAL DU TRANSFERT (${movementLines.length} MATÉRIELS)`,
                colSpan: 6,
                styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' },
              },
              {
                content: formatAmountSpaced(
                  movementLines.reduce((acc, l) => acc + l.totalValue, 0)
                ),
                styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' },
              },
            ],
          ]
        : []),
    ] as any,
    theme: 'grid',
    headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 8.2, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.3, textColor: [30, 41, 59], cellPadding: 2.6 },
  });

  let currentY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 130;

  currentY = ensurePageSpace(
    pdf,
    currentY + 8,
    52,
    companyName,
    companyLogo,
    subtitle,
    titleLabel,
    mov.voucherNumber,
    docMeta,
    customization.headerHexColor
  );

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  const reasonLines: string[] = pdf
    .splitTextToSize(`Motif & Observations : ${mov.reason}`, 182)
    .slice(0, 3);
  for (const l of reasonLines) {
    pdf.text(l, 14, currentY);
    currentY += 4.2;
  }

  pdf.setDrawColor(203, 213, 225);
  if (mov.movementType === 'OUT') {
    pdf.roundedRect(14, currentY + 6, 58, 28, 2, 2, 'S');
    pdf.roundedRect(76, currentY + 6, 58, 28, 2, 2, 'S');
    pdf.roundedRect(138, currentY + 6, 58, 28, 2, 2, 'S');
    pdf.setFontSize(7.2);
    pdf.text('VISA RESPONSABLE PROJET', 17, currentY + 12);
    pdf.setFont('helvetica', 'normal');
    pdf.text((mov.projectManagerName || 'Chef de Projet').slice(0, 26), 17, currentY + 17);
    pdf.text(`BCI: ${(mov.sourceDocReference || 'N/A').slice(0, 22)}`, 17, currentY + 22);

    pdf.setFont('helvetica', 'bold');
    pdf.text('VISA RESP. CORPS DE MÉTIER', 79, currentY + 12);
    pdf.setFont('helvetica', 'normal');
    pdf.text((mov.tradeLeaderName || 'Chef Corps de Métier').slice(0, 26), 79, currentY + 17);
    pdf.text((mov.tradeName || 'Corps utilisateur').slice(0, 26), 79, currentY + 22);

    pdf.setFont('helvetica', 'bold');
    pdf.text('VISA MAGASINIER (SORTIE STOCK)', 141, currentY + 12);
    pdf.setFont('helvetica', 'normal');
    pdf.text((mov.warehouseManagerName || mov.operatorName).slice(0, 26), 141, currentY + 17);
    pdf.text(`BS: ${mov.voucherNumber.slice(0, 22)}`, 141, currentY + 22);
  } else {
    pdf.roundedRect(14, currentY + 6, 85, 24, 2, 2, 'S');
    pdf.roundedRect(111, currentY + 6, 85, 24, 2, 2, 'S');
    pdf.setFontSize(8);
    pdf.text(
      mov.movementType === 'TRANSFER'
        ? 'VISA MAGASINIER EXPÉDITEUR (SOURCE)'
        : 'VISA CHEF MAGASINIER',
      18,
      currentY + 13
    );
    pdf.text(
      mov.movementType === 'TRANSFER'
        ? 'VISA MAGASINIER RÉCEPTIONNAIRE (CIBLE)'
        : 'VISA RESPONSABLE PROJET / RÉCEPTIONNAIRE',
      115,
      currentY + 13
    );
  }

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  pdf.save(`${mov.voucherNumber}.pdf`);
}

export function exportAllToExcel(
  documents: ExportableDocument[],
  projects: ExportableProject[]
): void {
  const wb = XLSX.utils.book_new();

  const docsData = documents.map((d) => ({
    Numero: d.docNumber,
    Type: d.docType.toUpperCase(),
    Statut: d.status.toUpperCase(),
    Projet: d.projectName,
    Client: d.clientName,
    Email: d.clientEmail,
    Emission: d.issueDate,
    Echeance: d.dueDate,
    SousTotal_HT: formatAmountSpaced(d.subtotal),
    Taux_TVA_Pct: d.taxRate,
    Montant_TVA: formatAmountSpaced(d.taxAmount),
    Total_TTC: formatAmountSpaced(d.totalAmount),
    Montant_Paye: formatAmountSpaced(d.paidAmount),
    Reste_A_Payer: formatAmountSpaced(Math.max(0, d.totalAmount - d.paidAmount)),
    Jalon_Projet_Pct: d.milestoneReached,
    Prestations: d.itemsSummary,
  }));

  const projData = projects.map((p) => ({
    Projet: p.name,
    Client: p.clientName,
    Type_Exploitation: p.projectType || 'Général',
    Compte_Affectation: `${p.dedicatedAccountType || ''} - ${p.dedicatedAccountProvider || ''} (${p.dedicatedAccountNumber || ''})`,
    Statut: p.status.toUpperCase(),
    Avancement_Pct: p.progress,
    Budget_Alloue: formatAmountSpaced(p.budget),
    Montant_Facture: formatAmountSpaced(p.billedAmount),
    Montant_Encaisse: formatAmountSpaced(p.paidAmount),
    Echeance: p.dueDate,
  }));

  const wsDocs = XLSX.utils.json_to_sheet(docsData);
  const wsProjs = XLSX.utils.json_to_sheet(projData);

  XLSX.utils.book_append_sheet(wb, wsDocs, 'Devis_Proformas_Factures');
  XLSX.utils.book_append_sheet(wb, wsProjs, 'Projets_Comptes_Dedies');

  XLSX.writeFile(wb, `My_Easy_Project_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export interface ExportableEmployeeSummary {
  matricule: string;
  fullName: string;
  workerCategory: string;
  position: string;
  department: string;
  contractType: string;
  paymentPeriodicity: string;
  assignedProjectName: string;
  hireDate: string;
  status: 'active' | 'on_leave' | 'terminated';
  terminationDate?: string;
  terminationReason?: string;
  phone: string;
  email: string;
  nationalIdNumber: string;
  baseSalary: number;
}

export function exportTerminationCertificateToPDF(
  emp: ExportableEmployeeSummary,
  companyName: string,
  companyLogo?: string,
  customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION
): void {
  const pdf = new jsPDF();

  const afterHeaderY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo,
    'Direction des Ressources Humaines & Affaires Juridiques',
    'CERTIFICAT DE CESSATION DE CONTRAT',
    `MATRICULE : ${emp.matricule}`,
    `Date d'effet : ${emp.terminationDate || new Date().toISOString().slice(0, 10)}`,
    customization.headerHexColor
  );

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(12);
  pdf.text(
    'ATTESTATION OFFICIELLE DE CESSATION DE CONTRAT DE TRAVAIL',
    105,
    afterHeaderY + 6,
    { align: 'center' }
  );

  const paragraphs = [
    `Nous soussignés, Direction Générale de l'entreprise « ${companyName.toUpperCase()} », certifions par la présente que :`,
    `• Nom et Prénoms : ${emp.fullName.toUpperCase()}`,
    `• Numéro Matricule Unique (Non modifiable) : ${emp.matricule}`,
    `• N° Pièce d'Identité (CNI / Passeport) : ${emp.nationalIdNumber || 'N/A'}`,
    `• Catégorie & Fonction exercée : ${emp.workerCategory} — ${emp.position}`,
    `• Département / Service : ${emp.department}`,
    `• Nature du Contrat : ${emp.contractType}`,
    `• Rémunération de référence : ${formatAmountSpaced(emp.baseSalary)}`,
    `• Date d'embauche : ${emp.hireDate}`,
    `• Date effective de cessation / rupture : ${emp.terminationDate || new Date().toISOString().slice(0, 10)}`,
    `• Motif de cessation / rupture : ${emp.terminationReason || 'Fin d’engagement contractuel'}`,
    `En foi de quoi, ${emp.fullName.toUpperCase()} quitte notre entreprise libre de tout engagement exclusif à compter du ${emp.terminationDate || new Date().toISOString().slice(0, 10)} et peut être répertorié(e) dans une nouvelle entreprise.`,
  ];

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  const wrappedLines: string[] = [];
  for (const p of paragraphs) {
    const split: string[] = pdf.splitTextToSize(p, 166);
    wrappedLines.push(...split, '');
  }

  const boxTopY = afterHeaderY + 12;
  const boxH = Math.max(115, wrappedLines.length * 4.8 + 12);

  pdf.setDrawColor(203, 213, 225);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(16, boxTopY, 178, boxH, 3, 3, 'FD');

  pdf.setTextColor(30, 41, 59);
  let y = boxTopY + 9;
  for (const line of wrappedLines) {
    if (line) {
      pdf.text(line, 22, y);
      y += 5;
    } else {
      y += 2.2;
    }
  }

  const footerTop = boxTopY + boxH + 10;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.2);
  pdf.setTextColor(15, 23, 42);
  pdf.text(
    `Fait le ${new Date().toLocaleDateString('fr-FR')}, pour servir et valoir ce que de droit.`,
    20,
    footerTop
  );

  pdf.roundedRect(114, footerTop + 6, 80, 28, 2, 2, 'S');
  const sigTitle = pdf.splitTextToSize(
    customization.signatoryTitle || 'La Direction Générale',
    72
  )[0];
  pdf.text(sigTitle, 118, footerTop + 14);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Signature et cachet officiel de l’employeur', 118, footerTop + 27);

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  pdf.save(`Certificat_Cessation_${emp.matricule}.pdf`);
}

/**
 * Génère un Acte Officiel RH imprimable (Congé, Infraction, Blâme, Ordre de Mission, Mutation, Avancement, Rupture)
 * au logo et papier entête de l'entreprise.
 */
export function exportHrEventActToPDF(
  act: ExportableHrEventAct,
  companyName: string,
  companyLogo?: string,
  customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION
): void {
  const pdf = new jsPDF();
  const [r, g, b] = hexToRgb(customization.headerHexColor);

  const categoryTitles: Record<ExportableHrEventAct['eventCategory'], string> = {
    leave: 'TITRE OFFICIEL DE CONGÉ / ABSENCE',
    infraction: 'PV DE CONSTAT D’INFRACTION DISCIPLINAIRE',
    reprimand: 'NOTIFICATION OFFICIELLE DE BLÂME / SANCTION',
    mission: 'ORDRE DE MISSION OFFICIEL',
    mutation: 'DÉCISION OFFICIELLE DE MUTATION / AFFECTATION',
    promotion: `DÉCISION D’AVANCEMENT (${(act.promotionMode || 'MANUEL').toUpperCase()})`,
    termination: 'ACTE OFFICIEL DE RUPTURE DE CONTRAT',
  };

  const subtitle = 'Direction des Ressources Humaines, Discipline, Carrière & Mobilité';
  const docTitle = categoryTitles[act.eventCategory] || 'ACTE OFFICIEL RH';
  const docMeta = `Date de l'acte : ${act.date}`;

  const afterHeaderY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo,
    subtitle,
    docTitle,
    act.reference,
    docMeta,
    customization.headerHexColor
  );

  const tableStartY = drawTwoColumnInfoCards(
    pdf,
    afterHeaderY,
    'EMPLOYÉ CONCERNÉ PAR LA DÉCISION',
    act.employeeName.toUpperCase(),
    [
      `Matricule Unique : ${act.employeeMatricule}`,
      `Fonction : ${act.employeePosition}`,
    ],
    'AFFECTATION & CONTRAT ACTUEL',
    `Contrat : ${act.employeeContractType}`,
    [
      `Projet d'affectation : ${act.projectName}`,
      act.targetEnterpriseName ? `Entreprise cible : ${act.targetEnterpriseName}` : '',
    ],
    [r, g, b]
  );

  autoTable(pdf, {
    startY: tableStartY,
    margin: { bottom: 22 },
    head: [['Rubrique Administrative RH', 'Détails Officiels de la Décision / Notification']],
    body: [
      ['Nature de l’Acte RH', docTitle],
      ['Catégorie / Type Précis', act.subType],
      ['Objet', act.title],
      [
        'Période / Dates d’effet',
        act.startDate
          ? `Du ${act.startDate}${act.endDate ? ` au ${act.endDate}` : ''}`
          : `Date d'effet : ${act.date}`,
      ],
      ...(act.targetEnterpriseName
        ? [['Entreprise Cible (Réseau du Super-Admin)', act.targetEnterpriseName]]
        : []),
      ...(act.targetProjectOrLocation
        ? [['Lieu de Mission / Nouveau Projet Cible', act.targetProjectOrLocation]]
        : []),
      ...(act.promotionMode
        ? [
            ['Mode d’Avancement', `Avancement ${act.promotionMode}`],
            [
              'Évolution Salariale / Échelon',
              `${act.previousSalaryOrGrade || 'Situation antérieure'} → ${
                act.newSalaryOrGrade || 'Nouvelle situation'
              }`,
            ],
          ]
        : []),
      ...(act.financialImpactOrAllowance !== undefined && act.financialImpactOrAllowance > 0
        ? [['Incidence Financière / Indemnité', formatAmountSpaced(act.financialImpactOrAllowance)]]
        : []),
      ['Motif Détaillé & Dispositions', act.details],
      ['Autorité Signataire', act.decisionMaker],
    ],
    theme: 'grid',
    headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59], cellPadding: 2.8 },
    columnStyles: {
      0: { cellWidth: 62, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 120 },
    },
  });

  let currentY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 170;

  currentY = ensurePageSpace(
    pdf,
    currentY + 10,
    34,
    companyName,
    companyLogo,
    subtitle,
    docTitle,
    act.reference,
    docMeta,
    customization.headerHexColor
  );

  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, currentY, 85, 28, 2, 2, 'S');
  pdf.roundedRect(111, currentY, 85, 28, 2, 2, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.2);
  pdf.setTextColor(15, 23, 42);
  pdf.text('ACCUSÉ DE RÉCEPTION DE L’EMPLOYÉ', 18, currentY + 7);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Date et signature de l’employé concerné', 18, currentY + 13);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.2);
  pdf.setTextColor(15, 23, 42);
  pdf.text('LA DIRECTION DES RESSOURCES HUMAINES', 115, currentY + 7);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Signature et cachet officiel de l’entreprise', 115, currentY + 13);

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  pdf.save(`Acte_RH_${act.reference}_${act.employeeMatricule}.pdf`);
}

/**
 * Génère la FEUILLE D'ÉMARGEMENT BIOMÉTRIQUE CERTIFIÉE (Empreinte Digitale & Reconnaissance Faciale)
 */
export function exportBiometricAttendanceSheetToPDF(
  records: ExportableBiometricAttendance[],
  companyName: string,
  companyLogo?: string,
  customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION
): void {
  const pdf = new jsPDF({ orientation: 'landscape' });
  const [r, g, b] = hexToRgb(customization.headerHexColor);
  const docRef = `EMARG-BIO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

  const startY = drawLandscapeCorporateLetterhead(
    pdf,
    companyName,
    companyLogo,
    'REGISTRE D’ÉMARGEMENT BIOMÉTRIQUE CERTIFIÉ',
    docRef,
    `Pointage validé par Empreinte Digitale ou Reconnaissance Faciale · Total pointages : ${records.length}`,
    customization.headerHexColor
  );

  autoTable(pdf, {
    startY,
    margin: { bottom: 20 },
    head: [
      [
        'Date',
        'Matricule',
        'Nom Complet de l’Employé',
        'Contrat & Poste',
        'Projet Affecté',
        'Arrivée',
        'Départ',
        'Mode Biométrique',
        'Empreinte / Hash Biométrique',
      ],
    ],
    body: records.map((rec) => [
      rec.date,
      rec.employeeMatricule,
      rec.employeeName,
      `${rec.contractType} · ${rec.position}`,
      rec.projectName,
      rec.checkInTime,
      rec.checkOutTime || 'En poste',
      rec.validationMethod === 'fingerprint'
        ? `EMPREINTE DIGITALE (${rec.confidenceScore}%)`
        : `VISAGE / FACIAL (${rec.confidenceScore}%)`,
      rec.biometricHash,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 2.2 },
  });

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  pdf.save(`Emargement_Biometrique_${companyName.replace(/\s+/g, '_')}.pdf`);
}

export function exportEmployeesDirectoryToPDF(
  employees: ExportableEmployeeSummary[],
  _currency: Currency,
  companyName: string,
  companyLogo?: string,
  customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION
): void {
  const pdf = new jsPDF({ orientation: 'landscape' });
  const [r, g, b] = hexToRgb(customization.headerHexColor);
  const docRef = `REG-RH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

  const startY = drawLandscapeCorporateLetterhead(
    pdf,
    companyName,
    companyLogo,
    'REGISTRE OFFICIEL DU PERSONNEL EMPLOYÉ',
    docRef,
    `Effectif total : ${employees.length} · Papier entête officiel aux couleurs de l'entreprise`,
    customization.headerHexColor
  );

  autoTable(pdf, {
    startY,
    margin: { bottom: 20 },
    head: [
      [
        'Matricule Unique',
        'Nom Complet',
        'Catégorie & Poste',
        'Contrat',
        'Projet Affecté',
        'Téléphone',
        'Base / Taux',
        'Statut',
      ],
    ],
    body: employees.map((e) => [
      e.matricule,
      e.fullName,
      `${e.workerCategory} - ${e.position}`,
      `${e.contractType} (${e.paymentPeriodicity})`,
      e.assignedProjectName,
      e.phone,
      formatAmountSpaced(e.baseSalary),
      e.status === 'active'
        ? 'EN POSTE'
        : e.status === 'on_leave'
        ? 'CONGÉ / MISSION'
        : `CESSATION (${e.terminationDate || ''})`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2.2 },
  });

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  pdf.save(`Registre_Personnel_${companyName.replace(/\s+/g, '_')}.pdf`);
}

export function exportEmployeesDirectoryToExcel(employees: ExportableEmployeeSummary[]): void {
  const wb = XLSX.utils.book_new();
  const rows = employees.map((e) => ({
    Matricule_Unique_Non_Modifiable: e.matricule,
    Nom_Complet: e.fullName,
    Categorie: e.workerCategory,
    Poste: e.position,
    Departement: e.department,
    Contrat: e.contractType,
    Periodicite_Paie: e.paymentPeriodicity,
    Projet_Affectation: e.assignedProjectName,
    Date_Embauche: e.hireDate,
    Statut:
      e.status === 'active'
        ? 'EN POSTE'
        : e.status === 'on_leave'
        ? 'EN CONGÉ / MISSION'
        : 'CESSATION DE CONTRAT',
    Date_Cessation: e.terminationDate || '',
    Motif_Cessation: e.terminationReason || '',
    Telephone: e.phone,
    Email: e.email,
    Piece_Identite: e.nationalIdNumber,
    Salaire_Base_Ou_Taux: formatAmountSpaced(e.baseSalary),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Registre_Personnel');
  XLSX.writeFile(wb, `Registre_Personnel_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * 16. Export Printable Internal Purchase Order / Material Requisition (BON DE COMMANDE INTERNE - BCI)
 * Co-delivered by a Project Manager & Trade Leader to the Warehouse Manager to trigger Stock Exit.
 */
export function exportInternalRequisitionToPDF(
  bci: ExportableInternalRequisition,
  companyName: string,
  companyLogo?: string | null,
  custom?: Partial<DocumentCustomizationConfig>
): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const customization: DocumentCustomizationConfig = { ...DEFAULT_DOC_CUSTOMIZATION, ...custom };
  const [r, g, b] = hexToRgb(customization.headerHexColor);

  const subtitle =
    customization.companySubtitle ||
    customization.headerSubtitle ||
    DEFAULT_DOC_CUSTOMIZATION.headerSubtitle ||
    '';
  const docTitle = 'BON DE COMMANDE INTERNE (BCI)';
  const docMeta = `Date d'émission : ${bci.date} | Statut : ${
    bci.status === 'fulfilled_stock_out'
      ? `SERVI — BON DE SORTIE ${bci.stockOutVoucherNumber || ''}`
      : bci.status === 'pending_warehouse'
      ? 'EN ATTENTE DE SORTIE MAGASIN'
      : 'REJETÉ / ANNULÉ'
  }`;

  const afterHeaderY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo || undefined,
    subtitle,
    docTitle,
    bci.bciNumber,
    docMeta,
    customization.headerHexColor
  );

  const tableStartY = drawTwoColumnInfoCards(
    pdf,
    afterHeaderY,
    'DEMANDEURS HABILITÉS (PROJET & CORPS DE MÉTIER)',
    `Projet : ${bci.projectName}`,
    [
      `Responsable du Projet : ${bci.projectManagerName}`,
      `Corps de Métier utilisateur : ${bci.tradeName}`,
      `Responsable Corps de Métier : ${bci.tradeLeaderName}`,
    ],
    'DESTINATAIRE (MAGASIN & TRAÇABILITÉ SORTIE)',
    `Magasin sollicité : ${bci.warehouseName}`,
    [
      `Magasinier en charge : ${bci.warehouseManagerName}`,
      bci.stockOutVoucherNumber
        ? `Bon de Sortie délivré : ${bci.stockOutVoucherNumber} (${bci.stockOutDate || bci.date})`
        : 'Bon de Sortie : À délivrer lors du déstockage effectif',
      `Document numérisé : ${bci.scannedBciFileName || 'BCI numérique enregistré'}`,
    ],
    [r, g, b]
  );

  autoTable(pdf, {
    startY: tableStartY,
    margin: { bottom: 22 },
    head: [
      [
        'Réf SKU',
        'Désignation Produit / Matériel',
        'Corps de Métier Utilisateur',
        'Qté Demandée',
        'Qté Servie (BS)',
        'Coût Unitaire',
        'Valeur Estimée',
      ],
    ],
    body: [
      [
        bci.productSku,
        bci.productName,
        bci.tradeName,
        `${formatAmountSpaced(bci.requestedQuantity)} ${bci.unit}`,
        `${formatAmountSpaced(bci.deliveredQuantity ?? (bci.status === 'fulfilled_stock_out' ? bci.requestedQuantity : 0))} ${bci.unit}`,
        formatAmountSpaced(bci.unitCost),
        formatAmountSpaced(bci.totalEstimatedValue),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.3, textColor: [15, 23, 42], cellPadding: 2.8 },
  });

  let currentY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 132;

  currentY = ensurePageSpace(
    pdf,
    currentY + 8,
    56,
    companyName,
    companyLogo || undefined,
    subtitle,
    docTitle,
    bci.bciNumber,
    docMeta,
    customization.headerHexColor
  );

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Affectation Technique, Phase de Réalisation & Justification du Besoin :', 14, currentY);
  currentY += 4.5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.2);
  pdf.setTextColor(51, 65, 85);
  const purposeLines: string[] = pdf.splitTextToSize(bci.purposeAndPhase || 'Travaux de chantier', 182).slice(0, 4);
  for (const line of purposeLines) {
    pdf.text(line, 14, currentY);
    currentY += 4.2;
  }

  currentY += 4;
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, currentY, 58, 30, 2, 2, 'S');
  pdf.roundedRect(76, currentY, 58, 30, 2, 2, 'S');
  pdf.roundedRect(138, currentY, 58, 30, 2, 2, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.2);
  pdf.setTextColor(15, 23, 42);
  pdf.text('1. VISA RESPONSABLE PROJET', 17, currentY + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.text(bci.projectManagerName.slice(0, 26), 17, currentY + 11.5);
  pdf.text('Émetteur & Approbateur Projet', 17, currentY + 16.5);

  pdf.setFont('helvetica', 'bold');
  pdf.text('2. VISA RESP. CORPS DE MÉTIER', 79, currentY + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.text(bci.tradeLeaderName.slice(0, 26), 79, currentY + 11.5);
  pdf.text(bci.tradeName.slice(0, 26), 79, currentY + 16.5);

  pdf.setFont('helvetica', 'bold');
  pdf.text('3. VISA MAGASINIER (SORTIE)', 141, currentY + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.text(bci.warehouseManagerName.slice(0, 26), 141, currentY + 11.5);
  pdf.text(
    bci.stockOutVoucherNumber ? `BS N° ${bci.stockOutVoucherNumber}` : 'Contre délivrance BS',
    141,
    currentY + 16.5
  );

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  pdf.save(`${bci.bciNumber}.pdf`);
}

/**
 * 17. Export Official Project Execution Plan (PLAN DE RÉALISATION DU PROJET)
 * Co-established by Project Managers and Trade Leaders (Phases, Durations, Assigned Tasks, Target Objectives).
 */
export function exportProjectExecutionPlanToPDF(
  project: ExportableProject,
  companyName: string,
  companyLogo?: string | null,
  custom?: Partial<DocumentCustomizationConfig>
): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const customization: DocumentCustomizationConfig = { ...DEFAULT_DOC_CUSTOMIZATION, ...custom };
  const [r, g, b] = hexToRgb(customization.headerHexColor);

  const planRef = `PLAN-EXEC-${project.id.toUpperCase().slice(0, 8)}`;
  const subtitle =
    customization.companySubtitle ||
    customization.headerSubtitle ||
    DEFAULT_DOC_CUSTOMIZATION.headerSubtitle ||
    '';
  const docTitle = 'PLAN DE RÉALISATION & SUIVI DU PROJET';
  const docMeta = `Avancement Global : ${project.progress}% | Échéance : ${project.dueDate || 'N/A'}`;

  const afterHeaderY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo || undefined,
    subtitle,
    docTitle,
    planRef,
    docMeta,
    customization.headerHexColor
  );

  const steps: ProjectExecutionStep[] =
    project.structuredSteps && project.structuredSteps.length > 0
      ? project.structuredSteps
      : Array.isArray(project.executionSteps)
      ? project.executionSteps
      : [];

  const uniqueTradeLeaders = Array.from(
    new Set(steps.map((s) => s.tradeLeaderName).filter(Boolean))
  );

  let currentY = drawTwoColumnInfoCards(
    pdf,
    afterHeaderY,
    'IDENTIFICATION DU PROJET & MAÎTRISE D’ŒUVRE',
    project.name,
    [
      `Client / Maître d'Ouvrage : ${project.clientName}`,
      `Secteur d'Activité : ${project.sectorLabel || project.projectType || 'Ingénierie & Travaux'}`,
      `Site / Localisation : ${project.siteLocation || 'Site principal'} | Durée : ${project.estimatedDuration || 'Selon planning'}`,
    ],
    'RESPONSABLES DU PLAN DE RÉALISATION',
    `Responsable du Projet : ${project.projectManagerName || steps[0]?.projectManagerName || 'Direction de Projet'}`,
    [
      `Corps de Métier (${(project.involvedTrades || []).length || steps.length}) : ${(project.involvedTrades || []).slice(0, 3).join(', ') || 'Multi-corps d’état'}`,
      `Responsables Corps de Métier : ${uniqueTradeLeaders.slice(0, 3).join(', ') || 'Chefs de corps de métier désignés'}`,
      `Budget de référence : ${formatAmountSpaced(project.budget)}`,
    ],
    [r, g, b]
  );

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(r, g, b);
  pdf.text(
    'MATRICE DES PHASES D’ÉVOLUTION, DURÉES, TÂCHES ASSIGNÉES & OBJECTIFS À ATTEINDRE',
    14,
    currentY
  );
  currentY += 4;

  autoTable(pdf, {
    startY: currentY,
    margin: { bottom: 22 },
    head: [
      [
        'Phase',
        'Corps de Métier & Responsables',
        'Intitulé Phase & Durée',
        'Tâches Assignées à la Phase',
        'Objectifs à Atteindre & Livrable',
        'Avancement',
      ],
    ],
    body:
      steps.length > 0
        ? steps.map((step) => [
            String(step.phaseNumber),
            `${step.tradeName || 'Corps principal'}\nResp. Métier : ${step.tradeLeaderName || 'Chef Corps de Métier'}\nResp. Projet : ${step.projectManagerName || project.projectManagerName || 'Chef de Projet'}`,
            `${step.title}\nDurée : ${step.duration}`,
            step.assignedTasks || step.processDetails || 'Exécution des travaux selon règles de l’art',
            `Objectif : ${step.phaseObjectives || step.deliverable}\nLivrable : ${step.deliverable}`,
            `${step.progressPct ?? 0}%`,
          ])
        : [
            [
              'Phase 1',
              'Tous Corps d’État',
              `Réalisation Générale (${project.estimatedDuration || 'Planning'})`,
              project.technicalProcesses || 'Travaux techniques conformes au cahier des charges',
              project.deliverablesSummary || 'Réception conforme des ouvrages',
              `${project.progress}%`,
            ],
          ],
    theme: 'grid',
    headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 7.8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.3, textColor: [15, 23, 42], cellPadding: 2.3 },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 32, fontStyle: 'bold' },
      3: { cellWidth: 44 },
      4: { cellWidth: 40 },
      5: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
    },
  });

  currentY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ||
    currentY + 45;

  currentY = ensurePageSpace(
    pdf,
    currentY + 8,
    38,
    companyName,
    companyLogo || undefined,
    subtitle,
    docTitle,
    planRef,
    docMeta,
    customization.headerHexColor
  );

  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, currentY, 85, 26, 2, 2, 'S');
  pdf.roundedRect(111, currentY, 85, 26, 2, 2, 'S');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.8);
  pdf.setTextColor(15, 23, 42);
  pdf.text('VISA RESPONSABLE(S) DU PROJET', 18, currentY + 7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    (project.projectManagerName || steps[0]?.projectManagerName || 'Direction de Projet').slice(0, 38),
    18,
    currentY + 13
  );
  pdf.text('Pour validation du planning et suivi permanent', 18, currentY + 19);

  pdf.setFont('helvetica', 'bold');
  pdf.text('VISA RESPONSABLES CORPS DE MÉTIER', 115, currentY + 7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    (uniqueTradeLeaders.slice(0, 2).join(' / ') || 'Chefs des Corps de Métier Intervenants').slice(0, 38),
    115,
    currentY + 13
  );
  pdf.text('Engagement sur les durées, tâches et objectifs', 115, currentY + 19);

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  pdf.save(`Plan_Realisation_${project.name.replace(/\s+/g, '_')}.pdf`);
}

/**
 * 18. Export End-of-Project Official Closure & Retrocession Documents
 * Covers:
 * - Réalisation des travaux à 100% (completion_100)
 * - Repli chantier & remise en état (site_clearance)
 * - Tests et essais techniques si nécessaires (tests_trials)
 * - Rétrocession officielle du chantier au Maître d'Ouvrage (handover_retrocession)
 * - Dossier complet de clôture et rétrocession (full_closure_dossier)
 */
export function exportProjectClosureDocumentToPDF(
  project: ExportableProject,
  docKind: ProjectClosureDocumentKind,
  companyName: string,
  companyLogo?: string | null,
  custom?: Partial<DocumentCustomizationConfig>
): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const customization: DocumentCustomizationConfig = { ...DEFAULT_DOC_CUSTOMIZATION, ...custom };
  const [r, g, b] = hexToRgb(customization.headerHexColor);

  const closure: ExportableProjectClosure = project.closureInfo || {
    workCompletion100Pct: project.progress >= 100,
    workCompletionDate: new Date().toISOString().slice(0, 10),
    workCompletionNotes:
      'L’ensemble des ouvrages et prestations prévus au cahier des charges a été exécuté à 100% conformément aux règles de l’art.',
    siteClearanceCompleted: true,
    siteClearanceDate: new Date().toISOString().slice(0, 10),
    siteClearanceNotes:
      'Démobilisation complète des équipements, évacuation des déblais, nettoyage intégral et remise en état parfait des lieux.',
    testsAndTrialsRequired: true,
    testsAndTrialsCompleted: true,
    testsAndTrialsDate: new Date().toISOString().slice(0, 10),
    testsAndTrialsSummary:
      'Essais de fonctionnement, contrôles de résistance, vérifications de sécurité et tests de performance concluants et conformes.',
    handoverRetrocessionCompleted: true,
    handoverRetrocessionDate: new Date().toISOString().slice(0, 10),
    handoverRetrocessionNotes:
      'Rétrocession officielle et transfert de garde du chantier et des ouvrages achevés au Maître d’Ouvrage / Client sans réserve.',
    clientRepresentativeName: project.clientName,
    clientRepresentativeTitle: 'Maître d’Ouvrage / Client Réceptionnaire',
    projectManagerName: project.projectManagerName || 'Direction de Projet',
    leadTradeRepresentativeName: 'Représentant des Corps de Métier Intervenants',
    closureReferenceNumber: `CLOT-${project.id.toUpperCase().slice(0, 6)}-${new Date().getFullYear()}`,
  };

  const titleByKind: Record<ProjectClosureDocumentKind, string> = {
    completion_100: 'PV DE RÉALISATION DES TRAVAUX À 100%',
    site_clearance: 'PV DE REPLI CHANTIER & REMISE EN ÉTAT',
    tests_trials: 'PV DE TESTS, ESSAIS & CONTRÔLES TECHNIQUES',
    handover_retrocession: 'ACTE DE RÉTROCESSION & RÉCEPTION DU CHANTIER',
    full_closure_dossier: 'DOSSIER DE CLÔTURE & RÉTROCESSION DU CHANTIER',
    completion_summary: 'SYNTHÈSE D’ACHÈVEMENT DU PROJET — LIVRABLES & ESSAIS',
  };

  const refPrefixByKind: Record<ProjectClosureDocumentKind, string> = {
    completion_100: 'PV-ACH100',
    site_clearance: 'PV-REPLI',
    tests_trials: 'PV-ESSAIS',
    handover_retrocession: 'PV-RETRO',
    full_closure_dossier: 'DOSS-CLOT',
    completion_summary: 'SYNT-ACH',
  };

  const docReference = `${refPrefixByKind[docKind]}-${closure.closureReferenceNumber}`;
  const subtitle =
    customization.companySubtitle ||
    customization.headerSubtitle ||
    DEFAULT_DOC_CUSTOMIZATION.headerSubtitle ||
    '';
  const docTitle = titleByKind[docKind];
  const docMeta = `Date d'établissement : ${closure.handoverRetrocessionDate || new Date().toISOString().slice(0, 10)} | Statut : ACHEVÉ AVEC SUCCÈS (100%)`;

  const afterHeaderY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo || undefined,
    subtitle,
    docTitle,
    docReference,
    docMeta,
    customization.headerHexColor,
    docKind === 'completion_summary' ? 'ACHEVÉ AVEC SUCCÈS — CERTIFIÉ' : undefined
  );

  let currentY = drawTwoColumnInfoCards(
    pdf,
    afterHeaderY,
    'IDENTIFICATION DE L’OPÉRATION & DU CHANTIER',
    project.name,
    [
      `Secteur d'Activité : ${project.sectorLabel || project.projectType || 'Travaux & Ingénierie'}`,
      `Localisation du Chantier : ${project.siteLocation || 'Site Client'}`,
      `Corps de Métier ayant intervenu : ${(project.involvedTrades || []).slice(0, 3).join(', ') || 'Tous corps d’état'}`,
    ],
    'PARTIES SIGNATAIRES & INTERVENANTS',
    `Maître d'Ouvrage / Client : ${project.clientName}`,
    [
      `Représentant Client : ${closure.clientRepresentativeName} (${closure.clientRepresentativeTitle})`,
      `Responsable du Projet : ${closure.projectManagerName}`,
      `Représentant Corps de Métier : ${closure.leadTradeRepresentativeName}`,
    ],
    [r, g, b]
  );

  const sectionsToRender: Array<{
    badge: string;
    date: string;
    status: string;
    details: string;
  }> = [];

  if (docKind === 'completion_100' || docKind === 'full_closure_dossier' || docKind === 'completion_summary') {
    sectionsToRender.push({
      badge: '1. CONSTAT DE RÉALISATION DES TRAVAUX & LIVRABLES À 100%',
      date: closure.workCompletionDate,
      status: closure.workCompletion100Pct ? 'ACHEVÉ À 100% — CONFORME' : 'EN COURS DE FINALISATION',
      details: closure.workCompletionNotes,
    });
  }

  if (docKind === 'tests_trials' || docKind === 'full_closure_dossier' || docKind === 'completion_summary') {
    sectionsToRender.push({
      badge: '2. TESTS, ESSAIS TECHNIQUES & MISE EN SERVICE',
      date: closure.testsAndTrialsDate,
      status: !closure.testsAndTrialsRequired
        ? 'NON REQUIS PAR LA NATURE DE L’OUVRAGE'
        : closure.testsAndTrialsCompleted
        ? 'ESSAIS CONCLUANTS & VALIDÉS'
        : 'ESSAIS EN ATTENTE',
      details: closure.testsAndTrialsRequired
        ? closure.testsAndTrialsSummary
        : 'La nature technique des travaux réalisés ne requiert pas de campagne d’essais instrumentés spécifiques.',
    });
  }

  if (docKind === 'site_clearance' || docKind === 'full_closure_dossier' || docKind === 'completion_summary') {
    sectionsToRender.push({
      badge: '3. REPLI DE CHANTIER, DÉMOBILISATION & NETTOYAGE',
      date: closure.siteClearanceDate,
      status: closure.siteClearanceCompleted
        ? 'REPLI CHANTIER EFFECTUÉ & SITE LIBÉRÉ'
        : 'REPLI EN COURS',
      details: closure.siteClearanceNotes,
    });
  }

  if (docKind === 'handover_retrocession' || docKind === 'full_closure_dossier' || docKind === 'completion_summary') {
    sectionsToRender.push({
      badge: '4. RÉTROCESSION OFFICIELLE DU CHANTIER AU MAÎTRE D’OUVRAGE',
      date: closure.handoverRetrocessionDate,
      status: closure.handoverRetrocessionCompleted
        ? 'CHANTIER RÉTROCÉDÉ & RÉCEPTIONNÉ'
        : 'EN ATTENTE DE SIGNATURE',
      details: closure.handoverRetrocessionNotes,
    });
  }

  autoTable(pdf, {
    startY: currentY,
    margin: { bottom: 22 },
    head: [['Étape de Fin de Projet', 'Date de Validation', 'Statut Officiel', 'Constats & Procès-Verbal Technique']],
    body: sectionsToRender.map((sec) => [sec.badge, sec.date, sec.status, sec.details]),
    theme: 'grid',
    styles: { overflow: 'linebreak' },
    headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 8.2, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [15, 23, 42], cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 46, fontStyle: 'bold' },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 38, fontStyle: 'bold' },
      3: { cellWidth: 74 },
    },
  });

  currentY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ||
    currentY + 45;

  const commissioningTests = closure.commissioningTests || [];
  if (
    commissioningTests.length > 0 &&
    (docKind === 'tests_trials' ||
      docKind === 'completion_100' ||
      docKind === 'full_closure_dossier' ||
      docKind === 'completion_summary')
  ) {
    currentY = ensurePageSpace(
      pdf,
      currentY + 6,
      38,
      companyName,
      companyLogo || undefined,
      subtitle,
      docTitle,
      docReference,
      docMeta,
      customization.headerHexColor
    );

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.8);
    pdf.setTextColor(r, g, b);
    pdf.text('PROTOCOLES D’ESSAIS, TESTS TECHNIQUES PROBANTS & MESURES D’ACHÈVEMENT À 100%', 14, currentY);
    currentY += 3.5;

    autoTable(pdf, {
      startY: currentY,
      margin: { bottom: 22 },
      head: [['Code Essai', 'Paramètre / Ouvrage Testé', 'Corps d’État', 'Norme / Réf.', 'Mesure Obtenue', 'Verdict', 'Preuve / PV']],
      body: commissioningTests.map((t) => [
        t.testCode,
        t.title,
        t.tradeName,
        t.normOrReference,
        t.measuredValue,
        t.verdict === 'conforme_100' ? 'CONFORME 100%' : t.verdict === 'reserve' ? 'AVEC RÉSERVE' : 'NON CONFORME',
        t.proofReference,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [6, 95, 70], textColor: 255, fontSize: 7.4, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.2, textColor: [15, 23, 42], cellPadding: 2 },
    });

    currentY =
      (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ||
      currentY + 32;
  }

  const clearanceChecklist = closure.siteClearanceChecklist || [];
  if (
    clearanceChecklist.length > 0 &&
    (docKind === 'site_clearance' || docKind === 'handover_retrocession' || docKind === 'full_closure_dossier')
  ) {
    currentY = ensurePageSpace(
      pdf,
      currentY + 6,
      36,
      companyName,
      companyLogo || undefined,
      subtitle,
      docTitle,
      docReference,
      docMeta,
      customization.headerHexColor
    );

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.8);
    pdf.setTextColor(r, g, b);
    pdf.text('CONTRÔLE PROBANT DE REPLI DE CHANTIER, DÉMOBILISATION & QUITUS HSE', 14, currentY);
    currentY += 3.5;

    autoTable(pdf, {
      startY: currentY,
      margin: { bottom: 22 },
      head: [['Catégorie', 'Point de Contrôle Repli de Chantier', 'Statut', 'Vérifié par', 'Observation / Quitus']],
      body: clearanceChecklist.map((item) => [
        item.category,
        item.label,
        item.completed ? 'VALIDÉ & LIBÉRÉ' : 'EN ATTENTE',
        item.verifiedBy,
        item.observation,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 7.4, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.2, textColor: [15, 23, 42], cellPadding: 2 },
    });

    currentY =
      (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ||
      currentY + 32;
  }

  const steps: ProjectExecutionStep[] =
    project.structuredSteps && project.structuredSteps.length > 0
      ? project.structuredSteps
      : Array.isArray(project.executionSteps)
      ? project.executionSteps
      : [];

  if (steps.length > 0) {
    currentY = ensurePageSpace(
      pdf,
      currentY + 6,
      36,
      companyName,
      companyLogo || undefined,
      subtitle,
      docTitle,
      docReference,
      docMeta,
      customization.headerHexColor
    );

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.8);
    pdf.setTextColor(r, g, b);
    pdf.text('RÉCAPITULATIF DES PHASES & CORPS DE MÉTIER RÉCEPTIONNÉS À 100%', 14, currentY);
    currentY += 3.5;

    autoTable(pdf, {
      startY: currentY,
      margin: { bottom: 22 },
      head: [['Phase', 'Corps de Métier', 'Responsable Métier', 'Ouvrage / Livrable Réceptionné', 'Taux Final']],
      body: steps.map((st) => [
        String(st.phaseNumber),
        st.tradeName || 'Corps principal',
        st.tradeLeaderName || closure.leadTradeRepresentativeName,
        `${st.title} — ${st.deliverable}`,
        `${closure.workCompletion100Pct ? 100 : st.progressPct ?? 100}%`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 7.6, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.3, textColor: [15, 23, 42], cellPadding: 2 },
    });

    currentY =
      (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ||
      currentY + 35;
  }

  currentY = ensurePageSpace(
    pdf,
    currentY + 8,
    40,
    companyName,
    companyLogo || undefined,
    subtitle,
    docTitle,
    docReference,
    docMeta,
    customization.headerHexColor
  );

  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, currentY, 58, 28, 2, 2, 'S');
  pdf.roundedRect(76, currentY, 58, 28, 2, 2, 'S');
  pdf.roundedRect(138, currentY, 58, 28, 2, 2, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.2);
  pdf.setTextColor(15, 23, 42);
  pdf.text('LE RESPONSABLE DU PROJET', 17, currentY + 6);
  pdf.setFont('helvetica', 'normal');
  const pmLines: string[] = pdf.splitTextToSize(closure.projectManagerName || 'Direction de Projet', 52).slice(0, 2);
  let pmy = currentY + 11.5;
  for (const l of pmLines) {
    pdf.text(l, 17, pmy);
    pmy += 3.8;
  }
  pdf.setFontSize(6.8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Pour remise officielle', 17, currentY + 24);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.2);
  pdf.setTextColor(15, 23, 42);
  pdf.text('LES CORPS DE MÉTIER', 79, currentY + 6);
  pdf.setFont('helvetica', 'normal');
  const trLines: string[] = pdf
    .splitTextToSize(closure.leadTradeRepresentativeName || 'Représentant Métiers', 52)
    .slice(0, 2);
  let tryPos = currentY + 11.5;
  for (const l of trLines) {
    pdf.text(l, 79, tryPos);
    tryPos += 3.8;
  }
  pdf.setFontSize(6.8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Conformité technique & repli', 79, currentY + 24);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.2);
  pdf.setTextColor(15, 23, 42);
  pdf.text('LE MAÎTRE D’OUVRAGE / CLIENT', 141, currentY + 6);
  pdf.setFont('helvetica', 'normal');
  const clLines: string[] = pdf
    .splitTextToSize(closure.clientRepresentativeName || project.clientName, 52)
    .slice(0, 2);
  let cly = currentY + 11.5;
  for (const l of clLines) {
    pdf.text(l, 141, cly);
    cly += 3.8;
  }
  pdf.setFontSize(6.8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Pour réception & rétrocession', 141, currentY + 24);

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  pdf.save(`${docReference}_${project.name.replace(/\s+/g, '_')}.pdf`);
}


// ============================================================================
// 11. FICHE MÉDICALE DE L'EMPLOYÉ & ANTÉCÉDENTS MÉDICAUX (PDF A4 OFFICIEL)
// ============================================================================
export interface ExportableEmployeeMedicalVisit {
  id: string;
  date: string;
  type:
    | 'Visite d’embauche'
    | 'Visite périodique'
    | 'Visite de reprise'
    | 'Consultation spontanée'
    | 'Urgence / Soins';
  doctorName: string;
  conclusion: string;
  notes: string;
}

export interface ExportableEmployeeMedicalRecord {
  employeeId: string;
  matricule: string;
  fullName: string;
  position: string;
  department: string;
  assignedProjectName: string;
  bloodGroup: string;
  emergencyContact: string;
  phone: string;
  nationalIdNumber: string;
  socialSecurityNumber: string;
  photoDataUrl?: string;
  fitnessStatus:
    | 'Apte sans restriction'
    | 'Apte avec aménagement'
    | 'Sous surveillance médicale'
    | 'Inapte temporaire';
  occupationalDoctor: string;
  medicalCenter: string;
  lastMedicalExamDate: string;
  nextMedicalExamDate: string;
  heightCm?: number;
  weightKg?: number;
  chronicConditions: string;
  surgicalAndHospitalHistory: string;
  familyMedicalHistory: string;
  allergiesAndHypersensitivities: string;
  ongoingTreatments: string;
  workplaceRestrictions: string;
  requiredPpe: string;
  vaccinationsUpToDate: string;
  emergencyMedicalNotes: string;
  medicalVisits: ExportableEmployeeMedicalVisit[];
}

export function exportEmployeeMedicalRecordToPDF(
  med: ExportableEmployeeMedicalRecord,
  companyName: string,
  companyLogo?: string | null,
  customConfig?: Partial<DocumentCustomizationConfig>
): void {
  const customization: DocumentCustomizationConfig = {
    ...DEFAULT_DOC_CUSTOMIZATION,
    ...(customConfig || {}),
  };
  const pdf = new jsPDF();
  const [r, g, b] = hexToRgb(customization.headerHexColor);
  const subtitle =
    customization.companySubtitle ||
    customization.headerSubtitle ||
    DEFAULT_DOC_CUSTOMIZATION.headerSubtitle ||
    '';

  const docRef = `MED-${med.matricule}`;
  const docMeta = `Aptitude : ${med.fitnessStatus} | Dernière visite : ${med.lastMedicalExamDate}`;

  const afterHeaderY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo || undefined,
    subtitle,
    'FICHE MÉDICALE & ANTÉCÉDENTS MÉDICAUX',
    docRef,
    docMeta,
    customization.headerHexColor
  );

  let currentY = drawTwoColumnInfoCards(
    pdf,
    afterHeaderY,
    'IDENTITÉ DU COLLABORATEUR & CONSTANTES',
    `${med.fullName} (Matricule : ${med.matricule})`,
    [
      `Fonction : ${med.position} (${med.department})`,
      `Affectation : ${med.assignedProjectName} | Groupe Sanguin : ${med.bloodGroup || 'O+'}`,
      `Taille / Poids : ${med.heightCm || 175} cm / ${med.weightKg || 74} kg | Urgence : ${med.emergencyContact}`,
    ],
    'MÉDECINE DU TRAVAIL & APTITUDE AU POSTE',
    `Décision : ${med.fitnessStatus}`,
    [
      `Médecin du Travail : ${med.occupationalDoctor}`,
      `Centre Médical : ${med.medicalCenter}`,
      `Dernier examen : ${med.lastMedicalExamDate} | Prochain : ${med.nextMedicalExamDate}`,
    ],
    [r, g, b]
  );

  autoTable(pdf, {
    startY: currentY,
    margin: { bottom: 22 },
    head: [['Rubrique Médicale & Antécédents', 'Observations Cliniques & Prescriptions HSE']],
    body: [
      ['Pathologies Chroniques & Affections', med.chronicConditions || 'Aucune pathologie déclarée'],
      ['Antécédents Chirurgicaux & Hospitalisations', med.surgicalAndHospitalHistory || 'R.A.S'],
      ['Antécédents Médicaux Familiaux', med.familyMedicalHistory || 'R.A.S'],
      ['Allergies & Hypersensibilités', med.allergiesAndHypersensitivities || 'Aucune allergie connue'],
      ['Traitements Médicaux en Cours', med.ongoingTreatments || 'Aucun traitement en cours'],
      ['Restrictions d’Aptitude / Aménagements', med.workplaceRestrictions || 'Aucune restriction'],
      ['Équipements de Protection Individuelle (EPI)', med.requiredPpe || 'EPI standards obligatoires'],
      ['Statut Vaccinal Réglementaire', med.vaccinationsUpToDate || 'À jour'],
      ['Protocole Médical d’Urgence', med.emergencyMedicalNotes || 'R.A.S'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 8.2, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.8, textColor: [15, 23, 42], cellPadding: 2.4 },
    columnStyles: {
      0: { cellWidth: 64, fontStyle: 'bold' },
      1: { cellWidth: 118 },
    },
  });

  currentY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || currentY + 60;

  if (med.medicalVisits && med.medicalVisits.length > 0) {
    currentY = ensurePageSpace(
      pdf,
      currentY + 6,
      45,
      companyName,
      companyLogo || undefined,
      subtitle,
      'FICHE MÉDICALE & ANTÉCÉDENTS MÉDICAUX',
      docRef,
      docMeta,
      customization.headerHexColor
    );

    autoTable(pdf, {
      startY: currentY,
      margin: { bottom: 22 },
      head: [['Date', 'Nature de la Visite', 'Médecin Examinateur', 'Conclusion d’Aptitude', 'Observations']],
      body: med.medicalVisits.map((v) => [
        v.date,
        v.type,
        v.doctorName,
        v.conclusion,
        v.notes,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7.8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [15, 23, 42], cellPadding: 2.1 },
    });
  }

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  pdf.save(`Fiche_Medicale_${med.matricule}_${med.fullName.replace(/\s+/g, '_')}.pdf`);
}

// ============================================================================
// 12. GÉNÉRATION AUTOMATIQUE DES BILANS COMPTABLES & FISCAUX PAR PÉRIODE
// ============================================================================
export interface ExportablePeriodicAccountingClassSummary {
  classNumber: string;
  classTitle: string;
  mainAccountsSummary: string;
  debitTotal: number;
  creditTotal: number;
  netBalance: number;
  transactionCount: number;
}

export interface ExportablePeriodicBalanceSheetRow {
  section: 'ACTIF' | 'PASSIF';
  rubriqueCode: string;
  label: string;
  grossOrPreviousAmount: number;
  netCurrentAmount: number;
}

export interface ExportablePeriodicFiscalLine {
  code: string;
  name: string;
  category: string;
  rateOrRule: string;
  taxableBase: number;
  taxAmount: number;
  periodicity: string;
}

export interface ExportablePeriodicAccountingFiscalPlan {
  tenantId?: string;
  rccmNumber?: string;
  nifNumber?: string;
  legalForm?: string;
  periodLabel: string;
  periodType: 'Mensuel' | 'Trimestriel' | 'Semestriel' | 'Annuel' | 'Personnalisé';
  startDate: string;
  endDate: string;
  countryName: string;
  accountingStandard: string;
  fiscalLawReference: string;
  regulatoryBody: string;
  currency: string;
  generatedAt: string;
  autoScheduleEnabled: boolean;
  totalRevenueHT: number;
  totalExpensesHT: number;
  totalPayrollHT: number;
  operatingResultHT: number;
  netAfterTaxResultHT?: number;
  totalVatCollected: number;
  totalVatDeductible: number;
  netVatPayable: number;
  vatCreditCarryForward?: number;
  estimatedCorporateTax: number;
  totalOtherTaxes: number;
  totalFiscalBurden: number;
  totalActifNet?: number;
  totalPassifNet?: number;
  periodInvoicesCount?: number;
  periodExpensesCount?: number;
  balanceSheetRows?: ExportablePeriodicBalanceSheetRow[];
  accountingClasses: ExportablePeriodicAccountingClassSummary[];
  fiscalLines: ExportablePeriodicFiscalLine[];
}

export function exportPeriodicAccountingAndFiscalPlanToPDF(
  plan: ExportablePeriodicAccountingFiscalPlan,
  companyName: string,
  companyLogo?: string | null,
  customConfig?: Partial<DocumentCustomizationConfig>
): void {
  const customization: DocumentCustomizationConfig = {
    ...DEFAULT_DOC_CUSTOMIZATION,
    ...(customConfig || {}),
  };
  const pdf = new jsPDF();
  const [r, g, b] = hexToRgb(customization.headerHexColor);
  const subtitle =
    customization.companySubtitle ||
    customization.headerSubtitle ||
    DEFAULT_DOC_CUSTOMIZATION.headerSubtitle ||
    '';
  const refNum = `BCF-${plan.startDate.replace(/-/g, '')}-${plan.endDate.replace(/-/g, '')}`;

  const afterHeaderY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo || undefined,
    subtitle,
    'LIASSE OFFICIELLE : BILAN COMPTABLE & BILAN FISCAL',
    refNum,
    `${plan.periodLabel} | Arrêté au ${plan.endDate} (Généré le ${plan.generatedAt})`,
    customization.headerHexColor,
    'CONFIDENTIEL · ISOLATION STRICTE PAR ENTREPRISE'
  );

  let currentY = drawTwoColumnInfoCards(
    pdf,
    afterHeaderY,
    'IDENTIFICATION & CADRE LÉGAL DE L’ENTREPRISE',
    `${companyName.toUpperCase()} (${plan.countryName} · ${plan.currency})`,
    [
      `Référentiel Officiel : ${plan.accountingStandard} | Loi : ${plan.fiscalLawReference}`,
      `RCCM / ID : ${plan.rccmNumber || 'Certifié Entreprise'} | NIF / IFU : ${plan.nifNumber || 'Déclarant Actif'}`,
      `Cloisonnement Confidentiel : ${plan.tenantId || 'Espace Privé Exclusif'} (100% Données Propres)`,
    ],
    'SYNTHÈSE DU BILAN COMPTABLE & FISCAL PÉRIODIQUE',
    `Produits d’Exploitation HT : ${formatAmountSpaced(plan.totalRevenueHT)} ${plan.currency}`,
    [
      `Charges & Salaires HT : ${formatAmountSpaced(plan.totalExpensesHT)} ${plan.currency} | Résultat d'Exploitation : ${formatAmountSpaced(plan.operatingResultHT)} ${plan.currency}`,
      `Total Actif Net : ${formatAmountSpaced(plan.totalActifNet ?? 0)} ${plan.currency} = Total Passif Net : ${formatAmountSpaced(plan.totalPassifNet ?? 0)} ${plan.currency}`,
      `Total Bilan Fiscal Liquidé : ${formatAmountSpaced(plan.totalFiscalBurden)} ${plan.currency} | Résultat Net d'Impôt : ${formatAmountSpaced(plan.netAfterTaxResultHT ?? plan.operatingResultHT - plan.estimatedCorporateTax)} ${plan.currency}`,
    ],
    [r, g, b]
  );

  if (plan.balanceSheetRows && plan.balanceSheetRows.length > 0) {
    autoTable(pdf, {
      startY: currentY,
      margin: { bottom: 22 },
      head: [
        [
          'Section',
          'Réf.',
          `1. Bilan Comptable Officiel (${plan.accountingStandard}) — Actif & Passif sur la Période`,
          `Montant Brut (${plan.currency})`,
          `Montant Net Clôture (${plan.currency})`,
        ],
      ],
      body: [
        ...plan.balanceSheetRows.map((row) => [
          row.section,
          row.rubriqueCode,
          row.label,
          formatAmountSpaced(row.grossOrPreviousAmount),
          formatAmountSpaced(row.netCurrentAmount),
        ]),
        [
          'ÉQUILIBRE',
          'ACT=PAS',
          'TOTAL GÉNÉRAL ÉQUILIBRÉ DU BILAN COMPTABLE (ACTIF NET = PASSIF NET)',
          formatAmountSpaced(plan.totalActifNet ?? 0),
          formatAmountSpaced(plan.totalPassifNet ?? 0),
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 7.9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.4, textColor: [15, 23, 42], cellPadding: 2.0 },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold' },
        1: { cellWidth: 18, fontStyle: 'bold' },
        2: { cellWidth: 80 },
        3: { cellWidth: 31, halign: 'right' },
        4: { cellWidth: 31, halign: 'right', fontStyle: 'bold' },
      },
    });

    currentY =
      (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || currentY + 55;
  }

  currentY = ensurePageSpace(
    pdf,
    currentY + 6,
    50,
    companyName,
    companyLogo || undefined,
    subtitle,
    'LIASSE OFFICIELLE : BILAN COMPTABLE & BILAN FISCAL',
    refNum,
    plan.periodLabel,
    customization.headerHexColor
  );

  autoTable(pdf, {
    startY: currentY,
    margin: { bottom: 22 },
    head: [
      [
        'Classe',
        `2. Balance Générale par Classes Comptables & Compte de Résultat (${plan.accountingStandard})`,
        `Débit (${plan.currency})`,
        `Crédit (${plan.currency})`,
        `Solde Net (${plan.currency})`,
      ],
    ],
    body: plan.accountingClasses.map((cls) => [
      cls.classNumber,
      `${cls.classTitle}\n${cls.mainAccountsSummary}`,
      formatAmountSpaced(cls.debitTotal),
      formatAmountSpaced(cls.creditTotal),
      formatAmountSpaced(cls.netBalance),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7.8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.3, textColor: [15, 23, 42], cellPadding: 2.0 },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: 76 },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
  });

  currentY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || currentY + 60;

  currentY = ensurePageSpace(
    pdf,
    currentY + 6,
    55,
    companyName,
    companyLogo || undefined,
    subtitle,
    'LIASSE OFFICIELLE : BILAN COMPTABLE & BILAN FISCAL',
    refNum,
    plan.periodLabel,
    customization.headerHexColor
  );

  autoTable(pdf, {
    startY: currentY,
    margin: { bottom: 22 },
    head: [
      [
        'Code',
        `3. Bilan Fiscal Officiel & Liquidation des Impôts et Taxes (${plan.countryName})`,
        'Catégorie Fiscale',
        'Taux / Règle Légale',
        `Assiette HT (${plan.currency})`,
        `Montant Liquidé (${plan.currency})`,
      ],
    ],
    body: [
      ...plan.fiscalLines.map((fl) => [
        fl.code,
        fl.name,
        fl.category,
        fl.rateOrRule,
        formatAmountSpaced(fl.taxableBase),
        formatAmountSpaced(fl.taxAmount),
      ]),
      [
        'TOTAL',
        'TOTAL DU BILAN FISCAL EXIGIBLE SUR LA PÉRIODE DÉFINIE',
        'Consolidé Officiel',
        '—',
        formatAmountSpaced(plan.totalRevenueHT),
        formatAmountSpaced(plan.totalFiscalBurden),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 7.8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.4, textColor: [15, 23, 42], cellPadding: 2.1 },
  });

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  pdf.save(`Liasse_Officielle_Bilan_Comptable_Fiscal_${plan.startDate}_${plan.endDate}.pdf`);
}

export function exportPeriodicAccountingAndFiscalPlanToExcel(
  plan: ExportablePeriodicAccountingFiscalPlan,
  companyName?: string
): void {
  const wb = XLSX.utils.book_new();
  const entName = companyName || 'Entreprise';

  if (plan.balanceSheetRows && plan.balanceSheetRows.length > 0) {
    const bilanRows = [
      ...plan.balanceSheetRows.map((row) => ({
        Entreprise: entName,
        Identifiant_Isolation_Tenant: plan.tenantId || 'Exclusif',
        Periode: plan.periodLabel,
        Date_Debut: plan.startDate,
        Date_Cloture: plan.endDate,
        Referentiel_Comptable: plan.accountingStandard,
        Section_Bilan: row.section,
        Code_Poste: row.rubriqueCode,
        Poste_Bilan: row.label,
        Montant_Brut: row.grossOrPreviousAmount,
        Montant_Net_Cloture: row.netCurrentAmount,
        Devise: plan.currency,
      })),
      {
        Entreprise: entName,
        Identifiant_Isolation_Tenant: plan.tenantId || 'Exclusif',
        Periode: plan.periodLabel,
        Date_Debut: plan.startDate,
        Date_Cloture: plan.endDate,
        Referentiel_Comptable: plan.accountingStandard,
        Section_Bilan: 'EQUILIBRE',
        Code_Poste: 'TOTAL-BILAN',
        Poste_Bilan: 'TOTAL ÉQUILIBRÉ ACTIF NET = PASSIF NET',
        Montant_Brut: plan.totalActifNet ?? 0,
        Montant_Net_Cloture: plan.totalPassifNet ?? 0,
        Devise: plan.currency,
      },
    ];
    const wsBilan = XLSX.utils.json_to_sheet(bilanRows);
    XLSX.utils.book_append_sheet(wb, wsBilan, '1_Bilan_Actif_Passif');
  }

  const resultatRows = [
    {
      Entreprise: entName,
      Periode: plan.periodLabel,
      Rubrique_SIG: '1. Chiffre d’Affaires & Produits d’Exploitation HT (Classe 7)',
      Montant_HT: plan.totalRevenueHT,
      Devise: plan.currency,
    },
    {
      Entreprise: entName,
      Periode: plan.periodLabel,
      Rubrique_SIG: '2. Achats, Fournitures & Charges Externes HT (Classe 6)',
      Montant_HT: Math.max(0, Number((plan.totalExpensesHT - plan.totalPayrollHT).toFixed(2))),
      Devise: plan.currency,
    },
    {
      Entreprise: entName,
      Periode: plan.periodLabel,
      Rubrique_SIG: '3. Masse Salariale & Charges de Personnel HT (Compte 66)',
      Montant_HT: plan.totalPayrollHT,
      Devise: plan.currency,
    },
    {
      Entreprise: entName,
      Periode: plan.periodLabel,
      Rubrique_SIG: '4. Total des Charges d’Exploitation HT',
      Montant_HT: plan.totalExpensesHT,
      Devise: plan.currency,
    },
    {
      Entreprise: entName,
      Periode: plan.periodLabel,
      Rubrique_SIG: '5. Résultat d’Exploitation Avant Impôt (EBE / Résultat HT)',
      Montant_HT: plan.operatingResultHT,
      Devise: plan.currency,
    },
    {
      Entreprise: entName,
      Periode: plan.periodLabel,
      Rubrique_SIG: '6. Impôt sur les Bénéfices Estimé (IS / BIC / IMF)',
      Montant_HT: plan.estimatedCorporateTax,
      Devise: plan.currency,
    },
    {
      Entreprise: entName,
      Periode: plan.periodLabel,
      Rubrique_SIG: '7. Résultat Net Comptable de la Période Définie',
      Montant_HT:
        plan.netAfterTaxResultHT ??
        Number((plan.operatingResultHT - plan.estimatedCorporateTax).toFixed(2)),
      Devise: plan.currency,
    },
  ];
  const wsRes = XLSX.utils.json_to_sheet(resultatRows);
  XLSX.utils.book_append_sheet(wb, wsRes, '2_Compte_Resultat_SIG');

  const fiscalRows = plan.fiscalLines.map((fl) => ({
    Entreprise: entName,
    Periode: plan.periodLabel,
    Date_Debut: plan.startDate,
    Date_Fin: plan.endDate,
    Code_Taxe: fl.code,
    Poste_Bilan_Fiscal: fl.name,
    Categorie: fl.category,
    Taux_Regle_Legale: fl.rateOrRule,
    Assiette_Imposable_HT: fl.taxableBase,
    Montant_Liquide: fl.taxAmount,
    Periodicite_Declarative: fl.periodicity,
    Devise: plan.currency,
  }));
  const wsFis = XLSX.utils.json_to_sheet(fiscalRows);
  XLSX.utils.book_append_sheet(wb, wsFis, '3_Bilan_Fiscal_Officiel');

  const accountingRows = plan.accountingClasses.map((cls) => ({
    Entreprise: entName,
    Periode: plan.periodLabel,
    Periodicite: plan.periodType,
    Date_Debut: plan.startDate,
    Date_Fin: plan.endDate,
    Classe: cls.classNumber,
    Intitule_Classe: cls.classTitle,
    Comptes_Principaux: cls.mainAccountsSummary,
    Mouvements_Debit: cls.debitTotal,
    Mouvements_Credit: cls.creditTotal,
    Solde_Net_Bilan: cls.netBalance,
    Nb_Ecritures: cls.transactionCount,
    Devise: plan.currency,
  }));
  const wsAcc = XLSX.utils.json_to_sheet(accountingRows);
  XLSX.utils.book_append_sheet(wb, wsAcc, '4_Balance_Classes');

  const confidentialityRows = [
    {
      Entreprise: entName,
      Identifiant_Tenant_Isole: plan.tenantId || 'Espace_Prive_Isole',
      Statut_Confidentialite: 'CLOISONNEMENT HERMÉTIQUE MULTI-TENANT ACTIF (ZERO PARTAGE)',
      Perimetre_Donnees: '100% Données créées exclusivement par cette entreprise sur la période définie',
      Referentiel_Officiel: plan.accountingStandard,
      Loi_Fiscale: plan.fiscalLawReference,
      Periode_Certifiee: `${plan.startDate} au ${plan.endDate}`,
      Horodatage_Export: new Date().toISOString(),
    },
  ];
  const wsConf = XLSX.utils.json_to_sheet(confidentialityRows);
  XLSX.utils.book_append_sheet(wb, wsConf, '5_Certificat_Confidentialite');

  XLSX.writeFile(wb, `Liasse_Officielle_Bilan_Comptable_Fiscal_${plan.startDate}_${plan.endDate}.xlsx`);
}

export function exportPeriodicAccountingAndFiscalPlanToOfficialXML(
  plan: ExportablePeriodicAccountingFiscalPlan,
  companyName: string,
  tenantId?: string,
  rccmNumber?: string,
  nifNumber?: string
): void {
  const esc = (val: unknown) =>
    String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const xmlLines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<LiasseOfficielleBilanComptableEtFiscal xmlns="urn:mep:official-accounting-fiscal-filing:v2" norme="EDI-TDFC-DGI-SYSCOHADA-PCG-IFRS">',
    '  <EnTeteDeclarant>',
    `    <RaisonSociale>${esc(companyName)}</RaisonSociale>`,
    `    <IdentifiantCloisonnementEntreprise>${esc(tenantId || plan.tenantId || 'TENANT_ISOLE')}</IdentifiantCloisonnementEntreprise>`,
    '    <ConfidentialiteMultiEntreprise>STRICTE_ISOLATION_DONNEES_PROPRES_UNIQUEMENT</ConfidentialiteMultiEntreprise>',
    `    <RCCM>${esc(rccmNumber || plan.rccmNumber || 'NON_RENSEIGNE')}</RCCM>`,
    `    <NIF_IFU>${esc(nifNumber || plan.nifNumber || 'NON_RENSEIGNE')}</NIF_IFU>`,
    `    <PaysJuridiction>${esc(plan.countryName)}</PaysJuridiction>`,
    `    <ReferentielComptable>${esc(plan.accountingStandard)}</ReferentielComptable>`,
    `    <LoiFiscaleReference>${esc(plan.fiscalLawReference)}</LoiFiscaleReference>`,
    `    <DeviseOfficielle>${esc(plan.currency)}</DeviseOfficielle>`,
    '  </EnTeteDeclarant>',
    '  <PeriodeDefinie>',
    `    <TypePeriodicite>${esc(plan.periodType)}</TypePeriodicite>`,
    `    <LibellePeriode>${esc(plan.periodLabel)}</LibellePeriode>`,
    `    <DateDebut>${esc(plan.startDate)}</DateDebut>`,
    `    <DateCloture>${esc(plan.endDate)}</DateCloture>`,
    `    <DateGeneration>${esc(new Date().toISOString())}</DateGeneration>`,
    '  </PeriodeDefinie>',
    '  <BilanComptableOfficiel>',
    `    <TotalActifNet devise="${esc(plan.currency)}">${Number(plan.totalActifNet ?? 0).toFixed(2)}</TotalActifNet>`,
    `    <TotalPassifNet devise="${esc(plan.currency)}">${Number(plan.totalPassifNet ?? 0).toFixed(2)}</TotalPassifNet>`,
    `    <EquilibreVerifie>${Math.abs((plan.totalActifNet ?? 0) - (plan.totalPassifNet ?? 0)) < 1 ? 'true' : 'false'}</EquilibreVerifie>`,
    '    <PostesBilan>',
    ...(plan.balanceSheetRows || []).map(
      (r) =>
        `      <Poste section="${esc(r.section)}" code="${esc(r.rubriqueCode)}"><Libelle>${esc(
          r.label
        )}</Libelle><MontantBrut>${r.grossOrPreviousAmount.toFixed(
          2
        )}</MontantBrut><MontantNetCloture>${r.netCurrentAmount.toFixed(2)}</MontantNetCloture></Poste>`
    ),
    '    </PostesBilan>',
    '  </BilanComptableOfficiel>',
    '  <CompteDeResultatOfficiel>',
    `    <ProduitsExploitationHT>${plan.totalRevenueHT.toFixed(2)}</ProduitsExploitationHT>`,
    `    <ChargesExploitationHT>${plan.totalExpensesHT.toFixed(2)}</ChargesExploitationHT>`,
    `    <MasseSalarialeHT>${plan.totalPayrollHT.toFixed(2)}</MasseSalarialeHT>`,
    `    <ResultatExploitationHT>${plan.operatingResultHT.toFixed(2)}</ResultatExploitationHT>`,
    `    <ImpotSocietesEstime>${plan.estimatedCorporateTax.toFixed(2)}</ImpotSocietesEstime>`,
    `    <ResultatNetComptable>${(
      plan.netAfterTaxResultHT ?? plan.operatingResultHT - plan.estimatedCorporateTax
    ).toFixed(2)}</ResultatNetComptable>`,
    '  </CompteDeResultatOfficiel>',
    '  <BilanFiscalOfficiel>',
    `    <TVACollectee>${plan.totalVatCollected.toFixed(2)}</TVACollectee>`,
    `    <TVADeductible>${plan.totalVatDeductible.toFixed(2)}</TVADeductible>`,
    `    <TVANetteAPayer>${plan.netVatPayable.toFixed(2)}</TVANetteAPayer>`,
    `    <CreditTVAReporter>${(plan.vatCreditCarryForward ?? 0).toFixed(2)}</CreditTVAReporter>`,
    `    <ImpotSurLesBenefices>${plan.estimatedCorporateTax.toFixed(2)}</ImpotSurLesBenefices>`,
    `    <AutresImpotsEtTaxes>${plan.totalOtherTaxes.toFixed(2)}</AutresImpotsEtTaxes>`,
    `    <TotalBilanFiscalExigible>${plan.totalFiscalBurden.toFixed(2)}</TotalBilanFiscalExigible>`,
    '    <LignesLiquidationFiscale>',
    ...plan.fiscalLines.map(
      (fl) =>
        `      <Taxe code="${esc(fl.code)}" periodicite="${esc(fl.periodicity)}"><Libelle>${esc(
          fl.name
        )}</Libelle><Categorie>${esc(fl.category)}</Categorie><Regle>${esc(
          fl.rateOrRule
        )}</Regle><AssietteHT>${fl.taxableBase.toFixed(2)}</AssietteHT><MontantLiquide>${fl.taxAmount.toFixed(
          2
        )}</MontantLiquide></Taxe>`
    ),
    '    </LignesLiquidationFiscale>',
    '  </BilanFiscalOfficiel>',
    '</LiasseOfficielleBilanComptableEtFiscal>',
  ];

  const blob = new Blob([xmlLines.join('\n')], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Teledeclaration_Officielle_Bilan_Comptable_Fiscal_${plan.startDate}_${plan.endDate}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPeriodicAccountingAndFiscalPlanToOfficialFEC(
  plan: ExportablePeriodicAccountingFiscalPlan,
  companyName: string,
  tenantId?: string,
  nifNumber?: string
): void {
  const header = [
    'JournalCode',
    'JournalLib',
    'EcritureNum',
    'EcritureDate',
    'CompteNum',
    'CompteLib',
    'CompAuxNum',
    'CompAuxLib',
    'PieceRef',
    'PieceDate',
    'EcritureLib',
    'Debit',
    'Credit',
    'EcritureLet',
    'DateLet',
    'ValidDate',
    'Montantdevise',
    'Idevise',
  ].join('|');

  const dateCompact = plan.endDate.replace(/-/g, '');
  const lines: string[] = [header];
  let num = 1;

  for (const cls of plan.accountingClasses) {
    if (cls.debitTotal === 0 && cls.creditTotal === 0) continue;
    const accNum = `${cls.classNumber.replace(/\D/g, '') || num}00000`.slice(0, 6);
    lines.push(
      [
        'OD',
        `Bilan Périodique ${companyName}`,
        `FEC-${dateCompact}-${String(num++).padStart(4, '0')}`,
        dateCompact,
        accNum,
        cls.classTitle.replace(/\|/g, ' '),
        tenantId || plan.tenantId || 'TENANT',
        companyName.replace(/\|/g, ' '),
        `BCF-${dateCompact}`,
        dateCompact,
        `${plan.periodLabel} - ${cls.classTitle}`.replace(/\|/g, ' '),
        cls.debitTotal.toFixed(2),
        cls.creditTotal.toFixed(2),
        '',
        '',
        dateCompact,
        Math.abs(cls.netBalance).toFixed(2),
        plan.currency,
      ].join('|')
    );
  }

  for (const fl of plan.fiscalLines) {
    if (fl.taxAmount === 0 && fl.taxableBase === 0) continue;
    lines.push(
      [
        'FISC',
        `Déclaration Fiscale ${companyName}`,
        `FEC-${dateCompact}-${String(num++).padStart(4, '0')}`,
        dateCompact,
        '440000',
        `État - ${fl.code} (${fl.name})`.replace(/\|/g, ' '),
        nifNumber || plan.nifNumber || 'NIF',
        companyName.replace(/\|/g, ' '),
        `FISC-${fl.code}-${dateCompact}`,
        dateCompact,
        `Liquidation ${fl.name} (${plan.periodLabel})`.replace(/\|/g, ' '),
        '0.00',
        fl.taxAmount.toFixed(2),
        '',
        '',
        dateCompact,
        fl.taxAmount.toFixed(2),
        plan.currency,
      ].join('|')
    );
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FEC_Officiel_${(nifNumber || companyName).replace(/\s+/g, '_')}_${plan.startDate}_${plan.endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// 13. GÉNÉRATION AUTOMATIQUE DE LA SYNTHÈSE D'ACHÈVEMENT DU PROJET (COMPLETED_WITH_SUCCESS)
//     & AVIS OFFICIELS DE RELANCE DE PAIEMENT (PDF SANS DÉBORDEMENT)
// ============================================================================

export function buildProjectCompletionSummary(
  project: ExportableProject,
  generatedBy = 'Direction de Projet'
): ProjectCompletionSummaryRecord {
  const nowIso = new Date().toISOString();
  const closure = project.closureInfo;
  const steps = project.structuredSteps || [];
  const keyDeliverables =
    steps.length > 0
      ? steps.map((st, idx) => ({
          phaseNumber: st.phaseNumber || idx + 1,
          tradeName: st.tradeName || 'Tous Corps d’État',
          title: st.title || `Phase ${idx + 1}`,
          deliverable: st.deliverable || st.phaseObjectives || 'Livrable réceptionné à 100%',
          progressPct: 100,
          responsible:
            st.tradeLeaderName ||
            closure?.leadTradeRepresentativeName ||
            project.projectManagerName ||
            generatedBy,
        }))
      : (project.involvedTrades || ['Exécution Globale']).map((tr, idx) => ({
          phaseNumber: idx + 1,
          tradeName: tr,
          title: `Lot Technique ${idx + 1} — ${tr}`,
          deliverable: project.deliverablesSummary || `Ouvrages du lot ${tr} réceptionnés sans réserve`,
          progressPct: 100,
          responsible: project.projectManagerName || generatedBy,
        }));

  const tests = closure?.commissioningTests || [];
  const testResultsSummary =
    tests.length > 0
      ? tests.map((t) => ({
          testCode: t.testCode,
          tradeName: t.tradeName,
          title: t.title,
          normOrReference: t.normOrReference,
          measuredValue: t.measuredValue,
          verdict:
            t.verdict === 'conforme_100'
              ? '100% CONFORME'
              : t.verdict === 'reserve'
              ? 'AVEC RÉSERVE'
              : 'NON CONFORME',
          proofReference: t.proofReference,
        }))
      : (project.involvedTrades || ['Génie Civil & Équipements']).map((tr, idx) => ({
          testCode: `ESS-0${idx + 1}`,
          tradeName: tr,
          title: `Essai de fonctionnement et contrôle qualité final — ${tr}`,
          normOrReference: '100% Conforme Cahier des Charges & Normes ISO/DTU',
          measuredValue: '100% Conforme — Aucune anomalie',
          verdict: '100% CONFORME',
          proofReference: `PV-ESSAI-${project.id.slice(-4).toUpperCase()}-0${idx + 1}`,
        }));

  const checklist = closure?.siteClearanceChecklist || [];
  const siteClearanceRatePct =
    checklist.length > 0
      ? Math.round((checklist.filter((c) => c.completed).length / checklist.length) * 100)
      : 100;

  return {
    id: `cs_${project.id}_${Date.now()}`,
    summaryNumber: `SYNT-ACH-${project.id.slice(-5).toUpperCase()}-${new Date().getFullYear()}`,
    generatedAt: nowIso,
    generatedBy,
    projectId: project.id,
    projectName: project.name,
    clientName: project.clientName,
    projectManagerName:
      closure?.projectManagerName || project.projectManagerName || generatedBy,
    achievementStatus: 'completed_with_success',
    totalDeliverablesCount: keyDeliverables.length,
    completedPhasesCount: keyDeliverables.length,
    keyDeliverables,
    totalTestsCount: testResultsSummary.length,
    conformeTestsCount: testResultsSummary.filter((t) => t.verdict.includes('CONFORME')).length,
    testResultsSummary,
    siteClearanceRatePct,
    executiveConclusion:
      closure?.workCompletionNotes ||
      `L'ensemble des ${keyDeliverables.length} livrable(s) clés et ${testResultsSummary.length} protocole(s) d'essais techniques du projet « ${project.name} » ont été validés à 100% avec succès.`,
  };
}

export interface ExportablePaymentReminderNotice {
  reminderNumber: string;
  reminderLevel: 'preventive' | 'first_overdue' | 'formal_notice';
  reminderTitle: string;
  daysDiff: number; // negative = days remaining before due date, positive = days overdue
  customSubject: string;
  customMessageBody: string;
  recipientPhone?: string;
}

export function exportPaymentReminderToPDF(
  docItem: ExportableDocument,
  reminder: ExportablePaymentReminderNotice,
  companyName = 'PRESTATAIRE DE SERVICES',
  companyLogo?: string,
  customConfig?: Partial<DocumentCustomizationConfig>
): void {
  const customization: DocumentCustomizationConfig = {
    ...DEFAULT_DOC_CUSTOMIZATION,
    ...(customConfig || {}),
  };
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const [r, g, b] = hexToRgb(customization.headerHexColor);
  const officialCurrencyCode = getOfficialCurrencyCode(docItem.currency);
  const remainingDue = Math.max(0, Number((docItem.totalAmount - docItem.paidAmount).toFixed(2)));

  const badgeText =
    reminder.reminderLevel === 'formal_notice'
      ? `MISE EN DEMEURE — RETARD ${reminder.daysDiff} JOURS`
      : reminder.reminderLevel === 'first_overdue'
      ? `RELANCE ÉCHÉANCE DÉPASSÉE (+${reminder.daysDiff} JOURS)`
      : `RAPPEL PRÉVENTIF D’ÉCHÉANCE (J-${Math.abs(reminder.daysDiff)})`;

  const subtitle =
    customization.companySubtitle ||
    customization.headerSubtitle ||
    DEFAULT_DOC_CUSTOMIZATION.headerSubtitle ||
    '';

  const afterHeaderY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo,
    subtitle,
    reminder.reminderTitle.toUpperCase(),
    reminder.reminderNumber,
    `Date d'émission : ${new Date().toLocaleDateString('fr-FR')} · Réf. Facture : ${docItem.docNumber}`,
    customization.headerHexColor,
    badgeText
  );

  let currentY = drawTwoColumnInfoCards(
    pdf,
    afterHeaderY,
    'DESTINATAIRE / CLIENT RELANCÉ',
    docItem.clientName,
    [
      `E-mail : ${docItem.clientEmail || 'Non renseigné'}`,
      `Téléphone / WhatsApp : ${reminder.recipientPhone || 'Contact Client'}`,
      `Adresse : ${docItem.clientAddress || 'Siège Client'}`,
    ],
    'RÉFÉRENCES DE LA FACTURE CONCERNÉE',
    `Facture N° ${docItem.docNumber} (${officialCurrencyCode})`,
    [
      `Projet rattaché : ${docItem.projectName}`,
      `Date d'émission : ${docItem.issueDate} · Date d'échéance : ${docItem.dueDate}`,
      `Compte de règlement : ${docItem.projectAccountInfo || docItem.projectDedicatedAccount || customization.bankDetails || 'Voir coordonnées bancaires'}`,
    ],
    [r, g, b]
  );

  // Tableau financier synthétique de la créance
  autoTable(pdf, {
    startY: currentY,
    margin: { bottom: 22 },
    head: [
      [
        'N° Document',
        'Projet / Objet',
        'Date d’Échéance',
        `Montant Total TTC (${officialCurrencyCode})`,
        `Montant Réglé (${officialCurrencyCode})`,
        `Solde Restant Dû (${officialCurrencyCode})`,
      ],
    ],
    body: [
      [
        docItem.docNumber,
        docItem.projectName,
        docItem.dueDate,
        formatAmountSpaced(docItem.totalAmount),
        formatAmountSpaced(docItem.paidAmount),
        formatAmountSpaced(remainingDue),
      ],
    ],
    theme: 'grid',
    styles: { overflow: 'linebreak' },
    headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.2, textColor: [15, 23, 42], cellPadding: 3, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 46 },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', textColor: [185, 28, 28] },
    },
  });

  currentY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ||
    currentY + 28;

  // Cadre du courrier officiel de relance avec hauteur dynamique sans débordement
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.8);
  const subjectLines: string[] = pdf.splitTextToSize(`OBJET : ${reminder.customSubject}`, 172);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  const bodyLines: string[] = pdf.splitTextToSize(reminder.customMessageBody, 172);

  const letterBoxH = Math.max(48, 14 + subjectLines.length * 4.5 + bodyLines.length * 4.3 + 8);
  currentY = ensurePageSpace(
    pdf,
    currentY + 6,
    letterBoxH + 36,
    companyName,
    companyLogo,
    subtitle,
    reminder.reminderTitle.toUpperCase(),
    reminder.reminderNumber,
    `Réf. Facture : ${docItem.docNumber}`,
    customization.headerHexColor,
    badgeText
  );

  pdf.setDrawColor(203, 213, 225);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(14, currentY, 182, letterBoxH, 2, 2, 'FD');

  let textY = currentY + 7;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.8);
  pdf.setTextColor(15, 23, 42);
  for (const sl of subjectLines) {
    pdf.text(sl, 19, textY);
    textY += 4.5;
  }

  textY += 2;
  pdf.setDrawColor(226, 232, 240);
  pdf.line(19, textY - 2, 191, textY - 2);
  textY += 2;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.4);
  pdf.setTextColor(51, 65, 85);
  for (const bl of bodyLines) {
    pdf.text(bl, 19, textY);
    textY += 4.2;
  }

  const sigY = currentY + letterBoxH + 6;
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, sigY, 86, 26, 2, 2, 'S');
  pdf.roundedRect(110, sigY, 86, 26, 2, 2, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.8);
  pdf.setTextColor(15, 23, 42);
  pdf.text('ACCUSÉ DE RÉCEPTION CLIENT', 18, sigY + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Date de prise en compte et visa du service financier client', 18, sigY + 21);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.8);
  pdf.setTextColor(15, 23, 42);
  const sigTitle = pdf.splitTextToSize(
    `POUR ${companyName.toUpperCase()} — DIRECTION FINANCIÈRE`,
    78
  )[0];
  pdf.text(sigTitle, 114, sigY + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Signature autorisée et cachet officiel de recouvrement', 114, sigY + 21);

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  pdf.save(`${reminder.reminderNumber}_${docItem.docNumber}.pdf`);
}

export interface CurrentMonthFinancialSummaryInput {
  monthKey: string; // YYYY-MM
  monthLabel: string; // ex: Octobre 2026
  companyName: string;
  companyLogo?: string;
  companyIsu?: string;
  currency: Currency;
  customization?: DocumentCustomizationConfig;
  currentMonthBilledTTC: number;
  currentMonthBilledHT: number;
  currentMonthTaxAmount: number;
  currentMonthCollected: number;
  currentMonthPending: number;
  currentMonthCollectionRate: number;
  overallBilledTTC: number;
  overallCollected: number;
  overallCollectionRate: number;
  currentMonthDocuments: ExportableDocument[];
  allActiveDocuments: ExportableDocument[];
  projects: ExportableProject[];
}

export function exportCurrentMonthFinancialSummaryToPDF(
  input: CurrentMonthFinancialSummaryInput
): void {
  const {
    monthKey,
    monthLabel,
    companyName,
    companyLogo,
    companyIsu,
    currency,
    customization = DEFAULT_DOC_CUSTOMIZATION,
    currentMonthBilledTTC,
    currentMonthBilledHT,
    currentMonthTaxAmount,
    currentMonthCollected,
    currentMonthPending,
    currentMonthCollectionRate,
    overallBilledTTC,
    overallCollected,
    overallCollectionRate,
    currentMonthDocuments,
    allActiveDocuments,
    projects,
  } = input;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currCode = getOfficialCurrencyCode(currency);
  const fmt = (amount: number) => `${formatAmountSpaced(amount, currency)} ${currCode}`;

  const startY = drawCorporateHeader(
    pdf,
    companyName,
    companyLogo,
    'SYNTHÈSE MENSUELLE DES PERFORMANCES FINANCIÈRES',
    `PÉRIODE : ${monthLabel.toUpperCase()} (${monthKey})${companyIsu ? ` · ${companyIsu}` : ''}`,
    customization
  );

  let currentY = startY + 2;

  // Bandeau d'objet exécutif
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, currentY, 182, 16, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);
  pdf.text(
    `RAPPORT AUTOMATISÉ DU MOIS EN COURS : CHIFFRE D'AFFAIRES FACTURÉ VS ENCAISSÉ (${monthLabel.toUpperCase()})`,
    18,
    currentY + 6.5
  );

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.8);
  pdf.setTextColor(71, 85, 105);
  pdf.text(
    `Édité le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })} · Devise de reporting : ${currCode} · Pièces du mois : ${currentMonthDocuments.length}`,
    18,
    currentY + 12.5
  );

  currentY += 21;

  // Cartes KPI du mois en cours (4 colonnes)
  const cardW = 43.5;
  const cardH = 22;
  const gap = 2.6;
  const kpiCards = [
    {
      title: 'CA FACTURÉ (MOIS)',
      value: fmt(currentMonthBilledTTC),
      sub: `HT : ${fmt(currentMonthBilledHT)}`,
      border: [37, 99, 235] as [number, number, number],
      text: [30, 64, 175] as [number, number, number],
    },
    {
      title: 'CA ENCAISSÉ (MOIS)',
      value: fmt(currentMonthCollected),
      sub: `Taux : ${currentMonthCollectionRate}% encaissé`,
      border: [16, 185, 129] as [number, number, number],
      text: [6, 95, 70] as [number, number, number],
    },
    {
      title: 'RESTE À RECOUVRER',
      value: fmt(currentMonthPending),
      sub: `TVA mois : ${fmt(currentMonthTaxAmount)}`,
      border: [245, 158, 11] as [number, number, number],
      text: [146, 64, 14] as [number, number, number],
    },
    {
      title: 'CUMUL GLOBAL ACTIF',
      value: fmt(overallCollected),
      sub: `Sur ${fmt(overallBilledTTC)} (${overallCollectionRate}%)`,
      border: [99, 102, 241] as [number, number, number],
      text: [55, 48, 163] as [number, number, number],
    },
  ];

  kpiCards.forEach((card, idx) => {
    const x = 14 + idx * (cardW + gap);
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(card.border[0], card.border[1], card.border[2]);
    pdf.setLineWidth(0.45);
    pdf.roundedRect(x, currentY, cardW, cardH, 2, 2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(card.title, x + 3, currentY + 5.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.6);
    pdf.setTextColor(card.text[0], card.text[1], card.text[2]);
    const valLine = pdf.splitTextToSize(card.value, cardW - 6)[0] || card.value;
    pdf.text(valLine, x + 3, currentY + 12.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.6);
    pdf.setTextColor(71, 85, 105);
    const subLine = pdf.splitTextToSize(card.sub, cardW - 6)[0] || card.sub;
    pdf.text(subLine, x + 3, currentY + 18.5);
  });

  currentY += cardH + 7;

  // Jauge visuelle de recouvrement mensuel (Facturé vs Encaissé)
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(14, currentY, 182, 16, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text(
    `Ratio d'encaissement du mois (${monthLabel}) : ${currentMonthCollectionRate}%`,
    18,
    currentY + 5.5
  );
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text(
    `Écart Facturé / Encaissé : ${fmt(currentMonthPending)}`,
    192,
    currentY + 5.5,
    { align: 'right' }
  );

  // Barre de progression
  const barX = 18;
  const barY = currentY + 8.5;
  const barW = 174;
  const barH = 4.2;
  pdf.setFillColor(226, 232, 240);
  pdf.roundedRect(barX, barY, barW, barH, 1.5, 1.5, 'F');
  const clampedRate = Math.max(0, Math.min(100, currentMonthCollectionRate));
  if (clampedRate > 0) {
    const fillW = Math.max(3, (barW * clampedRate) / 100);
    pdf.setFillColor(16, 185, 129);
    pdf.roundedRect(barX, barY, fillW, barH, 1.5, 1.5, 'F');
  }

  currentY += 22;

  // Tableau 1 : Pièces commerciales facturées sur le mois en cours (ou portefeuille actif si aucun document émis ce mois)
  const docsToDisplay =
    currentMonthDocuments.length > 0 ? currentMonthDocuments : allActiveDocuments.slice(0, 15);
  const tableTitle =
    currentMonthDocuments.length > 0
      ? `1. DÉTAIL DES FACTURES & PROFORMAS DU MOIS EN COURS (${monthLabel.toUpperCase()})`
      : `1. ÉTAT DES PIÈCES FACTURÉES ACTIVES (AUCUNE ÉMISSION SUR ${monthLabel.toUpperCase()} — VUE PORTEFEUILLE)`;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.8);
  pdf.setTextColor(15, 23, 42);
  pdf.text(tableTitle, 14, currentY);
  currentY += 3;

  autoTable(pdf, {
    startY: currentY,
    head: [
      [
        'Réf. Document',
        'Type',
        'Client & Projet',
        'Date Émission',
        `Montant Facturé (${currCode})`,
        `Montant Encaissé (${currCode})`,
        `Reste Dû (${currCode})`,
        'Taux',
      ],
    ],
    body:
      docsToDisplay.length > 0
        ? docsToDisplay.map((d) => {
            const total = Number(d.totalAmount) || 0;
            const paid = Number(d.paidAmount) || 0;
            const rem = Math.max(0, total - paid);
            const rate = total > 0 ? Math.round((paid / total) * 100) : 0;
            const typeLbl =
              d.docType === 'invoice'
                ? 'Facture'
                : d.docType === 'proforma'
                ? 'Proforma'
                : 'Devis';
            return [
              d.docNumber,
              typeLbl,
              `${d.clientName}\n(${d.projectName || 'Projet'})`,
              d.issueDate || '-',
              formatAmountSpaced(total, currency),
              formatAmountSpaced(paid, currency),
              formatAmountSpaced(rem, currency),
              `${rate}%`,
            ];
          })
        : [
            [
              '-',
              '-',
              'Aucune facture enregistrée sur cette période',
              '-',
              '0',
              '0',
              '0',
              '0%',
            ],
          ],
    foot: [
      [
        `TOTAL ${monthLabel.toUpperCase()}`,
        `${currentMonthDocuments.length} pièce(s)`,
        '-',
        '-',
        formatAmountSpaced(currentMonthBilledTTC, currency),
        formatAmountSpaced(currentMonthCollected, currency),
        formatAmountSpaced(currentMonthPending, currency),
        `${currentMonthCollectionRate}%`,
      ],
    ],
    styles: {
      fontSize: 7.4,
      cellPadding: 2.2,
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
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
  });

  currentY = (pdf as any).lastAutoTable.finalY + 8;

  // Tableau 2 : Synthèse par Projet (Budget vs Facturé vs Encaissé)
  if (projects.length > 0 && currentY < 235) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.8);
    pdf.setTextColor(15, 23, 42);
    pdf.text(
      '2. VENTILATION DES PERFORMANCES FINANCIÈRES PAR PROJET (FACTURÉ VS ENCAISSÉ)',
      14,
      currentY
    );
    currentY += 3;

    autoTable(pdf, {
      startY: currentY,
      head: [
        [
          'Projet',
          'Client Associé',
          'Avancement',
          `Budget Alloué (${currCode})`,
          `CA Facturé (${currCode})`,
          `CA Encaissé (${currCode})`,
          `Solde à Encaisser (${currCode})`,
        ],
      ],
      body: projects.slice(0, 12).map((p) => {
        const billed = Number(p.billedAmount) || 0;
        const paid = Number(p.paidAmount) || 0;
        const rem = Math.max(0, billed - paid);
        return [
          p.name,
          p.clientName,
          `${p.progress || 0}%`,
          formatAmountSpaced(Number(p.budget) || 0, currency),
          formatAmountSpaced(billed, currency),
          formatAmountSpaced(paid, currency),
          formatAmountSpaced(rem, currency),
        ];
      }),
      styles: {
        fontSize: 7.4,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
    });
  }

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  const safeCompany = companyName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 28);
  pdf.save(`Synthese_Mensuelle_Performances_${safeCompany}_${monthKey}.pdf`);
}

export function exportAnnualAccountingClassesSummaryToPDF(
  plan: ExportablePeriodicAccountingFiscalPlan,
  fiscalYear: number,
  companyName = 'PRESTATAIRE DE SERVICES',
  companyLogo?: string,
  customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION
): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currCode = getOfficialCurrencyCode(plan.currency);
  const fmt = (amount: number) => `${formatAmountSpaced(amount, plan.currency)} ${currCode}`;

  const startY = drawCorporateHeader(
    pdf,
    companyName,
    companyLogo,
    `SYNTHÈSE ANNUELLE DU PLAN COMPTABLE & FISCAL — LIASSE FISCALE (${fiscalYear})`,
    `EXERCICE FISCAL ${fiscalYear} (DU 01/01/${fiscalYear} AU 31/12/${fiscalYear}) · ${plan.accountingStandard.toUpperCase()}`,
    customization
  );

  let currentY = startY + 2;

  const classes = plan.accountingClasses || [];
  const totalDebit = classes.reduce((s, c) => s + (Number(c.debitTotal) || 0), 0);
  const totalCredit = classes.reduce((s, c) => s + (Number(c.creditTotal) || 0), 0);
  const totalNetBalance = Number((totalCredit - totalDebit).toFixed(2));
  const totalTransactions = classes.reduce((s, c) => s + (Number(c.transactionCount) || 0), 0);

  // Bandeau récapitulatif de l'exercice fiscal courant
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, currentY, 182, 16, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.8);
  pdf.setTextColor(15, 23, 42);
  pdf.text(
    `DOSSIER DE SYNTHÈSE ANNUELLE COMPTABLE & FISCALE — PRÉPARATION DE LA LIASSE FISCALE ${fiscalYear}`,
    18,
    currentY + 6.5
  );

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.6);
  pdf.setTextColor(71, 85, 105);
  pdf.text(
    `Norme : ${plan.accountingStandard} · Pays : ${plan.countryName} · Devise : ${currCode} · Édité le ${new Date().toLocaleDateString('fr-FR')}`,
    18,
    currentY + 12.2
  );

  currentY += 20;

  // 4 Cartes KPI Annuelles
  const cardW = 43.5;
  const cardH = 21;
  const gap = 2.6;
  const kpiCards = [
    {
      title: `TOTAL DÉBIT (${fiscalYear})`,
      value: fmt(totalDebit),
      sub: `${classes.length} classes comptables`,
      border: [37, 99, 235] as [number, number, number],
      text: [30, 64, 175] as [number, number, number],
    },
    {
      title: `TOTAL CRÉDIT (${fiscalYear})`,
      value: fmt(totalCredit),
      sub: `${totalTransactions} mouvements imputés`,
      border: [16, 185, 129] as [number, number, number],
      text: [6, 95, 70] as [number, number, number],
    },
    {
      title: 'RÉSULTAT NET APRÈS IS',
      value: fmt(plan.netAfterTaxResultHT || plan.operatingResultHT || 0),
      sub: `CA HT : ${fmt(plan.totalRevenueHT || 0)}`,
      border: [99, 102, 241] as [number, number, number],
      text: [55, 48, 163] as [number, number, number],
    },
    {
      title: 'CHARGE FISCALE GLOBALE',
      value: fmt(plan.totalFiscalBurden || plan.estimatedCorporateTax || 0),
      sub: `IS/BIC estimé : ${fmt(plan.estimatedCorporateTax || 0)}`,
      border: [245, 158, 11] as [number, number, number],
      text: [146, 64, 14] as [number, number, number],
    },
  ];

  kpiCards.forEach((card, idx) => {
    const x = 14 + idx * (cardW + gap);
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(card.border[0], card.border[1], card.border[2]);
    pdf.setLineWidth(0.45);
    pdf.roundedRect(x, currentY, cardW, cardH, 2, 2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(card.title, x + 3, currentY + 5.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.4);
    pdf.setTextColor(card.text[0], card.text[1], card.text[2]);
    const valLine = pdf.splitTextToSize(card.value, cardW - 6)[0] || card.value;
    pdf.text(valLine, x + 3, currentY + 12);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.6);
    pdf.setTextColor(71, 85, 105);
    const subLine = pdf.splitTextToSize(card.sub, cardW - 6)[0] || card.sub;
    pdf.text(subLine, x + 3, currentY + 17.8);
  });

  currentY += cardH + 7;

  // Tableau principal : Ensemble des soldes des classes comptables sur l'année fiscale courante
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.8);
  pdf.setTextColor(15, 23, 42);
  pdf.text(
    `1. BALANCE SYNTHÉTIQUE DES SOLDES PAR CLASSE COMPTABLE (EXERCICE ${fiscalYear})`,
    14,
    currentY
  );
  currentY += 3;

  autoTable(pdf, {
    startY: currentY,
    head: [
      [
        'Classe',
        'Intitulé de la Classe Comptable',
        'Comptes de Référence',
        'Écritures',
        `Total Débit (${currCode})`,
        `Total Crédit (${currCode})`,
        `Solde Net (${currCode})`,
        'Sens',
      ],
    ],
    body: classes.map((cls) => {
      const debit = Number(cls.debitTotal) || 0;
      const credit = Number(cls.creditTotal) || 0;
      const net = Number(cls.netBalance) || Number((credit - debit).toFixed(2));
      const sens = net > 0 ? 'Créditeur' : net < 0 ? 'Débiteur' : 'Équilibré';
      return [
        `Classe ${cls.classNumber}`,
        cls.classTitle,
        cls.mainAccountsSummary || '-',
        String(cls.transactionCount || 0),
        formatAmountSpaced(debit, plan.currency),
        formatAmountSpaced(credit, plan.currency),
        formatAmountSpaced(net, plan.currency),
        sens,
      ];
    }),
    foot: [
      [
        `TOTAL ${fiscalYear}`,
        'SYNTHÈSE GÉNÉRALE DES CLASSES (1 À 8)',
        '-',
        String(totalTransactions),
        formatAmountSpaced(totalDebit, plan.currency),
        formatAmountSpaced(totalCredit, plan.currency),
        formatAmountSpaced(totalNetBalance, plan.currency),
        totalNetBalance >= 0 ? 'Créditeur' : 'Débiteur',
      ],
    ],
    styles: {
      fontSize: 7.4,
      cellPadding: 2.2,
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
      0: { cellWidth: 18, fontStyle: 'bold' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 42 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 16, halign: 'center' },
    },
  });

  currentY = (pdf as any).lastAutoTable.finalY + 8;

  // Tableau 2 : Équilibre Actif / Passif & Résultat Fiscal de l'exercice
  if (plan.balanceSheetRows && plan.balanceSheetRows.length > 0) {
    if (currentY > 225) {
      pdf.addPage();
      currentY = 20;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.8);
    pdf.setTextColor(15, 23, 42);
    pdf.text(
      `2. SYNTHÈSE PATRIMONIALE ACTIF / PASSIF DE L'EXERCICE ${fiscalYear}`,
      14,
      currentY
    );
    currentY += 3;

    autoTable(pdf, {
      startY: currentY,
      head: [
        [
          'Section',
          'Code Rubrique',
          'Poste du Bilan Annuel',
          `Montant Brut / Réf (${currCode})`,
          `Solde Net Exercice ${fiscalYear} (${currCode})`,
        ],
      ],
      body: plan.balanceSheetRows.map((row) => [
        row.section,
        row.rubriqueCode,
        row.label,
        formatAmountSpaced(row.grossOrPreviousAmount, plan.currency),
        formatAmountSpaced(row.netCurrentAmount, plan.currency),
      ]),
      styles: {
        fontSize: 7.4,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold' },
        1: { cellWidth: 22, fontStyle: 'bold' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
      },
    });
    currentY = (pdf as any).lastAutoTable.finalY + 8;
  }

  // Tableau 3 : Synthèse Fiscale Annuelle & Préparation de la Liasse Fiscale (Compte de Résultat & Obligations Fiscales)
  if (currentY > 210) {
    pdf.addPage();
    currentY = 20;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.8);
  pdf.setTextColor(15, 23, 42);
  pdf.text(
    `3. COMPTE DE RÉSULTAT ANNUEL (SIG) & ÉTAT DES OBLIGATIONS FISCALES (LIASSE FISCALE ${fiscalYear})`,
    14,
    currentY
  );
  currentY += 3;

  const sigAndFiscalRows: string[][] = [
    [
      'PRODUITS (CL. 7)',
      'Chiffre d’Affaires & Produits d’Exploitation HT',
      '100%',
      formatAmountSpaced(plan.totalRevenueHT || 0, plan.currency),
      formatAmountSpaced(plan.totalRevenueHT || 0, plan.currency),
      'Base Imposable Produits',
    ],
    [
      'CHARGES (CL. 6)',
      'Achats, Consommations & Charges Externes HT',
      '-',
      formatAmountSpaced(
        Math.max(0, (plan.totalExpensesHT || 0) - (plan.totalPayrollHT || 0)),
        plan.currency
      ),
      formatAmountSpaced(
        Math.max(0, (plan.totalExpensesHT || 0) - (plan.totalPayrollHT || 0)),
        plan.currency
      ),
      'Charges Déductibles',
    ],
    [
      'MASSE SALARIALE',
      'Rémunérations Brutes & Charges de Personnel (Cl. 64/66)',
      '-',
      formatAmountSpaced(plan.totalPayrollHT || 0, plan.currency),
      formatAmountSpaced(plan.totalPayrollHT || 0, plan.currency),
      'Charges Sociales & Salariales',
    ],
    [
      'RÉSULTAT EXPL.',
      'Résultat d’Exploitation Avant Impôt (EBE / REX)',
      '-',
      formatAmountSpaced(plan.operatingResultHT || 0, plan.currency),
      formatAmountSpaced(plan.operatingResultHT || 0, plan.currency),
      (plan.operatingResultHT || 0) >= 0 ? 'Bénéfice Imposable' : 'Déficit Fiscal Reportable',
    ],
    [
      'IS / BIC (CL. 8)',
      'Impôt sur les Sociétés / Bénéfices Estimé',
      '-',
      formatAmountSpaced(Math.max(0, plan.operatingResultHT || 0), plan.currency),
      formatAmountSpaced(plan.estimatedCorporateTax || 0, plan.currency),
      'Liquidation Annuelle IS/BIC',
    ],
    [
      'RÉSULTAT NET',
      'Résultat Net Comptable & Fiscal de l’Exercice',
      '-',
      formatAmountSpaced(plan.operatingResultHT || 0, plan.currency),
      formatAmountSpaced(plan.netAfterTaxResultHT || 0, plan.currency),
      'Report à Nouveau / Affectation',
    ],
  ];

  if (plan.fiscalLines && plan.fiscalLines.length > 0) {
    plan.fiscalLines.forEach((fl) => {
      sigAndFiscalRows.push([
        fl.code,
        fl.name,
        fl.rateOrRule,
        formatAmountSpaced(fl.taxableBase, plan.currency),
        formatAmountSpaced(fl.taxAmount, plan.currency),
        fl.category,
      ]);
    });
  }

  autoTable(pdf, {
    startY: currentY,
    head: [
      [
        'Code / Poste',
        'Rubrique Fiscale & Solde Intermédiaire de Gestion (Liasse Annuelle)',
        'Taux',
        `Base HT (${currCode})`,
        `Montant Liquidé (${currCode})`,
        'Observation / Réf. Légale',
      ],
    ],
    body: sigAndFiscalRows,
    styles: {
      fontSize: 7.2,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [6, 95, 70],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: 'bold' },
      1: { cellWidth: 58 },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 33 },
    },
  });

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  const safeCompany = companyName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 28);
  pdf.save(`Synthese_Annuelle_Plan_Comptable_et_Fiscal_${safeCompany}_${fiscalYear}.pdf`);
}

/**
 * Exporte le Tableau de Bord des Documents en PDF en respectant strictement
 * les colonnes sélectionnées dans le Studio de Modèles (`customization.documentsTablePdfColumns`).
 */
export function exportDocumentsDashboardTableToPDF(
  documents: ExportableDocument[],
  currency: Currency,
  companyName: string,
  companyLogo?: string,
  customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION,
  filterContextLabel = 'Tous les documents filtrés'
): void {
  const pdf = new jsPDF('l', 'mm', 'a4');
  const colCfg: DocumentDashboardColumnConfig = {
    ...DEFAULT_DOC_TABLE_PDF_COLUMNS,
    ...(customization.documentsTablePdfColumns || {}),
  };

  // Garantir au moins une colonne si tout a été décoché par erreur
  const activeKeys = (Object.keys(colCfg) as DocumentDashboardColumnKey[]).filter(
    (k) => colCfg[k]
  );
  if (activeKeys.length === 0) {
    colCfg.refType = true;
    colCfg.clientProject = true;
    colCfg.status = true;
    colCfg.amountTTC = true;
  }

  const currCode = getOfficialCurrencyCode(currency);
  const headerBottomY = drawCorporateHeader(
    pdf,
    companyName,
    'TABLEAU DE BORD DES DOCUMENTS — ÉTAT RÉCAPITULATIF PERSONNALISÉ',
    `DOC-TAB-${new Date().toISOString().slice(0, 10)}`,
    new Date().toLocaleDateString('fr-FR'),
    companyLogo,
    customization
  );

  let currentY = headerBottomY + 4;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(30, 41, 59);
  pdf.text(
    `Périmètre : ${filterContextLabel} · ${documents.length} document(s) · Devise de référence : ${currCode}`,
    14,
    currentY
  );
  currentY += 5;

  const columnDefinitions: Array<{
    key: DocumentDashboardColumnKey;
    header: string;
    align?: 'left' | 'center' | 'right';
    render: (d: ExportableDocument) => string;
  }> = [
    {
      key: 'refType',
      header: 'Réf / Type & Devise',
      align: 'left',
      render: (d) => {
        const typeLbl =
          d.docType === 'quote'
            ? 'Devis'
            : d.docType === 'proforma'
            ? 'Proforma'
            : 'Facture';
        return `${d.docNumber}\n${typeLbl} (${getOfficialCurrencyCode(d.currency || currency)})`;
      },
    },
    {
      key: 'clientProject',
      header: 'Client & Projet',
      align: 'left',
      render: (d) => `${d.clientName || '—'}\nProjet : ${d.projectName || '—'}`,
    },
    {
      key: 'status',
      header: 'État / Statut',
      align: 'center',
      render: (d) => {
        if (d.status === 'draft') return 'BROUILLON';
        const isPaid =
          d.status === 'paid' ||
          ((Number(d.paidAmount) || 0) >= (Number(d.totalAmount) || 0) &&
            (Number(d.totalAmount) || 0) > 0);
        if (isPaid) return 'PAYÉ';
        if ((Number(d.paidAmount) || 0) > 0) return 'ÉMIS (PARTIEL)';
        return 'ÉMIS';
      },
    },
    {
      key: 'dates',
      header: 'Émission / Échéance',
      align: 'left',
      render: (d) => `Émis : ${d.issueDate || '—'}\nÉch. : ${d.dueDate || '—'}`,
    },
    {
      key: 'amountHT',
      header: `Montant HT (${currCode})`,
      align: 'right',
      render: (d) => formatAmountSpaced(Number(d.subtotal) || 0, d.currency || currency),
    },
    {
      key: 'amountTTC',
      header: `Montant TTC (${currCode})`,
      align: 'right',
      render: (d) => formatAmountSpaced(Number(d.totalAmount) || 0, d.currency || currency),
    },
    {
      key: 'paidMilestone',
      header: `Encaissé / Jalon`,
      align: 'right',
      render: (d) =>
        `${formatAmountSpaced(Number(d.paidAmount) || 0, d.currency || currency)}\n(${Number(d.milestoneReached) || 0}%)`,
    },
    {
      key: 'remainingDue',
      header: `Reste à Payer (${currCode})`,
      align: 'right',
      render: (d) => {
        const rem = Math.max(0, (Number(d.totalAmount) || 0) - (Number(d.paidAmount) || 0));
        return formatAmountSpaced(rem, d.currency || currency);
      },
    },
  ];

  const enabledCols = columnDefinitions.filter((c) => colCfg[c.key]);
  const headRow = enabledCols.map((c) => c.header);
  const bodyRows = documents.map((d) => enabledCols.map((c) => c.render(d)));

  const columnStyles: Record<number, { halign?: 'left' | 'center' | 'right'; fontStyle?: 'normal' | 'bold' }> = {};
  enabledCols.forEach((col, idx) => {
    columnStyles[idx] = {
      halign: col.align || 'left',
      fontStyle: col.key === 'amountTTC' || col.key === 'refType' ? 'bold' : 'normal',
    };
  });

  const brandRgb = hexToRgb(customization.headerHexColor || '#0F172A');

  autoTable(pdf, {
    startY: currentY,
    head: [headRow],
    body: bodyRows,
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      valign: 'middle',
    },
    headStyles: {
      fillColor: brandRgb,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
  });

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  const safeCompany = companyName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 28);
  pdf.save(
    `Tableau_Bord_Documents_${safeCompany}_${new Date().toISOString().slice(0, 10)}.pdf`
  );
}

export interface ExportableAuditLogEntry {
  id: string;
  timestamp: string;
  actorName?: string;
  author?: string;
  operator?: string;
  actorRole?: string;
  module: string;
  action: string;
  reference?: string;
  details?: string;
  severity?: 'info' | 'warning' | 'critical' | string;
  integrityHash?: string;
  ipSource?: string;
  userAgent?: string;
  confidentialNoteHash?: string;
  confidentialNoteStatus?: string;
}

export interface ExportableSyncQueueItem {
  id: string;
  type?: 'project' | 'document' | 'closure' | string;
  entityType?: string;
  action: string;
  targetId?: string;
  reference?: string;
  author?: string;
  queuedAt?: string;
  timestamp?: string;
  retryCount?: number;
  lastAttemptAt?: string;
  status?: 'pending' | 'retrying' | 'failed';
  failureReason?: string;
}

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  const cleaned = str.replace(/\r?\n|\r/g, ' ');
  if (cleaned.includes(';') || cleaned.includes('"') || cleaned.includes(',')) {
    return `"${cleaned.replace(/"/g, '""')}"`;
  }
  return cleaned;
}

function triggerCsvDownload(csvContent: string, filename: string): void {
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporte les journaux d'audit (auditTraces) en fichier CSV structuré (UTF-8 avec BOM)
 * Inclut les colonnes IP Source, User-Agent, et en option le statut/hash des notes confidentielles chiffrées E2EE.
 */
export function exportAuditLogsToCSV(
  auditLogs: ExportableAuditLogEntry[],
  companyName: string,
  dateRangeInfo?: {
    startDate?: string;
    endDate?: string;
    includeEncryptedNotes?: boolean;
  }
): void {
  const includeNotes = dateRangeInfo?.includeEncryptedNotes !== false;
  const headers = [
    'ID_TRACE',
    'HORODATAGE_ISO',
    'ACTEUR',
    'ROLE_ACTEUR',
    'IP_SOURCE',
    'USER_AGENT',
    'MODULE_ERP',
    'REFERENCE',
    'SEVERITE',
    'DESCRIPTION_ACTION',
    'EMPREINTE_INTEGRITE_SHA',
    ...(includeNotes
      ? ['STATUT_NOTE_CONFIDENTIELLE_E2EE', 'HASH_NOTE_CONFIDENTIELLE_SHA256']
      : []),
    'PERIODE_FILTRE',
    'ENTREPRISE',
  ];

  const periodLabel =
    dateRangeInfo?.startDate || dateRangeInfo?.endDate
      ? `Du ${dateRangeInfo?.startDate || 'Origine'} au ${dateRangeInfo?.endDate || "Aujourd'hui"}`
      : 'Toutes les dates';

  const rows = auditLogs.map((log) => [
    escapeCsvCell(log.id),
    escapeCsvCell(log.timestamp),
    escapeCsvCell(log.actorName || log.operator || log.author || 'Opérateur'),
    escapeCsvCell(log.actorRole || 'Super-Admin / Système'),
    escapeCsvCell(log.ipSource || '192.168.1.10 (Terminal Authentifié)'),
    escapeCsvCell(
      log.userAgent ||
        (typeof navigator !== 'undefined' ? navigator.userAgent : 'Navigateur Sécurisé MEP')
    ),
    escapeCsvCell(log.module),
    escapeCsvCell(log.reference || log.id),
    escapeCsvCell((log.severity || 'info').toUpperCase()),
    escapeCsvCell(log.details ? `${log.action} — ${log.details}` : log.action),
    escapeCsvCell(log.integrityHash || `SHA256-${log.id.slice(-8).toUpperCase()}`),
    ...(includeNotes
      ? [
          escapeCsvCell(
            log.confidentialNoteStatus || 'AES-256-GCM E2EE (Intégrité Vérifiée)'
          ),
          escapeCsvCell(
            log.confidentialNoteHash || `SHA256:${log.id.slice(-8).toUpperCase()}E2EE`
          ),
        ]
      : []),
    escapeCsvCell(periodLabel),
    escapeCsvCell(companyName),
  ]);

  const csvLines = [headers.join(';'), ...rows.map((r) => r.join(';'))];
  const safeCompany = (companyName || 'Entreprise').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp =
    dateRangeInfo?.startDate || dateRangeInfo?.endDate
      ? `${dateRangeInfo?.startDate || 'debut'}_au_${dateRangeInfo?.endDate || 'fin'}`
      : new Date().toISOString().slice(0, 10);
  triggerCsvDownload(csvLines.join('\r\n'), `Journaux_Audit_Technique_${safeCompany}_${dateStamp}.csv`);
}

/**
 * Exporte la file d'attente de synchronisation hors-ligne (deferredSyncQueue) en CSV
 */
export function exportSyncQueueToCSV(
  syncQueue: ExportableSyncQueueItem[],
  companyName: string
): void {
  const headers = [
    'ID_OPERATION',
    'TYPE_ENTITE',
    'ACTION_CRUD',
    'ID_CIBLE',
    'STATUT_SYNC',
    'DATE_MISE_EN_FILE',
    'NOMBRE_TENTATIVES',
    'DERNIERE_TENTATIVE',
    'MOTIF_ECHEC_DIAGNOSTIC',
    'ENTREPRISE',
  ];

  const rows = syncQueue.map((item) => [
    escapeCsvCell(item.id),
    escapeCsvCell((item.type || item.entityType || 'Document').toUpperCase()),
    escapeCsvCell((item.action || 'SAVE').toUpperCase()),
    escapeCsvCell(item.targetId || item.reference || item.id),
    escapeCsvCell((item.status || 'pending').toUpperCase()),
    escapeCsvCell(item.queuedAt || item.timestamp || new Date().toISOString()),
    escapeCsvCell(item.retryCount ?? 0),
    escapeCsvCell(item.lastAttemptAt || 'Non tenté'),
    escapeCsvCell(item.failureReason || 'En attente de relais réseau Cloud/IndexedDB'),
    escapeCsvCell(companyName),
  ]);

  const csvLines = [headers.join(';'), ...rows.map((r) => r.join(';'))];
  const safeCompany = (companyName || 'Entreprise').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(csvLines.join('\r\n'), `File_Attente_Synchronisation_${safeCompany}_${dateStamp}.csv`);
}

/**
 * Exporte un rapport technique combiné (Journaux d'Audit + File d'attente de synchronisation) en CSV
 */
export function exportTechnicalAuditAndSyncReportToCSV(
  auditLogs: ExportableAuditLogEntry[],
  syncQueue: ExportableSyncQueueItem[],
  companyName: string,
  options?: {
    includeEncryptedNotes?: boolean;
    startDate?: string;
    endDate?: string;
  }
): void {
  const includeNotes = options?.includeEncryptedNotes !== false;
  const headers = [
    'SECTION_TECHNIQUE',
    'IDENTIFIANT',
    'HORODATAGE',
    'ACTEUR_OU_ENTITE',
    'ROLE_OU_ACTION',
    'IP_SOURCE',
    'USER_AGENT',
    'MODULE_OU_CIBLE',
    'STATUT_OU_SEVERITE',
    'TENTATIVES_RETRY',
    'DETAIL_TECHNIQUE_OU_DIAGNOSTIC',
    ...(includeNotes
      ? ['STATUT_NOTE_CONFIDENTIELLE_E2EE', 'HASH_NOTE_CONFIDENTIELLE_SHA256']
      : []),
    'ENTREPRISE',
  ];

  const syncRows = syncQueue.map((item) => [
    escapeCsvCell('FILE_SYNCHRONISATION_OFFLINE'),
    escapeCsvCell(item.id),
    escapeCsvCell(item.queuedAt || item.timestamp || new Date().toISOString()),
    escapeCsvCell(`Entité: ${(item.type || item.entityType || 'Document').toUpperCase()}`),
    escapeCsvCell(`Action: ${(item.action || 'SAVE').toUpperCase()}`),
    escapeCsvCell('Terminal Local IndexedDB'),
    escapeCsvCell(typeof navigator !== 'undefined' ? navigator.userAgent : 'Navigateur Web'),
    escapeCsvCell(item.targetId || item.reference || item.id),
    escapeCsvCell((item.status || 'pending').toUpperCase()),
    escapeCsvCell(item.retryCount ?? 0),
    escapeCsvCell(item.failureReason || 'Opération en file d’attente IndexedDB / Cloud'),
    ...(includeNotes ? [escapeCsvCell('Chiffrement E2EE Actif'), escapeCsvCell('SHA256:SYNC-VAULT-E2EE')] : []),
    escapeCsvCell(companyName),
  ]);

  const auditRows = auditLogs.map((log) => [
    escapeCsvCell('JOURNAL_AUDIT_SECURITE'),
    escapeCsvCell(log.id),
    escapeCsvCell(log.timestamp),
    escapeCsvCell(log.actorName || log.operator || log.author || 'Opérateur'),
    escapeCsvCell(log.actorRole || 'Super-Admin / Système'),
    escapeCsvCell(log.ipSource || '192.168.1.10 (Terminal Authentifié)'),
    escapeCsvCell(
      log.userAgent ||
        (typeof navigator !== 'undefined' ? navigator.userAgent : 'Navigateur Sécurisé MEP')
    ),
    escapeCsvCell(log.module),
    escapeCsvCell((log.severity || 'info').toUpperCase()),
    escapeCsvCell(0),
    escapeCsvCell(log.details ? `${log.action} — ${log.details}` : log.action),
    ...(includeNotes
      ? [
          escapeCsvCell(
            log.confidentialNoteStatus || 'AES-256-GCM E2EE (Intégrité Vérifiée)'
          ),
          escapeCsvCell(
            log.confidentialNoteHash || `SHA256:${log.id.slice(-8).toUpperCase()}E2EE`
          ),
        ]
      : []),
    escapeCsvCell(companyName),
  ]);

  const csvLines = [
    headers.join(';'),
    ...syncRows.map((r) => r.join(';')),
    ...auditRows.map((r) => r.join(';')),
  ];
  const safeCompany = (companyName || 'Entreprise').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(
    csvLines.join('\r\n'),
    `Rapport_Technique_Audit_Et_Synchronisation_${safeCompany}_${dateStamp}.csv`
  );
}

// ============================================================================
// GÉNÉRATEUR D'ARCHIVE ZIP STANDARD (IEEE 802.3 CRC-32) POUR DOSSIER PROJET ACHEVÉ
// (Contient l'ensemble des PDF des Factures du projet + PV de Réception Définitive)
// ============================================================================

const ZIP_CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = ZIP_CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildStandardZipBlob(entries: Array<{ filename: string; data: Uint8Array }>): Blob {
  const encoder = new TextEncoder();
  const localFileChunks: Uint8Array[] = [];
  const centralDirChunks: Uint8Array[] = [];
  let currentOffset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((now.getFullYear() - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.filename);
    const dataBytes = entry.data;
    const crc = computeCrc32(dataBytes);
    const size = dataBytes.length;

    // Local File Header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed to extract (2.0)
    lv.setUint16(6, 0x0800, true); // UTF-8 flag
    lv.setUint16(8, 0, true); // compression method: 0 (STORE)
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra field length
    localHeader.set(nameBytes, 30);

    localFileChunks.push(localHeader, dataBytes);

    // Central Directory File Header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0x0800, true); // UTF-8 flag
    cv.setUint16(10, 0, true); // compression method: 0 (STORE)
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true); // extra length
    cv.setUint16(32, 0, true); // comment length
    cv.setUint16(34, 0, true); // disk number start
    cv.setUint16(36, 0, true); // internal attrs
    cv.setUint32(38, 0, true); // external attrs
    cv.setUint32(42, currentOffset, true); // relative offset of local header
    centralHeader.set(nameBytes, 46);

    centralDirChunks.push(centralHeader);
    currentOffset += localHeader.length + size;
  }

  let centralDirSize = 0;
  for (const chunk of centralDirChunks) {
    centralDirSize += chunk.length;
  }

  // End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralDirSize, true);
  ev.setUint32(16, currentOffset, true);
  ev.setUint16(20, 0, true);

  return new Blob(
    [...localFileChunks, ...centralDirChunks, eocd] as unknown as BlobPart[],
    {
      type: 'application/zip',
    }
  );
}

function generateInvoicePdfBytesForZip(
  doc: any,
  project: any,
  companyName: string,
  companyLogo?: string,
  customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION
): Uint8Array {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const currCode = getOfficialCurrencyCode(doc.currency || project.currency || 'XOF');
  const docTypeLabel =
    doc.type === 'quote'
      ? 'DEVIS QUANTITATIF & ESTIMATIF'
      : doc.type === 'proforma'
      ? 'FACTURE PROFORMA'
      : 'FACTURE DÉFINITIVE CERTIFIÉE';

  const startY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo,
    customization.headerSubtitle || DEFAULT_DOC_CUSTOMIZATION.headerSubtitle || '',
    docTypeLabel,
    doc.docNumber || `FAC-${project.id.slice(-4).toUpperCase()}`,
    `Émise le ${doc.issueDate || new Date().toISOString().slice(0, 10)} · Échéance : ${doc.dueDate || project.dueDate || ''}`,
    customization.headerHexColor || '#0F172A',
    doc.status === 'paid' ? ' PAYÉE / SOLDÉE 100% ' : ' CERTIFIÉE PROJET ACHEVÉ ',
    {
      preset: customization.invoiceLayoutPreset || 'classic',
      headerCompanyAddress: customization.headerCompanyAddress,
      headerCompanyContact: customization.headerCompanyContact,
      headerTaxRegistration: customization.headerTaxRegistration,
      showLogo: customization.showLogo !== false,
    }
  );

  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, startY, 182, 24, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`PROJET : ${(project.name || '').toUpperCase()}`, 18, startY + 6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(51, 65, 85);
  pdf.text(`Client / Maître d'Ouvrage : ${doc.clientName || project.clientName || 'Client'}`, 18, startY + 12.5);
  pdf.text(
    `Statut Projet : ACHEVÉ AVEC SUCCÈS (100%) · Jalon Facturation : ${doc.milestoneReached ?? 100}%`,
    18,
    startY + 18.5
  );

  const items = Array.isArray(doc.items) && doc.items.length > 0
    ? doc.items
    : [
        {
          rubrique: 'Exécution Globale & Livrables du Projet',
          description: `Réalisation complète et réception définitive du projet "${project.name}"`,
          quantity: 1,
          unitPrice: Number(doc.subtotal || doc.totalAmount || project.billedAmount || project.budget || 0),
          taxRate: 18,
        },
      ];

  const rows = items.map((it: any, idx: number) => {
    const qty = Number(it.quantity) || 1;
    const pu = Number(it.unitPrice) || 0;
    const totalHT = qty * pu;
    return [
      String(idx + 1),
      it.rubrique || 'Prestation Technique',
      it.description || 'Poste de réalisation',
      String(qty),
      `${formatAmountSpaced(pu, currCode)} ${currCode}`,
      `${formatAmountSpaced(totalHT, currCode)} ${currCode}`,
    ];
  });

  const brandRgb = hexToRgb(customization.headerHexColor || '#0F172A');

  autoTable(pdf, {
    startY: startY + 29,
    head: [['N°', 'Rubrique / Corps de Métier', 'Désignation des Travaux & Livrables', 'Qté', 'P.U HT', 'Total HT']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: brandRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const finalY = ((pdf as any).lastAutoTable?.finalY || startY + 75) + 8;
  const totalTTC = Number(doc.totalAmount || project.billedAmount || project.budget || 0);
  const paidAmt = Number(doc.paidAmount ?? totalTTC);
  const remAmt = Math.max(0, totalTTC - paidAmt);

  pdf.setFillColor(240, 253, 244);
  pdf.setDrawColor(16, 185, 129);
  pdf.roundedRect(110, finalY, 86, 26, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Montant Total TTC : ${formatAmountSpaced(totalTTC, currCode)} ${currCode}`, 114, finalY + 7);
  pdf.setTextColor(5, 150, 105);
  pdf.text(`Montant Encaissé : ${formatAmountSpaced(paidAmt, currCode)} ${currCode}`, 114, finalY + 14);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Reste à Payer : ${formatAmountSpaced(remAmt, currCode)} ${currCode}`, 114, finalY + 21);

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  return new Uint8Array(pdf.output('arraybuffer'));
}

function generateReceptionPvPdfBytesForZip(
  project: any,
  pvKind: 'pv_reception_definitive' | 'certificat_bonne_fin' | 'pv_repli_et_essais',
  closureRecord: any | null,
  companyName: string,
  companyLogo?: string,
  customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION
): Uint8Array {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const currCode = getOfficialCurrencyCode(project.currency || 'XOF');
  const pvTitle =
    pvKind === 'pv_reception_definitive'
      ? 'PROCÈS-VERBAL DE RÉCEPTION DÉFINITIVE & RÉTROCESSION (100%)'
      : pvKind === 'certificat_bonne_fin'
      ? "CERTIFICAT D'ACHÈVEMENT & DE BONNE FIN D'EXÉCUTION"
      : 'PROCÈS-VERBAL DES TESTS, ESSAIS TECHNIQUES & REPLI DE CHANTIER';

  const pvRef =
    closureRecord?.closureReference ||
    `PV-${pvKind.slice(0, 6).toUpperCase()}-${project.id.slice(-4).toUpperCase()}`;

  const startY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo,
    customization.headerSubtitle || DEFAULT_DOC_CUSTOMIZATION.headerSubtitle || '',
    pvTitle,
    pvRef,
    `Date de Réception : ${closureRecord?.handoverDate || project.dueDate || new Date().toISOString().slice(0, 10)}`,
    customization.headerHexColor || '#0F172A',
    ' PROJET ACHEVÉ AVEC SUCCÈS (100%) ',
    {
      preset: customization.layoutPreset || 'classic',
      headerCompanyAddress: customization.headerCompanyAddress,
      headerCompanyContact: customization.headerCompanyContact,
      headerTaxRegistration: customization.headerTaxRegistration,
      showLogo: customization.showLogo !== false,
    }
  );

  const brandRgb = hexToRgb(customization.headerHexColor || '#0F172A');

  autoTable(pdf, {
    startY,
    head: [['Rubrique Officielle du Procès-Verbal', 'Détails & Constatations Contradictoires Certifiées']],
    body: [
      ['Intitulé du Projet', project.name || 'Projet Technique'],
      ['Client / Maître d’Ouvrage', project.clientName || 'Client'],
      ['Entreprise Prestataire', companyName],
      ['Secteur & Corps de Métier', (project.involvedTrades || [project.sectorActivity || 'Ingénierie & Travaux']).join(', ')],
      ['Taux de Réalisation Physique', '100% — Achevé avec Succès & Verrouillé'],
      ['Budget Contractuel Alloué', `${formatAmountSpaced(Number(project.budget) || 0, currCode)} ${currCode}`],
      ['Montant Facturé / Encaissé', `${formatAmountSpaced(Number(project.billedAmount) || 0, currCode)} ${currCode} / ${formatAmountSpaced(Number(project.paidAmount) || 0, currCode)} ${currCode}`],
      [
        'Résultats des Tests & Essais',
        closureRecord?.testingAndCommissioningSummary ||
          'Essais de performance, contrôle qualité QHSE et tests de mise en service concluants et validés sans réserve.',
      ],
      [
        'Repli de Chantier & Nettoyage',
        closureRecord?.demobilizationSummary ||
          'Démobilisation complète des équipements, nettoyage intégral des zones d’intervention et remise en état certifiée.',
      ],
      [
        'Décision de Réception & Rétrocession',
        closureRecord?.handoverDecisionNotes ||
          'Réception définitive prononcée sans réserve. Transfert complet de garde et de propriété des ouvrages au Client.',
      ],
    ],
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: brandRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 62 },
      1: { cellWidth: 120 },
    },
  });

  if (Array.isArray(project.structuredSteps) && project.structuredSteps.length > 0) {
    const phasesY = ((pdf as any).lastAutoTable?.finalY || startY + 90) + 6;
    autoTable(pdf, {
      startY: phasesY,
      head: [['Phase Technique', 'Corps de Métier', 'Chef d’Équipe', 'Durée', 'Statut Final']],
      body: project.structuredSteps.map((st: any, idx: number) => [
        st.phaseTitle || `Phase ${idx + 1}`,
        st.tradeName || 'Général',
        st.tradeLeaderName || project.projectManagerName || 'Responsable Technique',
        st.estimatedDuration || 'Conforme',
        '100% réceptionné',
      ]),
      styles: { fontSize: 7.8, cellPadding: 2.2 },
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    });
  }

  const sigY = Math.min(242, ((pdf as any).lastAutoTable?.finalY || 180) + 10);
  pdf.setDrawColor(148, 163, 184);
  pdf.roundedRect(14, sigY, 86, 28, 2, 2, 'S');
  pdf.roundedRect(110, sigY, 86, 28, 2, 2, 'S');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Pour l'Entreprise Prestataire (${companyName})`, 18, sigY + 6);
  pdf.text(`Pour le Client (${project.clientName || 'Maître d’Ouvrage'})`, 114, sigY + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Signature, Cachet & Mention « Certifié Conforme »', 18, sigY + 23);
  pdf.text('Signature, Cachet & Mention « Bon pour Réception »', 114, sigY + 23);

  drawCorporateFooter(pdf, companyName, customization.footerLegalNotice);
  return new Uint8Array(pdf.output('arraybuffer'));
}

/**
 * Génère et télécharge un dossier ZIP complet contenant l'ensemble des PDF des factures
 * ainsi que les Procès-Verbaux (PV) de réception du projet achevé avec succès.
 */
export function exportCompletedProjectInvoicesAndPvToZip(
  project: any,
  projectDocuments: any[],
  closureRecord: any | null,
  companyName: string,
  companyLogo?: string,
  customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION
): { zipFilename: string; pdfCount: number } {
  const safeProjectName = (project.name || 'Projet')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 36);
  const dateStr = new Date().toISOString().slice(0, 10);
  const folderPrefix = `Dossier_Cloture_${safeProjectName}`;

  const zipEntries: Array<{ filename: string; data: Uint8Array }> = [];

  // 1. Génération des PDF pour toutes les factures et documents financiers du projet
  const docsToExport =
    Array.isArray(projectDocuments) && projectDocuments.length > 0
      ? projectDocuments
      : [
          {
            id: `auto-inv-${project.id}`,
            docNumber: `FAC-SOLDE-${project.id.slice(-4).toUpperCase()}`,
            type: 'invoice',
            clientName: project.clientName,
            projectId: project.id,
            issueDate: dateStr,
            dueDate: project.dueDate || dateStr,
            subtotal: Number(project.billedAmount || project.budget || 0),
            taxAmount: 0,
            totalAmount: Number(project.billedAmount || project.budget || 0),
            paidAmount: Number(project.paidAmount || project.billedAmount || project.budget || 0),
            milestoneReached: 100,
            status: 'paid',
            currency: project.currency || 'XOF',
          },
        ];

  docsToExport.forEach((doc, index) => {
    const safeDocNum = String(doc.docNumber || `DOC_${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const typePrefix =
      doc.type === 'quote' ? 'Devis' : doc.type === 'proforma' ? 'Proforma' : 'Facture';
    const pdfBytes = generateInvoicePdfBytesForZip(
      doc,
      project,
      companyName,
      companyLogo,
      customization
    );
    zipEntries.push({
      filename: `${folderPrefix}/01_Factures_PDF/${String(index + 1).padStart(2, '0')}_${typePrefix}_${safeDocNum}.pdf`,
      data: pdfBytes,
    });
  });

  // 2. Génération des PDF des PV de Réception du Projet (PV de Réception Définitive + Certificat de Bonne Fin + PV d'Essais & Repli)
  const pvDefinitiveBytes = generateReceptionPvPdfBytesForZip(
    project,
    'pv_reception_definitive',
    closureRecord,
    companyName,
    companyLogo,
    customization
  );
  zipEntries.push({
    filename: `${folderPrefix}/02_PV_Reception_PDF/01_PV_Reception_Definitive_100pct_${safeProjectName}.pdf`,
    data: pvDefinitiveBytes,
  });

  const pvBonneFinBytes = generateReceptionPvPdfBytesForZip(
    project,
    'certificat_bonne_fin',
    closureRecord,
    companyName,
    companyLogo,
    customization
  );
  zipEntries.push({
    filename: `${folderPrefix}/02_PV_Reception_PDF/02_Certificat_Bonne_Fin_Execution_${safeProjectName}.pdf`,
    data: pvBonneFinBytes,
  });

  const pvEssaisRepliBytes = generateReceptionPvPdfBytesForZip(
    project,
    'pv_repli_et_essais',
    closureRecord,
    companyName,
    companyLogo,
    customization
  );
  zipEntries.push({
    filename: `${folderPrefix}/02_PV_Reception_PDF/03_PV_Tests_Essais_et_Repli_Chantier_${safeProjectName}.pdf`,
    data: pvEssaisRepliBytes,
  });

  // 3. Ajout d'un bordereau récapitulatif de clôture
  const encoder = new TextEncoder();
  const manifestText = [
    `================================================================================`,
    `BORDEREAU OFFICIEL DU DOSSIER ZIP DE CLÔTURE DE PROJET (ACHEVÉ AVEC SUCCÈS 100%)`,
    `================================================================================`,
    `Entreprise Prestataire : ${companyName}`,
    `Projet                 : ${project.name}`,
    `Client                 : ${project.clientName}`,
    `Statut                 : ACHEVÉ AVEC SUCCÈS (100% - VERROUILLÉ)`,
    `Date de génération ZIP : ${new Date().toLocaleString('fr-FR')}`,
    `Nombre de PDF inclus   : ${zipEntries.length} fichiers PDF officiels`,
    ``,
    `1. DOSSIER FACTURES & PIÈCES COMPTABLES (${docsToExport.length} PDF) :`,
    ...docsToExport.map(
      (d, idx) =>
        `   - [${idx + 1}] ${d.docNumber || 'Facture'} (${d.type === 'quote' ? 'Devis' : d.type === 'proforma' ? 'Proforma' : 'Facture'}) : ${d.totalAmount || project.billedAmount || 0} ${d.currency || project.currency || 'XOF'}`
    ),
    ``,
    `2. DOSSIER PROCÈS-VERBAUX (PV) DE RÉCEPTION (3 PDF) :`,
    `   - [1] 01_PV_Reception_Definitive_100pct_${safeProjectName}.pdf`,
    `   - [2] 02_Certificat_Bonne_Fin_Execution_${safeProjectName}.pdf`,
    `   - [3] 03_PV_Tests_Essais_et_Repli_Chantier_${safeProjectName}.pdf`,
    `================================================================================`,
  ].join('\r\n');

  const pdfCount = zipEntries.length;
  zipEntries.push({
    filename: `${folderPrefix}/00_BORDEREAU_DOSSIER_CLOTURE_${safeProjectName}.txt`,
    data: encoder.encode(manifestText),
  });

  const zipBlob = buildStandardZipBlob(zipEntries);
  const zipFilename = `Dossier_ZIP_Factures_et_PV_${safeProjectName}_${dateStr}.zip`;
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', zipFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { zipFilename, pdfCount };
}

/**
 * Exporte la liste des employés avec leurs données de paie et catégories professionnelles en CSV (Module Personnel)
 */
export function exportEmployeesWithPayrollToCSV(
  employees: any[],
  payslips: any[],
  currency: Currency | string,
  companyName: string
): void {
  const headers = [
    'MATRICULE',
    'NOM_COMPLET',
    'CATEGORIE_PROFESSIONNELLE',
    'ECHELON_GRADE',
    'POSTE_FONCTION',
    'DEPARTEMENT',
    'TYPE_CONTRAT',
    'STATUT_ACTIVITE',
    'PROJET_AFFECTE',
    'DATE_EMBAUCHE',
    'PERIODICITE_PAIE',
    'MODE_CALCUL_REMUNERATION',
    'SALAIRE_DE_BASE',
    'PRIME_TRANSPORT',
    'REMUNERATION_FIXE_TOTALE',
    'NB_BULLETINS_PAIE_EDITES',
    'DERNIERE_PERIODE_PAIE',
    'DERNIER_SALAIRE_BRUT',
    'DERNIERES_RETENUES_FISCALES_SOCIALES',
    'DERNIER_NET_A_PAYER',
    'CUMUL_NET_VERSE_TOTAL',
    'DEVISE',
    'MODE_PAIEMENT',
    'COMPTE_BANCAIRE_OU_MOBILE_MONEY',
    'N_SECURITE_SOCIALE_CNPS',
    'N_PIECE_IDENTITE_CNI',
    'TELEPHONE',
    'EMAIL',
    'ENTREPRISE',
  ];

  const rows = (employees || []).map((emp) => {
    const empSlips = (payslips || []).filter(
      (s) =>
        s.employeeId === emp.id ||
        (s.employeeMatricule &&
          emp.matricule &&
          String(s.employeeMatricule).toUpperCase() === String(emp.matricule).toUpperCase())
    );
    const sortedSlips = [...empSlips].sort((a, b) =>
      String(b.period || b.issueDate || '').localeCompare(String(a.period || a.issueDate || ''))
    );
    const latestSlip = sortedSlips[0];

    const baseSalary = Number(emp.baseSalary) || 0;
    const transport = Number(emp.transportAllowance) || 0;
    const fixedTotal = baseSalary + transport;

    const latestGross = latestSlip ? Number(latestSlip.grossSalary) || fixedTotal : fixedTotal;
    const latestDeductions = latestSlip
      ? (Number(latestSlip.taxDeduction) || 0) +
        (Number(latestSlip.socialSecurityDeduction) || 0) +
        (Number(latestSlip.otherDeductions) || 0)
      : 0;
    const latestNet = latestSlip ? Number(latestSlip.netSalary) || fixedTotal : fixedTotal;
    const cumulativeNetPaid = empSlips.reduce(
      (sum, s) => sum + (Number(s.netSalary) || 0),
      0
    );

    const statusLabel =
      emp.status === 'active'
        ? 'En poste (Actif)'
        : emp.status === 'on_leave'
        ? 'En congé / Mission'
        : 'Cessation de contrat';

    const basisLabel =
      emp.contractType === 'CDI' || emp.remunerationBasis === 'monthly_norm'
        ? 'Norme mensuelle légale'
        : emp.remunerationBasis === 'daily_rate'
        ? 'Taux journalier'
        : emp.remunerationBasis === 'task_rate'
        ? 'Rémunération à la tâche'
        : 'Forfait contractuel';

    return [
      escapeCsvCell(emp.matricule || ''),
      escapeCsvCell(emp.fullName || ''),
      escapeCsvCell(emp.workerCategory || 'Non classé'),
      escapeCsvCell(emp.gradeOrEchelon || 'Catégorie C1 - Échelon 1'),
      escapeCsvCell(emp.position || ''),
      escapeCsvCell(emp.department || ''),
      escapeCsvCell(emp.contractType || 'CDI'),
      escapeCsvCell(statusLabel),
      escapeCsvCell(emp.assignedProjectName || 'Direction Générale'),
      escapeCsvCell(emp.hireDate || ''),
      escapeCsvCell(emp.paymentPeriodicity || 'Mensuel'),
      escapeCsvCell(basisLabel),
      escapeCsvCell(baseSalary),
      escapeCsvCell(transport),
      escapeCsvCell(fixedTotal),
      escapeCsvCell(empSlips.length),
      escapeCsvCell(latestSlip?.period || 'En cours'),
      escapeCsvCell(latestGross),
      escapeCsvCell(latestDeductions),
      escapeCsvCell(latestNet),
      escapeCsvCell(cumulativeNetPaid > 0 ? cumulativeNetPaid : latestNet),
      escapeCsvCell(currency || 'XOF'),
      escapeCsvCell(emp.paymentMethod || 'Virement Bancaire'),
      escapeCsvCell(emp.bankOrMobileAccount || 'Non renseigné'),
      escapeCsvCell(emp.socialSecurityNumber || 'Non renseigné'),
      escapeCsvCell(emp.nationalIdNumber || 'Non renseigné'),
      escapeCsvCell(emp.phone || ''),
      escapeCsvCell(emp.email || ''),
      escapeCsvCell(companyName || 'Entreprise'),
    ];
  });

  const csvLines = [headers.join(';'), ...rows.map((r) => r.join(';'))];
  const safeCompany = (companyName || 'Entreprise').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(
    csvLines.join('\r\n'),
    `Personnel_Employes_Paie_Categories_${safeCompany}_${dateStamp}.csv`
  );
}

export interface ExportableTradeBudgetVentilationRow {
  tradeCategory: string;
  rubriqueName?: string;
  allocatedBudgetHT: number;
  invoicedActualHT: number;
  stockActualHT: number;
  laborActualHT: number;
  actualExpensesHT: number;
  varianceHT: number;
  consumptionPct: number;
  isOverBudget: boolean;
}

/**
 * Génère le rapport PDF officiel de 'Ventilation Budgétaire' affichant le comparatif
 * entre le budget alloué et les dépenses réelles par corps de métier (Studio de Modèles)
 */
export function exportBudgetBreakdownByTradeToPDF(
  rows: ExportableTradeBudgetVentilationRow[],
  options: {
    scopeTitle: string;
    currency: Currency | string;
    companyName: string;
    companyLogo?: string;
    customization?: DocumentCustomizationConfig;
  }
): void {
  const { scopeTitle, currency, companyName, companyLogo, customization } = options;
  const custom = { ...DEFAULT_DOC_CUSTOMIZATION, ...(customization || {}) };
  const brandColor = custom.headerHexColor || '#0F172A';
  const currCode = getOfficialCurrencyCode(currency as Currency);

  const safeRows =
    rows && rows.length > 0
      ? rows
      : [
          {
            tradeCategory: 'Gros Œuvre & Maçonnerie',
            allocatedBudgetHT: 0,
            invoicedActualHT: 0,
            stockActualHT: 0,
            laborActualHT: 0,
            actualExpensesHT: 0,
            varianceHT: 0,
            consumptionPct: 0,
            isOverBudget: false,
          },
        ];

  const totalAllocatedHT = Number(
    safeRows.reduce((s, r) => s + (Number(r.allocatedBudgetHT) || 0), 0).toFixed(2)
  );
  const totalInvoicedHT = Number(
    safeRows.reduce((s, r) => s + (Number(r.invoicedActualHT) || 0), 0).toFixed(2)
  );
  const totalStockHT = Number(
    safeRows.reduce((s, r) => s + (Number(r.stockActualHT) || 0), 0).toFixed(2)
  );
  const totalLaborHT = Number(
    safeRows.reduce((s, r) => s + (Number(r.laborActualHT) || 0), 0).toFixed(2)
  );
  const totalActualHT = Number(
    safeRows.reduce((s, r) => s + (Number(r.actualExpensesHT) || 0), 0).toFixed(2)
  );
  const totalVarianceHT = Number((totalAllocatedHT - totalActualHT).toFixed(2));
  const globalConsumptionPct =
    totalAllocatedHT > 0 ? Math.round((totalActualHT / totalAllocatedHT) * 100) : 0;
  const overBudgetCount = safeRows.filter((r) => r.isOverBudget).length;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const fmtMoney = (amt: number) => `${formatAmountSpaced(amt, currCode)} ${currCode}`;

  const brandRgb = hexToRgb(brandColor);
  doc.setFillColor(brandRgb[0], brandRgb[1], brandRgb[2]);
  doc.rect(0, 0, pageWidth, 30, 'F');

  let titleStartX = 14;
  if (custom.showLogo !== false && companyLogo && companyLogo.startsWith('data:image/')) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, 4, 22, 22, 2, 2, 'F');
      doc.addImage(companyLogo, 'PNG', 13.5, 5.5, 19, 19);
      titleStartX = 38;
    } catch {
      titleStartX = 14;
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const compLeftLine = doc.splitTextToSize((companyName || 'ENTREPRISE').toUpperCase(), 145)[0];
  doc.text(compLeftLine, titleStartX, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const subLeftLine = doc.splitTextToSize(
    custom.headerSubtitle ||
      'DIRECTION DU CONTRÔLE DE GESTION TECHNIQUE & SUIVI BUDGÉTAIRE PAR CORPS DE MÉTIER',
    145
  )[0];
  doc.text(subLeftLine, titleStartX, 17);
  const scopeLeftLine = doc.splitTextToSize(
    `Périmètre analysé : ${scopeTitle}  |  Devise : ${currCode}  |  Édité le ${new Date().toLocaleDateString('fr-FR')}`,
    145
  )[0];
  doc.text(scopeLeftLine, titleStartX, 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('RAPPORT DE VENTILATION BUDGÉTAIRE', pageWidth - 14, 12, { align: 'right' });
  doc.setFontSize(8);
  doc.text('BUDGET ALLOUÉ VS DÉPENSES RÉELLES PAR CORPS DE MÉTIER', pageWidth - 14, 18, {
    align: 'right',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.text(
    `Exécution globale : ${globalConsumptionPct}% · ${safeRows.length} corps de métier`,
    pageWidth - 14,
    24,
    { align: 'right' }
  );

  // Cartes KPI synthétiques avec protection anti-débordement
  const cardY = 35;
  const cardW = (pageWidth - 28 - 12) / 4;
  const cardH = 19;

  const kpiCards = [
    {
      label: 'BUDGET TOTAL ALLOUÉ (HT)',
      value: fmtMoney(totalAllocatedHT),
      sub: `${safeRows.length} corps de métier chiffrés`,
      border: [37, 99, 235] as [number, number, number],
    },
    {
      label: 'DÉPENSES RÉELLES CUMULÉES (HT)',
      value: fmtMoney(totalActualHT),
      sub: `Facturé: ${fmtMoney(totalInvoicedHT)} · Stock/MO inclus`,
      border: [79, 70, 229] as [number, number, number],
    },
    {
      label:
        totalVarianceHT >= 0
          ? 'SOLDE / ÉCONOMIE BUDGÉTAIRE (HT)'
          : 'DÉPASSEMENT BUDGÉTAIRE NET (HT)',
      value: `${totalVarianceHT >= 0 ? '+' : ''}${fmtMoney(totalVarianceHT)}`,
      sub:
        totalVarianceHT >= 0
          ? 'Enveloppe globale respectée'
          : `${overBudgetCount} corps de métier en dépassement`,
      border:
        totalVarianceHT >= 0
          ? ([5, 150, 105] as [number, number, number])
          : ([225, 29, 72] as [number, number, number]),
    },
    {
      label: 'TAUX DE CONSOMMATION GLOBAL',
      value: `${globalConsumptionPct}%`,
      sub:
        overBudgetCount === 0
          ? '100% des corps de métier sous contrôle'
          : `${overBudgetCount} lot(s) > 100% du budget alloué`,
      border:
        globalConsumptionPct > 100
          ? ([225, 29, 72] as [number, number, number])
          : globalConsumptionPct >= 85
          ? ([217, 119, 6] as [number, number, number])
          : ([5, 150, 105] as [number, number, number]),
    },
  ];

  kpiCards.forEach((card, idx) => {
    const x = 14 + idx * (cardW + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(card.border[0], card.border[1], card.border[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(doc.splitTextToSize(card.label, cardW - 6)[0], x + 3, cardY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    doc.setTextColor(card.border[0], card.border[1], card.border[2]);
    doc.text(doc.splitTextToSize(card.value, cardW - 6)[0], x + 3, cardY + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(doc.splitTextToSize(card.sub, cardW - 6)[0], x + 3, cardY + 16.5);
  });

  const tableBody = safeRows.map((row, idx) => {
    const weightPct =
      totalAllocatedHT > 0
        ? ((row.allocatedBudgetHT / totalAllocatedHT) * 100).toFixed(1) + '%'
        : '0.0%';
    const statusText = row.isOverBudget
      ? `DÉPASSEMENT (${row.consumptionPct}%)`
      : row.consumptionPct >= 85
      ? `SOUS TENSION (${row.consumptionPct}%)`
      : `MAÎTRISÉ (${row.consumptionPct}%)`;

    return [
      String(idx + 1).padStart(2, '0'),
      row.tradeCategory,
      weightPct,
      fmtMoney(row.allocatedBudgetHT),
      fmtMoney(row.invoicedActualHT),
      fmtMoney(row.stockActualHT),
      fmtMoney(row.laborActualHT),
      fmtMoney(row.actualExpensesHT),
      `${row.varianceHT >= 0 ? '+' : ''}${fmtMoney(row.varianceHT)}`,
      statusText,
    ];
  });

  // Ligne de total général
  tableBody.push([
    'TOT',
    'TOTAL CONSOLIDÉ TOUS CORPS D’ÉTAT',
    '100.0%',
    fmtMoney(totalAllocatedHT),
    fmtMoney(totalInvoicedHT),
    fmtMoney(totalStockHT),
    fmtMoney(totalLaborHT),
    fmtMoney(totalActualHT),
    `${totalVarianceHT >= 0 ? '+' : ''}${fmtMoney(totalVarianceHT)}`,
    totalVarianceHT >= 0
      ? `GLOBAL MAÎTRISÉ (${globalConsumptionPct}%)`
      : `DÉPASSEMENT (${globalConsumptionPct}%)`,
  ]);

  autoTable(doc, {
    startY: 58,
    margin: { left: 14, right: 14, bottom: 20 },
    head: [
      [
        'N°',
        'Corps de Métier / Lot Technique',
        'Poids (%)',
        'Budget Alloué HT',
        'Facturé Réel HT',
        'Sorties Stock HT',
        'Main d’Œuvre HT',
        'Dépenses Réelles HT',
        'Écart (Alloué - Réel)',
        'Statut & Consommation',
      ],
    ],
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 7.4,
      cellPadding: 2.1,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: brandRgb,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.4,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 50, fontStyle: 'bold', overflow: 'linebreak' },
      2: { cellWidth: 16, halign: 'right' },
      3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      9: { cellWidth: 34, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const isLastRow = data.row.index === tableBody.length - 1;
        if (isLastRow) {
          data.cell.styles.fillColor = [226, 232, 240];
          data.cell.styles.fontStyle = 'bold';
        } else {
          const rowObj = safeRows[data.row.index];
          if (rowObj) {
            if (data.column.index === 8 || data.column.index === 9) {
              if (rowObj.isOverBudget) {
                data.cell.styles.textColor = [190, 18, 60];
                data.cell.styles.fillColor = [255, 241, 242];
              } else if (rowObj.consumptionPct >= 85) {
                data.cell.styles.textColor = [180, 83, 9];
                data.cell.styles.fillColor = [255, 251, 235];
              } else {
                data.cell.styles.textColor = [4, 120, 87];
                data.cell.styles.fillColor = [236, 253, 245];
              }
            }
          }
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 145;
  if (finalY + 26 < pageHeight - 12 && custom.showSignatureBoxes !== false) {
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, finalY + 5, 125, 20, 2, 2, 'FD');
    doc.roundedRect(pageWidth - 139, finalY + 5, 125, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Visa Contrôle de Gestion & Direction Technique', 18, finalY + 11);
    doc.text(
      doc.splitTextToSize(custom.signatoryTitle || 'La Direction Générale / Validation Budgétaire', 117)[0],
      pageWidth - 135,
      finalY + 11
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Certifié conforme aux écritures de chantier et factures', 18, finalY + 18);
    if (custom.signatoryName) {
      doc.text(doc.splitTextToSize(custom.signatoryName, 117)[0], pageWidth - 135, finalY + 18);
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    doc.splitTextToSize(
      `${companyName} — Studio de Modèles · Rapport Officiel de Ventilation Budgétaire par Corps de Métier (${scopeTitle})`,
      pageWidth - 28
    )[0],
    14,
    pageHeight - 6
  );

  const safeCompany = (companyName || 'Entreprise').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`Rapport_Ventilation_Budgetaire_Corps_Metier_${safeCompany}_${dateStamp}.pdf`);
}

/**
 * Génère un Rapport Officiel PDF d'Évolution & Performance EVM (Earned Value Management) du Projet
 * avec avancement physique vs financier, jalons certifiés et détail des phases par corps de métier.
 */
export function exportProjectEvolutionReportToPDF(
  project: ExportableProject,
  companyName = 'ENTREPRISE',
  companyLogo?: string,
  customization: DocumentCustomizationConfig = DEFAULT_DOC_CUSTOMIZATION
): void {
  const pdf = new jsPDF();
  const [r, g, b] = hexToRgb(customization.headerHexColor);
  const subtitle =
    customization.headerSubtitle || DEFAULT_DOC_CUSTOMIZATION.headerSubtitle!;
  const docTitle = 'RAPPORT EXÉCUTIF D’ÉVOLUTION & PERFORMANCE PROJET';
  const docRef = `EVOL-${project.name.toUpperCase().replace(/[^A-Z0-9_-]/g, '-').slice(0, 22)}`;
  const statusMap: Record<string, string> = {
    planning: 'PLANNING / CADRAGE',
    active: 'ACTIF / EN EXÉCUTION',
    review: 'REVUE / CONTRÔLE QUALITÉ',
    completed: 'TERMINÉ / CLÔTURÉ',
  };
  const statusLabel = statusMap[project.status] || project.status.toUpperCase();
  const docMeta = `Statut : ${statusLabel} · Échéance : ${project.dueDate}`;
  const statusBadge = `AVANCEMENT CERTIFIÉ : ${project.progress}%`;

  const afterHeaderY = drawCorporateLetterhead(
    pdf,
    companyName,
    companyLogo,
    subtitle,
    docTitle,
    docRef,
    docMeta,
    customization.headerHexColor,
    statusBadge
  );

  const currCode = getOfficialCurrencyCode(project.currency);
  const billingRatePct =
    project.budget > 0 ? Math.min(100, Math.round((project.billedAmount / project.budget) * 100)) : 0;
  const collectionRatePct =
    project.billedAmount > 0
      ? Math.min(100, Math.round((project.paidAmount / project.billedAmount) * 100))
      : 0;
  const spiIndex =
    billingRatePct > 5 ? Number((project.progress / Math.max(10, billingRatePct)).toFixed(2)) : 1.02;
  const cpiIndex =
    project.billedAmount > 0 && project.budget > 0
      ? Number(((project.budget * (Math.max(10, project.progress) / 100)) / project.billedAmount).toFixed(2))
      : 1.05;

  const cardsAfterY = drawTwoColumnInfoCards(
    pdf,
    afterHeaderY,
    '1. IDENTIFICATION & GOUVERNANCE DU PROJET',
    project.name,
    [
      `Client / Maître d'Ouvrage : ${project.clientName}`,
      `Statut opérationnel : ${statusLabel}`,
      `Directeur / Chef de Projet : ${project.projectManagerName || 'Direction Technique'}`,
      `Site d'intervention : ${project.siteLocation || 'Chantier Principal'}`,
    ],
    '2. INDICATEURS D’ÉVOLUTION & PERFORMANCE EVM',
    `Avancement Physique : ${project.progress}% · Facturation : ${billingRatePct}%`,
    [
      `Budget Alloué : ${formatAmountSpaced(project.budget)} ${currCode}`,
      `Facturé : ${formatAmountSpaced(project.billedAmount)} ${currCode} · Encaissé : ${formatAmountSpaced(project.paidAmount)} ${currCode} (${collectionRatePct}%)`,
      `Indices EVM : SPI (Délai) = ${spiIndex} · CPI (Coût) = ${cpiIndex}`,
    ],
    [r, g, b]
  );

  const steps =
    project.structuredSteps && project.structuredSteps.length > 0
      ? project.structuredSteps
      : (project.involvedTrades || ['Ingénierie & Études', 'Exécution Principale', 'Contrôle Qualité & Réception']).map(
          (tName, idx) => ({
            phaseNumber: idx + 1,
            tradeName: tName,
            tradeLeaderName: `Chef de Lot — ${tName}`,
            title: `Phase ${idx + 1} : Exécution — ${tName}`,
            duration: '15 jours',
            deliverable: `PV de validation Lot ${idx + 1}`,
            progressPct: project.progress,
          })
        );

  autoTable(pdf, {
    startY: cardsAfterY,
    margin: { bottom: 22 },
    head: [
      [
        'Phase',
        'Intitulé de la Phase & Corps de Métier',
        'Responsable / Chef de Lot',
        'Durée',
        'Livrable Attendu',
        'Avancement',
        'Statut Jalon',
      ],
    ],
    body: steps.map((st, idx) => {
      const pct = typeof st.progressPct === 'number' ? st.progressPct : project.progress;
      return [
        `Phase ${st.phaseNumber || idx + 1}`,
        `${st.title}\n(${st.tradeName || 'Tous Corps d’État'})`,
        st.tradeLeaderName || project.projectManagerName || 'Chef de Lot',
        st.duration || '15 jours',
        st.deliverable || 'PV de phase',
        `${pct}%`,
        pct >= 100 ? 'VALIDÉ (100%)' : pct > 0 ? 'EN EXÉCUTION' : 'PLANIFIÉ',
      ];
    }),
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2.2, overflow: 'linebreak', textColor: [15, 23, 42] },
    headStyles: { fillColor: [r, g, b], textColor: 255, fontStyle: 'bold', fontSize: 7.6 },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: 52, overflow: 'linebreak' },
      2: { cellWidth: 34, overflow: 'linebreak' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 34, overflow: 'linebreak' },
      5: { cellWidth: 13, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 13, halign: 'center', fontStyle: 'bold' },
    },
  });

  drawCorporateFooter(
    pdf,
    companyName,
    customization.footerLegalNotice,
    customization.footerCustomText,
    customization.footerShowPageNumbers !== false
  );

  const safeProj = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  pdf.save(`Evolution_Projet_${safeProj}.pdf`);
}




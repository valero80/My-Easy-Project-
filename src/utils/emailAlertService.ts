import { Currency, formatCurrency } from './i18n';

export type EmailAlertTriggerType = 'invoice_validated' | 'project_milestone' | 'manual';

export interface ClientEmailAlertRecord {
  id: string;
  tenantId: string;
  triggerType: EmailAlertTriggerType;
  recipientName: string;
  recipientEmail: string;
  ccEmail?: string;
  subject: string;
  bodyText: string;
  plainTextBody?: string;
  relatedProjectId: string;
  relatedProjectName: string;
  projectName?: string;
  relatedDocId?: string;
  relatedDocNumber?: string;
  docNumber?: string;
  amountTTC?: number;
  currency?: Currency;
  milestonePct?: number;
  milestoneLabel?: string;
  milestoneTitle?: string;
  sentAt: string;
  sentByUser: string;
  dispatchedByName?: string;
  dispatchedByRole?: string;
  deliveryStatus: 'dispatched' | 'sent_auto' | 'dispatched_mailto' | 'resent';
}

export interface EmailAutomationSettings {
  autoEmailOnInvoiceValidation: boolean;
  autoEmailOnMajorMilestone: boolean;
  ccProjectManagerOnAlerts: boolean;
  majorMilestoneThresholds: number[];
  ccDirectionEmail: string;
  autoOpenMailClient: boolean;
}

export const DEFAULT_EMAIL_AUTOMATION_SETTINGS: EmailAutomationSettings = {
  autoEmailOnInvoiceValidation: true,
  autoEmailOnMajorMilestone: true,
  ccProjectManagerOnAlerts: true,
  majorMilestoneThresholds: [25, 50, 75, 100],
  ccDirectionEmail: '',
  autoOpenMailClient: false,
};

export function buildInvoiceValidatedEmail(params: {
  companyName: string;
  clientName: string;
  clientEmail?: string;
  projectName: string;
  docNumber: string;
  docType: 'quote' | 'proforma' | 'invoice';
  issueDate: string;
  dueDate: string;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount?: number;
  totalAmountFormatted?: string;
  currency: Currency;
  itemsSummary?: string;
  dedicatedAccountInfo?: string;
  operatorName?: string;
  validatedBy?: string;
}): { subject: string; body: string; plainTextBody: string; shortAlertMessage: string } {
  const docLabel =
    params.docType === 'invoice'
      ? 'Facture Définitive'
      : params.docType === 'proforma'
      ? 'Facture Proforma'
      : 'Devis Validé';

  const formattedTotal =
    params.totalAmountFormatted || formatCurrency(params.totalAmount || 0, params.currency);

  const subject = `[${params.companyName}] Validation officielle — ${docLabel} N° ${params.docNumber} (${params.projectName})`;

  const formattedLines = (params.itemsSummary || '')
    .split('\n')
    .filter(Boolean)
    .map((line, idx) => {
      if (line.includes('|')) {
        const [desc, qty, price] = line.split('|').map((s) => s.trim());
        return `  ${idx + 1}. ${desc} — Qté : ${qty} × ${formatCurrency(Number(price) || 0, params.currency)}`;
      }
      return `  ${idx + 1}. ${line}`;
    })
    .join('\n');

  const accountSection = params.dedicatedAccountInfo
    ? `\nCOORDONNÉES DE RÈGLEMENT (COMPTE DÉDIÉ AU PROJET) :\n  ${params.dedicatedAccountInfo}\n`
    : '';

  const detailsSection = formattedLines
    ? `\nDÉTAIL DES PRESTATIONS :\n${formattedLines}\n`
    : '';

  const signer = params.validatedBy || params.operatorName || 'Direction Financière';

  const body = `Madame, Monsieur ${params.clientName},

Nous vous informons que votre ${docLabel.toLowerCase()} N° ${params.docNumber} relative au projet « ${params.projectName} » a été officiellement validée par nos services.

RÉCAPITULATIF DU DOCUMENT FINANCIER :
  • Référence : ${params.docNumber} (${docLabel})
  • Projet rattaché : ${params.projectName}
  • Date d'émission : ${params.issueDate}
  • Date d'échéance : ${params.dueDate}
  • MONTANT TOTAL TTC : ${formattedTotal}
${detailsSection}${accountSection}
Notre équipe reste à votre entière disposition pour toute précision complémentaire.

Cordialement,
${signer}
${params.companyName}`;

  const shortAlertMessage = `E-mail automatique envoyé à ${params.clientName} (${params.clientEmail || 'email client'}) pour la validation de ${params.docNumber} (${formattedTotal}) — Projet ${params.projectName}.`;

  return { subject, body, plainTextBody: body, shortAlertMessage };
}

export function buildProjectMilestoneEmail(params: {
  companyName: string;
  clientName: string;
  clientEmail?: string;
  projectName: string;
  milestoneTitle?: string;
  milestoneLabel?: string;
  milestonePct?: number;
  progressPct?: number;
  phaseOrCycleLabel?: string;
  deliverableOrNotes?: string;
  projectManagerName: string;
  completedPhasesSummary?: string;
  nextStepsSummary?: string;
}): { subject: string; body: string; plainTextBody: string; shortAlertMessage: string } {
  const pct = params.milestonePct ?? params.progressPct ?? 0;
  const label = params.milestoneTitle || params.milestoneLabel || `Jalon ${pct}%`;
  const phaseInfo = params.phaseOrCycleLabel ? ` (${params.phaseOrCycleLabel})` : '';

  const subject = `[${params.companyName}] Jalon majeur atteint (${pct}%) — Projet ${params.projectName}`;

  const deliverableBlock = params.deliverableOrNotes
    ? `\nOBSERVATIONS & LIVRABLES VALIDÉS :\n  ${params.deliverableOrNotes}\n`
    : '';

  const phasesBlock = params.completedPhasesSummary
    ? `\nÉTAT D'AVANCEMENT DES PHASES :\n${params.completedPhasesSummary}\n`
    : '';

  const nextBlock = params.nextStepsSummary
    ? `\nPROCHAINES ÉTAPES :\n  ${params.nextStepsSummary}\n`
    : '';

  const body = `Madame, Monsieur ${params.clientName},

Nous avons le plaisir de vous notifier le franchissement d'un jalon majeur sur votre projet « ${params.projectName} ».

DÉTAILS DU JALON ATTEINT :
  • Jalon validé : ${label}${phaseInfo}
  • Taux d'avancement global : ${pct}%
  • Date de validation : ${new Date().toLocaleDateString('fr-FR')}
  • Responsable du projet : ${params.projectManagerName}
${deliverableBlock}${phasesBlock}${nextBlock}
Vous pouvez consulter à tout moment les procès-verbaux et le plan de réalisation mis à jour auprès de notre direction de projet.

Cordialement,
${params.projectManagerName}
${params.companyName}`;

  const shortAlertMessage = `E-mail automatique envoyé à ${params.clientName} (${params.clientEmail || 'email client'}) — Jalon atteint : ${label} (${pct}%) sur le projet ${params.projectName}.`;

  return { subject, body, plainTextBody: body, shortAlertMessage };
}

export function openClientEmailInMailApp(
  record: ClientEmailAlertRecord,
  ccEmail?: string
): void {
  const recipient = record.recipientEmail || '';
  const effectiveCc = ccEmail || record.ccEmail;
  const ccParam = effectiveCc?.trim() ? `&cc=${encodeURIComponent(effectiveCc.trim())}` : '';
  const textBody = record.bodyText || record.plainTextBody || '';
  const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(
    record.subject
  )}&body=${encodeURIComponent(textBody)}${ccParam}`;
  window.location.href = mailtoUrl;
}

export function detectCrossedMilestoneThreshold(
  previousProgress: number,
  newProgress: number,
  thresholds: number[] = [25, 50, 75, 100]
): number | null {
  if (newProgress <= previousProgress) return null;
  const sorted = [...thresholds].sort((a, b) => b - a);
  for (const t of sorted) {
    if (previousProgress < t && newProgress >= t) {
      return t;
    }
  }
  return null;
}

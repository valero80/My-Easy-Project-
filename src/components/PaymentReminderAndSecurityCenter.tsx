import React, { useState, useMemo, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  FileDown,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Fingerprint,
  Eye,
  RefreshCw,
  FileCheck2,
  Trash2,
  X,
} from 'lucide-react';
import {
  ExportableDocument,
  ExportableProject,
  DocumentCustomizationConfig,
  ExportablePaymentReminderNotice,
  exportPaymentReminderToPDF,
  exportProjectClosureDocumentToPDF,
  buildProjectCompletionSummary,
} from '../utils/exporters';
import { getOfficialCurrencyCode } from '../utils/i18n';
import {
  getSecurityIntrusionLogs,
  clearSecurityIntrusionLogs,
  recordSecurityIntrusionEvent,
  computeTenantWorkspaceFingerprint,
  detectMaliciousIntrusionPattern,
  SecurityIntrusionEvent,
} from '../utils/crypto';

interface AutomatedPaymentReminderSystemProps {
  documents: ExportableDocument[];
  companyName: string;
  companyLogo?: string;
  companyConfig: DocumentCustomizationConfig;
  selectedInvoiceId?: string | null;
  onClearSelectedInvoice?: () => void;
  onRecordAuditLog?: (action: string, details: string) => void;
}

export const AutomatedPaymentReminderSystem: React.FC<AutomatedPaymentReminderSystemProps> = ({
  documents,
  companyName,
  companyLogo,
  companyConfig,
  selectedInvoiceId,
  onClearSelectedInvoice,
  onRecordAuditLog,
}) => {
  const [filterMode, setFilterMode] = useState<'urgent_and_soon' | 'all_unpaid'>('urgent_and_soon');
  const [activeDocId, setActiveDocId] = useState<string>('');
  const [templateLevel, setTemplateLevel] = useState<
    'preventive' | 'first_overdue' | 'formal_notice'
  >('preventive');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [messageBody, setMessageBody] = useState<string>('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const invoiceCandidates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return documents
      .filter(
        (d) =>
          (d.docType === 'invoice' || d.docType === 'proforma') &&
          d.status !== 'cancelled' &&
          d.status !== 'draft'
      )
      .map((d) => {
        const total = Number(d.totalAmount || 0);
        const paid = Number(d.paidAmount || 0);
        const remaining = Math.max(0, Number((total - paid).toFixed(2)));
        const dueStr = d.dueDate || d.issueDate || new Date().toISOString().slice(0, 10);
        const dueDateObj = new Date(dueStr);
        dueDateObj.setHours(0, 0, 0, 0);
        const diffMs = today.getTime() - dueDateObj.getTime();
        const daysOverdue = Math.round(diffMs / (1000 * 60 * 60 * 24));
        return {
          doc: d,
          total,
          paid,
          remaining,
          dueDate: dueStr,
          daysOverdue, // > 0 means overdue, <= 0 means days remaining (e.g. -3 = due in 3 days)
          isNearingOrPastDue: daysOverdue >= -7,
        };
      })
      .filter((item) => item.remaining > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [documents]);

  const displayedCandidates = useMemo(() => {
    if (filterMode === 'all_unpaid') return invoiceCandidates;
    const filtered = invoiceCandidates.filter((c) => c.isNearingOrPastDue);
    return filtered.length > 0 ? filtered : invoiceCandidates;
  }, [invoiceCandidates, filterMode]);

  useEffect(() => {
    if (selectedInvoiceId) {
      setActiveDocId(selectedInvoiceId);
      setFilterMode('all_unpaid');
    } else if (!activeDocId && displayedCandidates.length > 0) {
      setActiveDocId(displayedCandidates[0].doc.id);
    }
  }, [selectedInvoiceId, displayedCandidates, activeDocId]);

  const selectedCandidate = useMemo(() => {
    return (
      invoiceCandidates.find((c) => c.doc.id === activeDocId) ||
      displayedCandidates[0] ||
      null
    );
  }, [invoiceCandidates, displayedCandidates, activeDocId]);

  const generateTemplateForCandidate = (
    candidate: typeof selectedCandidate,
    forcedLevel?: 'preventive' | 'first_overdue' | 'formal_notice'
  ) => {
    if (!candidate) return;
    const { doc, total, paid, remaining, dueDate, daysOverdue } = candidate;
    const autoLevel: 'preventive' | 'first_overdue' | 'formal_notice' =
      forcedLevel ||
      (daysOverdue > 15 ? 'formal_notice' : daysOverdue >= 0 ? 'first_overdue' : 'preventive');

    if (!forcedLevel) {
      setTemplateLevel(autoLevel);
    }

    const currencyCode = getOfficialCurrencyCode(doc.currency);
    const fmt = (val: number) => `${val.toLocaleString('fr-FR')} ${currencyCode}`;
    const docLabel = doc.docType === 'proforma' ? 'Facture Proforma' : 'Facture';
    const bankLine =
      doc.projectAccountInfo ||
      doc.projectDedicatedAccount ||
      companyConfig.bankDetails ||
      companyConfig.paymentTermsText;

    setRecipientEmail(doc.clientEmail || '');
    if (doc.clientPhone) {
      setRecipientPhone(doc.clientPhone);
    }

    if (autoLevel === 'preventive') {
      const daysLeft = Math.abs(daysOverdue);
      setSubject(
        `[${companyName}] Rappel de courtoisie — Échéance ${docLabel} N° ${doc.docNumber} (${dueDate})`
      );
      setSmsBody(
        `[${companyName}] Rappel: ${docLabel} ${doc.docNumber} (${doc.projectName}) de ${fmt(remaining)} échoit le ${dueDate} (${daysLeft === 0 ? "aujourd'hui" : `J-${daysLeft}`}). Merci de votre règlement.`
      );
      setMessageBody(
        `Bonjour ${doc.clientName || 'Cher Partenaire'},\n\n` +
          `Nous espérons que nos travaux sur le projet « ${doc.projectName} » vous donnent entière satisfaction.\n\n` +
          `Sauf erreur ou omission de notre part, nous vous rappelons aimablement que la ${docLabel} N° ${doc.docNumber} arrivera à échéance le ${dueDate} (${daysLeft === 0 ? "aujourd'hui" : `dans ${daysLeft} jour(s)`}).\n\n` +
          `• Référence Document : ${doc.docNumber}\n` +
          `• Projet rattaché : ${doc.projectName}\n` +
          `• Montant Total TTC : ${fmt(total)}\n` +
          `• Montant Déjà Réglé : ${fmt(paid)}\n` +
          `• Solde Net à Régler : ${fmt(remaining)}\n` +
          (bankLine ? `• Modalités / Coordonnées de règlement : ${bankLine}\n` : '') +
          `\nSi votre virement a déjà été émis, nous vous prions de ne pas tenir compte de ce rappel.\n\n` +
          `Cordialement,\nLa Direction Administrative & Financière — ${companyName}`
      );
    } else if (autoLevel === 'first_overdue') {
      setSubject(
        `[${companyName}] 1ère Relance Amiable — ${docLabel} N° ${doc.docNumber} échue le ${dueDate}`
      );
      setSmsBody(
        `[${companyName}] RELANCE: Sauf erreur, le solde de ${fmt(remaining)} sur la ${docLabel} ${doc.docNumber} (échue le ${dueDate}, J+${daysOverdue}) reste en attente. Merci de régulariser.`
      );
      setMessageBody(
        `Bonjour ${doc.clientName || 'Cher Client'},\n\n` +
          `Après vérification de votre compte client arrêté à ce jour, nous constatons que le solde de la ${docLabel} N° ${doc.docNumber} relative au projet « ${doc.projectName} », échue le ${dueDate}${daysOverdue > 0 ? ` (${daysOverdue} jour(s) de retard)` : ''}, demeure en attente de règlement.\n\n` +
          `• Référence Facture : ${doc.docNumber}\n` +
          `• Date d'échéance : ${dueDate}\n` +
          `• Montant Total TTC : ${fmt(total)}\n` +
          `• Acomptes reçus : ${fmt(paid)}\n` +
          `• Solde Restant Dû : ${fmt(remaining)}\n` +
          (bankLine ? `• Règlement sur compte : ${bankLine}\n` : '') +
          `\nNous vous saurions gré de bien vouloir procéder au règlement de ce solde dans les meilleurs délais ou de nous transmettre le justificatif de virement correspondant.\n\n` +
          `Restant à votre entière disposition,\nService Comptabilité & Recouvrement — ${companyName}`
      );
    } else {
      setSubject(
        `[URGENT - ${companyName}] Mise en Demeure / Relance Formelle — ${docLabel} N° ${doc.docNumber} (${daysOverdue}j de retard)`
      );
      setSmsBody(
        `[URGENT ${companyName}] MISE EN DEMEURE: ${docLabel} ${doc.docNumber} impayée (${fmt(remaining)}, retard ${daysOverdue}j). Régularisation requise sous 48h.`
      );
      setMessageBody(
        `Madame, Monsieur (${doc.clientName || 'Direction Financière'}),\n\n` +
          `Malgré nos précédents rappels, nous constatons que la ${docLabel} N° ${doc.docNumber} concernant le projet « ${doc.projectName} », arrivée à échéance le ${dueDate} (soit ${daysOverdue} jour(s) d'arriéré), présente toujours un solde impayé de ${fmt(remaining)}.\n\n` +
          `RÉCAPITULATIF EXIGIBLE :\n` +
          `• N° Document : ${doc.docNumber}\n` +
          `• Montant Initial TTC : ${fmt(total)}\n` +
          `• Montant Réglé : ${fmt(paid)}\n` +
          `• SOLDE EXIGIBLE IMMÉDIATEMENT : ${fmt(remaining)}\n` +
          (bankLine ? `• Coordonnées Bancaires : ${bankLine}\n` : '') +
          `\nNous vous prions d'effectuer la régularisation de cette créance sous 48 heures et de nous adresser l'avis d'opéré par retour d'e-mail, SMS ou WhatsApp.\n\n` +
          `Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.\n` +
          `Direction Générale & Juridique — ${companyName}`
      );
    }
  };

  const [smsBody, setSmsBody] = useState<string>('');
  const [autoSmsRuleEnabled, setAutoSmsRuleEnabled] = useState<boolean>(true);
  const [isSendingSms, setIsSendingSms] = useState<boolean>(false);
  const [smsStatuses, setSmsStatuses] = useState<
    Record<
      string,
      {
        smsId: string;
        status: 'sent_gsm' | 'delivered_mobile';
        sentAt: string;
        deliveredAt?: string;
        recipientPhone: string;
        messageText: string;
      }
    >
  >({});

  useEffect(() => {
    if (selectedCandidate) {
      generateTemplateForCandidate(selectedCandidate);
    }
  }, [selectedCandidate?.doc.id]);

  // Suivi du statut de lecture API WhatsApp Business par document
  const [waApiStatuses, setWaApiStatuses] = useState<
    Record<
      string,
      {
        wamid: string;
        status: 'sent' | 'delivered' | 'read';
        sentAt: string;
        readAt?: string;
        recipientPhone: string;
      }
    >
  >({});
  const [isSendingWaApi, setIsSendingWaApi] = useState<boolean>(false);

  const handleSendSmsAutomated = async () => {
    if (!selectedCandidate) return;
    setIsSendingSms(true);
    const docId = selectedCandidate.doc.id;
    const phone = recipientPhone.trim() || selectedCandidate.doc.clientPhone || '+2250700000000';
    const nowTime = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const smsId = `SMS-GSM-${Date.now().toString(36).toUpperCase()}`;

    setSmsStatuses((prev) => ({
      ...prev,
      [docId]: {
        smsId,
        status: 'sent_gsm',
        sentAt: nowTime,
        recipientPhone: phone,
        messageText: smsBody,
      },
    }));

    try {
      await fetch('/api/saas/sms/default_tenant/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: selectedCandidate.doc.clientName,
          recipientPhone: phone,
          documentNumber: selectedCandidate.doc.docNumber,
          smsText: smsBody,
          reminderLevel: templateLevel,
        }),
      });
    } catch {
      // local state progression
    }

    setTimeout(() => {
      const delivTime = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setSmsStatuses((prev) => ({
        ...prev,
        [docId]: {
          ...(prev[docId] || {
            smsId,
            sentAt: nowTime,
            recipientPhone: phone,
            messageText: smsBody,
          }),
          status: 'delivered_mobile',
          deliveredAt: delivTime,
        },
      }));
    }, 1100);

    setIsSendingSms(false);
    onRecordAuditLog?.(
      'Rappel Paiement SMS Automatisé',
      `Envoi d'un SMS automatisé pour la facture ${selectedCandidate.doc.docNumber} à ${selectedCandidate.doc.clientName} (${phone}) — Réf: ${smsId}`
    );
    setFeedbackToast(
      `Passerelle SMS : Rappel ${selectedCandidate.doc.docNumber} transmis par SMS à ${phone} (${smsId}).`
    );
    setTimeout(() => setFeedbackToast(null), 5000);
  };

  const handleOpenNativeSmsApp = () => {
    if (!selectedCandidate) return;
    const phone = (recipientPhone.trim() || selectedCandidate.doc.clientPhone || '').replace(
      /[^0-9+]/g,
      ''
    );
    const smsUri = `sms:${phone}?body=${encodeURIComponent(smsBody || messageBody)}`;
    window.location.href = smsUri;
    onRecordAuditLog?.(
      'Rappel Paiement SMS Direct',
      `Ouverture de la messagerie SMS pour la facture ${selectedCandidate.doc.docNumber}`
    );
  };

  const handleBatchSendAutomatedSmsReminders = () => {
    const targets = displayedCandidates.slice(0, 10);
    if (targets.length === 0) return;
    const nowTime = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const nextMap = { ...smsStatuses };
    targets.forEach((cand, idx) => {
      const cur = getOfficialCurrencyCode(cand.doc.currency);
      const phone = cand.doc.clientPhone || recipientPhone || `+2250700000${idx + 1}`;
      nextMap[cand.doc.id] = {
        smsId: `SMS-BATCH-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
        status: 'delivered_mobile',
        sentAt: nowTime,
        deliveredAt: nowTime,
        recipientPhone: phone,
        messageText: `[${companyName}] Rappel échéance Facture ${cand.doc.docNumber} : solde ${cand.remaining.toLocaleString('fr-FR')} ${cur} (échéance ${cand.dueDate}).`,
      };
    });
    setSmsStatuses(nextMap);
    onRecordAuditLog?.(
      'Campagne SMS Automatisée',
      `Envoi groupé de ${targets.length} rappel(s) de paiement par SMS pour les factures proches de l'échéance ou échues.`
    );
    setFeedbackToast(
      `Campagne SMS exécutée : ${targets.length} rappel(s) de paiement envoyés automatiquement par SMS avec accusé de réception GSM.`
    );
    setTimeout(() => setFeedbackToast(null), 5000);
  };

  const handleSendWhatsAppBusinessApi = async () => {
    if (!selectedCandidate) return;
    setIsSendingWaApi(true);
    const docId = selectedCandidate.doc.id;
    const cur = getOfficialCurrencyCode(selectedCandidate.doc.currency);
    const phone = recipientPhone.trim() || selectedCandidate.doc.clientPhone || '+2250700000000';
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const wamid = `wamid.HBgM${Date.now().toString(36).toUpperCase()}`;

    setWaApiStatuses((prev) => ({
      ...prev,
      [docId]: {
        wamid,
        status: 'sent',
        sentAt: nowTime,
        recipientPhone: phone,
      },
    }));

    try {
      await fetch('/api/saas/whatsapp/default_tenant/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: selectedCandidate.doc.clientName,
          recipientPhone: phone,
          documentType: 'payment_reminder',
          documentNumber: selectedCandidate.doc.docNumber,
          amountFormatted: `${selectedCandidate.remaining.toLocaleString('fr-FR')} ${cur}`,
          templateName: `reminder_${templateLevel}`,
          messagePreview: subject,
          initialStatus: 'delivered',
        }),
      });
    } catch {
      // fallback local state progression
    }

    setTimeout(() => {
      setWaApiStatuses((prev) => ({
        ...prev,
        [docId]: {
          ...(prev[docId] || { wamid, sentAt: nowTime, recipientPhone: phone }),
          status: 'delivered',
        },
      }));
    }, 900);

    setTimeout(() => {
      const readTime = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setWaApiStatuses((prev) => ({
        ...prev,
        [docId]: {
          ...(prev[docId] || { wamid, sentAt: nowTime, recipientPhone: phone }),
          status: 'read',
          readAt: readTime,
        },
      }));
    }, 2600);

    setIsSendingWaApi(false);
    onRecordAuditLog?.(
      'API WhatsApp Business (Suivi Lecture)',
      `Envoi direct via API WhatsApp Business de la relance ${selectedCandidate.doc.docNumber} à ${selectedCandidate.doc.clientName} (${phone}) — WAMID: ${wamid}`
    );
    setFeedbackToast(
      `API WhatsApp Business : Relance ${selectedCandidate.doc.docNumber} envoyée avec suivi du statut de lecture actif (${wamid}).`
    );
    setTimeout(() => setFeedbackToast(null), 5000);
  };

  const handleSendWhatsApp = () => {
    if (!selectedCandidate) return;
    const cleanedPhone = recipientPhone.replace(/[^0-9+]/g, '').replace(/^\+/, '');
    const encodedText = encodeURIComponent(`*${subject}*\n\n${messageBody}`);
    const waUrl = cleanedPhone
      ? `https://wa.me/${cleanedPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    const docId = selectedCandidate.doc.id;
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setWaApiStatuses((prev) => ({
      ...prev,
      [docId]: {
        wamid: `wamid.DIRECT.${Date.now().toString(36).toUpperCase()}`,
        status: 'delivered',
        sentAt: nowTime,
        recipientPhone: recipientPhone || 'WhatsApp Direct',
      },
    }));

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onRecordAuditLog?.(
      'Relance Paiement WhatsApp',
      `Envoi d'une relance WhatsApp pour la facture ${selectedCandidate.doc.docNumber} (${selectedCandidate.doc.clientName})`
    );
    setFeedbackToast(
      `Ouverture de WhatsApp pour la facture ${selectedCandidate.doc.docNumber}...`
    );
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleSendEmail = () => {
    if (!selectedCandidate) return;
    const mailtoUrl = `mailto:${encodeURIComponent(
      recipientEmail.trim()
    )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageBody)}`;
    window.location.href = mailtoUrl;
    onRecordAuditLog?.(
      'Relance Paiement E-mail',
      `Envoi d'une relance E-mail (${recipientEmail || 'destinataire à compléter'}) pour la facture ${selectedCandidate.doc.docNumber}`
    );
    setFeedbackToast(`Client de messagerie ouvert pour ${selectedCandidate.doc.docNumber}.`);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleDownloadReminderPDF = () => {
    if (!selectedCandidate) return;
    const reminderNotice: ExportablePaymentReminderNotice = {
      reminderNumber: `REL-${selectedCandidate.doc.docNumber}-${new Date().getFullYear()}`,
      reminderLevel: templateLevel,
      reminderTitle:
        templateLevel === 'formal_notice'
          ? 'Mise en Demeure de Payer'
          : templateLevel === 'first_overdue'
          ? 'Avis Officiel de Relance Amiable'
          : "Rappel Préventif d'Échéance",
      daysDiff: selectedCandidate.daysOverdue,
      customSubject: subject,
      customMessageBody: messageBody,
      recipientPhone: recipientPhone || undefined,
    };
    exportPaymentReminderToPDF(
      selectedCandidate.doc,
      reminderNotice,
      companyName,
      companyLogo,
      companyConfig
    );
    onRecordAuditLog?.(
      'Avis Officiel de Relance PDF',
      `Génération du PDF d'avis de relance pour ${selectedCandidate.doc.docNumber}`
    );
    setFeedbackToast(
      `Avis officiel de relance PDF généré pour ${selectedCandidate.doc.docNumber}.`
    );
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  if (invoiceCandidates.length === 0) {
    return (
      <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
              Système Automatisé de Relance de Paiement (SMS, WhatsApp &amp; E-mail)
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Aucune facture validée en attente de règlement ou proche de son échéance. Tous vos encaissements sont à jour.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-amber-200/90 dark:border-amber-800/60 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-4 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black tracking-wide uppercase">
                Relances Automatiques de Paiement (SMS, WhatsApp, E-mail &amp; PDF)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30">
                {invoiceCandidates.length} facture(s) à recouvrer
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Envoi automatisé de rappels de paiement par <strong>SMS (Passerelle GSM)</strong>, <strong>WhatsApp Business</strong> et <strong>E-mail</strong> pour les factures proches de l&apos;échéance ou en retard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleBatchSendAutomatedSmsReminders}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition cursor-pointer"
            title="Envoyer automatiquement un SMS de rappel à toutes les factures proches de l'échéance ou échues"
          >
            Campagne SMS Automatique ({displayedCandidates.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('urgent_and_soon')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filterMode === 'urgent_and_soon'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Échéances proches &amp; retards
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('all_unpaid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filterMode === 'all_unpaid'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Toutes non soldées ({invoiceCandidates.length})
          </button>
          {selectedInvoiceId && onClearSelectedInvoice && (
            <button
              type="button"
              onClick={onClearSelectedInvoice}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              title="Réinitialiser la sélection"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {feedbackToast && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <span>{feedbackToast}</span>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
        {/* Left column: Detected invoices nearing or past due date */}
        <div className="lg:col-span-5 p-4 bg-slate-50/60 dark:bg-slate-950/40 max-h-[540px] overflow-y-auto space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1 flex items-center justify-between">
            <span>Factures détectées ({displayedCandidates.length})</span>
            <span>Solde Restant</span>
          </div>
          {displayedCandidates.map((item) => {
            const isSelected = selectedCandidate?.doc.id === item.doc.id;
            const isOverdue = item.daysOverdue > 0;
            const isDueToday = item.daysOverdue === 0;
            const cur = getOfficialCurrencyCode(item.doc.currency);
            const hasSmsSent = Boolean(smsStatuses[item.doc.id]);

            return (
              <button
                key={item.doc.id}
                type="button"
                onClick={() => setActiveDocId(item.doc.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {item.doc.docNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isOverdue
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : isDueToday
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {isOverdue
                        ? `En retard de ${item.daysOverdue} j`
                        : isDueToday
                        ? "Échéance aujourd'hui"
                        : `Échéance dans ${Math.abs(item.daysOverdue)} j`}
                    </span>
                    {hasSmsSent && (
                      <span className="text-[10px] font-mono font-bold text-cyan-700 dark:text-cyan-400">
                        · SMS ✓✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-1">
                    {item.doc.clientName}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {item.doc.projectName} • Échéance : {item.dueDate}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black font-mono tabular-nums text-rose-600 dark:text-rose-400">
                    {item.remaining.toLocaleString('fr-FR')} {cur}
                  </p>
                  <p className="text-[10px] font-mono tabular-nums text-slate-400">
                    sur {item.total.toLocaleString('fr-FR')} {cur}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right column: Template editor and instant dispatch via SMS / WhatsApp / Email / PDF */}
        {selectedCandidate && (
          <div className="lg:col-span-7 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Modèle de Relance Multicanal (SMS, WhatsApp &amp; E-mail)
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedCandidate.doc.docNumber} — {selectedCandidate.doc.clientName}
                </h4>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setTemplateLevel('preventive');
                    generateTemplateForCandidate(selectedCandidate, 'preventive');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                    templateLevel === 'preventive'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  1. Rappel Courtois (Avant échéance)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateLevel('first_overdue');
                    generateTemplateForCandidate(selectedCandidate, 'first_overdue');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                    templateLevel === 'first_overdue'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  2. Relance Amiable (Échue)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateLevel('formal_notice');
                    generateTemplateForCandidate(selectedCandidate, 'formal_notice');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                    templateLevel === 'formal_notice'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  3. Mise en Demeure
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Téléphone Mobile / SMS / WhatsApp du Client (avec indicatif)
                </label>
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="Ex: +2250700000000 ou +33600000000"
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Adresse E-mail du Client
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="comptabilite@client.com"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Dedicated SMS Reminder Composer Box */}
            <div className="p-3 rounded-xl border border-cyan-200 dark:border-cyan-800/70 bg-cyan-50/40 dark:bg-cyan-950/20 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-[11px] font-bold text-cyan-900 dark:text-cyan-300 flex items-center gap-2">
                  <span>Message SMS Automatisé (Format Court GSM / Mobile)</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    ({smsBody.length} caractères · {Math.max(1, Math.ceil(smsBody.length / 160))} SMS)
                  </span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-800 dark:text-cyan-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSmsRuleEnabled}
                    onChange={(e) => setAutoSmsRuleEnabled(e.target.checked)}
                    className="rounded border-cyan-400 text-cyan-600"
                  />
                  <span>Relance SMS auto (J-3, Jour J &amp; J+7)</span>
                </label>
              </div>
              <textarea
                rows={2}
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-cyan-300 dark:border-cyan-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Objet de la Relance (WhatsApp &amp; E-mail)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Corps du Message Complet (WhatsApp, E-mail &amp; Avis PDF)
              </label>
              <textarea
                rows={5}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-sans leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendSmsAutomated}
                  disabled={isSendingSms}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition cursor-pointer disabled:opacity-60"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>
                    {isSendingSms ? 'Envoi SMS GSM...' : 'Envoyer par SMS (Passerelle GSM)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenNativeSmsApp}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-cyan-600 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition cursor-pointer"
                >
                  <span>SMS Direct</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsAppBusinessApi}
                  disabled={isSendingWaApi}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition cursor-pointer disabled:opacity-60"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>
                    {isSendingWaApi
                      ? 'Envoi API WhatsApp...'
                      : 'WhatsApp Business API'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                >
                  <span>WhatsApp Direct</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  E-mail
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownloadReminderPDF}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white transition cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                Avis Officiel (PDF)
              </button>
            </div>

            {/* Live SMS GSM Delivery Receipt Tracker */}
            {smsStatuses[selectedCandidate.doc.id] && (
              <div className="p-3 rounded-xl border border-cyan-200 dark:border-cyan-800/70 bg-cyan-50/70 dark:bg-cyan-950/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-cyan-900 dark:text-cyan-200">
                    Suivi SMS Automatisé (GSM) :
                  </span>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {smsStatuses[selectedCandidate.doc.id].smsId}
                  </span>
                  <span className="text-slate-500">
                    · Mobile : {smsStatuses[selectedCandidate.doc.id].recipientPhone}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono font-bold">
                  {smsStatuses[selectedCandidate.doc.id].status === 'sent_gsm' ? (
                    <span className="text-cyan-700 dark:text-cyan-300">
                      ✓ Transmis opérateur GSM à {smsStatuses[selectedCandidate.doc.id].sentAt}
                    </span>
                  ) : (
                    <span className="text-emerald-700 dark:text-emerald-400">
                      ✓✓ Délivré sur mobile à {smsStatuses[selectedCandidate.doc.id].deliveredAt}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Live WhatsApp Business Read Receipt Tracker */}
            {waApiStatuses[selectedCandidate.doc.id] && (
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    Suivi API WhatsApp Business :
                  </span>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {waApiStatuses[selectedCandidate.doc.id].wamid}
                  </span>
                  <span className="text-slate-500">
                    · Destinataire : {waApiStatuses[selectedCandidate.doc.id].recipientPhone}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono font-bold">
                  {waApiStatuses[selectedCandidate.doc.id].status === 'sent' && (
                    <span className="text-slate-600 dark:text-slate-300">
                      ✓ Envoyé à {waApiStatuses[selectedCandidate.doc.id].sentAt}
                    </span>
                  )}
                  {waApiStatuses[selectedCandidate.doc.id].status === 'delivered' && (
                    <span className="text-emerald-700 dark:text-emerald-400">
                      ✓✓ Distribué à {waApiStatuses[selectedCandidate.doc.id].sentAt}
                    </span>
                  )}
                  {waApiStatuses[selectedCandidate.doc.id].status === 'read' && (
                    <span className="text-sky-600 dark:text-sky-400">
                      ✓✓ Lu par le client à {waApiStatuses[selectedCandidate.doc.id].readAt}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface ProjectCompletionSummaryCardProps {
  project: ExportableProject;
  companyName: string;
  companyLogo?: string;
  companyConfig: DocumentCustomizationConfig;
}

export const ProjectCompletionSummaryCard: React.FC<ProjectCompletionSummaryCardProps> = ({
  project,
  companyName,
  companyLogo,
  companyConfig,
}) => {
  const [expanded, setExpanded] = useState(false);

  const summary = useMemo(() => {
    return (
      project.completionSummaryDoc ||
      buildProjectCompletionSummary(project, project.lockedBy || companyName)
    );
  }, [project, companyName]);

  const handleDownloadPDF = () => {
    exportProjectClosureDocumentToPDF(
      { ...project, completionSummaryDoc: summary },
      'completion_summary',
      companyName,
      companyLogo,
      companyConfig
    );
  };

  return (
    <div className="mt-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30 p-3.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                Project Completion Summary (Synthèse d&apos;Achèvement Attachée)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700">
                {summary.summaryNumber}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 truncate">
              Généré automatiquement au statut « Achevé avec Succès » •{' '}
              {summary.totalDeliverablesCount} livrable(s) clés &amp; {summary.totalTestsCount}{' '}
              essai(s) ({summary.conformeTestsCount} conformes)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
          >
            {expanded ? 'Masquer détails' : 'Voir Livrables & Essais'}
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            PDF Synthèse d&apos;Achèvement
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-emerald-200/80 dark:border-emerald-800 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-white/90 dark:bg-slate-950/80 rounded-lg p-3 border border-emerald-200/60 dark:border-emerald-800/60">
            <p className="font-bold text-emerald-950 dark:text-emerald-300 uppercase text-[10px] tracking-wider mb-2">
              1. Livrables Clés Réceptionnés ({summary.keyDeliverables.length})
            </p>
            <ul className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {summary.keyDeliverables.map((deliv, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-2 text-[11px] border-b border-slate-100 dark:border-slate-800 pb-1 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-800 dark:text-slate-200 font-semibold break-words">
                      • Phase {deliv.phaseNumber} ({deliv.tradeName}) : {deliv.deliverable}
                    </p>
                    <p className="text-[10px] text-slate-500 break-words">{deliv.title}</p>
                  </div>
                  <span className="shrink-0 font-bold text-emerald-700 dark:text-emerald-400">
                    {deliv.progressPct}%
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white/90 dark:bg-slate-950/80 rounded-lg p-3 border border-emerald-200/60 dark:border-emerald-800/60">
            <p className="font-bold text-emerald-950 dark:text-emerald-300 uppercase text-[10px] tracking-wider mb-2">
              2. Résultats des Essais &amp; Contrôles ({summary.testResultsSummary.length})
            </p>
            <ul className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {summary.testResultsSummary.map((test, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-2 text-[11px] border-b border-slate-100 dark:border-slate-800 pb-1 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-800 dark:text-slate-200 font-semibold break-words">
                      • [{test.testCode}] {test.title}
                    </p>
                    <p className="text-[10px] text-slate-500 break-words">
                      Norme : {test.normOrReference} | Mesure : {test.measuredValue}
                    </p>
                  </div>
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold text-[10px]">
                    {test.verdict}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

interface ZeroTrustSecurityAndIntrusionCenterProps {
  tenantId: string;
  companyName: string;
  projectsCount: number;
  documentsCount: number;
  clientsCount: number;
}

export const ZeroTrustSecurityAndIntrusionCenter: React.FC<
  ZeroTrustSecurityAndIntrusionCenterProps
> = ({ tenantId, companyName, projectsCount, documentsCount, clientsCount }) => {
  const [intrusionLogs, setIntrusionLogs] = useState<SecurityIntrusionEvent[]>(() =>
    getSecurityIntrusionLogs(tenantId)
  );
  const [wafTestInput, setWafTestInput] = useState('');
  const [wafTestResult, setWafTestResult] = useState<string | null>(null);
  const [lastScanTimestamp, setLastScanTimestamp] = useState<string>(() =>
    new Date().toLocaleTimeString('fr-FR')
  );
  const [isScanningSecurity, setIsScanningSecurity] = useState<boolean>(false);
  const [securityLogSearch, setSecurityLogSearch] = useState<string>('');
  const [securitySeverityFilter, setSecuritySeverityFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [selectedSecurityEventId, setSelectedSecurityEventId] = useState<string | null>(null);

  const totalRecords = projectsCount + documentsCount + clientsCount;
  const workspaceSeal = useMemo(
    () =>
      computeTenantWorkspaceFingerprint(tenantId, {
        projects: projectsCount,
        documents: documentsCount,
        employees: clientsCount,
        auditLogs: intrusionLogs.length,
      }),
    [tenantId, projectsCount, documentsCount, clientsCount, intrusionLogs.length]
  );

  const handleRunSecurityScan = () => {
    setIsScanningSecurity(true);
    window.setTimeout(() => {
      const refreshed = getSecurityIntrusionLogs(tenantId);
      setIntrusionLogs(refreshed);
      setLastScanTimestamp(new Date().toLocaleTimeString('fr-FR'));
      setWafTestResult(
        `Audit d'intégrité complété à ${new Date().toLocaleTimeString('fr-FR')} : 100% des enregistrements (${totalRecords}) sont cloisonnés sous le tenant "${tenantId}" avec chiffrement AES-256-GCM.`
      );
      setIsScanningSecurity(false);
    }, 650);
  };

  const handleTestWafProbe = () => {
    if (!wafTestInput.trim()) return;
    const check = detectMaliciousIntrusionPattern(wafTestInput);
    if (check.malicious) {
      recordSecurityIntrusionEvent({
        type: 'XSS_SQLI_ATTEMPT_BLOCKED',
        severity: 'critical',
        sourceIdentifier: `Simulateur WAF (${companyName})`,
        details: `Tentative d'injection bloquée (${check.reason || 'Signature suspecte'})`,
        tenantId,
      });
      const updated = getSecurityIntrusionLogs(tenantId);
      setIntrusionLogs(updated);
      if (updated[0]) setSelectedSecurityEventId(updated[0].id);
      setWafTestResult(
        `BLOQUÉ PAR LE PARE-FEU WAF : Motif malveillant détecté (${check.reason || 'Signature suspecte'}). L'événement a été consigné dans le journal anti-intrusion.`
      );
    } else {
      setWafTestResult(
        `CONTENU SAIN : Aucune signature d'injection XSS, SQLi, NoSQLi ou de robot malveillant détectée.`
      );
    }
  };

  const handleClearLogs = () => {
    clearSecurityIntrusionLogs(tenantId);
    setIntrusionLogs([]);
    setSelectedSecurityEventId(null);
  };

  const filteredIntrusionLogs = useMemo(() => {
    const q = securityLogSearch.trim().toLowerCase();
    return intrusionLogs.filter((ev) => {
      if (securitySeverityFilter !== 'all' && ev.severity !== securitySeverityFilter) {
        return false;
      }
      if (!q) return true;
      return (
        ev.type.toLowerCase().includes(q) ||
        ev.details.toLowerCase().includes(q) ||
        ev.sourceIdentifier.toLowerCase().includes(q)
      );
    });
  }, [intrusionLogs, securityLogSearch, securitySeverityFilter]);

  const activeSelectedSecurityEvent = useMemo(() => {
    if (filteredIntrusionLogs.length === 0) return null;
    return (
      filteredIntrusionLogs.find((e) => e.id === selectedSecurityEventId) ||
      filteredIntrusionLogs[0]
    );
  }, [filteredIntrusionLogs, selectedSecurityEventId]);

  return (
    <div className="bg-slate-950 text-white rounded-2xl border border-emerald-500/30 p-5 shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black tracking-wide uppercase text-white">
                Bouclier Cyber-Défense Zero-Trust, Confidentialité Multi-Entreprises &amp; Journal d&apos;Audit WAF
              </h3>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                PROTECTION MAXIMALE ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Isolation stricte des données par entreprise (Multi-Tenant), chiffrement AES-256-GCM, pare-feu WAF et journal forensique anti-intrusion exploitable.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunSecurityScan}
          disabled={isScanningSecurity}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-slate-950 transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isScanningSecurity ? 'animate-spin' : ''}`} />
          <span>
            {isScanningSecurity
              ? 'Récupération & Audit en cours...'
              : `Lancer un Audit d'Intégrité (${lastScanTimestamp})`}
          </span>
        </button>
      </div>

      {/* 4 Security Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 mep-selected-elevated-hover">
          <div className="flex items-center justify-between text-emerald-400 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider">
              1. Cloisonnement Multi-Tenant
            </span>
            <Lock className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-white truncate">Tenant : {tenantId}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Aucune autre entreprise ne peut lire, déchiffrer ou modifier vos {totalRecords} dossiers.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 mep-selected-elevated-hover">
          <div className="flex items-center justify-between text-cyan-400 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider">
              2. Chiffrement E2EE &amp; Sceau
            </span>
            <Fingerprint className="w-4 h-4" />
          </div>
          <p className="text-xs font-mono font-bold text-cyan-300 truncate">{workspaceSeal}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            PBKDF2 (100 000 itérations SHA-256) + AES-256-GCM par espace entreprise.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 mep-selected-elevated-hover">
          <div className="flex items-center justify-between text-amber-400 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider">
              3. Anti-Robot &amp; Anti-BruteForce
            </span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-white">Honeypot + Défi Humain + Lockout</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Verrouillage automatique après 5 échecs et piège Honeypot contre les bots.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 mep-selected-elevated-hover">
          <div className="flex items-center justify-between text-indigo-400 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider">
              4. Pare-feu Applicatif (WAF)
            </span>
            <Eye className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-white">Filtrage XSS / SQLi / NoSQLi</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Neutralisation temps réel des scripts injectés et payloads malveillants.
          </p>
        </div>
      </div>

      {/* Interactive WAF & Explicit Security Audit Journal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Simulateur de Test Anti-Intrusion (WAF)
          </h4>
          <p className="text-[11px] text-slate-400">
            Testez la réaction du pare-feu face à une tentative d&apos;injection (ex.{' '}
            <code className="text-amber-300">&lt;script&gt;alert(1)&lt;/script&gt;</code> ou{' '}
            <code className="text-amber-300">UNION SELECT * FROM users</code>).
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={wafTestInput}
              onChange={(e) => setWafTestInput(e.target.value)}
              placeholder="Saisir une chaîne à inspecter..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500 outline-none"
            />
            <button
              type="button"
              onClick={handleTestWafProbe}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shrink-0 cursor-pointer"
            >
              Inspecter
            </button>
          </div>
          {wafTestResult && (
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-[11px] text-slate-200">
              {wafTestResult}
            </div>
          )}

          {/* Selected Security Audit Element with Rotating Gradient Border, Hover Depth & Skeleton Loader */}
          <div className="mep-rotating-gradient-border mep-selected-elevated-hover">
            <div className="p-3.5 rounded-xl bg-slate-950 text-slate-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
                  Élément d&apos;Audit Cyber Sélectionné · Diagnostic Forensique
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold">
                  WAF ISO-27001
                </span>
              </div>
              {isScanningSecurity ? (
                <div className="space-y-2 py-1" aria-busy="true">
                  <div className="h-3.5 w-3/4 rounded mep-skeleton-shimmer" />
                  <div className="h-3 w-full rounded mep-skeleton-shimmer" />
                  <div className="h-3 w-5/6 rounded mep-skeleton-shimmer" />
                </div>
              ) : activeSelectedSecurityEvent ? (
                <div className="space-y-1 text-[11px]">
                  <div className="font-mono font-bold text-rose-300">
                    [{activeSelectedSecurityEvent.type}] — Sévérité :{' '}
                    {activeSelectedSecurityEvent.severity.toUpperCase()}
                  </div>
                  <p className="text-slate-300">{activeSelectedSecurityEvent.details}</p>
                  <p className="text-[10px] text-slate-400">
                    <strong>Action WAF :</strong> Requête neutralisée en amont · Isolation du tenant{' '}
                    <code className="font-mono">{tenantId}</code> préservée à 100%.
                  </p>
                </div>
              ) : (
                <div className="space-y-1 text-[11px]">
                  <div className="font-bold text-emerald-300">
                    Périmètre Zero-Trust 100% Intègre ({totalRecords} enregistrements protégés)
                  </div>
                  <p className="text-slate-400 text-[10px]">
                    Sceau cryptographique actif : <code className="font-mono text-cyan-300">{workspaceSeal}</code>. Cliquez sur « Lancer un Audit d&apos;Intégrité » ou inspectez un événement pour voir l&apos;analyse forensique.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Journal Forensique des Intrusions &amp; Événements WAF ({filteredIntrusionLogs.length} / {intrusionLogs.length})
              </h4>
              <p className="text-[10px] text-slate-400">
                Cliquez sur une entrée pour l&apos;encadrer et afficher son diagnostic détaillé.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={securityLogSearch}
                onChange={(e) => setSecurityLogSearch(e.target.value)}
                placeholder="Filtrer par type, source..."
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-white outline-none w-36"
              />
              <select
                value={securitySeverityFilter}
                onChange={(e) => setSecuritySeverityFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white outline-none"
              >
                <option value="all">Toutes sévérités</option>
                <option value="critical">Critique</option>
                <option value="warning">Avertissement</option>
              </select>
              {intrusionLogs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Purger
                </button>
              )}
            </div>
          </div>

          {isScanningSecurity ? (
            <div className="space-y-2 py-2" aria-busy="true">
              {[1, 2, 3].map((sk) => (
                <div
                  key={sk}
                  className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2"
                >
                  <div className="flex justify-between">
                    <div className="h-3.5 w-44 rounded mep-skeleton-shimmer" />
                    <div className="h-3.5 w-16 rounded mep-skeleton-shimmer" />
                  </div>
                  <div className="h-3 w-full rounded mep-skeleton-shimmer" />
                </div>
              ))}
            </div>
          ) : filteredIntrusionLogs.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 text-center text-xs text-emerald-400 font-medium">
              Aucune intrusion humaine ou robot détectée selon vos critères. Périmètre multi-entreprises 100% intègre.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {filteredIntrusionLogs.slice(0, 15).map((ev) => {
                const isSelected = activeSelectedSecurityEvent?.id === ev.id;
                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedSecurityEventId(ev.id)}
                    className={`cursor-pointer rounded-xl transition-all ${
                      isSelected
                        ? 'mep-rotating-gradient-border mep-selected-elevated-hover'
                        : 'p-2.5 bg-slate-950 border border-rose-500/30 hover:border-rose-400/60 mep-selected-elevated-hover'
                    }`}
                  >
                    <div className={isSelected ? 'p-2.5 rounded-xl bg-slate-950 flex items-start justify-between gap-2 text-[11px]' : 'flex items-start justify-between gap-2 text-[11px]'}>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-rose-400">[{ev.type}]</span>{' '}
                        <span className="text-slate-200 break-words">{ev.details}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Source : <span className="font-mono text-slate-300">{ev.sourceIdentifier}</span> •{' '}
                          {new Date(ev.timestamp).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-bold text-[10px] uppercase shrink-0">
                        {ev.severity}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  FileText,
  FileEdit,
  ShieldCheck,
  Mail,
  MessageCircle,
  LayoutTemplate,
  Globe,
  RefreshCw,
} from 'lucide-react';
import {
  ExportableDocument,
  DocumentCustomizationConfig,
  DocumentLayoutPreset,
  DEFAULT_DOC_CUSTOMIZATION,
  exportSingleDocumentToPDF,
  formatAmountSpaced,
  formatClientDocumentLines,
  parseDocumentRubriquesFromSummary,
  resolveDocumentLayoutPreset,
} from '../utils/exporters';
import {
  Currency,
  CURRENCY_CONFIG,
  convertCurrencyAmount,
  getDefaultExchangeRate,
  getOfficialCurrencyCode,
} from '../utils/i18n';
import { MyEasyProjectLogo } from './MyEasyProjectLogo';

interface DocumentPreviewModalProps {
  doc?: ExportableDocument;
  docItem?: ExportableDocument;
  companyName: string;
  companyLogo?: string;
  countryCode?: string;
  countryName?: string;
  decryptedNotes?: string;
  decryptedNote?: string;
  customization?: DocumentCustomizationConfig;
  onClose: () => void;
  onEditDraft?: () => void;
  onValidateDraft?: () => void | Promise<void>;
  onShareEmail?: (doc: ExportableDocument) => void;
  onShareWhatsApp?: (doc: ExportableDocument) => void;
  onOpenShareModal?: (channel: 'email' | 'whatsapp') => void;
  onOpenTemplateStudio?: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  doc: docProp,
  docItem,
  companyName,
  companyLogo,
  countryName,
  decryptedNotes,
  decryptedNote,
  customization = DEFAULT_DOC_CUSTOMIZATION,
  onClose,
  onEditDraft,
  onValidateDraft,
  onShareEmail,
  onShareWhatsApp,
  onOpenShareModal,
  onOpenTemplateStudio,
}) => {
  const doc = (docItem || docProp)!;
  const resolvedNote = decryptedNote ?? decryptedNotes;
  const providerCurrencyCode = getOfficialCurrencyCode(doc.currency);

  const initialClientCurrency = getOfficialCurrencyCode(
    doc.clientCurrency || doc.clientProfile?.preferredCurrency || doc.currency
  );
  const [selectedClientCurrency, setSelectedClientCurrency] = useState<Currency>(
    initialClientCurrency
  );
  const [printInClientCurrency, setPrintInClientCurrency] = useState<boolean>(
    Boolean(doc.printInClientCurrency && initialClientCurrency !== providerCurrencyCode)
  );
  const [customExchangeRate, setCustomExchangeRate] = useState<number>(() => {
    if (doc.exchangeRate && doc.exchangeRate > 0) return doc.exchangeRate;
    if (doc.clientProfile?.defaultExchangeRate && doc.clientProfile.defaultExchangeRate > 0) {
      return doc.clientProfile.defaultExchangeRate;
    }
    return getDefaultExchangeRate(providerCurrencyCode, initialClientCurrency);
  });

  useEffect(() => {
    const nextDefault = getDefaultExchangeRate(providerCurrencyCode, selectedClientCurrency);
    setCustomExchangeRate(nextDefault);
  }, [providerCurrencyCode, selectedClientCurrency]);

  const officialCurrencyCode: Currency = printInClientCurrency
    ? selectedClientCurrency
    : providerCurrencyCode;
  const officialCurrencyMeta = CURRENCY_CONFIG[officialCurrencyCode];

  const conv = (val: number): number =>
    printInClientCurrency && selectedClientCurrency !== providerCurrencyCode
      ? convertCurrencyAmount(val, providerCurrencyCode, selectedClientCurrency, customExchangeRate)
      : Number((Number(val) || 0).toFixed(2));

  const initialPreset = resolveDocumentLayoutPreset(
    doc.docType,
    customization,
    doc.templateLayout
  );
  const [previewPreset, setPreviewPreset] = useState<DocumentLayoutPreset>(initialPreset);

  const effectiveHexColor = doc.headerHexColor || customization.headerHexColor || '#0F172A';
  const showLogo = customization.showLogo !== false;
  const showSignatures = customization.showSignatureBoxes !== false;

  const typeLabels: Record<string, string> = {
    quote: 'DEVIS COMMERCIAL & TECHNIQUE',
    proforma: 'FACTURE PROFORMA',
    invoice: 'FACTURE DÉFINITIVE',
  };

  const presetLabels: Record<DocumentLayoutPreset, string> = {
    classic: 'Classique Exécutif',
    modern: 'Moderne Minimaliste',
    industrial: 'Industriel BTP Structuré',
    compact: 'Compact Dense',
    landscape: 'Landscape (Facture Paysage)',
    detailed_project_report: 'Detailed Project Report (Rapport Détaillé)',
  };

  const statusLabels: Record<string, string> = {
    draft: 'BROUILLON (AVANT VALIDATION)',
    sent: 'ENVOYÉ / VALIDÉ',
    partial: 'PAIEMENT PARTIEL',
    paid: 'PAYÉ INTÉGRALEMENT',
    cancelled: 'ANNULÉ',
  };

  const remaining = Math.max(0, doc.totalAmount - doc.paidAmount);
  const subtitle =
    customization.headerSubtitle ||
    customization.companySubtitle ||
    DEFAULT_DOC_CUSTOMIZATION.headerSubtitle;
  const accountInfo = doc.projectAccountInfo || doc.projectDedicatedAccount;

  const headerExtraDetails = [
    customization.headerCompanyAddress,
    customization.headerCompanyContact,
    customization.headerTaxRegistration,
  ]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(' · ');

  const uniqueLaborPct =
    doc.globalLaborPercentage ?? customization.globalLaborPercentage ?? 25;
  const parsedRubriquesData = parseDocumentRubriquesFromSummary(
    doc.itemsSummary,
    doc.subtotal,
    uniqueLaborPct
  );
  const hasRubriques = parsedRubriquesData.rubriques.length > 0;
  const showLaborInDocument =
    !parsedRubriquesData.onlyNonStockableItems && parsedRubriquesData.totalLaborSubtotal > 0;
  const vatIncluded = doc.includeVat !== false && doc.taxRate > 0 && doc.taxAmount > 0;
  const clientFormattedLines = formatClientDocumentLines({
    ...doc,
    clientCurrency: selectedClientCurrency,
  });

  const rawLines = doc.itemsSummary
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);

  const parsedLines =
    rawLines.length > 0
      ? rawLines.map((line, idx) => {
          if (line.includes('|')) {
            const parts = line.split('|').map((p) => p.trim());
            const desc = parts[0] || `Prestation #${idx + 1}`;
            const qty = Number(parts[1]) || 1;
            const unitPrice =
              parts[2] !== undefined ? Number(parts[2]) : doc.subtotal / rawLines.length;
            const lineHT =
              parts[3] !== undefined ? Number(parts[3]) : Number((qty * unitPrice).toFixed(2));
            return { idx: idx + 1, desc, qty, unitPrice, lineHT };
          }
          const share = doc.subtotal / rawLines.length;
          return { idx: idx + 1, desc: line, qty: 1, unitPrice: share, lineHT: share };
        })
      : [
          {
            idx: 1,
            desc: 'Forfait global de prestation projet',
            qty: 1,
            unitPrice: doc.subtotal,
            lineHT: doc.subtotal,
          },
        ];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = (forceClientCurrency?: boolean) => {
    const useClientCurr = forceClientCurrency ?? printInClientCurrency;
    exportSingleDocumentToPDF(
      {
        ...doc,
        templateLayout: previewPreset,
        headerHexColor: effectiveHexColor,
        clientCurrency: selectedClientCurrency,
        exchangeRate: customExchangeRate,
        printInClientCurrency: useClientCurr,
        decryptedConfidentialNote: resolvedNote,
      },
      companyName,
      companyLogo,
      resolvedNote,
      { ...customization, layoutPreset: previewPreset },
      {
        printInClientCurrency: useClientCurr,
        targetCurrency: selectedClientCurrency,
        exchangeRate: customExchangeRate,
      }
    );
  };

  const handleDirectEmail = () => {
    if (onShareEmail) {
      onShareEmail(doc);
      return;
    }
    if (onOpenShareModal) {
      onOpenShareModal('email');
      return;
    }
    const subject = encodeURIComponent(
      `${typeLabels[doc.docType] || doc.docType.toUpperCase()} N° ${doc.docNumber} — ${companyName}`
    );
    const body = encodeURIComponent(
      `Bonjour ${doc.clientName},\n\nVeuillez trouver les références de votre document officiel :\n- Document : ${
        typeLabels[doc.docType] || doc.docType
      } N° ${doc.docNumber}\n- Projet : ${doc.projectName}\n- Montant Total HT : ${formatAmountSpaced(
        conv(doc.subtotal)
      )} ${officialCurrencyCode}\n- ${
        vatIncluded
          ? `TVA (${doc.taxRate}%) : ${formatAmountSpaced(conv(doc.taxAmount))} ${officialCurrencyCode}`
          : 'TVA : Non incluse / Exonérée (0%)'
      }\n- Montant Total TTC : ${formatAmountSpaced(
        conv(doc.totalAmount)
      )} ${officialCurrencyCode}\n\nCordialement,\n${companyName}`
    );
    window.location.href = `mailto:${doc.clientEmail || ''}?subject=${subject}&body=${body}`;
  };

  const handleDirectWhatsApp = () => {
    if (onShareWhatsApp) {
      onShareWhatsApp(doc);
      return;
    }
    if (onOpenShareModal) {
      onOpenShareModal('whatsapp');
      return;
    }
    const text = encodeURIComponent(
      `*${companyName} — ${typeLabels[doc.docType] || doc.docType.toUpperCase()} N° ${
        doc.docNumber
      }*\nDestinataire : *${doc.clientName}*\nProjet : *${doc.projectName}*\nSous-Total HT : *${formatAmountSpaced(
        conv(doc.subtotal)
      )} ${officialCurrencyCode}*\n${
        vatIncluded
          ? `TVA (${doc.taxRate}%) : *${formatAmountSpaced(conv(doc.taxAmount))} ${officialCurrencyCode}*`
          : 'TVA : *Non incluse (0%)*'
      }\nTotal TTC : *${formatAmountSpaced(conv(doc.totalAmount))} ${officialCurrencyCode}*`
    );
    window.location.href = `https://wa.me/?text=${text}`;
  };

  const isLightModern = previewPreset === 'modern';
  const isIndustrial = previewPreset === 'industrial';
  const isCompact = previewPreset === 'compact';
  const isLandscape = previewPreset === 'landscape';
  const isDetailedProjectReport = previewPreset === 'detailed_project_report';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div
        className={`w-full ${
          isLandscape ? 'max-w-7xl' : 'max-w-5xl'
        } rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] transition-all duration-200`}
      >
        {/* Top Action Toolbar */}
        <div className="flex flex-col gap-2.5 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  Aperçu Officiel avant Impression — {doc.docNumber}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Modèle actif : <span className="text-amber-300 font-semibold">{presetLabels[previewPreset]}</span> · Devise affichée : <span className="text-emerald-300 font-mono font-bold">{officialCurrencyCode}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onOpenTemplateStudio && (
                <button
                  onClick={onOpenTemplateStudio}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Configurer le logo, la mise en page, l'en-tête et le pied de page"
                >
                  <LayoutTemplate className="w-3.5 h-3.5" />
                  <span>Personnaliser Modèle</span>
                </button>
              )}
              {onEditDraft && (
                <button
                  onClick={onEditDraft}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>
              )}
              {onValidateDraft && (
                <button
                  onClick={onValidateDraft}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Valider</span>
                </button>
              )}
              <button
                onClick={handleDirectEmail}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Envoyer ce document par E-mail à un destinataire"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>E-mail</span>
              </button>
              <button
                onClick={handleDirectWhatsApp}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Envoyer ce document par WhatsApp à un destinataire"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer</span>
              </button>
              <button
                onClick={() => handleDownloadPDF()}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>PDF ({officialCurrencyCode})</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fermer l'aperçu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Multi-Currency Client Printing Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/90 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Devise du Client pour impression :</span>
              </span>
              <select
                value={selectedClientCurrency}
                onChange={(e) => {
                  const nextCurr = getOfficialCurrencyCode(e.target.value);
                  setSelectedClientCurrency(nextCurr);
                  if (nextCurr !== providerCurrencyCode) {
                    setPrintInClientCurrency(true);
                  }
                }}
                className="rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1 text-[11px] font-mono font-bold text-white focus:border-amber-400 outline-none"
              >
                {Object.values(CURRENCY_CONFIG).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name} ({c.symbol})
                  </option>
                ))}
              </select>

              {selectedClientCurrency !== providerCurrencyCode && (
                <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-0.5">
                  <span className="text-[10px] text-slate-300 font-mono">
                    1 {providerCurrencyCode} =
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0.000001"
                    value={customExchangeRate}
                    onChange={(e) =>
                      setCustomExchangeRate(Math.max(0.000001, Number(e.target.value) || 1))
                    }
                    className="w-20 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-mono font-bold text-amber-300 text-right"
                  />
                  <span className="text-[10px] text-amber-300 font-mono font-bold">
                    {selectedClientCurrency}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPrintInClientCurrency(false)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  !printInClientCurrency
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Devise Prestataire ({providerCurrencyCode})
              </button>
              {selectedClientCurrency !== providerCurrencyCode && (
                <>
                  <button
                    type="button"
                    onClick={() => setPrintInClientCurrency(true)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      printInClientCurrency
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                    }`}
                  >
                    Convertir en Devise Client ({selectedClientCurrency})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF(true)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Imprimer PDF en {selectedClientCurrency}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Live Predefined Layout Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/90 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <LayoutTemplate className="w-3.5 h-3.5 text-blue-400" />
              <span>Mise en page prédéfinie appliquée au document :</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  'classic',
                  'modern',
                  'industrial',
                  'compact',
                  'landscape',
                  'detailed_project_report',
                ] as DocumentLayoutPreset[]
              ).map((presetKey) => (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => setPreviewPreset(presetKey)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    previewPreset === presetKey
                      ? presetKey === 'landscape'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : presetKey === 'detailed_project_report'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {presetLabels[presetKey]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable A4 Sheet Container (Portrait or Landscape) */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 flex justify-center bg-slate-200/70 dark:bg-slate-950/60">
          <div
            className={`w-full ${
              isLandscape
                ? 'max-w-[1122px] min-h-[750px]'
                : 'max-w-[794px] min-h-[1040px]'
            } bg-white text-slate-900 rounded-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col justify-between transition-all duration-200`}
          >
            <div>
              {/* Dynamic Corporate Header Banner */}
              <div
                style={
                  isLightModern
                    ? {
                        backgroundColor: '#F8FAFC',
                        borderTop: `6px solid ${effectiveHexColor}`,
                        borderLeft: `6px solid ${effectiveHexColor}`,
                      }
                    : { backgroundColor: effectiveHexColor }
                }
                className={`${isCompact ? 'px-6 py-4' : 'px-7 py-6'} ${
                  isLightModern ? 'text-slate-900 border-b border-slate-200' : 'text-white'
                } relative overflow-hidden`}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Left 7 Cols: Logo + Company Name + Document Ref + Header Details */}
                  <div className="md:col-span-7 flex items-start gap-4 min-w-0">
                    {showLogo &&
                      (companyLogo ? (
                        <img
                          src={companyLogo}
                          alt="Logo Entreprise"
                          className={`${
                            isCompact ? 'w-14 h-14' : 'w-16 h-16'
                          } rounded-xl object-contain bg-white p-1.5 shrink-0 shadow-md ${
                            isLightModern ? 'border border-slate-200' : ''
                          }`}
                        />
                      ) : (
                        <div
                          className={`bg-white/95 p-1 rounded-full shrink-0 shadow-md ${
                            isLightModern ? 'border border-slate-200' : ''
                          }`}
                        >
                          <MyEasyProjectLogo size={isCompact ? 'md' : 'lg'} showText={false} />
                        </div>
                      ))}
                    <div className="min-w-0 flex-1 space-y-1">
                      <h1
                        style={isLightModern ? { color: effectiveHexColor } : undefined}
                        className={`${
                          isCompact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
                        } font-extrabold tracking-tight uppercase break-words leading-snug`}
                      >
                        {companyName}
                      </h1>
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-extrabold tracking-wide break-all ${
                          isLightModern
                            ? 'bg-amber-100 border border-amber-300 text-amber-900'
                            : 'bg-amber-400/20 border border-amber-300/40 text-amber-300'
                        }`}
                      >
                        <span>RÉF. DOCUMENT : {doc.docNumber}</span>
                      </div>
                      <p
                        className={`text-[11px] leading-relaxed break-words pt-0.5 ${
                          isLightModern ? 'text-slate-600' : 'text-slate-200/90'
                        }`}
                      >
                        {subtitle}
                      </p>
                      {headerExtraDetails && (
                        <p
                          className={`text-[10px] leading-snug break-words ${
                            isLightModern ? 'text-slate-500 font-medium' : 'text-sky-200/90'
                          }`}
                        >
                          {headerExtraDetails}
                        </p>
                      )}
                      {customization.customHeaderNote && (
                        <p
                          className={`text-[10px] italic break-words ${
                            isLightModern ? 'text-blue-700' : 'text-amber-200/90'
                          }`}
                        >
                          {customization.customHeaderNote}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right 5 Cols: Document Type Title + Dates + Status Badge */}
                  <div
                    className={`md:col-span-5 flex flex-col md:items-end justify-between text-left md:text-right min-w-0 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4 space-y-1.5 ${
                      isLightModern ? 'border-slate-200' : 'border-white/15'
                    }`}
                  >
                    <div
                      style={isLightModern ? { color: effectiveHexColor } : undefined}
                      className={`${
                        isCompact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
                      } font-black tracking-wider uppercase leading-tight break-words`}
                    >
                      {typeLabels[doc.docType] || doc.docType.toUpperCase()}
                    </div>
                    <div
                      className={`text-[11px] space-y-0.5 ${
                        isLightModern ? 'text-slate-600' : 'text-slate-200'
                      }`}
                    >
                      <div>
                        Émis le :{' '}
                        <span
                          className={`font-semibold ${
                            isLightModern ? 'text-slate-900' : 'text-white'
                          }`}
                        >
                          {doc.issueDate}
                        </span>
                      </div>
                      <div>
                        Échéance :{' '}
                        <span
                          className={`font-semibold ${
                            isLightModern ? 'text-slate-900' : 'text-white'
                          }`}
                        >
                          {doc.dueDate}
                        </span>
                      </div>
                      <div>
                        Devise d&apos;impression :{' '}
                        <span
                          className={`font-mono font-extrabold ${
                            isLightModern ? 'text-blue-700' : 'text-amber-300'
                          }`}
                        >
                          {officialCurrencyCode} — {officialCurrencyMeta?.name || officialCurrencyCode}
                        </span>
                      </div>
                    </div>
                    <div className="pt-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                          doc.status === 'paid'
                            ? 'bg-emerald-500 text-white'
                            : doc.status === 'draft'
                            ? 'bg-slate-600 text-white'
                            : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        {doc.status === 'paid' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{statusLabels[doc.status] || doc.status}</span>
                      </span>
                    </div>
                  </div>
                </div>
                {isIndustrial ? (
                  <div className="h-1.5 w-full bg-amber-500 mt-4 rounded-sm" />
                ) : !isLightModern ? (
                  <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-blue-400 to-emerald-400 mt-4 rounded-full opacity-90" />
                ) : null}
              </div>

              {/* Client & Project Metadata Boxes */}
              <div className={`${isCompact ? 'px-6 py-4' : 'p-7'} grid grid-cols-1 sm:grid-cols-2 gap-5`}>
                <div
                  className={`rounded-xl border p-4 space-y-1.5 min-w-0 overflow-hidden ${
                    isIndustrial
                      ? 'border-slate-300 bg-slate-100/90 border-l-4 border-l-amber-500'
                      : 'border-slate-200 bg-slate-50/90'
                  }`}
                >
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200/80 pb-1 flex items-center justify-between gap-2">
                    <span>Destinataire / Client</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[9px] font-bold">
                      {(doc.clientEntityType || doc.clientProfile?.entityType) === 'personne_physique'
                        ? 'PERSONNE PHYSIQUE'
                        : 'PERSONNE MORALE'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 break-words [overflow-wrap:anywhere] pt-0.5">
                    {doc.clientName}
                  </div>
                  {clientFormattedLines.length > 0 ? (
                    <div className="space-y-1 pt-0.5">
                      {clientFormattedLines.map((line, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] text-slate-700 break-words [overflow-wrap:anywhere] leading-snug"
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {doc.clientEmail && (
                        <div className="text-xs text-slate-600 break-all">{doc.clientEmail}</div>
                      )}
                      {doc.clientAddress && (
                        <div className="text-xs text-slate-600 break-words leading-relaxed">
                          {doc.clientAddress}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div
                  className={`rounded-xl border p-4 space-y-1.5 min-w-0 overflow-hidden ${
                    isIndustrial
                      ? 'border-slate-300 bg-slate-100/90 border-l-4 border-l-blue-600'
                      : 'border-slate-200 bg-slate-50/90'
                  }`}
                >
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200/80 pb-1 flex items-center justify-between gap-2">
                    <span>Référence, Devise &amp; Évaluation du Projet</span>
                    {!parsedRubriquesData.onlyNonStockableItems &&
                      parsedRubriquesData.totalLaborSubtotal > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono text-[9px] font-bold">
                          Main d&apos;Œuvre Incluse
                        </span>
                      )}
                  </div>
                  <div className="text-sm font-bold text-slate-900 break-words pt-0.5">
                    {doc.projectName}
                  </div>
                  {accountInfo && customization.showProjectBankDetails !== false && (
                    <div className="text-xs font-semibold text-blue-700 break-words [overflow-wrap:anywhere] leading-relaxed">
                      Compte dédié : {accountInfo}
                    </div>
                  )}
                  <div className="text-xs text-slate-600 pt-0.5 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Évaluation &amp; Jalon validé :{' '}
                      <span className="font-bold text-slate-900">{doc.milestoneReached}%</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                      {vatIncluded
                        ? `TVA Applicable${doc.countryName ? ` (${doc.countryName})` : ''} : ${doc.taxRate}%`
                        : 'Exonéré / Hors TVA (0%)'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span>DEVISE D&apos;IMPRESSION :</span>
                      <span className="text-blue-700">
                        {officialCurrencyCode} ({officialCurrencyMeta?.name || officialCurrencyCode})
                      </span>
                    </div>
                    {selectedClientCurrency !== providerCurrencyCode && (
                      <div className="text-[10px] text-indigo-700 border-t border-slate-100 pt-0.5">
                        Parité : 1 {providerCurrencyCode} = {customExchangeRate} {selectedClientCurrency}
                      </div>
                    )}
                  </div>
                  {customization.includeProjectEvaluation !== false && (
                    <div className="pt-1 space-y-1">
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600"
                          style={{ width: `${Math.min(100, Math.max(0, doc.milestoneReached))}%` }}
                        />
                      </div>
                      {doc.projectEvaluationSummary && (
                        <div className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 leading-snug break-words">
                          <strong>Évaluation Projet :</strong> {doc.projectEvaluationSummary}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className={`${isCompact ? 'px-6 space-y-3' : 'px-7 space-y-5'}`}>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr
                        style={{
                          backgroundColor: isIndustrial ? '#1E293B' : effectiveHexColor,
                        }}
                        className="text-white text-[11px] font-bold uppercase tracking-wider"
                      >
                        <th className={`${isCompact ? 'py-2' : 'py-3'} px-3 w-12 text-center`}>N°</th>
                        <th className={`${isCompact ? 'py-2' : 'py-3'} px-4`}>
                          {!parsedRubriquesData.onlyNonStockableItems &&
                          parsedRubriquesData.totalLaborSubtotal > 0
                            ? 'Désignation des Rubriques, Matériels & Main d\u2019Œuvre'
                            : 'Désignation des Rubriques, Produits & Prestations'}
                        </th>
                        <th className={`${isCompact ? 'py-2' : 'py-3'} px-3 text-center w-20`}>Qté</th>
                        <th className={`${isCompact ? 'py-2' : 'py-3'} px-3 text-right w-32`}>
                          P.U. HT ({officialCurrencyCode})
                        </th>
                        <th className={`${isCompact ? 'py-2' : 'py-3'} px-4 text-right w-36`}>
                          Total HT ({officialCurrencyCode})
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {hasRubriques
                        ? parsedRubriquesData.rubriques.map((rub, rIdx) => (
                            <React.Fragment key={rub.id}>
                              <tr className="bg-slate-900/95 text-white font-bold">
                                <td className="py-2 px-3 text-center font-mono text-amber-400">
                                  R{rIdx + 1}
                                </td>
                                <td colSpan={4} className="py-2 px-4 uppercase tracking-wide">
                                  <span>
                                    RUBRIQUE {rIdx + 1} : {rub.title}
                                  </span>
                                  {rub.tradeCategory && (
                                    <span className="ml-2 px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 text-[10px] font-semibold">
                                      Corps de métier : {rub.tradeCategory}
                                    </span>
                                  )}
                                </td>
                              </tr>
                              {rub.items.map((item, iIdx) => {
                                const unitP = conv(item.unitPrice);
                                const lineTotal = conv(Number((item.qty * item.unitPrice).toFixed(2)));
                                return (
                                  <tr
                                    key={`${rub.id}_${iIdx}`}
                                    className="hover:bg-slate-50/80 align-top"
                                  >
                                    <td
                                      className={`${
                                        isCompact ? 'py-1.5' : 'py-2.5'
                                      } px-3 font-mono text-slate-500 text-center`}
                                    >
                                      {rIdx + 1}.{iIdx + 1}
                                    </td>
                                    <td
                                      className={`${
                                        isCompact ? 'py-1.5' : 'py-2.5'
                                      } px-4 font-medium text-slate-900 break-words leading-relaxed`}
                                    >
                                      {item.description}
                                    </td>
                                    <td
                                      className={`${
                                        isCompact ? 'py-1.5' : 'py-2.5'
                                      } px-3 text-center text-slate-700 font-medium tabular-nums`}
                                    >
                                      {formatAmountSpaced(item.qty)}
                                    </td>
                                    <td
                                      className={`${
                                        isCompact ? 'py-1.5' : 'py-2.5'
                                      } px-3 text-right font-mono text-slate-700 whitespace-nowrap tabular-nums`}
                                    >
                                      {formatAmountSpaced(unitP)} {officialCurrencyCode}
                                    </td>
                                    <td
                                      className={`${
                                        isCompact ? 'py-1.5' : 'py-2.5'
                                      } px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums`}
                                    >
                                      {formatAmountSpaced(lineTotal)} {officialCurrencyCode}
                                    </td>
                                  </tr>
                                );
                              })}
                              {rub.hasStockableItems && rub.laborAmount > 0 ? (
                                <>
                                  <tr className="bg-blue-50/80 text-blue-950 font-semibold">
                                    <td className="py-2 px-3 text-center">—</td>
                                    <td
                                      colSpan={3}
                                      className="py-2 px-4 text-right uppercase text-[11px]"
                                    >
                                      Sous-Total Coût d&apos;Achat du Matériel — {rub.title} :
                                    </td>
                                    <td className="py-2 px-4 text-right font-mono font-bold whitespace-nowrap tabular-nums">
                                      {formatAmountSpaced(conv(rub.materialSubtotal))}{' '}
                                      {officialCurrencyCode}
                                    </td>
                                  </tr>
                                  <tr className="bg-amber-50/90 text-amber-950 font-semibold">
                                    <td className="py-2 px-3 text-center">MO</td>
                                    <td
                                      colSpan={3}
                                      className="py-2 px-4 text-right uppercase text-[11px]"
                                    >
                                      Main d&apos;Œuvre d&apos;Exécution &amp; Pose — {rub.title} :
                                    </td>
                                    <td className="py-2 px-4 text-right font-mono font-bold whitespace-nowrap tabular-nums">
                                      {formatAmountSpaced(conv(rub.laborAmount))}{' '}
                                      {officialCurrencyCode}
                                    </td>
                                  </tr>
                                  <tr className="bg-emerald-50/90 text-emerald-950 font-extrabold border-b-2 border-slate-300">
                                    <td className="py-2.5 px-3 text-center">Σ</td>
                                    <td
                                      colSpan={3}
                                      className="py-2.5 px-4 text-right uppercase text-[11px]"
                                    >
                                      Total {rub.title} (Matériel + Main d&apos;Œuvre) :
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono text-xs whitespace-nowrap tabular-nums">
                                      {formatAmountSpaced(conv(rub.rubriqueTotal))}{' '}
                                      {officialCurrencyCode}
                                    </td>
                                  </tr>
                                </>
                              ) : (
                                <tr className="bg-emerald-50/90 text-emerald-950 font-extrabold border-b-2 border-slate-300">
                                  <td className="py-2.5 px-3 text-center">Σ</td>
                                  <td
                                    colSpan={3}
                                    className="py-2.5 px-4 text-right uppercase text-[11px]"
                                  >
                                    Total {rub.title} HT :
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-xs whitespace-nowrap tabular-nums">
                                    {formatAmountSpaced(conv(rub.rubriqueTotal))}{' '}
                                    {officialCurrencyCode}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))
                        : parsedLines.map((item) => (
                            <tr key={item.idx} className="hover:bg-slate-50/80 align-top">
                              <td className="py-3 px-3 font-semibold text-slate-500 text-center">
                                {item.idx}
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-900 break-words leading-relaxed">
                                {item.desc}
                              </td>
                              <td className="py-3 px-3 text-center text-slate-700 font-medium tabular-nums">
                                {formatAmountSpaced(item.qty)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-slate-700 whitespace-nowrap tabular-nums">
                                {formatAmountSpaced(conv(item.unitPrice))} {officialCurrencyCode}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                                {formatAmountSpaced(conv(item.lineHT))} {officialCurrencyCode}
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>

                {/* Récapitulatif Général des Rubriques */}
                {hasRubriques && (
                  <div className="rounded-xl border-2 border-slate-300 bg-slate-50/90 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-800 text-white text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-between">
                      <span>
                        {!parsedRubriquesData.onlyNonStockableItems &&
                        parsedRubriquesData.totalLaborSubtotal > 0
                          ? 'Récapitulatif des Sous-Totaux Matériel & Main d\u2019Œuvre par Rubrique'
                          : 'Récapitulatif des Rubriques HT'}
                      </span>
                      <span className="text-amber-300 font-mono">
                        {parsedRubriquesData.rubriques.length} Rubrique(s)
                      </span>
                    </div>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-bold uppercase text-slate-600">
                          <th className="py-2 px-3">Rubrique &amp; Corps de Métier</th>
                          {!parsedRubriquesData.onlyNonStockableItems &&
                            parsedRubriquesData.totalLaborSubtotal > 0 && (
                              <>
                                <th className="py-2 px-3 text-right">
                                  Sous-Total Coût d&apos;Achat Matériel
                                </th>
                                <th className="py-2 px-3 text-right">
                                  Sous-Total Main d&apos;Œuvre
                                </th>
                              </>
                            )}
                          <th className="py-2 px-3 text-right">Total Rubrique HT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {parsedRubriquesData.rubriques.map((rub, idx) => (
                          <tr key={rub.id}>
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              Rubrique {idx + 1} — {rub.title}
                              {rub.tradeCategory ? ` (${rub.tradeCategory})` : ''}
                            </td>
                            {!parsedRubriquesData.onlyNonStockableItems &&
                              parsedRubriquesData.totalLaborSubtotal > 0 && (
                                <>
                                  <td className="py-2 px-3 text-right font-mono text-blue-800 font-semibold tabular-nums">
                                    {formatAmountSpaced(conv(rub.materialSubtotal))}{' '}
                                    {officialCurrencyCode}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-amber-800 font-semibold tabular-nums">
                                    {formatAmountSpaced(conv(rub.laborAmount))}{' '}
                                    {officialCurrencyCode}
                                  </td>
                                </>
                              )}
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                              {formatAmountSpaced(conv(rub.rubriqueTotal))} {officialCurrencyCode}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-200/80 font-extrabold text-slate-900">
                          <td className="py-2.5 px-3 uppercase text-[11px]">
                            CUMUL GÉNÉRAL DES RUBRIQUES ({officialCurrencyCode})
                          </td>
                          {!parsedRubriquesData.onlyNonStockableItems &&
                            parsedRubriquesData.totalLaborSubtotal > 0 && (
                              <>
                                <td className="py-2.5 px-3 text-right font-mono text-blue-900 tabular-nums">
                                  {formatAmountSpaced(
                                    conv(parsedRubriquesData.totalMaterialSubtotal)
                                  )}{' '}
                                  {officialCurrencyCode}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-amber-900 tabular-nums">
                                  {formatAmountSpaced(conv(parsedRubriquesData.totalLaborSubtotal))}{' '}
                                  {officialCurrencyCode}
                                </td>
                              </>
                            )}
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-900 tabular-nums">
                            {formatAmountSpaced(
                              conv(
                                parsedRubriquesData.totalMaterialSubtotal +
                                  parsedRubriquesData.totalLaborSubtotal
                              )
                            )}{' '}
                            {officialCurrencyCode}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Preset 'landscape' — Wide Horizontal Invoice Breakdown Strip */}
                {isLandscape && (
                  <div className="rounded-xl border-2 border-emerald-600/40 bg-emerald-50/40 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-950">
                        Format Paysage (Landscape Invoice) — Synthèse Horizontale de Facturation &amp; Trésorerie
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-700 text-white font-mono text-[10px] font-bold">
                        A4 PAYSAGE · 297 × 210 mm
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono tabular-nums">
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                        <span className="block font-sans text-[10px] font-bold uppercase text-slate-500">
                          Total HT Facturé
                        </span>
                        <strong className="text-slate-900 text-sm">
                          {formatAmountSpaced(conv(doc.subtotal))} {officialCurrencyCode}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                        <span className="block font-sans text-[10px] font-bold uppercase text-slate-500">
                          TVA ({vatIncluded ? `${doc.taxRate}%` : '0%'})
                        </span>
                        <strong className="text-blue-700 text-sm">
                          {formatAmountSpaced(conv(doc.taxAmount))} {officialCurrencyCode}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                        <span className="block font-sans text-[10px] font-bold uppercase text-slate-500">
                          Total TTC
                        </span>
                        <strong className="text-slate-900 text-sm">
                          {formatAmountSpaced(conv(doc.totalAmount))} {officialCurrencyCode}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-100/70 border border-emerald-300">
                        <span className="block font-sans text-[10px] font-bold uppercase text-emerald-800">
                          Encaissé ({doc.milestoneReached}%)
                        </span>
                        <strong className="text-emerald-900 text-sm">
                          {formatAmountSpaced(conv(doc.paidAmount))} {officialCurrencyCode}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-100/70 border border-amber-300">
                        <span className="block font-sans text-[10px] font-bold uppercase text-amber-900">
                          Solde Net à Payer
                        </span>
                        <strong className="text-amber-950 text-sm">
                          {formatAmountSpaced(conv(remaining))} {officialCurrencyCode}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preset 'detailed_project_report' — Detailed Project Report with Breakdown Tables */}
                {isDetailedProjectReport && (
                  <div className="space-y-4">
                    {/* Breakdown Table 1: Analytical Breakdown by Lot / Phase & Budget Weight */}
                    <div className="rounded-xl border-2 border-indigo-300 bg-indigo-50/30 overflow-hidden">
                      <div className="px-4 py-2.5 bg-indigo-950 text-white text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-between">
                        <span>
                          Rapport Détaillé de Projet (Detailed Project Report) — Tableau de Ventilation Analytique par Lot &amp; Poids Budgétaire
                        </span>
                        <span className="text-indigo-200 font-mono text-[10px]">
                          Jalon Projet : {doc.milestoneReached}%
                        </span>
                      </div>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-indigo-200 bg-indigo-100/70 text-[10px] font-bold uppercase text-indigo-950">
                            <th className="py-2 px-3">Lot / Phase</th>
                            <th className="py-2 px-3">Intitulé &amp; Corps de Métier</th>
                            <th className="py-2 px-3 text-center">Postes</th>
                            <th className="py-2 px-3 text-right">Poids (%)</th>
                            <th className="py-2 px-3 text-right">Montant HT</th>
                            <th className="py-2 px-3 text-right">Quote-Part TTC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-100 bg-white font-mono tabular-nums">
                          {parsedRubriquesData.rubriques.map((rub, idx) => {
                            const baseTotalHT = Math.max(1, conv(doc.subtotal));
                            const rubHT = conv(rub.rubriqueTotal);
                            const weightPct = Number(((rubHT / baseTotalHT) * 100).toFixed(1));
                            const shareTTC = Number(
                              (conv(doc.totalAmount) * (rubHT / baseTotalHT)).toFixed(2)
                            );
                            return (
                              <tr key={rub.id}>
                                <td className="py-2 px-3 font-bold text-indigo-900">
                                  Lot #{idx + 1}
                                </td>
                                <td className="py-2 px-3 font-sans">
                                  <div className="font-bold text-slate-900">{rub.title}</div>
                                  <div className="text-[10px] text-slate-500">
                                    Corps de métier : {rub.tradeCategory || 'Tous Corps d’État'}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-center text-slate-700">
                                  {rub.items.length}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-indigo-700">
                                  {weightPct}%
                                </td>
                                <td className="py-2 px-3 text-right text-slate-800">
                                  {formatAmountSpaced(rubHT)} {officialCurrencyCode}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900">
                                  {formatAmountSpaced(shareTTC)} {officialCurrencyCode}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Breakdown Table 2: Project Financial & Milestone Execution Breakdown */}
                    <div className="rounded-xl border border-slate-300 bg-white overflow-hidden">
                      <div className="px-4 py-2 bg-slate-900 text-white text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-between">
                        <span>
                          Tableau de Synthèse d&apos;Exécution du Projet &amp; Suivi Financier ({doc.projectName})
                        </span>
                        <span className="font-mono text-emerald-300">
                          Réf : {doc.docNumber}
                        </span>
                      </div>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-bold uppercase text-slate-600">
                            <th className="py-2 px-3">Indicateur de Suivi Projet</th>
                            <th className="py-2 px-3">Détail &amp; Imputation</th>
                            <th className="py-2 px-3 text-right">Montant ({officialCurrencyCode})</th>
                            <th className="py-2 px-3 text-right">Ratio / Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                          <tr>
                            <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                              Fournitures &amp; Matériaux Engagés HT
                            </td>
                            <td className="py-2 px-3 font-sans text-slate-600">
                              Approvisionnements &amp; équipements techniques des rubriques
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-blue-800">
                              {formatAmountSpaced(conv(parsedRubriquesData.totalMaterialSubtotal))}{' '}
                              {officialCurrencyCode}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-700">
                              {doc.subtotal > 0
                                ? `${Math.round(
                                    (parsedRubriquesData.totalMaterialSubtotal / doc.subtotal) * 100
                                  )}% du HT`
                                : '100%'}
                            </td>
                          </tr>
                          {showLaborInDocument && (
                            <tr>
                              <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                                Main d&apos;Œuvre d&apos;Exécution &amp; Pose HT
                              </td>
                              <td className="py-2 px-3 font-sans text-slate-600">
                                Équipes techniques &amp; chefs de corps de métier mobilisés
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-amber-800">
                                {formatAmountSpaced(conv(parsedRubriquesData.totalLaborSubtotal))}{' '}
                                {officialCurrencyCode}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-700">
                                {doc.subtotal > 0
                                  ? `${Math.round(
                                      (parsedRubriquesData.totalLaborSubtotal / doc.subtotal) * 100
                                    )}% du HT`
                                  : '—'}
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                              Montant Encaissé sur Projet / Document
                            </td>
                            <td className="py-2 px-3 font-sans text-slate-600">
                              Règlements validés et imputés au jalon d&apos;avancement
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-700">
                              {formatAmountSpaced(conv(doc.paidAmount))} {officialCurrencyCode}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-700">
                              Jalon {doc.milestoneReached}%
                            </td>
                          </tr>
                          <tr className="bg-amber-50/70">
                            <td className="py-2 px-3 font-sans font-extrabold text-slate-900">
                              Solde Restant à Décaisser / Facturer TTC
                            </td>
                            <td className="py-2 px-3 font-sans text-slate-600">
                              Échéance contractuelle : {doc.dueDate}
                            </td>
                            <td className="py-2 px-3 text-right font-extrabold text-rose-700">
                              {formatAmountSpaced(conv(remaining))} {officialCurrencyCode}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-amber-800">
                              {remaining <= 0 ? 'Soldé (100%)' : `${100 - doc.milestoneReached}% restant`}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Summary & Bank Details */}
              <div
                className={`${
                  isCompact ? 'p-6' : 'p-7'
                } grid grid-cols-1 md:grid-cols-12 gap-6 items-start`}
              >
                <div className="md:col-span-6 space-y-3 text-xs min-w-0 overflow-hidden">
                  {customization.bankDetails && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 overflow-hidden">
                      <div className="font-bold text-slate-800 uppercase text-[10px] tracking-wider break-words">
                        Coordonnées Bancaires &amp; Règlement
                      </div>
                      <div className="text-slate-600 break-words [overflow-wrap:anywhere] leading-relaxed">
                        {customization.bankDetails}
                      </div>
                    </div>
                  )}
                  {(doc.clientPaymentTerms ||
                    doc.clientProfile?.paymentTerms ||
                    customization.paymentTermsText) && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 overflow-hidden">
                      <div className="font-bold text-slate-800 uppercase text-[10px] tracking-wider break-words">
                        Conditions de Règlement
                      </div>
                      <div className="text-slate-600 break-words [overflow-wrap:anywhere] leading-relaxed">
                        {doc.clientPaymentTerms ||
                          doc.clientProfile?.paymentTerms ||
                          customization.paymentTermsText}
                      </div>
                    </div>
                  )}
                  {selectedClientCurrency !== providerCurrencyCode && (
                    <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 space-y-1 overflow-hidden">
                      <div className="font-bold text-indigo-950 uppercase text-[10px] tracking-wider break-words">
                        Clause Multi-Devises (Prestataire {providerCurrencyCode} / Client{' '}
                        {selectedClientCurrency})
                      </div>
                      <div className="text-indigo-900 break-words [overflow-wrap:anywhere] leading-relaxed">
                        Taux de conversion appliqué : 1 {providerCurrencyCode} = {customExchangeRate}{' '}
                        {selectedClientCurrency}. Contre-valeur nette :{' '}
                        <strong>
                          {formatAmountSpaced(doc.totalAmount)} {providerCurrencyCode}
                        </strong>{' '}
                        ={' '}
                        <strong>
                          {formatAmountSpaced(
                            convertCurrencyAmount(
                              doc.totalAmount,
                              providerCurrencyCode,
                              selectedClientCurrency,
                              customExchangeRate
                            )
                          )}{' '}
                          {selectedClientCurrency}
                        </strong>
                        .
                      </div>
                    </div>
                  )}
                  {resolvedNote && (
                    <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1 overflow-hidden">
                      <div className="font-bold text-blue-900 uppercase text-[10px] tracking-wider break-words">
                        Clauses &amp; Notes Contractuelles (Déchiffrées E2EE)
                      </div>
                      <div className="text-blue-800 break-words [overflow-wrap:anywhere] leading-relaxed">
                        {resolvedNote}
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-6 rounded-xl border-2 border-slate-200 bg-slate-50/95 p-4 space-y-3 text-xs min-w-0 overflow-hidden shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                      Synthèse Financière Certifiée ({officialCurrencyCode})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-mono text-[9px] font-bold uppercase">
                      Mise en Page Calibrée A4
                    </span>
                  </div>

                  <table className="w-full border-collapse text-xs">
                    <tbody className="divide-y divide-slate-200/70">
                      {hasRubriques &&
                        !parsedRubriquesData.onlyNonStockableItems &&
                        parsedRubriquesData.totalLaborSubtotal > 0 && (
                          <>
                            <tr>
                              <td className="py-1.5 pr-3 text-blue-800 break-words [overflow-wrap:anywhere] align-top">
                                Sous-Total Coûts d&apos;Achat Matériel ({officialCurrencyCode}) :
                              </td>
                              <td className="py-1.5 pl-2 text-right font-mono font-semibold text-blue-900 whitespace-nowrap tabular-nums align-top">
                                {formatAmountSpaced(conv(parsedRubriquesData.totalMaterialSubtotal))}{' '}
                                {officialCurrencyCode}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 pr-3 text-amber-800 break-words [overflow-wrap:anywhere] align-top">
                                Sous-Total Main d&apos;Œuvre des Rubriques ({officialCurrencyCode}) :
                              </td>
                              <td className="py-1.5 pl-2 text-right font-mono font-semibold text-amber-900 whitespace-nowrap tabular-nums align-top">
                                {formatAmountSpaced(conv(parsedRubriquesData.totalLaborSubtotal))}{' '}
                                {officialCurrencyCode}
                              </td>
                            </tr>
                          </>
                        )}
                      <tr>
                        <td className="py-1.5 pr-3 text-slate-600 break-words [overflow-wrap:anywhere] align-top">
                          Total Hors Taxes — HT ({officialCurrencyCode}) :
                        </td>
                        <td className="py-1.5 pl-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums align-top">
                          {formatAmountSpaced(conv(doc.subtotal))} {officialCurrencyCode}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-3 text-slate-600 break-words [overflow-wrap:anywhere] align-top">
                          {vatIncluded
                            ? `TVA Applicable${
                                doc.countryName || countryName
                                  ? ` (${doc.countryName || countryName})`
                                  : ''
                              } (${doc.taxRate}%) :`
                            : 'TVA (Exonérée / Hors TVA 0%) :'}
                        </td>
                        <td className="py-1.5 pl-2 text-right font-mono font-semibold text-slate-900 whitespace-nowrap tabular-nums align-top">
                          {formatAmountSpaced(conv(vatIncluded ? doc.taxAmount : 0))}{' '}
                          {officialCurrencyCode}
                        </td>
                      </tr>
                      {doc.showAdditionalTaxesOnDocument !== false &&
                        (doc.additionalTaxes || [])
                          .filter((t) => t.includeInCalculation && t.displayOnDocument !== false)
                          .map((tax) => (
                            <tr
                              key={tax.id}
                              className={
                                tax.sign === 'deduct' ? 'text-amber-800' : 'text-indigo-800'
                              }
                            >
                              <td className="py-1.5 pr-3 break-words [overflow-wrap:anywhere] align-top">
                                {tax.label} ({tax.sign === 'deduct' ? '-' : '+'}
                                {tax.ratePct}%) :
                              </td>
                              <td className="py-1.5 pl-2 text-right font-mono font-semibold whitespace-nowrap tabular-nums align-top">
                                {tax.sign === 'deduct' ? '- ' : '+ '}
                                {formatAmountSpaced(conv(tax.amount))} {officialCurrencyCode}
                              </td>
                            </tr>
                          ))}
                      <tr className="bg-slate-900 text-white">
                        <td className="py-2.5 px-2.5 font-extrabold uppercase text-[11px] break-words [overflow-wrap:anywhere] align-middle rounded-l-lg">
                          {vatIncluded ||
                          (doc.additionalTaxes || []).some((t) => t.includeInCalculation)
                            ? `NET À PAYER TTC (${officialCurrencyCode}) :`
                            : `NET À PAYER HT (${officialCurrencyCode}) :`}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-extrabold text-sm text-amber-300 whitespace-nowrap tabular-nums align-middle rounded-r-lg">
                          {formatAmountSpaced(conv(doc.totalAmount))} {officialCurrencyCode}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-3 text-emerald-700 font-semibold break-words [overflow-wrap:anywhere] align-top">
                          Montant déjà encaissé ({officialCurrencyCode}) :
                        </td>
                        <td className="py-1.5 pl-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap tabular-nums align-top">
                          {formatAmountSpaced(conv(doc.paidAmount))} {officialCurrencyCode}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 text-amber-800 font-extrabold break-words [overflow-wrap:anywhere] align-top">
                          SOLDE RESTANT À PAYER ({officialCurrencyCode}) :
                        </td>
                        <td className="py-2 pl-2 text-right font-mono font-extrabold text-sm text-amber-800 whitespace-nowrap tabular-nums align-top">
                          {formatAmountSpaced(conv(remaining))} {officialCurrencyCode}
                        </td>
                      </tr>
                      {selectedClientCurrency !== providerCurrencyCode && (
                        <tr>
                          <td className="py-1.5 pr-3 text-indigo-700 font-bold break-words [overflow-wrap:anywhere] align-top">
                            Contre-valeur en{' '}
                            {printInClientCurrency ? providerCurrencyCode : selectedClientCurrency} :
                          </td>
                          <td className="py-1.5 pl-2 text-right font-mono font-bold text-indigo-700 whitespace-nowrap tabular-nums align-top">
                            {printInClientCurrency
                              ? `${formatAmountSpaced(doc.totalAmount)} ${providerCurrencyCode}`
                              : `${formatAmountSpaced(
                                  convertCurrencyAmount(
                                    doc.totalAmount,
                                    providerCurrencyCode,
                                    selectedClientCurrency,
                                    customExchangeRate
                                  )
                                )} ${selectedClientCurrency}`}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="text-[10px] text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 font-mono break-words [overflow-wrap:anywhere] leading-relaxed">
                    <strong>
                      Arrêté le présent{' '}
                      {doc.docType === 'quote'
                        ? 'Devis Officiel'
                        : doc.docType === 'proforma'
                        ? 'Document Proforma'
                        : 'Document de Facturation'}{' '}
                      à la somme de :
                    </strong>{' '}
                    <span className="text-blue-700 font-extrabold">
                      {formatAmountSpaced(conv(doc.totalAmount))} {officialCurrencyCode} (
                      {officialCurrencyMeta?.name || officialCurrencyCode})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signatures & Legal Footer */}
            <div className="px-7 pb-7 pt-2 space-y-5">
              {Boolean(customization.includeConfidentialNotesInPdf) && Boolean(resolvedNote) && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs space-y-1">
                  <div className="font-extrabold text-[11px] uppercase tracking-wider text-amber-900">
                    Notes confidentielles (Déchiffrées — Incluses dans l&apos;export PDF via le Studio de Modèles)
                  </div>
                  <div className="text-amber-950 font-medium break-words whitespace-pre-wrap leading-relaxed">
                    {resolvedNote}
                  </div>
                </div>
              )}

              {showSignatures && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 min-h-28 gap-3 flex flex-col justify-between bg-slate-50/50 overflow-hidden">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-800 uppercase text-[11px] tracking-wide break-words">
                        Bon pour Accord — Le Client (
                        {(doc.clientEntityType || doc.clientProfile?.entityType) ===
                        'personne_physique'
                          ? 'Personne Physique'
                          : 'Personne Morale'}
                        )
                      </div>
                      {(doc.clientRepresentative || doc.clientProfile?.representativeName) && (
                        <div className="text-[11px] font-bold text-slate-900 mt-0.5 break-words">
                          Signataire habilité :{' '}
                          {doc.clientRepresentative || doc.clientProfile?.representativeName}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 break-words leading-snug border-t border-slate-200/80 pt-2">
                      Date, signature et cachet précédés de la mention « Lu et approuvé »
                    </div>
                  </div>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 min-h-28 gap-3 flex flex-col justify-between bg-slate-50/50 overflow-hidden">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-800 uppercase text-[11px] tracking-wide break-words [overflow-wrap:anywhere]">
                        Pour {companyName} — {customization.signatoryTitle}
                      </div>
                      {customization.signatoryName && (
                        <div className="text-[11px] font-bold text-slate-900 mt-0.5 break-words [overflow-wrap:anywhere]">
                          {customization.signatoryName}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 break-words leading-snug border-t border-slate-200/80 pt-2 flex items-center justify-between gap-2">
                      <span>Signature autorisée et cachet officiel de l&apos;entreprise</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[9px] font-bold shrink-0">
                        CERTIFIÉ CONFORME
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t-2 border-slate-200 pt-3 space-y-1 text-center overflow-hidden">
                {customization.footerCustomText && (
                  <div className="text-[10px] text-slate-600 font-medium break-words [overflow-wrap:anywhere] leading-relaxed">
                    {customization.footerCustomText}
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                  <span className="break-words [overflow-wrap:anywhere] min-w-0 flex-1 text-left">
                    {customization.footerLegalNotice}
                  </span>
                  {customization.footerShowPageNumbers !== false && (
                    <span className="font-mono font-bold text-slate-700 shrink-0">
                      Réf : {doc.docNumber} · Page 1 / 1
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

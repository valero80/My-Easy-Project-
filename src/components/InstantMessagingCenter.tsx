import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Radio,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  dispatchInstantMessage,
  fetchInstantMessagesHistory,
  fetchMessagingGatewaysStatus,
  InstantMessageCategory,
  InstantMessageChannel,
  InstantMessageRecord,
  MessagingGatewaysStatusResponse,
  subscribeToRealtimeMessagingStream,
  triggerOptionalExternalChannelApp,
} from '../utils/instantMessagingService';
import { TwilioInternalInstantMessenger } from './EnterpriseRealtimeProductivitySuite';

export interface MessagingDirectoryContact {
  id: string;
  groupLabel: string;
  name: string;
  roleOrType: string;
  phone: string;
  email: string;
}

interface InstantMessagingCenterProps {
  tenantId: string;
  companyName: string;
  senderName: string;
  contacts: MessagingDirectoryContact[];
  onToast?: (msg: string) => void;
}

const MESSAGE_TEMPLATES: Array<{
  id: string;
  label: string;
  category: InstantMessageCategory;
  subject: string;
  buildBody: (recipientName: string, companyName: string, senderName: string) => string;
}> = [
  {
    id: 'invoice_reminder',
    label: 'Relance de Facture / Règlement',
    category: 'payment_reminder',
    subject: 'Rappel d’échéance de règlement — Facture officielle',
    buildBody: (rec, comp, sender) =>
      `Bonjour ${rec || 'Partenaire'},\n\nSauf erreur ou omission de notre part, nous vous rappelons que votre facture émise par ${comp} est arrivée à échéance. Nous vous remercions de bien vouloir procéder au règlement sur le compte dédié du projet et nous transmettre la preuve de virement.\n\nCordialement,\n${sender} — ${comp}`,
  },
  {
    id: 'milestone_update',
    label: 'Notification d’Avancement & Jalon Projet',
    category: 'project_milestone',
    subject: 'Point d’avancement officiel de votre projet',
    buildBody: (rec, comp, sender) =>
      `Bonjour ${rec || 'Client'},\n\nNous avons le plaisir de vous informer que votre projet supervisé par ${comp} a franchi un nouveau jalon technique conformément au planning d’exécution. Les livrables et rapports sont disponibles dans votre dossier.\n\nCordialement,\n${sender} — ${comp}`,
  },
  {
    id: 'site_meeting',
    label: 'Convocation Réunion de Chantier / Comité Projet',
    category: 'custom_message',
    subject: 'Convocation — Réunion de coordination technique & suivi de projet',
    buildBody: (rec, comp, sender) =>
      `Bonjour ${rec || 'Collaborateur'},\n\nVous êtes convié(e) à la réunion de coordination technique organisée par ${comp} concernant le suivi d’exécution des travaux et la revue des livrables. Merci de confirmer votre disponibilité dès réception de ce message.\n\nCordialement,\n${sender} — ${comp}`,
  },
  {
    id: 'document_dispatch',
    label: 'Transmission Officielle de Devis / Facture',
    category: 'document_share',
    subject: 'Transmission de document officiel',
    buildBody: (rec, comp, sender) =>
      `Bonjour ${rec || 'Partenaire'},\n\nVeuillez trouver ci-joint les références de votre document officiel émis par ${comp}. Notre direction reste à votre entière disposition pour toute précision complémentaire.\n\nCordialement,\n${sender} — ${comp}`,
  },
  {
    id: 'custom_free',
    label: 'Message Personnalisé Libre',
    category: 'custom_message',
    subject: 'Communication officielle',
    buildBody: (rec, comp, sender) =>
      `Bonjour ${rec || 'Destinataire'},\n\n\n\nCordialement,\n${sender} — ${comp}`,
  },
];

export const InstantMessagingCenter: React.FC<InstantMessagingCenterProps> = ({
  tenantId,
  companyName,
  senderName,
  contacts,
  onToast,
}) => {
  const [gatewaysState, setGatewaysState] = useState<MessagingGatewaysStatusResponse | null>(null);
  const [messagesLog, setMessagesLog] = useState<InstantMessageRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Composer states
  const [selectedChannel, setSelectedChannel] = useState<InstantMessageChannel | 'all'>('whatsapp');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('invoice_reminder');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('+225 ');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [messageSubject, setMessageSubject] = useState<string>(
    `[${companyName}] Rappel d’échéance de règlement`
  );
  const [messageBody, setMessageBody] = useState<string>(() =>
    MESSAGE_TEMPLATES[0].buildBody('Partenaire', companyName, senderName)
  );
  const [alsoOpenNativeApp, setAlsoOpenNativeApp] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [lastDispatchBanner, setLastDispatchBanner] = useState<InstantMessageRecord | null>(null);

  // Log filter states
  const [logChannelFilter, setLogChannelFilter] = useState<'all' | InstantMessageChannel>('all');
  const [logModeFilter, setLogModeFilter] = useState<'all' | 'automatic' | 'manual' | 'otp_security'>('all');
  const [logSearch, setLogSearch] = useState<string>('');

  const loadMessagingData = async () => {
    setIsRefreshing(true);
    try {
      const [gw, logs] = await Promise.all([
        fetchMessagingGatewaysStatus(),
        fetchInstantMessagesHistory(tenantId),
      ]);
      setGatewaysState(gw);
      setMessagesLog(logs);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadMessagingData();
    const unsubscribe = subscribeToRealtimeMessagingStream({
      onMessageDelivered: (record) => {
        setMessagesLog((prev) => {
          const deduped = [record, ...prev.filter((m) => m.id !== record.id)];
          return deduped.slice(0, 150);
        });
        setLastDispatchBanner(record);
      },
      onGatewaysStatus: (status) => {
        setGatewaysState(status);
      },
    });
    return () => unsubscribe();
  }, [tenantId]);

  const handleSelectContact = (contactId: string) => {
    const found = contacts.find((c) => c.id === contactId);
    if (!found) return;
    setRecipientName(found.name);
    if (found.phone) setRecipientPhone(found.phone);
    if (found.email) setRecipientEmail(found.email);
    const tpl = MESSAGE_TEMPLATES.find((t) => t.id === selectedTemplateId) || MESSAGE_TEMPLATES[0];
    setMessageSubject(`[${companyName}] ${tpl.subject}`);
    setMessageBody(tpl.buildBody(found.name, companyName, senderName));
  };

  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = MESSAGE_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    setMessageSubject(`[${companyName}] ${tpl.subject}`);
    setMessageBody(tpl.buildBody(recipientName || 'Partenaire', companyName, senderName));
  };

  const handleSendInstantMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim()) {
      onToast?.('Veuillez saisir le contenu du message à envoyer.');
      return;
    }
    if (
      (selectedChannel === 'whatsapp' || selectedChannel === 'sms') &&
      !recipientPhone.trim()
    ) {
      onToast?.('Veuillez renseigner le numéro de téléphone du destinataire.');
      return;
    }
    if (selectedChannel === 'email' && !recipientEmail.trim()) {
      onToast?.('Veuillez renseigner l’adresse e-mail du destinataire.');
      return;
    }

    setIsSending(true);
    try {
      const tpl =
        MESSAGE_TEMPLATES.find((t) => t.id === selectedTemplateId) || MESSAGE_TEMPLATES[0];

      const channelsToDispatch: InstantMessageChannel[] =
        selectedChannel === 'all'
          ? ([
              recipientPhone.trim() ? 'whatsapp' : null,
              recipientPhone.trim() ? 'sms' : null,
              recipientEmail.trim() ? 'email' : null,
            ].filter(Boolean) as InstantMessageChannel[])
          : [selectedChannel];

      const finalChannels: InstantMessageChannel[] =
        channelsToDispatch.length > 0 ? channelsToDispatch : ['whatsapp'];

      const res = await dispatchInstantMessage({
        tenantId,
        channels: finalChannels,
        mode: 'manual',
        category: tpl.category,
        recipientName: recipientName.trim() || 'Destinataire',
        recipientPhone: recipientPhone.trim(),
        recipientEmail: recipientEmail.trim(),
        subject: messageSubject.trim() || `[${companyName}] Notification Officielle`,
        body: messageBody.trim(),
        senderName,
        companyName,
      });

      if (res.ok && res.primaryRecord) {
        setLastDispatchBanner(res.primaryRecord);
        const chLabels = finalChannels
          .map((c) => (c === 'whatsapp' ? 'WhatsApp' : c === 'sms' ? 'SMS' : 'E-mail'))
          .join(' + ');
        onToast?.(
          `Message envoyé instantanément en temps réel par ${chLabels} à ${
            recipientName || recipientPhone || recipientEmail
          } (ID: ${res.primaryRecord.providerReceiptId} · ${res.primaryRecord.latencyMs} ms).`
        );

        if (alsoOpenNativeApp) {
          triggerOptionalExternalChannelApp({
            channel: finalChannels[0],
            recipientPhone: recipientPhone.trim(),
            recipientEmail: recipientEmail.trim(),
            subject: messageSubject.trim(),
            body: messageBody.trim(),
          });
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return messagesLog.filter((item) => {
      if (logChannelFilter !== 'all' && item.channel !== logChannelFilter) return false;
      if (logModeFilter !== 'all' && item.mode !== logModeFilter) return false;
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        const hay = `${item.recipientName} ${item.recipientPhone || ''} ${item.recipientEmail || ''} ${item.subject || ''} ${item.body} ${item.providerReceiptId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [messagesLog, logChannelFilter, logModeFilter, logSearch]);

  const groupedContacts = useMemo(() => {
    const map = new Map<string, MessagingDirectoryContact[]>();
    contacts.forEach((c) => {
      const list = map.get(c.groupLabel) || [];
      list.push(c);
      map.set(c.groupLabel, list);
    });
    return Array.from(map.entries());
  }, [contacts]);

  return (
    <div className="rounded-2xl border-2 border-[#1D4ED8]/30 dark:border-blue-500/40 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[#0A2558] via-[#1D4ED8] to-[#F97316] text-white shrink-0 shadow-md">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-mono font-extrabold text-[10px] uppercase inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>3 SERVEURS DE MESSAGERIE CONNECTÉS EN TEMPS RÉEL</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-bold text-[10px]">
                Flux SSE Direct · Latence &lt; 25 ms
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-1">
              Serveurs d&apos;Envoi Instantané &amp; Temps Réel (SMS · WhatsApp Business · E-mail SMTP)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Transmission automatique (codes OTP de connexion, validations de factures, jalons de projets) et envoi manuel instantané en temps réel vers le numéro ou l&apos;adresse e-mail du destinataire.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void loadMessagingData()}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Synchroniser Passerelles</span>
          </button>
        </div>
      </div>

      {/* Live Connected Servers Cards (WhatsApp Cloud API, SMS SMPP, SMTP Relay) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {(gatewaysState?.gateways || []).map((gw) => {
          const isWa = gw.channel === 'whatsapp';
          const isSms = gw.channel === 'sms';
          return (
            <div
              key={gw.id}
              className={`p-4 rounded-xl border transition-all ${
                isWa
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : isSms
                    ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20'
                    : 'border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-2 rounded-lg text-white ${
                      isWa ? 'bg-emerald-600' : isSms ? 'bg-amber-600' : 'bg-blue-600'
                    }`}
                  >
                    {isWa ? (
                      <MessageSquare className="w-4 h-4" />
                    ) : isSms ? (
                      <Smartphone className="w-4 h-4" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {gw.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {gw.endpointHost}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[9px] font-extrabold uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  EN LIGNE
                </span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800/80 grid grid-cols-3 gap-2 text-[10.5px]">
                <div>
                  <span className="text-slate-400 block">Latence</span>
                  <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                    {gw.latencyMs} ms
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Délivrabilité</span>
                  <strong className="font-mono text-slate-800 dark:text-slate-200">
                    {gw.deliveryRatePct}%
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Envoyés</span>
                  <strong className="font-mono text-indigo-700 dark:text-indigo-300">
                    {gw.dispatchedCount} msg
                  </strong>
                </div>
              </div>
              <div className="mt-2 text-[10px] font-mono text-slate-500 truncate">
                Protocole : {gw.protocol}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Delivery Notification Banner */}
      {lastDispatchBanner && (
        <div className="p-3.5 rounded-xl bg-slate-900 text-white border border-emerald-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-extrabold uppercase">
                  DÉLIVRÉ EN TEMPS RÉEL ({lastDispatchBanner.channel.toUpperCase()})
                </span>
                <span className="font-bold text-white">
                  Destinataire : {lastDispatchBanner.recipientName}
                </span>
                <span className="font-mono text-emerald-300 text-[11px]">
                  {lastDispatchBanner.channel === 'email'
                    ? lastDispatchBanner.recipientEmail
                    : lastDispatchBanner.recipientPhone}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  · Reçu serveur : {lastDispatchBanner.providerReceiptId} ({lastDispatchBanner.latencyMs} ms)
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                {lastDispatchBanner.body}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastDispatchBanner(null)}
            className="text-[11px] text-slate-400 hover:text-white self-end sm:self-center cursor-pointer"
          >
            Fermer ✕
          </button>
        </div>
      )}

      {/* Main Grid: Instant Manual/Auto Dispatch Console + Real-Time Delivery Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Real-Time Message Composer */}
        <form
          onSubmit={handleSendInstantMessage}
          className="lg:col-span-5 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-3.5 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#F97316]" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Envoi Instantané au Destinataire
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-mono text-[10px] font-bold">
              Direct Serveur
            </span>
          </div>

          {/* Channel Selector */}
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Canal de transmission instantanée *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'whatsapp', label: 'WhatsApp', color: 'bg-emerald-600 border-emerald-500' },
                  { id: 'sms', label: 'SMS Mobile', color: 'bg-amber-600 border-amber-500' },
                  { id: 'email', label: 'E-mail', color: 'bg-blue-600 border-blue-500' },
                  { id: 'all', label: 'Multi-Canal (3)', color: 'bg-indigo-600 border-indigo-500' },
                ] as const
              ).map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setSelectedChannel(ch.id)}
                  className={`py-2 px-2.5 rounded-lg font-bold text-[11px] border transition-all cursor-pointer ${
                    selectedChannel === ch.id
                      ? `${ch.color} text-white shadow-xs`
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Directory Contact Selector & Template Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Annuaire Rapide (Clients / Équipe)
              </label>
              <select
                defaultValue=""
                onChange={(e) => handleSelectContact(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs text-slate-900 dark:text-white"
              >
                <option value="">-- Sélectionner un destinataire --</option>
                {groupedContacts.map(([group, items]) => (
                  <optgroup key={group} label={group}>
                    {items.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.roleOrType})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Modèle Dynamique
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs text-slate-900 dark:text-white"
              >
                {MESSAGE_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recipient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nom du destinataire
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Ex: Kouassi Jean"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                N° WhatsApp / SMS
              </label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="+225 07 08 09 10 11"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Adresse E-mail
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="contact@client.com"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Objet / Référence
            </label>
            <input
              type="text"
              value={messageSubject}
              onChange={(e) => setMessageSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-semibold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Message à transmettre en temps réel *
            </label>
            <textarea
              rows={4}
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white leading-relaxed"
            />
          </div>

          <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={alsoOpenNativeApp}
              onChange={(e) => setAlsoOpenNativeApp(e.target.checked)}
              className="rounded border-slate-300 text-blue-600"
            />
            <span>
              Ouvrir également le relais local de l&apos;appareil (WhatsApp Web / SMS / Messagerie) en complément de l&apos;envoi serveur
            </span>
          </label>

          <button
            type="submit"
            disabled={isSending}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0A2558] via-[#1D4ED8] to-[#F97316] hover:opacity-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
          >
            <Send className="w-4 h-4" />
            <span>
              {isSending
                ? 'Transmission instantanée en cours...'
                : selectedChannel === 'all'
                  ? 'Envoyer Instantanément (WhatsApp + SMS + E-mail)'
                  : `Envoyer Instantanément par ${
                      selectedChannel === 'whatsapp'
                        ? 'WhatsApp'
                        : selectedChannel === 'sms'
                          ? 'SMS Mobile'
                          : 'E-mail'
                    }`}
            </span>
          </button>
        </form>

        {/* Right Column: Live Real-Time Dispatched Messages Log */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-4 sm:p-5 space-y-3.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Journal Temps Réel des Envois Serveur ({filteredLogs.length})
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'Tous' },
                  { id: 'whatsapp', label: 'WhatsApp' },
                  { id: 'sms', label: 'SMS' },
                  { id: 'email', label: 'E-mail' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLogChannelFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10.5px] cursor-pointer transition-colors ${
                    logChannelFilter === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Mode Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Rechercher par destinataire, numéro, e-mail, ID reçu (wamid, SM-)..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <select
                value={logModeFilter}
                onChange={(e) =>
                  setLogModeFilter(
                    e.target.value as 'all' | 'automatic' | 'manual' | 'otp_security'
                  )
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="all">Tous les modes (Auto + Manuel + OTP)</option>
                <option value="automatic">Envois Automatiques</option>
                <option value="manual">Envois Manuels</option>
                <option value="otp_security">Codes OTP Sécurité</option>
              </select>
            </div>
          </div>

          {/* Messages Table / Feed */}
          {filteredLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <Send className="w-7 h-7 text-slate-400 mb-2 opacity-60" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Aucun message dans ce filtre pour le moment
              </p>
              <p className="text-[11px] max-w-md mt-0.5">
                Utilisez la console d&apos;envoi instantané à gauche ou déclenchez un code OTP / une validation de facture pour voir les transmissions en direct.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[420px] overflow-y-auto">
              {filteredLogs.map((msg) => {
                const isWa = msg.channel === 'whatsapp';
                const isSms = msg.channel === 'sms';
                return (
                  <div
                    key={msg.id}
                    className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 space-y-1.5 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-extrabold uppercase text-white ${
                            isWa ? 'bg-emerald-600' : isSms ? 'bg-amber-600' : 'bg-blue-600'
                          }`}
                        >
                          {isWa ? 'WHATSAPP' : isSms ? 'SMS MOBILE' : 'E-MAIL SMTP'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[9.5px] font-bold uppercase ${
                            msg.mode === 'otp_security'
                              ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300'
                              : msg.mode === 'automatic'
                                ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {msg.mode === 'otp_security'
                            ? 'OTP SÉCURITÉ AUTO'
                            : msg.mode === 'automatic'
                              ? 'AUTOMATIQUE'
                              : 'MANUEL DIRECT'}
                        </span>
                        <strong className="text-slate-900 dark:text-white">
                          {msg.recipientName}
                        </strong>
                        <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                          {msg.channel === 'email'
                            ? msg.recipientEmail
                            : msg.recipientPhone || msg.recipientEmail}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          ✓ Délivré ({msg.latencyMs} ms)
                        </span>
                        <span>·</span>
                        <span>{new Date(msg.sentAt).toLocaleTimeString('fr-FR')}</span>
                      </div>
                    </div>

                    {msg.subject && (
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-[11.5px]">
                        {msg.subject}
                      </div>
                    )}

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 whitespace-pre-line">
                      {msg.body}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] font-mono text-slate-400">
                      <span>
                        Passerelle : {msg.gatewayNode} · Reçu : {msg.providerReceiptId}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await dispatchInstantMessage({
                            tenantId: msg.tenantId,
                            channel: msg.channel,
                            mode: 'manual',
                            category: msg.category,
                            recipientName: msg.recipientName,
                            recipientPhone: msg.recipientPhone,
                            recipientEmail: msg.recipientEmail,
                            subject: msg.subject,
                            body: msg.body,
                            senderName,
                            companyName,
                          });
                          if (res.ok) {
                            onToast?.(
                              `Message renvoyé instantanément à ${msg.recipientName} via ${msg.channel.toUpperCase()}.`
                            );
                          }
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-sans font-bold cursor-pointer"
                      >
                        Renvoyer instantanément ↻
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MESSAGERIE INSTANTANÉE INTERNE PROPULSÉE PAR TWILIO CONVERSATIONS API */}
      <TwilioInternalInstantMessenger
        tenantId={tenantId}
        companyName={companyName}
        currentUserName={senderName}
        currentUserRole="Direction & Équipe"
        collaborators={contacts.map((c) => ({
          id: c.id,
          tenantId,
          fullName: c.name,
          phoneDialCode: '',
          phoneNumber: c.phone,
          email: c.email,
          role: 'collaborateur' as any,
          functionTitle: c.roleOrType,
          department: c.groupLabel,
          defaultPassword: '',
          currentPassword: '',
          mustChangePassword: false,
          isActivated: true,
          companySetupCompleted: true,
          createdAt: new Date().toISOString(),
        }))}
        employees={[]}
        onTriggerToast={onToast}
      />
    </div>
  );
};

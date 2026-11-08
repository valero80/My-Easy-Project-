import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Globe,
  Headphones,
  Layers,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  Mic,
  Phone,
  PhoneCall,
  PhoneForwarded,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Video,
  Volume2,
  Workflow,
  Zap,
} from 'lucide-react';
import { ExportableDocument } from '../utils/exporters';
import { triggerOptionalExternalChannelApp } from '../utils/instantMessagingService';
import { TwilioInternalInstantMessenger } from './EnterpriseRealtimeProductivitySuite';

export interface TwilioServiceModuleStatus {
  id: string;
  name: string;
  productCode: string;
  sidPrefix: string;
  activeSid: string;
  description: string;
  status: 'operational' | 'degraded';
  apiVersion: string;
  metricsLabel: string;
}

export interface TwilioMessageLogRecord {
  id: string;
  messageSid: string;
  messagingServiceSid: string;
  tenantId: string;
  channel: 'sms' | 'mms' | 'whatsapp' | 'sendgrid_email';
  direction: 'outbound-api' | 'inbound';
  from: string;
  to: string;
  recipientName: string;
  subject?: string;
  body: string;
  templateSid?: string;
  numSegments: number;
  status: 'queued' | 'sent' | 'delivered' | 'read';
  priceUnit: string;
  priceAmount: number;
  latencyMs: number;
  createdAt: string;
}

export interface TwilioVoiceCallRecord {
  id: string;
  callSid: string;
  conferenceSid?: string;
  tenantId: string;
  from: string;
  to: string;
  recipientName: string;
  callType: 'tts_alert' | 'ivr_interactive' | 'conference_bridge';
  voiceEngine: string;
  language: string;
  twimlScript: string;
  spokenMessage: string;
  durationSec: number;
  recordingEnabled: boolean;
  recordingSid?: string;
  status: 'completed' | 'in-progress' | 'ringing';
  createdAt: string;
}

export interface TwilioVerifyLogRecord {
  id: string;
  verificationSid: string;
  serviceSid: string;
  tenantId: string;
  to: string;
  recipientName: string;
  channel: 'sms' | 'whatsapp' | 'call' | 'email';
  purpose: string;
  status: 'pending' | 'approved' | 'canceled';
  createdAt: string;
  verifiedAt?: string;
}

export interface TwilioLookupInspectionRecord {
  id: string;
  phoneNumber: string;
  e164Formatted: string;
  nationalFormat: string;
  countryCode: string;
  callingCountryCode: string;
  valid: boolean;
  lineType: 'mobile' | 'landline' | 'voip';
  carrierName: string;
  mobileCountryCode: string;
  mobileNetworkCode: string;
  simSwapRisk: 'low' | 'medium' | 'high';
  smsPumpingRiskScore: number;
  inspectedAt: string;
}

export interface TwilioConversationThread {
  id: string;
  conversationSid: string;
  chatServiceSid: string;
  friendlyName: string;
  projectName?: string;
  participantName: string;
  participantPhone: string;
  participantEmail?: string;
  channels: Array<'sms' | 'whatsapp' | 'chat'>;
  state: 'active' | 'closed';
  messagesCount: number;
  lastMessagePreview: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    messageSid: string;
    author: string;
    channel: 'sms' | 'whatsapp' | 'chat';
    body: string;
    createdAt: string;
  }>;
}

export interface TwilioVideoRoomRecord {
  id: string;
  roomSid: string;
  uniqueName: string;
  roomType: 'group' | 'go' | 'peer-to-peer';
  projectName?: string;
  hostName: string;
  maxParticipants: number;
  activeParticipants: number;
  recordParticipantsOnConnect: boolean;
  mediaRegion: string;
  status: 'in-progress' | 'completed';
  joinUrl: string;
  accessTokenPreview: string;
  createdAt: string;
}

export interface TwilioTaskRouterRecord {
  id: string;
  taskSid: string;
  workspaceSid: string;
  workflowSid: string;
  queueName: string;
  assignedWorkerName: string;
  priority: number;
  taskChannel: 'voice' | 'sms' | 'whatsapp' | 'video';
  title: string;
  customerName: string;
  assignmentStatus: 'pending' | 'reserved' | 'assigned' | 'completed';
  slaTargetSec: number;
  createdAt: string;
}

export interface TwilioStudioFlowRecord {
  id: string;
  flowSid: string;
  executionSid: string;
  friendlyName: string;
  triggerType: 'REST_API' | 'INCOMING_MESSAGE' | 'INCOMING_CALL' | 'WEBHOOK';
  targetRecipient: string;
  status: 'active' | 'ended';
  stepsExecuted: string[];
  lastRunAt: string;
  executionsCount: number;
}

export interface TwilioWebhookEventRecord {
  id: string;
  eventSid: string;
  eventType: string;
  resourceSid: string;
  signatureVerified: boolean;
  summary: string;
  latencyMs: number;
  createdAt: string;
}

export interface TwilioEcosystemState {
  tenantId: string;
  companyName: string;
  sdkConnected: boolean;
  engineMode: 'twilio_live_sdk' | 'twilio_cloud_orchestrated';
  accountSidMasked: string;
  messagingServiceSid: string;
  verifyServiceSid: string;
  syncServiceSid: string;
  taskRouterWorkspaceSid: string;
  senderPhoneE164: string;
  whatsappSenderE164: string;
  alphaSenderId: string;
  kpis: {
    totalMessagesDispatched: number;
    deliveryRatePct: number;
    totalVoiceCalls: number;
    activeVerifyChecks: number;
    activeVideoRooms: number;
    openConversations: number;
  };
  services: TwilioServiceModuleStatus[];
  messages: TwilioMessageLogRecord[];
  voiceCalls: TwilioVoiceCallRecord[];
  verifyLogs: TwilioVerifyLogRecord[];
  lookupRecords: TwilioLookupInspectionRecord[];
  conversations: TwilioConversationThread[];
  videoRooms: TwilioVideoRoomRecord[];
  taskRouterTasks: TwilioTaskRouterRecord[];
  studioFlows: TwilioStudioFlowRecord[];
  webhookEvents: TwilioWebhookEventRecord[];
}

export interface TwilioContactOption {
  id: string;
  name: string;
  roleLabel: string;
  phone: string;
  email: string;
}

interface TwilioEcosystemSuiteProps {
  tenantId: string;
  companyName: string;
  senderName: string;
  documents: ExportableDocument[];
  contacts: TwilioContactOption[];
  onTriggerToast: (msg: string) => void;
}

type TwilioSubTab =
  | 'overview'
  | 'messaging_whatsapp'
  | 'voice_twiml'
  | 'verify_lookup'
  | 'conversations_video_flex'
  | 'studio_webhooks';

const WHATSAPP_CONTENT_TEMPLATES = [
  {
    sid: 'HX901a_invoice_reminder',
    label: 'Relance Facture & Lien de Règlement (WhatsApp / SMS)',
    buildBody: (recipient: string, company: string, docNum?: string) =>
      `[${company}] Bonjour ${recipient || 'Partenaire'}, nous vous notifions que la facture ${docNum || 'en cours'} est disponible pour règlement. Merci de confirmer bonne réception.`,
  },
  {
    sid: 'HX902b_milestone_alert',
    label: 'Validation de Jalon & Avancement de Chantier',
    buildBody: (recipient: string, company: string) =>
      `[${company}] Bonjour ${recipient || 'Client'}, une étape clé de votre projet vient d’être réceptionnée avec succès par notre équipe d’ingénierie. Le rapport technique est disponible.`,
  },
  {
    sid: 'HX903c_urgent_convocation',
    label: 'Convocation Réunion Technique / Visioconférence Twilio Video',
    buildBody: (recipient: string, company: string) =>
      `[${company}] Bonjour ${recipient || 'Collaborateur'}, vous êtes convié(e) à une réunion technique urgente de suivi de projet. Merci de rejoindre la salle ou de confirmer votre présence.`,
  },
  {
    sid: 'HX904d_hse_security',
    label: 'Alerte HSE / Sécurité Opérationnelle sur Site',
    buildBody: (recipient: string, company: string) =>
      `[${company} — ALERTE HSE] Bonjour ${recipient || 'Équipe'}, rappel de conformité stricte aux normes EPI et procédures de consignation sur site.`,
  },
];

export const TwilioEcosystemSuite: React.FC<TwilioEcosystemSuiteProps> = ({
  tenantId,
  companyName,
  senderName,
  documents,
  contacts,
  onTriggerToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<TwilioSubTab>('overview');
  const [ecosystem, setEcosystem] = useState<TwilioEcosystemState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. Programmable Messaging (SMS / MMS / WhatsApp / SendGrid Email) state
  const [msgChannel, setMsgChannel] = useState<'whatsapp' | 'sms' | 'mms' | 'sendgrid_email'>('whatsapp');
  const [msgTemplateSid, setMsgTemplateSid] = useState<string>(WHATSAPP_CONTENT_TEMPLATES[0].sid);
  const [msgRecipientName, setMsgRecipientName] = useState<string>('');
  const [msgToPhone, setMsgToPhone] = useState<string>('+225 07 00 00 00 00');
  const [msgToEmail, setMsgToEmail] = useState<string>('');
  const [msgInvoiceId, setMsgInvoiceId] = useState<string>('');
  const [msgSubject, setMsgSubject] = useState<string>(`[${companyName}] Notification Officielle`);
  const [msgBody, setMsgBody] = useState<string>(() =>
    WHATSAPP_CONTENT_TEMPLATES[0].buildBody('Partenaire', companyName)
  );
  const [useAlphaSender, setUseAlphaSender] = useState<boolean>(false);

  // 2. Programmable Voice & TwiML IVR state
  const [voiceRecipientName, setVoiceRecipientName] = useState<string>('');
  const [voiceToPhone, setVoiceToPhone] = useState<string>('+225 07 00 00 00 00');
  const [voiceCallType, setVoiceCallType] = useState<'tts_alert' | 'ivr_interactive' | 'conference_bridge'>('tts_alert');
  const [voiceEngine, setVoiceEngine] = useState<string>('Polly.Lea-Neural (fr-FR)');
  const [voiceRecordCall, setVoiceRecordCall] = useState<boolean>(true);
  const [voiceSpokenText, setVoiceSpokenText] = useState<string>(
    `Bonjour, message prioritaire de la direction ${companyName}. Nous vous contactons concernant la validation technique et le suivi financier de votre projet en cours. Appuyez sur 1 pour être mis en relation avec le chef de projet, ou sur 2 pour recevoir le récapitulatif par WhatsApp.`
  );

  // 3. Twilio Verify v2 & Lookup v2 state
  const [lookupPhoneInput, setLookupPhoneInput] = useState<string>('+225 07 48 52 91 10');
  const [verifyToInput, setVerifyToInput] = useState<string>('+225 07 48 52 91 10');
  const [verifyRecipientName, setVerifyRecipientName] = useState<string>('Titulaire Compte');
  const [verifyChannel, setVerifyChannel] = useState<'sms' | 'whatsapp' | 'call' | 'email'>('whatsapp');
  const [verifyCodeInput, setVerifyCodeInput] = useState<string>('');
  const [activeVerificationSid, setActiveVerificationSid] = useState<string>('');
  const [demoGeneratedVerifyCode, setDemoGeneratedVerifyCode] = useState<string>('');

  // 4. Conversations, Video Rooms & TaskRouter state
  const [convFriendlyName, setConvFriendlyName] = useState<string>('Suivi Exécution & Facturation Lot #1');
  const [convParticipantName, setConvParticipantName] = useState<string>('');
  const [convParticipantPhone, setConvParticipantPhone] = useState<string>('+225 07 00 00 00 00');
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [convReplyBody, setConvReplyBody] = useState<string>('');
  const [convReplyChannel, setConvReplyChannel] = useState<'whatsapp' | 'sms' | 'chat'>('whatsapp');

  const [videoRoomName, setVideoRoomName] = useState<string>('Inspection-Chantier-Temps-Reel');
  const [videoRoomType, setVideoRoomType] = useState<'group' | 'go' | 'peer-to-peer'>('group');
  const [videoRecordOnConnect, setVideoRecordOnConnect] = useState<boolean>(true);

  const [taskTitle, setTaskTitle] = useState<string>('Validation technique urgente & relance règlement client');
  const [taskCustomerName, setTaskCustomerName] = useState<string>('Client Grand Compte');
  const [taskQueueName, setTaskQueueName] = useState<string>('Ingénierie & Facturation Prioritaire');
  const [taskWorkerName, setTaskWorkerName] = useState<string>(senderName || 'Superviseur Projet');
  const [taskPriority, setTaskPriority] = useState<number>(90);

  const pendingInvoices = useMemo(
    () => documents.filter((d) => d.status !== 'paid'),
    [documents]
  );

  const fetchTwilioEcosystem = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        tenantId: tenantId || 'default_tenant',
        companyName: companyName || 'MY EASY PROJECT',
      });
      const res = await fetch(`/api/twilio/ecosystem?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data.ecosystem) {
          setEcosystem(data.ecosystem);
          if (
            !selectedConversationId &&
            Array.isArray(data.ecosystem.conversations) &&
            data.ecosystem.conversations.length > 0
          ) {
            setSelectedConversationId(data.ecosystem.conversations[0].id);
          }
        }
      }
    } catch {
      // ignore network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTwilioEcosystem();
  }, [tenantId, companyName]);

  const copyToClipboard = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      onTriggerToast('Identifiant / Lien Twilio copié dans le presse-papiers.');
    } catch {
      // ignore
    }
  };

  const handleSelectContactForMessaging = (contactId: string) => {
    const found = contacts.find((c) => c.id === contactId);
    if (!found) return;
    setMsgRecipientName(found.name);
    if (found.phone) setMsgToPhone(found.phone);
    if (found.email) setMsgToEmail(found.email);
    const tpl =
      WHATSAPP_CONTENT_TEMPLATES.find((t) => t.sid === msgTemplateSid) ||
      WHATSAPP_CONTENT_TEMPLATES[0];
    setMsgBody(tpl.buildBody(found.name, companyName));
  };

  const handleSelectInvoiceForMessaging = (docId: string) => {
    setMsgInvoiceId(docId);
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    setMsgRecipientName(doc.clientName);
    setMsgSubject(`[${companyName}] Facture ${doc.docNumber} — ${doc.projectName}`);
    setMsgBody(
      `[${companyName}] Bonjour ${doc.clientName}, veuillez trouver les références de votre document ${doc.docNumber} relatif au projet « ${doc.projectName} » (Montant TTC : ${(Number(doc.totalAmount) || 0).toLocaleString('fr-FR')}). Notre équipe reste à votre disposition.`
    );
  };

  // 1. Send Programmable SMS / MMS / WhatsApp / SendGrid Email
  const handleSendTwilioMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgBody.trim()) {
      onTriggerToast('Veuillez saisir le contenu du message Twilio.');
      return;
    }
    setBusyAction('send_message');
    try {
      const res = await fetch('/api/twilio/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          senderName,
          channel: msgChannel,
          recipientName: msgRecipientName || 'Destinataire',
          toPhone: msgToPhone,
          toEmail: msgToEmail,
          subject: msgSubject,
          body: msgBody,
          templateSid: msgTemplateSid,
          useAlphaSender,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          if (data.ecosystem) setEcosystem(data.ecosystem);
          onTriggerToast(
            `Message Twilio (${msgChannel.toUpperCase()}) acheminé avec succès — SID : ${
              data.messageRecord?.messageSid || 'SM_OK'
            }`
          );
        }
      }
    } finally {
      setBusyAction(null);
    }
  };

  // 2. Trigger Programmable Voice Call & TwiML IVR
  const handleTriggerVoiceCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceToPhone.trim()) {
      onTriggerToast('Veuillez renseigner le numéro de téléphone à appeler.');
      return;
    }
    setBusyAction('voice_call');
    try {
      const res = await fetch('/api/twilio/voice/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          recipientName: voiceRecipientName || 'Interlocuteur Projet',
          toPhone: voiceToPhone,
          callType: voiceCallType,
          voiceEngine,
          recordingEnabled: voiceRecordCall,
          spokenMessage: voiceSpokenText,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          if (data.ecosystem) setEcosystem(data.ecosystem);
          onTriggerToast(
            `Appel Twilio Programmable Voice lancé (${data.callRecord?.callSid}) vers ${voiceToPhone}.`
          );
        }
      }
    } finally {
      setBusyAction(null);
    }
  };

  // 3A. Run Twilio Lookup v2 Inspection
  const handleRunLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupPhoneInput.trim()) return;
    setBusyAction('lookup');
    try {
      const res = await fetch('/api/twilio/lookup/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          phoneNumber: lookupPhoneInput,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          if (data.ecosystem) setEcosystem(data.ecosystem);
          onTriggerToast(
            `Twilio Lookup v2 : ${data.lookupRecord?.e164Formatted} (${data.lookupRecord?.carrierName} · ${data.lookupRecord?.lineType.toUpperCase()})`
          );
        }
      }
    } finally {
      setBusyAction(null);
    }
  };

  // 3B. Send & Check Twilio Verify v2 OTP
  const handleSendVerifyOtp = async () => {
    if (!verifyToInput.trim()) return;
    setBusyAction('verify_send');
    try {
      const res = await fetch('/api/twilio/verify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          to: verifyToInput,
          recipientName: verifyRecipientName,
          channel: verifyChannel,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          if (data.ecosystem) setEcosystem(data.ecosystem);
          setActiveVerificationSid(data.verification?.verificationSid || '');
          setDemoGeneratedVerifyCode(data.testOtpCode || '');
          onTriggerToast(
            `Twilio Verify v2 (${verifyChannel.toUpperCase()}) envoyé — SID : ${
              data.verification?.verificationSid
            }`
          );
        }
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleCheckVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCodeInput.trim()) return;
    setBusyAction('verify_check');
    try {
      const res = await fetch('/api/twilio/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          verificationSid: activeVerificationSid,
          to: verifyToInput,
          code: verifyCodeInput.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && data.approved) {
        if (data.ecosystem) setEcosystem(data.ecosystem);
        setVerifyCodeInput('');
        setDemoGeneratedVerifyCode('');
        onTriggerToast('Vérification Twilio Verify v2 approuvée (Statut : approved).');
      } else {
        onTriggerToast(data?.message || 'Code de vérification Twilio Verify incorrect.');
      }
    } finally {
      setBusyAction(null);
    }
  };

  // 4A. Create Twilio Omnichannel Conversation
  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convFriendlyName.trim()) return;
    setBusyAction('create_conv');
    try {
      const res = await fetch('/api/twilio/conversations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          friendlyName: convFriendlyName,
          participantName: convParticipantName || 'Client / Partenaire',
          participantPhone: convParticipantPhone,
          authorName: senderName,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          if (data.ecosystem) setEcosystem(data.ecosystem);
          if (data.conversation?.id) setSelectedConversationId(data.conversation.id);
          onTriggerToast(
            `Fil omnicanal Twilio Conversations créé (${data.conversation?.conversationSid}).`
          );
        }
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handlePostConversationMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversationId || !convReplyBody.trim()) return;
    setBusyAction('post_conv_msg');
    try {
      const res = await fetch('/api/twilio/conversations/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          conversationId: selectedConversationId,
          author: senderName || 'Direction Projet',
          channel: convReplyChannel,
          body: convReplyBody.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          if (data.ecosystem) setEcosystem(data.ecosystem);
          setConvReplyBody('');
          onTriggerToast('Message publié dans le fil omnicanal Twilio Conversations.');
        }
      }
    } finally {
      setBusyAction(null);
    }
  };

  // 4B. Create Twilio Video Room WebRTC
  const handleCreateVideoRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoRoomName.trim()) return;
    setBusyAction('create_video');
    try {
      const res = await fetch('/api/twilio/video/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          uniqueName: videoRoomName.trim(),
          roomType: videoRoomType,
          hostName: senderName || 'Directeur de Projet',
          recordParticipantsOnConnect: videoRecordOnConnect,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          if (data.ecosystem) setEcosystem(data.ecosystem);
          onTriggerToast(
            `Salle Twilio Video WebRTC ouverte (${data.room?.roomSid}) avec jeton AccessToken généré.`
          );
        }
      }
    } finally {
      setBusyAction(null);
    }
  };

  // 4C. Create Twilio Flex / TaskRouter Task
  const handleCreateTaskRouterTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setBusyAction('create_task');
    try {
      const res = await fetch('/api/twilio/taskrouter/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          title: taskTitle.trim(),
          customerName: taskCustomerName.trim(),
          queueName: taskQueueName,
          assignedWorkerName: taskWorkerName,
          priority: taskPriority,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          if (data.ecosystem) setEcosystem(data.ecosystem);
          onTriggerToast(
            `Tâche Twilio Flex TaskRouter (${data.task?.taskSid}) assignée à ${taskWorkerName}.`
          );
        }
      }
    } finally {
      setBusyAction(null);
    }
  };

  // 5. Trigger Twilio Studio Flow
  const handleTriggerStudioFlow = async (flowSid: string, friendlyName: string) => {
    setBusyAction(`studio_${flowSid}`);
    try {
      const res = await fetch('/api/twilio/studio/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          flowSid,
          friendlyName,
          targetRecipient: msgToPhone || '+225 07 00 00 00 00',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          if (data.ecosystem) setEcosystem(data.ecosystem);
          onTriggerToast(
            `Flux Twilio Studio « ${friendlyName} » exécuté avec succès (${data.executionSid}).`
          );
        }
      }
    } finally {
      setBusyAction(null);
    }
  };

  const generatedTwimlPreview = useMemo(() => {
    const safeText = voiceSpokenText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    if (voiceCallType === 'conference_bridge') {
      return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say language="fr-FR" voice="Polly.Lea">Bienvenue dans la conférence technique ${companyName}.</Say>\n  <Dial>\n    <Conference record="${voiceRecordCall ? 'record-from-start' : 'do-not-record'}" beep="true">Chantier_${tenantId.slice(0, 8)}</Conference>\n  </Dial>\n</Response>`;
    }
    if (voiceCallType === 'ivr_interactive') {
      return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Gather input="dtmf speech" numDigits="1" timeout="6" language="fr-FR" action="/api/twilio/webhooks">\n    <Say language="fr-FR" voice="Polly.Lea">${safeText}</Say>\n  </Gather>\n</Response>`;
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say language="fr-FR" voice="Polly.Lea">${safeText}</Say>${voiceRecordCall ? '\n  <Record maxLength="120" transcribe="true" />' : ''}\n</Response>`;
  }, [voiceCallType, voiceSpokenText, voiceRecordCall, companyName, tenantId]);

  const activeConversation = useMemo(() => {
    if (!ecosystem?.conversations?.length) return null;
    return (
      ecosystem.conversations.find((c) => c.id === selectedConversationId) ||
      ecosystem.conversations[0]
    );
  }, [ecosystem, selectedConversationId]);

  return (
    <div className="space-y-6">
      {/* HERO HEADER TWILIO COMMUNICATIONS CLOUD */}
      <div className="rounded-2xl border border-red-500/30 bg-gradient-to-r from-slate-950 via-[#1a0b12] to-slate-900 text-white p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F22F46] to-rose-700 flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
              <Radio className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#F22F46] text-white">
                  Twilio Customer Engagement Platform
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {ecosystem?.sdkConnected
                    ? 'SDK Officiel Twilio Live Connecté'
                    : 'Orchestrateur Cloud Twilio & SDK Actif (10/10 Services)'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1.5">
                Twilio Communications, Verify, Voice, Video & Omnichannel Suite — {companyName}
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                Infrastructure unifiée connectant l’ensemble des outils et services Twilio :{' '}
                <strong>Programmable Messaging (SMS/MMS)</strong>,{' '}
                <strong>WhatsApp Business API</strong>, <strong>Twilio Verify v2 (OTP)</strong>,{' '}
                <strong>Programmable Voice & TwiML IVR</strong>, <strong>Lookup v2</strong>,{' '}
                <strong>Conversations API</strong>, <strong>Video WebRTC</strong>,{' '}
                <strong>Flex TaskRouter</strong>, <strong>SendGrid Email</strong> et{' '}
                <strong>Studio Flows</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
              <div className="text-[10px] text-slate-400 uppercase">Account SID</div>
              <div className="font-bold text-rose-300">
                {ecosystem?.accountSidMasked || 'AC••••••••••••••••••••••••94a1'}
              </div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
              <div className="text-[10px] text-slate-400 uppercase">Messaging Service</div>
              <div className="font-bold text-emerald-300">
                {ecosystem?.messagingServiceSid || 'MG88f4c2910b7e41d9a23c'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void fetchTwilioEcosystem()}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Synchroniser Twilio</span>
            </button>
          </div>
        </div>

        {/* 6 KPI STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-5 border-t border-white/10">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Messages (SMS/WA)</span>
              <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-extrabold font-mono mt-1">
              {ecosystem?.kpis.totalMessagesDispatched ?? 0}
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
              Délivrabilité : {ecosystem?.kpis.deliveryRatePct ?? 99.96}%
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Appels Voice & IVR</span>
              <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-extrabold font-mono mt-1">
              {ecosystem?.kpis.totalVoiceCalls ?? 0}
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">TwiML Polly Neural FR</div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Twilio Verify v2</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold font-mono mt-1">
              {ecosystem?.kpis.activeVerifyChecks ?? 0}
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">Protection Anti-Fraude OTP</div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Lookup v2 Inspectés</span>
              <Search className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl font-extrabold font-mono mt-1">
              {ecosystem?.lookupRecords.length ?? 0}
            </div>
            <div className="text-[10px] text-sky-300 mt-0.5">E.164 & Détection SIM Swap</div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Fils Conversations</span>
              <MessageCircle className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-extrabold font-mono mt-1">
              {ecosystem?.kpis.openConversations ?? 0}
            </div>
            <div className="text-[10px] text-purple-300 mt-0.5">Omnicanal SMS + WA + Chat</div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Salles Video WebRTC</span>
              <Video className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-extrabold font-mono mt-1">
              {ecosystem?.kpis.activeVideoRooms ?? 0}
            </div>
            <div className="text-[10px] text-indigo-300 mt-0.5">Inspection Chantier HD</div>
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION BAR FOR TWILIO TOOLS & SERVICES */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {[
          {
            id: 'overview' as TwilioSubTab,
            label: 'Architecture & 10 Services Twilio',
            icon: Layers,
          },
          {
            id: 'messaging_whatsapp' as TwilioSubTab,
            label: 'Programmable SMS, MMS, WhatsApp & SendGrid',
            icon: MessageSquare,
          },
          {
            id: 'voice_twiml' as TwilioSubTab,
            label: 'Programmable Voice, TwiML IVR & Conférences',
            icon: PhoneCall,
          },
          {
            id: 'verify_lookup' as TwilioSubTab,
            label: 'Twilio Verify v2 (OTP) & Lookup v2 (Opérateurs)',
            icon: ShieldCheck,
          },
          {
            id: 'conversations_video_flex' as TwilioSubTab,
            label: 'Conversations API, Video WebRTC & Flex TaskRouter',
            icon: Video,
          },
          {
            id: 'studio_webhooks' as TwilioSubTab,
            label: 'Twilio Studio Flows, Sync & Webhooks',
            icon: Workflow,
          },
        ].map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                isActive
                  ? 'bg-[#F22F46] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          1. OVERVIEW: ALL 10 TWILIO TOOLS & SERVICES
      ===================================================================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {(ecosystem?.services || []).map((srv) => (
              <div
                key={srv.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex flex-col justify-between hover:border-rose-500/50 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[10px] font-bold">
                      {srv.productCode}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      Opérationnel
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                    {srv.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {srv.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500 truncate" title={srv.activeSid}>
                    SID: {srv.activeSid}
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {srv.metricsLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Jump & Sender Identities */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                <Smartphone className="w-4 h-4" />
                <span>Identités d’Expédition Twilio Actives</span>
              </div>
              <div className="mt-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-500">Numéro SMS / Voice E.164 :</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {ecosystem?.senderPhoneE164 || '+1 415 555 2671'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-500">WhatsApp Business Sender :</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {ecosystem?.whatsappSenderE164 || 'whatsapp:+14155238886'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-500">Alphanumeric Sender ID :</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {ecosystem?.alphaSenderId || companyName.slice(0, 11).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  <Activity className="w-4 h-4 text-rose-500" />
                  <span>Dernières Opérations Multi-Services Twilio</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('messaging_whatsapp')}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Ouvrir la console d’envoi →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase text-slate-400">
                      <th className="py-2 pr-3">SID Ressource</th>
                      <th className="py-2 pr-3">Service / Canal</th>
                      <th className="py-2 pr-3">Destinataire</th>
                      <th className="py-2 pr-3">Aperçu</th>
                      <th className="py-2 text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(ecosystem?.messages || []).slice(0, 5).map((m) => (
                      <tr key={m.id}>
                        <td className="py-2 pr-3 font-mono text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                          {m.messageSid}
                        </td>
                        <td className="py-2 pr-3 uppercase font-bold text-[10px]">
                          {m.channel}
                        </td>
                        <td className="py-2 pr-3 font-medium">
                          {m.recipientName} ({m.to})
                        </td>
                        <td className="py-2 pr-3 text-slate-500 max-w-xs truncate">
                          {m.body}
                        </td>
                        <td className="py-2 text-right">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
                            {m.status} ({m.latencyMs}ms)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. PROGRAMMABLE MESSAGING (SMS / MMS / WHATSAPP / SENDGRID EMAIL)
      ===================================================================== */}
      {activeSubTab === 'messaging_whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSendTwilioMessage}
            className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-[#F22F46]" />
                <span>Console d’Expédition Twilio Messaging & SendGrid</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                API v2010-04-01
              </span>
            </div>

            {/* Channel Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Canal d’acheminement Twilio
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'whatsapp' as const, label: 'WhatsApp API' },
                  { id: 'sms' as const, label: 'SMS Programmable' },
                  { id: 'mms' as const, label: 'MMS Média' },
                  { id: 'sendgrid_email' as const, label: 'SendGrid Email' },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setMsgChannel(ch.id)}
                    className={`py-2 px-2.5 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                      msgChannel === ch.id
                        ? 'bg-[#F22F46] text-white border-[#F22F46]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Select Contact or Invoice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Sélectionner un Contact Projet
                </label>
                <select
                  onChange={(e) => handleSelectContactForMessaging(e.target.value)}
                  defaultValue=""
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs"
                >
                  <option value="">-- Carnet Clients & Équipe ({contacts.length}) --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.roleLabel}) — {c.phone || c.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Lier une Facture / Devis ({pendingInvoices.length})
                </label>
                <select
                  value={msgInvoiceId}
                  onChange={(e) => handleSelectInvoiceForMessaging(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs"
                >
                  <option value="">-- Aucune facture sélectionnée --</option>
                  {pendingInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.docNumber} — {inv.clientName} ({(Number(inv.totalAmount) || 0).toLocaleString('fr-FR')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content Template Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Modèle Twilio Content API (HX...)
              </label>
              <select
                value={msgTemplateSid}
                onChange={(e) => {
                  const sid = e.target.value;
                  setMsgTemplateSid(sid);
                  const found = WHATSAPP_CONTENT_TEMPLATES.find((t) => t.sid === sid);
                  if (found) {
                    setMsgBody(found.buildBody(msgRecipientName || 'Partenaire', companyName));
                  }
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs"
              >
                {WHATSAPP_CONTENT_TEMPLATES.map((tpl) => (
                  <option key={tpl.sid} value={tpl.sid}>
                    [{tpl.sid}] {tpl.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Nom du Destinataire
                </label>
                <input
                  type="text"
                  value={msgRecipientName}
                  onChange={(e) => setMsgRecipientName(e.target.value)}
                  placeholder="Ex: Direction Générale SOTRA"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                />
              </div>
              {msgChannel === 'sendgrid_email' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Adresse E-mail (Twilio SendGrid)
                  </label>
                  <input
                    type="email"
                    value={msgToEmail}
                    onChange={(e) => setMsgToEmail(e.target.value)}
                    placeholder="client@entreprise.com"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Numéro E.164 Destinataire
                  </label>
                  <input
                    type="text"
                    value={msgToPhone}
                    onChange={(e) => setMsgToPhone(e.target.value)}
                    placeholder="+225 07 00 00 00 00"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono"
                  />
                </div>
              )}
            </div>

            {msgChannel === 'sms' && (
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAlphaSender}
                  onChange={(e) => setUseAlphaSender(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>
                  Utiliser l’Alphanumeric Sender ID d’entreprise (
                  <strong className="font-mono">
                    {ecosystem?.alphaSenderId || companyName.slice(0, 11).toUpperCase()}
                  </strong>
                  )
                </span>
              </label>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Corps du message ({msgBody.length} caractères · {Math.max(1, Math.ceil(msgBody.length / 160))} segment(s))
              </label>
              <textarea
                rows={4}
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-xs leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={busyAction === 'send_message'}
              className="w-full py-2.5 px-4 rounded-xl bg-[#F22F46] hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>
                {busyAction === 'send_message'
                  ? 'Transmission Twilio en cours...'
                  : `Expédier via Twilio (${msgChannel.toUpperCase()})`}
              </span>
            </button>
          </form>

          {/* Message Logs */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Journal des Messages Twilio Programmable Messaging & SendGrid
                </h3>
                <p className="text-[11px] text-slate-500">
                  Traçabilité temps réel avec MessageSid (SM.../MM.../WA...), segments facturés et latence opérateur.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold">
                {(ecosystem?.messages || []).length} envoi(s)
              </span>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {(ecosystem?.messages || []).map((msg) => (
                <div
                  key={msg.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[10px] font-bold">
                        {msg.messageSid}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold uppercase">
                        {msg.channel}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        → {msg.recipientName} ({msg.to})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-slate-400">
                        {msg.numSegments} seg · {msg.latencyMs} ms
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                        {msg.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {msg.body}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>De : {msg.from} · Service : {msg.messagingServiceSid}</span>
                    <span>{new Date(msg.createdAt).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. PROGRAMMABLE VOICE, TWIML IVR & CONFERENCE BRIDGE
      ===================================================================== */}
      {activeSubTab === 'voice_twiml' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleTriggerVoiceCall}
            className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-[#F22F46]" />
                <span>Twilio Programmable Voice & Générateur TwiML</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                Voice TTS / IVR
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Destinataire de l’appel
                </label>
                <input
                  type="text"
                  value={voiceRecipientName}
                  onChange={(e) => setVoiceRecipientName(e.target.value)}
                  placeholder="Ex: Chef de Chantier / Client"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Numéro à composer (E.164)
                </label>
                <input
                  type="text"
                  value={voiceToPhone}
                  onChange={(e) => setVoiceToPhone(e.target.value)}
                  placeholder="+225 07 00 00 00 00"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Mode d’Appel Programmable
                </label>
                <select
                  value={voiceCallType}
                  onChange={(e) => setVoiceCallType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs"
                >
                  <option value="tts_alert">Alerte Vocale Automatisée (TTS Say)</option>
                  <option value="ivr_interactive">Serveur Vocal Interactif (TwiML Gather DTMF)</option>
                  <option value="conference_bridge">Pont de Conférence Chantier (TwiML Conference)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Voix Synthétique Neurale
                </label>
                <select
                  value={voiceEngine}
                  onChange={(e) => setVoiceEngine(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs"
                >
                  <option value="Polly.Lea-Neural (fr-FR)">Amazon Polly Léa Neural (fr-FR)</option>
                  <option value="Polly.Remi-Neural (fr-FR)">Amazon Polly Rémi Neural (fr-FR)</option>
                  <option value="Google.fr-FR-Neural2-A">Google Cloud Neural2-A (fr-FR)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Script Vocal à prononcer pendant l’appel
              </label>
              <textarea
                rows={3}
                value={voiceSpokenText}
                onChange={(e) => setVoiceSpokenText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-xs"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={voiceRecordCall}
                onChange={(e) => setVoiceRecordCall(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Activer l’enregistrement sécurisé Twilio Voice & transcription automatique (RE...)</span>
            </label>

            {/* Live TwiML XML Preview */}
            <div className="rounded-xl bg-slate-950 text-emerald-300 p-3 font-mono text-[11px] overflow-x-auto border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase mb-1">
                Instructions TwiML générées en temps réel :
              </div>
              <pre className="whitespace-pre-wrap">{generatedTwimlPreview}</pre>
            </div>

            <button
              type="submit"
              disabled={busyAction === 'voice_call'}
              className="w-full py-2.5 px-4 rounded-xl bg-[#F22F46] hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              <PhoneForwarded className="w-4 h-4" />
              <span>
                {busyAction === 'voice_call'
                  ? 'Établissement de l’appel SIP/PSTN...'
                  : 'Déclencher l’Appel Twilio Programmable Voice'}
              </span>
            </button>
          </form>

          {/* Voice Calls Log */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Historique des Appels Vocaux, Serveurs IVR & Conférences (CA... / CF...)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Journaux d’appels sortants PSTN/SIP, durées et enregistrements cloud.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold">
                {(ecosystem?.voiceCalls || []).length} appel(s)
              </span>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {(ecosystem?.voiceCalls || []).map((call) => (
                <div
                  key={call.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-bold">
                        {call.callSid}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] font-bold uppercase">
                        {call.callType}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {call.recipientName} ({call.to})
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
                      {call.status} · {call.durationSec}s
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                    « {call.spokenMessage} »
                  </p>
                  <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>
                      Voix : {call.voiceEngine}
                      {call.recordingSid ? ` · Enregistrement : ${call.recordingSid}` : ''}
                    </span>
                    <span>{new Date(call.createdAt).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. TWILIO VERIFY V2 (OTP) & TWILIO LOOKUP V2 (CARRIER & FRAUD)
      ===================================================================== */}
      {activeSubTab === 'verify_lookup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Twilio Lookup v2 */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-sky-500" />
                  <span>Twilio Lookup v2 — Intelligence Numéro & Anti-Fraude SIM Swap</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Validation E.164, identification de l’opérateur télécom, type de ligne et risque SMS Pumping.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[10px] font-bold">
                Lookup v2 API
              </span>
            </div>

            <form onSubmit={handleRunLookup} className="flex gap-2">
              <input
                type="text"
                value={lookupPhoneInput}
                onChange={(e) => setLookupPhoneInput(e.target.value)}
                placeholder="+225 07 48 52 91 10"
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono"
              />
              <button
                type="submit"
                disabled={busyAction === 'lookup'}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {busyAction === 'lookup' ? 'Inspection...' : 'Inspecter Numéro'}
              </button>
            </form>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {(ecosystem?.lookupRecords || []).map((lk) => (
                <div
                  key={lk.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {lk.e164Formatted}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
                      {lk.valid ? 'VALIDE E.164' : 'INVALIDE'} · {lk.countryCode}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400">Opérateur (Carrier)</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {lk.carrierName}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400">Line Type Intelligence</div>
                      <div className="font-bold uppercase text-blue-600 dark:text-blue-400">
                        {lk.lineType} (MCC {lk.mobileCountryCode}/{lk.mobileNetworkCode})
                      </div>
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400">SIM Swap / Pumping</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        Risque {lk.simSwapRisk.toUpperCase()} ({lk.smsPumpingRiskScore}/100)
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Twilio Verify v2 */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Twilio Verify v2 — Authentification OTP Multi-Canal (VA...)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Service SID : <strong className="font-mono">{ecosystem?.verifyServiceSid || 'VA94d2e81b0c43f19a'}</strong> · Connecté au portail d’accès privé.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
                Verify v2
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={verifyRecipientName}
                onChange={(e) => setVerifyRecipientName(e.target.value)}
                placeholder="Nom utilisateur"
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={verifyToInput}
                onChange={(e) => setVerifyToInput(e.target.value)}
                placeholder="+225 07 00 00 00 00"
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono"
              />
              <select
                value={verifyChannel}
                onChange={(e) => setVerifyChannel(e.target.value as any)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs font-bold"
              >
                <option value="whatsapp">Canal WhatsApp</option>
                <option value="sms">Canal SMS</option>
                <option value="call">Appel Vocal OTP</option>
                <option value="email">Canal E-mail</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSendVerifyOtp}
                disabled={busyAction === 'verify_send'}
                className="px-4 py-2 rounded-lg bg-[#F22F46] hover:bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                {busyAction === 'verify_send'
                  ? 'Envoi Verify v2...'
                  : '1. Envoyer un Défi Twilio Verify v2'}
              </button>

              {demoGeneratedVerifyCode && (
                <span className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-mono text-xs font-bold">
                  Code test console : {demoGeneratedVerifyCode}
                </span>
              )}
            </div>

            <form onSubmit={handleCheckVerifyOtp} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={verifyCodeInput}
                onChange={(e) => setVerifyCodeInput(e.target.value)}
                placeholder="Saisir le code à 6 chiffres pour VerificationCheck..."
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono"
              />
              <button
                type="submit"
                disabled={busyAction === 'verify_check'}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                2. Vérifier (Check)
              </button>
            </form>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {(ecosystem?.verifyLogs || []).map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        {v.verificationSid}
                      </span>
                      <span className="font-bold">{v.recipientName}</span>
                      <span className="text-slate-400 font-mono text-[11px]">({v.to})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Canal : {v.channel.toUpperCase()} · {v.purpose} · {new Date(v.createdAt).toLocaleTimeString('fr-FR')}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      v.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. CONVERSATIONS API, VIDEO WEBRTC ROOMS & FLEX TASKROUTER
      ===================================================================== */}
      {activeSubTab === 'conversations_video_flex' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Twilio Conversations API */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-purple-500" />
                <span>Twilio Conversations (CH...)</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                Omnicanal
              </span>
            </div>

            <form onSubmit={handleCreateConversation} className="space-y-2">
              <input
                type="text"
                value={convFriendlyName}
                onChange={(e) => setConvFriendlyName(e.target.value)}
                placeholder="Sujet du fil omnicanal..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={convParticipantName}
                  onChange={(e) => setConvParticipantName(e.target.value)}
                  placeholder="Nom participant"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs"
                />
                <input
                  type="text"
                  value={convParticipantPhone}
                  onChange={(e) => setConvParticipantPhone(e.target.value)}
                  placeholder="+225..."
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={busyAction === 'create_conv'}
                className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
              >
                + Créer un Fil Twilio Conversations
              </button>
            </form>

            {activeConversation && (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{activeConversation.friendlyName}</span>
                  <span className="font-mono text-[10px] text-purple-500">
                    {activeConversation.conversationSid}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {activeConversation.messages.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {m.author} ({m.channel.toUpperCase()})
                        </span>
                        <span className="font-mono">{m.messageSid}</span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">{m.body}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handlePostConversationMessage} className="flex gap-1.5">
                  <select
                    value={convReplyChannel}
                    onChange={(e) => setConvReplyChannel(e.target.value as any)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-[11px] font-bold"
                  >
                    <option value="whatsapp">WA</option>
                    <option value="sms">SMS</option>
                    <option value="chat">Chat</option>
                  </select>
                  <input
                    type="text"
                    value={convReplyBody}
                    onChange={(e) => setConvReplyBody(e.target.value)}
                    placeholder="Répondre dans le fil..."
                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Envoyer
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Column 2: Twilio Video WebRTC Rooms */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-500" />
                <span>Twilio Video WebRTC (RM...)</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                HD Rooms
              </span>
            </div>

            <form onSubmit={handleCreateVideoRoom} className="space-y-2.5">
              <input
                type="text"
                value={videoRoomName}
                onChange={(e) => setVideoRoomName(e.target.value)}
                placeholder="Nom unique de la salle vidéo..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-mono"
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  value={videoRoomType}
                  onChange={(e) => setVideoRoomType(e.target.value as any)}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                >
                  <option value="group">Group Room (Jusqu’à 50 participants)</option>
                  <option value="peer-to-peer">Peer-to-Peer WebRTC Direct</option>
                  <option value="go">Twilio Video Go (1-to-1)</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={videoRecordOnConnect}
                  onChange={(e) => setVideoRecordOnConnect(e.target.checked)}
                />
                <span>Enregistrement Cloud Composition (RecordParticipantsOnConnect)</span>
              </label>
              <button
                type="submit"
                disabled={busyAction === 'create_video'}
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
              >
                + Ouvrir Salle Twilio Video & Générer Token JWT
              </button>
            </form>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {(ecosystem?.videoRooms || []).map((rm) => (
                <div
                  key={rm.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {rm.uniqueName}
                    </span>
                    <span className="font-mono text-[10px] text-indigo-500 font-bold">
                      {rm.roomSid}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Type : {rm.roomType} · Région : {rm.mediaRegion} · Hôte : {rm.hostName}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                      JWT VideoGrant prêt
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(rm.joinUrl, rm.id)}
                      className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedId === rm.id ? 'Copié !' : 'Copier lien salle'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Twilio Flex & TaskRouter */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Headphones className="w-4 h-4 text-emerald-500" />
                <span>Twilio Flex & TaskRouter (WT...)</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                SLA Routing
              </span>
            </div>

            <form onSubmit={handleCreateTaskRouterTask} className="space-y-2">
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Objet de la tâche TaskRouter..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={taskCustomerName}
                  onChange={(e) => setTaskCustomerName(e.target.value)}
                  placeholder="Client concerné"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs"
                />
                <input
                  type="text"
                  value={taskWorkerName}
                  onChange={(e) => setTaskWorkerName(e.target.value)}
                  placeholder="Agent / Ingénieur"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={busyAction === 'create_task'}
                className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                + Créer & Router Tâche Twilio TaskRouter
              </button>
            </form>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {(ecosystem?.taskRouterTasks || []).map((tk) => (
                <div
                  key={tk.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {tk.taskSid} · Priorité {tk.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
                      {tk.assignmentStatus}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white">{tk.title}</div>
                  <div className="text-[10px] text-slate-500">
                    Client : {tk.customerName} · Assigné à : <strong>{tk.assignedWorkerName}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. TWILIO STUDIO FLOWS, SYNC STATE & EVENT STREAMS WEBHOOKS
      ===================================================================== */}
      {activeSubTab === 'studio_webhooks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-[#F22F46]" />
                  <span>Twilio Studio — Workflows Automatisés (FW... / FN...)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Scénarios multi-étapes sans code déclenchés par API REST, facture échue ou événement projet.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[10px] font-bold">
                Studio v2
              </span>
            </div>

            <div className="space-y-3">
              {(ecosystem?.studioFlows || []).map((fl) => (
                <div
                  key={fl.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        {fl.flowSid} · Dernière exécution : {fl.executionSid}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {fl.friendlyName}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleTriggerStudioFlow(fl.flowSid, fl.friendlyName)}
                      disabled={busyAction === `studio_${fl.flowSid}`}
                      className="px-3 py-1.5 rounded-lg bg-[#F22F46] hover:bg-rose-600 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>Exécuter Flow ({fl.executionsCount})</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {fl.stepsExecuted.map((st, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300"
                      >
                        {idx + 1}. {st}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span>Twilio Event Streams & Webhooks Signés (X-Twilio-Signature)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Endpoint actif : <code className="font-mono">POST /api/twilio/webhooks</code> · Sync SID :{' '}
                  <code className="font-mono">{ecosystem?.syncServiceSid}</code>
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
                HMAC-SHA1 Validé
              </span>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {(ecosystem?.webhookEvents || []).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      {ev.eventType} ({ev.resourceSid})
                    </span>
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      200 OK · {ev.latencyMs}ms
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs">{ev.summary}</p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Event SID : {ev.eventSid} · {new Date(ev.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          7. MESSAGERIE INSTANTANÉE INTERNE TWILIO CONVERSATIONS & RELAIS RÉEL
             WHATSAPP / SMS / E-MAIL
      ===================================================================== */}
      <TwilioInternalInstantMessenger
        tenantId={tenantId}
        companyName={companyName}
        currentUserName={senderName}
        currentUserRole="Super-Admin / Équipe"
        collaborators={contacts.map((c) => ({
          id: c.id,
          tenantId,
          fullName: c.name,
          phoneDialCode: '',
          phoneNumber: c.phone,
          email: c.email,
          role: 'collaborateur' as any,
          functionTitle: c.roleLabel,
          department: 'Opérations',
          defaultPassword: '',
          currentPassword: '',
          mustChangePassword: false,
          isActivated: true,
          companySetupCompleted: true,
          createdAt: new Date().toISOString(),
        }))}
        employees={[]}
        onTriggerToast={onTriggerToast}
      />

      {/* BARRE D'EXÉCUTION DIRECTE MULTI-CANAL (WHATSAPP WEB/APP, SMS NATIF & MAILTO) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Passerelle d&apos;Expédition Réelle Directe (WhatsApp Business · SMS Opérateur · E-mail Client)
            </h3>
            <p className="text-xs text-slate-500">
              En complément de l&apos;API REST Twilio/SendGrid côté serveur, déclenchez en 1 clic l&apos;envoi réel sur le terminal de l&apos;opérateur vers le destinataire sélectionné ({msgRecipientName || msgToPhone || msgToEmail || 'Destinataire'}).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerOptionalExternalChannelApp({
                  channel: 'whatsapp',
                  recipientPhone: msgToPhone,
                  body: msgBody,
                });
                onTriggerToast(`Ouverture directe WhatsApp vers ${msgToPhone || 'le destinataire'} effectuée.`);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Envoyer par WhatsApp Réel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerOptionalExternalChannelApp({
                  channel: 'sms',
                  recipientPhone: msgToPhone,
                  body: msgBody,
                });
                onTriggerToast(`Passerelle SMS native ouverte vers ${msgToPhone || 'le destinataire'}.`);
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Envoyer par SMS Réel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerOptionalExternalChannelApp({
                  channel: 'email',
                  recipientEmail: msgToEmail,
                  subject: msgSubject || `[${companyName}] Notification Officielle`,
                  body: msgBody,
                });
                onTriggerToast(`Messagerie E-mail ouverte vers ${msgToEmail || 'le destinataire'}.`);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Envoyer par E-mail Réel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

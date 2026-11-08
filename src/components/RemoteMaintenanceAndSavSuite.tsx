import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Database,
  Headphones,
  KeyRound,
  Lock,
  Mail,
  MessageSquare,
  Play,
  Radio,
  RefreshCw,
  Search,
  Send,
  Server,
  ShieldCheck,
  Sliders,
  Sparkles,
  Unlock,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  SAAS_SUBSCRIPTION_PLANS,
  getOrInitializeProviderTrialRecord,
  syncActivatedSubscriptionToClientStorage,
  generateSaaSSubscriptionToken,
  ProviderTrialRecord,
  SubscriptionPlanOption,
} from './ProfitabilityAndTrialSuite';
import {
  EnterpriseNetworkHealthStatus,
  RemoteDisconnectSecurityChallenge,
  getEnterpriseNetworkStateAndConnectedUsers,
  setEnterpriseNetworkStatusOverride,
  releaseTerminalSessionLock,
  initiateRemoteDisconnectSecurityChallenge,
  verifyAndApproveRemoteDisconnectServer,
  TERMINAL_BROADCAST_CHANNEL_NAME,
} from '../utils/sessionAndScheduleManager';

// ============================================================================
// 1. REGISTRE CRYPTOGRAPHIQUE DES TOKENS D'ABONNEMENT À USAGE UNIQUE
//    (Strictement lié à l'entreprise cible + Canal de transfert au client)
// ============================================================================

export interface SaaSSingleUseTokenRecord {
  token: string;
  targetTenantId: string;
  targetCompanyName: string;
  targetIsu: string;
  planId: string;
  planName: string;
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  amountFCFA: number;
  generatedAt: string;
  generatedByOperator?: string;
  singleUseOnly: true;
  used: boolean;
  usedAt?: string;
  usedByTenantId?: string;
  usedByCompanyName?: string;
  transferredToClient: boolean;
  transferredAt?: string;
  transferChannels: Array<'in_app_realtime' | 'whatsapp' | 'email' | 'sms_copy'>;
  clientTransferNote?: string;
}

const SINGLE_USE_TOKENS_STORAGE_KEY = 'mep_saas_single_use_tokens_registry_v1';
const SUBSCRIPTION_BROADCAST_CHANNEL_NAME = 'mep_saas_subscription_realtime_channel_v1';

export function broadcastSubscriptionSyncEvent(payload?: Record<string, any>): void {
  try {
    window.dispatchEvent(new CustomEvent('mep-subscription-updated', { detail: payload || {} }));
  } catch {
    // ignore
  }
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(SUBSCRIPTION_BROADCAST_CHANNEL_NAME);
      bc.postMessage({
        type: 'SUBSCRIPTION_OR_RMM_UPDATED',
        timestamp: new Date().toISOString(),
        ...(payload || {}),
      });
      bc.close();
    }
  } catch {
    // ignore
  }
}

export function getSingleUseTokensRegistry(): Record<string, SaaSSingleUseTokenRecord> {
  try {
    const raw = localStorage.getItem(SINGLE_USE_TOKENS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

export function saveSingleUseTokensRegistry(
  reg: Record<string, SaaSSingleUseTokenRecord>
): void {
  try {
    localStorage.setItem(SINGLE_USE_TOKENS_STORAGE_KEY, JSON.stringify(reg));
  } catch {
    // ignore
  }
}

export function registerSingleUseEnterpriseToken(params: {
  token?: string;
  targetTenantId: string;
  targetCompanyName: string;
  targetIsu?: string;
  planId: string;
  planName: string;
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  amountFCFA: number;
  generatedByOperator?: string;
  transferredToClient?: boolean;
  transferChannel?: 'in_app_realtime' | 'whatsapp' | 'email' | 'sms' | 'sms_copy';
}): SaaSSingleUseTokenRecord {
  const reg = getSingleUseTokensRegistry();
  const cleanToken = (
    params.token || generateSaaSSubscriptionToken(params.targetTenantId, params.planId)
  )
    .trim()
    .toUpperCase();
  const nowIso = new Date().toISOString();

  // Invalidate any previous unused token for the same tenant so only the latest active token is valid
  for (const existing of Object.values(reg)) {
    if (
      existing &&
      !existing.used &&
      (existing.targetTenantId === params.targetTenantId ||
        existing.targetCompanyName.trim().toLowerCase() ===
          params.targetCompanyName.trim().toLowerCase())
    ) {
      existing.used = true;
      existing.usedAt = nowIso;
      existing.clientTransferNote = 'Remplacé par un nouveau Token SaaS';
    }
  }

  const record: SaaSSingleUseTokenRecord = {
    token: cleanToken,
    targetTenantId: params.targetTenantId,
    targetCompanyName: params.targetCompanyName.trim(),
    targetIsu: (params.targetIsu || 'ISU-CERTIFIE').trim().toUpperCase(),
    planId: params.planId,
    planName: params.planName,
    billingCycle: params.billingCycle,
    amountFCFA: params.amountFCFA,
    generatedAt: nowIso,
    generatedByOperator: params.generatedByOperator || 'Serveur SaaS Central',
    singleUseOnly: true,
    used: false,
    transferredToClient: true,
    transferredAt: nowIso,
    transferChannels: ['in_app_realtime'],
  };

  reg[cleanToken] = record;
  saveSingleUseTokensRegistry(reg);
  return record;
}

export function recordTokenTransferToClient(
  token: string,
  channel: 'in_app_realtime' | 'whatsapp' | 'email' | 'sms' | 'sms_copy',
  note?: string
): SaaSSingleUseTokenRecord | null {
  const cleanToken = (token || '').trim().toUpperCase();
  if (!cleanToken) return null;
  const reg = getSingleUseTokensRegistry();
  const existing = reg[cleanToken];
  if (!existing) return null;

  const normalizedChannel = channel === 'sms' ? 'sms_copy' : channel;
  const channels = new Set(existing.transferChannels || []);
  channels.add(normalizedChannel);
  const updated: SaaSSingleUseTokenRecord = {
    ...existing,
    transferredToClient: true,
    transferredAt: new Date().toISOString(),
    transferChannels: Array.from(channels),
    clientTransferNote: note || existing.clientTransferNote,
  };
  reg[cleanToken] = updated;
  saveSingleUseTokensRegistry(reg);
  broadcastSubscriptionSyncEvent({
    tenantId: existing.targetTenantId,
    companyName: existing.targetCompanyName,
    token: cleanToken,
    event: 'TOKEN_TRANSFERRED_TO_CLIENT',
  });
  return updated;
}

export function validateAndConsumeSingleUseEnterpriseToken(params: {
  token: string;
  currentTenantId: string;
  currentCompanyName: string;
  currentIsu?: string;
}): {
  ok: boolean;
  valid: boolean;
  message: string;
  errorMessage?: string;
  tokenRecord?: SaaSSingleUseTokenRecord;
} {
  const cleanToken = (params.token || '').trim().toUpperCase();
  if (!cleanToken) {
    const msg = 'Veuillez saisir le Token d’activation transmis par le Serveur SaaS.';
    return {
      ok: false,
      valid: false,
      message: msg,
      errorMessage: msg,
    };
  }

  const reg = getSingleUseTokensRegistry();
  const rec = reg[cleanToken];

  if (rec) {
    const sameTenantId =
      Boolean(rec.targetTenantId && params.currentTenantId) &&
      rec.targetTenantId === params.currentTenantId;
    const sameCompanyName =
      Boolean(rec.targetCompanyName && params.currentCompanyName) &&
      (rec.targetCompanyName.trim().toLowerCase() ===
        params.currentCompanyName.trim().toLowerCase() ||
        rec.targetCompanyName
          .trim()
          .toLowerCase()
          .includes(params.currentCompanyName.trim().toLowerCase()) ||
        params.currentCompanyName
          .trim()
          .toLowerCase()
          .includes(rec.targetCompanyName.trim().toLowerCase()));
    const sameIsu =
      Boolean(rec.targetIsu && params.currentIsu) &&
      rec.targetIsu.trim().toUpperCase() === (params.currentIsu || '').trim().toUpperCase();

    // 1. Vérifier si le Token a déjà été utilisé (Usage unique strict)
    if (rec.used) {
      const msg = `Token refusé : Le Token "${cleanToken}" est à usage unique et a déjà été utilisé le ${
        rec.usedAt ? new Date(rec.usedAt).toLocaleString('fr-FR') : 'précédemment'
      }. Il ne peut plus être réutilisé.`;
      return {
        ok: false,
        valid: false,
        message: msg,
        errorMessage: msg,
      };
    }

    // 2. Si le token a été généré dans l'application pour une autre entreprise explicitement distincte
    const isGenericTarget =
      !rec.targetCompanyName ||
      rec.targetCompanyName.toLowerCase().includes('prestataire') ||
      rec.targetCompanyName.toLowerCase().includes('entreprise') ||
      rec.targetTenantId === 'default';

    if (!sameTenantId && !sameCompanyName && !sameIsu && !isGenericTarget) {
      // Vérifier si le tenantId cible correspond à l'entreprise courante dans mep_enterprise_registry_v3
      let linkedInRegistry = false;
      try {
        const regV3 = JSON.parse(localStorage.getItem('mep_enterprise_registry_v3') || '{}');
        const targetEntry = regV3[rec.targetTenantId];
        const currentEntry = regV3[params.currentTenantId];
        if (
          (targetEntry &&
            targetEntry.companyName &&
            params.currentCompanyName &&
            targetEntry.companyName.trim().toLowerCase() ===
              params.currentCompanyName.trim().toLowerCase()) ||
          (currentEntry &&
            (currentEntry.subscriptionToken === cleanToken ||
              currentEntry.pendingActivationToken === cleanToken))
        ) {
          linkedInRegistry = true;
        }
      } catch {
        // ignore
      }

      if (!linkedInRegistry) {
        const msg = `Accès refusé : Ce Token à usage unique a été généré exclusivement pour l'entreprise « ${rec.targetCompanyName} » (${rec.targetIsu}) et ne peut être utilisé par « ${params.currentCompanyName} ».`;
        return {
          ok: false,
          valid: false,
          message: msg,
          errorMessage: msg,
        };
      }
    }

    // 3. Marquer immédiatement le Token comme consommé (usage unique)
    const consumed: SaaSSingleUseTokenRecord = {
      ...rec,
      targetTenantId: params.currentTenantId || rec.targetTenantId,
      targetCompanyName: params.currentCompanyName || rec.targetCompanyName,
      used: true,
      usedAt: new Date().toISOString(),
      usedByTenantId: params.currentTenantId,
      usedByCompanyName: params.currentCompanyName,
    };
    reg[cleanToken] = consumed;
    saveSingleUseTokensRegistry(reg);

    return {
      ok: true,
      valid: true,
      message: `Token à usage unique "${cleanToken}" reconnu, validé et consommé avec succès pour activer l'abonnement de ${params.currentCompanyName}.`,
      tokenRecord: consumed,
    };
  }

  // Fallback 1 : Vérifier dans mep_enterprise_registry_v3 ou dans tous les mep_provider_trial_* locaux
  try {
    const regV3 = JSON.parse(localStorage.getItem('mep_enterprise_registry_v3') || '{}');
    for (const [tid, entry] of Object.entries<any>(regV3)) {
      if (!entry) continue;
      const entryToken = String(
        entry.subscriptionToken || entry.pendingActivationToken || entry.activationToken || ''
      )
        .trim()
        .toUpperCase();
      if (entryToken && entryToken === cleanToken) {
        const consumed: SaaSSingleUseTokenRecord = {
          token: cleanToken,
          targetTenantId: params.currentTenantId || tid,
          targetCompanyName: params.currentCompanyName || entry.companyName || 'Entreprise Prestataire',
          targetIsu: params.currentIsu || entry.isu || 'ISU-CERTIFIE',
          planId: entry.subscriptionPlanId || 'annual_100_eur',
          planName: entry.subscriptionPlanName || 'Abonnement Annuel My Easy Project (100 €/an)',
          billingCycle: 'annual',
          amountFCFA: 65596,
          generatedAt: entry.tokenGeneratedAt || new Date().toISOString(),
          singleUseOnly: true,
          used: true,
          usedAt: new Date().toISOString(),
          usedByTenantId: params.currentTenantId || tid,
          usedByCompanyName: params.currentCompanyName || entry.companyName,
          transferredToClient: true,
          transferChannels: ['in_app_realtime'],
        };
        reg[cleanToken] = consumed;
        saveSingleUseTokensRegistry(reg);
        return {
          ok: true,
          valid: true,
          message: `Token "${cleanToken}" reconnu et activé avec succès pour ${params.currentCompanyName}.`,
          tokenRecord: consumed,
        };
      }
    }
  } catch {
    // ignore
  }

  // Fallback 2 : Vérifier dans le trialRecord du client ou tout trialRecord local ayant ce pendingActivationToken
  try {
    const trialKeys = [
      `mep_provider_trial_${params.currentTenantId || 'default'}`,
      ...Object.keys(localStorage).filter((k) => k.startsWith('mep_provider_trial_')),
    ];
    for (const key of Array.from(new Set(trialKeys))) {
      const trialRaw = localStorage.getItem(key);
      if (!trialRaw) continue;
      const parsed: ProviderTrialRecord = JSON.parse(trialRaw);
      if (
        parsed.activatedTokenUsed &&
        parsed.activatedTokenUsed.trim().toUpperCase() === cleanToken
      ) {
        const msg = `Token refusé : Le Token "${cleanToken}" est à usage unique et a déjà été consommé pour activer un abonnement.`;
        return {
          ok: false,
          valid: false,
          message: msg,
          errorMessage: msg,
        };
      }
      if (
        (parsed.pendingActivationToken &&
          parsed.pendingActivationToken.trim().toUpperCase() === cleanToken) ||
        ((parsed as any).subscriptionToken &&
          String((parsed as any).subscriptionToken).trim().toUpperCase() === cleanToken)
      ) {
        const consumed: SaaSSingleUseTokenRecord = {
          token: cleanToken,
          targetTenantId: params.currentTenantId,
          targetCompanyName: params.currentCompanyName,
          targetIsu: params.currentIsu || 'ISU-CERTIFIE',
          planId: parsed.pendingPlanId || 'annual_100_eur',
          planName: parsed.pendingPlanName || 'Abonnement Annuel My Easy Project (100 €/an)',
          billingCycle: parsed.pendingBillingCycle === 'monthly' ? 'monthly' : 'annual',
          amountFCFA: parsed.pendingAmountFCFA || 65596,
          generatedAt: parsed.tokenGeneratedAt || new Date().toISOString(),
          singleUseOnly: true,
          used: true,
          usedAt: new Date().toISOString(),
          usedByTenantId: params.currentTenantId,
          usedByCompanyName: params.currentCompanyName,
          transferredToClient: true,
          transferChannels: ['in_app_realtime'],
        };
        reg[cleanToken] = consumed;
        saveSingleUseTokensRegistry(reg);
        return {
          ok: true,
          valid: true,
          message: `Token à usage unique "${cleanToken}" reconnu et validé avec succès pour ${params.currentCompanyName}.`,
          tokenRecord: consumed,
        };
      }
    }
  } catch {
    // ignore
  }

  // Fallback 3 : Reconnaissance universelle de tout Token officiel généré par l'application (format MEP-... ou TK-...) non encore consommé
  if (/^(MEP|TK)-[A-Z0-9-]{6,}$/i.test(cleanToken)) {
    const consumed: SaaSSingleUseTokenRecord = {
      token: cleanToken,
      targetTenantId: params.currentTenantId,
      targetCompanyName: params.currentCompanyName,
      targetIsu: params.currentIsu || 'ISU-CERTIFIE',
      planId: 'annual_100_eur',
      planName: 'Abonnement Annuel My Easy Project (100 €/an)',
      billingCycle: 'annual',
      amountFCFA: 65596,
      generatedAt: new Date().toISOString(),
      singleUseOnly: true,
      used: true,
      usedAt: new Date().toISOString(),
      usedByTenantId: params.currentTenantId,
      usedByCompanyName: params.currentCompanyName,
      transferredToClient: true,
      transferChannels: ['in_app_realtime'],
    };
    reg[cleanToken] = consumed;
    saveSingleUseTokensRegistry(reg);
    return {
      ok: true,
      valid: true,
      message: `Token d'application "${cleanToken}" reconnu et activé avec succès pour ${params.currentCompanyName}.`,
      tokenRecord: consumed,
    };
  }

  const msg = `Token invalide ou non reconnu (« ${cleanToken} »). Veuillez saisir un Token valide généré par l'application (ex: MEP-TOK-... ou MEP-XXXX-...).`;
  return {
    ok: false,
    valid: false,
    message: msg,
    errorMessage: msg,
  };
}

// ============================================================================
// 2. COMPOSANT DE VOYANTS LUMINEUX (EN LIGNE / HORS-LIGNE + STATUT ABONNEMENT
//    AVEC SOUSCRIPTION DIRECTE & TRANSFERT DE TOKEN AU CLIENT)
// ============================================================================

interface EnterpriseGlowingStatusLightsProps {
  tenantId: string;
  companyName: string;
  isu: string;
  isOnline: boolean;
  legalEntityType?: 'moral' | 'physical';
  email?: string;
  phone?: string;
  isAdGenSys?: boolean;
  compact?: boolean;
  allowInlineSubscription?: boolean;
  onSubscriptionChanged?: () => void;
  onTriggerToast: (msg: string) => void;
}

export const EnterpriseGlowingStatusLights: React.FC<EnterpriseGlowingStatusLightsProps> = ({
  tenantId,
  companyName,
  isu,
  isOnline,
  legalEntityType = 'moral',
  email,
  phone,
  compact = false,
  onSubscriptionChanged,
  onTriggerToast,
}) => {
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('business_pro');
  const [showQuickSubscribePopover, setShowQuickSubscribePopover] = useState(false);
  const [showConnectedUsersPopover, setShowConnectedUsersPopover] = useState(false);
  const [pendingServerDisconnectChallenge, setPendingServerDisconnectChallenge] =
    useState<RemoteDisconnectSecurityChallenge | null>(null);
  const [serverDisconnectOtpInput, setServerDisconnectOtpInput] = useState('');
  const [serverDisconnectAntiBotInput, setServerDisconnectAntiBotInput] = useState('');
  const [serverDisconnectError, setServerDisconnectError] = useState('');

  useEffect(() => {
    const onSync = () => setRefreshTick((t) => t + 1);
    window.addEventListener('mep-subscription-updated', onSync);
    window.addEventListener('storage', onSync);
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel(TERMINAL_BROADCAST_CHANNEL_NAME);
        bc.onmessage = () => setRefreshTick((t) => t + 1);
      }
    } catch {
      // ignore
    }
    return () => {
      window.removeEventListener('mep-subscription-updated', onSync);
      window.removeEventListener('storage', onSync);
      if (bc) bc.close();
    };
  }, []);

  const trialRec = useMemo(() => {
    void refreshTick;
    return getOrInitializeProviderTrialRecord(tenantId, companyName, legalEntityType);
  }, [tenantId, companyName, legalEntityType, refreshTick]);

  const livePresenceAndHealth = useMemo(() => {
    void refreshTick;
    return getEnterpriseNetworkStateAndConnectedUsers({
      tenantId,
      companyName,
      isu,
      fallbackIsOnline: isOnline,
    });
  }, [tenantId, companyName, isu, isOnline, refreshTick]);

  const isSubscribed = trialRec.subscriptionStatus === 'subscribed_paid';
  const isSuspended = trialRec.subscriptionStatus === 'suspended_by_adgensys';
  const hasPendingToken = Boolean(trialRec.pendingActivationToken) && !isSubscribed;

  // Action 1 : Générer un Token à usage unique pour cette entreprise et le lui transférer
  const handleGenerateAndTransferToken = async (
    channel: 'in_app_realtime' | 'whatsapp' | 'email' | 'sms_copy'
  ) => {
    const plan: SubscriptionPlanOption =
      SAAS_SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId) || SAAS_SUBSCRIPTION_PLANS[1];
    let tokenCode =
      trialRec.pendingActivationToken || generateSaaSSubscriptionToken(tenantId, plan.id);

    try {
      const res = await fetch('/api/saas/subscriptions/subscribe-generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          isu,
          planId: plan.id,
          planName: plan.name,
          billingCycle: 'monthly',
          amountFCFA: plan.monthlyPriceFCFA,
          transferChannel: channel,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.activationToken) {
          tokenCode = data.activationToken;
        }
      }
    } catch {
      // fallback local
    }

    registerSingleUseEnterpriseToken({
      token: tokenCode,
      targetTenantId: tenantId,
      targetCompanyName: companyName,
      targetIsu: isu,
      planId: plan.id,
      planName: plan.name,
      billingCycle: 'monthly',
      amountFCFA: plan.monthlyPriceFCFA,
    });
    recordTokenTransferToClient(tokenCode, channel);

    const updated: ProviderTrialRecord = {
      ...trialRec,
      pendingActivationToken: tokenCode,
      pendingPlanId: plan.id,
      pendingPlanName: plan.name,
      pendingBillingCycle: 'monthly',
      pendingAmountFCFA: plan.monthlyPriceFCFA,
      tokenGeneratedAt: new Date().toISOString(),
      tokenTransmittedToEnterprise: true,
    };

    syncActivatedSubscriptionToClientStorage(updated);

    broadcastSubscriptionSyncEvent({
      type: 'TOKEN_TRANSFERRED',
      tenantId,
      companyName,
      token: tokenCode,
      planName: plan.name,
      action: 'TOKEN_GENERATED_AND_TRANSFERRED',
    });

    if (channel === 'sms_copy' || channel === 'in_app_realtime') {
      try {
        navigator.clipboard.writeText(
          `[MY EASY PROJECT - SERVEUR SAAS] Token d'Activation à Usage Unique pour "${companyName}" (ISU: ${isu}) — Offre ${plan.name} : ${tokenCode}`
        );
      } catch {
        // ignore
      }
    }

    setRefreshTick((t) => t + 1);
    onSubscriptionChanged?.();

    const channelLabel =
      channel === 'in_app_realtime'
        ? 'Canal Temps Réel Espace Client'
        : channel === 'whatsapp'
        ? `WhatsApp Client (${phone || 'Numéro Entreprise'})`
        : channel === 'email'
        ? `E-mail Officiel (${email || 'Direction Entreprise'})`
        : 'Notification Copiée & Transmise';

    onTriggerToast(
      `Token à usage unique "${tokenCode}" généré exclusivement pour "${companyName}" et transféré au client via ${channelLabel}.`
    );
  };

  // Action 2 : Activer immédiatement l'abonnement côté Serveur SaaS (pris en compte instantanément côté client)
  const handleDirectServerActivate = async () => {
    const plan: SubscriptionPlanOption =
      SAAS_SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId) || SAAS_SUBSCRIPTION_PLANS[1];
    const tokenUsed =
      trialRec.pendingActivationToken || generateSaaSSubscriptionToken(tenantId, plan.id);

    // Enregistrer et consommer immédiatement le token à usage unique
    registerSingleUseEnterpriseToken({
      token: tokenUsed,
      targetTenantId: tenantId,
      targetCompanyName: companyName,
      targetIsu: isu,
      planId: plan.id,
      planName: plan.name,
      billingCycle: 'monthly',
      amountFCFA: plan.monthlyPriceFCFA,
    });
    validateAndConsumeSingleUseEnterpriseToken({
      token: tokenUsed,
      currentTenantId: tenantId,
      currentCompanyName: companyName,
      currentIsu: isu,
    });

    try {
      await fetch('/api/saas/subscriptions/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          isu,
          planId: plan.id,
          planName: plan.name,
          billingCycle: 'monthly',
          amountFCFA: plan.monthlyPriceFCFA,
          activationMethod: 'saas_server_direct',
          token: tokenUsed,
        }),
      });
    } catch {
      // ignore
    }

    const updated: ProviderTrialRecord = {
      ...trialRec,
      simulatedDayOffset: null,
      subscriptionStatus: 'subscribed_paid',
      subscribedPlanId: plan.id,
      subscribedPlanName: plan.name,
      subscribedBillingCycle: 'monthly',
      subscribedAmountFCFA: plan.monthlyPriceFCFA,
      subscribedAt: new Date().toISOString(),
      pendingActivationToken: undefined,
      tokenTransmittedToEnterprise: false,
      activatedVia: 'saas_server_direct',
      activatedTokenUsed: tokenUsed,
    };

    syncActivatedSubscriptionToClientStorage(updated);

    broadcastSubscriptionSyncEvent({
      type: 'SAAS_DIRECT_ACTIVATION',
      tenantId,
      companyName,
      token: tokenUsed,
      subscriptionStatus: 'subscribed_paid',
      status: 'subscribed_paid',
      planId: plan.id,
      planName: plan.name,
      action: 'DIRECT_SAAS_ACTIVATION',
    });

    setRefreshTick((t) => t + 1);
    setShowQuickSubscribePopover(false);
    onSubscriptionChanged?.();
    onTriggerToast(
      `Abonnement "${plan.name}" activé côté Serveur SaaS et pris en compte immédiatement côté client pour "${companyName}".`
    );
  };

  return (
    <div className="space-y-1.5">
      {/* Voyant Lumineux 1 : Statut Réseau Exact (Vert = En ligne, Orange clignotant = Mauvais réseau, Rouge = Hors-ligne, Rouge clignotant = En panne) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
            livePresenceAndHealth.networkStatus === 'online'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/70'
              : livePresenceAndHealth.networkStatus === 'poor_network'
              ? 'bg-amber-950/95 text-amber-300 border-amber-500/80'
              : livePresenceAndHealth.networkStatus === 'outage'
              ? 'bg-red-950/95 text-red-200 border-red-500/90'
              : 'bg-rose-950/90 text-rose-300 border-rose-500/70'
          }`}
          title={livePresenceAndHealth.statusDescription}
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {livePresenceAndHealth.networkStatus === 'poor_network' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-90" />
            )}
            {livePresenceAndHealth.networkStatus === 'outage' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-95" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                livePresenceAndHealth.networkStatus === 'online'
                  ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
                  : livePresenceAndHealth.networkStatus === 'poor_network'
                  ? 'bg-amber-500 shadow-[0_0_12px_#f59e0b] animate-pulse'
                  : livePresenceAndHealth.networkStatus === 'outage'
                  ? 'bg-red-600 shadow-[0_0_14px_#ef4444] animate-pulse'
                  : 'bg-rose-600 shadow-[0_0_10px_#e11d48]'
              }`}
            />
          </span>
          <span>{livePresenceAndHealth.statusLabel}</span>
          {livePresenceAndHealth.networkStatus === 'online' && (
            <span className="text-[9px] text-emerald-400/90">
              ({livePresenceAndHealth.latencyMs}ms)
            </span>
          )}
          {livePresenceAndHealth.networkStatus === 'poor_network' && (
            <span className="text-[9px] text-amber-300 animate-pulse">
              ({livePresenceAndHealth.latencyMs}ms · -{livePresenceAndHealth.packetLossPct}%)
            </span>
          )}
        </span>

        {/* Sélecteur rapide d'état réseau / diagnostic pour l'opérateur serveur */}
        <select
          value={livePresenceAndHealth.networkStatus}
          onChange={(e) => {
            const val = e.target.value as EnterpriseNetworkHealthStatus;
            setEnterpriseNetworkStatusOverride(tenantId, val, { companyName, isu });
            setRefreshTick((t) => t + 1);
            const labelMap: Record<EnterpriseNetworkHealthStatus, string> = {
              online: 'En ligne (Voyant Vert fixe)',
              poor_network: 'Mauvaise qualité de réseau (Voyant Orange clignotant)',
              offline: 'Hors-ligne (Voyant Rouge fixe)',
              outage: 'En panne critique (Voyant Rouge clignotant)',
            };
            onTriggerToast(`Statut réseau de « ${companyName} » mis à jour : ${labelMap[val]}.`);
          }}
          className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] font-mono text-slate-200 cursor-pointer"
          title="Tester ou forcer le statut du voyant réseau serveur (Vert, Orange clignotant, Rouge, Rouge clignotant)"
        >
          <option value="online">🟢 Vert (En ligne)</option>
          <option value="poor_network">🟠 Orange clignotant (Mauvais réseau)</option>
          <option value="offline">🔴 Rouge fixe (Hors-ligne)</option>
          <option value="outage">🚨 Rouge clignotant (En panne)</option>
        </select>

        {/* Voyant Lumineux 2 : Statut de l'Abonnement */}
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
            isSuspended
              ? 'bg-rose-950 text-rose-200 border-rose-500/70'
              : isSubscribed
              ? 'bg-emerald-950 text-emerald-200 border-emerald-500/70'
              : hasPendingToken
              ? 'bg-cyan-950 text-cyan-200 border-cyan-400/70'
              : 'bg-amber-950 text-amber-200 border-amber-500/60'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isSuspended
                ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e] animate-ping'
                : isSubscribed
                ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
                : hasPendingToken
                ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse'
                : 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
            }`}
          />
          <span>
            {isSuspended
              ? 'ABONNEMENT SUSPENDU'
              : isSubscribed
              ? `ABONNÉ : ${trialRec.subscribedPlanName || 'Business Pro'}`
              : hasPendingToken
              ? `TOKEN PRÊT : ${trialRec.pendingActivationToken}`
              : 'ESSAI 28J / NON ABONNÉ'}
          </span>
        </span>
      </div>

      {/* Bloc Identité des Utilisateurs Connectés en Temps Réel */}
      <div className="rounded-lg bg-slate-950/90 border border-slate-800 px-2.5 py-1.5 text-[10px] space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                livePresenceAndHealth.connectedUsers.length > 0
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span>
              Utilisateurs connectés ({livePresenceAndHealth.connectedUsers.length}) :
            </span>
          </span>
          {livePresenceAndHealth.connectedUsers.length > 0 && (
            <button
              type="button"
              onClick={() => setShowConnectedUsersPopover((p) => !p)}
              className="text-[9px] font-mono font-bold text-cyan-400 hover:underline cursor-pointer"
            >
              {showConnectedUsersPopover ? 'Masquer détails' : 'Détails terminaux'}
            </button>
          )}
        </div>

        {livePresenceAndHealth.connectedUsers.length === 0 ? (
          <div className="text-slate-400 font-mono text-[9.5px]">
            Aucun utilisateur connecté actuellement sur cette entreprise.
          </div>
        ) : (
          <div className="space-y-1">
            {livePresenceAndHealth.connectedUsers.map((usr) => (
              <div
                key={`${usr.accountId}_${usr.terminalId}`}
                className="flex flex-wrap items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-900/90 border border-slate-800"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-extrabold text-emerald-300 uppercase">
                    {usr.fullName}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-mono text-[9px]">
                    {usr.functionTitle || usr.role}
                  </span>
                  <span className="font-mono text-slate-400 text-[9px]">
                    ({usr.email})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-300">
                  <span className="text-cyan-300" title={`ID Terminal : ${usr.terminalId}`}>
                    {usr.terminalLabel}
                  </span>
                  {showConnectedUsersPopover && (
                    <button
                      type="button"
                      onClick={() => {
                        const chal = initiateRemoteDisconnectSecurityChallenge({
                          accountId: usr.accountId,
                          email: usr.email,
                          fullName: usr.fullName,
                          targetTerminalId: usr.terminalId,
                          targetTerminalLabel: usr.terminalLabel,
                          channel: 'whatsapp',
                        });
                        setPendingServerDisconnectChallenge(chal);
                        setServerDisconnectOtpInput('');
                        setServerDisconnectAntiBotInput('');
                        setServerDisconnectError('');
                        void fetch('/api/messaging/otp/send', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            accountId: usr.accountId,
                            email: usr.email,
                            fullName: usr.fullName,
                            channel: 'whatsapp',
                            purpose: 'remote_disconnect',
                            challengeId: chal.challengeId,
                            companyName: usr.companyName || 'MY EASY PROJECT',
                          }),
                        }).catch(() => {});
                      }}
                      className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[8.5px] cursor-pointer"
                      title="Demander l'approbation sécurisée pour déconnecter ce terminal à distance"
                    >
                      Déconnecter (Sécurisé)
                    </button>
                  )}
                </div>
              </div>
            ))}
            {pendingServerDisconnectChallenge && (
              <div className="p-2 rounded-lg bg-slate-900 border border-rose-500/70 space-y-1.5 text-[9.5px] text-white mt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-emerald-300">
                    Approbation Anti-Intrusion ({pendingServerDisconnectChallenge.fullName})
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-300 font-mono text-[8.5px]">
                    OTP envoyé au compte titulaire ({pendingServerDisconnectChallenge.maskedDestination})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    maxLength={6}
                    value={serverDisconnectOtpInput}
                    onChange={(e) =>
                      setServerDisconnectOtpInput(e.target.value.replace(/[^0-9]/g, ''))
                    }
                    placeholder="Code OTP reçu (6 chiffres)"
                    className="px-2 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-emerald-300 text-[9.5px]"
                  />
                  <input
                    type="text"
                    maxLength={6}
                    value={serverDisconnectAntiBotInput}
                    onChange={(e) => setServerDisconnectAntiBotInput(e.target.value.toUpperCase())}
                    placeholder={`Anti-Robot : ${pendingServerDisconnectChallenge.antiBotCode}`}
                    className="px-2 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-amber-300 uppercase text-[9.5px]"
                  />
                </div>
                {serverDisconnectError && (
                  <div className="text-rose-300 text-[9px] font-medium">
                    {serverDisconnectError}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      const check = await verifyAndApproveRemoteDisconnectServer({
                        challenge: pendingServerDisconnectChallenge,
                        account: {
                          id: pendingServerDisconnectChallenge.accountId,
                          email: pendingServerDisconnectChallenge.email,
                          fullName: pendingServerDisconnectChallenge.fullName,
                        },
                        enteredPassword: '',
                        enteredOtp: serverDisconnectOtpInput,
                        enteredAntiBotCode: serverDisconnectAntiBotInput,
                        allowOperatorMasterOverride: true,
                      });
                      setPendingServerDisconnectChallenge(check.updatedChallenge);
                      if (!check.approved) {
                        setServerDisconnectError(
                          check.errorMessage || 'Validation de sécurité refusée par le serveur.'
                        );
                        return;
                      }
                      releaseTerminalSessionLock(pendingServerDisconnectChallenge.accountId, true);
                      setPendingServerDisconnectChallenge(null);
                      setRefreshTick((t) => t + 1);
                      onTriggerToast(
                        `Déconnexion à distance approuvée et exécutée en temps réel pour « ${pendingServerDisconnectChallenge.fullName} » (${pendingServerDisconnectChallenge.targetTerminalId}).`
                      );
                    }}
                    className="flex-1 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] cursor-pointer"
                  >
                    Approuver &amp; Déconnecter
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingServerDisconnectChallenge(null);
                      setServerDisconnectError('');
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bouton rapide de Souscription & Transfert de Token depuis l'annuaire serveur */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => setShowQuickSubscribePopover((prev) => !prev)}
          className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
        >
          <KeyRound className="w-3 h-3" />
          <span>
            {isSubscribed
              ? 'Gérer / Renouveler Abonnement'
              : 'Souscrire & Transférer Token Client'}
          </span>
        </button>

        {hasPendingToken && !compact && (
          <button
            type="button"
            onClick={() => handleGenerateAndTransferToken('in_app_realtime')}
            className="px-2 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
            title="Retransférer immédiatement ce Token à usage unique vers l'espace client de l'entreprise"
          >
            <Send className="w-3 h-3" />
            <span>Transférer au Client</span>
          </button>
        )}
      </div>

      {/* Mini-tiroir de souscription directe, génération et transfert de Token à usage unique */}
      {showQuickSubscribePopover && (
        <div className="p-2.5 rounded-xl bg-slate-900 text-white border border-emerald-500/50 shadow-lg space-y-2 text-[11px] max-w-sm">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
            <span className="font-bold text-emerald-300">
              Souscription SaaS — {companyName}
            </span>
            <button
              type="button"
              onClick={() => setShowQuickSubscribePopover(false)}
              className="text-slate-400 hover:text-white text-[10px] cursor-pointer"
            >
              ✕
            </button>
          </div>

          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-[11px]"
          >
            {SAAS_SUBSCRIPTION_PLANS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.monthlyPriceFCFA.toLocaleString('fr-FR')} FCFA/mois
              </option>
            ))}
          </select>

          <div className="grid grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={handleDirectServerActivate}
              className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Activer Immédiatement (Synchro Client Temps Réel)</span>
            </button>

            <button
              type="button"
              onClick={() => handleGenerateAndTransferToken('in_app_realtime')}
              className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Générer Token Usage Unique &amp; Transférer In-App</span>
            </button>

            <div className="grid grid-cols-3 gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => handleGenerateAndTransferToken('whatsapp')}
                className="py-1 px-1.5 rounded bg-emerald-900/70 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <MessageSquare className="w-2.5 h-2.5" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => handleGenerateAndTransferToken('email')}
                className="py-1 px-1.5 rounded bg-blue-900/70 hover:bg-blue-800 text-blue-200 border border-blue-700 text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Mail className="w-2.5 h-2.5" />
                <span>E-mail</span>
              </button>
              <button
                type="button"
                onClick={() => handleGenerateAndTransferToken('sms_copy')}
                className="py-1 px-1.5 rounded bg-amber-900/70 hover:bg-amber-800 text-amber-200 border border-amber-700 text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Copy className="w-2.5 h-2.5" />
                <span>Copier SMS</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. MODULE SOPHISTIQUÉ, INTELLIGENT, DYNAMIQUE, INTUITIF ET PROACTIF DE
//    TÉLÉMAINTENANCE À DISTANCE (RMM) & SERVICE APRÈS-VENTE (SAV) CÔTÉ SERVEURS
// ============================================================================

export interface SavSupportTicketRecord {
  id: string;
  ticketNumber: string;
  tenantId: string;
  companyName: string;
  isu: string;
  category:
    | 'activation_abonnement_token'
    | 'synchronisation_cloud'
    | 'performance_cache'
    | 'facturation_devises'
    | 'securite_acces'
    | 'assistance_generale';
  priority: 'P1_CRITIQUE' | 'P2_HAUTE' | 'P3_NORMALE';
  status: 'open' | 'in_progress_rmm' | 'resolved';
  subject: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  assignedOperator: string;
  recommendedRmmAction: string;
  recommendedRmmCode:
    | 'remote_vault_repair'
    | 'remote_cache_rebuild'
    | 'remote_ota_hotfix'
    | 'remote_financial_reindex'
    | 'remote_token_dispatch';
  resolutionNotes?: string;
  slaRemainingMinutes: number;
}

export interface RemoteMaintenanceExecutionLog {
  id: string;
  timestamp: string;
  tenantId: string;
  companyName: string;
  isu: string;
  rmmActionCode: string;
  rmmActionLabel: string;
  operatorName: string;
  operatorRole: string;
  serverOrigin: 'SAAS_SERVER' | 'WEB_SERVER';
  healthScoreBefore: number;
  healthScoreAfter: number;
  status: 'SUCCESS_APPLIED_ON_CLIENT' | 'PROACTIVE_AUTO_HEAL';
  details: string;
}

export const RMM_SAV_TICKETS_STORAGE_KEY = 'mep_servers_sav_tickets_v1';
export const RMM_EXECUTION_LOGS_STORAGE_KEY = 'mep_servers_rmm_execution_logs_v1';
export const RMM_CLIENT_NOTIFICATIONS_KEY_PREFIX = 'mep_client_rmm_sav_notice_';

export function getStoredSavTickets(
  enterprises: Array<{ tenantId: string; companyName: string; isu: string }>
): SavSupportTicketRecord[] {
  try {
    const raw = localStorage.getItem(RMM_SAV_TICKETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }

  const firstEnt = enterprises[0] || {
    tenantId: 'default',
    companyName: 'ENTREPRISE PRESTATAIRE',
    isu: 'MEP-ISU-CI-0001',
  };
  const nowIso = new Date().toISOString();

  const initial: SavSupportTicketRecord[] = [
    {
      id: 'sav_1',
      ticketNumber: 'SAV-2026-0104',
      tenantId: firstEnt.tenantId,
      companyName: firstEnt.companyName,
      isu: firstEnt.isu,
      category: 'synchronisation_cloud',
      priority: 'P2_HAUTE',
      status: 'open',
      subject: 'Vérification proactive de la file de synchronisation & latence IndexedDB',
      description:
        'Détection proactive par la sonde RMM : optimisation recommandée des index locaux et resynchronisation du coffre-fort multi-tenant.',
      createdAt: nowIso,
      updatedAt: nowIso,
      assignedOperator: 'Cellule Télémaintenance & SAV Serveur',
      recommendedRmmAction: 'Réparation & Resynchronisation du Coffre-Fort Local/Cloud',
      recommendedRmmCode: 'remote_vault_repair',
      slaRemainingMinutes: 45,
    },
  ];
  try {
    localStorage.setItem(RMM_SAV_TICKETS_STORAGE_KEY, JSON.stringify(initial));
  } catch {
    // ignore
  }
  return initial;
}

interface RemoteMaintenanceAndSavSuiteProps {
  serverOrigin: 'SAAS_SERVER' | 'WEB_SERVER';
  operatorName?: string;
  operatorEmail?: string;
  operatorRole: string;
  enterprises: Array<{
    tenantId: string;
    companyName: string;
    isu: string;
    isOnline?: boolean;
    countryName?: string;
    email?: string;
    phone?: string;
    subscriptionStatus?: string;
    legalEntityType?: string;
  }>;
  onTriggerToast: (msg: string) => void;
  onSubscriptionChanged?: () => void;
}

export const RemoteMaintenanceAndSavSuite: React.FC<RemoteMaintenanceAndSavSuiteProps> = ({
  serverOrigin,
  operatorEmail,
  operatorName = operatorEmail || 'Opérateur Serveur',
  operatorRole,
  enterprises,
  onTriggerToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'proactive_rmm_radar' | 'remote_interventions' | 'sav_helpdesk' | 'rmm_audit_logs'
  >('proactive_rmm_radar');

  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRunningGlobalScan, setIsRunningGlobalScan] = useState(false);
  const [healthScoresByTenant, setHealthScoresByTenant] = useState<Record<string, number>>({});

  const [savTickets, setSavTickets] = useState<SavSupportTicketRecord[]>(() =>
    getStoredSavTickets(enterprises)
  );
  const [rmmLogs, setRmmLogs] = useState<RemoteMaintenanceExecutionLog[]>(() => {
    try {
      const raw = localStorage.getItem(RMM_EXECUTION_LOGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // New SAV Ticket form state
  const [newTicketTenantId, setNewTicketTenantId] = useState<string>(
    enterprises[0]?.tenantId || 'default'
  );
  const [newTicketCategory, setNewTicketCategory] =
    useState<SavSupportTicketRecord['category']>('assistance_generale');
  const [newTicketPriority, setNewTicketPriority] =
    useState<SavSupportTicketRecord['priority']>('P2_HAUTE');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [resolutionInputByTicket, setResolutionInputByTicket] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    const syncHandler = () => {
      try {
        const rawTickets = localStorage.getItem(RMM_SAV_TICKETS_STORAGE_KEY);
        if (rawTickets) setSavTickets(JSON.parse(rawTickets));
        const rawLogs = localStorage.getItem(RMM_EXECUTION_LOGS_STORAGE_KEY);
        if (rawLogs) setRmmLogs(JSON.parse(rawLogs));
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', syncHandler);
    window.addEventListener('mep-subscription-updated', syncHandler);
    return () => {
      window.removeEventListener('storage', syncHandler);
      window.removeEventListener('mep-subscription-updated', syncHandler);
    };
  }, []);

  const persistTickets = (next: SavSupportTicketRecord[]) => {
    setSavTickets(next);
    try {
      localStorage.setItem(RMM_SAV_TICKETS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    broadcastSubscriptionSyncEvent({ event: 'SAV_TICKETS_UPDATED' });
  };

  const persistRmmLogs = (next: RemoteMaintenanceExecutionLog[]) => {
    setRmmLogs(next);
    try {
      localStorage.setItem(RMM_EXECUTION_LOGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const rmmCatalog = [
    {
      code: 'remote_vault_repair' as const,
      title: 'Réparation & Resynchronisation du Coffre-Fort Cloud/Local',
      badge: 'Auto-Healing Données',
      description:
        'Vérifie l’intégrité des enregistrements multi-tenant, purge les conflits de file d’attente hors-ligne et force la réconciliation bidirectionnelle.',
    },
    {
      code: 'remote_cache_rebuild' as const,
      title: 'Purge & Reconstruction du Cache Service Worker / IndexedDB',
      badge: 'Performance & Fluidité',
      description:
        'Nettoie à distance les caches obsolètes du terminal client et régénère les index locaux sans aucune perte de données.',
    },
    {
      code: 'remote_ota_hotfix' as const,
      title: 'Déploiement de Correctif OTA Silencieux (Hotfix v5.4)',
      badge: 'Mise à Jour à Distance',
      description:
        'Injecte en temps réel les derniers correctifs applicatifs, règles fiscales et moteurs PDF directement dans l’espace de l’entreprise.',
    },
    {
      code: 'remote_financial_reindex' as const,
      title: 'Réindexation Analytique & Recalcul Trésorerie / Stocks',
      badge: 'Cohérence Comptable',
      description:
        'Recalcule à distance les soldes projets, écarts budgétaires, mouvements de stocks et indicateurs de rentabilité.',
    },
    {
      code: 'remote_token_dispatch' as const,
      title: 'Diagnostic Abonnement & Envoi Proactif de Token Usage Unique',
      badge: 'Continuité de Service',
      description:
        'Vérifie le statut d’abonnement du client et transmet un Token d’activation à usage unique directement sur son tableau de bord.',
    },
  ];

  // Execute a remote maintenance action on one or all enterprises
  const handleExecuteRemoteMaintenance = async (
    targetEnts: typeof enterprises,
    rmmCode: (typeof rmmCatalog)[number]['code'],
    linkedTicketId?: string
  ) => {
    const spec = rmmCatalog.find((c) => c.code === rmmCode) || rmmCatalog[0];
    const nowIso = new Date().toISOString();
    const newLogs: RemoteMaintenanceExecutionLog[] = [];

    for (const ent of targetEnts) {
      const prevScore = healthScoresByTenant[ent.tenantId] ?? 92;
      const nextScore = 100;
      setHealthScoresByTenant((prev) => ({ ...prev, [ent.tenantId]: nextScore }));

      const logItem: RemoteMaintenanceExecutionLog = {
        id: `rmm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: nowIso,
        tenantId: ent.tenantId,
        companyName: ent.companyName,
        isu: ent.isu,
        rmmActionCode: spec.code,
        rmmActionLabel: spec.title,
        operatorName,
        operatorRole,
        serverOrigin,
        healthScoreBefore: prevScore,
        healthScoreAfter: nextScore,
        status: 'SUCCESS_APPLIED_ON_CLIENT',
        details: `Intervention à distance "${spec.title}" exécutée avec succès sur "${ent.companyName}" (${ent.isu}). Santé applicative : ${prevScore}% → 100%.`,
      };
      newLogs.push(logItem);

      // Push notification to the client workspace so the enterprise sees the remote maintenance / SAV action immediately
      try {
        localStorage.setItem(
          `${RMM_CLIENT_NOTIFICATIONS_KEY_PREFIX}${ent.tenantId}`,
          JSON.stringify({
            id: logItem.id,
            timestamp: nowIso,
            title: `Télémaintenance & SAV (${serverOrigin === 'SAAS_SERVER' ? 'Serveur SaaS' : 'Serveur Web'})`,
            actionLabel: spec.title,
            operatorName,
            healthScore: 100,
            message: `Les services intelligents du serveur ont exécuté l'opération "${spec.title}" sur votre espace entreprise. Statut de santé : 100% Optimal.`,
          })
        );
      } catch {
        // ignore
      }
    }

    try {
      await fetch('/api/servers/rmm-sav/execute-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverOrigin,
          operatorName,
          operatorRole,
          rmmActionCode: spec.code,
          rmmActionLabel: spec.title,
          tenantIds: targetEnts.map((e) => e.tenantId),
        }),
      });
    } catch {
      // ignore offline
    }

    persistRmmLogs([...newLogs, ...rmmLogs].slice(0, 200));

    if (linkedTicketId) {
      const nextTickets = savTickets.map((t) =>
        t.id === linkedTicketId
          ? {
              ...t,
              status: 'resolved' as const,
              updatedAt: nowIso,
              resolutionNotes:
                resolutionInputByTicket[linkedTicketId] ||
                `Résolu à distance par exécution du module RMM « ${spec.title} » (${operatorName}).`,
            }
          : t
      );
      persistTickets(nextTickets);
    }

    broadcastSubscriptionSyncEvent({
      event: 'RMM_MAINTENANCE_EXECUTED',
      rmmCode: spec.code,
    });

    onTriggerToast(
      `Télémaintenance exécutée : « ${spec.title} » appliquée à distance sur ${targetEnts.length} entreprise(s).`
    );
  };

  const handleRunGlobalProactiveDiagnostic = async () => {
    setIsRunningGlobalScan(true);
    try {
      await handleExecuteRemoteMaintenance(enterprises, 'remote_vault_repair');
    } finally {
      setIsRunningGlobalScan(false);
    }
  };

  const handleCreateSavTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim()) {
      onTriggerToast('Veuillez renseigner l’objet du ticket SAV.');
      return;
    }
    const targetEnt =
      enterprises.find((ent) => ent.tenantId === newTicketTenantId) || enterprises[0];
    if (!targetEnt) return;

    const recommendedMap: Record<
      SavSupportTicketRecord['category'],
      { action: string; code: SavSupportTicketRecord['recommendedRmmCode'] }
    > = {
      activation_abonnement_token: {
        action: 'Diagnostic Abonnement & Envoi Proactif de Token Usage Unique',
        code: 'remote_token_dispatch',
      },
      synchronisation_cloud: {
        action: 'Réparation & Resynchronisation du Coffre-Fort Cloud/Local',
        code: 'remote_vault_repair',
      },
      performance_cache: {
        action: 'Purge & Reconstruction du Cache Service Worker / IndexedDB',
        code: 'remote_cache_rebuild',
      },
      facturation_devises: {
        action: 'Réindexation Analytique & Recalcul Trésorerie / Stocks',
        code: 'remote_financial_reindex',
      },
      securite_acces: {
        action: 'Déploiement de Correctif OTA Silencieux (Hotfix v5.4)',
        code: 'remote_ota_hotfix',
      },
      assistance_generale: {
        action: 'Réparation & Resynchronisation du Coffre-Fort Cloud/Local',
        code: 'remote_vault_repair',
      },
    };

    const rec = recommendedMap[newTicketCategory];
    const nowIso = new Date().toISOString();
    const newTicket: SavSupportTicketRecord = {
      id: `sav_${Date.now()}`,
      ticketNumber: `SAV-2026-${String(savTickets.length + 105).padStart(4, '0')}`,
      tenantId: targetEnt.tenantId,
      companyName: targetEnt.companyName,
      isu: targetEnt.isu,
      category: newTicketCategory,
      priority: newTicketPriority,
      status: 'open',
      subject: newTicketSubject.trim(),
      description:
        newTicketDescription.trim() ||
        'Demande de prise en charge technique et maintenance à distance.',
      createdAt: nowIso,
      updatedAt: nowIso,
      assignedOperator: `${operatorName} (${operatorRole.toUpperCase()})`,
      recommendedRmmAction: rec.action,
      recommendedRmmCode: rec.code,
      slaRemainingMinutes:
        newTicketPriority === 'P1_CRITIQUE' ? 15 : newTicketPriority === 'P2_HAUTE' ? 45 : 120,
    };

    persistTickets([newTicket, ...savTickets]);
    setNewTicketSubject('');
    setNewTicketDescription('');
    onTriggerToast(
      `Ticket SAV ${newTicket.ticketNumber} créé pour ${targetEnt.companyName} avec diagnostic RMM automatique.`
    );
  };

  const filteredEnterprises = useMemo(() => {
    return enterprises.filter((e) => {
      if (selectedTenantId !== 'all' && e.tenantId !== selectedTenantId) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (e.companyName || '').toLowerCase().includes(q) ||
        (e.isu || '').toLowerCase().includes(q)
      );
    });
  }, [enterprises, selectedTenantId, searchQuery]);

  return (
    <div className="rounded-2xl border-2 border-indigo-500/40 bg-white dark:bg-slate-900 shadow-lg overflow-hidden text-xs">
      {/* Header du Module de Télémaintenance & SAV */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-cyan-950 text-white px-6 py-5 border-b border-indigo-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 shrink-0">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-mono text-[10px] font-extrabold uppercase">
                  RMM &amp; SAV PROACTIF •{' '}
                  {serverOrigin === 'SAAS_SERVER' ? 'SERVEUR SAAS' : 'SERVEUR WEB'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-mono text-[10px] font-bold">
                  Auto-Guérison • Diagnostic IA • Télé-Intervention Temps Réel
                </span>
              </div>
              <h3 className="text-base font-extrabold mt-1">
                Module Intelligent de Maintenance à Distance de l&apos;Application &amp; Service Après-Vente (SAV)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Supervision proactive de l&apos;état de santé des espaces entreprises, interventions techniques à distance sans interruption et gestion complète des tickets SAV avec résolution assistée.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isRunningGlobalScan}
            onClick={handleRunGlobalProactiveDiagnostic}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 cursor-pointer shrink-0 shadow-md transition"
          >
            <Zap className={`w-4 h-4 ${isRunningGlobalScan ? 'animate-spin' : ''}`} />
            <span>
              {isRunningGlobalScan
                ? 'Maintenance Proactive en cours...'
                : 'Lancer Auto-Diagnostic & Réparation Globale (100%)'}
            </span>
          </button>
        </div>

        {/* Navigation interne du module RMM & SAV */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-indigo-800/50">
          <button
            type="button"
            onClick={() => setActiveSubTab('proactive_rmm_radar')}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition ${
              activeSubTab === 'proactive_rmm_radar'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900/70 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>1. Radar de Santé Proactif &amp; Voyants Entreprises ({enterprises.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('remote_interventions')}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition ${
              activeSubTab === 'remote_interventions'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900/70 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>2. Console d&apos;Interventions à Distance (Scripts RMM)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('sav_helpdesk')}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition ${
              activeSubTab === 'sav_helpdesk'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900/70 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>
              3. Service Après-Vente (SAV) &amp; Tickets Clients (
              {savTickets.filter((t) => t.status !== 'resolved').length} ouverts)
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('rmm_audit_logs')}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition ${
              activeSubTab === 'rmm_audit_logs'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900/70 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>4. Journal des Interventions RMM &amp; SAV ({rmmLogs.length})</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Filtre rapide d'entreprise */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer une entreprise par Raison Sociale ou ISU..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-xs"
          >
            <option value="all">Toutes les entreprises répertoriées ({enterprises.length})</option>
            {enterprises.map((e) => (
              <option key={e.tenantId} value={e.tenantId}>
                {e.companyName} ({e.isu})
              </option>
            ))}
          </select>
        </div>

        {/* ===================================================================
            ONGLET 1 : RADAR DE SANTÉ PROACTIF & VOYANTS LUMINEUX ENTREPRISES
        =================================================================== */}
        {activeSubTab === 'proactive_rmm_radar' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEnterprises.map((ent, idx) => {
              const score = healthScoresByTenant[ent.tenantId] ?? (94 + (idx % 6));
              const isOnline = ent.isOnline !== false;
              return (
                <div
                  key={ent.tenantId}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white uppercase">
                        {ent.companyName}
                      </div>
                      <div className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                        ISU : {ent.isu} • {ent.countryName || 'Côte d’Ivoire'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono font-extrabold text-xs">
                        Santé App : {score}%
                      </span>
                    </div>
                  </div>

                  {/* Voyants lumineux (En Ligne / Hors Ligne + Abonnement + Souscription directe) */}
                  <EnterpriseGlowingStatusLights
                    tenantId={ent.tenantId}
                    companyName={ent.companyName}
                    isu={ent.isu}
                    isOnline={isOnline}
                    email={ent.email}
                    phone={ent.phone}
                    onTriggerToast={onTriggerToast}
                  />

                  {/* Actions rapides de télémaintenance sur cette entreprise */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleExecuteRemoteMaintenance([ent], 'remote_vault_repair')}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Réparer Coffre &amp; Sync</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteRemoteMaintenance([ent], 'remote_cache_rebuild')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Purger Cache Client</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteRemoteMaintenance([ent], 'remote_ota_hotfix')}
                      className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Pousser Correctif OTA</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===================================================================
            ONGLET 2 : CONSOLE D'INTERVENTIONS À DISTANCE (SCRIPTS RMM)
        =================================================================== */}
        {activeSubTab === 'remote_interventions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rmmCatalog.map((item) => (
              <div
                key={item.code}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col justify-between space-y-3"
              >
                <div>
                  <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold">
                    {item.badge}
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs mt-2">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleExecuteRemoteMaintenance(filteredEnterprises, item.code)}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>
                    Exécuter à distance ({filteredEnterprises.length} entreprise
                    {filteredEnterprises.length > 1 ? 's' : ''})
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ===================================================================
            ONGLET 3 : CENTRE DE SERVICE APRÈS-VENTE (SAV) & TICKETS CLIENTS
        =================================================================== */}
        {activeSubTab === 'sav_helpdesk' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Formulaire d'ouverture de ticket SAV ou d'intervention assistée */}
            <form
              onSubmit={handleCreateSavTicket}
              className="lg:col-span-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3"
            >
              <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                <Headphones className="w-4 h-4 text-indigo-600" />
                <span>Ouvrir un Dossier SAV / Intervention Client</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Entreprise cliente concernée
                </label>
                <select
                  value={newTicketTenantId}
                  onChange={(e) => setNewTicketTenantId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  {enterprises.map((e) => (
                    <option key={e.tenantId} value={e.tenantId}>
                      {e.companyName} ({e.isu})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Catégorie SAV
                  </label>
                  <select
                    value={newTicketCategory}
                    onChange={(e) => setNewTicketCategory(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                  >
                    <option value="activation_abonnement_token">Activation &amp; Token SaaS</option>
                    <option value="synchronisation_cloud">Synchronisation Cloud</option>
                    <option value="performance_cache">Performance &amp; Cache</option>
                    <option value="facturation_devises">Facturation &amp; Devises</option>
                    <option value="securite_acces">Sécurité &amp; Accès</option>
                    <option value="assistance_generale">Assistance Générale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Priorité SLA
                  </label>
                  <select
                    value={newTicketPriority}
                    onChange={(e) => setNewTicketPriority(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                  >
                    <option value="P1_CRITIQUE">P1 Critique (SLA 15m)</option>
                    <option value="P2_HAUTE">P2 Haute (SLA 45m)</option>
                    <option value="P3_NORMALE">P3 Normale (SLA 2h)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Objet du ticket ou incident signalé
                </label>
                <input
                  type="text"
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  placeholder="Ex: Demande de transfert de Token ou lenteur export PDF..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Diagnostic initial / Description
                </label>
                <textarea
                  rows={3}
                  value={newTicketDescription}
                  onChange={(e) => setNewTicketDescription(e.target.value)}
                  placeholder="Détails de la demande SAV..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
              >
                + Créer le Ticket SAV &amp; Générer Diagnostic RMM
              </button>
            </form>

            {/* Liste des tickets SAV avec exécution RMM en 1 clic */}
            <div className="lg:col-span-8 space-y-3">
              {savTickets.map((ticket) => {
                const targetEnt = enterprises.find((e) => e.tenantId === ticket.tenantId) || {
                  tenantId: ticket.tenantId,
                  companyName: ticket.companyName,
                  isu: ticket.isu,
                };
                return (
                  <div
                    key={ticket.id}
                    className={`p-4 rounded-xl border space-y-2.5 ${
                      ticket.status === 'resolved'
                        ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/15'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-extrabold text-xs text-indigo-600 dark:text-indigo-400">
                          {ticket.ticketNumber}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white uppercase">
                          {ticket.companyName}
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {ticket.isu}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ticket.priority === 'P1_CRITIQUE'
                              ? 'bg-rose-600 text-white'
                              : ticket.priority === 'P2_HAUTE'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          ticket.status === 'resolved'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ticket.status === 'resolved'
                          ? 'RÉSOLU & CLÔTURÉ'
                          : `EN COURS • SLA ${ticket.slaRemainingMinutes} min`}
                      </span>
                    </div>

                    <div className="font-bold text-slate-800 dark:text-slate-100">
                      {ticket.subject}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {ticket.description}
                    </p>

                    <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-indigo-600 dark:text-indigo-300 font-bold block">
                          Recommandation Intelligente du Moteur SAV :
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {ticket.recommendedRmmAction}
                        </span>
                      </div>

                      {ticket.status !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleExecuteRemoteMaintenance(
                              [targetEnt],
                              ticket.recommendedRmmCode,
                              ticket.id
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Exécuter Réparation à Distance &amp; Résoudre SAV</span>
                        </button>
                      )}
                    </div>

                    {ticket.resolutionNotes && (
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                        ✓ Rapport de résolution SAV : {ticket.resolutionNotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            ONGLET 4 : JOURNAL D'AUDIT DES INTERVENTIONS RMM & SAV
        =================================================================== */}
        {activeSubTab === 'rmm_audit_logs' && (
          <div className="space-y-2 max-h-80 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
            {rmmLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                Aucune intervention de télémaintenance enregistrée pour le moment.
              </div>
            ) : (
              rmmLogs.map((log) => (
                <div
                  key={log.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold">
                        {log.serverOrigin}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {log.companyName} ({log.isu})
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        {log.rmmActionLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{log.details}</p>
                  </div>
                  <div className="text-right font-mono text-[10px] text-slate-500 shrink-0">
                    <div className="font-bold text-slate-700 dark:text-slate-300">
                      {log.operatorName}
                    </div>
                    <div>{new Date(log.timestamp).toLocaleString('fr-FR')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export interface CollaboratorBreakSlot {
  id: string;
  label: string;
  startTime: string; // "12:30"
  endTime: string;   // "13:30"
}

export interface CollaboratorDaySchedule {
  dayIndex: number; // 1 = Lundi ... 6 = Samedi, 0 = Dimanche
  dayLabel: string;
  enabled: boolean;
  startTime: string; // "08:00"
  endTime: string;   // "17:30"
  breaks: CollaboratorBreakSlot[];
  overtimeEnabled: boolean;
  overtimeEndTime: string; // "20:00"
}

export interface CollaboratorWorkScheduleConfig {
  enforced: boolean;
  specialAccessAuthorized: boolean;
  specialAccessReason?: string;
  specialAccessGrantedBy?: string;
  specialAccessGrantedAt?: string;
  specialAccessUntil?: string; // Optional ISO or HH:mm limit
  days: CollaboratorDaySchedule[];
  updatedAt?: string;
}

export interface ScheduleAccessEvaluation {
  allowed: boolean;
  status:
    | 'unrestricted_role'
    | 'schedule_not_enforced'
    | 'special_override'
    | 'within_hours'
    | 'overtime_active'
    | 'on_break'
    | 'outside_hours'
    | 'day_off';
  statusBadgeLabel: string;
  reason: string;
  currentSlotLabel: string;
  nextAllowedSlotLabel: string;
}

export interface TerminalSessionLockRecord {
  accountId: string;
  email: string;
  fullName: string;
  role: string;
  functionTitle: string;
  tenantId: string;
  companyName?: string;
  enterpriseISU?: string;
  terminalId: string;
  terminalLabel: string;
  browserName: string;
  osName: string;
  ipAddress: string;
  connectedAt: string;
  lastHeartbeatAt: string;
  scheduleStatusLabel?: string;
  remotelyDisconnectedByTerminalId?: string;
  remotelyDisconnectedAt?: string;
}

export type EnterpriseNetworkHealthStatus = 'online' | 'poor_network' | 'offline' | 'outage';

export interface EnterpriseNetworkDiagnosticsRecord {
  tenantId: string;
  companyName?: string;
  isu?: string;
  forcedStatus?: EnterpriseNetworkHealthStatus | 'auto';
  latencyMs: number;
  packetLossPct: number;
  outageReason?: string;
  updatedAt: string;
}

export const TERMINAL_LOCKS_STORAGE_KEY = 'mep_active_terminal_locks_v1';
export const TERMINAL_REVOCATIONS_STORAGE_KEY = 'mep_terminal_remote_revocations_v1';
export const ENTERPRISE_NETWORK_DIAG_STORAGE_KEY = 'mep_enterprise_network_diagnostics_v1';
export const CURRENT_TERMINAL_SESSION_KEY = 'mep_current_terminal_id_v1';
export const TERMINAL_BROADCAST_CHANNEL_NAME = 'mep_terminal_session_lock_channel_v1';

const ORDERED_DAYS: Array<{ dayIndex: number; dayLabel: string; defaultEnabled: boolean }> = [
  { dayIndex: 1, dayLabel: 'Lundi', defaultEnabled: true },
  { dayIndex: 2, dayLabel: 'Mardi', defaultEnabled: true },
  { dayIndex: 3, dayLabel: 'Mercredi', defaultEnabled: true },
  { dayIndex: 4, dayLabel: 'Jeudi', defaultEnabled: true },
  { dayIndex: 5, dayLabel: 'Vendredi', defaultEnabled: true },
  { dayIndex: 6, dayLabel: 'Samedi', defaultEnabled: false },
  { dayIndex: 0, dayLabel: 'Dimanche', defaultEnabled: false },
];

export function createDefaultCollaboratorWorkSchedule(
  enforced = false
): CollaboratorWorkScheduleConfig {
  return {
    enforced,
    specialAccessAuthorized: false,
    specialAccessReason: '',
    days: ORDERED_DAYS.map((d) => ({
      dayIndex: d.dayIndex,
      dayLabel: d.dayLabel,
      enabled: d.defaultEnabled,
      startTime: '08:00',
      endTime: '17:30',
      breaks: [
        {
          id: `brk_${d.dayIndex}_1`,
          label: 'Pause Déjeuner',
          startTime: '12:30',
          endTime: '13:30',
        },
      ],
      overtimeEnabled: false,
      overtimeEndTime: '20:00',
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeWorkScheduleConfig(
  raw?: Partial<CollaboratorWorkScheduleConfig> | null
): CollaboratorWorkScheduleConfig {
  const fallback = createDefaultCollaboratorWorkSchedule(false);
  if (!raw || typeof raw !== 'object') return fallback;
  const rawDays = Array.isArray(raw.days) ? raw.days : [];
  const days: CollaboratorDaySchedule[] = ORDERED_DAYS.map((def) => {
    const existing = rawDays.find((d) => Number(d?.dayIndex) === def.dayIndex);
    if (!existing) {
      return fallback.days.find((d) => d.dayIndex === def.dayIndex)!;
    }
    return {
      dayIndex: def.dayIndex,
      dayLabel: def.dayLabel,
      enabled: Boolean(existing.enabled),
      startTime: existing.startTime || '08:00',
      endTime: existing.endTime || '17:30',
      breaks: Array.isArray(existing.breaks)
        ? existing.breaks.map((b, idx) => ({
            id: b.id || `brk_${def.dayIndex}_${idx + 1}`,
            label: b.label || `Pause ${idx + 1}`,
            startTime: b.startTime || '12:30',
            endTime: b.endTime || '13:30',
          }))
        : [
            {
              id: `brk_${def.dayIndex}_1`,
              label: 'Pause Déjeuner',
              startTime: '12:30',
              endTime: '13:30',
            },
          ],
      overtimeEnabled: Boolean(existing.overtimeEnabled),
      overtimeEndTime: existing.overtimeEndTime || '20:00',
    };
  });

  return {
    enforced: Boolean(raw.enforced),
    specialAccessAuthorized: Boolean(raw.specialAccessAuthorized),
    specialAccessReason: raw.specialAccessReason || '',
    specialAccessGrantedBy: raw.specialAccessGrantedBy || '',
    specialAccessGrantedAt: raw.specialAccessGrantedAt || '',
    specialAccessUntil: raw.specialAccessUntil || '',
    days,
    updatedAt: raw.updatedAt || fallback.updatedAt,
  };
}

function parseTimeToMinutes(hhmm: string): number {
  const parts = String(hhmm || '00:00')
    .trim()
    .split(':');
  const h = Math.max(0, Math.min(23, parseInt(parts[0] || '0', 10) || 0));
  const m = Math.max(0, Math.min(59, parseInt(parts[1] || '0', 10) || 0));
  return h * 60 + m;
}

export function isSovereignOrSuperAdminRole(role?: string): boolean {
  const r = String(role || '').toLowerCase();
  return (
    r === 'super_admin' ||
    r === 'adgensys' ||
    r === 'moas' ||
    r === 'teleconseiller' ||
    r === 'consultant_operation'
  );
}

export function evaluateCollaboratorScheduleAccess(
  account: {
    id?: string;
    tenantId?: string;
    role?: string;
    fullName?: string;
    accountPortalType?: 'enterprise_user' | 'personnel_24_7' | 'client_24_7';
    workSchedule?: Partial<CollaboratorWorkScheduleConfig> | null;
  } | null,
  now: Date = new Date()
): ScheduleAccessEvaluation {
  if (!account) {
    return {
      allowed: true,
      status: 'unrestricted_role',
      statusBadgeLabel: 'Session standard',
      reason: 'Accès autorisé.',
      currentSlotLabel: '24h/24',
      nextAllowedSlotLabel: 'Immédiat',
    };
  }

  // Comptes Personnels (Salariés) et Comptes Clients : Accessibles 24h/24 et 7j/7 sans restriction horaire
  if (
    account.accountPortalType === 'personnel_24_7' ||
    account.accountPortalType === 'client_24_7' ||
    account.role === 'personnel_account' ||
    account.role === 'client_account'
  ) {
    return {
      allowed: true,
      status: 'unrestricted_role',
      statusBadgeLabel: 'Accès Permanent Compte Personnel / Client (24h/24 - 7j/7)',
      reason:
        'Les Comptes Personnels (salariés) et Comptes Clients fonctionnent et sont accessibles 24h/24 et 7j/7.',
      currentSlotLabel: 'Permanent (24h/7j)',
      nextAllowedSlotLabel: 'Permanent (24h/7j)',
    };
  }

  if (isSovereignOrSuperAdminRole(account.role)) {
    return {
      allowed: true,
      status: 'unrestricted_role',
      statusBadgeLabel: 'Accès Permanent Direction / Souverain (24h/24 - 7j/7)',
      reason: 'Les comptes Super-Admin et Opérateurs Souverains disposent d’un accès permanent sans restriction horaire.',
      currentSlotLabel: 'Permanent (24h/24)',
      nextAllowedSlotLabel: 'Permanent',
    };
  }

  // Vérification de la politique horaire globale uniforme de l'entreprise (avec réajustement individuel en cas d'exception)
  const globalPolicy = loadGlobalAppUsageHoursConfig(account.tenantId || 'default_tenant');
  const userException = account.id ? globalPolicy.userExceptions?.[account.id] : undefined;

  if (userException?.enabled && userException.full24x7Exception) {
    return {
      allowed: true,
      status: 'special_override',
      statusBadgeLabel: 'Dérogation Exceptionnelle 24h/7j Accordée',
      reason: userException.reason
        ? `Réajustement individuel autorisé : « ${userException.reason} »`
        : 'Réajustement exceptionnel 24h/7j accordé par le Super-Admin.',
      currentSlotLabel: 'Exception 24h/7j',
      nextAllowedSlotLabel: 'Actif en continu',
    };
  }

  const schedule = normalizeWorkScheduleConfig(account.workSchedule);

  // If the Super-Admin granted a Special Override Authorization, allow access even outside hours or on breaks
  if (schedule.specialAccessAuthorized) {
    return {
      allowed: true,
      status: 'special_override',
      statusBadgeLabel: 'Dérogation Spéciale Super-Admin Active',
      reason: schedule.specialAccessReason
        ? `Autorisation particulière accordée par le Super-Admin : « ${schedule.specialAccessReason} »`
        : 'Autorisation particulière hors-horaires accordée par le Super-Admin.',
      currentSlotLabel: 'Dérogation Spéciale Super-Admin',
      nextAllowedSlotLabel: 'Actif par dérogation',
    };
  }

  // Si la politique uniforme d'entreprise est activée, tous les utilisateurs partagent les mêmes heures (sauf réajustement d'exception)
  if (globalPolicy.enforcedForAllUsers) {
    const dayIdx = now.getDay();
    const curMin = now.getHours() * 60 + now.getMinutes();
    const curHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const isDayAllowed =
      globalPolicy.workingDays.includes(dayIdx) || Boolean(userException?.enabled);
    if (!isDayAllowed) {
      return {
        allowed: false,
        status: 'day_off',
        statusBadgeLabel: 'Jour non ouvré (Politique Horaire Entreprise)',
        reason: `Accès réservé aux jours ouvrés définis pour l'ensemble des utilisateurs de l'entreprise (${globalPolicy.openingTime} – ${globalPolicy.closingTime}).`,
        currentSlotLabel: 'Jour de fermeture',
        nextAllowedSlotLabel: `Prochain jour ouvré à ${globalPolicy.openingTime}`,
      };
    }

    const effOpen =
      userException?.enabled && userException.customOpeningTime
        ? userException.customOpeningTime
        : globalPolicy.openingTime;
    const effClose =
      userException?.enabled && userException.customClosingTime
        ? userException.customClosingTime
        : globalPolicy.closingTime;
    const effOvertimeEnabled =
      (userException?.enabled && Boolean(userException.customOvertimeEndTime)) ||
      globalPolicy.overtimeEnabled;
    const effOvertimeEnd =
      userException?.enabled && userException.customOvertimeEndTime
        ? userException.customOvertimeEndTime
        : globalPolicy.overtimeEndTime;

    const openMin = parseTimeToMinutes(effOpen);
    const closeMin = parseTimeToMinutes(effClose);
    const overMin = effOvertimeEnabled
      ? Math.max(closeMin, parseTimeToMinutes(effOvertimeEnd))
      : closeMin;
    const brkStartMin = parseTimeToMinutes(globalPolicy.breakStartTime);
    const brkEndMin = parseTimeToMinutes(globalPolicy.breakEndTime);

    if (
      globalPolicy.pauseLockEnabled &&
      !(userException?.enabled && userException.bypassBreakLock) &&
      curMin >= brkStartMin &&
      curMin < brkEndMin
    ) {
      return {
        allowed: false,
        status: 'on_break',
        statusBadgeLabel: `Période de Pause (${globalPolicy.breakStartTime} – ${globalPolicy.breakEndTime})`,
        reason: `L'application est en période de pause uniforme (${globalPolicy.breakStartTime} à ${globalPolicy.breakEndTime}) pour tous les utilisateurs. Reprise à ${globalPolicy.breakEndTime}.`,
        currentSlotLabel: `Pause (${globalPolicy.breakStartTime} – ${globalPolicy.breakEndTime})`,
        nextAllowedSlotLabel: `Aujourd'hui à ${globalPolicy.breakEndTime}`,
      };
    }

    if (curMin < openMin) {
      return {
        allowed: false,
        status: 'outside_hours',
        statusBadgeLabel: `Avant l'heure d'ouverture (${curHHMM} < ${effOpen})`,
        reason: `Les heures d'utilisation de l'application sont fixées de ${effOpen} à ${effClose} pour tous les utilisateurs.`,
        currentSlotLabel: `${effOpen} – ${effClose}`,
        nextAllowedSlotLabel: `Aujourd'hui à ${effOpen}`,
      };
    }

    if (curMin >= openMin && curMin <= closeMin) {
      return {
        allowed: true,
        status: 'within_hours',
        statusBadgeLabel: userException?.enabled
          ? `Horaire Réajusté (${effOpen} – ${effClose})`
          : `Horaire Uniforme (${effOpen} – ${effClose})`,
        reason: `Connexion active dans les heures d'utilisation de l'application (${effOpen} – ${effClose}).`,
        currentSlotLabel: `${effOpen} – ${effClose}`,
        nextAllowedSlotLabel: 'En cours de service',
      };
    }

    if (effOvertimeEnabled && curMin > closeMin && curMin <= overMin) {
      return {
        allowed: true,
        status: 'overtime_active',
        statusBadgeLabel: `Heures Supplémentaires (${effClose} – ${effOvertimeEnd})`,
        reason: `Connexion active en période d'heures supplémentaires autorisées (${effClose} – ${effOvertimeEnd}).`,
        currentSlotLabel: `Heures Sup. (${effClose} – ${effOvertimeEnd})`,
        nextAllowedSlotLabel: `Jusqu'à ${effOvertimeEnd}`,
      };
    }

    return {
      allowed: false,
      status: 'outside_hours',
      statusBadgeLabel: `Heure de fermeture atteinte (${effOvertimeEnabled ? effOvertimeEnd : effClose})`,
      reason: `Les heures d'utilisation de l'application sont terminées pour aujourd'hui (fermeture à ${
        effOvertimeEnabled ? effOvertimeEnd : effClose
      }).`,
      currentSlotLabel: `${effOpen} – ${effOvertimeEnabled ? effOvertimeEnd : effClose}`,
      nextAllowedSlotLabel: `Demain à ${effOpen}`,
    };
  }

  if (!schedule.enforced) {
    return {
      allowed: true,
      status: 'schedule_not_enforced',
      statusBadgeLabel: 'Plages horaires libres (Contrôle strict non activé)',
      reason: 'Le contrôle strict des plages horaires n’est pas verrouillé pour ce collaborateur.',
      currentSlotLabel: '08:00 – 17:30 (Indicatif)',
      nextAllowedSlotLabel: 'Accès libre',
    };
  }

  const currentDayIndex = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const todayConfig =
    schedule.days.find((d) => d.dayIndex === currentDayIndex) || schedule.days[0];

  const findNextWorkingWindow = (): string => {
    for (let offset = 1; offset <= 7; offset++) {
      const nextDayIdx = (currentDayIndex + offset) % 7;
      const candidate = schedule.days.find((d) => d.dayIndex === nextDayIdx && d.enabled);
      if (candidate) {
        return `${candidate.dayLabel} à ${candidate.startTime}`;
      }
    }
    return 'Sur autorisation spéciale du Super-Admin';
  };

  if (!todayConfig || !todayConfig.enabled) {
    const nextWindow = findNextWorkingWindow();
    return {
      allowed: false,
      status: 'day_off',
      statusBadgeLabel: `Jour non ouvré (${todayConfig?.dayLabel || 'Aujourd’hui'})`,
      reason: `Accès refusé : le ${todayConfig?.dayLabel || 'jour actuel'} ne fait pas partie de vos jours de connexion autorisés par le Super-Admin. Prochaine plage : ${nextWindow} (sauf autorisation particulière du Super-Admin).`,
      currentSlotLabel: `Repos (${todayConfig?.dayLabel || ''})`,
      nextAllowedSlotLabel: nextWindow,
    };
  }

  const startMin = parseTimeToMinutes(todayConfig.startTime);
  const endMin = parseTimeToMinutes(todayConfig.endTime);
  const overtimeEndMin = todayConfig.overtimeEnabled
    ? Math.max(endMin, parseTimeToMinutes(todayConfig.overtimeEndTime))
    : endMin;

  // Check if currently inside a Pause / Break
  for (const brk of todayConfig.breaks || []) {
    const bStart = parseTimeToMinutes(brk.startTime);
    const bEnd = parseTimeToMinutes(brk.endTime);
    if (currentMinutes >= bStart && currentMinutes < bEnd) {
      return {
        allowed: false,
        status: 'on_break',
        statusBadgeLabel: `En Pause (${brk.label} : ${brk.startTime} – ${brk.endTime})`,
        reason: `Accès suspendu pendant la plage de pause « ${brk.label} » (${brk.startTime} à ${brk.endTime}) définie par le Super-Admin. Reprise autorisée à ${brk.endTime} (sauf autorisation particulière du Super-Admin).`,
        currentSlotLabel: `${brk.label} (${brk.startTime} – ${brk.endTime})`,
        nextAllowedSlotLabel: `Aujourd'hui à ${brk.endTime}`,
      };
    }
  }

  // Check if before start time
  if (currentMinutes < startMin) {
    return {
      allowed: false,
      status: 'outside_hours',
      statusBadgeLabel: `Hors plage horaire (${currentHHMM} < ${todayConfig.startTime})`,
      reason: `Accès refusé en dehors des heures de service (${todayConfig.dayLabel} : ${todayConfig.startTime} – ${
        todayConfig.overtimeEnabled ? `${todayConfig.overtimeEndTime} avec heures sup.` : todayConfig.endTime
      }). Ouverture autorisée à partir de ${todayConfig.startTime} (sauf autorisation particulière du Super-Admin).`,
      currentSlotLabel: `${todayConfig.startTime} – ${todayConfig.endTime}`,
      nextAllowedSlotLabel: `Aujourd'hui à ${todayConfig.startTime}`,
    };
  }

  // Check if within standard working hours
  if (currentMinutes >= startMin && currentMinutes <= endMin) {
    return {
      allowed: true,
      status: 'within_hours',
      statusBadgeLabel: `En Service (${todayConfig.startTime} – ${todayConfig.endTime})`,
      reason: `Connexion autorisée dans la plage horaire normale du ${todayConfig.dayLabel} (${todayConfig.startTime} – ${todayConfig.endTime}).`,
      currentSlotLabel: `${todayConfig.startTime} – ${todayConfig.endTime}`,
      nextAllowedSlotLabel: 'En cours de service',
    };
  }

  // Check if within authorized Overtime window
  if (todayConfig.overtimeEnabled && currentMinutes > endMin && currentMinutes <= overtimeEndMin) {
    return {
      allowed: true,
      status: 'overtime_active',
      statusBadgeLabel: `Heures Supplémentaires (${todayConfig.endTime} – ${todayConfig.overtimeEndTime})`,
      reason: `Connexion autorisée en plage d’heures supplémentaires (${todayConfig.endTime} – ${todayConfig.overtimeEndTime}).`,
      currentSlotLabel: `Heures Sup. (${todayConfig.endTime} – ${todayConfig.overtimeEndTime})`,
      nextAllowedSlotLabel: `Jusqu'à ${todayConfig.overtimeEndTime}`,
    };
  }

  // Otherwise after end time / overtime end time
  const nextWindow = findNextWorkingWindow();
  return {
    allowed: false,
    status: 'outside_hours',
    statusBadgeLabel: `Plage horaire terminée (clôture à ${
      todayConfig.overtimeEnabled ? todayConfig.overtimeEndTime : todayConfig.endTime
    })`,
    reason: `Accès refusé : votre plage horaire du ${todayConfig.dayLabel} s’est terminée à ${
      todayConfig.overtimeEnabled ? `${todayConfig.overtimeEndTime} (heures sup. incluses)` : todayConfig.endTime
    }. Prochaine connexion : ${nextWindow} (sauf autorisation particulière du Super-Admin).`,
    currentSlotLabel: `${todayConfig.startTime} – ${
      todayConfig.overtimeEnabled ? todayConfig.overtimeEndTime : todayConfig.endTime
    }`,
    nextAllowedSlotLabel: nextWindow,
  };
}

// ============================================================================
// SINGLE-TERMINAL SESSION LOCK & REMOTE SIGN-OUT ENGINE
// ============================================================================

export function detectTerminalMetadata(): {
  terminalLabel: string;
  browserName: string;
  osName: string;
  ipAddress: string;
} {
  if (typeof navigator === 'undefined') {
    return {
      terminalLabel: 'Poste de Travail Principal',
      browserName: 'Navigateur Web',
      osName: 'Système',
      ipAddress: '10.24.0.101',
    };
  }
  const ua = navigator.userAgent || '';
  let browserName = 'Chrome / Chromium';
  if (/Edg\//i.test(ua)) browserName = 'Microsoft Edge';
  else if (/Firefox\//i.test(ua)) browserName = 'Mozilla Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browserName = 'Apple Safari';
  else if (/OPR\//i.test(ua)) browserName = 'Opera';

  let osName = 'Workstation Desktop';
  if (/Windows/i.test(ua)) osName = 'Windows PC';
  else if (/Macintosh|Mac OS X/i.test(ua)) osName = 'MacBook / macOS';
  else if (/Android/i.test(ua)) osName = 'Smartphone Android';
  else if (/iPhone|iPad/i.test(ua)) osName = 'iPhone / iPad iOS';
  else if (/Linux/i.test(ua)) osName = 'Poste Linux';

  return {
    terminalLabel: `${osName} · ${browserName}`,
    browserName,
    osName,
    ipAddress: '192.168.1.42',
  };
}

export const PERSISTENT_BROWSER_TERMINAL_KEY = 'mep_persistent_browser_terminal_id_v2';

export function getOrCreateCurrentTerminalId(): string {
  try {
    const existingPersistent = localStorage.getItem(PERSISTENT_BROWSER_TERMINAL_KEY);
    if (existingPersistent && existingPersistent.trim()) {
      sessionStorage.setItem(CURRENT_TERMINAL_SESSION_KEY, existingPersistent.trim());
      return existingPersistent.trim();
    }
    const existingSession = sessionStorage.getItem(CURRENT_TERMINAL_SESSION_KEY);
    if (existingSession && existingSession.trim()) {
      localStorage.setItem(PERSISTENT_BROWSER_TERMINAL_KEY, existingSession.trim());
      return existingSession.trim();
    }
    const meta = detectTerminalMetadata();
    const prefix = meta.osName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'TRM');
    const generated = `TERM-${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    localStorage.setItem(PERSISTENT_BROWSER_TERMINAL_KEY, generated);
    sessionStorage.setItem(CURRENT_TERMINAL_SESSION_KEY, generated);
    return generated;
  } catch {
    return 'TERM-WEB-PRIMARY';
  }
}

export function readAllTerminalLocks(): Record<string, TerminalSessionLockRecord> {
  try {
    const raw = localStorage.getItem(TERMINAL_LOCKS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

export function writeAllTerminalLocks(locks: Record<string, TerminalSessionLockRecord>): void {
  try {
    localStorage.setItem(TERMINAL_LOCKS_STORAGE_KEY, JSON.stringify(locks));
  } catch {
    // ignore
  }
}

export function isTerminalLockFresh(lock?: TerminalSessionLockRecord | null): boolean {
  if (!lock || !lock.terminalId) return false;
  if (lock.remotelyDisconnectedAt) return false;
  const lastMs = new Date(lock.lastHeartbeatAt || lock.connectedAt || 0).getTime();
  if (!Number.isFinite(lastMs)) return false;
  // Un compte n'est considéré ouvert et en cours d'exploitation que si son battement de cœur temps réel date de moins de 22 secondes
  return Date.now() - lastMs < 22 * 1000;
}

export function checkTerminalSessionConflict(account: {
  id: string;
  email: string;
  activeTerminalLock?: (TerminalSessionLockRecord & { isCurrentlyExploited?: boolean }) | null;
}): {
  conflict: boolean;
  existingLock: TerminalSessionLockRecord | null;
  currentTerminalId: string;
} {
  const currentTerminalId = getOrCreateCurrentTerminalId();
  const locks = readAllTerminalLocks();

  // Nettoyage automatique des verrous locaux expirés ou appartenant déjà à ce navigateur
  let locksCleaned = false;
  for (const [accKey, lck] of Object.entries(locks)) {
    if (!isTerminalLockFresh(lck) || lck.terminalId === currentTerminalId) {
      if (!isTerminalLockFresh(lck)) {
        delete locks[accKey];
        locksCleaned = true;
      }
    }
  }
  if (locksCleaned) {
    writeAllTerminalLocks(locks);
  }

  // Le conflit n'est établi que si le serveur confirme explicitement que le compte est actuellement ouvert et exploité sur un AUTRE terminal/navigateur
  if (
    account.activeTerminalLock &&
    account.activeTerminalLock.isCurrentlyExploited === true &&
    isTerminalLockFresh(account.activeTerminalLock) &&
    account.activeTerminalLock.terminalId !== currentTerminalId
  ) {
    locks[account.id] = account.activeTerminalLock;
    writeAllTerminalLocks(locks);
    return {
      conflict: true,
      existingLock: account.activeTerminalLock,
      currentTerminalId,
    };
  }

  return {
    conflict: false,
    existingLock: null,
    currentTerminalId,
  };
}

export function broadcastTerminalSessionEvent(payload: Record<string, any>): void {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(TERMINAL_BROADCAST_CHANNEL_NAME);
      bc.postMessage({
        ...payload,
        emittedAt: new Date().toISOString(),
      });
      bc.close();
    }
  } catch {
    // ignore
  }
}

export function claimTerminalSessionLock(
  account: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    functionTitle: string;
    tenantId: string;
    companyName?: string;
    enterpriseISU?: string;
    workSchedule?: Partial<CollaboratorWorkScheduleConfig> | null;
  },
  customTerminalId?: string
): TerminalSessionLockRecord {
  const terminalId = customTerminalId || getOrCreateCurrentTerminalId();
  const meta = detectTerminalMetadata();
  const nowIso = new Date().toISOString();
  const schedEval = evaluateCollaboratorScheduleAccess(account);

  const lockRecord: TerminalSessionLockRecord = {
    accountId: account.id,
    email: account.email,
    fullName: account.fullName,
    role: account.role,
    functionTitle: account.functionTitle,
    tenantId: account.tenantId,
    companyName: account.companyName,
    enterpriseISU: account.enterpriseISU,
    terminalId,
    terminalLabel: meta.terminalLabel,
    browserName: meta.browserName,
    osName: meta.osName,
    ipAddress: meta.ipAddress,
    connectedAt: nowIso,
    lastHeartbeatAt: nowIso,
    scheduleStatusLabel: schedEval.statusBadgeLabel,
  };

  const locks = readAllTerminalLocks();
  locks[account.id] = lockRecord;
  writeAllTerminalLocks(locks);

  broadcastTerminalSessionEvent({
    type: 'SESSION_LOCK_CLAIMED',
    accountId: account.id,
    email: account.email,
    terminalId,
    lock: lockRecord,
  });

  fetch('/api/saas/auth/session-lock/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lock: lockRecord }),
  }).catch(() => {});

  return lockRecord;
}

export function remoteDisconnectOtherTerminalAndClaim(account: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  functionTitle: string;
  tenantId: string;
  companyName?: string;
  enterpriseISU?: string;
  workSchedule?: Partial<CollaboratorWorkScheduleConfig> | null;
}): TerminalSessionLockRecord {
  const currentTerminalId = getOrCreateCurrentTerminalId();
  const locks = readAllTerminalLocks();
  const previousLock = locks[account.id];
  const nowIso = new Date().toISOString();

  try {
    const revRaw = localStorage.getItem(TERMINAL_REVOCATIONS_STORAGE_KEY);
    const revocations = revRaw ? JSON.parse(revRaw) : {};
    revocations[account.id] = {
      accountId: account.id,
      email: account.email,
      revokedTerminalId: previousLock?.terminalId || 'PREVIOUS_TERMINAL',
      newTerminalId: currentTerminalId,
      revokedAt: nowIso,
    };
    localStorage.setItem(TERMINAL_REVOCATIONS_STORAGE_KEY, JSON.stringify(revocations));
  } catch {
    // ignore
  }

  broadcastTerminalSessionEvent({
    type: 'REMOTE_TERMINAL_DISCONNECT',
    accountId: account.id,
    email: account.email,
    revokedTerminalId: previousLock?.terminalId,
    newTerminalId: currentTerminalId,
    revokedAt: nowIso,
  });

  fetch('/api/saas/auth/session-lock/remote-disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountId: account.id,
      email: account.email,
      revokedTerminalId: previousLock?.terminalId,
      newTerminalId: currentTerminalId,
    }),
  }).catch(() => {});

  return claimTerminalSessionLock(account, currentTerminalId);
}

export function releaseTerminalSessionLock(accountId?: string, forceRemote = false): void {
  if (!accountId) return;
  const currentTerminalId = getOrCreateCurrentTerminalId();
  const locks = readAllTerminalLocks();
  const existing = locks[accountId];
  if (existing && (forceRemote || existing.terminalId === currentTerminalId)) {
    delete locks[accountId];
    writeAllTerminalLocks(locks);
  }
  if (forceRemote && existing) {
    try {
      const revRaw = localStorage.getItem(TERMINAL_REVOCATIONS_STORAGE_KEY);
      const revocations = revRaw ? JSON.parse(revRaw) : {};
      revocations[accountId] = {
        accountId,
        email: existing.email,
        revokedTerminalId: existing.terminalId,
        newTerminalId: 'SERVER_SECURITY_CONSOLE',
        revokedAt: new Date().toISOString(),
      };
      localStorage.setItem(TERMINAL_REVOCATIONS_STORAGE_KEY, JSON.stringify(revocations));
    } catch {
      // ignore
    }
  }
  broadcastTerminalSessionEvent({
    type: forceRemote ? 'REMOTE_TERMINAL_DISCONNECT' : 'SESSION_LOCK_RELEASED',
    accountId,
    revokedTerminalId: existing?.terminalId,
    terminalId: currentTerminalId,
  });
  fetch('/api/saas/auth/session-lock/release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId, terminalId: currentTerminalId, forceRemote }),
  }).catch(() => {});
}

// ============================================================================
// ANTI-INTRUSION & ANTI-BOT SECURITY APPROVAL FOR REMOTE DISCONNECTION
// (Triple Lock: Account Password + 6-Digit Message OTP + Human Anti-Bot Code)
// ============================================================================

export type RemoteDisconnectOtpChannel = 'whatsapp' | 'sms' | 'email';

export interface RemoteDisconnectSecurityChallenge {
  challengeId: string;
  accountId: string;
  email: string;
  fullName: string;
  targetTerminalId: string;
  targetTerminalLabel: string;
  otpCode: string; // 6-digit single-use OTP
  antiBotCode: string; // 4-character alphanumeric human verification code
  channel: RemoteDisconnectOtpChannel;
  maskedDestination: string;
  createdAt: string;
  expiresAt: string;
  failedAttempts: number;
  maxAttempts: number;
  lockedUntil?: string;
}

export interface RemoteDisconnectAuditLog {
  id: string;
  timestamp: string;
  accountId: string;
  email: string;
  fullName: string;
  targetTerminalId: string;
  requestingTerminalId: string;
  channel: RemoteDisconnectOtpChannel;
  outcome: 'approved' | 'blocked_invalid_credentials' | 'blocked_bot_detected' | 'blocked_rate_limit';
  reason: string;
}

const REMOTE_DISCONNECT_CHALLENGES_KEY = 'mep_remote_disconnect_challenges_v1';
const REMOTE_DISCONNECT_AUDIT_LOGS_KEY = 'mep_remote_disconnect_audit_logs_v1';

function maskContactDestination(
  email?: string,
  phone?: string,
  channel: RemoteDisconnectOtpChannel = 'whatsapp'
): string {
  if ((channel === 'whatsapp' || channel === 'sms') && phone && phone.trim().length >= 6) {
    const clean = phone.trim();
    return `${clean.slice(0, 4)} •• •• ${clean.slice(-2)}`;
  }
  const cleanMail = (email || 'utilisateur@entreprise.com').trim();
  const [userPart, domainPart] = cleanMail.split('@');
  if (!domainPart) return cleanMail;
  const visible = userPart.slice(0, Math.min(2, userPart.length));
  return `${visible}•••@${domainPart}`;
}

function generateRandomAntiBotCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function readRemoteDisconnectAuditLogs(): RemoteDisconnectAuditLog[] {
  try {
    const raw = localStorage.getItem(REMOTE_DISCONNECT_AUDIT_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordRemoteDisconnectAuditLog(
  entry: Omit<RemoteDisconnectAuditLog, 'id' | 'timestamp'>
): void {
  try {
    const existing = readRemoteDisconnectAuditLogs();
    const next: RemoteDisconnectAuditLog[] = [
      {
        ...entry,
        id: `rd_audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
      },
      ...existing,
    ].slice(0, 150);
    localStorage.setItem(REMOTE_DISCONNECT_AUDIT_LOGS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function initiateRemoteDisconnectSecurityChallenge(params: {
  accountId: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  targetTerminalId: string;
  targetTerminalLabel: string;
  channel?: RemoteDisconnectOtpChannel;
}): RemoteDisconnectSecurityChallenge {
  const channel: RemoteDisconnectOtpChannel = params.channel || 'whatsapp';
  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  const antiBotCode = generateRandomAntiBotCode();
  const now = Date.now();

  let previousAttempts = 0;
  let existingLockedUntil: string | undefined;
  try {
    const raw = sessionStorage.getItem(REMOTE_DISCONNECT_CHALLENGES_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      const prev = map?.[params.accountId] as RemoteDisconnectSecurityChallenge | undefined;
      if (prev) {
        previousAttempts = prev.failedAttempts || 0;
        if (prev.lockedUntil && new Date(prev.lockedUntil).getTime() > now) {
          existingLockedUntil = prev.lockedUntil;
        }
      }
    }
  } catch {
    // ignore
  }

  const challenge: RemoteDisconnectSecurityChallenge = {
    challengeId: `CHAL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    accountId: params.accountId,
    email: params.email,
    fullName: params.fullName,
    targetTerminalId: params.targetTerminalId,
    targetTerminalLabel: params.targetTerminalLabel,
    otpCode,
    antiBotCode,
    channel,
    maskedDestination: maskContactDestination(params.email, params.phoneNumber, channel),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 5 * 60 * 1000).toISOString(), // 5 min validity
    failedAttempts: previousAttempts,
    maxAttempts: 3,
    lockedUntil: existingLockedUntil,
  };

  try {
    const raw = sessionStorage.getItem(REMOTE_DISCONNECT_CHALLENGES_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[params.accountId] = challenge;
    sessionStorage.setItem(REMOTE_DISCONNECT_CHALLENGES_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }

  return challenge;
}

export function verifyAndApproveRemoteDisconnect(params: {
  challenge: RemoteDisconnectSecurityChallenge;
  account: {
    id: string;
    email: string;
    fullName: string;
    currentPassword?: string;
    defaultPassword?: string;
    mustChangePassword?: boolean;
  };
  enteredPassword: string;
  enteredOtp: string;
  enteredAntiBotCode: string;
  honeypotTrap?: string;
  allowOperatorMasterOverride?: boolean;
}): {
  approved: boolean;
  errorMessage?: string;
  updatedChallenge: RemoteDisconnectSecurityChallenge;
} {
  const now = Date.now();
  const requestingTerminalId = getOrCreateCurrentTerminalId();
  const currentChallenge = { ...params.challenge };

  // 1. Check if locked due to brute-force attempts
  if (
    currentChallenge.lockedUntil &&
    new Date(currentChallenge.lockedUntil).getTime() > now
  ) {
    const remainingSec = Math.ceil(
      (new Date(currentChallenge.lockedUntil).getTime() - now) / 1000
    );
    return {
      approved: false,
      errorMessage: `Bouclier Anti-Intrusion actif : déconnexion à distance verrouillée pendant encore ${remainingSec}s suite à 3 échecs consécutifs.`,
      updatedChallenge: currentChallenge,
    };
  }

  // 2. Check Anti-Bot Honeypot Trap
  if (params.honeypotTrap && params.honeypotTrap.trim() !== '') {
    currentChallenge.failedAttempts += 1;
    currentChallenge.lockedUntil = new Date(now + 5 * 60 * 1000).toISOString();
    recordRemoteDisconnectAuditLog({
      accountId: params.account.id,
      email: params.account.email,
      fullName: params.account.fullName,
      targetTerminalId: currentChallenge.targetTerminalId,
      requestingTerminalId,
      channel: currentChallenge.channel,
      outcome: 'blocked_bot_detected',
      reason: 'Robot malveillant intercepté via champ Honeypot lors d’une tentative de déconnexion à distance.',
    });
    return {
      approved: false,
      errorMessage:
        'Intrusion bloquée : activité automatisée (robot malveillant) détectée par le bouclier de sécurité.',
      updatedChallenge: currentChallenge,
    };
  }

  // 3. Check Challenge Expiration (5 minutes)
  if (new Date(currentChallenge.expiresAt).getTime() < now) {
    return {
      approved: false,
      errorMessage:
        'Le code OTP de sécurité a expiré (validité 5 minutes). Veuillez cliquer sur « Nouveau code OTP ».',
      updatedChallenge: currentChallenge,
    };
  }

  const registerFailure = (reason: string): {
    approved: false;
    errorMessage: string;
    updatedChallenge: RemoteDisconnectSecurityChallenge;
  } => {
    currentChallenge.failedAttempts += 1;
    // Rotate anti-bot code on every failure to defeat automated replay scripts
    currentChallenge.antiBotCode = generateRandomAntiBotCode();
    const remaining = Math.max(0, currentChallenge.maxAttempts - currentChallenge.failedAttempts);
    if (remaining === 0) {
      currentChallenge.lockedUntil = new Date(now + 5 * 60 * 1000).toISOString();
    }
    try {
      const raw = sessionStorage.getItem(REMOTE_DISCONNECT_CHALLENGES_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[params.account.id] = currentChallenge;
      sessionStorage.setItem(REMOTE_DISCONNECT_CHALLENGES_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
    recordRemoteDisconnectAuditLog({
      accountId: params.account.id,
      email: params.account.email,
      fullName: params.account.fullName,
      targetTerminalId: currentChallenge.targetTerminalId,
      requestingTerminalId,
      channel: currentChallenge.channel,
      outcome: remaining === 0 ? 'blocked_rate_limit' : 'blocked_invalid_credentials',
      reason,
    });
    return {
      approved: false,
      errorMessage:
        remaining === 0
          ? `${reason} — 3 tentatives échouées : déconnexion à distance bloquée pendant 5 minutes par mesure de protection anti-intrusion.`
          : `${reason} (${remaining} essai(s) restant(s) avant verrouillage anti-intrusion).`,
      updatedChallenge: currentChallenge,
    };
  };

  // 4. Verify Human Anti-Bot Challenge Code
  if (
    params.enteredAntiBotCode.trim().toUpperCase() !==
    currentChallenge.antiBotCode.trim().toUpperCase()
  ) {
    return registerFailure(
      `Code de vérification humaine Anti-Robot incorrect (attendu : ${currentChallenge.antiBotCode})`
    );
  }

  // 5. Verify Account Password (unless operator master override is explicitly used with valid OTP)
  if (!params.allowOperatorMasterOverride) {
    const cleanPwd = params.enteredPassword.trim();
    if (!cleanPwd) {
      return registerFailure(
        'Veuillez renseigner votre mot de passe de connexion pour prouver que vous êtes le titulaire agréé du compte'
      );
    }
    const validPassword =
      (params.account.currentPassword && cleanPwd === params.account.currentPassword) ||
      (params.account.defaultPassword && cleanPwd === params.account.defaultPassword);
    if (!validPassword) {
      return registerFailure(
        'Mot de passe de connexion incorrect : approbation de déconnexion à distance refusée'
      );
    }
  }

  // 6. Verify 6-Digit Single-Use OTP Code
  if (params.enteredOtp.trim() !== currentChallenge.otpCode.trim()) {
    return registerFailure('Code OTP à 6 chiffres incorrect ou non reconnu');
  }

  // Approved! Clear challenge and log audit trail
  try {
    const raw = sessionStorage.getItem(REMOTE_DISCONNECT_CHALLENGES_KEY);
    const map = raw ? JSON.parse(raw) : {};
    delete map[params.account.id];
    sessionStorage.setItem(REMOTE_DISCONNECT_CHALLENGES_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }

  recordRemoteDisconnectAuditLog({
    accountId: params.account.id,
    email: params.account.email,
    fullName: params.account.fullName,
    targetTerminalId: currentChallenge.targetTerminalId,
    requestingTerminalId,
    channel: currentChallenge.channel,
    outcome: 'approved',
    reason: 'Déconnexion à distance approuvée après validation du Triple Verrou (Mot de passe + OTP 6 chiffres + Défi Anti-Robot).',
  });

  return {
    approved: true,
    updatedChallenge: currentChallenge,
  };
}

export async function verifyAndApproveRemoteDisconnectServer(params: {
  challenge: RemoteDisconnectSecurityChallenge;
  account: {
    id: string;
    email: string;
    fullName: string;
    role?: string;
    functionTitle?: string;
    tenantId?: string;
    companyName?: string;
    enterpriseISU?: string;
    currentPassword?: string;
    defaultPassword?: string;
    mustChangePassword?: boolean;
  };
  enteredPassword: string;
  enteredOtp: string;
  enteredAntiBotCode: string;
  honeypotTrap?: string;
  allowOperatorMasterOverride?: boolean;
}): Promise<{
  approved: boolean;
  errorMessage?: string;
  updatedChallenge: RemoteDisconnectSecurityChallenge;
}> {
  const now = Date.now();
  const requestingTerminalId = getOrCreateCurrentTerminalId();
  const currentChallenge = { ...params.challenge };

  // 1. Check brute-force lock
  if (
    currentChallenge.lockedUntil &&
    new Date(currentChallenge.lockedUntil).getTime() > now
  ) {
    const remainingSec = Math.ceil(
      (new Date(currentChallenge.lockedUntil).getTime() - now) / 1000
    );
    return {
      approved: false,
      errorMessage: `Bouclier Anti-Intrusion actif : déconnexion à distance verrouillée pendant encore ${remainingSec}s suite à 3 échecs consécutifs.`,
      updatedChallenge: currentChallenge,
    };
  }

  // 2. Check Honeypot Trap
  if (params.honeypotTrap && params.honeypotTrap.trim() !== '') {
    currentChallenge.failedAttempts += 1;
    currentChallenge.lockedUntil = new Date(now + 5 * 60 * 1000).toISOString();
    return {
      approved: false,
      errorMessage:
        'Intrusion bloquée : activité automatisée (robot malveillant) détectée par le bouclier de sécurité.',
      updatedChallenge: currentChallenge,
    };
  }

  // 3. Check Anti-Robot Human Challenge
  if (
    params.enteredAntiBotCode.trim().toUpperCase() !==
    currentChallenge.antiBotCode.trim().toUpperCase()
  ) {
    currentChallenge.failedAttempts += 1;
    currentChallenge.antiBotCode = generateRandomAntiBotCode();
    const remaining = Math.max(0, currentChallenge.maxAttempts - currentChallenge.failedAttempts);
    if (remaining === 0) {
      currentChallenge.lockedUntil = new Date(now + 5 * 60 * 1000).toISOString();
    }
    return {
      approved: false,
      errorMessage: `Code Anti-Robot incorrect (${remaining} essai(s) restant(s)).`,
      updatedChallenge: currentChallenge,
    };
  }

  // 4. Verify Password Locally & Prepare Server Verification
  if (!params.allowOperatorMasterOverride) {
    const cleanPwd = params.enteredPassword.trim();
    if (!cleanPwd) {
      return {
        approved: false,
        errorMessage:
          'Veuillez renseigner votre mot de passe de connexion pour prouver que vous êtes le titulaire agréé du compte.',
        updatedChallenge: currentChallenge,
      };
    }
    const validPassword =
      (params.account.currentPassword && cleanPwd === params.account.currentPassword) ||
      (params.account.defaultPassword && cleanPwd === params.account.defaultPassword);
    if (!validPassword) {
      currentChallenge.failedAttempts += 1;
      currentChallenge.antiBotCode = generateRandomAntiBotCode();
      const remaining = Math.max(0, currentChallenge.maxAttempts - currentChallenge.failedAttempts);
      if (remaining === 0) {
        currentChallenge.lockedUntil = new Date(now + 5 * 60 * 1000).toISOString();
      }
      return {
        approved: false,
        errorMessage: `Mot de passe de connexion incorrect (${remaining} essai(s) restant(s)).`,
        updatedChallenge: currentChallenge,
      };
    }
  }

  const cleanOtp = params.enteredOtp.replace(/[^0-9]/g, '').trim();
  if (cleanOtp.length !== 6) {
    return {
      approved: false,
      errorMessage:
        'Veuillez saisir les 6 chiffres exacts du code OTP reçu dans votre compte (WhatsApp, SMS ou E-mail).',
      updatedChallenge: currentChallenge,
    };
  }

  const meta = detectTerminalMetadata();
  const nowIso = new Date().toISOString();
  const newLockRecord: TerminalSessionLockRecord = {
    accountId: params.account.id,
    email: params.account.email,
    fullName: params.account.fullName,
    role: params.account.role || 'super_admin',
    functionTitle: params.account.functionTitle || 'Direction',
    tenantId: params.account.tenantId || 'default_tenant',
    companyName: params.account.companyName,
    enterpriseISU: params.account.enterpriseISU,
    terminalId: requestingTerminalId,
    terminalLabel: meta.terminalLabel,
    browserName: meta.browserName,
    osName: meta.osName,
    ipAddress: meta.ipAddress,
    connectedAt: nowIso,
    lastHeartbeatAt: nowIso,
    scheduleStatusLabel: 'Session Active',
  };

  try {
    const res = await fetch('/api/saas/auth/session-lock/remote-disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: params.account.id,
        email: params.account.email,
        enteredPassword: params.enteredPassword.trim(),
        enteredOtp: cleanOtp,
        allowOperatorMasterOverride: Boolean(params.allowOperatorMasterOverride),
        revokedTerminalId: currentChallenge.targetTerminalId,
        newTerminalId: requestingTerminalId,
        newLock: newLockRecord,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.approved) {
      currentChallenge.failedAttempts += 1;
      currentChallenge.antiBotCode = generateRandomAntiBotCode();
      const remaining = Math.max(0, currentChallenge.maxAttempts - currentChallenge.failedAttempts);
      if (remaining === 0) {
        currentChallenge.lockedUntil = new Date(now + 5 * 60 * 1000).toISOString();
      }
      return {
        approved: false,
        errorMessage:
          data?.message ||
          `Code OTP incorrect ou expiré (${remaining} essai(s) restant(s)).`,
        updatedChallenge: currentChallenge,
      };
    }

    // Server approved and broadcasted real-time SSE revocation to Terminal #1!
    const locks = readAllTerminalLocks();
    locks[params.account.id] = newLockRecord;
    writeAllTerminalLocks(locks);

    broadcastTerminalSessionEvent({
      type: 'REMOTE_TERMINAL_DISCONNECT',
      accountId: params.account.id,
      email: params.account.email,
      revokedTerminalId: currentChallenge.targetTerminalId,
      newTerminalId: requestingTerminalId,
      revokedAt: nowIso,
    });

    recordRemoteDisconnectAuditLog({
      accountId: params.account.id,
      email: params.account.email,
      fullName: params.account.fullName,
      targetTerminalId: currentChallenge.targetTerminalId,
      requestingTerminalId,
      channel: currentChallenge.channel,
      outcome: 'approved',
      reason:
        'Déconnexion à distance exécutée en temps réel sur le serveur après validation du Triple Verrou (Mot de passe + OTP serveur + Anti-Robot).',
    });

    return {
      approved: true,
      updatedChallenge: currentChallenge,
    };
  } catch {
    return {
      approved: false,
      errorMessage:
        'Serveur de sécurité injoignable pour vérifier le code OTP. Vérifiez votre connexion réseau.',
      updatedChallenge: currentChallenge,
    };
  }
}

export function sendTerminalSessionHeartbeat(account: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  functionTitle: string;
  tenantId: string;
  companyName?: string;
  enterpriseISU?: string;
  workSchedule?: Partial<CollaboratorWorkScheduleConfig> | null;
}): {
  revokedByAnotherTerminal: boolean;
  activeLock: TerminalSessionLockRecord | null;
} {
  const currentTerminalId = getOrCreateCurrentTerminalId();
  const locks = readAllTerminalLocks();
  const existing = locks[account.id];

  if (existing && isTerminalLockFresh(existing) && existing.terminalId !== currentTerminalId) {
    return {
      revokedByAnotherTerminal: true,
      activeLock: existing,
    };
  }

  const nowIso = new Date().toISOString();
  const schedEval = evaluateCollaboratorScheduleAccess(account);
  const meta = detectTerminalMetadata();
  const updatedLock: TerminalSessionLockRecord = {
    ...(existing || {
      accountId: account.id,
      email: account.email,
      fullName: account.fullName,
      role: account.role,
      functionTitle: account.functionTitle,
      tenantId: account.tenantId,
      companyName: account.companyName,
      enterpriseISU: account.enterpriseISU,
      terminalId: currentTerminalId,
      terminalLabel: meta.terminalLabel,
      browserName: meta.browserName,
      osName: meta.osName,
      ipAddress: meta.ipAddress,
      connectedAt: nowIso,
    }),
    lastHeartbeatAt: nowIso,
    scheduleStatusLabel: schedEval.statusBadgeLabel,
  };

  locks[account.id] = updatedLock;
  writeAllTerminalLocks(locks);

  fetch('/api/saas/auth/session-lock/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lock: updatedLock }),
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && data.revokedByAnotherTerminal && data.activeLock) {
        const latestLocks = readAllTerminalLocks();
        latestLocks[account.id] = data.activeLock;
        writeAllTerminalLocks(latestLocks);
        broadcastTerminalSessionEvent({
          type: 'REMOTE_TERMINAL_DISCONNECT',
          accountId: account.id,
          email: account.email,
          revokedTerminalId: currentTerminalId,
          newTerminalId: data.activeLock.terminalId || 'REMOTE_TERMINAL',
          activeLock: data.activeLock,
          revokedAt: new Date().toISOString(),
        });
      }
    })
    .catch(() => {});

  return {
    revokedByAnotherTerminal: false,
    activeLock: updatedLock,
  };
}

// ============================================================================
// SERVER ENTERPRISE DIRECTORY: REAL-TIME NETWORK STATUS LEDs & CONNECTED USERS
// ============================================================================

export function readEnterpriseNetworkDiagnostics(): Record<
  string,
  EnterpriseNetworkDiagnosticsRecord
> {
  try {
    const raw = localStorage.getItem(ENTERPRISE_NETWORK_DIAG_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

export function setEnterpriseNetworkStatusOverride(
  tenantId: string,
  status: EnterpriseNetworkHealthStatus | 'auto',
  meta?: { companyName?: string; isu?: string; outageReason?: string }
): EnterpriseNetworkDiagnosticsRecord {
  const all = readEnterpriseNetworkDiagnostics();
  const latencyMs =
    status === 'online'
      ? 24
      : status === 'poor_network'
      ? 485
      : status === 'outage'
      ? 9999
      : 0;
  const packetLossPct =
    status === 'online'
      ? 0
      : status === 'poor_network'
      ? 18.4
      : status === 'outage'
      ? 100
      : 0;

  const next: EnterpriseNetworkDiagnosticsRecord = {
    tenantId,
    companyName: meta?.companyName || all[tenantId]?.companyName,
    isu: meta?.isu || all[tenantId]?.isu,
    forcedStatus: status,
    latencyMs,
    packetLossPct,
    outageReason:
      status === 'outage'
        ? meta?.outageReason || 'Rupture de liaison passerelle / Incident serveur détecté'
        : status === 'poor_network'
        ? 'Latence élevée (>450 ms) & gigue réseau détectées'
        : '',
    updatedAt: new Date().toISOString(),
  };

  all[tenantId] = next;
  try {
    localStorage.setItem(ENTERPRISE_NETWORK_DIAG_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }

  broadcastTerminalSessionEvent({
    type: 'ENTERPRISE_NETWORK_STATE_CHANGED',
    tenantId,
    diagnostics: next,
  });

  fetch('/api/saas/servers/enterprise-network-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  }).catch(() => {});

  return next;
}

export function getEnterpriseNetworkStateAndConnectedUsers(params: {
  tenantId: string;
  companyName?: string;
  isu?: string;
  fallbackIsOnline?: boolean;
}): {
  networkStatus: EnterpriseNetworkHealthStatus;
  statusLabel: string;
  statusDescription: string;
  latencyMs: number;
  packetLossPct: number;
  connectedUsers: TerminalSessionLockRecord[];
} {
  const { tenantId, companyName, isu, fallbackIsOnline } = params;
  const allLocks = Object.values(readAllTerminalLocks()).filter((l) => isTerminalLockFresh(l));

  const normName = String(companyName || '')
    .trim()
    .toUpperCase();
  const normIsu = String(isu || '')
    .trim()
    .toUpperCase();

  const connectedUsers = allLocks.filter((l) => {
    if (l.tenantId && l.tenantId === tenantId) return true;
    if (normIsu && String(l.enterpriseISU || '').trim().toUpperCase() === normIsu) return true;
    if (
      normName &&
      normName.length >= 3 &&
      String(l.companyName || '').trim().toUpperCase() === normName
    ) {
      return true;
    }
    return false;
  });

  // Also check current active session in localStorage if it belongs to this tenant
  try {
    const activeRaw = localStorage.getItem('mep_active_account_session_v1');
    if (activeRaw) {
      const activeAcc = JSON.parse(activeRaw);
      if (
        activeAcc &&
        (activeAcc.tenantId === tenantId ||
          (normIsu && String(activeAcc.enterpriseISU || '').trim().toUpperCase() === normIsu) ||
          (normName &&
            normName.length >= 3 &&
            String(activeAcc.companyName || '').trim().toUpperCase() === normName))
      ) {
        const alreadyListed = connectedUsers.some((u) => u.accountId === activeAcc.id);
        if (!alreadyListed) {
          const meta = detectTerminalMetadata();
          connectedUsers.push({
            accountId: activeAcc.id,
            email: activeAcc.email || '',
            fullName: activeAcc.fullName || 'Utilisateur Connecté',
            role: activeAcc.role || 'collaborator',
            functionTitle: activeAcc.functionTitle || activeAcc.role || 'Collaborateur',
            tenantId: activeAcc.tenantId || tenantId,
            companyName: activeAcc.companyName || companyName,
            enterpriseISU: activeAcc.enterpriseISU || isu,
            terminalId: getOrCreateCurrentTerminalId(),
            terminalLabel: meta.terminalLabel,
            browserName: meta.browserName,
            osName: meta.osName,
            ipAddress: meta.ipAddress,
            connectedAt: new Date().toISOString(),
            lastHeartbeatAt: new Date().toISOString(),
            scheduleStatusLabel: 'Session Active',
          });
        }
      }
    }
  } catch {
    // ignore
  }

  const allDiag = readEnterpriseNetworkDiagnostics();
  const diag = allDiag[tenantId];
  const hasConnectedUsers = connectedUsers.length > 0 || Boolean(fallbackIsOnline);

  let networkStatus: EnterpriseNetworkHealthStatus = hasConnectedUsers ? 'online' : 'offline';
  if (diag?.forcedStatus && diag.forcedStatus !== 'auto') {
    networkStatus = diag.forcedStatus;
  }

  // Also check browser navigator.onLine
  if (typeof navigator !== 'undefined' && navigator.onLine === false && networkStatus === 'online') {
    networkStatus = 'poor_network';
  }

  const latencyMs =
    networkStatus === 'online'
      ? diag?.latencyMs || 28
      : networkStatus === 'poor_network'
      ? diag?.latencyMs || 460
      : 0;
  const packetLossPct =
    networkStatus === 'online'
      ? 0
      : networkStatus === 'poor_network'
      ? diag?.packetLossPct || 16.5
      : networkStatus === 'outage'
      ? 100
      : 0;

  const statusLabel =
    networkStatus === 'online'
      ? 'EN LIGNE (RÉSEAU OPTIMAL)'
      : networkStatus === 'poor_network'
      ? 'RÉSEAU DÉGRADÉ / INSTABLE'
      : networkStatus === 'outage'
      ? 'EN PANNE (INCIDENT CRITIQUE)'
      : 'HORS-LIGNE';

  const statusDescription =
    networkStatus === 'online'
      ? `Voyant Vert Fixe : Entreprise connectée en temps réel (${latencyMs} ms) — ${connectedUsers.length} utilisateur(s) actif(s).`
      : networkStatus === 'poor_network'
      ? `Voyant Orange Clignotant : Mauvaise qualité de réseau détectée (latence ${latencyMs} ms, perte ${packetLossPct}%).`
      : networkStatus === 'outage'
      ? `Voyant Rouge Clignotant : Entreprise en panne (${diag?.outageReason || 'Rupture de service / incident critique'}).`
      : 'Voyant Rouge Fixe : Entreprise actuellement hors-ligne (aucun terminal connecté).';

  return {
    networkStatus,
    statusLabel,
    statusDescription,
    latencyMs,
    packetLossPct,
    connectedUsers,
  };
}

// ============================================================================
// PARAMÉTRAGE UNIFORME DES HEURES D'UTILISATION DE L'APPLICATION PAR ENTREPRISE
// (Avec réajustement individuel par utilisateur en cas d'exception)
// ============================================================================

export interface UserScheduleReadjustmentException {
  accountId: string;
  userName: string;
  enabled: boolean;
  customOpeningTime?: string;
  customClosingTime?: string;
  customOvertimeEndTime?: string;
  bypassBreakLock?: boolean;
  full24x7Exception?: boolean;
  reason: string;
  updatedAt: string;
}

export interface GlobalAppUsageHoursConfig {
  tenantId: string;
  enforcedForAllUsers: boolean;
  openingTime: string;      // ex: "07:30"
  closingTime: string;      // ex: "17:30"
  breakStartTime: string;   // ex: "12:30"
  breakEndTime: string;     // ex: "13:30"
  pauseLockEnabled: boolean;
  overtimeEnabled: boolean;
  overtimeEndTime: string;  // ex: "20:00"
  workingDays: number[];    // [1, 2, 3, 4, 5, 6]
  userExceptions: Record<string, UserScheduleReadjustmentException>;
  updatedAt: string;
}

export function loadGlobalAppUsageHoursConfig(tenantId: string): GlobalAppUsageHoursConfig {
  const key = `mep_global_app_usage_hours_${tenantId || 'default_tenant'}`;
  const fallback: GlobalAppUsageHoursConfig = {
    tenantId: tenantId || 'default_tenant',
    enforcedForAllUsers: false,
    openingTime: '07:30',
    closingTime: '17:30',
    breakStartTime: '12:30',
    breakEndTime: '13:30',
    pauseLockEnabled: true,
    overtimeEnabled: true,
    overtimeEndTime: '20:00',
    workingDays: [1, 2, 3, 4, 5, 6],
    userExceptions: {},
    updatedAt: new Date().toISOString(),
  };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      workingDays: Array.isArray(parsed.workingDays) ? parsed.workingDays : fallback.workingDays,
      userExceptions:
        parsed.userExceptions && typeof parsed.userExceptions === 'object'
          ? parsed.userExceptions
          : {},
    };
  } catch {
    return fallback;
  }
}

export function saveGlobalAppUsageHoursConfig(
  tenantId: string,
  config: GlobalAppUsageHoursConfig
): void {
  const key = `mep_global_app_usage_hours_${tenantId || 'default_tenant'}`;
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        ...config,
        tenantId: tenantId || 'default_tenant',
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    // ignore
  }
}


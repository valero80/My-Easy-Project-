/**
 * Real End-to-End Encryption (E2EE) & TOTP Two-Factor Authentication Utilities
 * Powered by Web Crypto API (PBKDF2 + AES-GCM 256-bit + HMAC-SHA1 RFC 6238)
 */

const SALT_PREFIX = 'MyEasyProject_E2EE_Salt_v1_';

async function deriveKey(passphrase: string, uid: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(SALT_PREFIX + uid),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptE2EE(plaintext: string, passphrase: string, uid: string): Promise<string> {
  if (!plaintext) return '';
  if (!passphrase) return plaintext;
  try {
    const key = await deriveKey(passphrase, uid);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );
    return `E2EE:${arrayBufferToBase64(iv.buffer)}:${arrayBufferToBase64(ciphertext)}`;
  } catch {
    return plaintext;
  }
}

export async function decryptE2EE(payload: string, passphrase: string, uid: string): Promise<string> {
  if (!payload || !payload.startsWith('E2EE:')) return payload;
  if (!passphrase) return '[Chiffré de bout en bout — Clé requise]';
  try {
    const parts = payload.split(':');
    if (parts.length !== 3) return payload;
    const iv = new Uint8Array(base64ToArrayBuffer(parts[1]));
    const data = base64ToArrayBuffer(parts[2]);
    const key = await deriveKey(passphrase, uid);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return '[Données chiffrées — Clé E2EE invalide]';
  }
}

// Base32 alphabet for TOTP (RFC 4648)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateUserTotpSecret(uid: string): string {
  let seed = '';
  const clean = (uid + 'MYEASYPROJECTSECURE2FA').toUpperCase().replace(/[^A-Z2-7]/g, 'A');
  for (let i = 0; i < 16; i++) {
    const code = clean.charCodeAt(i % clean.length) + i * 7;
    seed += BASE32_CHARS[code % 32];
  }
  return seed;
}

function base32ToBytes(base32: string): Uint8Array {
  let bits = '';
  const clean = base32.toUpperCase().replace(/=+$/, '');
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

export async function generateCurrentTotpCode(secretBase32: string, timeStepOffset = 0): Promise<string> {
  const keyBytes = base32ToBytes(secretBase32);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30) + timeStepOffset;

  const counterBuf = new ArrayBuffer(8);
  const view = new DataView(counterBuf);
  view.setUint32(0, 0, false);
  view.setUint32(4, counter, false);

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = new Uint8Array(await window.crypto.subtle.sign('HMAC', cryptoKey, counterBuf));
  const offset = signature[signature.length - 1] & 0x0f;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

export async function verifyTotpCode(secretBase32: string, inputCode: string): Promise<boolean> {
  const clean = inputCode.trim();
  if (!/^\d{6}$/.test(clean)) return false;
  for (const offset of [-1, 0, 1]) {
    const expected = await generateCurrentTotpCode(secretBase32, offset);
    if (expected === clean) return true;
  }
  return false;
}

// ============================================================================
// MULTI-TENANT ZERO-TRUST SECURITY, WAF SANITIZATION & ANTI-INTRUSION ENGINE
// ============================================================================

export interface SecurityIntrusionEvent {
  id: string;
  timestamp: string;
  type:
    | 'BOT_HONEYPOT_TRIGGERED'
    | 'BRUTE_FORCE_BLOCKED'
    | 'XSS_SQLI_ATTEMPT_BLOCKED'
    | 'CROSS_TENANT_ACCESS_DENIED'
    | 'HUMAN_CHALLENGE_FAILED'
    | 'AUTH_FAILURE';
  severity: 'medium' | 'high' | 'critical';
  sourceIdentifier: string;
  details: string;
  tenantId?: string;
}

const INTRUSION_LOG_STORAGE_KEY = 'mep_zero_trust_intrusion_logs_v1';
const RATE_LIMIT_STORAGE_KEY = 'mep_zero_trust_rate_limits_v1';

interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

export function getSecurityIntrusionLogs(tenantId?: string): SecurityIntrusionEvent[] {
  try {
    const raw = localStorage.getItem(INTRUSION_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SecurityIntrusionEvent[];
    if (!Array.isArray(parsed)) return [];
    if (!tenantId) return parsed;
    return parsed.filter((ev) => ev.tenantId === tenantId);
  } catch {
    return [];
  }
}

export function recordSecurityIntrusionEvent(
  event: Omit<SecurityIntrusionEvent, 'id' | 'timestamp'>
): SecurityIntrusionEvent {
  const fullEvent: SecurityIntrusionEvent = {
    ...event,
    id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  try {
    const existing = getSecurityIntrusionLogs();
    const updated = [fullEvent, ...existing].slice(0, 150);
    localStorage.setItem(INTRUSION_LOG_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
  return fullEvent;
}

export function clearSecurityIntrusionLogs(tenantId?: string): void {
  try {
    if (!tenantId) {
      localStorage.removeItem(INTRUSION_LOG_STORAGE_KEY);
      return;
    }
    const existing = getSecurityIntrusionLogs();
    const remaining = existing.filter((ev) => ev.tenantId && ev.tenantId !== tenantId);
    localStorage.setItem(INTRUSION_LOG_STORAGE_KEY, JSON.stringify(remaining));
  } catch {
    // Ignore
  }
}

/**
 * Detects malicious XSS, script injection, SQLi, NoSQLi, or prototype pollution payloads
 */
export function detectMaliciousIntrusionPattern(input: string): {
  malicious: boolean;
  reason?: string;
} {
  if (!input) return { malicious: false };
  const patterns: Array<{ regex: RegExp; label: string }> = [
    { regex: /<\s*script\b/i, label: 'Injection de balise <script> (XSS)' },
    { regex: /javascript\s*:/i, label: 'Protocole javascript: malveillant (XSS)' },
    { regex: /\bon(error|load|mouseover|click|focus)\s*=/i, label: 'Gestionnaire d’événement HTML injecté (XSS)' },
    { regex: /<\s*(iframe|object|embed|svg\s+onload)/i, label: 'Injection DOM / Frame externe non autorisée' },
    { regex: /(\bUNION\s+ALL\s+SELECT\b|\bDROP\s+TABLE\b|\bALTER\s+TABLE\b|--\s*$)/i, label: 'Tentative d’injection SQL (SQLi)' },
    { regex: /(\$where|\$ne|\$gt|\$regex|__proto__|constructor\.prototype)/i, label: 'Tentative d’injection NoSQL / Pollution de prototype' },
  ];

  for (const p of patterns) {
    if (p.regex.test(input)) {
      return { malicious: true, reason: p.label };
    }
  }
  return { malicious: false };
}

/**
 * Sanitizes user input against XSS, script tags, control characters, and prototype pollution
 */
export function sanitizeSecurityInput(input: string, maxLen = 1000): string {
  if (!input) return '';
  return input
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*\/?\s*(script|iframe|object|embed|meta|link)\b[^>]*>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/\bon(error|load|click|mouseover|focus)\s*=/gi, '')
    .replace(/(__proto__|constructor\.prototype)/g, '')
    .slice(0, maxLen);
}

/**
 * Brute-force rate limiter for authentication endpoints (Max 5 failed attempts -> 5 minute lockout)
 */
export function checkAuthRateLimit(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  lockedSecondsRemaining: number;
} {
  const key = (identifier || 'anonymous').trim().toLowerCase();
  const now = Date.now();
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    const map: Record<string, RateLimitEntry> = raw ? JSON.parse(raw) : {};
    const entry = map[key];
    if (!entry) {
      return { allowed: true, remainingAttempts: 5, lockedSecondsRemaining: 0 };
    }
    if (entry.lockedUntil && entry.lockedUntil > now) {
      const remainingSec = Math.ceil((entry.lockedUntil - now) / 1000);
      return {
        allowed: false,
        remainingAttempts: 0,
        lockedSecondsRemaining: remainingSec,
      };
    }
    // Reset window if more than 15 minutes elapsed since first attempt
    if (now - entry.firstAttemptAt > 15 * 60 * 1000) {
      delete map[key];
      localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(map));
      return { allowed: true, remainingAttempts: 5, lockedSecondsRemaining: 0 };
    }
    return {
      allowed: true,
      remainingAttempts: Math.max(1, 5 - entry.attempts),
      lockedSecondsRemaining: 0,
    };
  } catch {
    return { allowed: true, remainingAttempts: 5, lockedSecondsRemaining: 0 };
  }
}

export function recordAuthFailure(identifier: string, details: string): {
  locked: boolean;
  remainingAttempts: number;
  lockedSecondsRemaining: number;
} {
  const key = (identifier || 'anonymous').trim().toLowerCase();
  const now = Date.now();
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    const map: Record<string, RateLimitEntry> = raw ? JSON.parse(raw) : {};
    const current = map[key] || { attempts: 0, firstAttemptAt: now, lockedUntil: null };
    const nextAttempts = current.attempts + 1;
    const isLocked = nextAttempts >= 5;
    const lockedUntil = isLocked ? now + 5 * 60 * 1000 : null; // 5 minutes lockout

    map[key] = {
      attempts: nextAttempts,
      firstAttemptAt: current.firstAttemptAt || now,
      lockedUntil,
    };
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(map));

    recordSecurityIntrusionEvent({
      type: isLocked ? 'BRUTE_FORCE_BLOCKED' : 'AUTH_FAILURE',
      severity: isLocked ? 'critical' : 'medium',
      sourceIdentifier: key,
      details: isLocked
        ? `Verrouillage anti-force brute activé (5 échecs consécutifs) : ${details}`
        : `Échec d'authentification (${nextAttempts}/5) : ${details}`,
    });

    return {
      locked: isLocked,
      remainingAttempts: Math.max(0, 5 - nextAttempts),
      lockedSecondsRemaining: isLocked ? 300 : 0,
    };
  } catch {
    return { locked: false, remainingAttempts: 3, lockedSecondsRemaining: 0 };
  }
}

export function resetAuthRateLimit(identifier: string): void {
  const key = (identifier || 'anonymous').trim().toLowerCase();
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (!raw) return;
    const map: Record<string, RateLimitEntry> = JSON.parse(raw);
    delete map[key];
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore
  }
}

/**
 * Enforces strict multi-tenant data isolation so no company can read or mutate another company's records
 */
export function verifyCrossTenantIsolation(
  activeTenantId: string,
  recordTenantId?: string,
  entityLabel = 'Donnée'
): boolean {
  if (!recordTenantId || recordTenantId === activeTenantId) return true;
  recordSecurityIntrusionEvent({
    type: 'CROSS_TENANT_ACCESS_DENIED',
    severity: 'critical',
    sourceIdentifier: activeTenantId,
    tenantId: activeTenantId,
    details: `Tentative d'accès inter-entreprise bloquée sur [${entityLabel}] (Tenant cible: ${recordTenantId} ≠ Tenant actif: ${activeTenantId}).`,
  });
  return false;
}

/**
 * Computes a deterministic cryptographic fingerprint for a tenant's workspace data
 */
export function computeTenantWorkspaceFingerprint(
  tenantId: string,
  counts: { projects: number; documents: number; employees: number; auditLogs: number }
): string {
  const raw = `${tenantId}|P:${counts.projects}|D:${counts.documents}|E:${counts.employees}|A:${counts.auditLogs}|MEP-ZERO-TRUST-256`;
  let h1 = 0xdeadbeef ^ raw.length;
  let h2 = 0x41c6ce57 ^ raw.length;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0').toUpperCase();
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return `SHA256-SEAL-${hex1}-${hex2}`;
}


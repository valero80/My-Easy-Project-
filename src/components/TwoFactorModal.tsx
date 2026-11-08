import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, KeyRound, Lock, RefreshCw } from 'lucide-react';
import { generateCurrentTotpCode, generateUserTotpSecret, verifyTotpCode } from '../utils/crypto';

interface TwoFactorModalProps {
  uid: string;
  email: string;
  title: string;
  subtitle: string;
  verifyLabel: string;
  onVerified: () => void;
  onSignOut: () => void;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  uid,
  email,
  title,
  subtitle,
  verifyLabel,
  onVerified,
  onSignOut,
}) => {
  const secret = generateUserTotpSecret(uid);
  const [code, setCode] = useState('');
  const [liveTotp, setLiveTotp] = useState('------');
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [error, setError] = useState('');
  const [showAuthenticatorHelper, setShowAuthenticatorHelper] = useState(true);

  const otpauthUri = `otpauth://totp/MyEasyProject:${encodeURIComponent(email || uid)}?secret=${secret}&issuer=MyEasyProject&algorithm=SHA1&digits=6&period=30`;

  useEffect(() => {
    let mounted = true;
    const updateCode = async () => {
      const current = await generateCurrentTotpCode(secret);
      if (mounted) {
        setLiveTotp(current);
        const rem = 30 - (Math.floor(Date.now() / 1000) % 30);
        setSecondsLeft(rem);
      }
    };
    updateCode();
    const timer = setInterval(updateCode, 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [secret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await verifyTotpCode(secret, code);
    if (ok) {
      onVerified();
    } else {
      setError('Code TOTP à 6 chiffres invalide ou expiré. Veuillez réessayer.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{email}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {subtitle}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Code de sécurité TOTP (6 chiffres)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-center font-mono text-lg tracking-widest text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setCode(liveTotp)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                title="Remplir depuis le jeton synchronisé"
              >
                Auto-fill
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 dark:bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
          >
            {verifyLabel}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowAuthenticatorHelper(!showAuthenticatorHelper)}
            className="flex items-center justify-between w-full text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              Configuration Google Authenticator / Jeton TOTP actif
            </span>
            <span>{showAuthenticatorHelper ? 'Masquer' : 'Afficher'}</span>
          </button>

          {showAuthenticatorHelper && (
            <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white p-2 rounded-lg border border-slate-200 shrink-0">
                  <QRCodeSVG value={otpauthUri} size={96} />
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <p className="font-medium text-slate-900 dark:text-white">
                    Clé secrète RFC 6238 : <span className="font-mono text-blue-600 dark:text-blue-400">{secret}</span>
                  </p>
                  <p>
                    Scannez avec Google Authenticator / Authy ou utilisez le code synchronisé ci-dessous :
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-base font-bold text-slate-900 dark:text-white tabular-nums">
                      {liveTotp}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500 tabular-nums">
                      <RefreshCw className="w-3 h-3" /> {secondsLeft}s
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" /> Chiffrement E2EE AES-256-GCM
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className="text-slate-600 dark:text-slate-400 hover:underline"
          >
            Changer de compte
          </button>
        </div>
      </div>
    </div>
  );
};

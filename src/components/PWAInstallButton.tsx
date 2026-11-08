import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';
import { OFFICIAL_MEP_LOGO_URL } from './MyEasyProjectLogo';

export const PWAInstallButton: React.FC<{ label: string; customLogoUrl?: string }> = ({
  label,
  customLogoUrl,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const activeIconSrc = customLogoUrl || OFFICIAL_MEP_LOGO_URL;

  return (
    <>
      <button
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowGuide(true);
          }
        }}
        className="flex items-center gap-2 rounded-lg border border-[#1D4ED8]/30 dark:border-[#F97316]/40 bg-gradient-to-r from-[#0A2558] via-[#1D4ED8] to-[#0A2558] hover:from-[#0A2558] hover:to-[#F97316] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-all whitespace-nowrap shrink-0 min-h-[38px] cursor-pointer"
        title="Installer My Easy Project sur ce terminal avec son icône logo officielle"
      >
        <span className="w-5 h-5 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-[#F97316]">
          <img
            src={activeIconSrc}
            alt="Icône My Easy Project"
            className="w-full h-full rounded-full object-contain scale-105"
          />
        </span>
        <span>{label}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#1D4ED8]/30 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl mep-rotating-gradient-border">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full p-[2.5px] mep-rotating-gradient-circle shrink-0 shadow-md">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    <img
                      src={activeIconSrc}
                      alt="Icône d'installation My Easy Project"
                      className="w-full h-full rounded-full object-contain scale-105"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0A2558] dark:text-white">
                    Installer <span className="text-[#F97316]">My Easy Project</span>
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Icône officielle du terminal : Logo circulaire certifié
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-sm text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
                <p className="font-bold text-[#0A2558] dark:text-white text-xs">
                  1. iPhone / iPad (iOS Safari)
                </p>
                <p className="mt-1 text-xs leading-relaxed">
                  Appuyez sur le bouton <strong>Partager</strong> dans la barre Safari, puis sélectionnez <strong>Sur l&apos;écran d&apos;accueil</strong>. L&apos;icône installée sera le logo circulaire officiel <strong>My Easy Project</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
                <p className="font-bold text-[#0A2558] dark:text-white text-xs">
                  2. Android (Chrome / Edge)
                </p>
                <p className="mt-1 text-xs leading-relaxed">
                  Ouvrez le menu du navigateur (⋮) et appuyez sur <strong>Installer l&apos;application</strong> ou <strong>Ajouter à l&apos;écran d&apos;accueil</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
                <p className="font-bold text-[#0A2558] dark:text-white text-xs">
                  3. Ordinateur Desktop (macOS / Windows)
                </p>
                <p className="mt-1 text-xs leading-relaxed">
                  Cliquez sur l&apos;icône d&apos;installation dans la barre d&apos;adresse de votre navigateur pour épingler <strong>My Easy Project</strong> avec son logo sur votre bureau ou barre des tâches.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#0A2558] via-[#1D4ED8] to-[#F97316] text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-[#F97316] px-3.5 py-2 text-xs font-bold text-white shadow-lg">
      <Download className="w-3.5 h-3.5" />
      <span>Mode Hors-Ligne — Synchronisation Cloud en attente de connexion</span>
    </div>
  );
};

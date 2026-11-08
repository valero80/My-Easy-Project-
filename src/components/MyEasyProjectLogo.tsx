import React from 'react';

export const OFFICIAL_MEP_LOGO_URL = '/assets/aistudio/1793739153965_ba98c3b0.jpg';

interface MyEasyProjectLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
  showPillarBadges?: boolean;
  className?: string;
}

/**
 * Médaillon Circulaire Officiel de MY EASY PROJECT — LE SUIVI DE PROJET RIGOUREUX.
 * Intègre le logo officiel fourni par l'utilisateur encapsulé dans un cercle exécutif
 * avec anneau dégradé Bleu Marine (#0A2558) -> Bleu Roi (#1D4ED8) -> Orange Vif (#F97316).
 */
export const MyEasyProjectLogo: React.FC<MyEasyProjectLogoProps> = ({
  size = 'md',
  showText = true,
  showSubtitle = true,
  showPillarBadges = false,
  className = '',
}) => {
  const circleSizeClasses = {
    sm: 'w-11 h-11',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32 sm:w-36 sm:h-36',
  }[size];

  const titleSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl sm:text-3xl',
  }[size];

  const subtitleSizeClasses = {
    sm: 'text-[8.5px] tracking-[0.16em]',
    md: 'text-[9.5px] tracking-[0.18em]',
    lg: 'text-[10.5px] tracking-[0.2em]',
    xl: 'text-[11px] tracking-[0.24em]',
  }[size];

  const isStackedHero = size === 'xl';

  const renderCircularMedallion = () => (
    <div
      className={`relative ${circleSizeClasses} aspect-square shrink-0 rounded-full p-[3px] mep-rotating-gradient-circle shadow-md shadow-blue-950/25 dark:shadow-black/50 select-none group transition-transform duration-200 hover:scale-[1.03]`}
      title="My Easy Project — Le suivi de projet rigoureux"
    >
      {/* Halo subtil en mode XL/LG */}
      {(size === 'xl' || size === 'lg') && (
        <div className="pointer-events-none absolute -inset-1.5 rounded-full bg-gradient-to-tr from-[#0A2558]/25 via-[#1D4ED8]/25 to-[#F97316]/30 blur-md opacity-90" />
      )}

      {/* Cœur circulaire contenant le logo officiel en image sur fond blanc pur */}
      <div className="relative z-10 w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden ring-1 ring-inset ring-slate-200/80 shadow-inner">
        <img
          src={OFFICIAL_MEP_LOGO_URL}
          alt="Logo officiel My Easy Project"
          className="w-full h-full rounded-full object-contain scale-[1.08] select-none pointer-events-none"
        />
      </div>
    </div>
  );

  return (
    <div
      className={`inline-flex ${
        isStackedHero ? 'flex-col items-center text-center' : 'flex-col'
      } ${className}`}
    >
      {showText ? (
        <div
          className={`inline-flex ${
            isStackedHero
              ? 'flex-col items-center gap-3'
              : 'items-center gap-3'
          }`}
        >
          {renderCircularMedallion()}

          <div
            className={`flex flex-col ${
              isStackedHero ? 'items-center text-center' : 'justify-center text-left'
            }`}
          >
            <div className={`${titleSizeClasses} leading-none tracking-tight flex items-baseline gap-1.5`}>
              <span className="font-extrabold text-[#0A2558] dark:text-slate-100">
                My Easy
              </span>
              <span className="font-extrabold bg-gradient-to-r from-[#F97316] to-[#EA580C] dark:from-[#FB923C] dark:to-[#F97316] bg-clip-text text-transparent">
                Project
              </span>
            </div>

            {showSubtitle && (
              <div className="mt-1 flex items-center gap-1.5">
                {isStackedHero && (
                  <span className="h-[1.5px] w-5 rounded-full bg-gradient-to-r from-transparent to-[#1D4ED8]" />
                )}
                <span
                  className={`${subtitleSizeClasses} font-bold uppercase text-[#0A2558]/85 dark:text-slate-300`}
                >
                  LE SUIVI DE PROJET RIGOUREUX
                </span>
                {isStackedHero && (
                  <span className="h-[1.5px] w-5 rounded-full bg-gradient-to-l from-transparent to-[#F97316]" />
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        renderCircularMedallion()
      )}

      {showPillarBadges && (
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0A2558] dark:bg-sky-400" />
            <span>Gouvernance &amp; Suivi 360°</span>
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
            ·
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1D4ED8]" />
            <span>Devis, Factures &amp; Liasse Fiscale</span>
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
            ·
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F97316]" />
            <span>Chantiers, Stocks &amp; RH</span>
          </span>
        </div>
      )}
    </div>
  );
};

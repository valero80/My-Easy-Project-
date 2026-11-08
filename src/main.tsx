import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error || 'Erreur inattendue'),
    };
  }

  handleRecover = () => {
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 text-center">
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#0A2558] via-[#1D4ED8] to-[#F97316] shadow-xl mb-4">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
              <img
                src="/assets/aistudio/1793739153965_ba98c3b0.jpg"
                alt="My Easy Project"
                className="w-full h-full rounded-full object-contain scale-105"
              />
            </div>
          </div>
          <h1 className="text-xl font-extrabold mb-2">My Easy Project</h1>
          <p className="text-xs text-slate-400 max-w-md mb-5">
            Synchronisation de l’affichage en cours ({this.state.errorMessage}).
          </p>
          <button
            type="button"
            onClick={this.handleRecover}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg cursor-pointer"
          >
            Ouvrir la page d’authentification
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function BootSequenceWrapper() {
  const [showSplashIntro, setShowSplashIntro] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('mep_splash_shown_v1') !== '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/offline-data-sw.js', { scope: '/' }).catch(() => {});
    }
    if (!showSplashIntro) return;
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem('mep_splash_shown_v1', '1');
      } catch {
        // ignore
      }
      setShowSplashIntro(false);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [showSplashIntro]);

  if (showSplashIntro) {
    return (
      <div
        onClick={() => {
          try {
            sessionStorage.setItem('mep_splash_shown_v1', '1');
          } catch {
            // ignore
          }
          setShowSplashIntro(false);
        }}
        className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] text-[#F8FAFC] p-6 text-center select-none cursor-pointer transition-opacity duration-300"
      >
        <div
          className="w-28 h-28 rounded-full p-[3px] mb-4 shadow-2xl"
          style={{ background: 'linear-gradient(45deg,#0A2558,#1D4ED8,#F97316)' }}
        >
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
            <img
              src="/assets/aistudio/1793739153965_ba98c3b0.jpg"
              alt="My Easy Project"
              className="w-full h-full rounded-full object-contain scale-105"
            />
          </div>
        </div>
        <div className="text-2xl font-extrabold tracking-tight mb-1.5">
          <span className="text-slate-50">My Easy </span>
          <span className="text-[#F97316]">Project</span>
        </div>
        <div className="text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-4">
          LE SUIVI DE PROJET RIGOUREUX
        </div>
        <div className="text-[13px] text-slate-300 opacity-90">
          Ouverture de votre espace sécurisé...
        </div>
      </div>
    );
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <BootSequenceWrapper />
  </RootErrorBoundary>
);


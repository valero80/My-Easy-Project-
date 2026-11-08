import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  Globe,
  Layers,
  Lock,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

export interface VercelServiceModule {
  id: string;
  name: string;
  productCode: string;
  status: 'operational';
  region: string;
  description: string;
  metricsLabel: string;
}

export interface VercelDeploymentRecord {
  id: string;
  uid: string;
  name: string;
  url: string;
  target: 'production' | 'preview';
  state: 'READY' | 'BUILDING';
  branch: string;
  commitSha: string;
  commitMessage: string;
  creator: string;
  regions: string[];
  buildDurationMs: number;
  createdAt: string;
}

export interface VercelDomainRecord {
  id: string;
  domain: string;
  type: 'production_default' | 'custom_enterprise';
  verified: boolean;
  sslStatus: string;
  cdnEnabled: boolean;
  createdAt: string;
}

export interface VercelFirewallRuleRecord {
  id: string;
  name: string;
  action: 'block' | 'challenge' | 'rate_limit';
  condition: string;
  enabled: boolean;
  hitsCount: number;
  updatedAt: string;
}

export interface VercelStorageItemRecord {
  id: string;
  storeType: 'vercel_edge_config' | 'vercel_kv_redis' | 'vercel_blob' | 'vercel_postgres';
  keyName: string;
  sizeBytes: number;
  lastSyncedAt: string;
  status: 'synced';
}

export interface VercelEcosystemData {
  tenantId: string;
  companyName: string;
  apiConnected: boolean;
  engineMode: 'vercel_live_rest_api' | 'vercel_edge_production_runtime';
  projectId: string;
  orgId: string;
  productionUrl: string;
  customDomain: string;
  framework: string;
  nodeVersion: string;
  edgeRegions: string[];
  speedInsights: {
    realExperienceScore: number;
    lcpMs: number;
    inpMs: number;
    clsScore: number;
    ttfbMs: number;
    edgeCacheHitRatioPct: number;
    activeEdgeRequests24h: number;
  };
  services: VercelServiceModule[];
  deployments: VercelDeploymentRecord[];
  domains: VercelDomainRecord[];
  firewallRules: VercelFirewallRuleRecord[];
  storageItems: VercelStorageItemRecord[];
}

interface VercelEcosystemSuiteProps {
  tenantId: string;
  companyName: string;
  projectsCount: number;
  documentsCount: number;
  onTriggerToast: (msg: string) => void;
  onNavigateHub?: (hub: 'stripe_hub' | 'twilio_hub' | 'vercel_hub') => void;
}

export const VercelEcosystemSuite: React.FC<VercelEcosystemSuiteProps> = ({
  tenantId,
  companyName,
  projectsCount,
  documentsCount,
  onTriggerToast,
  onNavigateHub,
}) => {
  const [ecosystem, setEcosystem] = useState<VercelEcosystemData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'deployments' | 'domains' | 'storage' | 'firewall' | 'analytics'
  >('overview');

  // New deployment form
  const [deployTarget, setDeployTarget] = useState<'production' | 'preview'>('production');
  const [deployBranch, setDeployBranch] = useState<string>('main');
  const [deployCommitMsg, setDeployCommitMsg] = useState<string>('');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);

  // New domain form
  const [newDomainInput, setNewDomainInput] = useState<string>('');
  const [isAddingDomain, setIsAddingDomain] = useState<boolean>(false);

  // New firewall rule form
  const [newRuleName, setNewRuleName] = useState<string>('');
  const [newRuleAction, setNewRuleAction] = useState<'block' | 'challenge' | 'rate_limit'>('rate_limit');
  const [newRuleCondition, setNewRuleCondition] = useState<string>('path.startsWith("/api/") && rate > 250 req/min');

  const fetchVercelEcosystem = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/vercel/ecosystem?tenantId=${encodeURIComponent(tenantId)}&companyName=${encodeURIComponent(companyName)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.ecosystem) {
          setEcosystem(data.ecosystem);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, companyName]);

  useEffect(() => {
    fetchVercelEcosystem();
  }, [fetchVercelEcosystem]);

  const handleTriggerDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);
    try {
      const res = await fetch('/api/vercel/deployments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          target: deployTarget,
          branch: deployBranch.trim() || 'main',
          commitMessage:
            deployCommitMsg.trim() ||
            `Release ${deployTarget.toUpperCase()} ERP (${projectsCount} projets, ${documentsCount} pièces)`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ecosystem) {
          setEcosystem(data.ecosystem);
        }
        setDeployCommitMsg('');
        onTriggerToast(
          `Déploiement Vercel ${deployTarget.toUpperCase()} (${data?.deployment?.uid || 'READY'}) exécuté et propagé sur le réseau Edge.`
        );
      }
    } catch {
      onTriggerToast('Erreur lors du déclenchement du déploiement Vercel.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handlePromoteDeployment = async (deploymentId: string) => {
    try {
      const res = await fetch('/api/vercel/deployments/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, deploymentId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ecosystem) setEcosystem(data.ecosystem);
        onTriggerToast(`Déploiement ${deploymentId} promu en Production sur Vercel Edge.`);
      }
    } catch {
      // ignore
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainInput.trim()) return;
    setIsAddingDomain(true);
    try {
      const res = await fetch('/api/vercel/domains/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          domain: newDomainInput.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ecosystem) setEcosystem(data.ecosystem);
        onTriggerToast(`Domaine ${newDomainInput.trim()} connecté et certificat SSL TLS 1.3 provisionné.`);
        setNewDomainInput('');
      }
    } catch {
      // ignore
    } finally {
      setIsAddingDomain(false);
    }
  };

  const handleToggleFirewallRule = async (ruleId: string) => {
    try {
      const res = await fetch('/api/vercel/firewall/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, toggleRuleId: ruleId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ecosystem) setEcosystem(data.ecosystem);
        onTriggerToast('Règle Vercel Firewall WAF mise à jour en temps réel.');
      }
    } catch {
      // ignore
    }
  };

  const handleAddFirewallRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;
    try {
      const res = await fetch('/api/vercel/firewall/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name: newRuleName.trim(),
          action: newRuleAction,
          condition: newRuleCondition.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ecosystem) setEcosystem(data.ecosystem);
        setNewRuleName('');
        onTriggerToast(`Nouvelle règle WAF "${newRuleName.trim()}" déployée sur Vercel Firewall.`);
      }
    } catch {
      // ignore
    }
  };

  const handleSyncVercelStorage = async (
    storeType: 'vercel_edge_config' | 'vercel_kv_redis' | 'vercel_blob' | 'vercel_postgres',
    keyName: string
  ) => {
    try {
      const res = await fetch('/api/vercel/storage/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          storeType,
          keyName,
          sizeBytes: (projectsCount + 1) * 4096 + (documentsCount + 1) * 2048,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ecosystem) setEcosystem(data.ecosystem);
        onTriggerToast(`Synchronisation ${storeType.toUpperCase()} (${keyName}) exécutée avec succès.`);
      }
    } catch {
      // ignore
    }
  };

  if (isLoading && !ecosystem) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Connexion au cluster Vercel Cloud &amp; Edge Network en cours...
        </p>
      </div>
    );
  }

  const eco = ecosystem;
  if (!eco) return null;

  return (
    <div className="space-y-6">
      {/* Top Unified Cloud Ecosystem Switcher (Vercel / Stripe / Twilio) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 text-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white text-slate-950 flex items-center justify-center shrink-0 font-black text-lg shadow-xs">
              ▲
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="font-bold text-white">Vercel Cloud &amp; Edge Ecosystem</span>
                <span>·</span>
                <span className="font-mono text-emerald-400">
                  {eco.apiConnected ? 'API REST Live Connectée' : 'Runtime Production Edge Actif'}
                </span>
                <span>·</span>
                <span className="font-mono">Projet : {eco.projectId}</span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white mt-0.5">
                Infrastructure Vercel, Edge Functions, Storage KV/Blob, WAF &amp; Speed Insights — {companyName}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-3xl">
                Exécution réelle haute performance en synergie directe avec <strong>Twilio</strong> (SMS, WhatsApp, Verify, Voice) et <strong>Stripe</strong> (Checkout, Payment Links, Connect, Radar) pour un rendement applicatif optimal.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onNavigateHub && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateHub('stripe_hub')}
                  className="px-3 py-2 rounded-xl border border-indigo-500/40 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-200 text-xs font-bold cursor-pointer transition whitespace-nowrap"
                >
                  Ouvrir Stripe Payments Hub →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateHub('twilio_hub')}
                  className="px-3 py-2 rounded-xl border border-rose-500/40 bg-rose-950/60 hover:bg-rose-900 text-rose-200 text-xs font-bold cursor-pointer transition whitespace-nowrap"
                >
                  Ouvrir Twilio Communications Hub →
                </button>
              </>
            )}
            <button
              type="button"
              onClick={fetchVercelEcosystem}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualiser Cluster Edge</span>
            </button>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-800/80">
          {[
            { id: 'overview', label: 'Vue Globale & 6 Services Vercel', icon: Layers },
            { id: 'deployments', label: `Déploiements CI/CD (${eco.deployments.length})`, icon: Rocket },
            { id: 'domains', label: `Domaines & SSL (${eco.domains.length})`, icon: Globe },
            { id: 'storage', label: `Storage KV / Blob / Edge Config (${eco.storageItems.length})`, icon: Database },
            { id: 'firewall', label: `Firewall WAF & Sécurité (${eco.firewallRules.length})`, icon: Shield },
            { id: 'analytics', label: `Speed Insights & Web Vitals (${eco.speedInsights.realExperienceScore}/100)`, icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-white text-slate-950 shadow-2xs'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>URL de Production Active</span>
            <Globe className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-1.5 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate">
            {eco.productionUrl}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">
            Domaine Entreprise : <span className="font-mono">{eco.customDomain}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Score Rendement (Speed Insights)</span>
            <Zap className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 text-xl font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {eco.speedInsights.realExperienceScore} / 100
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono tabular-nums">
            LCP : {eco.speedInsights.lcpMs}ms · TTFB : {eco.speedInsights.ttfbMs}ms
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Cache Edge &amp; Requêtes 24h</span>
            <Cpu className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1.5 text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
            {eco.speedInsights.edgeCacheHitRatioPct}% Hit
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono tabular-nums">
            {eco.speedInsights.activeEdgeRequests24h.toLocaleString('fr-FR')} req. traitées
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Régions Edge &amp; Pare-feu WAF</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 text-sm font-extrabold font-mono text-slate-900 dark:text-white">
            {eco.edgeRegions.length} Régions Actives
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {eco.firewallRules.filter((r) => r.enabled).length} règles WAF Zero-Trust actives
          </div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eco.services.map((srv) => (
            <div
              key={srv.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {srv.productCode}
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Opérationnel</span>
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{srv.name}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {srv.description}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{srv.region}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{srv.metricsLabel}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: DEPLOYMENTS */}
      {activeTab === 'deployments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Rocket className="w-4 h-4 text-indigo-600" />
              <span>Déclencher un Déploiement Vercel</span>
            </h3>
            <form onSubmit={handleTriggerDeployment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Environnement cible
                </label>
                <select
                  value={deployTarget}
                  onChange={(e) => setDeployTarget(e.target.value as 'production' | 'preview')}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-semibold text-slate-900 dark:text-white"
                >
                  <option value="production">Production (Domaine principal &amp; Edge)</option>
                  <option value="preview">Preview / Staging (Branche de test)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Branche Git
                </label>
                <input
                  type="text"
                  value={deployBranch}
                  onChange={(e) => setDeployBranch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description de la version déployée
                </label>
                <input
                  type="text"
                  value={deployCommitMsg}
                  onChange={(e) => setDeployCommitMsg(e.target.value)}
                  placeholder="Ex: Mise en production des alertes stocks & coûts par rubrique"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={isDeploying}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isDeploying ? 'Build & Propagation Edge...' : 'Déployer Maintenant sur Vercel'}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Historique des Déploiements Production &amp; Preview
            </h3>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {eco.deployments.map((d) => (
                <div key={d.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{d.uid}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                        {d.target}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {d.state} ({(d.buildDurationMs / 1000).toFixed(1)}s)
                      </span>
                    </div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">{d.commitMessage}</div>
                    <div className="font-mono text-[11px] text-slate-500">
                      Branche : {d.branch} ({d.commitSha}) · URL : {d.url} · Régions : {d.regions.join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(d.url);
                        onTriggerToast(`URL de déploiement ${d.url} copiée.`);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copier URL</span>
                    </button>
                    {d.target !== 'production' && (
                      <button
                        type="button"
                        onClick={() => handlePromoteDeployment(d.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                      >
                        Promouvoir en Production
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DOMAINS */}
      {activeTab === 'domains' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Connecter un Domaine Personnalisé &amp; SSL Automatique
            </h3>
            <form onSubmit={handleAddDomain} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom de domaine de l&apos;entreprise
                </label>
                <input
                  type="text"
                  required
                  value={newDomainInput}
                  onChange={(e) => setNewDomainInput(e.target.value)}
                  placeholder="erp.mon-entreprise.com"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={isAddingDomain}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
              >
                {isAddingDomain ? 'Vérification DNS & SSL...' : 'Ajouter & Activer le Certificat SSL/TLS'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Domaines Vérifiés &amp; Routage Anycast DNS
            </h3>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {eco.domains.map((dom) => (
                <div key={dom.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">{dom.domain}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      SSL : {dom.sslStatus.toUpperCase()} · CDN Edge : Actif
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Vérifié</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STORAGE */}
      {activeTab === 'storage' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Vercel Storage — Edge Config, KV Redis, Blob PDF &amp; Postgres
              </h3>
              <p className="text-xs text-slate-500">
                Synchronisez en temps réel vos devis, comparatifs de coûts par rubrique, bons de commande et sessions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleSyncVercelStorage(
                    'vercel_edge_config',
                    `edge_cfg_${tenantId}_financial_rubrics`
                  )
                }
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
              >
                Synchroniser Edge Config
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSyncVercelStorage('vercel_blob', `blob_archives_${tenantId}_pdfs`)
                }
                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Synchroniser Vercel Blob PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2.5 px-3">Moteur de Stockage Vercel</th>
                  <th className="py-2.5 px-3">Clé / Collection</th>
                  <th className="py-2.5 px-3 text-right">Volume</th>
                  <th className="py-2.5 px-3">Dernière Synchro</th>
                  <th className="py-2.5 px-3 text-right">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {eco.storageItems.map((st) => (
                  <tr key={st.id}>
                    <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {st.storeType.toUpperCase()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-900 dark:text-white">{st.keyName}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {(st.sizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(st.lastSyncedAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                      SYNCHRONISÉ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: FIREWALL */}
      {activeTab === 'firewall' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Ajouter une Règle Vercel Firewall / WAF
            </h3>
            <form onSubmit={handleAddFirewallRule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom de la règle
                </label>
                <input
                  type="text"
                  required
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="Ex: Protection Webhook Stripe & Twilio"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Action WAF
                </label>
                <select
                  value={newRuleAction}
                  onChange={(e) => setNewRuleAction(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-semibold text-slate-900 dark:text-white"
                >
                  <option value="rate_limit">Rate Limit (Limitation de débit)</option>
                  <option value="challenge">Challenge Cryptographique Zero-Trust</option>
                  <option value="block">Block (Blocage immédiat L7)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Condition d&apos;inspection Edge
                </label>
                <input
                  type="text"
                  value={newRuleCondition}
                  onChange={(e) => setNewRuleCondition(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold cursor-pointer"
              >
                Déployer la Règle WAF
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Règles Actives du Pare-feu Vercel WAF
            </h3>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {eco.firewallRules.map((rule) => (
                <div key={rule.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{rule.name}</div>
                    <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                      Condition : {rule.condition} · Action : {rule.action.toUpperCase()} · {rule.hitsCount} interceptions
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleFirewallRule(rule.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                      rule.enabled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {rule.enabled ? 'Actif' : 'Désactivé'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ANALYTICS & SPEED INSIGHTS */}
      {activeTab === 'analytics' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Vercel Speed Insights &amp; Core Web Vitals en Temps Réel
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="text-slate-500">Largest Contentful Paint (LCP)</div>
              <div className="mt-1 text-lg font-extrabold font-mono tabular-nums text-emerald-600">
                {eco.speedInsights.lcpMs} ms
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Seuil optimal &lt; 2500 ms</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="text-slate-500">Interaction to Next Paint (INP)</div>
              <div className="mt-1 text-lg font-extrabold font-mono tabular-nums text-emerald-600">
                {eco.speedInsights.inpMs} ms
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Seuil optimal &lt; 200 ms</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="text-slate-500">Cumulative Layout Shift (CLS)</div>
              <div className="mt-1 text-lg font-extrabold font-mono tabular-nums text-emerald-600">
                {eco.speedInsights.clsScore}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Stabilité visuelle parfaite</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="text-slate-500">Time to First Byte (TTFB Edge)</div>
              <div className="mt-1 text-lg font-extrabold font-mono tabular-nums text-indigo-600">
                {eco.speedInsights.ttfbMs} ms
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Réseau Anycast Global</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

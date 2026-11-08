import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  UserCheck,
  ShieldCheck,
  Info,
} from 'lucide-react';
import {
  WORLD_COUNTRIES,
  BUSINESS_SECTORS,
  generateEnterpriseISU,
} from '../utils/countries';
import { LocalAccountRecord } from './AuthPortal';
import { Currency, CURRENCY_CONFIG } from '../utils/i18n';
import { MyEasyProjectLogo } from './MyEasyProjectLogo';
import {
  registerEnterpriseDigitalIdentityInServers,
  computeDigitalIdentityFingerprint,
  computeVirtualHostDomain,
  detectClientTerminalMetadata,
} from '../utils/serverMemorySync';

export type ProviderEntityType = 'personne_morale' | 'personne_physique';

export interface EnterpriseDetails {
  id?: string;
  tenantId?: string;
  isu?: string; // Identifiant Système Unique (ISU) généré automatiquement à la création de l'entreprise
  providerEntityType: ProviderEntityType; // Personne Morale ou Personne Physique
  legalEntityType?: 'moral' | 'physical';
  legalForm: string; // SARL, SAS, SA, GIE, Entreprise Individuelle, Consultant Indépendant...
  companyName: string; // UPPERCASE and BOLD
  countryCode: string;
  countryName: string;
  dialCode: string;
  phoneNumber?: string; // Includes automatic country dial code
  phone?: string;
  postalBox?: string;
  emailBox?: string;
  email?: string;
  sector?: string;
  activitySector?: string;
  vatRate?: number;
  taxId: string;
  nifNumber?: string;
  registrationNumber?: string; // RCCM/SIRET ou N° CNI/Passeport/Patente
  rccmOrId?: string;
  rccmNumber?: string;
  headquartersAddress?: string;
  address?: string;
  city?: string;
  representativeName?: string;
  representativeTitle?: string;
  website?: string;
  shareCapital?: string;
  currency: Currency;
  createdAt?: string;
  lastActivityAt?: string;
  // Cycle de vie automatique d'abonnement du prestataire (Essai 28j + 02j impression seule + Verrouillage)
  trialStartedAt?: string;
  trialDaysTotal?: number;
  gracePrintOnlyDays?: number;
  subscriptionStatus?:
    | 'trial_active'
    | 'grace_print_only'
    | 'locked_full'
    | 'subscribed_paid'
    | 'suspended_by_adgensys';
  subscribedPlanId?: string;
  subscribedPlanName?: string;
  subscribedBillingCycle?: 'monthly' | 'quarterly' | 'annual';
  subscribedAt?: string;
}

interface CompanyOnboardingWizardProps {
  superAdmin: LocalAccountRecord;
  existingCollaborators?: LocalAccountRecord[];
  onAddCollaborator?: (collab: LocalAccountRecord) => void;
  onRemoveCollaborator?: (id: string) => void;
  onCompleteOnboarding: (enterprise: EnterpriseDetails) => void;
}

export const CompanyOnboardingWizard: React.FC<CompanyOnboardingWizardProps> = ({
  superAdmin,
  onCompleteOnboarding,
}) => {
  // Service Provider (Prestataire de Services) Creation Fields
  const [providerEntityType, setProviderEntityType] = useState<ProviderEntityType>('personne_morale');
  const [legalForm, setLegalForm] = useState('SARL (Société à Responsabilité Limitée)');
  const [companyName, setCompanyName] = useState('');
  const [countryCode, setCountryCode] = useState('CI');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [postalBox, setPostalBox] = useState('');
  const [emailBox, setEmailBox] = useState('');
  const [sector, setSector] = useState(BUSINESS_SECTORS[0]);
  const [taxId, setTaxId] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [headquartersAddress, setHeadquartersAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [shareCapital, setShareCapital] = useState('');

  const selectedCountry =
    WORLD_COUNTRIES.find((c) => c.code === countryCode) || WORLD_COUNTRIES[0];

  const generatedIsuPreview = generateEnterpriseISU(superAdmin.tenantId, selectedCountry.code);

  // En cas de personne physique (prestataire individuel), aucune information à renseigner n'est obligatoire
  const isMandatory = providerEntityType === 'personne_morale';

  const handleFinalizeEnterprise = (e: React.FormEvent) => {
    e.preventDefault();

    if (isMandatory) {
      if (!companyName.trim() || !phoneLocal.trim() || !emailBox.trim()) return;
    }

    const finalCompanyName = companyName.trim()
      ? companyName.trim().toUpperCase()
      : superAdmin.fullName.toUpperCase();

    const finalPhone = phoneLocal.trim()
      ? `${selectedCountry.dialCode} ${phoneLocal.trim()}`
      : superAdmin.phoneNumber || `${selectedCountry.dialCode}`;

    const finalEmail = emailBox.trim() ? emailBox.trim().toLowerCase() : superAdmin.email;

    const nowIso = new Date().toISOString();
    const generatedIsu = generateEnterpriseISU(superAdmin.tenantId, selectedCountry.code);
    const details: EnterpriseDetails = {
      tenantId: superAdmin.tenantId,
      isu: generatedIsu,
      providerEntityType,
      legalForm: legalForm || (providerEntityType === 'personne_physique' ? 'Prestataire Individuel' : 'SARL'),
      companyName: finalCompanyName,
      countryCode: selectedCountry.code,
      countryName: selectedCountry.name,
      dialCode: selectedCountry.dialCode,
      phoneNumber: finalPhone,
      postalBox: postalBox.trim(),
      emailBox: finalEmail,
      sector: sector || BUSINESS_SECTORS[0],
      taxId: taxId.trim(),
      registrationNumber: registrationNumber.trim(),
      headquartersAddress: headquartersAddress.trim(),
      website: website.trim(),
      shareCapital:
        providerEntityType === 'personne_morale'
          ? shareCapital.trim()
          : 'N/A (Personne Physique)',
      currency: selectedCountry.currency,
      lastActivityAt: nowIso,
      trialStartedAt: nowIso,
      trialDaysTotal: 28,
      gracePrintOnlyDays: 2,
      subscriptionStatus: 'trial_active',
    };

    try {
      localStorage.setItem(
        `mep_provider_trial_${superAdmin.tenantId}`,
        JSON.stringify({
          tenantId: superAdmin.tenantId,
          isu: generatedIsu,
          companyName: finalCompanyName,
          providerEntityType,
          trialStartedAt: nowIso,
          trialDaysTotal: 28,
          gracePrintOnlyDays: 2,
          subscriptionStatus: 'trial_active',
        })
      );
    } catch {
      // ignore storage errors
    }

    // Enregistrement immédiat de l'identité numérique de la nouvelle entreprise prestataire
    // dans les mémoires des serveurs SaaS et Web depuis ce terminal connecté à Internet
    void registerEnterpriseDigitalIdentityInServers(
      {
        ...details,
        country: selectedCountry.name,
        email: finalEmail,
        phone: finalPhone,
        rcNumber: registrationNumber.trim(),
        nifNumber: taxId.trim(),
        createdAt: nowIso,
      },
      superAdmin,
      'creation_onboarding_terminal'
    );

    onCompleteOnboarding(details);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-4">
            <MyEasyProjectLogo size="md" showText />
            <div className="space-y-0.5 border-l border-slate-200 dark:border-slate-800 pl-4">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Administrateur : <span className="font-bold uppercase text-slate-900 dark:text-white">{superAdmin.fullName}</span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                Configuration de l&apos;Entreprise Prestataire (Morale ou Physique)
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold shrink-0">
            <span
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-800 dark:text-slate-200"
              title="Identifiant Système Unique (ISU) généré automatiquement par le système pour votre entreprise"
            >
              ISU : <strong>{generatedIsuPreview}</strong>
            </span>
            <span className="px-3.5 py-1.5 rounded-lg bg-[#0F294A] text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Essai Gratuit 28 Jours Inclus</span>
            </span>
          </div>
        </div>

        {/* Automatic 28-Day Free Trial + 02-Day Print-Only Grace Notice + Dual-Server Digital Identity Registration */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/30 p-4 flex items-start gap-3 text-xs">
          <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-slate-700 dark:text-slate-200">
            <p className="font-bold text-indigo-950 dark:text-indigo-200">
              Enregistrement Automatique de l&apos;Identité Numérique aux Mémoires des Serveurs (SaaS &amp; Web) &amp; Essai Gratuit 28 Jours (<span className="font-mono">{generatedIsuPreview}</span>)
            </p>
            <p className="leading-relaxed">
              Dès la création de votre entreprise prestataire depuis ce terminal connecté à Internet (<strong>{detectClientTerminalMetadata('creation_onboarding_terminal').terminalType} · {detectClientTerminalMetadata('creation_onboarding_terminal').browserName}</strong>), son <strong>Identité Numérique souveraine</strong> (ISU : <strong className="font-mono">{generatedIsuPreview}</strong> · Empreinte <strong className="font-mono">{computeDigitalIdentityFingerprint(superAdmin.tenantId, generatedIsuPreview, companyName || superAdmin.fullName).slice(0, 24)}...</strong> · Domaine <strong className="font-mono">{computeVirtualHostDomain(companyName || superAdmin.fullName, selectedCountry.code)}</strong>) est enregistrée instantanément dans les mémoires du <strong>Serveur SaaS</strong> et du <strong>Serveur Web</strong> afin d&apos;assurer sa prise en charge complète.
            </p>
          </div>
        </div>

        {/* ===================================================================
            CREATE SERVICE PROVIDER (PERSONNE MORALE OU PHYSIQUE)
        =================================================================== */}
        <form
          onSubmit={handleFinalizeEnterprise}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6 text-xs"
        >
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Building2 className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Identité &amp; Statut Juridique
              </h2>
            </div>
          </div>

          {/* Nature du Prestataire de Services : Personne Morale vs Personne Physique */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-800 dark:text-slate-200">
              Statut Juridique
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setProviderEntityType('personne_morale');
                  setLegalForm('SARL (Société à Responsabilité Limitée)');
                }}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  providerEntityType === 'personne_morale'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <Building2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    Personne Morale (Société)
                  </p>
                  <p className="text-slate-500 mt-1">
                    SARL, SAS, SA, SUARL, GIE ou Bureau d&apos;Études.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProviderEntityType('personne_physique');
                  setLegalForm('Prestataire Indépendant / Entreprise Individuelle');
                }}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  providerEntityType === 'personne_physique'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <UserCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    Personne Physique (Indépendant)
                  </p>
                  <p className="text-slate-500 mt-1">
                    Consultant, Ingénieur, Artisan ou Entrepreneur individuel.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {providerEntityType === 'personne_physique' && (
            <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-medium flex items-center justify-between gap-3">
              <span>
                <strong>Mode Personne Physique :</strong> Les champs ci-dessous sont facultatifs.
              </span>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Accéder à l&apos;application
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {providerEntityType === 'personne_morale'
                  ? 'Raison sociale *'
                  : 'Nom commercial / Enseigne (Facultatif)'}
              </label>
              <input
                type="text"
                required={isMandatory}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value.toUpperCase())}
                placeholder={
                  providerEntityType === 'personne_morale'
                    ? 'EX: GROUPE PRESTATIONS & INGÉNIERIE SARL'
                    : `Par défaut : ${superAdmin.fullName}`
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-bold uppercase text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Forme juridique {isMandatory ? '*' : '(Facultatif)'}
              </label>
              {providerEntityType === 'personne_morale' ? (
                <select
                  value={legalForm}
                  onChange={(e) => setLegalForm(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-slate-900 dark:text-white"
                >
                  <option value="SARL">SARL / SUARL</option>
                  <option value="SAS / SASU">SAS / SASU</option>
                  <option value="SA">SA (Société Anonyme)</option>
                  <option value="GIE">GIE (Groupement d&apos;Intérêt Économique)</option>
                  <option value="SNC / Société Civile">Société Civile Professionnelle</option>
                </select>
              ) : (
                <select
                  value={legalForm}
                  onChange={(e) => setLegalForm(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-slate-900 dark:text-white"
                >
                  <option value="Prestataire Indépendant / Entreprise Individuelle">
                    Prestataire Indépendant / Entreprise Individuelle (EI)
                  </option>
                  <option value="Consultant Indépendant">Consultant / Expert Indépendant</option>
                  <option value="Artisan / Prestataire Technique">Artisan / Prestataire Technique</option>
                  <option value="Auto-Entrepreneur / Micro-Entreprise">
                    Auto-Entrepreneur / Régime Entreprenant
                  </option>
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pays d&apos;implantation {isMandatory ? '*' : '(Facultatif)'}
              </label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-slate-900 dark:text-white font-medium"
              >
                {WORLD_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.dialCode} · Devise officielle : {c.currency} — {CURRENCY_CONFIG[c.currency]?.name || c.currency})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Téléphone ({selectedCountry.dialCode}) {isMandatory ? '*' : '(Facultatif)'}
              </label>
              <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 overflow-hidden">
                <span className="px-3.5 py-2.5 bg-slate-200/70 dark:bg-slate-800 font-mono italic font-bold text-slate-900 dark:text-white">
                  {selectedCountry.dialCode}
                </span>
                <input
                  type="tel"
                  required={isMandatory}
                  value={phoneLocal}
                  onChange={(e) => setPhoneLocal(e.target.value)}
                  placeholder={
                    isMandatory ? "Numéro de téléphone de l'entreprise" : 'Facultatif (Personne Physique)'
                  }
                  className="w-full bg-transparent px-3 py-2.5 italic text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Boîte Postale {isMandatory ? '*' : '(Facultatif)'}
              </label>
              <input
                type="text"
                required={isMandatory}
                value={postalBox}
                onChange={(e) => setPostalBox(e.target.value)}
                placeholder="Ex: BP 1024..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Boîte Email Officielle {isMandatory ? '*' : '(Facultatif)'}
              </label>
              <input
                type="email"
                required={isMandatory}
                value={emailBox}
                onChange={(e) => setEmailBox(e.target.value)}
                placeholder={superAdmin.email || 'contact@prestataire.com'}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Secteur de Prestation de Services {isMandatory ? '*' : '(Facultatif)'}
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
              >
                {BUSINESS_SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {providerEntityType === 'personne_morale'
                  ? 'N° RCCM / SIRET / Registre Commerce *'
                  : 'N° Pièce d’Identité (CNI / Passeport) (Facultatif)'}
              </label>
              <input
                type="text"
                required={isMandatory}
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder={
                  providerEntityType === 'personne_morale'
                    ? 'RCCM / SIRET'
                    : 'Facultatif (CNI / Passeport)'
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                N° Compte Contribuable / NIF / TVA {isMandatory ? '*' : '(Facultatif)'}
              </label>
              <input
                type="text"
                required={isMandatory}
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder={isMandatory ? 'Identifiant Fiscal' : 'Facultatif'}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-white"
              />
            </div>

            {providerEntityType === 'personne_morale' ? (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Capital Social ({selectedCountry.currency} — {CURRENCY_CONFIG[selectedCountry.currency]?.name || selectedCountry.currency})
                </label>
                <input
                  type="text"
                  value={shareCapital}
                  onChange={(e) => setShareCapital(e.target.value)}
                  placeholder="Montant du capital social"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-white"
                />
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Site Web / Portfolio (Facultatif)
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Adresse géographique du Siège / Cabinet {isMandatory ? '*' : '(Facultatif)'}
              </label>
              <input
                type="text"
                required={isMandatory}
                value={headquartersAddress}
                onChange={(e) => setHeadquartersAddress(e.target.value)}
                placeholder={isMandatory ? 'Ville, Commune, Rue, Immeuble...' : 'Facultatif'}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
            {providerEntityType === 'personne_morale' && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Site Web Officiel
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-500">
              Vous pourrez ensuite embaucher vos employés dans le <strong>Module Employés</strong> puis attribuer des comptes collaborateurs aux employés embauchés.
            </p>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Ouvrir l&apos;Espace Privé du Prestataire</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

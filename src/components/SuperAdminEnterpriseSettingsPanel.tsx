import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  Globe,
  Image as ImageIcon,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Upload,
  UserCheck,
  X,
  Briefcase,
  FileText,
  Landmark,
  Percent,
} from 'lucide-react';
import { EnterpriseDetails, ProviderEntityType } from './CompanyOnboardingWizard';
import {
  WORLD_COUNTRIES,
  BUSINESS_SECTORS,
  resolveOfficialCountryCurrency,
} from '../utils/countries';
import { Currency, CURRENCY_CONFIG, getCurrencyMetadata, getOfficialCurrencyCode } from '../utils/i18n';

export interface ExtendedEnterpriseDetails extends EnterpriseDetails {
  bankName?: string;
  ibanOrRib?: string;
  swiftBic?: string;
  mobileMoneyNumber?: string;
  customFooterNote?: string;
}

interface SuperAdminEnterpriseSettingsPanelProps {
  isSuperAdmin: boolean;
  activeTenantId: string;
  companyName: string;
  companyLogo: string | null;
  currency: Currency;
  superAdminLaborPct: number;
  enterpriseDetails: ExtendedEnterpriseDetails | null;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
  onUpdateLaborPercentage: (pct: number) => void;
  onSaveEnterpriseSettings: (updated: ExtendedEnterpriseDetails) => Promise<void> | void;
  onReopenOnboardingWizard?: () => void;
}

const LEGAL_FORMS_MORALE = [
  'SARL (Société à Responsabilité Limitée)',
  'SAS (Société par Actions Simplifiée)',
  'SASU (Société par Actions Simplifiée Unipersonnelle)',
  'SA (Société Anonyme)',
  'SUARL / EURL (Société Unipersonnelle)',
  'GIE (Groupement d’Intérêt Économique)',
  'SNC (Société en Nom Collectif)',
  'Holding / Groupe Multi-Filiales',
  'ONG / Association / Institution',
];

const LEGAL_FORMS_PHYSIQUE = [
  'Entreprise Individuelle / EIRL',
  'Consultant / Ingénieur Indépendant',
  'Auto-Entrepreneur / Micro-Entreprise',
  'Artisan / Maître d’Œuvre Indépendant',
  'Cabinet Libéral / Profession Réglementée',
];

export const SuperAdminEnterpriseSettingsPanel: React.FC<SuperAdminEnterpriseSettingsPanelProps> = ({
  isSuperAdmin,
  activeTenantId,
  companyName,
  companyLogo,
  currency,
  superAdminLaborPct,
  enterpriseDetails,
  onLogoUpload,
  onRemoveLogo,
  onUpdateLaborPercentage,
  onSaveEnterpriseSettings,
  onReopenOnboardingWizard,
}) => {
  const [providerEntityType, setProviderEntityType] = useState<ProviderEntityType>(
    enterpriseDetails?.providerEntityType || 'personne_morale'
  );
  const [legalForm, setLegalForm] = useState(
    enterpriseDetails?.legalForm || 'SARL (Société à Responsabilité Limitée)'
  );
  const [formCompanyName, setFormCompanyName] = useState(
    (enterpriseDetails?.companyName || companyName || '').toUpperCase()
  );
  const [countryCode, setCountryCode] = useState(enterpriseDetails?.countryCode || 'CI');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(
    getOfficialCurrencyCode(enterpriseDetails?.currency || currency || 'XOF')
  );
  const [sector, setSector] = useState(enterpriseDetails?.sector || BUSINESS_SECTORS[0]);
  const [phoneNumber, setPhoneNumber] = useState(
    enterpriseDetails?.phoneNumber || enterpriseDetails?.phone || ''
  );
  const [emailBox, setEmailBox] = useState(
    enterpriseDetails?.emailBox || enterpriseDetails?.email || ''
  );
  const [postalBox, setPostalBox] = useState(enterpriseDetails?.postalBox || '');
  const [headquartersAddress, setHeadquartersAddress] = useState(
    enterpriseDetails?.headquartersAddress || enterpriseDetails?.address || ''
  );
  const [city, setCity] = useState(enterpriseDetails?.city || '');
  const [taxId, setTaxId] = useState(
    enterpriseDetails?.taxId || enterpriseDetails?.nifNumber || ''
  );
  const [registrationNumber, setRegistrationNumber] = useState(
    enterpriseDetails?.registrationNumber ||
      enterpriseDetails?.rccmNumber ||
      enterpriseDetails?.rccmOrId ||
      ''
  );
  const [shareCapital, setShareCapital] = useState(enterpriseDetails?.shareCapital || '');
  const [representativeName, setRepresentativeName] = useState(
    enterpriseDetails?.representativeName || ''
  );
  const [representativeTitle, setRepresentativeTitle] = useState(
    enterpriseDetails?.representativeTitle || 'Directeur Général / Gérant'
  );
  const [website, setWebsite] = useState(enterpriseDetails?.website || '');
  const [vatRate, setVatRate] = useState<number>(
    typeof enterpriseDetails?.vatRate === 'number' ? enterpriseDetails.vatRate : 18
  );
  const [bankName, setBankName] = useState(enterpriseDetails?.bankName || '');
  const [ibanOrRib, setIbanOrRib] = useState(enterpriseDetails?.ibanOrRib || '');
  const [swiftBic, setSwiftBic] = useState(enterpriseDetails?.swiftBic || '');
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState(
    enterpriseDetails?.mobileMoneyNumber || ''
  );
  const [customFooterNote, setCustomFooterNote] = useState(
    enterpriseDetails?.customFooterNote || ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessBanner, setSavedSuccessBanner] = useState(false);

  useEffect(() => {
    if (!enterpriseDetails) {
      setFormCompanyName((companyName || '').toUpperCase());
      return;
    }
    setProviderEntityType(enterpriseDetails.providerEntityType || 'personne_morale');
    setLegalForm(enterpriseDetails.legalForm || 'SARL (Société à Responsabilité Limitée)');
    setFormCompanyName((enterpriseDetails.companyName || companyName || '').toUpperCase());
    setCountryCode(enterpriseDetails.countryCode || 'CI');
    setSelectedCurrency(
      getOfficialCurrencyCode(enterpriseDetails.currency || currency || 'XOF')
    );
    setSector(enterpriseDetails.sector || BUSINESS_SECTORS[0]);
    setPhoneNumber(enterpriseDetails.phoneNumber || enterpriseDetails.phone || '');
    setEmailBox(enterpriseDetails.emailBox || enterpriseDetails.email || '');
    setPostalBox(enterpriseDetails.postalBox || '');
    setHeadquartersAddress(
      enterpriseDetails.headquartersAddress || enterpriseDetails.address || ''
    );
    setCity(enterpriseDetails.city || '');
    setTaxId(enterpriseDetails.taxId || enterpriseDetails.nifNumber || '');
    setRegistrationNumber(
      enterpriseDetails.registrationNumber ||
        enterpriseDetails.rccmNumber ||
        enterpriseDetails.rccmOrId ||
        ''
    );
    setShareCapital(enterpriseDetails.shareCapital || '');
    setRepresentativeName(enterpriseDetails.representativeName || '');
    setRepresentativeTitle(
      enterpriseDetails.representativeTitle || 'Directeur Général / Gérant'
    );
    setWebsite(enterpriseDetails.website || '');
    if (typeof enterpriseDetails.vatRate === 'number') {
      setVatRate(enterpriseDetails.vatRate);
    }
    setBankName(enterpriseDetails.bankName || '');
    setIbanOrRib(enterpriseDetails.ibanOrRib || '');
    setSwiftBic(enterpriseDetails.swiftBic || '');
    setMobileMoneyNumber(enterpriseDetails.mobileMoneyNumber || '');
    setCustomFooterNote(enterpriseDetails.customFooterNote || '');
  }, [enterpriseDetails, companyName, currency]);

  const handleCountryChange = (newCode: string) => {
    if (!isSuperAdmin) return;
    setCountryCode(newCode);
    const foundCountry = WORLD_COUNTRIES.find((c) => c.code === newCode);
    if (foundCountry) {
      const autoCurr = resolveOfficialCountryCurrency(foundCountry.code, foundCountry.currency);
      setSelectedCurrency(getOfficialCurrencyCode(autoCurr));
      if (typeof foundCountry.defaultVatRate === 'number') {
        setVatRate(foundCountry.defaultVatRate);
      }
      if (!phoneNumber.trim() || phoneNumber.trim().startsWith('+')) {
        const stripped = phoneNumber.replace(/^\+\d+\s*/, '');
        setPhoneNumber(`${foundCountry.dialCode} ${stripped}`.trim());
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (!formCompanyName.trim()) return;

    setIsSaving(true);
    setSavedSuccessBanner(false);
    try {
      const selectedCountryObj =
        WORLD_COUNTRIES.find((c) => c.code === countryCode) || WORLD_COUNTRIES[0];
      const upperName = formCompanyName.trim().toUpperCase();

      const updated: ExtendedEnterpriseDetails = {
        ...(enterpriseDetails || {}),
        tenantId: activeTenantId,
        providerEntityType,
        legalEntityType: providerEntityType === 'personne_physique' ? 'physical' : 'moral',
        legalForm: legalForm.trim(),
        companyName: upperName,
        countryCode: selectedCountryObj.code,
        countryName: selectedCountryObj.name,
        dialCode: selectedCountryObj.dialCode,
        phoneNumber: phoneNumber.trim(),
        phone: phoneNumber.trim(),
        emailBox: emailBox.trim(),
        email: emailBox.trim(),
        postalBox: postalBox.trim(),
        sector: sector.trim(),
        activitySector: sector.trim(),
        vatRate: Number(vatRate) || 0,
        taxId: taxId.trim().toUpperCase(),
        nifNumber: taxId.trim().toUpperCase(),
        registrationNumber: registrationNumber.trim().toUpperCase(),
        rccmNumber: registrationNumber.trim().toUpperCase(),
        rccmOrId: registrationNumber.trim().toUpperCase(),
        headquartersAddress: headquartersAddress.trim(),
        address: headquartersAddress.trim(),
        city: city.trim(),
        representativeName: representativeName.trim().toUpperCase(),
        representativeTitle: representativeTitle.trim(),
        website: website.trim(),
        shareCapital: shareCapital.trim(),
        currency: getOfficialCurrencyCode(selectedCurrency),
        bankName: bankName.trim(),
        ibanOrRib: ibanOrRib.trim().toUpperCase(),
        swiftBic: swiftBic.trim().toUpperCase(),
        mobileMoneyNumber: mobileMoneyNumber.trim(),
        customFooterNote: customFooterNote.trim(),
        lastActivityAt: new Date().toISOString(),
      };

      await onSaveEnterpriseSettings(updated);
      setSavedSuccessBanner(true);
      setTimeout(() => setSavedSuccessBanner(false), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const legalFormsList =
    providerEntityType === 'personne_physique' ? LEGAL_FORMS_PHYSIQUE : LEGAL_FORMS_MORALE;

  return (
    <div className="rounded-2xl border-2 border-[#1D4ED8]/30 dark:border-blue-800/70 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* En-tête officiel avec verrouillage exclusif Super-Admin */}
      <div className="px-6 py-4 bg-gradient-to-r from-[#0A2558] via-[#1D4ED8] to-[#0A2558] text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-[#F97316]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight">
                Paramètres Généraux &amp; Juridiques de l&apos;Entreprise
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 ${
                  isSuperAdmin
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50'
                    : 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
                }`}
              >
                {isSuperAdmin ? (
                  <>
                    <ShieldCheck className="w-3 h-3 text-emerald-300" />
                    <span>Accès Exclusif Super-Admin Autorisé</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-amber-300" />
                    <span>Lecture Seule — Modification réservée au Super-Admin</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-blue-100/90 mt-0.5">
              Configuration officielle de la raison sociale, du statut juridique, des identifiants fiscaux (RCCM/NIF), de la devise ISO 4217 et des coordonnées bancaires figurant sur tous vos documents.
            </p>
          </div>
        </div>

        {isSuperAdmin && onReopenOnboardingWizard && (
          <button
            type="button"
            onClick={onReopenOnboardingWizard}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold text-white cursor-pointer transition-colors"
          >
            Assistant initial de configuration
          </button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="mx-6 mt-5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/70 flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200">
          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Sécurité &amp; Gouvernance d&apos;Entreprise :</strong> Conformément à la politique de droits d&apos;accès, seul le <strong>Super-Admin</strong> de l&apos;entreprise est habilité à modifier les paramètres de l&apos;entreprise.
          </span>
        </div>
      )}

      {savedSuccessBanner && (
        <div className="mx-6 mt-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-400 dark:border-emerald-600 flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2.5 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Paramètres de l&apos;entreprise enregistrés et synchronisés en temps réel sur tous les documents PDF et les mémoires serveurs Cloud/SaaS.
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* SECTION 1 : LOGO & IDENTITÉ JURIDIQUE PRINCIPALE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-blue-400/60 dark:border-blue-700 bg-white dark:bg-slate-900 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-xs">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={formCompanyName}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center text-[11px] text-slate-400">
                  <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-60" />
                  <span>Aucun logo</span>
                </div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left lg:text-center">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Logo Officiel de l&apos;Entreprise
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Apparaît automatiquement dans l&apos;en-tête de vos Devis, Factures Proforma, Factures, Contrats et Rapports PDF.
              </p>
              {isSuperAdmin ? (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#1D4ED8] hover:bg-blue-600 transition-colors shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importer un logo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={onLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {companyLogo && (
                    <button
                      type="button"
                      onClick={onRemoveLogo}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              ) : (
                <span className="inline-block text-[10px] font-mono text-amber-600 dark:text-amber-400">
                  Import du logo réservé au Super-Admin
                </span>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Raison Sociale / Dénomination Officielle de l&apos;Entreprise *
              </label>
              <input
                type="text"
                required
                disabled={!isSuperAdmin}
                maxLength={120}
                value={formCompanyName}
                onChange={(e) => setFormCompanyName(e.target.value.toUpperCase())}
                placeholder="EX: GROUPE INGÉNIERIE & BTP INTERNATIONAL SARL"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-extrabold uppercase tracking-wide text-slate-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nature Juridique du Prestataire
              </label>
              <select
                disabled={!isSuperAdmin}
                value={providerEntityType}
                onChange={(e) => {
                  const nextType = e.target.value as ProviderEntityType;
                  setProviderEntityType(nextType);
                  setLegalForm(
                    nextType === 'personne_physique'
                      ? LEGAL_FORMS_PHYSIQUE[0]
                      : LEGAL_FORMS_MORALE[0]
                  );
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-60"
              >
                <option value="personne_morale">Personne Morale (Société / Entreprise)</option>
                <option value="personne_physique">Personne Physique (Prestataire Individuel)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Forme Juridique
              </label>
              <select
                disabled={!isSuperAdmin}
                value={legalForm}
                onChange={(e) => setLegalForm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-60"
              >
                {legalFormsList.map((lf) => (
                  <option key={lf} value={lf}>
                    {lf}
                  </option>
                ))}
                {!legalFormsList.includes(legalForm) && legalForm && (
                  <option value={legalForm}>{legalForm}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Secteur d&apos;Activité Principal
              </label>
              <select
                disabled={!isSuperAdmin}
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-60"
              >
                {BUSINESS_SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                {!BUSINESS_SECTORS.includes(sector) && sector && (
                  <option value={sector}>{sector}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Capital Social (si applicable)
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={shareCapital}
                onChange={(e) => setShareCapital(e.target.value)}
                placeholder="Ex: 10 000 000 FCFA / 50 000 EUR"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2 : PAYS, DEVISE OFFICIELLE ISO 4217 & IDENTIFIANTS FISCAUX / LÉGAUX */}
        <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0A2558] dark:text-blue-400">
            <Globe className="w-4 h-4 text-[#F97316]" />
            <span>Juridiction, Devise Officielle ISO 4217 &amp; Identifiants Fiscaux</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Pays d&apos;Implantation
              </label>
              <select
                disabled={!isSuperAdmin}
                value={countryCode}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-60"
              >
                {WORLD_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.dialCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Devise Officielle de l&apos;Entreprise (ISO 4217)
              </label>
              <select
                disabled={!isSuperAdmin}
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(getOfficialCurrencyCode(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-blue-700 dark:text-blue-400 disabled:opacity-60"
              >
                {(Object.keys(CURRENCY_CONFIG) as Currency[]).map((c) => {
                  const meta = getCurrencyMetadata(c);
                  return (
                    <option key={c} value={c}>
                      {c} — {meta.name} (ISO {meta.numericCode})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {providerEntityType === 'personne_physique'
                  ? 'N° CNI / Passeport / Patente'
                  : 'N° RCCM / SIRET / Registre de Commerce'}
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                placeholder="Ex: CI-ABJ-03-2026-B12-00482"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                N° NIF / Compte Contribuable / TVA Intracom.
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={taxId}
                onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                placeholder="Ex: CC-2049582-X"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Taux de TVA Légal par Défaut (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  disabled={!isSuperAdmin}
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white disabled:opacity-60"
                />
                <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                Taux de Main d&apos;Œuvre Prédéfini (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="500"
                  disabled={!isSuperAdmin}
                  value={superAdminLaborPct}
                  onChange={(e) => onUpdateLaborPercentage(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-amber-400 dark:border-amber-600 bg-amber-50/40 dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-amber-900 dark:text-amber-300 disabled:opacity-60"
                />
                <Percent className="w-3.5 h-3.5 text-amber-500 absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Représentant Légal (Nom &amp; Prénoms)
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={representativeName}
                  onChange={(e) => setRepresentativeName(e.target.value.toUpperCase())}
                  placeholder="NOM DU DIRIGEANT"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-bold uppercase text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Qualité / Fonction du Représentant
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={representativeTitle}
                onChange={(e) => setRepresentativeTitle(e.target.value)}
                placeholder="Ex: Directeur Général / Gérant"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3 : COORDONNÉES DE CONTACT, SIÈGE SOCIAL & BANQUE */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0A2558] dark:text-blue-400">
            <MapPin className="w-4 h-4 text-[#F97316]" />
            <span>Siège Social, Coordonnées Officielles &amp; Domiciliation Bancaire</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Adresse Géographique du Siège Social
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={headquartersAddress}
                onChange={(e) => setHeadquartersAddress(e.target.value)}
                placeholder="Ex: Boulevard Latrille, Cocody II Plateaux, Immeuble Horizon"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ville / Commune
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Abidjan / Paris / Dakar"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Boîte Postale / Code Postal
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={postalBox}
                onChange={(e) => setPostalBox(e.target.value)}
                placeholder="Ex: 01 BP 4829 Abidjan 01"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Téléphone Officiel (avec indicatif)
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ex: +225 07 00 00 00 00"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                E-mail Officiel de l&apos;Entreprise
              </label>
              <input
                type="email"
                disabled={!isSuperAdmin}
                value={emailBox}
                onChange={(e) => setEmailBox(e.target.value)}
                placeholder="contact@entreprise.com"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Site Web Officiel
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.entreprise.com"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Banque Principale de Domiciliation
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ex: SGCI / BNP Paribas / Ecobank"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                IBAN / RIB Officiel (affiché sur les factures)
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={ibanOrRib}
                onChange={(e) => setIbanOrRib(e.target.value.toUpperCase())}
                placeholder="Ex: CI93 CI00 8011 1100 0482 9150 0074"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Code SWIFT / BIC
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={swiftBic}
                onChange={(e) => setSwiftBic(e.target.value.toUpperCase())}
                placeholder="Ex: SGCICIAB"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Compte Mobile Money / Stripe Payout
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={mobileMoneyNumber}
                onChange={(e) => setMobileMoneyNumber(e.target.value)}
                placeholder="Ex: +225 07 00 00 00 00"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-medium text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* BARRE DE VALIDATION EXCLUSIVE SUPER-ADMIN */}
        {isSuperAdmin && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Toute modification validée par le <strong>Super-Admin</strong> met immédiatement à jour l&apos;identité numérique de l&apos;entreprise et l&apos;ensemble des documents imprimables.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0A2558] via-[#1D4ED8] to-[#F97316] hover:opacity-95 text-white text-xs font-extrabold inline-flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Enregistrement & Synchronisation Cloud...'
                  : "Enregistrer les Paramètres de l'Entreprise (Super-Admin)"}
              </span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

interface SuperAdminEnterpriseSettingsModalProps extends SuperAdminEnterpriseSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuperAdminEnterpriseSettingsModal: React.FC<SuperAdminEnterpriseSettingsModalProps> = ({
  isOpen,
  onClose,
  ...panelProps
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-[#F97316]" />
            <span>Console Super-Admin — Paramètres Officiels de l&apos;Entreprise</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 sm:p-6">
          <SuperAdminEnterpriseSettingsPanel {...panelProps} />
        </div>
      </div>
    </div>
  );
};

import { Currency, CURRENCY_CONFIG, getOfficialCurrencyCode } from './i18n';

export interface WorldCountry {
  code: string;
  name: string;
  dialCode: string;
  currency: Currency;
  vatRate?: number;
  defaultVatRate?: number;
}

/**
 * Taux de TVA légal exact en vigueur par code pays ISO-2
 */
export const COUNTRY_STATUTORY_VAT_RATES: Record<string, number> = {
  // Afrique de l'Ouest (UEMOA & CEDEAO)
  CI: 18,
  SN: 18,
  ML: 18,
  BF: 18,
  BJ: 18,
  TG: 18,
  NE: 19,
  GW: 17,
  GN: 18,
  GH: 15,
  NG: 7.5,
  LR: 10,
  SL: 15,
  CV: 15,
  GM: 15,
  MR: 16,
  // Afrique Centrale (CEMAC & Grands Lacs)
  CM: 19.25,
  GA: 18,
  CG: 18.9,
  TD: 18,
  CF: 19,
  GQ: 15,
  CD: 16,
  RW: 18,
  BI: 18,
  ST: 15,
  AO: 14,
  // Afrique du Nord
  MA: 20,
  DZ: 19,
  TN: 19,
  EG: 14,
  LY: 0,
  // Afrique de l'Est & Australe
  KE: 16,
  TZ: 18,
  UG: 18,
  ET: 15,
  DJ: 10,
  MG: 20,
  MU: 15,
  SC: 15,
  KM: 10,
  ZA: 15,
  NA: 15,
  BW: 14,
  ZM: 16,
  ZW: 15,
  MZ: 16,
  MW: 16.5,
  // Europe
  FR: 20,
  BE: 21,
  CH: 8.1,
  LU: 17,
  MC: 20,
  DE: 19,
  IT: 22,
  ES: 21,
  PT: 23,
  GB: 20,
  IE: 23,
  NL: 21,
  AT: 20,
  SE: 25,
  NO: 25,
  DK: 25,
  FI: 25.5,
  PL: 23,
  CZ: 21,
  GR: 24,
  RO: 19,
  HU: 27,
  BG: 20,
  HR: 25,
  SK: 20,
  SI: 22,
  EE: 22,
  LV: 21,
  LT: 21,
  CY: 19,
  MT: 18,
  IS: 24,
  TR: 20,
  UA: 20,
  RS: 20,
  AL: 20,
  // Amériques
  CA: 5,
  US: 0,
  MX: 16,
  BR: 17,
  AR: 21,
  CL: 19,
  CO: 19,
  PE: 18,
  UY: 22,
  EC: 15,
  PA: 7,
  CR: 13,
  DO: 18,
  HT: 10,
  JM: 15,
  // Moyen-Orient & Asie-Pacifique
  AE: 5,
  SA: 15,
  QA: 0,
  KW: 0,
  BH: 10,
  OM: 5,
  JO: 16,
  LB: 11,
  IL: 17,
  CN: 13,
  JP: 10,
  KR: 10,
  IN: 18,
  SG: 9,
  MY: 8,
  TH: 7,
  VN: 10,
  ID: 11,
  PH: 12,
  PK: 18,
  BD: 15,
  LK: 18,
  KZ: 12,
  UZ: 12,
  AU: 10,
  NZ: 15,
  FJ: 15,
  PG: 10,
};

export function getCountryVatRate(countryCode?: string): number {
  if (!countryCode) return 18;
  const upper = countryCode.trim().toUpperCase();
  if (upper in COUNTRY_STATUTORY_VAT_RATES) {
    return COUNTRY_STATUTORY_VAT_RATES[upper];
  }
  return 18;
}

export function getCountryByCode(countryCode?: string): WorldCountry | undefined {
  if (!countryCode) return undefined;
  const upper = countryCode.trim().toUpperCase();
  return WORLD_COUNTRIES.find((c) => c.code.toUpperCase() === upper);
}

/**
 * Sous-rubriques prédéfinies selon les différents Corps de Métiers pour le Catalogue
 */
export const DEFAULT_TRADE_SUBCATEGORIES: Record<string, string[]> = {
  'Topographie & Terrassement': [
    'Bornage, Relevés Géomètre & Implantation',
    'Décapage, Fouilles & Excavation Mécanique',
    'Remblais Compactés, Gravier & Géotextile',
    'Location Engins de Terrassement',
  ],
  'Gros Œuvre, Maçonnerie & Béton Armé': [
    'Ciments, Liants Hydrauliques & Adjuvants',
    'Aciers Haute Adhérence (Fer à béton HA) & Treillis',
    'Granulats (Sable, Gravier Concassé) & Béton Prêt à l’Emploi',
    'Agglomérés (Parpaings, Briques, Hourdis)',
    'Bois & Panneaux de Coffrage / Édification',
  ],
  'Charpente, Couverture & Étanchéité': [
    'Profilés Acier (IPE, IPN, Tubes) & Charpente Métallique',
    'Bois de Charpente & Fermettes',
    'Tôles Bac Acier, Tuiles & Accessoires de Toiture',
    'Membranes Bitumineuses, Résines & Étanchéité Multicouche',
  ],
  'Électricité Courants Forts / Faibles': [
    'Câbles Électriques, Fourreaux ICTA & Chemins de Câbles',
    'Tableaux TGBT, Disjoncteurs, Coffrets & Parafoudres',
    'Appareillage Électrique, Prises & Éclairage LED',
    'Groupes Électrogènes, Onduleurs & Mise à la Terre',
  ],
  'Plomberie, Sanitaire & CVC': [
    'Tuyauterie PVC Pression, Multicouche, PPR & Cuivre',
    'Robinetterie, Vannes, Pompes & Surpresseurs',
    'Appareils Sanitaires, Chauffe-eau & Accessoires',
    'Climatisation (Splits, VRV), Ventilation & Gaines CVC',
  ],
  'Menuiserie, Peinture & Finitions': [
    'Menuiserie Aluminium, Vitrerie & Baies Vitrées',
    'Menuiserie Bois, Portes Blindées & Serrurerie',
    'Carrelage Grès Cérame, Faïence, Marbre & Colles',
    'Enduits, Peintures Intérieures/Extérieures & Faux-Plafonds',
  ],
  'Énergie Solaire & Photovoltaïque': [
    'Panneaux Solaires Monocristallins & Structures Portantes',
    'Onduleurs Hybrides / Réseau & Régulateurs MPPT',
    'Batteries Lithium LiFePO4 & Armoires de Stockage',
    'Câblage Solaire DC/AC, Connecteurs MC4 & Coffrets DC',
  ],
  'Ingénierie IT, Cloud, Télécoms & Réseaux': [
    'Câblage Fibre Optique, Jarretières & Boîtiers CTO/PBO',
    'Baies de Brassage, Switchs, Routeurs & Pare-feu',
    'Serveurs, Licences Cloud, Stockage SAN/NAS & Sécurité',
    'Prestations d’Audit, Développement & Intégration',
  ],
  'Logistique, Transport & Manutention': [
    'Manutention, Levage (Grues, Chariots) & Palettisation',
    'Transport de Matériaux, Convois & Livraison sur Site',
    'Équipements de Protection Individuelle (EPI) & Signalisation',
    'Outillage Professionnel & Consommables d’Atelier',
  ],
  'Déplacements, Missions & Services': [
    'Frais de Déplacement, Carburant & Péages',
    'Missions d’Expertise, Hébergement & Per Diem',
    'Sous-traitance Spécialisée & Essais Laboratoire',
    'Services Administratifs, Gardiennage & Nettoyage Chantier',
  ],
};

export const DEFAULT_PERSONNEL_CATEGORIES: string[] = [
  'Ingénieur / Conducteur de Travaux',
  'Chef de Chantier / Superviseur',
  'Chef de Corps de Métier',
  'Technicien Supérieur',
  'Ouvrier Qualifié / Compagnon',
  'Manœuvre',
  'Magasinier / Logisticien',
  'Consultant / Expert Technique',
  'Personnel Administratif & Comptable',
  'Agent HSE / Sécurité',
];

export const DEFAULT_TRAVEL_SERVICE_CATEGORIES: string[] = [
  'Transport & Liaison Chantier (Carburant, Véhicules, Péages)',
  'Mission Technique & Déplacement Hors Siège (Per Diem, Hôtel, Restauration)',
  'Location d’Engins, Grues & Équipements avec Opérateur',
  'Essais Laboratoire, Géotechnique & Contrôle Normatif',
  'Prestation d’Ingénierie, Études Architecturales & Topographie',
  'Maintenance, Dépannage d’Urgence & SAV',
  'Logistique d’Approvisionnement, Transit & Manutention',
  'Gardiennage, Sécurité HSE & Nettoyage de Chantier',
];

export const WORLD_COUNTRIES: WorldCountry[] = [
  // Afrique de l'Ouest — Zone UEMOA (Franc CFA BCEAO : XOF)
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', currency: 'XOF' },
  { code: 'SN', name: 'Sénégal', dialCode: '+221', currency: 'XOF' },
  { code: 'BJ', name: 'Bénin', dialCode: '+229', currency: 'XOF' },
  { code: 'TG', name: 'Togo', dialCode: '+228', currency: 'XOF' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', currency: 'XOF' },
  { code: 'ML', name: 'Mali', dialCode: '+223', currency: 'XOF' },
  { code: 'NE', name: 'Niger', dialCode: '+227', currency: 'XOF' },
  { code: 'GW', name: 'Guinée-Bissau', dialCode: '+245', currency: 'XOF' },

  // Afrique Centrale — Zone CEMAC (Franc CFA BEAC : XAF)
  { code: 'CM', name: 'Cameroun', dialCode: '+237', currency: 'XAF' },
  { code: 'GA', name: 'Gabon', dialCode: '+241', currency: 'XAF' },
  { code: 'CG', name: 'Congo (Brazzaville)', dialCode: '+242', currency: 'XAF' },
  { code: 'TD', name: 'Tchad', dialCode: '+235', currency: 'XAF' },
  { code: 'CF', name: 'République Centrafricaine', dialCode: '+236', currency: 'XAF' },
  { code: 'GQ', name: 'Guinée Équatoriale', dialCode: '+240', currency: 'XAF' },

  // Afrique de l'Ouest & Centrale (Hors Zone CFA)
  { code: 'GN', name: 'Guinée (Conakry)', dialCode: '+224', currency: 'GNF' },
  { code: 'CD', name: 'RD Congo (Kinshasa)', dialCode: '+243', currency: 'CDF' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', currency: 'GHS' },
  { code: 'NG', name: 'Nigéria', dialCode: '+234', currency: 'NGN' },
  { code: 'CV', name: 'Cap-Vert', dialCode: '+238', currency: 'CVE' },
  { code: 'GM', name: 'Gambie', dialCode: '+220', currency: 'GMD' },
  { code: 'LR', name: 'Libéria', dialCode: '+231', currency: 'LRD' },
  { code: 'SL', name: 'Sierra Leone', dialCode: '+232', currency: 'SLE' },
  { code: 'MR', name: 'Mauritanie', dialCode: '+222', currency: 'MRU' },
  { code: 'RW', name: 'Rwanda', dialCode: '+250', currency: 'RWF' },
  { code: 'BI', name: 'Burundi', dialCode: '+257', currency: 'BIF' },
  { code: 'ST', name: 'Sao Tomé-et-Principe', dialCode: '+239', currency: 'STN' },
  { code: 'AO', name: 'Angola', dialCode: '+244', currency: 'AOA' },

  // Afrique du Nord
  { code: 'MA', name: 'Maroc', dialCode: '+212', currency: 'MAD' },
  { code: 'TN', name: 'Tunisie', dialCode: '+216', currency: 'TND' },
  { code: 'DZ', name: 'Algérie', dialCode: '+213', currency: 'DZD' },
  { code: 'EG', name: 'Égypte', dialCode: '+20', currency: 'EGP' },
  { code: 'LY', name: 'Libye', dialCode: '+218', currency: 'LYD' },

  // Afrique de l'Est, Océan Indien & Afrique Australe
  { code: 'KE', name: 'Kenya', dialCode: '+254', currency: 'KES' },
  { code: 'TZ', name: 'Tanzanie', dialCode: '+255', currency: 'TZS' },
  { code: 'UG', name: 'Ouganda', dialCode: '+256', currency: 'UGX' },
  { code: 'ET', name: 'Éthiopie', dialCode: '+251', currency: 'ETB' },
  { code: 'DJ', name: 'Djibouti', dialCode: '+253', currency: 'DJF' },
  { code: 'MG', name: 'Madagascar', dialCode: '+261', currency: 'MGA' },
  { code: 'MU', name: 'Maurice', dialCode: '+230', currency: 'MUR' },
  { code: 'SC', name: 'Seychelles', dialCode: '+248', currency: 'SCR' },
  { code: 'KM', name: 'Comores', dialCode: '+269', currency: 'KMF' },
  { code: 'ZA', name: 'Afrique du Sud', dialCode: '+27', currency: 'ZAR' },
  { code: 'NA', name: 'Namibie', dialCode: '+264', currency: 'NAD' },
  { code: 'BW', name: 'Botswana', dialCode: '+267', currency: 'BWP' },
  { code: 'ZM', name: 'Zambie', dialCode: '+260', currency: 'ZMW' },
  { code: 'ZW', name: 'Zimbabwe', dialCode: '+263', currency: 'ZWG' },
  { code: 'MZ', name: 'Mozambique', dialCode: '+258', currency: 'MZN' },
  { code: 'MW', name: 'Malawi', dialCode: '+265', currency: 'MWK' },

  // Europe
  { code: 'FR', name: 'France', dialCode: '+33', currency: 'EUR' },
  { code: 'BE', name: 'Belgique', dialCode: '+32', currency: 'EUR' },
  { code: 'CH', name: 'Suisse', dialCode: '+41', currency: 'CHF' },
  { code: 'LU', name: 'Luxembourg', dialCode: '+352', currency: 'EUR' },
  { code: 'MC', name: 'Monaco', dialCode: '+377', currency: 'EUR' },
  { code: 'DE', name: 'Allemagne', dialCode: '+49', currency: 'EUR' },
  { code: 'ES', name: 'Espagne', dialCode: '+34', currency: 'EUR' },
  { code: 'IT', name: 'Italie', dialCode: '+39', currency: 'EUR' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', currency: 'EUR' },
  { code: 'NL', name: 'Pays-Bas', dialCode: '+31', currency: 'EUR' },
  { code: 'GB', name: 'Royaume-Uni', dialCode: '+44', currency: 'GBP' },
  { code: 'IE', name: 'Irlande', dialCode: '+353', currency: 'EUR' },
  { code: 'AT', name: 'Autriche', dialCode: '+43', currency: 'EUR' },
  { code: 'FI', name: 'Finlande', dialCode: '+358', currency: 'EUR' },
  { code: 'GR', name: 'Grèce', dialCode: '+30', currency: 'EUR' },
  { code: 'HR', name: 'Croatie', dialCode: '+385', currency: 'EUR' },
  { code: 'SK', name: 'Slovaquie', dialCode: '+421', currency: 'EUR' },
  { code: 'SI', name: 'Slovénie', dialCode: '+386', currency: 'EUR' },
  { code: 'EE', name: 'Estonie', dialCode: '+372', currency: 'EUR' },
  { code: 'LV', name: 'Lettonie', dialCode: '+371', currency: 'EUR' },
  { code: 'LT', name: 'Lituanie', dialCode: '+370', currency: 'EUR' },
  { code: 'CY', name: 'Chypre', dialCode: '+357', currency: 'EUR' },
  { code: 'MT', name: 'Malte', dialCode: '+356', currency: 'EUR' },
  { code: 'SE', name: 'Suède', dialCode: '+46', currency: 'SEK' },
  { code: 'NO', name: 'Norvège', dialCode: '+47', currency: 'NOK' },
  { code: 'DK', name: 'Danemark', dialCode: '+45', currency: 'DKK' },
  { code: 'PL', name: 'Pologne', dialCode: '+48', currency: 'PLN' },
  { code: 'CZ', name: 'Tchéquie', dialCode: '+420', currency: 'CZK' },
  { code: 'RO', name: 'Roumanie', dialCode: '+40', currency: 'RON' },
  { code: 'HU', name: 'Hongrie', dialCode: '+36', currency: 'HUF' },
  { code: 'BG', name: 'Bulgarie', dialCode: '+359', currency: 'BGN' },
  { code: 'IS', name: 'Islande', dialCode: '+354', currency: 'ISK' },
  { code: 'TR', name: 'Turquie', dialCode: '+90', currency: 'TRY' },
  { code: 'UA', name: 'Ukraine', dialCode: '+380', currency: 'UAH' },
  { code: 'RS', name: 'Serbie', dialCode: '+381', currency: 'RSD' },
  { code: 'AL', name: 'Albanie', dialCode: '+355', currency: 'ALL' },

  // Amériques & Caraïbes
  { code: 'CA', name: 'Canada', dialCode: '+1', currency: 'CAD' },
  { code: 'US', name: 'États-Unis', dialCode: '+1', currency: 'USD' },
  { code: 'MX', name: 'Mexique', dialCode: '+52', currency: 'MXN' },
  { code: 'BR', name: 'Brésil', dialCode: '+55', currency: 'BRL' },
  { code: 'AR', name: 'Argentine', dialCode: '+54', currency: 'ARS' },
  { code: 'CL', name: 'Chili', dialCode: '+56', currency: 'CLP' },
  { code: 'CO', name: 'Colombie', dialCode: '+57', currency: 'COP' },
  { code: 'PE', name: 'Pérou', dialCode: '+51', currency: 'PEN' },
  { code: 'UY', name: 'Uruguay', dialCode: '+598', currency: 'UYU' },
  { code: 'EC', name: 'Équateur', dialCode: '+593', currency: 'USD' },
  { code: 'PA', name: 'Panama', dialCode: '+507', currency: 'PAB' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506', currency: 'CRC' },
  { code: 'DO', name: 'République Dominicaine', dialCode: '+1', currency: 'DOP' },
  { code: 'HT', name: 'Haïti', dialCode: '+509', currency: 'HTG' },
  { code: 'JM', name: 'Jamaïque', dialCode: '+1', currency: 'JMD' },

  // Moyen-Orient & Asie-Pacifique
  { code: 'AE', name: 'Émirats Arabes Unis', dialCode: '+971', currency: 'AED' },
  { code: 'SA', name: 'Arabie Saoudite', dialCode: '+966', currency: 'SAR' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', currency: 'QAR' },
  { code: 'KW', name: 'Koweït', dialCode: '+965', currency: 'KWD' },
  { code: 'BH', name: 'Bahreïn', dialCode: '+973', currency: 'BHD' },
  { code: 'OM', name: 'Oman', dialCode: '+968', currency: 'OMR' },
  { code: 'JO', name: 'Jordanie', dialCode: '+962', currency: 'JOD' },
  { code: 'LB', name: 'Liban', dialCode: '+961', currency: 'LBP' },
  { code: 'IL', name: 'Israël', dialCode: '+972', currency: 'ILS' },
  { code: 'CN', name: 'Chine', dialCode: '+86', currency: 'CNY' },
  { code: 'JP', name: 'Japon', dialCode: '+81', currency: 'JPY' },
  { code: 'KR', name: 'Corée du Sud', dialCode: '+82', currency: 'KRW' },
  { code: 'IN', name: 'Inde', dialCode: '+91', currency: 'INR' },
  { code: 'SG', name: 'Singapour', dialCode: '+65', currency: 'SGD' },
  { code: 'MY', name: 'Malaisie', dialCode: '+60', currency: 'MYR' },
  { code: 'TH', name: 'Thaïlande', dialCode: '+66', currency: 'THB' },
  { code: 'VN', name: 'Viêt Nam', dialCode: '+84', currency: 'VND' },
  { code: 'ID', name: 'Indonésie', dialCode: '+62', currency: 'IDR' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', currency: 'PHP' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', currency: 'PKR' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', currency: 'BDT' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', currency: 'LKR' },
  { code: 'KZ', name: 'Kazakhstan', dialCode: '+7', currency: 'KZT' },
  { code: 'UZ', name: 'Ouzbékistan', dialCode: '+998', currency: 'UZS' },
  { code: 'AU', name: 'Australie', dialCode: '+61', currency: 'AUD' },
  { code: 'NZ', name: 'Nouvelle-Zélande', dialCode: '+64', currency: 'NZD' },
  { code: 'FJ', name: 'Fidji', dialCode: '+679', currency: 'FJD' },
  { code: 'PG', name: 'Papouasie-Nouvelle-Guinée', dialCode: '+675', currency: 'PGK' },
];

/**
 * Résout le code devise officiel ISO 4217 pour un pays donné et corrige automatiquement
 * les anciennes affectations erronées (ex: CM/GA/CG qui avaient XOF au lieu de XAF,
 * MA/TN/DZ/MG qui avaient EUR, ou GN/CD/NG/GH/KE/ZA/AE/BR/MX/SG/JP/AU).
 */
export function resolveOfficialCountryCurrency(
  countryCode?: string,
  savedCurrency?: string
): Currency {
  const country = getCountryByCode(countryCode);
  if (country) {
    // Si la devise enregistrée correspondait à une ancienne affectation par défaut erronée pour ce pays,
    // on force la devise officielle ISO 4217 du pays.
    const upperCode = country.code.toUpperCase();
    const legacyMisassignedCountries = new Set([
      'CM',
      'GA',
      'CG',
      'TD',
      'CF',
      'GQ',
      'GN',
      'CD',
      'MA',
      'TN',
      'DZ',
      'MG',
      'AE',
      'ZA',
      'NG',
      'GH',
      'KE',
      'MU',
      'BR',
      'MX',
      'SG',
      'JP',
      'AU',
    ]);
    if (!savedCurrency || legacyMisassignedCountries.has(upperCode)) {
      return country.currency;
    }
  }
  if (savedCurrency && savedCurrency.trim().toUpperCase() in CURRENCY_CONFIG) {
    return getOfficialCurrencyCode(savedCurrency);
  }
  return country?.currency || 'XOF';
}

export const BUSINESS_SECTORS = [
  'Ingénierie, BTP & Construction',
  'Technologies, Cloud & Conseil IT',
  'Industrie, Énergie & Logistique',
  'Finance, Audit & Expertise Comptable',
  'Commerce International & Distribution',
  'Santé, Pharmaceutique & Biotech',
  'Architecture, Design & Médias',
  'Agro-industrie & Environnement',
  'Services aux Entreprises (B2B)',
];

export type SystemAndEnterpriseRoleId =
  | 'adgensys'
  | 'moas'
  | 'teleconseiller'
  | 'consultant_operation'
  | 'super_admin'
  | 'manager'
  | 'accountant'
  | 'collaborator'
  | 'viewer';

export interface RolePermission {
  id: SystemAndEnterpriseRoleId;
  label: string;
  functionTitle: string;
  rightsDescription: string;
  canManageTeam: boolean;
  canValidateInvoices: boolean;
  canRecordPayments: boolean;
  canManageProjects: boolean;
  isSystemRole?: boolean;
}

export interface SaaSOperatorPermissionOption {
  id: string;
  label: string;
  description: string;
  defaultForTeleconseiller: boolean;
  defaultForConsultantOperation: boolean;
}

export const SAAS_OPERATOR_PERMISSIONS: SaaSOperatorPermissionOption[] = [
  {
    id: 'assistance_abonnements',
    label: 'Gestion & Assistance Abonnements Entreprises',
    description: 'Consultation des abonnements actifs/en essai et accompagnement des souscriptions.',
    defaultForTeleconseiller: true,
    defaultForConsultantOperation: true,
  },
  {
    id: 'relance_teleconseil_wa_sms',
    label: 'Relances & Support Multi-Canal (WhatsApp / SMS / Email)',
    description: 'Envoi d’alertes d’échéance d’abonnement et assistance directe aux entreprises abonnées.',
    defaultForTeleconseiller: true,
    defaultForConsultantOperation: false,
  },
  {
    id: 'supervision_cockpit_serveur',
    label: 'Supervision Cockpit & Microservices Serveur SaaS',
    description: 'Contrôle de l’état des services Cloud, latence API et santé opérationnelle du serveur.',
    defaultForTeleconseiller: false,
    defaultForConsultantOperation: true,
  },
  {
    id: 'diagnostic_connecteurs_workflows',
    label: 'Diagnostic Connecteurs & Automatisations SaaS',
    description: 'Exécution des workflows proactifs, test des connecteurs bancaires/fiscaux et audit FX.',
    defaultForTeleconseiller: false,
    defaultForConsultantOperation: true,
  },
  {
    id: 'audit_snapshots_cloud',
    label: 'Consultation des Snapshots & Intégrité Cloud',
    description: 'Vérification des accusés de synchronisation multi-terminaux (sans accès aux données privées ERP).',
    defaultForTeleconseiller: true,
    defaultForConsultantOperation: true,
  },
];

export const ENTERPRISE_ROLES: RolePermission[] = [
  {
    id: 'super_admin',
    label: 'Super-Admin',
    functionTitle: 'Direction Générale / Propriétaire',
    rightsDescription:
      'Accès intégral à l’Application ERP de l’entreprise (Projets, Devis/Factures, Comptabilité, RH, Stock, Équipe). Aucun accès au Serveur SaaS.',
    canManageTeam: true,
    canValidateInvoices: true,
    canRecordPayments: true,
    canManageProjects: true,
  },
  {
    id: 'manager',
    label: 'Directeur / Chef de Projet',
    functionTitle: 'Direction des Opérations & Projets',
    rightsDescription:
      'Création/suivi des Projets, émission des Devis & Proformas, validation des jalons techniques. Aucun accès au Serveur SaaS.',
    canManageTeam: false,
    canValidateInvoices: true,
    canRecordPayments: false,
    canManageProjects: true,
  },
  {
    id: 'accountant',
    label: 'Responsable Financier / Comptable',
    functionTitle: 'Direction Administrative & Financière (DAF)',
    rightsDescription:
      'Validation des Factures définitives, enregistrement des paiements, exports PDF/Excel et recouvrement. Aucun accès au Serveur SaaS.',
    canManageTeam: false,
    canValidateInvoices: true,
    canRecordPayments: true,
    canManageProjects: false,
  },
  {
    id: 'collaborator',
    label: 'Collaborateur / Ingénieur d’Affaires',
    functionTitle: 'Équipe Commerciale & Technique',
    rightsDescription:
      'Préparation des Devis en mode Brouillon, mise à jour des livrables et suivi client. Aucun accès au Serveur SaaS.',
    canManageTeam: false,
    canValidateInvoices: false,
    canRecordPayments: false,
    canManageProjects: true,
  },
  {
    id: 'viewer',
    label: 'Auditeur / Contrôleur de Gestion',
    functionTitle: 'Audit Interne & Conformité',
    rightsDescription:
      'Consultation en lecture seule des tableaux de bord, factures et statistiques financières. Aucun accès au Serveur SaaS.',
    canManageTeam: false,
    canValidateInvoices: false,
    canRecordPayments: false,
    canManageProjects: false,
  },
  {
    id: 'adgensys',
    label: 'Administrateur Général des Systèmes (AdGenSys)',
    functionTitle: 'Gouvernance Générale Système & Serveur SaaS',
    rightsDescription:
      'Contrôle total sur le Serveur SaaS, ses services, tous les types de comptes, épuration des entreprises inactives, exclusivité de création des comptes MOAS, et accès complet à l’application ERP conditionné par l’ISU + Raison Sociale de l’entreprise.',
    canManageTeam: true,
    canValidateInvoices: true,
    canRecordPayments: true,
    canManageProjects: true,
    isSystemRole: true,
  },
  {
    id: 'moas',
    label: 'Manager d’Opérations et d’Assistances Serveur (MOAS)',
    functionTitle: 'Direction des Opérations & Assistances Serveur SaaS',
    rightsDescription:
      'Créé exclusivement par l’AdGenSys. Exclusivité sur la création et la gestion (activation, blocage, suppression, droits d’accès) des comptes Téléconseiller et Consultant Opération. Aucun droit d’accès à l’application ERP.',
    canManageTeam: false,
    canValidateInvoices: false,
    canRecordPayments: false,
    canManageProjects: false,
    isSystemRole: true,
  },
  {
    id: 'teleconseiller',
    label: 'Téléconseiller Serveur SaaS',
    functionTitle: 'Cellule Téléconseil & Assistance Abonnés SaaS',
    rightsDescription:
      'Créé et géré exclusivement par le MOAS selon les droits d’accès attribués sur le Serveur SaaS. Aucun droit d’accès à l’application ERP.',
    canManageTeam: false,
    canValidateInvoices: false,
    canRecordPayments: false,
    canManageProjects: false,
    isSystemRole: true,
  },
  {
    id: 'consultant_operation',
    label: 'Consultant Opération Serveur SaaS',
    functionTitle: 'Ingénierie des Opérations & Monitoring Serveur SaaS',
    rightsDescription:
      'Créé et géré exclusivement par le MOAS selon les droits d’accès attribués sur le Serveur SaaS. Aucun droit d’accès à l’application ERP.',
    canManageTeam: false,
    canValidateInvoices: false,
    canRecordPayments: false,
    canManageProjects: false,
    isSystemRole: true,
  },
];

/**
 * Génère automatiquement un Identifiant Système Unique (ISU) immuable lors de la création d'une entreprise.
 * Cet ISU, combiné à la Raison Sociale exacte (morale ou physique), est la condition obligatoire
 * permettant à l'AdGenSys d'entrer dans l'espace privé de l'entreprise en cas de nécessité.
 */
export function generateEnterpriseISU(tenantId: string, countryCode = 'CI'): string {
  const cleanCountry = (countryCode || 'CI').trim().toUpperCase().slice(0, 2);
  const year = new Date().getFullYear();
  let hash = 2166136261;
  const seed = `${tenantId}_ISU_MEP`;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const sixDigits = String(Math.abs(hash) % 900000 + 100000);
  return `ISU-${cleanCountry}-${year}-${sixDigits}`;
}

/**
 * Valide le code Administrateur Général des Systèmes (AdGenSys).
 * Format prescrit : Axxxx(Mois en-cours)-G-Sxx(Année en-cours) — Exemple : A2026-G-S10
 * Les lettres A, -G-, S (AGS) sont pré-remplies dans la zone de texte.
 */
export function validateAdGenSysCode(
  rawInput: string,
  referenceDate: Date = new Date()
): {
  isBlank: boolean;
  isValid: boolean;
  expectedExample: string;
  normalizedCode: string;
} {
  const yyyy = String(referenceDate.getFullYear());
  const yy = yyyy.slice(-2);
  const mm = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const mUnpadded = String(referenceDate.getMonth() + 1);
  const expectedExample = `A${yyyy}-G-S${mm}`;

  const cleaned = (rawInput || '').trim().toUpperCase().replace(/\s+/g, '');
  // Si la zone contient uniquement les lettres pré-prescrites "A-G-S" ou "AGS" ou est vide => non saisie
  if (!cleaned || cleaned === 'A-G-S' || cleaned === 'AGS' || cleaned === 'A--G-S') {
    return {
      isBlank: true,
      isValid: false,
      expectedExample,
      normalizedCode: 'A-G-S',
    };
  }

  // Candidats valides pour le mois et l'année en cours (ex: A2026-G-S10, A0010-G-S26, A202610-G-S26, A1026-G-S26)
  const validCandidates = new Set<string>([
    `A${yyyy}-G-S${mm}`,
    `A${yyyy}-G-S${mUnpadded}`,
    `A${yyyy}-G-S${yy}`,
    `A00${mm}-G-S${yy}`,
    `A00${mm}-G-S${yyyy}`,
    `A${mm}${yy}-G-S${yy}`,
    `A${yy}${mm}-G-S${yy}`,
    `A${yyyy}${mm}-G-S${yy}`,
    `A${yyyy}${mm}-G-S${yyyy}`,
    // Au cas où l'année est 2026 et le mois 10 (octobre) comme dans l'exemple explicite A2026-G-S10
    'A2026-G-S10',
  ]);

  const isValid = validCandidates.has(cleaned);
  return {
    isBlank: false,
    isValid,
    expectedExample,
    normalizedCode: cleaned,
  };
}

export function generateDefaultPassword(prefix = 'MEP'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part = '';
  const randomValues = new Uint32Array(6);
  window.crypto.getRandomValues(randomValues);
  for (let i = 0; i < 6; i++) {
    part += chars[randomValues[i] % chars.length];
  }
  return `${prefix}-${part}!`;
}

export interface ExclusiveAffiliationCheckParams {
  fullName?: string;
  email?: string;
  phone?: string;
  nationalIdNumber?: string;
  currentTenantId?: string;
  excludeEmployeeId?: string;
  excludeAccountId?: string;
  contractType?: 'CDI' | 'CDD' | 'Temporaire / Journalier' | string;
  allowSameSuperAdminNetwork?: boolean;
}

export interface ExclusiveAffiliationResult {
  conflict: boolean;
  reason?: string;
  existingCompanyName?: string;
  existingRoleOrPosition?: string;
}

export interface NetworkEnterpriseNode {
  tenantId: string;
  companyName: string;
  sector?: string;
  countryName?: string;
  ownerName?: string;
  ownerEmail?: string;
}

function normalizePhoneDigits(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 7 ? digits.slice(-8) : digits;
}

export function isRealCreatedEnterpriseName(rawName?: string, tenantId?: string): boolean {
  if (!rawName || typeof rawName !== 'string') return false;
  const cleaned = rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  if (!cleaned || cleaned.length < 2) return false;
  if (tenantId) {
    const tClean = String(tenantId).trim();
    if (!tClean || tClean === 'default_tenant' || tClean.startsWith('system_')) {
      return false;
    }
    const tUpper = tClean.toUpperCase();
    if (
      cleaned === tUpper ||
      cleaned === `ENTREPRISE ${tUpper}` ||
      cleaned === `ENTREPRISE (${tUpper})` ||
      cleaned === `ENTREPRISE (${tUpper.slice(0, 10)})` ||
      cleaned === `ENTREPRISE (${tUpper.slice(0, 12)})`
    ) {
      return false;
    }
  }
  const placeholderPatterns = [
    /^ENTREPRISE\s+TENANT_/i,
    /^ENTREPRISE\s*\(TENANT_/i,
    /^ENTREPRISE\s+DEFAULT/i,
    /^ENTREPRISE\s+PRINCIPALE$/i,
    /^MON\s+ENTREPRISE$/i,
    /^ENTREPRISE$/i,
    /^DIRECTION\s+GENERALE$/i,
    /^GOUVERNANCE\b/i,
    /^SYSTEME\b/i,
    /^OPERATEUR\b/i,
  ];
  if (placeholderPatterns.some((rx) => rx.test(cleaned))) {
    return false;
  }
  return true;
}

export function normalizeEnterpriseNameKey(rawName?: string): string {
  return String(rawName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Retourne le réseau d'entreprises appartenant au même Super-Admin (propriétaire).
 * Un Super-Admin peut être propriétaire de plusieurs entreprises et muter/affecter
 * ses employés librement au sein de son réseau d'entreprises.
 * Ne retourne que les entreprises réellement créées et sans aucun doublon.
 */
export function getSuperAdminEnterpriseNetwork(
  currentTenantId?: string,
  ownerEmail?: string,
  ownerFullName?: string
): NetworkEnterpriseNode[] {
  try {
    const rawRegistry = localStorage.getItem('mep_enterprise_registry_v3');
    const registryMap: Record<
      string,
      {
        companyName?: string;
        activitySector?: string;
        sector?: string;
        countryName?: string;
        country?: string;
        ownerEmail?: string;
        ownerSuperAdminEmail?: string;
        ownerAccountId?: string;
        ownerSuperAdminId?: string;
        ownerName?: string;
        representativeName?: string;
        email?: string;
      }
    > = rawRegistry ? JSON.parse(rawRegistry) : {};

    const rawAccounts = localStorage.getItem('mep_enterprise_accounts_v3');
    const accounts: Array<{
      id: string;
      tenantId: string;
      primaryTenantId?: string;
      fullName: string;
      phoneNumber: string;
      email: string;
      role: string;
      contractTerminated?: boolean;
    }> = rawAccounts ? JSON.parse(rawAccounts) : [];

    // Identify the Super-Admin owner of currentTenantId
    const currentSuperAdmin = accounts.find(
      (a) =>
        (a.tenantId === currentTenantId || a.primaryTenantId === currentTenantId) &&
        a.role === 'super_admin'
    );
    const targetEmail = (ownerEmail || currentSuperAdmin?.email || '').trim().toLowerCase();
    const targetAccountId = currentSuperAdmin?.id || '';
    const targetName = (ownerFullName || currentSuperAdmin?.fullName || '').trim().toUpperCase();

    const networkTenants = new Set<string>();
    if (currentTenantId && currentTenantId !== 'default_tenant' && !currentTenantId.startsWith('system_')) {
      networkTenants.add(currentTenantId);
    }

    // Also check explicit Super-Admin multi-enterprise network list
    try {
      const rawNet = localStorage.getItem('mep_super_admin_enterprise_network_v1');
      if (rawNet) {
        const parsedNet = JSON.parse(rawNet);
        if (Array.isArray(parsedNet)) {
          for (const node of parsedNet) {
            if (!node || typeof node !== 'object') continue;
            const nTid = String(node.tenantId || '').trim();
            if (!nTid || nTid === 'default_tenant' || nTid.startsWith('system_')) continue;
            const nEmail = String(node.ownerEmail || node.ownerSuperAdminEmail || '').trim().toLowerCase();
            const nOwnerId = String(node.ownerAccountId || node.ownerSuperAdminId || '').trim();
            if (
              (targetAccountId && nOwnerId && nOwnerId === targetAccountId) ||
              (targetEmail && nEmail && nEmail === targetEmail)
            ) {
              networkTenants.add(nTid);
            }
          }
        }
      }
    } catch {
      // ignore
    }

    // Strictly link enterprises only when owned by the exact same verified Super-Admin
    if ((targetEmail && targetEmail !== 'admin@entreprise.com') || targetAccountId) {
      for (const acc of accounts) {
        if (acc.role !== 'super_admin' || acc.contractTerminated) continue;
        const eMatch = targetEmail && acc.email && acc.email.trim().toLowerCase() === targetEmail;
        const idMatch = targetAccountId && acc.id === targetAccountId;
        if (eMatch || idMatch) {
          if (acc.tenantId && acc.tenantId !== 'default_tenant' && !acc.tenantId.startsWith('system_')) {
            networkTenants.add(acc.tenantId);
          }
          if (
            acc.primaryTenantId &&
            acc.primaryTenantId !== 'default_tenant' &&
            !acc.primaryTenantId.startsWith('system_')
          ) {
            networkTenants.add(acc.primaryTenantId);
          }
        }
      }

      for (const [tId, meta] of Object.entries(registryMap)) {
        if (!tId || tId === 'default_tenant' || tId.startsWith('system_') || !meta) continue;
        const mEmail = (meta.ownerEmail || meta.ownerSuperAdminEmail || meta.email || '').trim().toLowerCase();
        const mOwnerId = (meta.ownerAccountId || meta.ownerSuperAdminId || '').trim();
        if (
          (targetAccountId && mOwnerId && mOwnerId === targetAccountId) ||
          (targetEmail && mEmail && mEmail === targetEmail)
        ) {
          networkTenants.add(tId);
        }
      }
    }

    const result: NetworkEnterpriseNode[] = [];
    const seenNames = new Set<string>();

    for (const tId of networkTenants) {
      const meta = registryMap[tId];
      const adminAcc = accounts.find((a) => a.tenantId === tId && a.role === 'super_admin');
      let companyLabel = meta?.companyName;
      let sectorLabel = meta?.activitySector || meta?.sector;
      let countryLabel = meta?.countryName || meta?.country;
      if (!companyLabel) {
        try {
          const rawEnt = localStorage.getItem(`mep_${tId}_enterprise_details`);
          if (rawEnt) {
            const parsed = JSON.parse(rawEnt);
            companyLabel = parsed.companyName;
            sectorLabel = sectorLabel || parsed.activitySector || parsed.sector;
            countryLabel = countryLabel || parsed.countryName || parsed.country;
          }
        } catch {
          // ignore
        }
      }

      // Reject synthetic account-name fallbacks ("ENTREPRISE FULLNAME") and unconfigured placeholders
      if (!isRealCreatedEnterpriseName(companyLabel, tId)) {
        continue;
      }
      if (
        adminAcc?.fullName &&
        normalizeEnterpriseNameKey(companyLabel) ===
          normalizeEnterpriseNameKey(`ENTREPRISE ${adminAcc.fullName}`)
      ) {
        continue;
      }

      const normName = normalizeEnterpriseNameKey(companyLabel);
      if (seenNames.has(normName)) {
        continue;
      }
      seenNames.add(normName);

      result.push({
        tenantId: tId,
        companyName: companyLabel!.trim().toUpperCase(),
        sector: sectorLabel || 'Prestation de Services',
        countryName: countryLabel || '',
        ownerName:
          adminAcc?.fullName || meta?.ownerName || meta?.representativeName || targetName,
        ownerEmail:
          adminAcc?.email || meta?.ownerEmail || meta?.ownerSuperAdminEmail || targetEmail,
      });
    }
    return result;
  } catch {
    return [];
  }
}

/**
 * Vérifie les règles d'appartenance aux entreprises tout en préservant strictement
 * la confidentialité des autres entreprises abonnées (aucun nom d'entreprise tierce ni poste interne divulgué) :
 * 1. Un Super-Admin PEUT être propriétaire de plusieurs entreprises (Réseau d'entreprises du Super-Admin).
 * 2. Les affectations et mutations inter-entreprises sont permises pour ses employés UNIQUEMENT dans son réseau d'entreprises.
 * 3. Les employés temporaires ('Temporaire / Journalier') peuvent être employés par plusieurs entreprises.
 * 4. En dehors du réseau du même Super-Admin, un employé CDI/CDD ne peut appartenir à une nouvelle entreprise qu'après cessation de contrat.
 */
export function checkExclusiveEnterpriseAffiliation(
  params: ExclusiveAffiliationCheckParams
): ExclusiveAffiliationResult {
  const cleanName = (params.fullName || '').trim().toUpperCase();
  const cleanEmail = (params.email || '').trim().toLowerCase();
  const cleanPhone = normalizePhoneDigits(params.phone);
  const cleanNatId = (params.nationalIdNumber || '').trim().toUpperCase();
  const isCandidateTemporary = params.contractType === 'Temporaire / Journalier';
  const isCreatingSuperAdminAccount = !params.currentTenantId;

  try {
    const rawRegistry = localStorage.getItem('mep_enterprise_registry_v3');
    const registryMap: Record<string, { companyName?: string; contractTerminated?: boolean }> =
      rawRegistry ? JSON.parse(rawRegistry) : {};

    const getOwnEnterpriseLabel = (tenantId: string) =>
      registryMap[tenantId]?.companyName || `Entreprise (${tenantId.slice(0, 12)})`;

    // Réseau d'entreprises du Super-Admin courant
    const currentNetwork = params.currentTenantId
      ? getSuperAdminEnterpriseNetwork(params.currentTenantId)
      : [];
    const networkTenantIds = new Set(currentNetwork.map((n) => n.tenantId));

    // 1. Check all Super-Admin & Collaborator Accounts across enterprises
    const rawAccounts = localStorage.getItem('mep_enterprise_accounts_v3');
    const accounts: Array<{
      id: string;
      tenantId: string;
      fullName: string;
      phoneNumber: string;
      email: string;
      role: string;
      functionTitle: string;
      contractTerminated?: boolean;
    }> = rawAccounts ? JSON.parse(rawAccounts) : [];

    for (const acc of accounts) {
      if (params.excludeAccountId && acc.id === params.excludeAccountId) continue;
      if (acc.contractTerminated === true) continue;

      const isDifferentEnterprise = !params.currentTenantId || acc.tenantId !== params.currentTenantId;

      if (isDifferentEnterprise) {
        const accEmail = (acc.email || '').trim().toLowerCase();
        const accPhone = normalizePhoneDigits(acc.phoneNumber);

        const emailMatch = cleanEmail && accEmail && cleanEmail === accEmail;
        const phoneMatch =
          cleanPhone &&
          accPhone &&
          cleanPhone.length >= 7 &&
          cleanPhone !== '00000000' &&
          cleanPhone === accPhone;

        if (emailMatch || phoneMatch) {
          // RÈGLE : Un Super-Admin peut être propriétaire de plusieurs entreprises !
          if (isCreatingSuperAdminAccount && acc.role === 'super_admin') {
            continue;
          }
          // Si l'autre entreprise appartient au même réseau Super-Admin et que la mobilité réseau est permise
          if (params.allowSameSuperAdminNetwork && networkTenantIds.has(acc.tenantId)) {
            continue;
          }

          return {
            conflict: true,
            existingCompanyName: 'Espace Entreprise Externe (Confidentiel)',
            existingRoleOrPosition: 'Engagement Contractuel Actif',
            reason:
              "Clause d'exclusivité contractuelle : Cet identifiant (E-mail ou Téléphone) est déjà rattaché à un contrat actif au sein d'un autre espace entreprise. Par respect de la confidentialité inter-entreprises, aucune donnée de l'entreprise tierce n'est divulguée.",
          };
        }
      }
    }

    // 2. Check all Employee Registries across all enterprises in localStorage (mep_<tenantId>_employees)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        !key ||
        !key.startsWith('mep_') ||
        key.startsWith('mep_backup_') ||
        (!key.endsWith('_employees') && !key.endsWith('_erp_employees'))
      ) {
        continue;
      }

      const tenantId = key
        .replace(/^mep_/, '')
        .replace(/_erp_employees$/, '')
        .replace(/_employees$/, '');
      if (!tenantId || tenantId === 'default_tenant') continue;

      const rawEmps = localStorage.getItem(key);
      if (!rawEmps) continue;

      const empList: Array<{
        id: string;
        tenantId?: string;
        matricule: string;
        fullName: string;
        email: string;
        phone: string;
        nationalIdNumber: string;
        position: string;
        workerCategory: string;
        contractType?: string;
        status: 'active' | 'on_leave' | 'terminated';
      }> = JSON.parse(rawEmps);

      for (const emp of empList) {
        if (params.excludeEmployeeId && emp.id === params.excludeEmployeeId) continue;
        if (emp.status === 'terminated') continue;
        if (emp.tenantId && emp.tenantId !== tenantId) continue;

        const isSameEnterprise = Boolean(params.currentTenantId && tenantId === params.currentTenantId);
        const isExistingTemporary = emp.contractType === 'Temporaire / Journalier';
        const isInSameSuperAdminNetwork = networkTenantIds.has(tenantId);

        // Les employés temporaires peuvent être employés simultanément par plusieurs entreprises différentes
        if (!isSameEnterprise && isCandidateTemporary && isExistingTemporary) {
          continue;
        }

        // Les affectations et mutations inter-entreprises sont permises dans le réseau d'entreprises du même Super-Admin
        if (!isSameEnterprise && isInSameSuperAdminNetwork && params.allowSameSuperAdminNetwork) {
          continue;
        }

        const empEmail = (emp.email || '').trim().toLowerCase();
        const empName = (emp.fullName || '').trim().toUpperCase();
        const empPhone = normalizePhoneDigits(emp.phone);
        const empNatId = (emp.nationalIdNumber || '').trim().toUpperCase();

        const emailMatch = cleanEmail && empEmail && cleanEmail === empEmail;
        const phoneMatch =
          cleanPhone &&
          empPhone &&
          cleanPhone.length >= 7 &&
          cleanPhone !== '00000000' &&
          cleanPhone === empPhone;
        const natIdMatch = cleanNatId && empNatId && cleanNatId.length >= 4 && cleanNatId === empNatId;
        const nameMatch = isSameEnterprise && cleanName && empName && cleanName.length >= 4 && cleanName === empName;

        if (emailMatch || phoneMatch || natIdMatch || nameMatch) {
          if (isSameEnterprise) {
            const ownLabel = getOwnEnterpriseLabel(tenantId);
            return {
              conflict: true,
              existingCompanyName: ownLabel,
              existingRoleOrPosition: `${emp.workerCategory} — ${emp.position}`,
              reason: `Cet employé (${emp.fullName} · Matricule ${emp.matricule}) possède déjà une fiche active dans votre entreprise.`,
            };
          }
          if (isInSameSuperAdminNetwork) {
            continue;
          }
          return {
            conflict: true,
            existingCompanyName: 'Espace Entreprise Externe (Confidentiel)',
            existingRoleOrPosition: 'Contrat Exclusif Actif',
            reason:
              "Clause d'exclusivité contractuelle : Cet identifiant est actuellement sous contrat CDI/CDD actif au sein d'un autre espace privé. Conformément à la politique de confidentialité multi-tenant, l'identité de l'entreprise tierce est protégée.",
          };
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }

  return { conflict: false };
}

/**
 * Extrait automatiquement la couleur dominante principale d'un logo d'entreprise (Data URL)
 * afin d'harmoniser tous les documents imprimables aux couleurs du logo de l'entreprise.
 */
export function extractBrandColorFromLogo(logoDataUrl?: string): Promise<string> {
  return new Promise((resolve) => {
    if (!logoDataUrl || !logoDataUrl.startsWith('data:image/')) {
      resolve('#0F172A');
      return;
    }
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('#0F172A');
            return;
          }
          canvas.width = 48;
          canvas.height = 48;
          ctx.drawImage(img, 0, 0, 48, 48);
          const data = ctx.getImageData(0, 0, 48, 48).data;
          let rSum = 0;
          let gSum = 0;
          let bSum = 0;
          let count = 0;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            // Ignore transparent, near-white, or near-black background pixels
            if (a < 128) continue;
            if (r > 235 && g > 235 && b > 235) continue;
            if (r < 15 && g < 15 && b < 15) continue;
            rSum += r;
            gSum += g;
            bSum += b;
            count++;
          }

          if (count === 0) {
            resolve('#1E3A8A');
            return;
          }

          // Slightly darken the average color so white text on top has high WCAG contrast
          const avgR = Math.max(12, Math.min(180, Math.round((rSum / count) * 0.78)));
          const avgG = Math.max(18, Math.min(180, Math.round((gSum / count) * 0.78)));
          const avgB = Math.max(28, Math.min(200, Math.round((bSum / count) * 0.78)));

          const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
          resolve(`#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`);
        } catch {
          resolve('#0F172A');
        }
      };
      img.onerror = () => resolve('#0F172A');
      img.src = logoDataUrl;
    } catch {
      resolve('#0F172A');
    }
  });
}

export interface CountryTaxOrDutyDefinition {
  id: string;
  code: string;
  label: string;
  category: 'indirect_tax' | 'withholding_tax' | 'corporate_levy' | 'local_tax';
  ratePct: number;
  sign: 'add' | 'deduct';
  legalReference: string;
  description: string;
  defaultIncludeInDoc?: boolean;
  defaultDisplayOnDoc?: boolean;
}

export interface ChartOfAccountsEntry {
  accountNumber: string;
  label: string;
  nature: string;
}

export interface ChartOfAccountsClass {
  classNumber: string;
  title: string;
  mainAccounts: ChartOfAccountsEntry[];
}

export interface CountryFiscalAndAccountingFramework {
  countryCode: string;
  accountingStandardName: string;
  accountingStandardCode: 'SYSCOHADA_REVISE' | 'PCG_FRANCE' | 'IFRS_INTL' | 'US_GAAP';
  fiscalLawTitle: string;
  fiscalYearSummary: string;
  corporateTaxStandardRatePct: number;
  minimumFlatTaxLabel: string;
  minimumFlatTaxRatePct: number;
  socialSecurityBody: string;
  chartOfAccounts: ChartOfAccountsClass[];
  additionalTaxesAndDuties: CountryTaxOrDutyDefinition[];
}

export const SYSCOHADA_CHART_OF_ACCOUNTS: ChartOfAccountsClass[] = [
  {
    classNumber: 'Classe 1',
    title: 'Comptes de ressources durables (Capitaux propres & Dettes financières)',
    mainAccounts: [
      { accountNumber: '101', label: 'Capital social', nature: 'Passif / Capitaux propres' },
      { accountNumber: '111', label: 'Réserve légale', nature: 'Passif / Réserves' },
      { accountNumber: '121', label: 'Report à nouveau créditeur', nature: 'Passif / Capitaux' },
      { accountNumber: '131', label: 'Résultat net : Bénéfice', nature: 'Passif / Résultat' },
      { accountNumber: '162', label: 'Emprunts et dettes auprès des établissements de crédit', nature: 'Passif / Dettes financières' },
    ],
  },
  {
    classNumber: 'Classe 2',
    title: 'Comptes d’actif immobilisé (Immobilisations incorporelles, corporelles et financières)',
    mainAccounts: [
      { accountNumber: '213', label: 'Logiciels et sites internet (ERP / Licences)', nature: 'Actif immobilisé' },
      { accountNumber: '222', label: 'Terrains nus et aménagés de chantier', nature: 'Actif immobilisé' },
      { accountNumber: '231', label: 'Bâtiments industriels, ateliers et bureaux', nature: 'Actif immobilisé' },
      { accountNumber: '241', label: 'Matériel et outillage industriel et de chantier', nature: 'Actif immobilisé' },
      { accountNumber: '245', label: 'Matériel de transport et engins BTP', nature: 'Actif immobilisé' },
      { accountNumber: '284', label: 'Amortissements du matériel et outillage', nature: 'Amortissement' },
    ],
  },
  {
    classNumber: 'Classe 3',
    title: 'Comptes de stocks et en-cours de production / chantiers',
    mainAccounts: [
      { accountNumber: '311', label: 'Marchandises et matériaux de négoce', nature: 'Actif circulant' },
      { accountNumber: '321', label: 'Matières premières et fournitures liées (Ciment, Acier, Câbles)', nature: 'Actif circulant' },
      { accountNumber: '331', label: 'Matières consommables de chantier (Carburant, EPI)', nature: 'Actif circulant' },
      { accountNumber: '341', label: 'Produits et travaux en cours d’exécution', nature: 'En-cours' },
      { accountNumber: '351', label: 'Services et études techniques en cours', nature: 'En-cours' },
    ],
  },
  {
    classNumber: 'Classe 4',
    title: 'Comptes de tiers (Fournisseurs, Clients, Personnel, État & Fiscalité)',
    mainAccounts: [
      { accountNumber: '401', label: 'Fournisseurs, dettes en compte', nature: 'Passif circulant' },
      { accountNumber: '404', label: 'Fournisseurs d’investissements et d’équipements', nature: 'Passif circulant' },
      { accountNumber: '411', label: 'Clients (Facturations de situations et décomptes)', nature: 'Actif circulant' },
      { accountNumber: '412', label: 'Clients - Retenues de garantie sur marchés et chantiers', nature: 'Actif circulant' },
      { accountNumber: '4191', label: 'Clients, avances et acomptes reçus sur commandes', nature: 'Passif circulant' },
      { accountNumber: '422', label: 'Personnel, rémunérations dues (Salaires nets à payer)', nature: 'Passif / RH' },
      { accountNumber: '431', label: 'Sécurité sociale et organismes sociaux (CNPS / CSS / IPRES)', nature: 'Passif social' },
      { accountNumber: '441', label: 'État, Impôt sur les bénéfices (IS / BIC / IMF)', nature: 'Passif fiscal' },
      { accountNumber: '442', label: 'État, autres impôts et taxes (Patente, TSE, Centimes)', nature: 'Passif fiscal' },
      { accountNumber: '443', label: 'État, TVA facturée sur travaux et prestations', nature: 'Passif fiscal' },
      { accountNumber: '445', label: 'État, TVA récupérable sur achats et immobilisations', nature: 'Actif fiscal' },
      { accountNumber: '447', label: 'État, impôts retenus à la source (ITS, AIRSI, BRS, BNC, TSR)', nature: 'Passif fiscal' },
    ],
  },
  {
    classNumber: 'Classe 5',
    title: 'Comptes de trésorerie (Banques, Établissements financiers, Caisses, Mobile Money)',
    mainAccounts: [
      { accountNumber: '521', label: 'Banques locales (Comptes courants d’exploitation)', nature: 'Trésorerie Actif' },
      { accountNumber: '552', label: 'Monnaie électronique / Mobile Money (Wave, Orange, MTN)', nature: 'Trésorerie Actif' },
      { accountNumber: '571', label: 'Caisse siège social et caisses menues dépenses chantier', nature: 'Trésorerie Actif' },
    ],
  },
  {
    classNumber: 'Classe 6',
    title: 'Comptes de charges des activités ordinaires (Achats, Sous-traitance, Impôts, Salaires)',
    mainAccounts: [
      { accountNumber: '601', label: 'Achats de marchandises et équipements facturés', nature: 'Charge directe' },
      { accountNumber: '602', label: 'Achats de matières premières et matériaux de chantier', nature: 'Charge directe' },
      { accountNumber: '605', label: 'Autres achats (Eau, Électricité, Carburant, Petit outillage)', nature: 'Charge d’exploitation' },
      { accountNumber: '611', label: 'Transports sur achats et logistique d’approvisionnement', nature: 'Charge logistique' },
      { accountNumber: '621', label: 'Sous-traitance générale et spécialisée par corps d’état', nature: 'Charge opérationnelle' },
      { accountNumber: '622', label: 'Locations d’engins, grues, échafaudages et locaux', nature: 'Charge opérationnelle' },
      { accountNumber: '632', label: 'Rémunérations d’intermédiaires, bureaux d’études et conseils', nature: 'Charge externe' },
      { accountNumber: '641', label: 'Impôts et taxes directs (Contribution des patentes, Taxes foncières)', nature: 'Charge fiscale' },
      { accountNumber: '646', label: 'Droits d’enregistrement et timbres sur marchés publics/privés', nature: 'Charge fiscale' },
      { accountNumber: '661', label: 'Rémunérations directes versées au personnel national', nature: 'Masse salariale' },
      { accountNumber: '664', label: 'Charges sociales patronales (Prestations familiales, AT/MP, Retraite)', nature: 'Masse salariale' },
      { accountNumber: '681', label: 'Dotations aux amortissements d’exploitation', nature: 'Charge calculée' },
    ],
  },
  {
    classNumber: 'Classe 7',
    title: 'Comptes de produits des activités ordinaires (Ventes, Travaux, Prestations)',
    mainAccounts: [
      { accountNumber: '701', label: 'Ventes de marchandises et fournitures d’équipements', nature: 'Produit / Chiffre d’affaires' },
      { accountNumber: '704', label: 'Ventes de travaux (BTP, Génie civil, Électricité, Hydraulique)', nature: 'Produit / Chiffre d’affaires' },
      { accountNumber: '706', label: 'Services vendus et prestations d’ingénierie / maîtrise d’œuvre', nature: 'Produit / Chiffre d’affaires' },
      { accountNumber: '707', label: 'Produits accessoires (Frais de dossier, locations d’équipements)', nature: 'Produit accessoire' },
    ],
  },
  {
    classNumber: 'Classe 8',
    title: 'Comptes des autres charges et des autres produits (HAO & Impôt sur le résultat)',
    mainAccounts: [
      { accountNumber: '812', label: 'Valeurs comptables des cessions d’immobilisations', nature: 'Charge HAO' },
      { accountNumber: '822', label: 'Produits des cessions d’immobilisations', nature: 'Produit HAO' },
      { accountNumber: '891', label: 'Impôts sur les bénéfices de l’exercice (IS / BIC)', nature: 'Impôt société' },
      { accountNumber: '895', label: 'Impôt Minimum Forfaitaire (IMF)', nature: 'Impôt minimum' },
    ],
  },
];

export const PCG_FRANCE_CHART_OF_ACCOUNTS: ChartOfAccountsClass[] = [
  {
    classNumber: 'Classe 1',
    title: 'Comptes de capitaux (Capitaux propres, provisions, emprunts)',
    mainAccounts: [
      { accountNumber: '101', label: 'Capital social', nature: 'Capitaux propres' },
      { accountNumber: '106', label: 'Réserves (légale, statutaire, réglementée)', nature: 'Capitaux propres' },
      { accountNumber: '120', label: 'Résultat de l’exercice (Bénéfice)', nature: 'Capitaux propres' },
      { accountNumber: '164', label: 'Emprunts auprès des établissements de crédit', nature: 'Dettes financières' },
    ],
  },
  {
    classNumber: 'Classe 2',
    title: 'Comptes d’immobilisations',
    mainAccounts: [
      { accountNumber: '205', label: 'Concessions, brevets, licences, logiciels', nature: 'Actif immobilisé' },
      { accountNumber: '213', label: 'Constructions et agencements', nature: 'Actif immobilisé' },
      { accountNumber: '215', label: 'Installations techniques, matériels et outillage industriels', nature: 'Actif immobilisé' },
      { accountNumber: '2182', label: 'Matériel de transport', nature: 'Actif immobilisé' },
    ],
  },
  {
    classNumber: 'Classe 4',
    title: 'Comptes de tiers (Fournisseurs, Clients, Personnel, État)',
    mainAccounts: [
      { accountNumber: '401', label: 'Fournisseurs d’exploitation', nature: 'Passif circulant' },
      { accountNumber: '411', label: 'Clients et comptes rattachés', nature: 'Actif circulant' },
      { accountNumber: '421', label: 'Personnel - Rémunérations dues', nature: 'Passif social' },
      { accountNumber: '431', label: 'Sécurité sociale (URSSAF)', nature: 'Passif social' },
      { accountNumber: '444', label: 'État - Impôts sur les bénéfices (IS)', nature: 'Passif fiscal' },
      { accountNumber: '44566', label: 'TVA déductible sur autres biens et services', nature: 'Actif fiscal' },
      { accountNumber: '44571', label: 'TVA collectée', nature: 'Passif fiscal' },
      { accountNumber: '4421', label: 'Prélèvements à la source (PAS / Retenues)', nature: 'Passif fiscal' },
    ],
  },
  {
    classNumber: 'Classe 5',
    title: 'Comptes financiers (Banques, Caisse)',
    mainAccounts: [
      { accountNumber: '512', label: 'Banques comptes courants', nature: 'Trésorerie' },
      { accountNumber: '530', label: 'Caisse', nature: 'Trésorerie' },
    ],
  },
  {
    classNumber: 'Classe 6',
    title: 'Comptes de charges',
    mainAccounts: [
      { accountNumber: '601', label: 'Achats stockés - Matières premières et fournitures', nature: 'Charge directe' },
      { accountNumber: '604', label: 'Achats d’études et prestations de services / Sous-traitance', nature: 'Charge directe' },
      { accountNumber: '613', label: 'Locations mobilières et immobilières', nature: 'Charge externe' },
      { accountNumber: '635', label: 'Autres impôts, taxes et versements assimilés (CET, CFE, CVAE)', nature: 'Charge fiscale' },
      { accountNumber: '641', label: 'Rémunérations du personnel', nature: 'Masse salariale' },
      { accountNumber: '645', label: 'Charges de sécurité sociale et de prévoyance', nature: 'Masse salariale' },
      { accountNumber: '695', label: 'Impôts sur les bénéfices (IS)', nature: 'Impôt société' },
    ],
  },
  {
    classNumber: 'Classe 7',
    title: 'Comptes de produits',
    mainAccounts: [
      { accountNumber: '704', label: 'Travaux et réalisations de projets', nature: 'Chiffre d’affaires' },
      { accountNumber: '706', label: 'Prestations de services et ingénierie', nature: 'Chiffre d’affaires' },
      { accountNumber: '707', label: 'Ventes de marchandises et matériels', nature: 'Chiffre d’affaires' },
    ],
  },
];

const OHADA_COUNTRIES = new Set([
  'CI', 'SN', 'CM', 'BF', 'ML', 'TG', 'BJ', 'NE', 'GA', 'CG', 'CD', 'TD', 'CF', 'GN', 'GQ', 'KM', 'GW'
]);

const EUROPE_PCG_COUNTRIES = new Set(['FR', 'BE', 'LU', 'MC', 'CH', 'MA', 'TN', 'DZ']);

export function getCountryFiscalAndAccountingFramework(countryCode?: string): CountryFiscalAndAccountingFramework {
  const code = (countryCode || 'CI').toUpperCase().trim();
  const country = getCountryByCode(code);
  const countryName = country?.name || 'Côte d’Ivoire';

  if (code === 'CI') {
    return {
      countryCode: 'CI',
      accountingStandardName: 'Acte Uniforme OHADA — SYSCOHADA Révisé',
      accountingStandardCode: 'SYSCOHADA_REVISE',
      fiscalLawTitle: 'Code Général des Impôts (CGI) de Côte d’Ivoire & Annexe Fiscale en vigueur (DGI)',
      fiscalYearSummary: 'Exercice fiscal du 1er Janvier au 31 Décembre. Déclarations mensuelles TVA/TSE/AIRSI/ITS avant le 15 du mois suivant.',
      corporateTaxStandardRatePct: 25,
      minimumFlatTaxLabel: 'Impôt Minimum Forfaitaire (IMF)',
      minimumFlatTaxRatePct: 0.5,
      socialSecurityBody: 'CNPS (Caisse Nationale de Prévoyance Sociale) & CMU',
      chartOfAccounts: SYSCOHADA_CHART_OF_ACCOUNTS,
      additionalTaxesAndDuties: [
        {
          id: 'tax-ci-airsi',
          code: 'AIRSI',
          label: 'AIRSI (Acompte d’Impôt sur le Revenu du Secteur Informel / Prestations)',
          category: 'withholding_tax',
          ratePct: 7.5,
          sign: 'deduct',
          legalReference: 'Art. 60 & suivants CGI Côte d’Ivoire / Loi de Finances',
          description: 'Prélèvement à la source applicable aux paiements de prestations et fournitures selon le régime fiscal.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: true,
        },
        {
          id: 'tax-ci-bnc-brs',
          code: 'BNC-RET',
          label: 'Retenue à la source sur Prestations / BNC & Sous-traitance (7,5%)',
          category: 'withholding_tax',
          ratePct: 7.5,
          sign: 'deduct',
          legalReference: 'Art. 92 & 93 du Code Général des Impôts (DGI CI)',
          description: 'Retenue fiscale à la source opérée sur les honoraires, études techniques et prestations de sous-traitance.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: true,
        },
        {
          id: 'tax-ci-tse',
          code: 'TSE',
          label: 'Taxe Spéciale d’Équipement (TSE — 0,1% sur CA HT)',
          category: 'indirect_tax',
          ratePct: 0.1,
          sign: 'add',
          legalReference: 'Art. 1084 CGI Côte d’Ivoire',
          description: 'Taxe parafiscale assise sur le chiffre d’affaires hors taxes pour le financement des équipements publics.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: true,
        },
        {
          id: 'tax-ci-garantie',
          code: 'RG-BTP',
          label: 'Retenue de Garantie Marché / Chantier (5%)',
          category: 'withholding_tax',
          ratePct: 5,
          sign: 'deduct',
          legalReference: 'Code des Marchés Publics & Norme BTP OHADA',
          description: 'Retenue de bonne exécution conservée jusqu’à la réception définitive après levée des réserves.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: true,
        },
        {
          id: 'tax-ci-patente',
          code: 'PATENTE-PRORATA',
          label: 'Quote-part Contribution des Patentes & Licence (0,5% sur CA)',
          category: 'local_tax',
          ratePct: 0.5,
          sign: 'add',
          legalReference: 'Art. 264 à 299 CGI Côte d’Ivoire',
          description: 'Droit sur le chiffre d’affaires au titre de la Contribution des Patentes d’exploitation.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: false,
        },
        {
          id: 'tax-ci-fdfp',
          code: 'FDFP-ITS',
          label: 'Taxe d’Apprentissage & Formation Professionnelle Continue (FDFP 1,6%)',
          category: 'corporate_levy',
          ratePct: 1.6,
          sign: 'add',
          legalReference: 'Code FDFP / Fiscalité sur les Salaires (0,4% TA + 1,2% FPC)',
          description: 'Prélèvement légal assis sur la masse salariale et la main d’œuvre mobilisée.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: false,
        },
      ],
    };
  }

  if (code === 'SN') {
    return {
      countryCode: 'SN',
      accountingStandardName: 'Acte Uniforme OHADA — SYSCOHADA Révisé',
      accountingStandardCode: 'SYSCOHADA_REVISE',
      fiscalLawTitle: 'Code Général des Impôts du Sénégal (DGID — Loi de Finances en vigueur)',
      fiscalYearSummary: 'Exercice fiscal du 1er Janvier au 31 Décembre. Déclarations mensuelles TVA, BRS et VRS.',
      corporateTaxStandardRatePct: 30,
      minimumFlatTaxLabel: 'Impôt Minimum Forfaitaire (IMF)',
      minimumFlatTaxRatePct: 0.5,
      socialSecurityBody: 'CSS (Caisse de Sécurité Sociale) & IPRES',
      chartOfAccounts: SYSCOHADA_CHART_OF_ACCOUNTS,
      additionalTaxesAndDuties: [
        {
          id: 'tax-sn-brs',
          code: 'BRS',
          label: 'Retenue à la source sur Prestations de Services (BRS — 5%)',
          category: 'withholding_tax',
          ratePct: 5,
          sign: 'deduct',
          legalReference: 'Art. 200 du Code Général des Impôts du Sénégal (DGID)',
          description: 'Prélèvement libératoire ou acompte retenu à la source de 5% sur les sommes versées aux prestataires.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: true,
        },
        {
          id: 'tax-sn-cofi',
          code: 'CFCE',
          label: 'Contribution Forfaitaire à la Charge des Employeurs (CFCE — 3%)',
          category: 'corporate_levy',
          ratePct: 3,
          sign: 'add',
          legalReference: 'Art. 243 CGI Sénégal',
          description: 'Contribution fiscale assise sur les rémunérations et la main d’œuvre.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: false,
        },
        {
          id: 'tax-sn-garantie',
          code: 'RG-BTP',
          label: 'Retenue de Garantie Chantier / Marché (5%)',
          category: 'withholding_tax',
          ratePct: 5,
          sign: 'deduct',
          legalReference: 'Code des Marchés Publics du Sénégal',
          description: 'Retenue contractuelle de garantie sur décomptes de travaux.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: true,
        },
        {
          id: 'tax-sn-cel',
          code: 'CEL-VA',
          label: 'Contribution Économique Locale (CEL — 0,5%)',
          category: 'local_tax',
          ratePct: 0.5,
          sign: 'add',
          legalReference: 'Art. 320 CGI Sénégal',
          description: 'Fiscalité locale remplaçant la patente sur la valeur ajoutée et les locaux.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: false,
        },
      ],
    };
  }

  if (code === 'CM') {
    return {
      countryCode: 'CM',
      accountingStandardName: 'Acte Uniforme OHADA — SYSCOHADA Révisé (Zone CEMAC)',
      accountingStandardCode: 'SYSCOHADA_REVISE',
      fiscalLawTitle: 'Code Général des Impôts du Cameroun (DGI — Loi de Finances en vigueur)',
      fiscalYearSummary: 'Exercice fiscal du 1er Janvier au 31 Décembre. TVA à 17,5% + Centimes Additionnels Communaux (CAC 10% de la TVA, soit 1,75% => 19,25%).',
      corporateTaxStandardRatePct: 33,
      minimumFlatTaxLabel: 'Acompte IS / Minimum de Perception (2,2% à 5,5%)',
      minimumFlatTaxRatePct: 2.2,
      socialSecurityBody: 'CNPS Cameroun & Crédit Foncier / FNE',
      chartOfAccounts: SYSCOHADA_CHART_OF_ACCOUNTS,
      additionalTaxesAndDuties: [
        {
          id: 'tax-cm-cac',
          code: 'CAC',
          label: 'Centimes Additionnels Communaux (CAC — 1,75% sur HT)',
          category: 'indirect_tax',
          ratePct: 1.75,
          sign: 'add',
          legalReference: 'Art. 142 CGI Cameroun (10% de la TVA de base)',
          description: 'Surtaxe communale légale additionnelle à la TVA au Cameroun.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: true,
        },
        {
          id: 'tax-cm-air',
          code: 'AIR-IS',
          label: 'Précompte / Acompte d’Impôt sur le Revenu (AIR — 2,2% ou 5,5%)',
          category: 'withholding_tax',
          ratePct: 2.2,
          sign: 'deduct',
          legalReference: 'Art. 21 & 92 CGI Cameroun',
          description: 'Retenue à la source au titre de l’acompte d’IS sur les factures de travaux et prestations.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: true,
        },
        {
          id: 'tax-cm-tsr',
          code: 'TSR',
          label: 'Taxe Spéciale sur les Revenus / Prestations (TSR — 5%)',
          category: 'withholding_tax',
          ratePct: 5,
          sign: 'deduct',
          legalReference: 'Art. 225 CGI Cameroun',
          description: 'Retenue applicable sur les rémunérations d’assistance technique et études.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: true,
        },
      ],
    };
  }

  if (OHADA_COUNTRIES.has(code)) {
    return {
      countryCode: code,
      accountingStandardName: `Acte Uniforme OHADA — SYSCOHADA Révisé (${countryName})`,
      accountingStandardCode: 'SYSCOHADA_REVISE',
      fiscalLawTitle: `Code Général des Impôts (CGI) & Loi de Finances en vigueur — ${countryName}`,
      fiscalYearSummary: 'Exercice comptable OHADA du 1er Janvier au 31 Décembre. États financiers normalisés (Bilan, Compte de résultat, TFT, Notes annexes).',
      corporateTaxStandardRatePct: 27.5,
      minimumFlatTaxLabel: 'Impôt Minimum Forfaitaire (IMF)',
      minimumFlatTaxRatePct: 1.0,
      socialSecurityBody: `Caisse Nationale de Sécurité Sociale (${countryName})`,
      chartOfAccounts: SYSCOHADA_CHART_OF_ACCOUNTS,
      additionalTaxesAndDuties: [
        {
          id: `tax-${code.toLowerCase()}-ibic`,
          code: 'RET-BIC/BNC',
          label: 'Retenue à la source sur Prestations & Travaux (5%)',
          category: 'withholding_tax',
          ratePct: 5,
          sign: 'deduct',
          legalReference: `Code Général des Impôts (${countryName})`,
          description: 'Prélèvement à la source légal sur les prestations de services et travaux d’entreprise.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: true,
        },
        {
          id: `tax-${code.toLowerCase()}-airsi`,
          code: 'AIB / AIRSI',
          label: 'Acompte sur Impôt assis sur les Bénéfices (AIB / AIRSI — 1% à 5%)',
          category: 'withholding_tax',
          ratePct: 2,
          sign: 'deduct',
          legalReference: `Loi de Finances en vigueur (${countryName})`,
          description: 'Acompte fiscal facturé ou retenu sur les opérations commerciales et marchés.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: true,
        },
        {
          id: `tax-${code.toLowerCase()}-rg`,
          code: 'RG-CHANTIER',
          label: 'Retenue de Garantie Contractuelle (5%)',
          category: 'withholding_tax',
          ratePct: 5,
          sign: 'deduct',
          legalReference: 'Code des Marchés & Contrats BTP OHADA',
          description: 'Retenue de garantie de bonne fin des travaux.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: true,
        },
        {
          id: `tax-${code.toLowerCase()}-patente`,
          code: 'TAXE-LOCALE',
          label: 'Taxe de Développement Local / Quote-part Patente (0,5%)',
          category: 'local_tax',
          ratePct: 0.5,
          sign: 'add',
          legalReference: `Fiscalité Locale (${countryName})`,
          description: 'Contribution fiscale locale sur le volume d’activité.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: false,
        },
      ],
    };
  }

  if (EUROPE_PCG_COUNTRIES.has(code)) {
    return {
      countryCode: code,
      accountingStandardName: `Plan Comptable Général (PCG / Normes Européennes — ${countryName})`,
      accountingStandardCode: 'PCG_FRANCE',
      fiscalLawTitle: `Code Général des Impôts (CGI) & Loi de Finances en vigueur — ${countryName}`,
      fiscalYearSummary: 'Tenue comptable en partie double conforme au PCG et FEC (Fichier des Écritures Comptables).',
      corporateTaxStandardRatePct: 25,
      minimumFlatTaxLabel: 'Cotisation Foncière / Minimum Fiscal',
      minimumFlatTaxRatePct: 0.5,
      socialSecurityBody: code === 'FR' ? 'URSSAF & Caisses de Retraite AGIRC-ARRCO / CIBTP' : `Sécurité Sociale (${countryName})`,
      chartOfAccounts: PCG_FRANCE_CHART_OF_ACCOUNTS,
      additionalTaxesAndDuties: [
        {
          id: `tax-${code.toLowerCase()}-rg`,
          code: 'RG-MARCHE',
          label: 'Retenue de Garantie Loi de 1971 (5%)',
          category: 'withholding_tax',
          ratePct: 5,
          sign: 'deduct',
          legalReference: 'Loi n° 71-584 / Norme NF P 03-001 (Marchés de travaux)',
          description: 'Retenue légale plafonnée à 5% garantissant la levée des réserves à la réception.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: true,
        },
        {
          id: `tax-${code.toLowerCase()}-eco`,
          code: 'ECO-CONTRIB',
          label: 'Éco-participation / Contribution Environnementale REP Bâtiment (0,4%)',
          category: 'indirect_tax',
          ratePct: 0.4,
          sign: 'add',
          legalReference: 'Code de l’Environnement — Filière REP PMCB',
          description: 'Contribution réglementaire pour la gestion et la valorisation des déchets du bâtiment.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: true,
        },
        {
          id: `tax-${code.toLowerCase()}-cvae`,
          code: 'CET-CVAE',
          label: 'Contribution Économique Territoriale (CFE / CVAE — 0,3%)',
          category: 'local_tax',
          ratePct: 0.3,
          sign: 'add',
          legalReference: 'Art. 1447 & 1586 ter CGI',
          description: 'Imposition locale sur la valeur ajoutée produite par l’entreprise.',
          defaultIncludeInDoc: false,
          defaultDisplayOnDoc: false,
        },
      ],
    };
  }

  return {
    countryCode: code,
    accountingStandardName: `Normes Comptables Internationales IFRS / GAAP (${countryName})`,
    accountingStandardCode: 'IFRS_INTL',
    fiscalLawTitle: `Législation Fiscale Nationale & Code des Impôts — ${countryName}`,
    fiscalYearSummary: 'Reporting financier conforme aux normes internationales IFRS (IAS 1, IFRS 15 Reconnaissance du revenu sur contrats).',
    corporateTaxStandardRatePct: 21,
    minimumFlatTaxLabel: 'Alternative Minimum Tax (AMT)',
    minimumFlatTaxRatePct: 1.0,
    socialSecurityBody: `National Social Security & Payroll Authority (${countryName})`,
    chartOfAccounts: SYSCOHADA_CHART_OF_ACCOUNTS,
    additionalTaxesAndDuties: [
      {
        id: `tax-${code.toLowerCase()}-wht`,
        code: 'WHT',
        label: 'Withholding Tax / Retenue à la source sur contrats (5%)',
        category: 'withholding_tax',
        ratePct: 5,
        sign: 'deduct',
        legalReference: `National Tax Code (${countryName})`,
        description: 'Retenue fiscale à la source sur les paiements de contrats et services techniques.',
        defaultIncludeInDoc: false,
        defaultDisplayOnDoc: true,
      },
      {
        id: `tax-${code.toLowerCase()}-levy`,
        code: 'LOCAL-LEVY',
        label: 'Taxe Municipale / Prélèvement de Développement (1%)',
        category: 'indirect_tax',
        ratePct: 1,
        sign: 'add',
        legalReference: `Local Revenue Act (${countryName})`,
        description: 'Taxe additionnelle locale applicable sur les opérations commerciales.',
        defaultIncludeInDoc: false,
        defaultDisplayOnDoc: true,
      },
    ],
  };
}




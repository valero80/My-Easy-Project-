export type Language = 'fr' | 'en' | 'es' | 'de';

/**
 * Codes devises officiels conformes à la norme internationale ISO 4217
 */
export type Currency =
  | 'XOF'
  | 'XAF'
  | 'EUR'
  | 'USD'
  | 'GBP'
  | 'CHF'
  | 'CAD'
  | 'MAD'
  | 'TND'
  | 'DZD'
  | 'EGP'
  | 'LYD'
  | 'GNF'
  | 'CDF'
  | 'GHS'
  | 'NGN'
  | 'CVE'
  | 'GMD'
  | 'LRD'
  | 'SLE'
  | 'MRU'
  | 'RWF'
  | 'BIF'
  | 'STN'
  | 'AOA'
  | 'KES'
  | 'TZS'
  | 'UGX'
  | 'ETB'
  | 'DJF'
  | 'MGA'
  | 'MUR'
  | 'SCR'
  | 'KMF'
  | 'ZAR'
  | 'NAD'
  | 'BWP'
  | 'ZMW'
  | 'ZWG'
  | 'MZN'
  | 'MWK'
  | 'SEK'
  | 'NOK'
  | 'DKK'
  | 'PLN'
  | 'CZK'
  | 'RON'
  | 'HUF'
  | 'BGN'
  | 'ISK'
  | 'TRY'
  | 'UAH'
  | 'RSD'
  | 'ALL'
  | 'MXN'
  | 'BRL'
  | 'ARS'
  | 'CLP'
  | 'COP'
  | 'PEN'
  | 'UYU'
  | 'PAB'
  | 'CRC'
  | 'DOP'
  | 'HTG'
  | 'JMD'
  | 'AED'
  | 'SAR'
  | 'QAR'
  | 'KWD'
  | 'BHD'
  | 'OMR'
  | 'JOD'
  | 'LBP'
  | 'ILS'
  | 'CNY'
  | 'JPY'
  | 'KRW'
  | 'INR'
  | 'SGD'
  | 'MYR'
  | 'THB'
  | 'VND'
  | 'IDR'
  | 'PHP'
  | 'PKR'
  | 'BDT'
  | 'LKR'
  | 'KZT'
  | 'UZS'
  | 'AUD'
  | 'NZD'
  | 'FJD'
  | 'PGK';

export interface CurrencyConfigItem {
  code: Currency;
  isoCode?: Currency;
  numericCode: string;
  symbol: string;
  name: string;
  locale: string;
  label: string;
}

export const CURRENCY_CONFIG: Record<Currency, CurrencyConfigItem> = {
  // Afrique de l'Ouest & Centrale (Zone Franc & Hors Zone Franc)
  XOF: {
    code: 'XOF',
    numericCode: '952',
    symbol: 'FCFA',
    name: 'Franc CFA (BCEAO — UEMOA)',
    locale: 'fr-FR',
    label: 'XOF — Franc CFA (BCEAO / UEMOA)',
  },
  XAF: {
    code: 'XAF',
    numericCode: '950',
    symbol: 'FCFA',
    name: 'Franc CFA (BEAC — CEMAC)',
    locale: 'fr-FR',
    label: 'XAF — Franc CFA (BEAC / CEMAC)',
  },
  GNF: {
    code: 'GNF',
    numericCode: '324',
    symbol: 'FG',
    name: 'Franc Guinéen',
    locale: 'fr-GN',
    label: 'GNF — Franc Guinéen (FG)',
  },
  CDF: {
    code: 'CDF',
    numericCode: '976',
    symbol: 'FC',
    name: 'Franc Congolais',
    locale: 'fr-CD',
    label: 'CDF — Franc Congolais (FC)',
  },
  GHS: {
    code: 'GHS',
    numericCode: '936',
    symbol: 'GH₵',
    name: 'Cedi Ghanéen',
    locale: 'en-GH',
    label: 'GHS — Cedi Ghanéen (GH₵)',
  },
  NGN: {
    code: 'NGN',
    numericCode: '566',
    symbol: '₦',
    name: 'Naira Nigérian',
    locale: 'en-NG',
    label: 'NGN — Naira Nigérian (₦)',
  },
  CVE: {
    code: 'CVE',
    numericCode: '132',
    symbol: 'CVE',
    name: 'Escudo Cap-Verdien',
    locale: 'pt-CV',
    label: 'CVE — Escudo Cap-Verdien',
  },
  GMD: {
    code: 'GMD',
    numericCode: '270',
    symbol: 'D',
    name: 'Dalasi Gambien',
    locale: 'en-GM',
    label: 'GMD — Dalasi Gambien (D)',
  },
  LRD: {
    code: 'LRD',
    numericCode: '430',
    symbol: 'L$',
    name: 'Dollar Libérien',
    locale: 'en-LR',
    label: 'LRD — Dollar Libérien (L$)',
  },
  SLE: {
    code: 'SLE',
    numericCode: '925',
    symbol: 'Le',
    name: 'Leone Sierra-Léonais',
    locale: 'en-SL',
    label: 'SLE — Leone Sierra-Léonais (Le)',
  },
  MRU: {
    code: 'MRU',
    numericCode: '929',
    symbol: 'UM',
    name: 'Ouguiya Mauritanien',
    locale: 'fr-MR',
    label: 'MRU — Ouguiya Mauritanien (UM)',
  },
  RWF: {
    code: 'RWF',
    numericCode: '646',
    symbol: 'FRw',
    name: 'Franc Rwandais',
    locale: 'fr-RW',
    label: 'RWF — Franc Rwandais (FRw)',
  },
  BIF: {
    code: 'BIF',
    numericCode: '108',
    symbol: 'FBu',
    name: 'Franc Burundais',
    locale: 'fr-BI',
    label: 'BIF — Franc Burundais (FBu)',
  },
  STN: {
    code: 'STN',
    numericCode: '930',
    symbol: 'Db',
    name: 'Dobra Santoméen',
    locale: 'pt-ST',
    label: 'STN — Dobra Santoméen (Db)',
  },
  AOA: {
    code: 'AOA',
    numericCode: '973',
    symbol: 'Kz',
    name: 'Kwanza Angolais',
    locale: 'pt-AO',
    label: 'AOA — Kwanza Angolais (Kz)',
  },
  // Afrique du Nord
  MAD: {
    code: 'MAD',
    numericCode: '504',
    symbol: 'DH',
    name: 'Dirham Marocain',
    locale: 'fr-MA',
    label: 'MAD — Dirham Marocain (DH)',
  },
  DZD: {
    code: 'DZD',
    numericCode: '012',
    symbol: 'DA',
    name: 'Dinar Algérien',
    locale: 'fr-DZ',
    label: 'DZD — Dinar Algérien (DA)',
  },
  TND: {
    code: 'TND',
    numericCode: '788',
    symbol: 'DT',
    name: 'Dinar Tunisien',
    locale: 'fr-TN',
    label: 'TND — Dinar Tunisien (DT)',
  },
  EGP: {
    code: 'EGP',
    numericCode: '818',
    symbol: 'E£',
    name: 'Livre Égyptienne',
    locale: 'en-EG',
    label: 'EGP — Livre Égyptienne (E£)',
  },
  LYD: {
    code: 'LYD',
    numericCode: '434',
    symbol: 'LD',
    name: 'Dinar Libyen',
    locale: 'ar-LY',
    label: 'LYD — Dinar Libyen (LD)',
  },
  // Afrique de l'Est, Océan Indien & Afrique Australe
  KES: {
    code: 'KES',
    numericCode: '404',
    symbol: 'KSh',
    name: 'Shilling Kényan',
    locale: 'en-KE',
    label: 'KES — Shilling Kényan (KSh)',
  },
  TZS: {
    code: 'TZS',
    numericCode: '834',
    symbol: 'TSh',
    name: 'Shilling Tanzanien',
    locale: 'en-TZ',
    label: 'TZS — Shilling Tanzanien (TSh)',
  },
  UGX: {
    code: 'UGX',
    numericCode: '800',
    symbol: 'USh',
    name: 'Shilling Ougandais',
    locale: 'en-UG',
    label: 'UGX — Shilling Ougandais (USh)',
  },
  ETB: {
    code: 'ETB',
    numericCode: '230',
    symbol: 'Br',
    name: 'Birr Éthiopien',
    locale: 'en-ET',
    label: 'ETB — Birr Éthiopien (Br)',
  },
  DJF: {
    code: 'DJF',
    numericCode: '262',
    symbol: 'Fdj',
    name: 'Franc Djiboutien',
    locale: 'fr-DJ',
    label: 'DJF — Franc Djiboutien (Fdj)',
  },
  MGA: {
    code: 'MGA',
    numericCode: '969',
    symbol: 'Ar',
    name: 'Ariary Malgache',
    locale: 'fr-MG',
    label: 'MGA — Ariary Malgache (Ar)',
  },
  MUR: {
    code: 'MUR',
    numericCode: '480',
    symbol: 'Rs',
    name: 'Roupie Mauricienne',
    locale: 'fr-MU',
    label: 'MUR — Roupie Mauricienne (Rs)',
  },
  SCR: {
    code: 'SCR',
    numericCode: '690',
    symbol: 'SR',
    name: 'Roupie Seychelloise',
    locale: 'fr-SC',
    label: 'SCR — Roupie Seychelloise (SR)',
  },
  KMF: {
    code: 'KMF',
    numericCode: '174',
    symbol: 'CF',
    name: 'Franc Comorien',
    locale: 'fr-KM',
    label: 'KMF — Franc Comorien (CF)',
  },
  ZAR: {
    code: 'ZAR',
    numericCode: '710',
    symbol: 'R',
    name: 'Rand Sud-Africain',
    locale: 'en-ZA',
    label: 'ZAR — Rand Sud-Africain (R)',
  },
  NAD: {
    code: 'NAD',
    numericCode: '516',
    symbol: 'N$',
    name: 'Dollar Namibien',
    locale: 'en-NA',
    label: 'NAD — Dollar Namibien (N$)',
  },
  BWP: {
    code: 'BWP',
    numericCode: '072',
    symbol: 'P',
    name: 'Pula Botswanais',
    locale: 'en-BW',
    label: 'BWP — Pula Botswanais (P)',
  },
  ZMW: {
    code: 'ZMW',
    numericCode: '967',
    symbol: 'ZK',
    name: 'Kwacha Zambien',
    locale: 'en-ZM',
    label: 'ZMW — Kwacha Zambien (ZK)',
  },
  ZWG: {
    code: 'ZWG',
    numericCode: '924',
    symbol: 'ZiG',
    name: 'Zimbabwe Gold (ZiG)',
    locale: 'en-ZW',
    label: 'ZWG — Zimbabwe Gold (ZiG)',
  },
  MZN: {
    code: 'MZN',
    numericCode: '943',
    symbol: 'MT',
    name: 'Metical Mozambicain',
    locale: 'pt-MZ',
    label: 'MZN — Metical Mozambicain (MT)',
  },
  MWK: {
    code: 'MWK',
    numericCode: '454',
    symbol: 'MK',
    name: 'Kwacha Malawite',
    locale: 'en-MW',
    label: 'MWK — Kwacha Malawite (MK)',
  },
  // Europe & Grandes Devises Internationales
  EUR: {
    code: 'EUR',
    numericCode: '978',
    symbol: '€',
    name: 'Euro',
    locale: 'fr-FR',
    label: 'EUR — Euro (€)',
  },
  USD: {
    code: 'USD',
    numericCode: '840',
    symbol: '$',
    name: 'Dollar des États-Unis',
    locale: 'en-US',
    label: 'USD — Dollar des États-Unis ($)',
  },
  GBP: {
    code: 'GBP',
    numericCode: '826',
    symbol: '£',
    name: 'Livre Sterling',
    locale: 'en-GB',
    label: 'GBP — Livre Sterling (£)',
  },
  CHF: {
    code: 'CHF',
    numericCode: '756',
    symbol: 'CHF',
    name: 'Franc Suisse',
    locale: 'de-CH',
    label: 'CHF — Franc Suisse',
  },
  CAD: {
    code: 'CAD',
    numericCode: '124',
    symbol: 'CA$',
    name: 'Dollar Canadien',
    locale: 'en-CA',
    label: 'CAD — Dollar Canadien (CA$)',
  },
  SEK: {
    code: 'SEK',
    numericCode: '752',
    symbol: 'kr',
    name: 'Couronne Suédoise',
    locale: 'sv-SE',
    label: 'SEK — Couronne Suédoise (kr)',
  },
  NOK: {
    code: 'NOK',
    numericCode: '578',
    symbol: 'kr',
    name: 'Couronne Norvégienne',
    locale: 'nb-NO',
    label: 'NOK — Couronne Norvégienne (kr)',
  },
  DKK: {
    code: 'DKK',
    numericCode: '208',
    symbol: 'kr',
    name: 'Couronne Danoise',
    locale: 'da-DK',
    label: 'DKK — Couronne Danoise (kr)',
  },
  PLN: {
    code: 'PLN',
    numericCode: '985',
    symbol: 'zł',
    name: 'Zloty Polonais',
    locale: 'pl-PL',
    label: 'PLN — Zloty Polonais (zł)',
  },
  CZK: {
    code: 'CZK',
    numericCode: '203',
    symbol: 'Kč',
    name: 'Couronne Tchèque',
    locale: 'cs-CZ',
    label: 'CZK — Couronne Tchèque (Kč)',
  },
  RON: {
    code: 'RON',
    numericCode: '946',
    symbol: 'lei',
    name: 'Leu Roumain',
    locale: 'ro-RO',
    label: 'RON — Leu Roumain (lei)',
  },
  HUF: {
    code: 'HUF',
    numericCode: '348',
    symbol: 'Ft',
    name: 'Forint Hongrois',
    locale: 'hu-HU',
    label: 'HUF — Forint Hongrois (Ft)',
  },
  BGN: {
    code: 'BGN',
    numericCode: '975',
    symbol: 'лв',
    name: 'Lev Bulgare',
    locale: 'bg-BG',
    label: 'BGN — Lev Bulgare (лв)',
  },
  ISK: {
    code: 'ISK',
    numericCode: '352',
    symbol: 'kr',
    name: 'Couronne Islandaise',
    locale: 'is-IS',
    label: 'ISK — Couronne Islandaise (kr)',
  },
  TRY: {
    code: 'TRY',
    numericCode: '949',
    symbol: '₺',
    name: 'Livre Turque',
    locale: 'tr-TR',
    label: 'TRY — Livre Turque (₺)',
  },
  UAH: {
    code: 'UAH',
    numericCode: '980',
    symbol: '₴',
    name: 'Hryvnia Ukrainienne',
    locale: 'uk-UA',
    label: 'UAH — Hryvnia Ukrainienne (₴)',
  },
  RSD: {
    code: 'RSD',
    numericCode: '941',
    symbol: 'RSD',
    name: 'Dinar Serbe',
    locale: 'sr-RS',
    label: 'RSD — Dinar Serbe',
  },
  ALL: {
    code: 'ALL',
    numericCode: '008',
    symbol: 'L',
    name: 'Lek Albanais',
    locale: 'sq-AL',
    label: 'ALL — Lek Albanais (L)',
  },
  // Amériques & Caraïbes
  MXN: {
    code: 'MXN',
    numericCode: '484',
    symbol: 'MX$',
    name: 'Peso Mexicain',
    locale: 'es-MX',
    label: 'MXN — Peso Mexicain (MX$)',
  },
  BRL: {
    code: 'BRL',
    numericCode: '986',
    symbol: 'R$',
    name: 'Réal Brésilien',
    locale: 'pt-BR',
    label: 'BRL — Réal Brésilien (R$)',
  },
  ARS: {
    code: 'ARS',
    numericCode: '032',
    symbol: 'AR$',
    name: 'Peso Argentin',
    locale: 'es-AR',
    label: 'ARS — Peso Argentin (AR$)',
  },
  CLP: {
    code: 'CLP',
    numericCode: '152',
    symbol: 'CL$',
    name: 'Peso Chilien',
    locale: 'es-CL',
    label: 'CLP — Peso Chilien (CL$)',
  },
  COP: {
    code: 'COP',
    numericCode: '170',
    symbol: 'CO$',
    name: 'Peso Colombien',
    locale: 'es-CO',
    label: 'COP — Peso Colombien (CO$)',
  },
  PEN: {
    code: 'PEN',
    numericCode: '604',
    symbol: 'S/',
    name: 'Sol Péruvien',
    locale: 'es-PE',
    label: 'PEN — Sol Péruvien (S/)',
  },
  UYU: {
    code: 'UYU',
    numericCode: '858',
    symbol: '$U',
    name: 'Peso Uruguayen',
    locale: 'es-UY',
    label: 'UYU — Peso Uruguayen ($U)',
  },
  PAB: {
    code: 'PAB',
    numericCode: '590',
    symbol: 'B/.',
    name: 'Balboa Panaméen',
    locale: 'es-PA',
    label: 'PAB — Balboa Panaméen (B/.)',
  },
  CRC: {
    code: 'CRC',
    numericCode: '188',
    symbol: '₡',
    name: 'Colón Costaricien',
    locale: 'es-CR',
    label: 'CRC — Colón Costaricien (₡)',
  },
  DOP: {
    code: 'DOP',
    numericCode: '214',
    symbol: 'RD$',
    name: 'Peso Dominicain',
    locale: 'es-DO',
    label: 'DOP — Peso Dominicain (RD$)',
  },
  HTG: {
    code: 'HTG',
    numericCode: '332',
    symbol: 'G',
    name: 'Gourde Haïtienne',
    locale: 'fr-HT',
    label: 'HTG — Gourde Haïtienne (G)',
  },
  JMD: {
    code: 'JMD',
    numericCode: '388',
    symbol: 'J$',
    name: 'Dollar Jamaïcain',
    locale: 'en-JM',
    label: 'JMD — Dollar Jamaïcain (J$)',
  },
  // Moyen-Orient & Asie-Pacifique
  AED: {
    code: 'AED',
    numericCode: '784',
    symbol: 'AED',
    name: 'Dirham des Émirats Arabes Unis',
    locale: 'ar-AE',
    label: 'AED — Dirham des ÉAU',
  },
  SAR: {
    code: 'SAR',
    numericCode: '682',
    symbol: 'SAR',
    name: 'Riyal Saoudien',
    locale: 'ar-SA',
    label: 'SAR — Riyal Saoudien',
  },
  QAR: {
    code: 'QAR',
    numericCode: '634',
    symbol: 'QAR',
    name: 'Riyal Qatarien',
    locale: 'ar-QA',
    label: 'QAR — Riyal Qatarien',
  },
  KWD: {
    code: 'KWD',
    numericCode: '414',
    symbol: 'KWD',
    name: 'Dinar Koweïtien',
    locale: 'ar-KW',
    label: 'KWD — Dinar Koweïtien',
  },
  BHD: {
    code: 'BHD',
    numericCode: '048',
    symbol: 'BHD',
    name: 'Dinar Bahreïni',
    locale: 'ar-BH',
    label: 'BHD — Dinar Bahreïni',
  },
  OMR: {
    code: 'OMR',
    numericCode: '512',
    symbol: 'OMR',
    name: 'Rial Omanais',
    locale: 'ar-OM',
    label: 'OMR — Rial Omanais',
  },
  JOD: {
    code: 'JOD',
    numericCode: '400',
    symbol: 'JOD',
    name: 'Dinar Jordanien',
    locale: 'ar-JO',
    label: 'JOD — Dinar Jordanien',
  },
  LBP: {
    code: 'LBP',
    numericCode: '422',
    symbol: 'L£',
    name: 'Livre Libanaise',
    locale: 'ar-LB',
    label: 'LBP — Livre Libanaise (L£)',
  },
  ILS: {
    code: 'ILS',
    numericCode: '376',
    symbol: '₪',
    name: 'Nouveau Shekel Israélien',
    locale: 'he-IL',
    label: 'ILS — Nouveau Shekel Israélien (₪)',
  },
  CNY: {
    code: 'CNY',
    numericCode: '156',
    symbol: '¥',
    name: 'Yuan Renminbi Chinois',
    locale: 'zh-CN',
    label: 'CNY — Yuan Renminbi Chinois (¥)',
  },
  JPY: {
    code: 'JPY',
    numericCode: '392',
    symbol: '¥',
    name: 'Yen Japonais',
    locale: 'ja-JP',
    label: 'JPY — Yen Japonais (¥)',
  },
  KRW: {
    code: 'KRW',
    numericCode: '410',
    symbol: '₩',
    name: 'Won Sud-Coréen',
    locale: 'ko-KR',
    label: 'KRW — Won Sud-Coréen (₩)',
  },
  INR: {
    code: 'INR',
    numericCode: '356',
    symbol: '₹',
    name: 'Roupie Indienne',
    locale: 'en-IN',
    label: 'INR — Roupie Indienne (₹)',
  },
  SGD: {
    code: 'SGD',
    numericCode: '702',
    symbol: 'S$',
    name: 'Dollar de Singapour',
    locale: 'en-SG',
    label: 'SGD — Dollar de Singapour (S$)',
  },
  MYR: {
    code: 'MYR',
    numericCode: '458',
    symbol: 'RM',
    name: 'Ringgit Malaisien',
    locale: 'ms-MY',
    label: 'MYR — Ringgit Malaisien (RM)',
  },
  THB: {
    code: 'THB',
    numericCode: '764',
    symbol: '฿',
    name: 'Baht Thaïlandais',
    locale: 'th-TH',
    label: 'THB — Baht Thaïlandais (฿)',
  },
  VND: {
    code: 'VND',
    numericCode: '704',
    symbol: '₫',
    name: 'Dong Vietnamien',
    locale: 'vi-VN',
    label: 'VND — Dong Vietnamien (₫)',
  },
  IDR: {
    code: 'IDR',
    numericCode: '360',
    symbol: 'Rp',
    name: 'Roupie Indonésienne',
    locale: 'id-ID',
    label: 'IDR — Roupie Indonésienne (Rp)',
  },
  PHP: {
    code: 'PHP',
    numericCode: '608',
    symbol: '₱',
    name: 'Peso Philippin',
    locale: 'en-PH',
    label: 'PHP — Peso Philippin (₱)',
  },
  PKR: {
    code: 'PKR',
    numericCode: '586',
    symbol: 'Rs',
    name: 'Roupie Pakistanaise',
    locale: 'en-PK',
    label: 'PKR — Roupie Pakistanaise (Rs)',
  },
  BDT: {
    code: 'BDT',
    numericCode: '050',
    symbol: '৳',
    name: 'Taka Bangladais',
    locale: 'bn-BD',
    label: 'BDT — Taka Bangladais (৳)',
  },
  LKR: {
    code: 'LKR',
    numericCode: '144',
    symbol: 'Rs',
    name: 'Roupie Srilankaise',
    locale: 'en-LK',
    label: 'LKR — Roupie Srilankaise (Rs)',
  },
  KZT: {
    code: 'KZT',
    numericCode: '398',
    symbol: '₸',
    name: 'Tenge Kazakh',
    locale: 'kk-KZ',
    label: 'KZT — Tenge Kazakh (₸)',
  },
  UZS: {
    code: 'UZS',
    numericCode: '860',
    symbol: 'UZS',
    name: 'Sum Ouzbek',
    locale: 'uz-UZ',
    label: 'UZS — Sum Ouzbek',
  },
  AUD: {
    code: 'AUD',
    numericCode: '036',
    symbol: 'A$',
    name: 'Dollar Australien',
    locale: 'en-AU',
    label: 'AUD — Dollar Australien (A$)',
  },
  NZD: {
    code: 'NZD',
    numericCode: '554',
    symbol: 'NZ$',
    name: 'Dollar Néo-Zélandais',
    locale: 'en-NZ',
    label: 'NZD — Dollar Néo-Zélandais (NZ$)',
  },
  FJD: {
    code: 'FJD',
    numericCode: '242',
    symbol: 'FJ$',
    name: 'Dollar Fidjien',
    locale: 'en-FJ',
    label: 'FJD — Dollar Fidjien (FJ$)',
  },
  PGK: {
    code: 'PGK',
    numericCode: '598',
    symbol: 'K',
    name: 'Kina Papou-Néo-Guinéen',
    locale: 'en-PG',
    label: 'PGK — Kina Papou-Néo-Guinéen (K)',
  },
};

const CURRENCY_ALIASES: Record<string, Currency> = {
  CFA: 'XOF',
  FCFA: 'XOF',
  'CFA BCEAO': 'XOF',
  'CFA BEAC': 'XAF',
  '€': 'EUR',
  EURO: 'EUR',
  '$': 'USD',
  'US$': 'USD',
  'CA$': 'CAD',
  '£': 'GBP',
  DH: 'MAD',
  DT: 'TND',
  DA: 'DZD',
  FG: 'GNF',
  FC: 'CDF',
  MRO: 'MRU',
  SLL: 'SLE',
  STD: 'STN',
  ZWL: 'ZWG',
  HRK: 'EUR',
};

/**
 * Retourne le code devise officiel ISO 4217 normalisé (3 lettres majuscules)
 */
export function getOfficialCurrencyCode(rawCurrency?: string): Currency {
  if (!rawCurrency) return 'XOF';
  const cleaned = rawCurrency.trim().toUpperCase();
  if (cleaned in CURRENCY_CONFIG) {
    return cleaned as Currency;
  }
  if (cleaned in CURRENCY_ALIASES) {
    return CURRENCY_ALIASES[cleaned];
  }
  return 'XOF';
}

export function getCurrencyMetadata(rawCurrency?: string): CurrencyConfigItem {
  const code = getOfficialCurrencyCode(rawCurrency);
  return CURRENCY_CONFIG[code];
}

export function formatAmountSpaced(amount: number, _currency?: Currency | string): string {
  const safeNum = Number.isFinite(amount) ? amount : 0;
  const isNegative = safeNum < 0;
  const absVal = Math.abs(safeNum);
  const rounded = Math.round(absVal * 100) / 100;
  const hasDecimals = Math.abs(rounded - Math.trunc(rounded)) > 0.001;

  const [intPart, decPart] = hasDecimals
    ? rounded.toFixed(2).split('.')
    : [Math.round(rounded).toString(), ''];

  const spacedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const formatted = decPart ? `${spacedInt},${decPart}` : spacedInt;
  return isNegative ? `-${formatted}` : formatted;
}

export function formatCurrency(amount: number, currency: Currency | string = 'XOF'): string {
  const officialCode = getOfficialCurrencyCode(currency);
  return `${formatAmountSpaced(amount)} ${officialCode}`;
}

/**
 * Taux de référence officiels pour 1 EUR vers chaque devise ISO 4217
 * (notamment parité fixe Zone Franc 1 EUR = 655,957 XOF/XAF)
 */
export const REFERENCE_FX_RATES_PER_EUR: Record<Currency, number> = {
  EUR: 1,
  XOF: 655.957,
  XAF: 655.957,
  USD: 1.085,
  GBP: 0.855,
  CHF: 0.945,
  CAD: 1.495,
  MAD: 10.78,
  TND: 3.36,
  DZD: 145.5,
  EGP: 53.2,
  LYD: 5.24,
  GNF: 9350,
  CDF: 3080,
  GHS: 16.9,
  NGN: 1750,
  CVE: 110.265,
  GMD: 73.5,
  LRD: 210,
  SLE: 24.5,
  MRU: 43.1,
  RWF: 1485,
  BIF: 3140,
  STN: 24.5,
  AOA: 995,
  KES: 140.5,
  TZS: 2920,
  UGX: 3990,
  ETB: 132,
  DJF: 192.8,
  MGA: 5050,
  MUR: 50.1,
  SCR: 15.1,
  KMF: 491.96775,
  ZAR: 19.35,
  NAD: 19.35,
  BWP: 14.65,
  ZMW: 29.5,
  ZWG: 28.4,
  MZN: 69.2,
  MWK: 1880,
  SEK: 11.45,
  NOK: 11.75,
  DKK: 7.46,
  PLN: 4.32,
  CZK: 25.3,
  RON: 4.97,
  HUF: 402,
  BGN: 1.95583,
  ISK: 149.5,
  TRY: 37.2,
  UAH: 44.8,
  RSD: 117.1,
  ALL: 98.5,
  MXN: 21.6,
  BRL: 6.18,
  ARS: 1065,
  CLP: 1035,
  COP: 4680,
  PEN: 4.08,
  UYU: 45.2,
  PAB: 1.085,
  CRC: 555,
  DOP: 65.4,
  HTG: 142.5,
  JMD: 171.2,
  AED: 3.985,
  SAR: 4.07,
  QAR: 3.95,
  KWD: 0.333,
  BHD: 0.409,
  OMR: 0.418,
  JOD: 0.769,
  LBP: 97100,
  ILS: 4.02,
  CNY: 7.82,
  JPY: 165.4,
  KRW: 1495,
  INR: 91.4,
  SGD: 1.44,
  MYR: 4.74,
  THB: 36.8,
  VND: 27450,
  IDR: 17100,
  PHP: 63.2,
  PKR: 301.5,
  BDT: 129.8,
  LKR: 318.5,
  KZT: 530,
  UZS: 13890,
  AUD: 1.65,
  NZD: 1.82,
  FJD: 2.45,
  PGK: 4.32,
};

/**
 * Calcule le taux de change par défaut entre deux devises (1 unité de fromCurrency = X unités de toCurrency)
 */
export function getDefaultExchangeRate(
  fromCurrency?: Currency | string,
  toCurrency?: Currency | string
): number {
  const fromCode = getOfficialCurrencyCode(fromCurrency);
  const toCode = getOfficialCurrencyCode(toCurrency);
  if (fromCode === toCode) return 1;
  if ((fromCode === 'XOF' && toCode === 'XAF') || (fromCode === 'XAF' && toCode === 'XOF')) {
    return 1;
  }
  const fromPerEur = REFERENCE_FX_RATES_PER_EUR[fromCode] || 1;
  const toPerEur = REFERENCE_FX_RATES_PER_EUR[toCode] || 1;
  const crossRate = toPerEur / fromPerEur;
  return Number(crossRate.toFixed(6));
}

/**
 * Convertit un montant de la devise du prestataire vers la devise du client
 */
export function convertCurrencyAmount(
  amount: number,
  fromCurrency?: Currency | string,
  toCurrency?: Currency | string,
  customExchangeRate?: number
): number {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const fromCode = getOfficialCurrencyCode(fromCurrency);
  const toCode = getOfficialCurrencyCode(toCurrency);
  if (fromCode === toCode) return Number(safeAmount.toFixed(2));
  const rate =
    typeof customExchangeRate === 'number' &&
    Number.isFinite(customExchangeRate) &&
    customExchangeRate > 0
      ? customExchangeRate
      : getDefaultExchangeRate(fromCode, toCode);
  return Number((safeAmount * rate).toFixed(2));
}


export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  fr: {
    appName: 'My Easy Project',
    tagline: 'ERP exécutif : gestion de projets, facturation, stocks et ressources humaines.',
    dashboard: 'Tableau de bord',
    documents: 'Devis & Factures',
    projects: 'Projets',
    team: 'Collaborateurs',
    alerts: 'Alertes',
    security: 'Paramètres',
    newDocument: 'Nouveau document',
    newProject: 'Nouveau projet',
    newMember: 'Nouveau collaborateur',
    newAlert: 'Nouvelle alerte',
    quote: 'Devis',
    proforma: 'Proforma',
    invoice: 'Facture',
    totalBilled: 'Total Facturé',
    totalCollected: 'Total Encaissé',
    pendingPayments: 'Reste à Recouvrer',
    activeProjects: 'Projets Actifs',
    collectionRate: 'Recouvrement',
    convertToProforma: 'Convertir en Proforma',
    convertToInvoice: 'Convertir en Facture',
    recordPayment: 'Encaisser',
    exportPdf: 'PDF',
    exportExcel: 'Export Excel',
    projectProgress: 'Avancement Financier des Projets',
    monthlyRevenueTitle: 'Chiffre d’Affaires & Encaissements',
    monthlyRevenueSub: 'Évolution mensuelle des factures et proformas validées',
    saveAsDraft: 'Brouillon',
    validateAndIssue: 'Valider et émettre',
    editDraft: 'Modifier',
    validateDraft: 'Valider',
    companyBranding: 'Identité de l’Entreprise',
    uploadLogo: 'Importer un logo',
    removeLogo: 'Retirer le logo',
    statusDraft: 'Brouillon',
    statusSent: 'Émis',
    statusPartial: 'Partiel',
    statusPaid: 'Soldé',
    statusOverdue: 'En retard',
    statusCancelled: 'Annulé',
    projPlanning: 'Planification',
    projActive: 'En cours',
    projReview: 'En revue',
    projCompleted: 'Terminé',
    signInGoogle: 'Connexion Google',
    signOut: 'Déconnexion',
    seedDemoData: 'Charger données démo',
    e2eeUnlocked: 'Chiffrement E2EE actif',
    e2eeLocked: 'Coffre E2EE verrouillé',
    twoFactorTitle: 'Authentification 2FA (TOTP)',
    twoFactorSub: 'Saisissez le code à 6 chiffres pour déverrouiller la session.',
    verify2FA: 'Vérifier',
    enablePush: 'Notifications Push',
    pushActive: 'Push actif',
    installApp: 'Installer l’application',
    searchPlaceholder: 'Rechercher client, référence, projet...',
    allTypes: 'Tous',
    noDocuments: 'Aucun document enregistré.',
    noProjects: 'Aucun projet enregistré.',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    client: 'Client',
    amount: 'Montant TTC',
    paid: 'Encaissé',
    dueDate: 'Échéance',
    actions: 'Actions',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    themeMidnight: 'Nuit',
  },
  en: {
    appName: 'My Easy Project',
    tagline: 'Executive ERP: project management, billing, inventory, and human resources.',
    dashboard: 'Dashboard',
    documents: 'Invoices & Quotes',
    projects: 'Projects',
    team: 'Collaborators',
    alerts: 'Alerts',
    security: 'Settings',
    newDocument: 'New Document',
    newProject: 'New Project',
    newMember: 'New Collaborator',
    newAlert: 'New Alert',
    quote: 'Quote',
    proforma: 'Proforma',
    invoice: 'Invoice',
    totalBilled: 'Total Billed',
    totalCollected: 'Total Collected',
    pendingPayments: 'Outstanding Balance',
    activeProjects: 'Active Projects',
    collectionRate: 'Collection Rate',
    convertToProforma: 'To Proforma',
    convertToInvoice: 'To Invoice',
    recordPayment: 'Record Payment',
    exportPdf: 'PDF',
    exportExcel: 'Export Excel',
    projectProgress: 'Project Financial Progress',
    monthlyRevenueTitle: 'Monthly Revenue & Collections',
    monthlyRevenueSub: 'Validated invoices and proformas by issue date',
    saveAsDraft: 'Save Draft',
    validateAndIssue: 'Validate & Issue',
    editDraft: 'Edit',
    validateDraft: 'Validate',
    companyBranding: 'Corporate Identity',
    uploadLogo: 'Upload Logo',
    removeLogo: 'Remove Logo',
    statusDraft: 'Draft',
    statusSent: 'Issued',
    statusPartial: 'Partial',
    statusPaid: 'Paid',
    statusOverdue: 'Overdue',
    statusCancelled: 'Cancelled',
    projPlanning: 'Planning',
    projActive: 'Active',
    projReview: 'Review',
    projCompleted: 'Completed',
    signInGoogle: 'Sign in with Google',
    signOut: 'Sign Out',
    seedDemoData: 'Load Sample Data',
    e2eeUnlocked: 'E2EE Active',
    e2eeLocked: 'E2EE Locked',
    twoFactorTitle: 'Two-Factor Authentication (2FA)',
    twoFactorSub: 'Enter the 6-digit code to unlock your session.',
    verify2FA: 'Verify',
    enablePush: 'Enable Push',
    pushActive: 'Push Active',
    installApp: 'Install App',
    searchPlaceholder: 'Search client, reference, project...',
    allTypes: 'All',
    noDocuments: 'No documents recorded.',
    noProjects: 'No projects recorded.',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    client: 'Client',
    amount: 'Total Amount',
    paid: 'Collected',
    dueDate: 'Due Date',
    actions: 'Actions',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeMidnight: 'Midnight',
  },
  es: {
    appName: 'My Easy Project',
    tagline: 'Facturación inteligente, seguimiento de proyectos y sincronización en la nube cifrada.',
    dashboard: 'Panel de Control',
    documents: 'Presupuestos y Facturas',
    projects: 'Proyectos e Hitos',
    team: 'Equipo y Accesos',
    alerts: 'Alertas y Vencimientos',
    security: 'Ajustes y Seguridad',
    newDocument: 'Nuevo Documento',
    newProject: 'Nuevo Proyecto',
    newMember: 'Invitar Miembro',
    newAlert: 'Nueva Alerta',
    quote: 'Presupuesto',
    proforma: 'Factura Proforma',
    invoice: 'Factura',
    totalBilled: 'Total Facturado',
    totalCollected: 'Total Cobrado',
    pendingPayments: 'Pendiente de Cobro',
    activeProjects: 'Proyectos Activos',
    collectionRate: 'Tasa de Cobro',
    convertToProforma: 'Convertir a Proforma',
    convertToInvoice: 'Convertir a Factura',
    recordPayment: 'Registrar Pago',
    exportPdf: 'Exportar PDF',
    exportExcel: 'Exportar Excel',
    projectProgress: 'Progreso según Factura',
    monthlyRevenueTitle: 'Evolución de Ingresos Mensuales',
    monthlyRevenueSub: 'Basado en las fechas de emisión de las facturas',
    saveAsDraft: 'Guardar como borrador',
    validateAndIssue: 'Validar y emitir oficialmente',
    editDraft: 'Editar borrador',
    validateDraft: 'Validar oficialmente',
    companyBranding: 'Identidad Corporativa y Logo PDF',
    uploadLogo: 'Subir Logo (PNG/JPG)',
    removeLogo: 'Eliminar Logo',
    statusDraft: 'Borrador',
    statusSent: 'Enviado',
    statusPartial: 'Parcial',
    statusPaid: 'Pagado',
    statusOverdue: 'Vencido',
    statusCancelled: 'Cancelado',
    projPlanning: 'Planificación',
    projActive: 'Activo',
    projReview: 'En Revisión',
    projCompleted: 'Completado',
    signInGoogle: 'Iniciar sesión con Google',
    signOut: 'Cerrar sesión',
    seedDemoData: 'Cargar cartera de demostración',
    e2eeUnlocked: 'Cifrado E2EE Activo (AES-256-GCM)',
    e2eeLocked: 'Bóveda E2EE Bloqueada',
    twoFactorTitle: 'Autenticación de Dos Factores (2FA)',
    twoFactorSub: 'Ingrese el código de 6 dígitos para desbloquear su sesión.',
    verify2FA: 'Verificar código 2FA',
    enablePush: 'Activar Notificaciones Push',
    pushActive: 'Notificaciones Push Activas',
    installApp: 'Instalar App (iOS / Android)',
    searchPlaceholder: 'Buscar cliente, número, proyecto...',
    allTypes: 'Todos los tipos',
    noDocuments: 'No hay documentos financieros registrados.',
    noProjects: 'No hay proyectos creados.',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    client: 'Cliente',
    amount: 'Importe Total',
    paid: 'Pagado',
    dueDate: 'Vencimiento',
    actions: 'Acciones',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    themeMidnight: 'Medianoche',
  },
  de: {
    appName: 'My Easy Project',
    tagline: 'Intelligente Rechnungsstellung, Projektverfolgung und verschlüsselte Cloud-Synchronisierung.',
    dashboard: 'Dashboard',
    documents: 'Angebote & Rechnungen',
    projects: 'Projekte & Meilensteine',
    team: 'Team & Zugriffe',
    alerts: 'Fristen & Warnungen',
    security: 'Einstellungen & Sicherheit',
    newDocument: 'Neues Dokument',
    newProject: 'Neues Projekt',
    newMember: 'Mitglied einladen',
    newAlert: 'Neue Warnung',
    quote: 'Angebot',
    proforma: 'Proforma-Rechnung',
    invoice: 'Rechnung',
    totalBilled: 'Gesamtbetrag',
    totalCollected: 'Bereits Bezahlt',
    pendingPayments: 'Ausstehend',
    activeProjects: 'Aktive Projekte',
    collectionRate: 'Einzugsquote',
    convertToProforma: 'In Proforma umwandeln',
    convertToInvoice: 'In Rechnung umwandeln',
    recordPayment: 'Zahlung erfassen',
    exportPdf: 'PDF Exportieren',
    exportExcel: 'Excel Exportieren',
    projectProgress: 'Rechnungsbasierter Fortschritt',
    monthlyRevenueTitle: 'Monatliche Umsatzentwicklung',
    monthlyRevenueSub: 'Basierend auf dem Rechnungsdatum',
    saveAsDraft: 'Als Entwurf speichern',
    validateAndIssue: 'Offiziell validieren & ausstellen',
    editDraft: 'Entwurf bearbeiten',
    validateDraft: 'Offiziell validieren',
    companyBranding: 'Unternehmensprofil & PDF-Logo',
    uploadLogo: 'Logo hochladen (PNG/JPG)',
    removeLogo: 'Logo entfernen',
    statusDraft: 'Entwurf',
    statusSent: 'Gesendet',
    statusPartial: 'Teilweise',
    statusPaid: 'Bezahlt',
    statusOverdue: 'Überfällig',
    statusCancelled: 'Storniert',
    projPlanning: 'Planung',
    projActive: 'Aktiv',
    projReview: 'Prüfung',
    projCompleted: 'Abgeschlossen',
    signInGoogle: 'Mit Google anmelden',
    signOut: 'Abmelden',
    seedDemoData: 'Demo-Portfolio laden',
    e2eeUnlocked: 'E2EE-Verschlüsselung aktiv (AES-256-GCM)',
    e2eeLocked: 'E2EE-Tresor gesperrt',
    twoFactorTitle: 'Zwei-Faktor-Authentifizierung (2FA)',
    twoFactorSub: 'Geben Sie den 6-stelligen Code ein, um Ihre Sitzung zu entsperren.',
    verify2FA: '2FA-Code bestätigen',
    enablePush: 'Push-Benachrichtigungen aktivieren',
    pushActive: 'Push-Benachrichtigungen aktiv',
    installApp: 'App installieren (iOS / Android)',
    searchPlaceholder: 'Kunde, Nummer, Projekt suchen...',
    allTypes: 'Alle Typen',
    noDocuments: 'Keine Finanzdokumente vorhanden.',
    noProjects: 'Noch keine Projekte erstellt.',
    save: 'Speichern',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    client: 'Kunde',
    amount: 'Gesamtbetrag',
    paid: 'Bezahlt',
    dueDate: 'Fälligkeitsdatum',
    actions: 'Aktionen',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    themeMidnight: 'Mitternacht',
  },
};

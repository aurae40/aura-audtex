import type { CountryHeritage } from '../types';
import { getCountryNativeGreeting } from './countryGreetingsService';

export function enrichCountryWithGreeting(heritage: CountryHeritage): CountryHeritage {
  if (!heritage) return heritage;
  const greetingInfo = getCountryNativeGreeting(heritage.code);
  return {
    ...heritage,
    nativeGreeting: greetingInfo.greeting,
    greetingLanguage: greetingInfo.language,
  };
}

export const COUNTRIES_HERITAGE: Record<string, CountryHeritage> = {
  AF: {
    code: 'AF',
    name: 'Afghanistan',
    flagEmoji: '🇦🇫',
    colors: ["#000000","#d62d20","#007a3d"],
    accent: '#d62d20',
    symbolName: 'National Emblem of Afghanistan',
    tributeMessage: 'To our scholars, readers, and thinkers in Afghanistan: You are the heart and inspiration of this illuminated codex.',
  },
  AL: {
    code: 'AL',
    name: 'Albania',
    flagEmoji: '🇦🇱',
    colors: ["#e41e20","#000000"],
    accent: '#e41e20',
    symbolName: 'Double-headed Eagle',
    tributeMessage: 'To our scholars, readers, and thinkers in Albania: You are the heart and inspiration of this illuminated codex.',
  },
  DZ: {
    code: 'DZ',
    name: 'Algeria',
    flagEmoji: '🇩🇿',
    colors: ["#006233","#ffffff","#d21034"],
    accent: '#006233',
    symbolName: 'Crescent and Star',
    tributeMessage: 'To our scholars, readers, and thinkers in Algeria: You are the heart and inspiration of this illuminated codex.',
  },
  AD: {
    code: 'AD',
    name: 'Andorra',
    flagEmoji: '🇦🇩',
    colors: ["#0018a8","#fedd00","#d52b1e"],
    accent: '#fedd00',
    symbolName: 'Mitre and Crosier Arms',
    tributeMessage: 'To our scholars, readers, and thinkers in Andorra: You are the heart and inspiration of this illuminated codex.',
  },
  AO: {
    code: 'AO',
    name: 'Angola',
    flagEmoji: '🇦🇴',
    colors: ["#ce1126","#000000","#ffcb05"],
    accent: '#ce1126',
    symbolName: 'Cogwheel and Machete',
    tributeMessage: 'To our scholars, readers, and thinkers in Angola: You are the heart and inspiration of this illuminated codex.',
  },
  AG: {
    code: 'AG',
    name: 'Antigua and Barbuda',
    flagEmoji: '🇦🇬',
    colors: ["#ce1126","#ffffff","#0072ce","#ffd100","#000000"],
    accent: '#0072ce',
    symbolName: 'Rising Sun Over the Caribbean',
    tributeMessage: 'To our scholars, readers, and thinkers in Antigua and Barbuda: You are the heart and inspiration of this illuminated codex.',
  },
  AR: {
    code: 'AR',
    name: 'Argentina',
    flagEmoji: '🇦🇷',
    colors: ["#75aadb","#ffffff","#f6b40e"],
    accent: '#75aadb',
    symbolName: 'Sun of May',
    tributeMessage: 'To our scholars, readers, and thinkers in Argentina: You are the heart and inspiration of this illuminated codex.',
  },
  AM: {
    code: 'AM',
    name: 'Armenia',
    flagEmoji: '🇦🇲',
    colors: ["#d90012","#0033a0","#f2a800"],
    accent: '#d90012',
    symbolName: 'Mount Ararat Crest',
    tributeMessage: 'To our scholars, readers, and thinkers in Armenia: You are the heart and inspiration of this illuminated codex.',
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    flagEmoji: '🇦🇺',
    colors: ["#00008b","#ffffff","#ff0000"],
    accent: '#00843d',
    symbolName: 'Southern Cross & Commonwealth Star',
    tributeMessage: 'To our scholars, readers, and thinkers in Australia: You are the heart and inspiration of this illuminated codex.',
  },
  AT: {
    code: 'AT',
    name: 'Austria',
    flagEmoji: '🇦🇹',
    colors: ["#ed2939","#ffffff"],
    accent: '#ed2939',
    symbolName: 'Austrian Bindenschild',
    tributeMessage: 'To our scholars, readers, and thinkers in Austria: You are the heart and inspiration of this illuminated codex.',
  },
  AZ: {
    code: 'AZ',
    name: 'Azerbaijan',
    flagEmoji: '🇦🇿',
    colors: ["#0092bc","#e4002b","#009739"],
    accent: '#0092bc',
    symbolName: 'Eight-pointed Star and Crescent',
    tributeMessage: 'To our scholars, readers, and thinkers in Azerbaijan: You are the heart and inspiration of this illuminated codex.',
  },
  BS: {
    code: 'BS',
    name: 'Bahamas',
    flagEmoji: '🇧🇸',
    colors: ["#007788","#ffc72c","#000000"],
    accent: '#007788',
    symbolName: 'Aquamarine Chevron and Sun',
    tributeMessage: 'To our scholars, readers, and thinkers in Bahamas: You are the heart and inspiration of this illuminated codex.',
  },
  BH: {
    code: 'BH',
    name: 'Bahrain',
    flagEmoji: '🇧🇭',
    colors: ["#ce1126","#ffffff"],
    accent: '#ce1126',
    symbolName: 'Five Serrated White Points',
    tributeMessage: 'To our scholars, readers, and thinkers in Bahrain: You are the heart and inspiration of this illuminated codex.',
  },
  BD: {
    code: 'BD',
    name: 'Bangladesh',
    flagEmoji: '🇧🇩',
    colors: ["#006a4e","#f42a41"],
    accent: '#006a4e',
    symbolName: 'Red Sun of Bengal',
    tributeMessage: 'To our scholars, readers, and thinkers in Bangladesh: You are the heart and inspiration of this illuminated codex.',
  },
  BB: {
    code: 'BB',
    name: 'Barbados',
    flagEmoji: '🇧🇧',
    colors: ["#00267f","#ffc72c","#000000"],
    accent: '#00267f',
    symbolName: 'Broken Trident of Neptune',
    tributeMessage: 'To our scholars, readers, and thinkers in Barbados: You are the heart and inspiration of this illuminated codex.',
  },
  BY: {
    code: 'BY',
    name: 'Belarus',
    flagEmoji: '🇧🇾',
    colors: ["#c8313e","#4aa657","#ffffff"],
    accent: '#c8313e',
    symbolName: 'Ruchnik Traditional Ornament',
    tributeMessage: 'To our scholars, readers, and thinkers in Belarus: You are the heart and inspiration of this illuminated codex.',
  },
  BE: {
    code: 'BE',
    name: 'Belgium',
    flagEmoji: '🇧🇪',
    colors: ["#000000","#ffd90c","#ed2939"],
    accent: '#ffd90c',
    symbolName: 'Brabant Golden Lion',
    tributeMessage: 'To our scholars, readers, and thinkers in Belgium: You are the heart and inspiration of this illuminated codex.',
  },
  BZ: {
    code: 'BZ',
    name: 'Belize',
    flagEmoji: '🇧🇿',
    colors: ["#003f87","#ce1126","#ffffff"],
    accent: '#003f87',
    symbolName: 'Mahogany Tree & Shield',
    tributeMessage: 'To our scholars, readers, and thinkers in Belize: You are the heart and inspiration of this illuminated codex.',
  },
  BJ: {
    code: 'BJ',
    name: 'Benin',
    flagEmoji: '🇧🇯',
    colors: ["#008751","#fcd116","#e8112d"],
    accent: '#008751',
    symbolName: 'Pan-African Tricolor of Dahomey',
    tributeMessage: 'To our scholars, readers, and thinkers in Benin: You are the heart and inspiration of this illuminated codex.',
  },
  BT: {
    code: 'BT',
    name: 'Bhutan',
    flagEmoji: '🇧🇹',
    colors: ["#ffcc00","#ff4e12","#ffffff"],
    accent: '#ffcc00',
    symbolName: 'Druk Thunder Dragon',
    tributeMessage: 'To our scholars, readers, and thinkers in Bhutan: You are the heart and inspiration of this illuminated codex.',
  },
  BO: {
    code: 'BO',
    name: 'Bolivia',
    flagEmoji: '🇧🇴',
    colors: ["#d52b1e","#fcd116","#007934"],
    accent: '#d52b1e',
    symbolName: 'Condor of the Andes',
    tributeMessage: 'To our scholars, readers, and thinkers in Bolivia: You are the heart and inspiration of this illuminated codex.',
  },
  BA: {
    code: 'BA',
    name: 'Bosnia and Herzegovina',
    flagEmoji: '🇧🇦',
    colors: ["#002395","#fecb00","#ffffff"],
    accent: '#002395',
    symbolName: 'Golden Triangle of Unity',
    tributeMessage: 'To our scholars, readers, and thinkers in Bosnia and Herzegovina: You are the heart and inspiration of this illuminated codex.',
  },
  BW: {
    code: 'BW',
    name: 'Botswana',
    flagEmoji: '🇧🇼',
    colors: ["#75aadb","#000000","#ffffff"],
    accent: '#75aadb',
    symbolName: 'Pula Zebra Shield',
    tributeMessage: 'To our scholars, readers, and thinkers in Botswana: You are the heart and inspiration of this illuminated codex.',
  },
  BR: {
    code: 'BR',
    name: 'Brazil',
    flagEmoji: '🇧🇷',
    colors: ["#009739","#fedd00","#002776"],
    accent: '#009739',
    symbolName: 'Celestial Globe of the Southern Cross',
    tributeMessage: 'To our scholars, readers, and thinkers in Brazil: You are the heart and inspiration of this illuminated codex.',
  },
  BN: {
    code: 'BN',
    name: 'Brunei',
    flagEmoji: '🇧🇳',
    colors: ["#f7e017","#ffffff","#000000","#cc0000"],
    accent: '#f7e017',
    symbolName: 'Royal Crest of Sultanate',
    tributeMessage: 'To our scholars, readers, and thinkers in Brunei: You are the heart and inspiration of this illuminated codex.',
  },
  BG: {
    code: 'BG',
    name: 'Bulgaria',
    flagEmoji: '🇧🇬',
    colors: ["#ffffff","#00966e","#d62612"],
    accent: '#00966e',
    symbolName: 'Balkan Lion Rampant',
    tributeMessage: 'To our scholars, readers, and thinkers in Bulgaria: You are the heart and inspiration of this illuminated codex.',
  },
  BF: {
    code: 'BF',
    name: 'Burkina Faso',
    flagEmoji: '🇧🇫',
    colors: ["#ef2b2d","#009e49","#fcd116"],
    accent: '#ef2b2d',
    symbolName: 'Golden Star of the Sahel',
    tributeMessage: 'To our scholars, readers, and thinkers in Burkina Faso: You are the heart and inspiration of this illuminated codex.',
  },
  BI: {
    code: 'BI',
    name: 'Burundi',
    flagEmoji: '🇧🇮',
    colors: ["#ce1126","#1eb53a","#ffffff"],
    accent: '#1eb53a',
    symbolName: 'Three Stars of Unity & Progress',
    tributeMessage: 'To our scholars, readers, and thinkers in Burundi: You are the heart and inspiration of this illuminated codex.',
  },
  CV: {
    code: 'CV',
    name: 'Cabo Verde',
    flagEmoji: '🇨🇻',
    colors: ["#003893","#ffffff","#cf2027","#fed100"],
    accent: '#003893',
    symbolName: 'Ten Golden Island Stars',
    tributeMessage: 'To our scholars, readers, and thinkers in Cabo Verde: You are the heart and inspiration of this illuminated codex.',
  },
  KH: {
    code: 'KH',
    name: 'Cambodia',
    flagEmoji: '🇰🇭',
    colors: ["#032ea1","#ed1b24","#ffffff"],
    accent: '#ed1b24',
    symbolName: 'Angkor Wat Towers',
    tributeMessage: 'To our scholars, readers, and thinkers in Cambodia: You are the heart and inspiration of this illuminated codex.',
  },
  CM: {
    code: 'CM',
    name: 'Cameroon',
    flagEmoji: '🇨🇲',
    colors: ["#007a5e","#ce1126","#fcd116"],
    accent: '#007a5e',
    symbolName: 'Golden Star of Unity',
    tributeMessage: 'To our scholars, readers, and thinkers in Cameroon: You are the heart and inspiration of this illuminated codex.',
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    flagEmoji: '🇨🇦',
    colors: ["#ff0000","#ffffff"],
    accent: '#ff0000',
    symbolName: 'Eleven-Pointed Maple Leaf',
    tributeMessage: 'To our listeners across Canada: From coast to coast to coast, thank you for exploring with AuRA.',
  },
  CF: {
    code: 'CF',
    name: 'Central African Republic',
    flagEmoji: '🇨🇫',
    colors: ["#003082","#ffffff","#289728","#ffce00","#d21034"],
    accent: '#003082',
    symbolName: 'Guiding Star of Oubangui',
    tributeMessage: 'To our scholars, readers, and thinkers in Central African Republic: You are the heart and inspiration of this illuminated codex.',
  },
  TD: {
    code: 'TD',
    name: 'Chad',
    flagEmoji: '🇹🇩',
    colors: ["#002664","#fecb00","#c60c30"],
    accent: '#002664',
    symbolName: 'Sahel Tricolor of Courage',
    tributeMessage: 'To our scholars, readers, and thinkers in Chad: You are the heart and inspiration of this illuminated codex.',
  },
  CL: {
    code: 'CL',
    name: 'Chile',
    flagEmoji: '🇨🇱',
    colors: ["#0032a0","#ffffff","#d52b1e"],
    accent: '#0032a0',
    symbolName: 'Lone Star of the Andes (La Estrella Solitaria)',
    tributeMessage: 'To our scholars, readers, and thinkers in Chile: You are the heart and inspiration of this illuminated codex.',
  },
  CN: {
    code: 'CN',
    name: 'China',
    flagEmoji: '🇨🇳',
    colors: ["#ee1c25","#ffff00"],
    accent: '#ee1c25',
    symbolName: 'Five Stars of the Republic',
    tributeMessage: 'To our scholars, readers, and thinkers in China: You are the heart and inspiration of this illuminated codex.',
  },
  CO: {
    code: 'CO',
    name: 'Colombia',
    flagEmoji: '🇨🇴',
    colors: ["#fcd116","#003893","#ce1126"],
    accent: '#fcd116',
    symbolName: 'Golden Andean Condor & Tricolor',
    tributeMessage: 'To our scholars, readers, and thinkers in Colombia: You are the heart and inspiration of this illuminated codex.',
  },
  KM: {
    code: 'KM',
    name: 'Comoros',
    flagEmoji: '🇰🇲',
    colors: ["#ffc726","#ffffff","#ce1126","#002f6c","#008000"],
    accent: '#008000',
    symbolName: 'Crescent and Four Island Stars',
    tributeMessage: 'To our scholars, readers, and thinkers in Comoros: You are the heart and inspiration of this illuminated codex.',
  },
  CG: {
    code: 'CG',
    name: 'Congo',
    flagEmoji: '🇨🇬',
    colors: ["#009543","#fbde4a","#dc241f"],
    accent: '#009543',
    symbolName: 'Equatorial Diagonal Stripes',
    tributeMessage: 'To our scholars, readers, and thinkers in Congo: You are the heart and inspiration of this illuminated codex.',
  },
  CD: {
    code: 'CD',
    name: 'DR Congo',
    flagEmoji: '🇨🇩',
    colors: ["#007fff","#fcd116","#ce1126"],
    accent: '#007fff',
    symbolName: 'Yellow Radiant Star of Katanga',
    tributeMessage: 'To our scholars, readers, and thinkers in DR Congo: You are the heart and inspiration of this illuminated codex.',
  },
  CR: {
    code: 'CR',
    name: 'Costa Rica',
    flagEmoji: '🇨🇷',
    colors: ["#001489","#ffffff","#da291c"],
    accent: '#da291c',
    symbolName: 'Three Volcanic Mountains & Stars',
    tributeMessage: 'To our scholars, readers, and thinkers in Costa Rica: You are the heart and inspiration of this illuminated codex.',
  },
  HR: {
    code: 'HR',
    name: 'Croatia',
    flagEmoji: '🇭🇷',
    colors: ["#ff0000","#ffffff","#0000ff"],
    accent: '#ff0000',
    symbolName: 'Historical Chequy Shield (Sahovnica)',
    tributeMessage: 'To our scholars, readers, and thinkers in Croatia: You are the heart and inspiration of this illuminated codex.',
  },
  CU: {
    code: 'CU',
    name: 'Cuba',
    flagEmoji: '🇨🇺',
    colors: ["#002a8f","#ffffff","#cf142b"],
    accent: '#cf142b',
    symbolName: 'White Star of Marti & Red Triangle',
    tributeMessage: 'To our scholars, readers, and thinkers in Cuba: You are the heart and inspiration of this illuminated codex.',
  },
  CY: {
    code: 'CY',
    name: 'Cyprus',
    flagEmoji: '🇨🇾',
    colors: ["#ffffff","#d47600","#4e6b36"],
    accent: '#d47600',
    symbolName: 'Copper Silhouette & Olive Branches',
    tributeMessage: 'To our scholars, readers, and thinkers in Cyprus: You are the heart and inspiration of this illuminated codex.',
  },
  CZ: {
    code: 'CZ',
    name: 'Czechia',
    flagEmoji: '🇨🇿',
    colors: ["#ffffff","#d7141a","#11457e"],
    accent: '#11457e',
    symbolName: 'Bohemian Double-tailed Lion',
    tributeMessage: 'To our scholars, readers, and thinkers in Czechia: You are the heart and inspiration of this illuminated codex.',
  },
  DK: {
    code: 'DK',
    name: 'Denmark',
    flagEmoji: '🇩🇰',
    colors: ["#c60c30","#ffffff"],
    accent: '#c60c30',
    symbolName: 'Dannebrog Scandinavian Cross',
    tributeMessage: 'To our scholars, readers, and thinkers in Denmark: You are the heart and inspiration of this illuminated codex.',
  },
  DJ: {
    code: 'DJ',
    name: 'Djibouti',
    flagEmoji: '🇩🇯',
    colors: ["#6ab2e7","#12ad2b","#ffffff","#d7141a"],
    accent: '#6ab2e7',
    symbolName: 'Red Star of Unity',
    tributeMessage: 'To our scholars, readers, and thinkers in Djibouti: You are the heart and inspiration of this illuminated codex.',
  },
  DM: {
    code: 'DM',
    name: 'Dominica',
    flagEmoji: '🇩🇲',
    colors: ["#006b3f","#fcd116","#000000","#ffffff","#d41c2c"],
    accent: '#006b3f',
    symbolName: 'Sisserou Parrot Crest',
    tributeMessage: 'To our scholars, readers, and thinkers in Dominica: You are the heart and inspiration of this illuminated codex.',
  },
  DO: {
    code: 'DO',
    name: 'Dominican Republic',
    flagEmoji: '🇩🇴',
    colors: ["#002f6c","#ce1126","#ffffff"],
    accent: '#002f6c',
    symbolName: 'White Cross of Liberty',
    tributeMessage: 'To our scholars, readers, and thinkers in Dominican Republic: You are the heart and inspiration of this illuminated codex.',
  },
  EC: {
    code: 'EC',
    name: 'Ecuador',
    flagEmoji: '🇪🇨',
    colors: ["#ffdd00","#034ea2","#ed1c24"],
    accent: '#ffdd00',
    symbolName: 'Condor of Chimborazo',
    tributeMessage: 'To our scholars, readers, and thinkers in Ecuador: You are the heart and inspiration of this illuminated codex.',
  },
  EG: {
    code: 'EG',
    name: 'Egypt',
    flagEmoji: '🇪🇬',
    colors: ["#c8102e","#ffffff","#000000","#c09838"],
    accent: '#c09838',
    symbolName: 'Golden Eagle of Saladin',
    tributeMessage: 'To our scholars, readers, and thinkers in Egypt: You are the heart and inspiration of this illuminated codex.',
  },
  SV: {
    code: 'SV',
    name: 'El Salvador',
    flagEmoji: '🇸🇻',
    colors: ["#0f47af","#ffffff"],
    accent: '#0f47af',
    symbolName: 'Phrygian Cap & Rainbow Emblem',
    tributeMessage: 'To our scholars, readers, and thinkers in El Salvador: You are the heart and inspiration of this illuminated codex.',
  },
  GQ: {
    code: 'GQ',
    name: 'Equatorial Guinea',
    flagEmoji: '🇬🇶',
    colors: ["#3e9a00","#ffffff","#e32118","#0073ce"],
    accent: '#0073ce',
    symbolName: 'Silk Cotton Tree of God',
    tributeMessage: 'To our scholars, readers, and thinkers in Equatorial Guinea: You are the heart and inspiration of this illuminated codex.',
  },
  ER: {
    code: 'ER',
    name: 'Eritrea',
    flagEmoji: '🇪🇷',
    colors: ["#00a3e0","#3e9a00","#ea1c24","#ffc72c"],
    accent: '#ea1c24',
    symbolName: 'Golden Olive Branch Wreath',
    tributeMessage: 'To our scholars, readers, and thinkers in Eritrea: You are the heart and inspiration of this illuminated codex.',
  },
  EE: {
    code: 'EE',
    name: 'Estonia',
    flagEmoji: '🇪🇪',
    colors: ["#0072ce","#000000","#ffffff"],
    accent: '#0072ce',
    symbolName: 'Three Blue Lions of Tallinn',
    tributeMessage: 'To our scholars, readers, and thinkers in Estonia: You are the heart and inspiration of this illuminated codex.',
  },
  SZ: {
    code: 'SZ',
    name: 'Eswatini',
    flagEmoji: '🇸🇿',
    colors: ["#4169e1","#ffd700","#b22222","#ffffff","#000000"],
    accent: '#ffd700',
    symbolName: 'Nguni Ox Shield and Spears',
    tributeMessage: 'To our scholars, readers, and thinkers in Eswatini: You are the heart and inspiration of this illuminated codex.',
  },
  ET: {
    code: 'ET',
    name: 'Ethiopia',
    flagEmoji: '🇪🇹',
    colors: ["#047857","#eab308","#dc2626"],
    accent: '#f59e0b',
    symbolName: 'Pentagram Star of Wisdom',
    tributeMessage: 'To our scholars, readers, and thinkers in Ethiopia: You are the heart and inspiration of this illuminated codex.',
  },
  FJ: {
    code: 'FJ',
    name: 'Fiji',
    flagEmoji: '🇫🇯',
    colors: ["#68bfe5","#ffffff","#d21034"],
    accent: '#68bfe5',
    symbolName: 'Dove of Peace & Sugar Cane Shield',
    tributeMessage: 'To our scholars, readers, and thinkers in Fiji: You are the heart and inspiration of this illuminated codex.',
  },
  FI: {
    code: 'FI',
    name: 'Finland',
    flagEmoji: '🇫🇮',
    colors: ["#ffffff","#003580"],
    accent: '#003580',
    symbolName: 'Siniristilippu Nordic Blue Cross',
    tributeMessage: 'To our scholars, readers, and thinkers in Finland: You are the heart and inspiration of this illuminated codex.',
  },
  FR: {
    code: 'FR',
    name: 'France',
    flagEmoji: '🇫🇷',
    colors: ["#002395","#ffffff","#ed2939"],
    accent: '#002395',
    symbolName: 'Tricolore & Gallic Rooster',
    tributeMessage: 'To our scholars, readers, and thinkers in France: You are the heart and inspiration of this illuminated codex.',
  },
  GA: {
    code: 'GA',
    name: 'Gabon',
    flagEmoji: '🇬🇦',
    colors: ["#009e60","#fcd116","#3a75c4"],
    accent: '#009e60',
    symbolName: 'Equator Sun & Atlantic Blue',
    tributeMessage: 'To our scholars, readers, and thinkers in Gabon: You are the heart and inspiration of this illuminated codex.',
  },
  GM: {
    code: 'GM',
    name: 'Gambia',
    flagEmoji: '🇬🇲',
    colors: ["#ce1126","#0c1c8c","#3ab54a","#ffffff"],
    accent: '#0c1c8c',
    symbolName: 'River Gambia Blue Ribbon',
    tributeMessage: 'To our scholars, readers, and thinkers in Gambia: You are the heart and inspiration of this illuminated codex.',
  },
  GE: {
    code: 'GE',
    name: 'Georgia',
    flagEmoji: '🇬🇪',
    colors: ["#ffffff","#ff0000"],
    accent: '#ff0000',
    symbolName: 'Five Holy Bolnisi Crosses',
    tributeMessage: 'To our scholars, readers, and thinkers in Georgia: You are the heart and inspiration of this illuminated codex.',
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    flagEmoji: '🇩🇪',
    colors: ["#000000","#dd0000","#ffcc00"],
    accent: '#dd0000',
    symbolName: 'Federal Eagle (Bundesadler)',
    tributeMessage: 'To our scholars, readers, and thinkers in Germany: You are the heart and inspiration of this illuminated codex.',
  },
  GH: {
    code: 'GH',
    name: 'Ghana',
    flagEmoji: '🇬🇭',
    colors: ["#ce1126","#fcd116","#006b3f","#000000"],
    accent: '#fcd116',
    symbolName: 'Lone Black Star of African Freedom',
    tributeMessage: 'To our scholars, readers, and thinkers in Ghana: You are the heart and inspiration of this illuminated codex.',
  },
  GR: {
    code: 'GR',
    name: 'Greece',
    flagEmoji: '🇬🇷',
    colors: ["#001489","#ffffff"],
    accent: '#001489',
    symbolName: 'Nine Hellenic Stripes & Orthodox Cross',
    tributeMessage: 'To our scholars, readers, and thinkers in Greece: You are the heart and inspiration of this illuminated codex.',
  },
  GD: {
    code: 'GD',
    name: 'Grenada',
    flagEmoji: '🇬🇩',
    colors: ["#ce1126","#ffd100","#007a3d"],
    accent: '#ffd100',
    symbolName: 'Clove of Nutmeg & Seven Stars',
    tributeMessage: 'To our scholars, readers, and thinkers in Grenada: You are the heart and inspiration of this illuminated codex.',
  },
  GT: {
    code: 'GT',
    name: 'Guatemala',
    flagEmoji: '🇬🇹',
    colors: ["#4997d0","#ffffff"],
    accent: '#4997d0',
    symbolName: 'Resplendent Quetzal Bird of Liberty',
    tributeMessage: 'To our scholars, readers, and thinkers in Guatemala: You are the heart and inspiration of this illuminated codex.',
  },
  GN: {
    code: 'GN',
    name: 'Guinea',
    flagEmoji: '🇬🇳',
    colors: ["#ce1126","#fcd116","#009460"],
    accent: '#ce1126',
    symbolName: 'Work, Justice, Solidarity Tricolor',
    tributeMessage: 'To our scholars, readers, and thinkers in Guinea: You are the heart and inspiration of this illuminated codex.',
  },
  GW: {
    code: 'GW',
    name: 'Guinea-Bissau',
    flagEmoji: '🇬🇼',
    colors: ["#ce1126","#fcd116","#009e49","#000000"],
    accent: '#fcd116',
    symbolName: 'Black Star of Amilcar Cabral',
    tributeMessage: 'To our scholars, readers, and thinkers in Guinea-Bissau: You are the heart and inspiration of this illuminated codex.',
  },
  GY: {
    code: 'GY',
    name: 'Guyana',
    flagEmoji: '🇬🇾',
    colors: ["#009e49","#ffd100","#ce1126","#000000","#ffffff"],
    accent: '#009e49',
    symbolName: 'Golden Arrowhead of El Dorado',
    tributeMessage: 'To our scholars, readers, and thinkers in Guyana: You are the heart and inspiration of this illuminated codex.',
  },
  HT: {
    code: 'HT',
    name: 'Haiti',
    flagEmoji: '🇭🇹',
    colors: ["#00209f","#d21034","#ffffff"],
    accent: '#00209f',
    symbolName: 'Palm Tree of Liberty & Cap of Independence',
    tributeMessage: 'To our scholars, readers, and thinkers in Haiti: You are the heart and inspiration of this illuminated codex.',
  },
  HN: {
    code: 'HN',
    name: 'Honduras',
    flagEmoji: '🇭🇳',
    colors: ["#0073cf","#ffffff"],
    accent: '#0073cf',
    symbolName: 'Five Stars of Central American Union',
    tributeMessage: 'To our scholars, readers, and thinkers in Honduras: You are the heart and inspiration of this illuminated codex.',
  },
  HU: {
    code: 'HU',
    name: 'Hungary',
    flagEmoji: '🇭🇺',
    colors: ["#ce2939","#ffffff","#477050"],
    accent: '#ce2939',
    symbolName: 'Double Cross & Holy Crown of Saint Stephen',
    tributeMessage: 'To our scholars, readers, and thinkers in Hungary: You are the heart and inspiration of this illuminated codex.',
  },
  IS: {
    code: 'IS',
    name: 'Iceland',
    flagEmoji: '🇮🇸',
    colors: ["#02529c","#ffffff","#dc1e35"],
    accent: '#02529c',
    symbolName: 'Nordic Fire & Ice Cross',
    tributeMessage: 'To our scholars, readers, and thinkers in Iceland: You are the heart and inspiration of this illuminated codex.',
  },
  IN: {
    code: 'IN',
    name: 'India',
    flagEmoji: '🇮🇳',
    colors: ["#ff9933","#ffffff","#128807","#000080"],
    accent: '#ff9933',
    symbolName: '24-Spoke Ashoka Chakra of Dharma',
    tributeMessage: 'To our scholars, readers, and thinkers in India: You are the heart and inspiration of this illuminated codex.',
  },
  ID: {
    code: 'ID',
    name: 'Indonesia',
    flagEmoji: '🇮🇩',
    colors: ["#ff0000","#ffffff"],
    accent: '#ff0000',
    symbolName: 'Sang Saka Merah-Putih & Garuda Pancasila',
    tributeMessage: 'To our scholars, readers, and thinkers in Indonesia: You are the heart and inspiration of this illuminated codex.',
  },
  IR: {
    code: 'IR',
    name: 'Iran',
    flagEmoji: '🇮🇷',
    colors: ["#239f40","#ffffff","#da0000"],
    accent: '#239f40',
    symbolName: 'Tulip Emblem of the Four Crescents',
    tributeMessage: 'To our scholars, readers, and thinkers in Iran: You are the heart and inspiration of this illuminated codex.',
  },
  IQ: {
    code: 'IQ',
    name: 'Iraq',
    flagEmoji: '🇮🇶',
    colors: ["#ce1126","#ffffff","#000000","#007a3d"],
    accent: '#007a3d',
    symbolName: 'Kufic Calligraphy of Sovereignty',
    tributeMessage: 'To our scholars, readers, and thinkers in Iraq: You are the heart and inspiration of this illuminated codex.',
  },
  IE: {
    code: 'IE',
    name: 'Ireland',
    flagEmoji: '🇮🇪',
    colors: ["#169b62","#ffffff","#ff883e"],
    accent: '#169b62',
    symbolName: 'Brian Boru Golden Harp & Shamrock',
    tributeMessage: 'To our scholars, readers, and thinkers in Ireland: You are the heart and inspiration of this illuminated codex.',
  },
  IL: {
    code: 'IL',
    name: 'Israel',
    flagEmoji: '🇮🇱',
    colors: ["#0038b8","#ffffff"],
    accent: '#0038b8',
    symbolName: 'Magen David (Shield of David)',
    tributeMessage: 'To our scholars, readers, and thinkers in Israel: You are the heart and inspiration of this illuminated codex.',
  },
  IT: {
    code: 'IT',
    name: 'Italy',
    flagEmoji: '🇮🇹',
    colors: ["#009246","#ffffff","#ce2b37"],
    accent: '#009246',
    symbolName: 'Stella d’Italia & Olive Oak Wreath',
    tributeMessage: 'To our scholars, readers, and thinkers in Italy: You are the heart and inspiration of this illuminated codex.',
  },
  CI: {
    code: 'CI',
    name: 'Ivory Coast',
    flagEmoji: '🇨🇮',
    colors: ["#f77f00","#ffffff","#009e60"],
    accent: '#f77f00',
    symbolName: 'Elephant Tusk & Savannah Orange',
    tributeMessage: 'To our scholars, readers, and thinkers in Ivory Coast: You are the heart and inspiration of this illuminated codex.',
  },
  JM: {
    code: 'JM',
    name: 'Jamaica',
    flagEmoji: '🇯🇲',
    colors: ["#007749","#ffd100","#000000"],
    accent: '#ffd100',
    symbolName: 'Golden Saltire of Hardships & Sun',
    tributeMessage: 'To our scholars, readers, and thinkers in Jamaica: You are the heart and inspiration of this illuminated codex.',
  },
  JP: {
    code: 'JP',
    name: 'Japan',
    flagEmoji: '🇯🇵',
    colors: ["#ffffff","#bc002d"],
    accent: '#bc002d',
    symbolName: 'Nisshoki (The Radiant Rising Sun Disc)',
    tributeMessage: 'To our listeners in Japan: Crafting timeless spatial acoustic harmony for your mindful reading.',
  },
  JO: {
    code: 'JO',
    name: 'Jordan',
    flagEmoji: '🇯🇴',
    colors: ["#000000","#ffffff","#007a3d","#ce1126"],
    accent: '#ce1126',
    symbolName: 'Seven-pointed Star of Al-Fatiha',
    tributeMessage: 'To our scholars, readers, and thinkers in Jordan: You are the heart and inspiration of this illuminated codex.',
  },
  KZ: {
    code: 'KZ',
    name: 'Kazakhstan',
    flagEmoji: '🇰🇿',
    colors: ["#00afca","#fec50c"],
    accent: '#00afca',
    symbolName: 'Steppe Eagle Soaring Under Golden Sun',
    tributeMessage: 'To our scholars, readers, and thinkers in Kazakhstan: You are the heart and inspiration of this illuminated codex.',
  },
  KE: {
    code: 'KE',
    name: 'Kenya',
    flagEmoji: '🇰🇪',
    colors: ["#09090b","#dc2626","#15803d","#ffffff"],
    accent: '#15803d',
    symbolName: 'Maasai Shield and Crossed White Spears',
    tributeMessage: 'To our listeners in Kenya: Harambee! Thank you for illuminating your learning journey with AuRA.',
  },
  KI: {
    code: 'KI',
    name: 'Kiribati',
    flagEmoji: '🇰🇮',
    colors: ["#ce1126","#00247d","#ffffff","#ffd100"],
    accent: '#ce1126',
    symbolName: 'Frigatebird Over Pacific Waves',
    tributeMessage: 'To our scholars, readers, and thinkers in Kiribati: You are the heart and inspiration of this illuminated codex.',
  },
  KP: {
    code: 'KP',
    name: 'North Korea',
    flagEmoji: '🇰🇵',
    colors: ["#024fa2","#ffffff","#ed1b24"],
    accent: '#ed1b24',
    symbolName: 'Red Star in White Disc',
    tributeMessage: 'To our scholars, readers, and thinkers in North Korea: You are the heart and inspiration of this illuminated codex.',
  },
  KR: {
    code: 'KR',
    name: 'South Korea',
    flagEmoji: '🇰🇷',
    colors: ["#ffffff","#cd2e3a","#0047a0","#000000"],
    accent: '#0047a0',
    symbolName: 'Taegeuk Cosmic Yin-Yang & Four Trigrams',
    tributeMessage: 'To our scholars, readers, and thinkers in South Korea: You are the heart and inspiration of this illuminated codex.',
  },
  KW: {
    code: 'KW',
    name: 'Kuwait',
    flagEmoji: '🇰🇼',
    colors: ["#007a3d","#ffffff","#ce1126","#000000"],
    accent: '#007a3d',
    symbolName: 'Black Trapezoid of Battlefield Honor',
    tributeMessage: 'To our scholars, readers, and thinkers in Kuwait: You are the heart and inspiration of this illuminated codex.',
  },
  KG: {
    code: 'KG',
    name: 'Kyrgyzstan',
    flagEmoji: '🇰🇬',
    colors: ["#e8112d","#ffe600"],
    accent: '#e8112d',
    symbolName: 'Tunduk (Crown of the Kyrgyz Yurt)',
    tributeMessage: 'To our scholars, readers, and thinkers in Kyrgyzstan: You are the heart and inspiration of this illuminated codex.',
  },
  LA: {
    code: 'LA',
    name: 'Laos',
    flagEmoji: '🇱🇦',
    colors: ["#ce1126","#002868","#ffffff"],
    accent: '#002868',
    symbolName: 'Full Moon Over the Mekong River',
    tributeMessage: 'To our scholars, readers, and thinkers in Laos: You are the heart and inspiration of this illuminated codex.',
  },
  LV: {
    code: 'LV',
    name: 'Latvia',
    flagEmoji: '🇱🇻',
    colors: ["#9e3039","#ffffff"],
    accent: '#9e3039',
    symbolName: 'Latvian Carmine Bicolor of Freedom',
    tributeMessage: 'To our scholars, readers, and thinkers in Latvia: You are the heart and inspiration of this illuminated codex.',
  },
  LB: {
    code: 'LB',
    name: 'Lebanon',
    flagEmoji: '🇱🇧',
    colors: ["#ed1c24","#ffffff","#00a651"],
    accent: '#00a651',
    symbolName: 'Immortal Green Cedar of Mount Lebanon',
    tributeMessage: 'To our scholars, readers, and thinkers in Lebanon: You are the heart and inspiration of this illuminated codex.',
  },
  LS: {
    code: 'LS',
    name: 'Lesotho',
    flagEmoji: '🇱🇸',
    colors: ["#00209f","#ffffff","#009543","#000000"],
    accent: '#00209f',
    symbolName: 'Mokorotlo Traditional Basotho Hat',
    tributeMessage: 'To our scholars, readers, and thinkers in Lesotho: You are the heart and inspiration of this illuminated codex.',
  },
  LR: {
    code: 'LR',
    name: 'Liberia',
    flagEmoji: '🇱🇷',
    colors: ["#ce1126","#ffffff","#002868"],
    accent: '#002868',
    symbolName: 'Lone White Star of Western Africa',
    tributeMessage: 'To our scholars, readers, and thinkers in Liberia: You are the heart and inspiration of this illuminated codex.',
  },
  LY: {
    code: 'LY',
    name: 'Libya',
    flagEmoji: '🇱🇾',
    colors: ["#e70013","#000000","#239e46","#ffffff"],
    accent: '#239e46',
    symbolName: 'Crescent and Star of the Cyrenaica',
    tributeMessage: 'To our scholars, readers, and thinkers in Libya: You are the heart and inspiration of this illuminated codex.',
  },
  LI: {
    code: 'LI',
    name: 'Liechtenstein',
    flagEmoji: '🇱🇮',
    colors: ["#002b7f","#ce1126","#ffd700"],
    accent: '#ffd700',
    symbolName: 'Princely Crown of Gold',
    tributeMessage: 'To our scholars, readers, and thinkers in Liechtenstein: You are the heart and inspiration of this illuminated codex.',
  },
  LT: {
    code: 'LT',
    name: 'Lithuania',
    flagEmoji: '🇱🇹',
    colors: ["#fdb913","#006a44","#c1272d"],
    accent: '#fdb913',
    symbolName: 'Columns of Gediminas & Vytis Knight',
    tributeMessage: 'To our scholars, readers, and thinkers in Lithuania: You are the heart and inspiration of this illuminated codex.',
  },
  LU: {
    code: 'LU',
    name: 'Luxembourg',
    flagEmoji: '🇱🇺',
    colors: ["#ea141d","#ffffff","#00a1de"],
    accent: '#00a1de',
    symbolName: 'Roude Leiw (Red Lion of Luxembourg)',
    tributeMessage: 'To our scholars, readers, and thinkers in Luxembourg: You are the heart and inspiration of this illuminated codex.',
  },
  MG: {
    code: 'MG',
    name: 'Madagascar',
    flagEmoji: '🇲🇬',
    colors: ["#ffffff","#fc3d32","#007e3a"],
    accent: '#007e3a',
    symbolName: 'White Purity & Merina Coral',
    tributeMessage: 'To our scholars, readers, and thinkers in Madagascar: You are the heart and inspiration of this illuminated codex.',
  },
  MW: {
    code: 'MW',
    name: 'Malawi',
    flagEmoji: '🇲🇼',
    colors: ["#000000","#ce1126","#007a3d"],
    accent: '#ce1126',
    symbolName: 'Rising Sun of Hope (Kwacha)',
    tributeMessage: 'To our scholars, readers, and thinkers in Malawi: You are the heart and inspiration of this illuminated codex.',
  },
  MY: {
    code: 'MY',
    name: 'Malaysia',
    flagEmoji: '🇲🇾',
    colors: ["#cc0000","#ffffff","#010066","#ffcc00"],
    accent: '#ffcc00',
    symbolName: 'Jalur Gemilang (Stripes of Glory & 14-Point Star)',
    tributeMessage: 'To our scholars, readers, and thinkers in Malaysia: You are the heart and inspiration of this illuminated codex.',
  },
  MV: {
    code: 'MV',
    name: 'Maldives',
    flagEmoji: '🇲🇻',
    colors: ["#d21034","#007e3a","#ffffff"],
    accent: '#007e3a',
    symbolName: 'White Crescent of the Indian Ocean',
    tributeMessage: 'To our scholars, readers, and thinkers in Maldives: You are the heart and inspiration of this illuminated codex.',
  },
  ML: {
    code: 'ML',
    name: 'Mali',
    flagEmoji: '🇲🇱',
    colors: ["#14b53a","#fcd116","#ce1126"],
    accent: '#14b53a',
    symbolName: 'Sub-Saharan Unity Tricolor',
    tributeMessage: 'To our scholars, readers, and thinkers in Mali: You are the heart and inspiration of this illuminated codex.',
  },
  MT: {
    code: 'MT',
    name: 'Malta',
    flagEmoji: '🇲🇹',
    colors: ["#ffffff","#cf142b"],
    accent: '#cf142b',
    symbolName: 'George Cross of Valour',
    tributeMessage: 'To our scholars, readers, and thinkers in Malta: You are the heart and inspiration of this illuminated codex.',
  },
  MH: {
    code: 'MH',
    name: 'Marshall Islands',
    flagEmoji: '🇲🇭',
    colors: ["#003893","#e05a47","#ffffff"],
    accent: '#e05a47',
    symbolName: 'Radiant 24-Point Star of the Pacific',
    tributeMessage: 'To our scholars, readers, and thinkers in Marshall Islands: You are the heart and inspiration of this illuminated codex.',
  },
  MR: {
    code: 'MR',
    name: 'Mauritania',
    flagEmoji: '🇲🇷',
    colors: ["#00a950","#ffd100","#d01c1c"],
    accent: '#00a950',
    symbolName: 'Golden Crescent and Five-point Star',
    tributeMessage: 'To our scholars, readers, and thinkers in Mauritania: You are the heart and inspiration of this illuminated codex.',
  },
  MU: {
    code: 'MU',
    name: 'Mauritius',
    flagEmoji: '🇲🇺',
    colors: ["#ea2839","#1a2061","#ffd700","#00a14b"],
    accent: '#ffd700',
    symbolName: 'Four Bands of the Star and Key of the Ocean',
    tributeMessage: 'To our scholars, readers, and thinkers in Mauritius: You are the heart and inspiration of this illuminated codex.',
  },
  MX: {
    code: 'MX',
    name: 'Mexico',
    flagEmoji: '🇲🇽',
    colors: ["#006847","#ffffff","#ce1126"],
    accent: '#006847',
    symbolName: 'Golden Eagle Devouring Serpent on Nopal Cactus',
    tributeMessage: 'To our scholars, readers, and thinkers in Mexico: You are the heart and inspiration of this illuminated codex.',
  },
  FM: {
    code: 'FM',
    name: 'Micronesia',
    flagEmoji: '🇫🇲',
    colors: ["#6799cc","#ffffff"],
    accent: '#6799cc',
    symbolName: 'Four Island Stars of Caroline Archipelago',
    tributeMessage: 'To our scholars, readers, and thinkers in Micronesia: You are the heart and inspiration of this illuminated codex.',
  },
  MD: {
    code: 'MD',
    name: 'Moldova',
    flagEmoji: '🇲🇩',
    colors: ["#003da5","#ffd100","#c8102e"],
    accent: '#003da5',
    symbolName: 'Aurochs Head & Walachian Eagle',
    tributeMessage: 'To our scholars, readers, and thinkers in Moldova: You are the heart and inspiration of this illuminated codex.',
  },
  MC: {
    code: 'MC',
    name: 'Monaco',
    flagEmoji: '🇲🇨',
    colors: ["#ce1126","#ffffff"],
    accent: '#ce1126',
    symbolName: 'Grimaldi Lozengy Arms',
    tributeMessage: 'To our scholars, readers, and thinkers in Monaco: You are the heart and inspiration of this illuminated codex.',
  },
  MN: {
    code: 'MN',
    name: 'Mongolia',
    flagEmoji: '🇲🇳',
    colors: ["#c4272f","#0066b2","#ffd900"],
    accent: '#0066b2',
    symbolName: 'Soyombo Emblem of Fire, Sun & Moon',
    tributeMessage: 'To our scholars, readers, and thinkers in Mongolia: You are the heart and inspiration of this illuminated codex.',
  },
  ME: {
    code: 'ME',
    name: 'Montenegro',
    flagEmoji: '🇲🇪',
    colors: ["#c40308","#d4af37"],
    accent: '#d4af37',
    symbolName: 'Two-headed Golden Eagle of Petrovic',
    tributeMessage: 'To our scholars, readers, and thinkers in Montenegro: You are the heart and inspiration of this illuminated codex.',
  },
  MA: {
    code: 'MA',
    name: 'Morocco',
    flagEmoji: '🇲🇦',
    colors: ["#c1272d","#006233"],
    accent: '#006233',
    symbolName: 'Solomon’s Green Pentagram Seal',
    tributeMessage: 'To our scholars, readers, and thinkers in Morocco: You are the heart and inspiration of this illuminated codex.',
  },
  MZ: {
    code: 'MZ',
    name: 'Mozambique',
    flagEmoji: '🇲🇿',
    colors: ["#009639","#000000","#ffd100","#ffffff","#d21034"],
    accent: '#009639',
    symbolName: 'Star, Kalashnikov, Hoe and Book of Wisdom',
    tributeMessage: 'To our scholars, readers, and thinkers in Mozambique: You are the heart and inspiration of this illuminated codex.',
  },
  MM: {
    code: 'MM',
    name: 'Myanmar',
    flagEmoji: '🇲🇲',
    colors: ["#fecb00","#34b233","#ea2839","#ffffff"],
    accent: '#fecb00',
    symbolName: 'Large Five-Pointed White Star',
    tributeMessage: 'To our scholars, readers, and thinkers in Myanmar: You are the heart and inspiration of this illuminated codex.',
  },
  NA: {
    code: 'NA',
    name: 'Namibia',
    flagEmoji: '🇳🇦',
    colors: ["#003580","#d21034","#009543","#ffffff","#ffce00"],
    accent: '#003580',
    symbolName: 'Golden Sun of Twelve Rays',
    tributeMessage: 'To our scholars, readers, and thinkers in Namibia: You are the heart and inspiration of this illuminated codex.',
  },
  NR: {
    code: 'NR',
    name: 'Nauru',
    flagEmoji: '🇳🇷',
    colors: ["#002b7f","#ffc72c","#ffffff"],
    accent: '#ffc72c',
    symbolName: 'Twelve-Pointed Star South of Equator',
    tributeMessage: 'To our scholars, readers, and thinkers in Nauru: You are the heart and inspiration of this illuminated codex.',
  },
  NP: {
    code: 'NP',
    name: 'Nepal',
    flagEmoji: '🇳🇵',
    colors: ["#dc143c","#003893","#ffffff"],
    accent: '#dc143c',
    symbolName: 'Double Pennon of Sun and Crescent Moon',
    tributeMessage: 'To our scholars, readers, and thinkers in Nepal: You are the heart and inspiration of this illuminated codex.',
  },
  NL: {
    code: 'NL',
    name: 'Netherlands',
    flagEmoji: '🇳🇱',
    colors: ["#ae1c28","#ffffff","#21468b"],
    accent: '#ae1c28',
    symbolName: 'House of Orange Lion of Batavia',
    tributeMessage: 'To our scholars, readers, and thinkers in Netherlands: You are the heart and inspiration of this illuminated codex.',
  },
  NZ: {
    code: 'NZ',
    name: 'New Zealand',
    flagEmoji: '🇳🇿',
    colors: ["#00247d","#cc142b","#ffffff"],
    accent: '#00247d',
    symbolName: 'Southern Cross (Te Punga) of Four Red Stars',
    tributeMessage: 'To our scholars, readers, and thinkers in New Zealand: You are the heart and inspiration of this illuminated codex.',
  },
  NI: {
    code: 'NI',
    name: 'Nicaragua',
    flagEmoji: '🇳🇮',
    colors: ["#0067c6","#ffffff"],
    accent: '#0067c6',
    symbolName: 'Triangle of Equality & Five Volcanoes',
    tributeMessage: 'To our scholars, readers, and thinkers in Nicaragua: You are the heart and inspiration of this illuminated codex.',
  },
  NE: {
    code: 'NE',
    name: 'Niger',
    flagEmoji: '🇳🇪',
    colors: ["#e05206","#ffffff","#0db02b"],
    accent: '#e05206',
    symbolName: 'Orange Sun of the Sahara',
    tributeMessage: 'To our scholars, readers, and thinkers in Niger: You are the heart and inspiration of this illuminated codex.',
  },
  NG: {
    code: 'NG',
    name: 'Nigeria',
    flagEmoji: '🇳🇬',
    colors: ["#008751","#ffffff"],
    accent: '#008751',
    symbolName: 'Eagle and Two White Horses of River Niger',
    tributeMessage: 'To our readers in Nigeria: Built with pride for your vibrant intellect and boundless ambition.',
  },
  MK: {
    code: 'MK',
    name: 'North Macedonia',
    flagEmoji: '🇲🇰',
    colors: ["#d20000","#ffe600"],
    accent: '#ffe600',
    symbolName: 'Golden Sun of Liberty (Vergina Radiance)',
    tributeMessage: 'To our scholars, readers, and thinkers in North Macedonia: You are the heart and inspiration of this illuminated codex.',
  },
  NO: {
    code: 'NO',
    name: 'Norway',
    flagEmoji: '🇳🇴',
    colors: ["#ba0c2f","#ffffff","#00205b"],
    accent: '#ba0c2f',
    symbolName: 'St. Olav Nordic Cross of the Fjords',
    tributeMessage: 'To our scholars, readers, and thinkers in Norway: You are the heart and inspiration of this illuminated codex.',
  },
  OM: {
    code: 'OM',
    name: 'Oman',
    flagEmoji: '🇴🇲',
    colors: ["#db161d","#ffffff","#008000"],
    accent: '#db161d',
    symbolName: 'Khanjar Dagger and Sheathed Swords',
    tributeMessage: 'To our scholars, readers, and thinkers in Oman: You are the heart and inspiration of this illuminated codex.',
  },
  PK: {
    code: 'PK',
    name: 'Pakistan',
    flagEmoji: '🇵🇰',
    colors: ["#01411c","#ffffff"],
    accent: '#01411c',
    symbolName: 'Crescent Moon of Progress & Star of Light',
    tributeMessage: 'To our scholars, readers, and thinkers in Pakistan: You are the heart and inspiration of this illuminated codex.',
  },
  PW: {
    code: 'PW',
    name: 'Palau',
    flagEmoji: '🇵🇼',
    colors: ["#0099ff","#ffd100"],
    accent: '#0099ff',
    symbolName: 'Golden Full Moon Over the Blue Pacific',
    tributeMessage: 'To our scholars, readers, and thinkers in Palau: You are the heart and inspiration of this illuminated codex.',
  },
  PS: {
    code: 'PS',
    name: 'Palestine',
    flagEmoji: '🇵🇸',
    colors: ["#000000","#ffffff","#007a3d","#e4312b"],
    accent: '#007a3d',
    symbolName: 'Triangle of Jerusalem & Olive Groves',
    tributeMessage: 'To our scholars, readers, and thinkers in Palestine: You are the heart and inspiration of this illuminated codex.',
  },
  PA: {
    code: 'PA',
    name: 'Panama',
    flagEmoji: '🇵🇦',
    colors: ["#ffffff","#005293","#d21034"],
    accent: '#005293',
    symbolName: 'Blue and Red Stars of Concord',
    tributeMessage: 'To our scholars, readers, and thinkers in Panama: You are the heart and inspiration of this illuminated codex.',
  },
  PG: {
    code: 'PG',
    name: 'Papua New Guinea',
    flagEmoji: '🇵🇬',
    colors: ["#000000","#ce1126","#ffd100","#ffffff"],
    accent: '#ffd100',
    symbolName: 'Raggiana Bird of Paradise & Southern Cross',
    tributeMessage: 'To our scholars, readers, and thinkers in Papua New Guinea: You are the heart and inspiration of this illuminated codex.',
  },
  PY: {
    code: 'PY',
    name: 'Paraguay',
    flagEmoji: '🇵🇾',
    colors: ["#d52b1e","#ffffff","#0038a8"],
    accent: '#0038a8',
    symbolName: 'Star of May & Lion of Peace',
    tributeMessage: 'To our scholars, readers, and thinkers in Paraguay: You are the heart and inspiration of this illuminated codex.',
  },
  PE: {
    code: 'PE',
    name: 'Peru',
    flagEmoji: '🇵🇪',
    colors: ["#d91023","#ffffff"],
    accent: '#d91023',
    symbolName: 'Vicuna, Cinchona Tree and Cornucopia of Gold',
    tributeMessage: 'To our scholars, readers, and thinkers in Peru: You are the heart and inspiration of this illuminated codex.',
  },
  PH: {
    code: 'PH',
    name: 'Philippines',
    flagEmoji: '🇵🇭',
    colors: ["#0038a8","#ce1126","#ffffff","#fcd116"],
    accent: '#fcd116',
    symbolName: 'Eight-Ray Golden Sun and Three Island Stars',
    tributeMessage: 'To our scholars, readers, and thinkers in Philippines: You are the heart and inspiration of this illuminated codex.',
  },
  PL: {
    code: 'PL',
    name: 'Poland',
    flagEmoji: '🇵🇱',
    colors: ["#ffffff","#dc143c"],
    accent: '#dc143c',
    symbolName: 'Crowned White Eagle of the Piast Dynasty',
    tributeMessage: 'To our scholars, readers, and thinkers in Poland: You are the heart and inspiration of this illuminated codex.',
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    flagEmoji: '🇵🇹',
    colors: ["#006600","#ff0000","#ffff00"],
    accent: '#006600',
    symbolName: 'Armillary Sphere & Five Quinas Shields',
    tributeMessage: 'To our scholars, readers, and thinkers in Portugal: You are the heart and inspiration of this illuminated codex.',
  },
  QA: {
    code: 'QA',
    name: 'Qatar',
    flagEmoji: '🇶🇦',
    colors: ["#8a1538","#ffffff"],
    accent: '#8a1538',
    symbolName: 'Nine Serrated Points of the Arabian Gulf',
    tributeMessage: 'To our scholars, readers, and thinkers in Qatar: You are the heart and inspiration of this illuminated codex.',
  },
  RO: {
    code: 'RO',
    name: 'Romania',
    flagEmoji: '🇷🇴',
    colors: ["#002b7f","#fcd116","#ce1126"],
    accent: '#002b7f',
    symbolName: 'Golden Aquila Eagle of Wallachia',
    tributeMessage: 'To our scholars, readers, and thinkers in Romania: You are the heart and inspiration of this illuminated codex.',
  },
  RU: {
    code: 'RU',
    name: 'Russia',
    flagEmoji: '🇷🇺',
    colors: ["#ffffff","#0039a6","#d52b1e"],
    accent: '#0039a6',
    symbolName: 'Double-Headed Golden Eagle of Saint George',
    tributeMessage: 'To our scholars, readers, and thinkers in Russia: You are the heart and inspiration of this illuminated codex.',
  },
  RW: {
    code: 'RW',
    name: 'Rwanda',
    flagEmoji: '🇷🇼',
    colors: ["#00a1de","#fad201","#20603d"],
    accent: '#00a1de',
    symbolName: 'Golden Radiant Sun of Thousand Hills',
    tributeMessage: 'To our scholars, readers, and thinkers in Rwanda: You are the heart and inspiration of this illuminated codex.',
  },
  KN: {
    code: 'KN',
    name: 'Saint Kitts and Nevis',
    flagEmoji: '🇰🇳',
    colors: ["#009e49","#ce1126","#000000","#fcd116","#ffffff"],
    accent: '#009e49',
    symbolName: 'Two White Stars of Hope and Liberty',
    tributeMessage: 'To our scholars, readers, and thinkers in Saint Kitts and Nevis: You are the heart and inspiration of this illuminated codex.',
  },
  LC: {
    code: 'LC',
    name: 'Saint Lucia',
    flagEmoji: '🇱🇨',
    colors: ["#65c5f3","#ffffff","#000000","#fcd116"],
    accent: '#65c5f3',
    symbolName: 'Twin Volcanic Pitons of the Caribbean',
    tributeMessage: 'To our scholars, readers, and thinkers in Saint Lucia: You are the heart and inspiration of this illuminated codex.',
  },
  VC: {
    code: 'VC',
    name: 'Saint Vincent and the Grenadines',
    flagEmoji: '🇻🇨',
    colors: ["#002f6c","#ffd100","#007a3d"],
    accent: '#ffd100',
    symbolName: 'Three Emerald Diamonds of the Antilles',
    tributeMessage: 'To our scholars, readers, and thinkers in Saint Vincent and the Grenadines: You are the heart and inspiration of this illuminated codex.',
  },
  WS: {
    code: 'WS',
    name: 'Samoa',
    flagEmoji: '🇼🇸',
    colors: ["#ce1126","#002b7f","#ffffff"],
    accent: '#002b7f',
    symbolName: 'Southern Cross of Five White Stars',
    tributeMessage: 'To our scholars, readers, and thinkers in Samoa: You are the heart and inspiration of this illuminated codex.',
  },
  SM: {
    code: 'SM',
    name: 'San Marino',
    flagEmoji: '🇸🇲',
    colors: ["#ffffff","#5eb6e4"],
    accent: '#5eb6e4',
    symbolName: 'Three Towers of Mount Titano (Guaita, Cesta, Montale)',
    tributeMessage: 'To our scholars, readers, and thinkers in San Marino: You are the heart and inspiration of this illuminated codex.',
  },
  ST: {
    code: 'ST',
    name: 'Sao Tome and Principe',
    flagEmoji: '🇸🇹',
    colors: ["#12ad2b","#ffce00","#d21034","#000000"],
    accent: '#12ad2b',
    symbolName: 'Two Black Stars of the Gulf of Guinea',
    tributeMessage: 'To our scholars, readers, and thinkers in Sao Tome and Principe: You are the heart and inspiration of this illuminated codex.',
  },
  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    flagEmoji: '🇸🇦',
    colors: ["#006c35","#ffffff"],
    accent: '#006c35',
    symbolName: 'Shahada Script & Sword of Justice',
    tributeMessage: 'To our scholars, readers, and thinkers in Saudi Arabia: You are the heart and inspiration of this illuminated codex.',
  },
  SN: {
    code: 'SN',
    name: 'Senegal',
    flagEmoji: '🇸🇳',
    colors: ["#00853f","#fdef42","#e31b23"],
    accent: '#00853f',
    symbolName: 'Five-Pointed Green Star of Hope',
    tributeMessage: 'To our scholars, readers, and thinkers in Senegal: You are the heart and inspiration of this illuminated codex.',
  },
  RS: {
    code: 'RS',
    name: 'Serbia',
    flagEmoji: '🇷🇸',
    colors: ["#c6363c","#0c4076","#ffffff"],
    accent: '#c6363c',
    symbolName: 'White Double-Headed Eagle & Nemanjic Crown',
    tributeMessage: 'To our scholars, readers, and thinkers in Serbia: You are the heart and inspiration of this illuminated codex.',
  },
  SC: {
    code: 'SC',
    name: 'Seychelles',
    flagEmoji: '🇸🇨',
    colors: ["#003d88","#fed100","#d21034","#ffffff","#007a3d"],
    accent: '#003d88',
    symbolName: 'Five Radiating Rays of the Indian Ocean',
    tributeMessage: 'To our scholars, readers, and thinkers in Seychelles: You are the heart and inspiration of this illuminated codex.',
  },
  SL: {
    code: 'SL',
    name: 'Sierra Leone',
    flagEmoji: '🇸🇱',
    colors: ["#1eb53a","#ffffff","#0072ce"],
    accent: '#1eb53a',
    symbolName: 'Lion Mountain Tricolor',
    tributeMessage: 'To our scholars, readers, and thinkers in Sierra Leone: You are the heart and inspiration of this illuminated codex.',
  },
  SG: {
    code: 'SG',
    name: 'Singapore',
    flagEmoji: '🇸🇬',
    colors: ["#ed2939","#ffffff"],
    accent: '#ed2939',
    symbolName: 'White Crescent and Five Stars of Democracy',
    tributeMessage: 'To our scholars, readers, and thinkers in Singapore: You are the heart and inspiration of this illuminated codex.',
  },
  SK: {
    code: 'SK',
    name: 'Slovakia',
    flagEmoji: '🇸🇰',
    colors: ["#ffffff","#0b4ea2","#ee1c25"],
    accent: '#0b4ea2',
    symbolName: 'Patriarchal Double Cross on Three Blue Hills',
    tributeMessage: 'To our scholars, readers, and thinkers in Slovakia: You are the heart and inspiration of this illuminated codex.',
  },
  SI: {
    code: 'SI',
    name: 'Slovenia',
    flagEmoji: '🇸🇮',
    colors: ["#ffffff","#005ce6","#ed1c24"],
    accent: '#005ce6',
    symbolName: 'Mount Triglav & Three Golden Stars of Celje',
    tributeMessage: 'To our scholars, readers, and thinkers in Slovenia: You are the heart and inspiration of this illuminated codex.',
  },
  SB: {
    code: 'SB',
    name: 'Solomon Islands',
    flagEmoji: '🇸🇧',
    colors: ["#0051ba","#215b33","#fcd116","#ffffff"],
    accent: '#0051ba',
    symbolName: 'Five Island Stars & Golden Diagonal Divider',
    tributeMessage: 'To our scholars, readers, and thinkers in Solomon Islands: You are the heart and inspiration of this illuminated codex.',
  },
  SO: {
    code: 'SO',
    name: 'Somalia',
    flagEmoji: '🇸🇴',
    colors: ["#4189dd","#ffffff"],
    accent: '#4189dd',
    symbolName: 'Star of Unity (Xiddigta Midnimada)',
    tributeMessage: 'To our scholars, readers, and thinkers in Somalia: You are the heart and inspiration of this illuminated codex.',
  },
  ZA: {
    code: 'ZA',
    name: 'South Africa',
    flagEmoji: '🇿🇦',
    colors: ["#007749","#ffb612","#001489","#de3831","#000000","#ffffff"],
    accent: '#ffb612',
    symbolName: 'Y-Shaped Rainbow Convergence of Unity',
    tributeMessage: 'To our readers in South Africa: Ubuntu. We are honored to accompany your acoustic studies.',
  },
  SS: {
    code: 'SS',
    name: 'South Sudan',
    flagEmoji: '🇸🇸',
    colors: ["#000000","#da121a","#0f47af","#fcdd09","#078930","#ffffff"],
    accent: '#fcdd09',
    symbolName: 'Golden Star of Bethlehem on Blue Triangle',
    tributeMessage: 'To our scholars, readers, and thinkers in South Sudan: You are the heart and inspiration of this illuminated codex.',
  },
  ES: {
    code: 'ES',
    name: 'Spain',
    flagEmoji: '🇪🇸',
    colors: ["#aa151b","#f1bf00"],
    accent: '#aa151b',
    symbolName: 'Pillars of Hercules & Plus Ultra Crest',
    tributeMessage: 'To our scholars, readers, and thinkers in Spain: You are the heart and inspiration of this illuminated codex.',
  },
  LK: {
    code: 'LK',
    name: 'Sri Lanka',
    flagEmoji: '🇱🇰',
    colors: ["#8d153a","#ffbe29","#00534e","#eb7400"],
    accent: '#ffbe29',
    symbolName: 'Golden Lion of Sinha Holding Kastane Sword',
    tributeMessage: 'To our scholars, readers, and thinkers in Sri Lanka: You are the heart and inspiration of this illuminated codex.',
  },
  SD: {
    code: 'SD',
    name: 'Sudan',
    flagEmoji: '🇸🇩',
    colors: ["#d21034","#ffffff","#000000","#007229"],
    accent: '#007229',
    symbolName: 'Green Triangle of the Nile Confluence',
    tributeMessage: 'To our scholars, readers, and thinkers in Sudan: You are the heart and inspiration of this illuminated codex.',
  },
  SR: {
    code: 'SR',
    name: 'Suriname',
    flagEmoji: '🇸🇷',
    colors: ["#377e3f","#b40a2d","#ffffff","#ecc81a"],
    accent: '#ecc81a',
    symbolName: 'Golden Star of the Amazon Peoples',
    tributeMessage: 'To our scholars, readers, and thinkers in Suriname: You are the heart and inspiration of this illuminated codex.',
  },
  SE: {
    code: 'SE',
    name: 'Sweden',
    flagEmoji: '🇸🇪',
    colors: ["#006aa7","#fecc00"],
    accent: '#006aa7',
    symbolName: 'Yellow Nordic Cross on Baltic Azure',
    tributeMessage: 'To our scholars, readers, and thinkers in Sweden: You are the heart and inspiration of this illuminated codex.',
  },
  CH: {
    code: 'CH',
    name: 'Switzerland',
    flagEmoji: '🇨🇭',
    colors: ["#ff0000","#ffffff"],
    accent: '#ff0000',
    symbolName: 'Equilateral White Swiss Cross of Helvetia',
    tributeMessage: 'To our scholars, readers, and thinkers in Switzerland: You are the heart and inspiration of this illuminated codex.',
  },
  SY: {
    code: 'SY',
    name: 'Syria',
    flagEmoji: '🇸🇾',
    colors: ["#ce1126","#ffffff","#000000","#007a3d"],
    accent: '#007a3d',
    symbolName: 'Two Green Stars of the Damascus Oasis',
    tributeMessage: 'To our scholars, readers, and thinkers in Syria: You are the heart and inspiration of this illuminated codex.',
  },
  TW: {
    code: 'TW',
    name: 'Taiwan',
    flagEmoji: '🇹🇼',
    colors: ["#fe0000","#000095","#ffffff"],
    accent: '#000095',
    symbolName: 'Blue Sky with a White Sun of 12 Rays',
    tributeMessage: 'To our scholars, readers, and thinkers in Taiwan: You are the heart and inspiration of this illuminated codex.',
  },
  TJ: {
    code: 'TJ',
    name: 'Tajikistan',
    flagEmoji: '🇹🇯',
    colors: ["#cc0000","#ffffff","#009900","#f8c300"],
    accent: '#f8c300',
    symbolName: 'Golden Crown and Seven Stars of Pamir',
    tributeMessage: 'To our scholars, readers, and thinkers in Tajikistan: You are the heart and inspiration of this illuminated codex.',
  },
  TZ: {
    code: 'TZ',
    name: 'Tanzania',
    flagEmoji: '🇹🇿',
    colors: ["#1eb53a","#00a3dd","#fcd116","#000000"],
    accent: '#1eb53a',
    symbolName: 'Kilimanjaro Green and Zanzibar Blue Ribbon',
    tributeMessage: 'To our scholars, readers, and thinkers in Tanzania: You are the heart and inspiration of this illuminated codex.',
  },
  TH: {
    code: 'TH',
    name: 'Thailand',
    flagEmoji: '🇹🇭',
    colors: ["#a51931","#f4f5f8","#2d2a4a"],
    accent: '#a51931',
    symbolName: 'Trairanga (Tricolor of Nation, Faith, Monarch)',
    tributeMessage: 'To our scholars, readers, and thinkers in Thailand: You are the heart and inspiration of this illuminated codex.',
  },
  TL: {
    code: 'TL',
    name: 'Timor-Leste',
    flagEmoji: '🇹🇱',
    colors: ["#dc241f","#ffc726","#000000","#ffffff"],
    accent: '#ffc726',
    symbolName: 'White Star of Guiding Light',
    tributeMessage: 'To our scholars, readers, and thinkers in Timor-Leste: You are the heart and inspiration of this illuminated codex.',
  },
  TG: {
    code: 'TG',
    name: 'Togo',
    flagEmoji: '🇹🇬',
    colors: ["#006a4e","#ffce00","#d21034","#ffffff"],
    accent: '#006a4e',
    symbolName: 'White Star of Hope on Crimson Field',
    tributeMessage: 'To our scholars, readers, and thinkers in Togo: You are the heart and inspiration of this illuminated codex.',
  },
  TO: {
    code: 'TO',
    name: 'Tonga',
    flagEmoji: '🇹🇴',
    colors: ["#c10000","#ffffff"],
    accent: '#c10000',
    symbolName: 'Red Greek Cross of Salvation',
    tributeMessage: 'To our scholars, readers, and thinkers in Tonga: You are the heart and inspiration of this illuminated codex.',
  },
  TT: {
    code: 'TT',
    name: 'Trinidad and Tobago',
    flagEmoji: '🇹🇹',
    colors: ["#ce1126","#000000","#ffffff"],
    accent: '#ce1126',
    symbolName: 'Black Diagonal Ribbon with White Fimbriation',
    tributeMessage: 'To our scholars, readers, and thinkers in Trinidad and Tobago: You are the heart and inspiration of this illuminated codex.',
  },
  TN: {
    code: 'TN',
    name: 'Tunisia',
    flagEmoji: '🇹🇳',
    colors: ["#e70013","#ffffff"],
    accent: '#e70013',
    symbolName: 'Red Crescent and Star of Carthage',
    tributeMessage: 'To our scholars, readers, and thinkers in Tunisia: You are the heart and inspiration of this illuminated codex.',
  },
  TR: {
    code: 'TR',
    name: 'Turkey',
    flagEmoji: '🇹🇷',
    colors: ["#e30a17","#ffffff"],
    accent: '#e30a17',
    symbolName: 'Hilal and Yildiz (White Crescent and Star)',
    tributeMessage: 'To our scholars, readers, and thinkers in Turkey: You are the heart and inspiration of this illuminated codex.',
  },
  TM: {
    code: 'TM',
    name: 'Turkmenistan',
    flagEmoji: '🇹🇲',
    colors: ["#009900","#cc0000","#ffffff"],
    accent: '#009900',
    symbolName: 'Five Traditional Carpet Gols & Crescent',
    tributeMessage: 'To our scholars, readers, and thinkers in Turkmenistan: You are the heart and inspiration of this illuminated codex.',
  },
  TV: {
    code: 'TV',
    name: 'Tuvalu',
    flagEmoji: '🇹🇻',
    colors: ["#5b97b1","#ffd100","#ffffff","#c8102e"],
    accent: '#5b97b1',
    symbolName: 'Nine Island Stars of the Atolls',
    tributeMessage: 'To our scholars, readers, and thinkers in Tuvalu: You are the heart and inspiration of this illuminated codex.',
  },
  UG: {
    code: 'UG',
    name: 'Uganda',
    flagEmoji: '🇺🇬',
    colors: ["#000000","#fcdc04","#d90000","#ffffff"],
    accent: '#fcdc04',
    symbolName: 'Grey Crowned Crane (Balearica regulorum)',
    tributeMessage: 'To our scholars, readers, and thinkers in Uganda: You are the heart and inspiration of this illuminated codex.',
  },
  UA: {
    code: 'UA',
    name: 'Ukraine',
    flagEmoji: '🇺🇦',
    colors: ["#0057b7","#ffd700"],
    accent: '#0057b7',
    symbolName: 'Tryzub (Princely Trident of Volodymyr the Great)',
    tributeMessage: 'To our scholars, readers, and thinkers in Ukraine: You are the heart and inspiration of this illuminated codex.',
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    flagEmoji: '🇦🇪',
    colors: ["#00732f","#ffffff","#000000","#ff0000"],
    accent: '#00732f',
    symbolName: 'Falcon of Quraish & Arabian Tricolor',
    tributeMessage: 'To our scholars, readers, and thinkers in United Arab Emirates: You are the heart and inspiration of this illuminated codex.',
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    flagEmoji: '🇬🇧',
    colors: ["#012169","#c8102e","#ffffff"],
    accent: '#c8102e',
    symbolName: 'Union Jack of St George, St Andrew & St Patrick',
    tributeMessage: 'To our scholars, readers, and thinkers in United Kingdom: You are the heart and inspiration of this illuminated codex.',
  },
  US: {
    code: 'US',
    name: 'United States',
    flagEmoji: '🇺🇸',
    colors: ["#b22234","#ffffff","#3c3b6e"],
    accent: '#3c3b6e',
    symbolName: 'Stars and Stripes & Bald Eagle',
    tributeMessage: 'To our scholars and listeners across the United States: Designed for deep focus and auditory discovery.',
  },
  UY: {
    code: 'UY',
    name: 'Uruguay',
    flagEmoji: '🇺🇾',
    colors: ["#ffffff","#0038a8","#fcd116"],
    accent: '#0038a8',
    symbolName: 'Sun of May with 16 Radiant Alternating Rays',
    tributeMessage: 'To our scholars, readers, and thinkers in Uruguay: You are the heart and inspiration of this illuminated codex.',
  },
  UZ: {
    code: 'UZ',
    name: 'Uzbekistan',
    flagEmoji: '🇺🇿',
    colors: ["#0099b5","#ffffff","#1eb53a","#ce1126"],
    accent: '#0099b5',
    symbolName: 'Crescent Moon & Twelve Province Stars',
    tributeMessage: 'To our scholars, readers, and thinkers in Uzbekistan: You are the heart and inspiration of this illuminated codex.',
  },
  VU: {
    code: 'VU',
    name: 'Vanuatu',
    flagEmoji: '🇻🇺',
    colors: ["#d21034","#009543","#000000","#fdce13"],
    accent: '#009543',
    symbolName: 'Boar’s Tusk & Crossed Namele Fern Fronds',
    tributeMessage: 'To our scholars, readers, and thinkers in Vanuatu: You are the heart and inspiration of this illuminated codex.',
  },
  VA: {
    code: 'VA',
    name: 'Vatican City',
    flagEmoji: '🇻🇦',
    colors: ["#ffe000","#ffffff"],
    accent: '#ffe000',
    symbolName: 'Keys of Saint Peter & Papal Tiara',
    tributeMessage: 'To our scholars, readers, and thinkers in Vatican City: You are the heart and inspiration of this illuminated codex.',
  },
  VE: {
    code: 'VE',
    name: 'Venezuela',
    flagEmoji: '🇻🇪',
    colors: ["#ffcc00","#00247d","#cf142b","#ffffff"],
    accent: '#ffcc00',
    symbolName: 'Arc of Eight Stars of the Provinces',
    tributeMessage: 'To our scholars, readers, and thinkers in Venezuela: You are the heart and inspiration of this illuminated codex.',
  },
  VN: {
    code: 'VN',
    name: 'Vietnam',
    flagEmoji: '🇻🇳',
    colors: ["#da251d","#ffff00"],
    accent: '#da251d',
    symbolName: 'Five-pointed Golden Star of Hanoi',
    tributeMessage: 'To our scholars, readers, and thinkers in Vietnam: You are the heart and inspiration of this illuminated codex.',
  },
  YE: {
    code: 'YE',
    name: 'Yemen',
    flagEmoji: '🇾🇪',
    colors: ["#ce1126","#ffffff","#000000"],
    accent: '#ce1126',
    symbolName: 'Eagle of Saladin & Marib Dam Tricolor',
    tributeMessage: 'To our scholars, readers, and thinkers in Yemen: You are the heart and inspiration of this illuminated codex.',
  },
  ZM: {
    code: 'ZM',
    name: 'Zambia',
    flagEmoji: '🇿🇲',
    colors: ["#198a00","#de2010","#000000","#ef7d00"],
    accent: '#198a00',
    symbolName: 'African Fish Eagle of Victoria Falls',
    tributeMessage: 'To our scholars, readers, and thinkers in Zambia: You are the heart and inspiration of this illuminated codex.',
  },
  ZW: {
    code: 'ZW',
    name: 'Zimbabwe',
    flagEmoji: '🇿🇼',
    colors: ["#006400","#ffd700","#d40000","#000000","#ffffff"],
    accent: '#ffd700',
    symbolName: 'Great Zimbabwe Soapstone Bird of Integrity',
    tributeMessage: 'To our scholars, readers, and thinkers in Zimbabwe: You are the heart and inspiration of this illuminated codex.',
  },
  GLOBAL: {
    code: 'GLOBAL',
    name: 'World Citizen',
    flagEmoji: '🌐',
    colors: ["#d97706","#06b6d4","#a855f7"],
    accent: '#d97706',
    symbolName: 'Universal Human Codex',
    tributeMessage: 'To all global readers, thinkers, and explorers: Knowledge transcends every border.',
  },
};

/**
 * Method 2: Detect country automatically from native device timezone with ZERO network calls & ZERO tracking.
 */
export function detectCountryFromTimezone(): CountryHeritage {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const tzLower = tz.toLowerCase();

    // 1. Direct city & region match against all 195+ countries
    if (tzLower.includes('kabul') || tzLower.includes('afghanistan')) return COUNTRIES_HERITAGE.AF;
    if (tzLower.includes('tirane') || tzLower.includes('albania')) return COUNTRIES_HERITAGE.AL;
    if (tzLower.includes('algiers') || tzLower.includes('algeria')) return COUNTRIES_HERITAGE.DZ;
    if (tzLower.includes('andorra') || tzLower.includes('andorra')) return COUNTRIES_HERITAGE.AD;
    if (tzLower.includes('luanda') || tzLower.includes('angola')) return COUNTRIES_HERITAGE.AO;
    if (tzLower.includes('antigua') || tzLower.includes('antiguaandbarbuda')) return COUNTRIES_HERITAGE.AG;
    if (tzLower.includes('buenos_aires') || tzLower.includes('argentina') || tzLower.includes('argentina')) return COUNTRIES_HERITAGE.AR;
    if (tzLower.includes('yerevan') || tzLower.includes('armenia')) return COUNTRIES_HERITAGE.AM;
    if (tzLower.includes('sydney') || tzLower.includes('melbourne') || tzLower.includes('brisbane') || tzLower.includes('perth') || tzLower.includes('adelaide') || tzLower.includes('darwin') || tzLower.includes('hobart') || tzLower.includes('canberra') || tzLower.includes('australia') || tzLower.includes('australia')) return COUNTRIES_HERITAGE.AU;
    if (tzLower.includes('vienna') || tzLower.includes('austria')) return COUNTRIES_HERITAGE.AT;
    if (tzLower.includes('baku') || tzLower.includes('azerbaijan')) return COUNTRIES_HERITAGE.AZ;
    if (tzLower.includes('nassau') || tzLower.includes('bahamas')) return COUNTRIES_HERITAGE.BS;
    if (tzLower.includes('bahrain') || tzLower.includes('bahrain')) return COUNTRIES_HERITAGE.BH;
    if (tzLower.includes('dhaka') || tzLower.includes('bangladesh')) return COUNTRIES_HERITAGE.BD;
    if (tzLower.includes('barbados') || tzLower.includes('barbados')) return COUNTRIES_HERITAGE.BB;
    if (tzLower.includes('minsk') || tzLower.includes('belarus')) return COUNTRIES_HERITAGE.BY;
    if (tzLower.includes('brussels') || tzLower.includes('belgium')) return COUNTRIES_HERITAGE.BE;
    if (tzLower.includes('belize') || tzLower.includes('belize')) return COUNTRIES_HERITAGE.BZ;
    if (tzLower.includes('porto-novo') || tzLower.includes('cotonou') || tzLower.includes('benin')) return COUNTRIES_HERITAGE.BJ;
    if (tzLower.includes('thimphu') || tzLower.includes('bhutan')) return COUNTRIES_HERITAGE.BT;
    if (tzLower.includes('la_paz') || tzLower.includes('bolivia')) return COUNTRIES_HERITAGE.BO;
    if (tzLower.includes('sarajevo') || tzLower.includes('bosniaandherzegovina')) return COUNTRIES_HERITAGE.BA;
    if (tzLower.includes('gaborone') || tzLower.includes('botswana')) return COUNTRIES_HERITAGE.BW;
    if (tzLower.includes('sao_paulo') || tzLower.includes('rio_de_janeiro') || tzLower.includes('fortaleza') || tzLower.includes('manaus') || tzLower.includes('recife') || tzLower.includes('brazil') || tzLower.includes('brazil')) return COUNTRIES_HERITAGE.BR;
    if (tzLower.includes('brunei') || tzLower.includes('brunei')) return COUNTRIES_HERITAGE.BN;
    if (tzLower.includes('sofia') || tzLower.includes('bulgaria')) return COUNTRIES_HERITAGE.BG;
    if (tzLower.includes('ouagadougou') || tzLower.includes('burkinafaso')) return COUNTRIES_HERITAGE.BF;
    if (tzLower.includes('bujumbura') || tzLower.includes('gitega') || tzLower.includes('burundi')) return COUNTRIES_HERITAGE.BI;
    if (tzLower.includes('cape_verde') || tzLower.includes('caboverde')) return COUNTRIES_HERITAGE.CV;
    if (tzLower.includes('phnom_penh') || tzLower.includes('cambodia')) return COUNTRIES_HERITAGE.KH;
    if (tzLower.includes('douala') || tzLower.includes('yaounde') || tzLower.includes('cameroon')) return COUNTRIES_HERITAGE.CM;
    if (tzLower.includes('toronto') || tzLower.includes('vancouver') || tzLower.includes('montreal') || tzLower.includes('edmonton') || tzLower.includes('halifax') || tzLower.includes('winnipeg') || tzLower.includes('canada') || tzLower.includes('canada')) return COUNTRIES_HERITAGE.CA;
    if (tzLower.includes('bangui') || tzLower.includes('centralafricanrepublic')) return COUNTRIES_HERITAGE.CF;
    if (tzLower.includes('ndjamena') || tzLower.includes('chad')) return COUNTRIES_HERITAGE.TD;
    if (tzLower.includes('santiago') || tzLower.includes('chile') || tzLower.includes('chile')) return COUNTRIES_HERITAGE.CL;
    if (tzLower.includes('shanghai') || tzLower.includes('beijing') || tzLower.includes('chongqing') || tzLower.includes('urumqi') || tzLower.includes('china') || tzLower.includes('china')) return COUNTRIES_HERITAGE.CN;
    if (tzLower.includes('bogota') || tzLower.includes('colombia')) return COUNTRIES_HERITAGE.CO;
    if (tzLower.includes('comoro') || tzLower.includes('comoros')) return COUNTRIES_HERITAGE.KM;
    if (tzLower.includes('brazzaville') || tzLower.includes('congo')) return COUNTRIES_HERITAGE.CG;
    if (tzLower.includes('kinshasa') || tzLower.includes('lubumbashi') || tzLower.includes('drcongo')) return COUNTRIES_HERITAGE.CD;
    if (tzLower.includes('costa_rica') || tzLower.includes('costarica')) return COUNTRIES_HERITAGE.CR;
    if (tzLower.includes('zagreb') || tzLower.includes('croatia')) return COUNTRIES_HERITAGE.HR;
    if (tzLower.includes('havana') || tzLower.includes('cuba')) return COUNTRIES_HERITAGE.CU;
    if (tzLower.includes('nicosia') || tzLower.includes('cyprus')) return COUNTRIES_HERITAGE.CY;
    if (tzLower.includes('prague') || tzLower.includes('czechia')) return COUNTRIES_HERITAGE.CZ;
    if (tzLower.includes('copenhagen') || tzLower.includes('denmark')) return COUNTRIES_HERITAGE.DK;
    if (tzLower.includes('djibouti') || tzLower.includes('djibouti')) return COUNTRIES_HERITAGE.DJ;
    if (tzLower.includes('dominica') || tzLower.includes('dominica')) return COUNTRIES_HERITAGE.DM;
    if (tzLower.includes('santo_domingo') || tzLower.includes('dominicanrepublic')) return COUNTRIES_HERITAGE.DO;
    if (tzLower.includes('guayaquil') || tzLower.includes('galapagos') || tzLower.includes('ecuador')) return COUNTRIES_HERITAGE.EC;
    if (tzLower.includes('cairo') || tzLower.includes('egypt')) return COUNTRIES_HERITAGE.EG;
    if (tzLower.includes('el_salvador') || tzLower.includes('elsalvador')) return COUNTRIES_HERITAGE.SV;
    if (tzLower.includes('malabo') || tzLower.includes('equatorialguinea')) return COUNTRIES_HERITAGE.GQ;
    if (tzLower.includes('asmara') || tzLower.includes('eritrea')) return COUNTRIES_HERITAGE.ER;
    if (tzLower.includes('tallinn') || tzLower.includes('estonia')) return COUNTRIES_HERITAGE.EE;
    if (tzLower.includes('mbabane') || tzLower.includes('eswatini')) return COUNTRIES_HERITAGE.SZ;
    if (tzLower.includes('addis_ababa') || tzLower.includes('ethiopia') || tzLower.includes('ethiopia')) return COUNTRIES_HERITAGE.ET;
    if (tzLower.includes('fiji') || tzLower.includes('fiji')) return COUNTRIES_HERITAGE.FJ;
    if (tzLower.includes('helsinki') || tzLower.includes('finland')) return COUNTRIES_HERITAGE.FI;
    if (tzLower.includes('paris') || tzLower.includes('france')) return COUNTRIES_HERITAGE.FR;
    if (tzLower.includes('libreville') || tzLower.includes('gabon')) return COUNTRIES_HERITAGE.GA;
    if (tzLower.includes('banjul') || tzLower.includes('gambia')) return COUNTRIES_HERITAGE.GM;
    if (tzLower.includes('tbilisi') || tzLower.includes('georgia')) return COUNTRIES_HERITAGE.GE;
    if (tzLower.includes('berlin') || tzLower.includes('frankfurt') || tzLower.includes('munich') || tzLower.includes('germany')) return COUNTRIES_HERITAGE.DE;
    if (tzLower.includes('accra') || tzLower.includes('ghana')) return COUNTRIES_HERITAGE.GH;
    if (tzLower.includes('athens') || tzLower.includes('greece')) return COUNTRIES_HERITAGE.GR;
    if (tzLower.includes('grenada') || tzLower.includes('grenada')) return COUNTRIES_HERITAGE.GD;
    if (tzLower.includes('guatemala') || tzLower.includes('guatemala')) return COUNTRIES_HERITAGE.GT;
    if (tzLower.includes('conakry') || tzLower.includes('guinea')) return COUNTRIES_HERITAGE.GN;
    if (tzLower.includes('bissau') || tzLower.includes('guineabissau')) return COUNTRIES_HERITAGE.GW;
    if (tzLower.includes('guyana') || tzLower.includes('guyana')) return COUNTRIES_HERITAGE.GY;
    if (tzLower.includes('port-au-prince') || tzLower.includes('haiti')) return COUNTRIES_HERITAGE.HT;
    if (tzLower.includes('tegucigalpa') || tzLower.includes('honduras')) return COUNTRIES_HERITAGE.HN;
    if (tzLower.includes('budapest') || tzLower.includes('hungary')) return COUNTRIES_HERITAGE.HU;
    if (tzLower.includes('reykjavik') || tzLower.includes('iceland')) return COUNTRIES_HERITAGE.IS;
    if (tzLower.includes('kolkata') || tzLower.includes('delhi') || tzLower.includes('mumbai') || tzLower.includes('calcutta') || tzLower.includes('india') || tzLower.includes('india')) return COUNTRIES_HERITAGE.IN;
    if (tzLower.includes('jakarta') || tzLower.includes('makassar') || tzLower.includes('jayapura') || tzLower.includes('pontianak') || tzLower.includes('indonesia')) return COUNTRIES_HERITAGE.ID;
    if (tzLower.includes('tehran') || tzLower.includes('iran')) return COUNTRIES_HERITAGE.IR;
    if (tzLower.includes('baghdad') || tzLower.includes('iraq')) return COUNTRIES_HERITAGE.IQ;
    if (tzLower.includes('dublin') || tzLower.includes('ireland')) return COUNTRIES_HERITAGE.IE;
    if (tzLower.includes('jerusalem') || tzLower.includes('tel_aviv') || tzLower.includes('israel')) return COUNTRIES_HERITAGE.IL;
    if (tzLower.includes('rome') || tzLower.includes('milan') || tzLower.includes('italy')) return COUNTRIES_HERITAGE.IT;
    if (tzLower.includes('abidjan') || tzLower.includes('ivorycoast')) return COUNTRIES_HERITAGE.CI;
    if (tzLower.includes('jamaica') || tzLower.includes('jamaica')) return COUNTRIES_HERITAGE.JM;
    if (tzLower.includes('tokyo') || tzLower.includes('japan') || tzLower.includes('japan')) return COUNTRIES_HERITAGE.JP;
    if (tzLower.includes('amman') || tzLower.includes('jordan')) return COUNTRIES_HERITAGE.JO;
    if (tzLower.includes('almaty') || tzLower.includes('aqtobe') || tzLower.includes('astana') || tzLower.includes('kazakhstan')) return COUNTRIES_HERITAGE.KZ;
    if (tzLower.includes('nairobi') || tzLower.includes('kenya') || tzLower.includes('kenya')) return COUNTRIES_HERITAGE.KE;
    if (tzLower.includes('tarawa') || tzLower.includes('kiritimati') || tzLower.includes('kiribati')) return COUNTRIES_HERITAGE.KI;
    if (tzLower.includes('pyongyang') || tzLower.includes('northkorea')) return COUNTRIES_HERITAGE.KP;
    if (tzLower.includes('seoul') || tzLower.includes('korea') || tzLower.includes('southkorea')) return COUNTRIES_HERITAGE.KR;
    if (tzLower.includes('kuwait') || tzLower.includes('kuwait')) return COUNTRIES_HERITAGE.KW;
    if (tzLower.includes('bishkek') || tzLower.includes('kyrgyzstan')) return COUNTRIES_HERITAGE.KG;
    if (tzLower.includes('vientiane') || tzLower.includes('laos')) return COUNTRIES_HERITAGE.LA;
    if (tzLower.includes('riga') || tzLower.includes('latvia')) return COUNTRIES_HERITAGE.LV;
    if (tzLower.includes('beirut') || tzLower.includes('lebanon')) return COUNTRIES_HERITAGE.LB;
    if (tzLower.includes('maseru') || tzLower.includes('lesotho')) return COUNTRIES_HERITAGE.LS;
    if (tzLower.includes('monrovia') || tzLower.includes('liberia')) return COUNTRIES_HERITAGE.LR;
    if (tzLower.includes('tripoli') || tzLower.includes('libya')) return COUNTRIES_HERITAGE.LY;
    if (tzLower.includes('vaduz') || tzLower.includes('liechtenstein')) return COUNTRIES_HERITAGE.LI;
    if (tzLower.includes('vilnius') || tzLower.includes('lithuania')) return COUNTRIES_HERITAGE.LT;
    if (tzLower.includes('luxembourg') || tzLower.includes('luxembourg')) return COUNTRIES_HERITAGE.LU;
    if (tzLower.includes('antananarivo') || tzLower.includes('madagascar')) return COUNTRIES_HERITAGE.MG;
    if (tzLower.includes('blantyre') || tzLower.includes('malawi')) return COUNTRIES_HERITAGE.MW;
    if (tzLower.includes('kuala_lumpur') || tzLower.includes('kuching') || tzLower.includes('malaysia')) return COUNTRIES_HERITAGE.MY;
    if (tzLower.includes('maldives') || tzLower.includes('maldives')) return COUNTRIES_HERITAGE.MV;
    if (tzLower.includes('bamako') || tzLower.includes('mali')) return COUNTRIES_HERITAGE.ML;
    if (tzLower.includes('malta') || tzLower.includes('malta')) return COUNTRIES_HERITAGE.MT;
    if (tzLower.includes('majuro') || tzLower.includes('marshallislands')) return COUNTRIES_HERITAGE.MH;
    if (tzLower.includes('nouakchott') || tzLower.includes('mauritania')) return COUNTRIES_HERITAGE.MR;
    if (tzLower.includes('mauritius') || tzLower.includes('mauritius')) return COUNTRIES_HERITAGE.MU;
    if (tzLower.includes('mexico_city') || tzLower.includes('cancun') || tzLower.includes('tijuana') || tzLower.includes('monterrey') || tzLower.includes('mexico')) return COUNTRIES_HERITAGE.MX;
    if (tzLower.includes('chuuk') || tzLower.includes('pohnpei') || tzLower.includes('kosrae') || tzLower.includes('micronesia')) return COUNTRIES_HERITAGE.FM;
    if (tzLower.includes('chisinau') || tzLower.includes('moldova')) return COUNTRIES_HERITAGE.MD;
    if (tzLower.includes('monaco') || tzLower.includes('monaco')) return COUNTRIES_HERITAGE.MC;
    if (tzLower.includes('ulaanbaatar') || tzLower.includes('hovd') || tzLower.includes('mongolia')) return COUNTRIES_HERITAGE.MN;
    if (tzLower.includes('podgorica') || tzLower.includes('montenegro')) return COUNTRIES_HERITAGE.ME;
    if (tzLower.includes('casablanca') || tzLower.includes('morocco')) return COUNTRIES_HERITAGE.MA;
    if (tzLower.includes('maputo') || tzLower.includes('mozambique')) return COUNTRIES_HERITAGE.MZ;
    if (tzLower.includes('yangon') || tzLower.includes('myanmar')) return COUNTRIES_HERITAGE.MM;
    if (tzLower.includes('windhoek') || tzLower.includes('namibia')) return COUNTRIES_HERITAGE.NA;
    if (tzLower.includes('nauru') || tzLower.includes('nauru')) return COUNTRIES_HERITAGE.NR;
    if (tzLower.includes('kathmandu') || tzLower.includes('nepal')) return COUNTRIES_HERITAGE.NP;
    if (tzLower.includes('amsterdam') || tzLower.includes('netherlands')) return COUNTRIES_HERITAGE.NL;
    if (tzLower.includes('auckland') || tzLower.includes('wellington') || tzLower.includes('chch') || tzLower.includes('newzealand')) return COUNTRIES_HERITAGE.NZ;
    if (tzLower.includes('managua') || tzLower.includes('nicaragua')) return COUNTRIES_HERITAGE.NI;
    if (tzLower.includes('niamey') || tzLower.includes('niger')) return COUNTRIES_HERITAGE.NE;
    if (tzLower.includes('lagos') || tzLower.includes('abuja') || tzLower.includes('nigeria')) return COUNTRIES_HERITAGE.NG;
    if (tzLower.includes('skopje') || tzLower.includes('northmacedonia')) return COUNTRIES_HERITAGE.MK;
    if (tzLower.includes('oslo') || tzLower.includes('norway')) return COUNTRIES_HERITAGE.NO;
    if (tzLower.includes('muscat') || tzLower.includes('oman')) return COUNTRIES_HERITAGE.OM;
    if (tzLower.includes('karachi') || tzLower.includes('islamabad') || tzLower.includes('pakistan')) return COUNTRIES_HERITAGE.PK;
    if (tzLower.includes('palau') || tzLower.includes('palau')) return COUNTRIES_HERITAGE.PW;
    if (tzLower.includes('gaza') || tzLower.includes('hebron') || tzLower.includes('palestine')) return COUNTRIES_HERITAGE.PS;
    if (tzLower.includes('panama') || tzLower.includes('panama')) return COUNTRIES_HERITAGE.PA;
    if (tzLower.includes('port_moresby') || tzLower.includes('papuanewguinea')) return COUNTRIES_HERITAGE.PG;
    if (tzLower.includes('asuncion') || tzLower.includes('paraguay')) return COUNTRIES_HERITAGE.PY;
    if (tzLower.includes('lima') || tzLower.includes('peru')) return COUNTRIES_HERITAGE.PE;
    if (tzLower.includes('manila') || tzLower.includes('philippines')) return COUNTRIES_HERITAGE.PH;
    if (tzLower.includes('warsaw') || tzLower.includes('poland')) return COUNTRIES_HERITAGE.PL;
    if (tzLower.includes('lisbon') || tzLower.includes('madeira') || tzLower.includes('azores') || tzLower.includes('portugal')) return COUNTRIES_HERITAGE.PT;
    if (tzLower.includes('qatar') || tzLower.includes('qatar')) return COUNTRIES_HERITAGE.QA;
    if (tzLower.includes('bucharest') || tzLower.includes('romania')) return COUNTRIES_HERITAGE.RO;
    if (tzLower.includes('moscow') || tzLower.includes('samara') || tzLower.includes('yekaterinburg') || tzLower.includes('novosibirsk') || tzLower.includes('krasnoyarsk') || tzLower.includes('irkutsk') || tzLower.includes('yakutsk') || tzLower.includes('vladivostok') || tzLower.includes('magadan') || tzLower.includes('kamchatka') || tzLower.includes('russia')) return COUNTRIES_HERITAGE.RU;
    if (tzLower.includes('kigali') || tzLower.includes('rwanda')) return COUNTRIES_HERITAGE.RW;
    if (tzLower.includes('st_kitts') || tzLower.includes('saintkittsandnevis')) return COUNTRIES_HERITAGE.KN;
    if (tzLower.includes('st_lucia') || tzLower.includes('saintlucia')) return COUNTRIES_HERITAGE.LC;
    if (tzLower.includes('st_vincent') || tzLower.includes('saintvincentandthegrenadines')) return COUNTRIES_HERITAGE.VC;
    if (tzLower.includes('apia') || tzLower.includes('samoa')) return COUNTRIES_HERITAGE.WS;
    if (tzLower.includes('san_marino') || tzLower.includes('sanmarino')) return COUNTRIES_HERITAGE.SM;
    if (tzLower.includes('sao_tome') || tzLower.includes('saotomeandprincipe')) return COUNTRIES_HERITAGE.ST;
    if (tzLower.includes('riyadh') || tzLower.includes('saudiarabia')) return COUNTRIES_HERITAGE.SA;
    if (tzLower.includes('dakar') || tzLower.includes('senegal')) return COUNTRIES_HERITAGE.SN;
    if (tzLower.includes('belgrade') || tzLower.includes('serbia')) return COUNTRIES_HERITAGE.RS;
    if (tzLower.includes('seychelles') || tzLower.includes('seychelles')) return COUNTRIES_HERITAGE.SC;
    if (tzLower.includes('freetown') || tzLower.includes('sierraleone')) return COUNTRIES_HERITAGE.SL;
    if (tzLower.includes('singapore') || tzLower.includes('singapore')) return COUNTRIES_HERITAGE.SG;
    if (tzLower.includes('bratislava') || tzLower.includes('slovakia')) return COUNTRIES_HERITAGE.SK;
    if (tzLower.includes('ljubljana') || tzLower.includes('slovenia')) return COUNTRIES_HERITAGE.SI;
    if (tzLower.includes('guadalcanal') || tzLower.includes('solomonislands')) return COUNTRIES_HERITAGE.SB;
    if (tzLower.includes('mogadishu') || tzLower.includes('somalia')) return COUNTRIES_HERITAGE.SO;
    if (tzLower.includes('johannesburg') || tzLower.includes('cape_town') || tzLower.includes('southafrica')) return COUNTRIES_HERITAGE.ZA;
    if (tzLower.includes('juba') || tzLower.includes('southsudan')) return COUNTRIES_HERITAGE.SS;
    if (tzLower.includes('madrid') || tzLower.includes('ceuta') || tzLower.includes('canary') || tzLower.includes('spain')) return COUNTRIES_HERITAGE.ES;
    if (tzLower.includes('colombo') || tzLower.includes('srilanka')) return COUNTRIES_HERITAGE.LK;
    if (tzLower.includes('khartoum') || tzLower.includes('sudan')) return COUNTRIES_HERITAGE.SD;
    if (tzLower.includes('paramaribo') || tzLower.includes('suriname')) return COUNTRIES_HERITAGE.SR;
    if (tzLower.includes('stockholm') || tzLower.includes('sweden')) return COUNTRIES_HERITAGE.SE;
    if (tzLower.includes('zurich') || tzLower.includes('switzerland')) return COUNTRIES_HERITAGE.CH;
    if (tzLower.includes('damascus') || tzLower.includes('syria')) return COUNTRIES_HERITAGE.SY;
    if (tzLower.includes('taipei') || tzLower.includes('taiwan')) return COUNTRIES_HERITAGE.TW;
    if (tzLower.includes('dushanbe') || tzLower.includes('tajikistan')) return COUNTRIES_HERITAGE.TJ;
    if (tzLower.includes('dar_es_salaam') || tzLower.includes('tanzania')) return COUNTRIES_HERITAGE.TZ;
    if (tzLower.includes('bangkok') || tzLower.includes('thailand')) return COUNTRIES_HERITAGE.TH;
    if (tzLower.includes('dili') || tzLower.includes('timorleste')) return COUNTRIES_HERITAGE.TL;
    if (tzLower.includes('lome') || tzLower.includes('togo')) return COUNTRIES_HERITAGE.TG;
    if (tzLower.includes('tongatapu') || tzLower.includes('tonga')) return COUNTRIES_HERITAGE.TO;
    if (tzLower.includes('port_of_spain') || tzLower.includes('trinidadandtobago')) return COUNTRIES_HERITAGE.TT;
    if (tzLower.includes('tunis') || tzLower.includes('tunisia')) return COUNTRIES_HERITAGE.TN;
    if (tzLower.includes('istanbul') || tzLower.includes('turkey')) return COUNTRIES_HERITAGE.TR;
    if (tzLower.includes('ashgabat') || tzLower.includes('turkmenistan')) return COUNTRIES_HERITAGE.TM;
    if (tzLower.includes('funafuti') || tzLower.includes('tuvalu')) return COUNTRIES_HERITAGE.TV;
    if (tzLower.includes('kampala') || tzLower.includes('uganda')) return COUNTRIES_HERITAGE.UG;
    if (tzLower.includes('kyiv') || tzLower.includes('ukraine')) return COUNTRIES_HERITAGE.UA;
    if (tzLower.includes('dubai') || tzLower.includes('abu_dhabi') || tzLower.includes('unitedarabemirates')) return COUNTRIES_HERITAGE.AE;
    if (tzLower.includes('london') || tzLower.includes('belfast') || tzLower.includes('edinburgh') || tzLower.includes('cardiff') || tzLower.includes('unitedkingdom')) return COUNTRIES_HERITAGE.GB;
    if (tzLower.includes('new_york') || tzLower.includes('los_angeles') || tzLower.includes('chicago') || tzLower.includes('denver') || tzLower.includes('phoenix') || tzLower.includes('detroit') || tzLower.includes('anchorage') || tzLower.includes('honolulu') || tzLower.includes('indiana') || tzLower.includes('unitedstates')) return COUNTRIES_HERITAGE.US;
    if (tzLower.includes('montevideo') || tzLower.includes('uruguay')) return COUNTRIES_HERITAGE.UY;
    if (tzLower.includes('tashkent') || tzLower.includes('samarkand') || tzLower.includes('uzbekistan')) return COUNTRIES_HERITAGE.UZ;
    if (tzLower.includes('efate') || tzLower.includes('vanuatu')) return COUNTRIES_HERITAGE.VU;
    if (tzLower.includes('vatican') || tzLower.includes('vaticancity')) return COUNTRIES_HERITAGE.VA;
    if (tzLower.includes('caracas') || tzLower.includes('venezuela')) return COUNTRIES_HERITAGE.VE;
    if (tzLower.includes('ho_chi_minh') || tzLower.includes('hanoi') || tzLower.includes('vietnam')) return COUNTRIES_HERITAGE.VN;
    if (tzLower.includes('aden') || tzLower.includes('sanaa') || tzLower.includes('yemen')) return COUNTRIES_HERITAGE.YE;
    if (tzLower.includes('lusaka') || tzLower.includes('zambia')) return COUNTRIES_HERITAGE.ZM;
    if (tzLower.includes('harare') || tzLower.includes('zimbabwe')) return COUNTRIES_HERITAGE.ZW;

    // 2. Fallbacks based on broad regional zones
    if (tzLower.startsWith('africa/')) {
      if (tzLower.includes('east') || tzLower.includes('addis')) return COUNTRIES_HERITAGE.ET;
      return COUNTRIES_HERITAGE.ET;
    }
    if (tzLower.startsWith('america/')) return COUNTRIES_HERITAGE.US;
    if (tzLower.startsWith('europe/')) return COUNTRIES_HERITAGE.GB;
    if (tzLower.startsWith('asia/')) return COUNTRIES_HERITAGE.JP;
    if (tzLower.startsWith('australia/')) return COUNTRIES_HERITAGE.AU;

    return COUNTRIES_HERITAGE.GLOBAL;
  } catch {
    return COUNTRIES_HERITAGE.ET;
  }
}

const STORAGE_KEY = 'aura_country_override';

export function getActiveCountryHeritage(): CountryHeritage {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && COUNTRIES_HERITAGE[saved]) {
      return enrichCountryWithGreeting(COUNTRIES_HERITAGE[saved]);
    }
  } catch {
    // fallback
  }
  return enrichCountryWithGreeting(detectCountryFromTimezone());
}

export function setCountryOverride(countryCode: string): CountryHeritage {
  const heritage = enrichCountryWithGreeting(COUNTRIES_HERITAGE[countryCode] || COUNTRIES_HERITAGE.GLOBAL);
  try {
    localStorage.setItem(STORAGE_KEY, heritage.code);
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aura-country-changed', { detail: heritage }));
  }
  return heritage;
}

export function generateLockScreenArtwork(
  title: string,
  author: string,
  country: CountryHeritage
): string {
  try {
    if (typeof document === 'undefined') return '';
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Dark luxury obsidian slate background
    const bg = ctx.createLinearGradient(0, 0, 512, 512);
    bg.addColorStop(0, '#0a0908');
    bg.addColorStop(1, '#181614');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 512);

    // Sovereign flag ambient gradient arc
    const primaryColor = country.colors[0] || country.accent;
    const secondaryColor = country.colors[1] || country.accent;
    const tertiaryColor = country.colors[2] || country.colors[0];

    const bgGlow = ctx.createRadialGradient(256, 210, 20, 256, 210, 240);
    bgGlow.addColorStop(0, `${primaryColor}33`);
    bgGlow.addColorStop(0.45, `${secondaryColor}25`);
    bgGlow.addColorStop(0.75, `${tertiaryColor}15`);
    bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, 512, 512);

    // Dynamic national flag horizontal stripe accent
    const stripeY = 24;
    const stripeH = 8;
    const stripeW = 512 / Math.max(1, country.colors.length);
    country.colors.forEach((col, idx) => {
      ctx.fillStyle = col;
      ctx.fillRect(idx * stripeW, stripeY, stripeW, stripeH);
    });

    // Central illuminated national seal & flag emoji
    ctx.save();
    ctx.beginPath();
    ctx.arc(256, 190, 80, 0, Math.PI * 2);
    ctx.fillStyle = '#141210';
    ctx.shadowColor = country.accent;
    ctx.shadowBlur = 35;
    ctx.fill();
    ctx.strokeStyle = country.accent;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = '72px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(country.flagEmoji, 256, 190);
    ctx.restore();

    // Flag-reactive aural audio spectrum
    ctx.save();
    const barCount = 36;
    const startX = 64;
    const totalW = 512 - 128;
    const barW = totalW / barCount - 3;
    for (let i = 0; i < barCount; i++) {
      const height = 15 + Math.sin(i * 0.45 + 1.2) * 22 + Math.cos(i * 0.25) * 14;
      const x = startX + i * (barW + 3);
      const y = 320 - height / 2;
      const col = country.colors[i % country.colors.length] || country.accent;
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 6;
      ctx.fillRect(x, y, barW, Math.max(4, height));
    }
    ctx.restore();

    // Track Title
    ctx.fillStyle = '#f5f5f4';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    ctx.textAlign = 'center';
    const displayTitle = title.length > 28 ? title.slice(0, 26) + '...' : title;
    ctx.fillText(displayTitle, 256, 375);

    // Author
    ctx.fillStyle = '#a8a29e';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    ctx.fillText(author, 256, 410);

    // Sovereign country dedication inscription
    ctx.fillStyle = country.accent;
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${country.name.toUpperCase()} · SOVEREIGN CODEX`, 256, 450);

    ctx.fillStyle = '#78716c';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    ctx.fillText('AuRA Spatial Audio Player', 256, 475);

    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

export function updateLockScreenMediaSession(params: {
  title: string;
  author?: string;
  chapter?: string;
  country?: CountryHeritage;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  playbackRate?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onSeekTo?: (time: number) => void;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
}) {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

  try {
    const activeCountry = params.country || getActiveCountryHeritage();
    const authorName = params.author || params.chapter || 'AuRA Illuminated Reader';
    const artworkUrl = generateLockScreenArtwork(params.title, authorName, activeCountry);

    navigator.mediaSession.metadata = new MediaMetadata({
      title: params.title,
      artist: authorName,
      album: `${activeCountry.flagEmoji} ${activeCountry.name} · AuRA Sovereign Codex`,
      artwork: artworkUrl
        ? [
            { src: artworkUrl, sizes: '512x512', type: 'image/png' },
            { src: artworkUrl, sizes: '256x256', type: 'image/png' },
          ]
        : [],
    });

    if (params.onPlay) navigator.mediaSession.setActionHandler('play', params.onPlay);
    if (params.onPause) navigator.mediaSession.setActionHandler('pause', params.onPause);
    if (params.onSeekBackward) navigator.mediaSession.setActionHandler('seekbackward', params.onSeekBackward);
    if (params.onSeekForward) navigator.mediaSession.setActionHandler('seekforward', params.onSeekForward);
    const seekFn = params.onSeekTo || params.onSeek;
    if (seekFn) {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekFn(details.seekTime);
        }
      });
    }

    if (
      'setPositionState' in navigator.mediaSession &&
      params.duration &&
      params.duration > 0 &&
      params.currentTime !== undefined
    ) {
      navigator.mediaSession.setPositionState({
        duration: Math.max(0, params.duration),
        playbackRate: params.playbackRate || 1.0,
        position: Math.max(0, Math.min(params.currentTime, params.duration)),
      });
    }
  } catch (err) {
    console.warn('Failed to update MediaSession metadata', err);
  }
}

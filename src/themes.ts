import type { ThemeConfig } from './types';

export const THEMES: Record<string, ThemeConfig> = {
  imperial: {
    id: 'imperial',
    label: 'Imperial Obsidian & Gold',
    icon: '👑',
    description: 'Venetian gold brass, warm parchment, and deep obsidian slate.',
    accent: '#d97706',
    accentGlow: 'rgba(217, 119, 6, 0.45)',
    chassisBg: '#0d0c0b',
    chassisBorder: '#262320',
    paperBg: '#fcf9f2',
    paperText: '#1c1917',
    highlightBg: '#fde047',
    highlightText: '#1a1610',
    ribbonColor: '#991b1b',
    darkPaperBg: '#131210',
    darkPaperText: '#f5f5f4',
  },
  library: {
    id: 'library',
    label: 'Royal Library Mahogany',
    icon: '📜',
    description: 'Vintage burgundy leather, aged deckled paper, and warm bronze.',
    accent: '#b45309',
    accentGlow: 'rgba(180, 83, 9, 0.45)',
    chassisBg: '#140a08',
    chassisBorder: '#381a14',
    paperBg: '#f5ece0',
    paperText: '#23150d',
    highlightBg: '#fcd34d',
    highlightText: '#180e08',
    ribbonColor: '#7f1d1d',
    darkPaperBg: '#160d0a',
    darkPaperText: '#f4ede4',
  },
  cyber: {
    id: 'cyber',
    label: 'Cyber Midnight Tokyo',
    icon: '🌌',
    description: 'Deep sapphire night, electric neon cyan, and dark frosted glass.',
    accent: '#06b6d4',
    accentGlow: 'rgba(6, 182, 212, 0.55)',
    chassisBg: '#080b14',
    chassisBorder: '#1e293b',
    paperBg: '#0f172a',
    paperText: '#e2e8f0',
    highlightBg: '#38bdf8',
    highlightText: '#030712',
    ribbonColor: '#8b5cf6',
    darkPaperBg: '#080d19',
    darkPaperText: '#e2e8f0',
  },
  nordic: {
    id: 'nordic',
    label: 'Nordic Sage & Moss',
    icon: '🌿',
    description: 'Botanical calm, matte forest tones, and soft sage parchment.',
    accent: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.45)',
    chassisBg: '#06120e',
    chassisBorder: '#132e24',
    paperBg: '#edf5f1',
    paperText: '#0d281e',
    highlightBg: '#6ee7b7',
    highlightText: '#062319',
    ribbonColor: '#047857',
    darkPaperBg: '#081410',
    darkPaperText: '#e6f3eb',
  },
  mono: {
    id: 'mono',
    label: 'E-Ink Minimalist Scholar',
    icon: '⚪',
    description: 'Pure monochrome, newspaper contrast, and zero distractions.',
    accent: '#71717a',
    accentGlow: 'rgba(113, 113, 122, 0.3)',
    chassisBg: '#18181b',
    chassisBorder: '#27272a',
    paperBg: '#fafafa',
    paperText: '#09090b',
    highlightBg: '#e4e4e7',
    highlightText: '#09090b',
    ribbonColor: '#27272a',
    darkPaperBg: '#141416',
    darkPaperText: '#f4f4f5',
  },
  amethyst: {
    id: 'amethyst',
    label: 'Royal Amethyst & Violet',
    icon: '🔮',
    description: 'Mystic cosmic velvet, royal lilac accents, and soft lavender paper.',
    accent: '#a855f7',
    accentGlow: 'rgba(168, 85, 247, 0.5)',
    chassisBg: '#0f0817',
    chassisBorder: '#2e1445',
    paperBg: '#faf5ff',
    paperText: '#1f1032',
    highlightBg: '#e9d5ff',
    highlightText: '#2e1065',
    ribbonColor: '#7e22ce',
    darkPaperBg: '#130a1e',
    darkPaperText: '#f5edff',
  },
  crimson: {
    id: 'crimson',
    label: 'Venetian Crimson & Rose',
    icon: '🌹',
    description: 'Venetian ruby velvet, gilded rose gold accents, and warm blush tint.',
    accent: '#f43f5e',
    accentGlow: 'rgba(244, 63, 94, 0.5)',
    chassisBg: '#14060a',
    chassisBorder: '#38121d',
    paperBg: '#fff5f6',
    paperText: '#290912',
    highlightBg: '#fecdd3',
    highlightText: '#4c0519',
    ribbonColor: '#be123c',
    darkPaperBg: '#17070c',
    darkPaperText: '#ffebee',
  },
  amber: {
    id: 'amber',
    label: 'Solar Flare & Amber',
    icon: '⚡',
    description: 'High-energy solar warmth, golden cognac patina, and sunlit paper.',
    accent: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.5)',
    chassisBg: '#120d05',
    chassisBorder: '#35250c',
    paperBg: '#fffdf5',
    paperText: '#1c1505',
    highlightBg: '#fef08a',
    highlightText: '#1f1604',
    ribbonColor: '#b45309',
    darkPaperBg: '#140f06',
    darkPaperText: '#fff7ed',
  },
};

export function applyThemeTokens(theme: ThemeConfig, isDarkMode = false) {
  const root = document.documentElement;

  if (isDarkMode) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  const paperBg = isDarkMode ? (theme.darkPaperBg || '#131210') : theme.paperBg;
  const paperText = isDarkMode ? (theme.darkPaperText || '#f5f5f4') : theme.paperText;
  const highlightBg = isDarkMode ? `${theme.accent}55` : theme.highlightBg;
  const highlightText = isDarkMode ? '#ffffff' : theme.highlightText;

  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-glow', theme.accentGlow);
  root.style.setProperty('--chassis-bg', theme.chassisBg);
  root.style.setProperty('--chassis-border', theme.chassisBorder);
  root.style.setProperty('--paper-bg', paperBg);
  root.style.setProperty('--paper-text', paperText);
  root.style.setProperty('--highlight-bg', highlightBg);
  root.style.setProperty('--highlight-text', highlightText);
  root.style.setProperty('--ribbon-color', theme.ribbonColor);

  // Smoothly update document body styling
  document.body.style.backgroundColor = theme.chassisBg;
  document.body.style.color = paperText;
}

export function createCustomTheme(hex: string): ThemeConfig {
  let r = 13, g = 12, b = 11;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }

  const darkR = Math.round(r * 0.07);
  const darkG = Math.round(g * 0.07);
  const darkB = Math.round(b * 0.07);

  const borderR = Math.min(255, Math.round(r * 0.22) + 15);
  const borderG = Math.min(255, Math.round(g * 0.22) + 15);
  const borderB = Math.min(255, Math.round(b * 0.22) + 15);

  const chassisBg = `rgb(${darkR}, ${darkG}, ${darkB})`;
  const chassisBorder = `rgb(${borderR}, ${borderG}, ${borderB})`;

  return {
    id: 'custom',
    label: `Custom Hue (${hex})`,
    icon: '🎨',
    description: 'Dynamic user-tuned harmonized palette.',
    accent: hex,
    accentGlow: `rgba(${r}, ${g}, ${b}, 0.5)`,
    chassisBg,
    chassisBorder,
    paperBg: '#fcf9f2',
    paperText: '#1c1917',
    highlightBg: hex,
    highlightText: '#000000',
    ribbonColor: hex,
    darkPaperBg: `rgb(${Math.round(darkR * 1.5) + 5}, ${Math.round(darkG * 1.5) + 5}, ${Math.round(darkB * 1.5) + 5})`,
    darkPaperText: '#f5f5f4',
  };
}

// Centralized color palette for the entire app
export const colors = {
  // Primary brand colors
  sage: '#7D9B76',
  sageDark: '#6B8A64',
  sageLight: '#8FAA88',

  coral: '#722F37',
  coralDark: '#5C252B',
  coralLight: '#8B3F47',

  // Neutrals
  charcoal: '#2D3748',
  lightGray: '#E2E8F0',
  cultured: '#F7FAFC',
  white: '#FFFFFF',

  // Semantic colors
  success: '#48BB78',
  warning: '#F6AD55',
  error: '#F56565',
  info: '#4299E1',

  // Text colors
  textPrimary: '#2D3748',
  textSecondary: 'rgba(45, 55, 72, 0.7)',
  textTertiary: 'rgba(45, 55, 72, 0.5)',
  textDisabled: 'rgba(45, 55, 72, 0.3)',
} as const;

export type Color = keyof typeof colors;

// Tailwind class mappings
export const colorClasses = {
  sage: 'bg-sage text-white',
  coral: 'bg-coral text-white',
  charcoal: 'bg-charcoal text-white',
  lightGray: 'bg-light-gray text-charcoal',
  success: 'bg-green-500 text-white',
  warning: 'bg-orange-500 text-white',
  error: 'bg-red-500 text-white',
} as const;

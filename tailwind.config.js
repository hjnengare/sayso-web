/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Performance optimizations
  future: {
    hoverOnlyWhenSupported: true,
  },
  // Reduce CSS output size
  corePlugins: {
    // Disable unused plugins to reduce CSS size
    preflight: true,
    container: false,
    float: false,
    clear: false,
    skew: false,
    caretColor: false,
    sepia: false,
  },
  theme: {
    extend: {
      colors: {
        // sayso Color Palette
        'page-bg': '#E5E0E5', // Page background
        'card-bg': '#9DAB9B', // Card background
        'navbar-bg': '#722F37', // Navbar background (burgundy - base color)

        // Semantic colors
        success: {
          50: 'hsl(142, 76%, 95%)',
          100: 'hsl(142, 76%, 88%)',
          500: 'hsl(142, 76%, 36%)',
          600: 'hsl(142, 76%, 30%)',
          DEFAULT: 'hsl(142, 76%, 36%)',
        },
        error: {
          50: 'hsl(0, 86%, 95%)',
          100: 'hsl(0, 86%, 88%)',
          500: 'hsl(0, 86%, 59%)',
          600: 'hsl(0, 86%, 53%)',
          DEFAULT: 'hsl(0, 86%, 59%)',
        },
        warning: {
          50: 'hsl(38, 92%, 95%)',
          100: 'hsl(38, 92%, 88%)',
          500: 'hsl(38, 92%, 50%)',
          600: 'hsl(38, 92%, 44%)',
          DEFAULT: 'hsl(38, 92%, 50%)',
        },
        info: {
          50: 'hsl(198, 93%, 95%)',
          100: 'hsl(198, 93%, 88%)',
          500: 'hsl(198, 93%, 60%)',
          600: 'hsl(198, 93%, 54%)',
          DEFAULT: 'hsl(198, 93%, 60%)',
        },

        // Instagram blue for verified badge
        'blue-500': '#3b82f6',
        
        // Brand colors
        sage: '#7D9B76', // Primary brand color
        coral: '#E07A5F', // Secondary brand color (coral)
        burgundy: '#722F37', // Burgundy/wine red
        charcoal: '#2D2D2D', // Dark text color
        'off-white': '#E5E0E5', // Light background color

        // Text colors for proper contrast
        'text-primary': '#2D2D2D', // Dark text for light backgrounds
        'text-secondary': '#5A5A5A', // Medium text
        'text-light': '#FFFFFF', // Light text for dark backgrounds
        'text-muted': '#8A8A8A', // Muted text

        // Utility colors
        'white-30': 'hsla(255, 255, 255, 0.3)',
        'black-70': 'hsla(0, 0%, 0%, 0.7)',
        'black-50': 'hsla(0, 0%, 0%, 0.5)',
        'black-15': 'hsla(0, 0%, 0%, 0.15)',
        'black-10': 'hsla(0, 0%, 0%, 0.1)',
        'black-5': 'hsla(0, 0%, 0%, 0.05)',
        black: 'hsl(0, 0%, 0%)',
        white: 'hsl(0, 0%, 100%)',
      },
      fontFamily: {
        urbanist: ['Urbanist', 'sans-serif'],
        sf: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // SAYSO Typography Scale (Mobile-first, Base = 18px)
        // Increased mobile sizes for better readability
        'hero': ['40px', { lineHeight: '1.2' }],      // Hero Title (increased from 36px)
        'h1': ['34px', { lineHeight: '1.25' }],       // H1 (increased from 30px)
        'h2': ['28px', { lineHeight: '1.25' }],       // H2 (increased from 24px)
        'h3': ['24px', { lineHeight: '1.3' }],        // H3 (increased from 20px)
        'body': ['18px', { lineHeight: '1.55' }],     // Body (Base)
        'body-sm': ['16px', { lineHeight: '1.5' }],   // Small Body
        'caption': ['14px', { lineHeight: '1.4' }],   // Caption
        'micro': ['12px', { lineHeight: '1.4' }],     // Micro Label

        // Legacy numbered scale (for gradual migration)
        1: '4.8rem',
        2: '4rem',
        3: '3.4rem',
        4: '2.4rem',
        5: '2rem',
        6: '1.8rem',
        7: '1.5rem',
        8: '1.4rem',
        9: '1.3rem',

        // Standard Tailwind sizes (kept for compatibility)
        xs: ['0.75rem', { lineHeight: '1.4' }],       // 12px
        sm: ['0.875rem', { lineHeight: '1.4' }],      // 14px
        base: ['1rem', { lineHeight: '1.5' }],        // 16px
        lg: ['1.125rem', { lineHeight: '1.55' }],     // 18px
        xl: ['1.25rem', { lineHeight: '1.3' }],       // 20px
        '2xl': ['1.5rem', { lineHeight: '1.25' }],    // 24px
        '3xl': ['1.875rem', { lineHeight: '1.2' }],   // 30px
        '4xl': ['2.25rem', { lineHeight: '1.2' }],    // 36px
        '5xl': ['3rem', { lineHeight: '1.1' }],       // 48px
        '6xl': ['3.75rem', { lineHeight: '1' }],      // 60px
      },
      fontWeight: {
        400: '400',
        500: '500',
        600: '600',
        700: '700',
        800: '800',
      },
      spacing: {
        section: '35px',
      },
      boxShadow: {
        1: '0 8px 16px hsla(0, 0%, 0%, 0.15)',
        2: '0 4px 10px hsla(0, 0%, 0%, 0.05)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '3xl': '0 35px 60px -12px rgba(0, 0, 0, 0.3)',
        'sage': '0 10px 40px rgba(125, 155, 118, 0.3)',
        'sage-lg': '0 20px 60px rgba(125, 155, 118, 0.4)',
        // Premium all-sided shadows - symmetrical, floating, 3D aesthetic
        // Layered shadows with low opacity, wide spread, subtle blur for Apple/Airbnb/Notion style
        // Shadows are rounded to match card border-radius (12px) with soft 3D feel
        'premium': '0 0 0 1px rgba(0, 0, 0, 0.02), 0 2px 8px -2px rgba(0, 0, 0, 0.04), 0 4px 16px -4px rgba(0, 0, 0, 0.03), 0 8px 32px -8px rgba(0, 0, 0, 0.02)',
        'premiumHover': '0 0 0 1px rgba(0, 0, 0, 0.03), 0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 8px 24px -4px rgba(0, 0, 0, 0.04), 0 12px 40px -8px rgba(0, 0, 0, 0.03)',
        'premiumElevated': '0 0 0 1px rgba(0, 0, 0, 0.02), 0 2px 12px -2px rgba(0, 0, 0, 0.05), 0 4px 24px -4px rgba(0, 0, 0, 0.04), 0 8px 48px -8px rgba(0, 0, 0, 0.03), 0 16px 64px -12px rgba(0, 0, 0, 0.02)',
        'premiumElevatedHover': '0 0 0 1px rgba(0, 0, 0, 0.03), 0 4px 16px -2px rgba(0, 0, 0, 0.06), 0 8px 32px -4px rgba(0, 0, 0, 0.05), 0 12px 56px -8px rgba(0, 0, 0, 0.04), 0 20px 80px -12px rgba(0, 0, 0, 0.03)',
      },
      borderRadius: {
        3: '3px',
        6: '6px',
      },
      transitionTimingFunction: {
        'cubic-in': 'cubic-bezier(0.51, 0.03, 0.64, 0.28)',
        'cubic-out': 'cubic-bezier(0.33, 0.85, 0.4, 0.96)',
      },
      transitionDuration: {
        1: '250ms',
        2: '500ms',
      },
      backgroundImage: {
        gradient: 'linear-gradient(to right, transparent 50%, hsla(0, 0%, 100%, 0.3) 100%)',
        'navbar-gradient': 'linear-gradient(135deg, #722F37 0%, #E07A5F 100%)', // Burgundy to coral gradient
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
      // Safe area utilities for iOS/Android device compatibility
      padding: {
        safe: 'max(1rem, env(safe-area-inset-bottom))',
      },
    },
  },
  plugins: [],
}

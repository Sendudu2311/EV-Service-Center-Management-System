/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // SPLASH Theme - Neon Lime + Dark Mode
        lime: {
          50: '#F0FF66',
          100: '#E6FF33',
          200: '#CCFF00', // Primary accent color
          600: '#B3E600',
          700: '#99CC00',
        },
        dark: {
          50: '#4A5058',
          100: '#3A4048',
          200: '#2A3038',
          300: '#1A1F2E',  // Card backgrounds
          main: '#1A1F2E',
          900: '#0F1419', // Main background
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#F5F5F5',
          tertiary: '#E0E0E0',
          muted: '#A0A0A0',
        },
      },
      backgroundColor: {
        'dark-primary': '#0F1419',
        'dark-secondary': '#1A1F2E',
        'dark-tertiary': '#2A3038',
        'lime-glow': 'rgba(204, 255, 0, 0.1)',
        'lime-glow-strong': 'rgba(204, 255, 0, 0.2)',
        'glass': 'rgba(255, 255, 255, 0.05)',
      },
      textColor: {
        'lime-glow': '#CCFF00',
        'lime-light': '#E6FF33',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(204, 255, 0, 0.15)',
        'glow-strong': '0 0 30px rgba(204, 255, 0, 0.25)',
        'glow-lg': '0 0 40px rgba(204, 255, 0, 0.3)',
        'dark': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'dark-md': '0 10px 15px rgba(0, 0, 0, 0.15)',
        'dark-lg': '0 20px 25px rgba(0, 0, 0, 0.2)',
      },
      borderColor: {
        'lime-accent': '#CCFF00',
        'dark-border': '#2A3038',
      },
      backgroundImage: {
        'lime-gradient': 'linear-gradient(135deg, #CCFF00 0%, #E6FF33 100%)',
        'dark-gradient': 'linear-gradient(135deg, #0F1419 0%, #1A1F2E 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        // ============ Card Utilities ============
        '.card-splash': {
          'background': '#1A1F2E',
          'border': '1px solid #2A3038',
          'border-radius': '0.875rem',
          'box-shadow': '0 4px 6px rgba(0, 0, 0, 0.1)',
          'transition': 'all 0.3s ease-in-out',
        },
        '.card-splash:hover': {
          'border-color': '#CCFF00',
          'box-shadow': '0 0 20px rgba(204, 255, 0, 0.15)',
        },
        '.card-glass': {
          'background': 'rgba(255, 255, 255, 0.05)',
          'backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
          'border-radius': '1rem',
        },

        // ============ Button Utilities ============
        '.btn-lime-primary': {
          'background': '#CCFF00',
          'color': '#0F1419',
          'font-weight': '600',
          'border': '2px solid #CCFF00',
          'border-radius': '0.5rem',
          'transition': 'all 0.2s ease-in-out',
          'box-shadow': '0 0 20px rgba(204, 255, 0, 0.2)',
        },
        '.btn-lime-primary:hover': {
          'background': '#E6FF33',
          'border-color': '#E6FF33',
          'transform': 'translateY(-2px)',
          'box-shadow': '0 0 30px rgba(204, 255, 0, 0.3)',
        },
        '.btn-lime-primary:active': {
          'background': '#B3E600',
          'border-color': '#B3E600',
          'transform': 'translateY(0)',
        },
        '.btn-lime-ghost': {
          'background': 'transparent',
          'color': '#CCFF00',
          'border': '2px solid #CCFF00',
          'border-radius': '0.5rem',
          'font-weight': '600',
          'transition': 'all 0.2s ease-in-out',
        },
        '.btn-lime-ghost:hover': {
          'background': 'rgba(204, 255, 0, 0.1)',
          'box-shadow': '0 0 20px rgba(204, 255, 0, 0.2)',
        },

        // ============ Input Utilities ============
        '.input-splash': {
          'background': '#1A1F2E',
          'border': '2px solid #2A3038',
          'border-radius': '0.5rem',
          'color': '#FFFFFF',
          'padding': '0.625rem 1rem',
          'transition': 'all 0.2s ease-in-out',
        },
        '.input-splash:focus': {
          'outline': 'none',
          'border-color': '#CCFF00',
          'box-shadow': '0 0 20px rgba(204, 255, 0, 0.15)',
          'background': '#1A1F2E',
        },
        '.input-splash::placeholder': {
          'color': '#A0A0A0',
        },

        // ============ Badge Utilities ============
        '.badge-lime': {
          'background': 'rgba(204, 255, 0, 0.1)',
          'color': '#E6FF33',
          'border': '1px solid #CCFF00',
          'padding': '0.375rem 0.75rem',
          'border-radius': '9999px',
          'font-size': '0.75rem',
          'font-weight': '600',
        },
        '.badge-success': {
          'background': 'rgba(204, 255, 0, 0.1)',
          'color': '#E6FF33',
          'border': '1px solid #CCFF00',
        },
        '.badge-error': {
          'background': 'rgba(255, 68, 68, 0.1)',
          'color': '#FF8888',
          'border': '1px solid #FF4444',
        },
        '.badge-warning': {
          'background': 'rgba(255, 183, 77, 0.1)',
          'color': '#FFD700',
          'border': '1px solid #FFB84D',
        },
        '.badge-info': {
          'background': 'rgba(75, 163, 255, 0.1)',
          'color': '#66B3FF',
          'border': '1px solid #4BA3FF',
        },

        // ============ Loading/Animation Utilities ============
        '.spinner-lime': {
          'border': '2px solid rgba(204, 255, 0, 0.2)',
          'border-top-color': '#CCFF00',
          'border-radius': '50%',
          'animation': 'spin 1s linear infinite',
        },
        '.pulse-lime': {
          'animation': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'background': 'rgba(204, 255, 0, 0.1)',
        },

        // ============ Glass Effect ============
        '.glass-effect': {
          'background': 'rgba(15, 20, 25, 0.7)',
          'backdrop-filter': 'blur(16px)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
        },

        // ============ Lime Glow Effect ============
        '.lime-glow': {
          'color': '#CCFF00',
          'text-shadow': '0 0 10px rgba(204, 255, 0, 0.5)',
        },
        '.lime-glow-strong': {
          'color': '#CCFF00',
          'text-shadow': '0 0 20px rgba(204, 255, 0, 0.8)',
        },

        // ============ Text Utilities ============
        '.text-gradient-lime': {
          'background': 'linear-gradient(135deg, #CCFF00 0%, #E6FF33 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },

        // ============ Scrollbar Styling ============
        '.scrollbar-splash': {
          'scrollbar-width': 'thin',
          'scrollbar-color': '#2A3038 #1A1F2E',
        },
        '.scrollbar-splash::-webkit-scrollbar': {
          'width': '8px',
          'height': '8px',
        },
        '.scrollbar-splash::-webkit-scrollbar-track': {
          'background': '#0F1419',
          'border-radius': '4px',
        },
        '.scrollbar-splash::-webkit-scrollbar-thumb': {
          'background': '#2A3038',
          'border-radius': '4px',
          'border': '2px solid #0F1419',
        },
        '.scrollbar-splash::-webkit-scrollbar-thumb:hover': {
          'background': '#CCFF00',
        },

        // ============ Transition Utilities ============
        '.transition-smooth': {
          'transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '.transition-fast': {
          'transition': 'all 0.15s ease-in-out',
        },
      });
    },
  ],
};

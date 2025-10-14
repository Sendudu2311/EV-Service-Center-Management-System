/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Industrial/Metallic Theme Colors
        industrial: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        steel: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        copper: {
          50: '#fef7ed',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        chrome: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        iron: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
        },
      },
      boxShadow: {
        'metal': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'metal-md': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'metal-lg': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'metal-xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      backgroundImage: {
        'metal-gradient': 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
        'copper-gradient': 'linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%)',
        'industrial-gradient': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.card-metal': {
          'background': 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 50%, rgba(71, 85, 105, 0.95) 100%)',
          'border': '2px solid #475569',
          'border-radius': '0.75rem',
          'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(12px)',
        },
        '.panel-metal': {
          'background': 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)',
          'border': '1px solid #475569',
          'border-radius': '0.5rem',
          'box-shadow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        },
        '.btn-copper': {
          'background': 'linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%)',
          'border': '2px solid #78350f',
          'color': 'white',
          'font-weight': '600',
          'text-shadow': '0 1px 2px rgba(0, 0, 0, 0.3)',
          'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          'transition': 'all 0.2s ease-in-out',
        },
        '.btn-copper:hover': {
          'background': 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)',
          'transform': 'translateY(-1px)',
          'box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        },
        '.input-metal': {
          'background': 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)',
          'border': '2px solid #475569',
          'border-radius': '0.5rem',
          'color': '#f1f5f9',
          'box-shadow': 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
          'transition': 'all 0.2s ease-in-out',
        },
        '.input-metal:focus': {
          'border-color': '#d97706',
          'box-shadow': '0 0 0 3px rgba(217, 119, 6, 0.1), inset 0 2px 4px rgba(0, 0, 0, 0.1)',
          'outline': 'none',
        },
        '.input-metal::placeholder': {
          'color': '#94a3b8',
        },
        '.scrollbar-metal': {
          'scrollbar-width': 'thin',
          'scrollbar-color': '#475569 #1e293b',
        },
        '.scrollbar-metal::-webkit-scrollbar': {
          'width': '8px',
        },
        '.scrollbar-metal::-webkit-scrollbar-track': {
          'background': '#1e293b',
          'border-radius': '4px',
        },
        '.scrollbar-metal::-webkit-scrollbar-thumb': {
          'background': '#475569',
          'border-radius': '4px',
        },
        '.scrollbar-metal::-webkit-scrollbar-thumb:hover': {
          'background': '#64748b',
        },
        '.text-metal': {
          'background': 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
      });
    },
  ],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        amber: {
          350: '#fbbf24',
        },
        brand: {
          cyan: '#06b6d4',
          purple: '#8b5cf6',
          amber: '#f59e0b',
        },
      },
      animation: {
        blob: "blob 8s infinite ease-in-out",
        'float': "float 3s ease-in-out infinite",
        'pulse-glow': "pulse-glow 2s ease-in-out infinite",
        'spin-slow': "spin-slow 8s linear infinite",
        'bounce-subtle': "bounce-subtle 2s ease-in-out infinite",
        'gradient-shift': "gradient-shift 4s ease infinite",
      },
      keyframes: {
        blob: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -20px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};

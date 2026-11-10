import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../shared/src/**/*.{ts,tsx}',
    '../ai-components/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      boxShadow: {
        '2xl': '0 25px 40px 8px rgb(0 0 0 / 0.25)',
      },
      backgroundImage: {
        'radial-gradient': 'radial-gradient(var(--tw-gradient-stops))',
        'shimmer-gradient':
          'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'color-shift-1': 'color-shift-1 15s ease-in-out infinite',
        'color-shift-2': 'color-shift-2 18s ease-in-out infinite',
        'color-shift-3': 'color-shift-3 20s ease-in-out infinite',
        'color-shift-4': 'color-shift-4 22s ease-in-out infinite',
        'color-shift-5': 'color-shift-5 16s ease-in-out infinite',
        'float-1': 'float-1 25s ease-in-out infinite',
        'float-2': 'float-2 30s ease-in-out infinite',
        'float-3': 'float-3 28s ease-in-out infinite',
        'float-4': 'float-4 32s ease-in-out infinite',
        'float-5': 'float-5 27s ease-in-out infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
      },
      animationDelay: {
        '3s': '3s',
        '5s': '5s',
        '7s': '7s',
        '10s': '10s',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '0.95',
            transform: 'scale(1.02)',
          },
        },
        'color-shift-1': {
          '0%, 100%': { filter: 'hue-rotate(0deg) brightness(1)' },
          '33%': { filter: 'hue-rotate(30deg) brightness(1.1)' },
          '66%': { filter: 'hue-rotate(-30deg) brightness(0.9)' },
        },
        'color-shift-2': {
          '0%, 100%': { filter: 'hue-rotate(0deg) brightness(1)' },
          '33%': { filter: 'hue-rotate(60deg) brightness(1.15)' },
          '66%': { filter: 'hue-rotate(-45deg) brightness(0.85)' },
        },
        'color-shift-3': {
          '0%, 100%': { filter: 'hue-rotate(0deg) brightness(1)' },
          '33%': { filter: 'hue-rotate(-40deg) brightness(1.2)' },
          '66%': { filter: 'hue-rotate(50deg) brightness(0.9)' },
        },
        'color-shift-4': {
          '0%, 100%': { filter: 'hue-rotate(0deg) brightness(1)' },
          '33%': { filter: 'hue-rotate(45deg) brightness(1.1)' },
          '66%': { filter: 'hue-rotate(-60deg) brightness(1.05)' },
        },
        'color-shift-5': {
          '0%, 100%': { filter: 'hue-rotate(0deg) brightness(1)' },
          '33%': { filter: 'hue-rotate(-50deg) brightness(0.95)' },
          '66%': { filter: 'hue-rotate(40deg) brightness(1.15)' },
        },
        'float-1': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(180px, -150px) scale(1.15)' },
          '50%': { transform: 'translate(-150px, 200px) scale(0.85)' },
          '75%': { transform: 'translate(160px, 100px) scale(1.1)' },
        },
        'float-2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(-200px, 180px) scale(1.2)' },
          '50%': { transform: 'translate(250px, -120px) scale(0.8)' },
          '75%': { transform: 'translate(-180px, -160px) scale(1.15)' },
        },
        'float-3': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(220px, 170px) scale(0.85)' },
          '50%': { transform: 'translate(-160px, -200px) scale(1.25)' },
          '75%': { transform: 'translate(140px, -150px) scale(0.9)' },
        },
        'float-4': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(-240px, -130px) scale(1.15)' },
          '50%': { transform: 'translate(200px, 220px) scale(0.85)' },
          '75%': { transform: 'translate(-170px, 150px) scale(1.2)' },
        },
        'float-5': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(190px, -180px) scale(1.1)' },
          '50%': { transform: 'translate(-210px, 140px) scale(1.15)' },
          '75%': { transform: 'translate(170px, 210px) scale(0.9)' },
        },
        shimmer: {
          '0%, 100%': {
            backgroundPosition: '-200% 0',
            textShadow: '0 0 0 rgba(255, 255, 255, 0)',
          },
          '50%': {
            backgroundPosition: '200% 0',
            textShadow:
              '0 0 8px rgba(255, 255, 255, 0.6), 0 0 12px rgba(255, 255, 255, 0.4)',
          },
        },
      },
    },
  },
  plugins: [
    // 添加 animation-delay 支持
    plugin(({ matchUtilities, theme }) => {
      matchUtilities(
        {
          'animation-delay': (value: string) => ({
            'animation-delay': value,
          }),
          delay: (value: string) => ({
            'animation-delay': value,
          }),
        },
        { values: theme('animationDelay') }
      );
    }),
  ],
};

export default config;

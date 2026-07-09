/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg:       '#080c14',
          panel:    '#0d1520',
          border:   '#1a2840',
          accent:   '#00d4ff',
          green:    '#00ff9d',
          red:      '#ff2d55',
          yellow:   '#ffd60a',
          purple:   '#bf5af2',
          text:     '#c8d8f0',
          muted:    '#4a6080',
        }
      },
      fontFamily: {
        mono:    ['"JetBrains Mono"', 'monospace'],
        display: ['"Orbitron"', 'sans-serif'],
        body:    ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'cyber':      '0 0 20px rgba(0,212,255,0.15), 0 0 60px rgba(0,212,255,0.05)',
        'cyber-red':  '0 0 20px rgba(255,45,85,0.25), 0 0 60px rgba(255,45,85,0.08)',
        'cyber-green':'0 0 20px rgba(0,255,157,0.20), 0 0 60px rgba(0,255,157,0.06)',
        'cyber-yellow':'0 0 20px rgba(255,214,10,0.20)',
      },
      animation: {
        'pulse-slow':  'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'scan':        'scan 3s linear infinite',
        'float':       'float 6s ease-in-out infinite',
        'glitch':      'glitch 0.3s steps(2) infinite',
      },
      keyframes: {
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-10px)' },
        },
        glitch: {
          '0%':   { clipPath: 'inset(10% 0 80% 0)' },
          '50%':  { clipPath: 'inset(70% 0 10% 0)' },
          '100%': { clipPath: 'inset(40% 0 40% 0)' },
        }
      }
    }
  },
  plugins: []
}

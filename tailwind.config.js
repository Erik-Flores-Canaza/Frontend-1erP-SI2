/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        'app-bg':       '#0D1117',
        'app-card':     '#161B22',
        'app-elevated': '#1C2128',
        'app-border':   '#30363D',
        'app-subtle':   '#21262D',
        'accent':       '#E63946',
        'accent-hover': '#FF4D5A',
        'accent-orange':'#F4A261',
        'app-text':     '#E6EDF3',
        'app-muted':    '#8B949E',
        'app-faint':    '#484F58',
        'success':      '#3FB950',
        'warning':      '#D29922',
        'danger':       '#F85149',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      width: {
        sidebar:    '256px',
        'sidebar-sm': '68px',
      },
      height: {
        header: '64px',
      },
    },
  },
  plugins: [],
};

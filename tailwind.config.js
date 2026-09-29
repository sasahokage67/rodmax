/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#060a08',
        surface: '#0b1410',
        'surface-elevated': '#101d17',
        'primary-green': '#10b981',
        'neon-mint': '#34d399',
        'deep-teal': '#064e3b'
      },
      fontFamily: {
        arcade: ['"Press Start 2P"', 'monospace'],
        pixel: ['"Pixelify Sans"', 'monospace'],
        silkscreen: ['"Silkscreen"', 'monospace'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}

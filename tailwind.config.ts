
import type { Config } from 'tailwindcss'

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  
  theme: {
    extend: {
      colors: {
        vibrant: {
          emerald: '#00ff9c',
          cyan: '#00e5ff',
          rose: '#ff4d6d',
          orange: '#ff7b00',
          yellow: '#ffe600',
        }
      },
    },
  },

  },
  plugins: [],
} satisfies Config

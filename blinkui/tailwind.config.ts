import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./blinkfarms/src/**/*.{js,ts,jsx,tsx,mdx}",
    "./blinkfarms/src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./blinkfarms/src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./blinkfarms/src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // New Earth & Forest Palette (Extracted from PPG Histor Swatches)
        forest: {
          50: '#F3F6F3',
          100: '#E3E9E2',
          200: '#C7D3C5',
          300: '#A3B6A0',
          400: '#758F72',
          500: '#546C51',
          600: '#435840',
          700: '#384536', // Official Forest Ruin PPG1114-6
          800: '#2F3C2E',
          900: '#253024',
          950: '#172016',
        },
        cream: {
          50: '#FAF8F4',
          100: '#F6F2EA',
          200: '#EFDFC8', // Official Cream Frosting PPG1015-1
          300: '#E4CFB2',
          400: '#D5B892',
          500: '#BA976D',
          600: '#9E784F',
          700: '#7D5C39',
          800: '#5F452A',
          900: '#42301D',
          950: '#271B0F',
        },
      },
    },
  },
  plugins: [],
};
export default config;

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: process.env.DARK_MODE ? process.env.DARK_MODE : 'class', // or 'media' or 'class'
  content: [
    './app/**/*.{html,js,jsx,ts,tsx,mdx}',
    './components/**/*.{html,js,jsx,ts,tsx,mdx}',
    './utils/**/*.{html,js,jsx,ts,tsx,mdx}',
    './*.{html,js,jsx,ts,tsx,mdx}',
    './src/**/*.{html,js,jsx,ts,tsx,mdx}',
  ],
  presets: [require('nativewind/preset')],
  important: 'html',
  safelist: [
    {
      pattern:
        /(bg|border|text|stroke|fill)-(primary|secondary|tertiary|error|success|warning|info|typography|outline|background|indicator)-(0|50|100|200|300|400|500|600|700|800|900|950|white|gray|black|error|warning|muted|success|info|light|dark|primary)/,
    },
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#42A59F', // button primary color
        },
        secondary: {
          500: '#51BEA1', // button secondary color
        },
        tertiary: {
          500: '#A3F7B5', // button tertiary color
        },
        error: {
          500: '#f31261', // button error color
        },
        negative: {
          500: '#f31261', // button negative color
        },
        success: {
          500: '#17c964', // button success color
        },
        warning: {
          500: '#FBBF24'
        },
        info: {
          500: '#3B82F6',
        },
        typography: {
          500: '#1F2937',
          white: '#FFFFFF',
          gray: '#D4D4D4',
          black: '#181718',
        },
        outline: {
          500: '#E5E7EB',
        },
        background: {
          light: '#e3f7f3',
          "mint-light": '#A3F7B5',
          "emerald-medium": '#51BEA1',
          "teal-medium": '#72E0AC',
          "teal-dark": '#42A59F',
          dark: '#42A59F',
        },
      },
    },
  },
};

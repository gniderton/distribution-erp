/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        card: '#151D30',
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          focus: '#1D4ED8',
        },
        secondary: '#10B981',
        muted: '#6B7280',
        border: '#1F2937',
        text: {
          primary: '#F3F4F6',
          secondary: '#9CA3AF',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontWeight:{
        normal: 490
      },
      boxShadow: {
        '3xl': '0 -100px 80px -15px rgba(0, 0, 0, 0.3)',
      },
      colors:{
        violet:{
          200: "#E0E7FF",
          500: "#5046E5",

        },
        gray:{
          200: "#E1E7E9",
          300: "#e1d89b"
        },
        blue:{
          500: "#0062D1",
          200: "#95BEFE"
        }
      }
    },
  },
  plugins: [],
}


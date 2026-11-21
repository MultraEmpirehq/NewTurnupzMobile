/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // The app is light-only (app.json), so NativeWind sets the scheme itself; with
  // the default "media" mode that throws on web and the page renders blank.
  darkMode: "class",
  theme: {
    extend: {
      spacing: {
        horizontal: "20px"
      },
      // Plus Jakarta Sans cuts (loaded in App.tsx) for a plain Text/TextInput
      // that doesn't go through TextComponent, which picks the cut itself.
      fontFamily: {
        sans: ["PlusJakartaSans-Regular"],
        "jakarta-light": ["PlusJakartaSans-Light"],
        "jakarta-regular": ["PlusJakartaSans-Regular"],
        "jakarta-medium": ["PlusJakartaSans-Medium"],
        "jakarta-semibold": ["PlusJakartaSans-SemiBold"],
        "jakarta-bold": ["PlusJakartaSans-Bold"],
        "jakarta-extrabold": ["PlusJakartaSans-ExtraBold"]
      },
      colors: {
        text: {
          DEFAULT: "rgb(var(--text-default)  / <alpha-value>)",
          50: "rgb(var(--text-50)  / <alpha-value>)",
          100: "rgb(var(--text-100)  / <alpha-value>)",
          200: "rgb(var(--text-200)  / <alpha-value>)",
          300: "rgb(var(--text-300)  / <alpha-value>)",
          400: "rgb(var(--text-400)  / <alpha-value>)",
          500: "rgb(var(--text-500)  / <alpha-value>)",
          600: "rgb(var(--text-600)  / <alpha-value>)",
          700: "rgb(var(--text-700)  / <alpha-value>)",
          800: "rgb(var(--text-800)  / <alpha-value>)",
          900: "rgb(var(--text-900)  / <alpha-value>)",
          950: "rgb(var(--text-950)  / <alpha-value>)"
        },
        background: {
          DEFAULT: "rgb(var(--background-default)  / <alpha-value>)",
          50: "rgb(var(--background-50)  / <alpha-value>)",
          100: "rgb(var(--background-100)  / <alpha-value>)",
          200: "rgb(var(--background-200)  / <alpha-value>)",
          300: "rgb(var(--background-300)  / <alpha-value>)",
          400: "rgb(var(--background-400)  / <alpha-value>)",
          500: "rgb(var(--background-500)  / <alpha-value>)",
          600: "rgb(var(--background-600)  / <alpha-value>)",
          700: "rgb(var(--background-700)  / <alpha-value>)",
          800: "rgb(var(--background-800)  / <alpha-value>)",
          900: "rgb(var(--background-900)  / <alpha-value>)",
          950: "rgb(var(--background-950)  / <alpha-value>)"
        },
        // Blue words on light backgrounds (see BRAND.link): readable, unlike the bright primary.
        link: "#0577FA",
        primary: {
          DEFAULT: "rgb(var(--primary-default)  / <alpha-value>)",
          50: "rgb(var(--primary-50)  / <alpha-value>)",
          100: "rgb(var(--primary-100)  / <alpha-value>)",
          200: "rgb(var(--primary-200)  / <alpha-value>)",
          300: "rgb(var(--primary-300)  / <alpha-value>)",
          400: "rgb(var(--primary-400)  / <alpha-value>)",
          500: "rgb(var(--primary-500)  / <alpha-value>)",
          600: "rgb(var(--primary-600)  / <alpha-value>)",
          700: "rgb(var(--primary-700)  / <alpha-value>)",
          800: "rgb(var(--primary-800)  / <alpha-value>)",
          900: "rgb(var(--primary-900)  / <alpha-value>)",
          950: "rgb(var(--primary-950)  / <alpha-value>)"
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary-default)  / <alpha-value>)",
          50: "rgb(var(--secondary-50)  / <alpha-value>)",
          100: "rgb(var(--secondary-100)  / <alpha-value>)",
          200: "rgb(var(--secondary-200)  / <alpha-value>)",
          300: "rgb(var(--secondary-300)  / <alpha-value>)",
          400: "rgb(var(--secondary-400)  / <alpha-value>)",
          500: "rgb(var(--secondary-500)  / <alpha-value>)",
          600: "rgb(var(--secondary-600)  / <alpha-value>)",
          700: "rgb(var(--secondary-700)  / <alpha-value>)",
          800: "rgb(var(--secondary-800)  / <alpha-value>)",
          900: "rgb(var(--secondary-900)  / <alpha-value>)",
          950: "rgb(var(--secondary-950)  / <alpha-value>)"
        },
        tetiary: {
          DEFAULT: "rgb(var(--tetiary-default)  / <alpha-value>)",
          50: "rgb(var(--tetiary-50)  / <alpha-value>)",
          100: "rgb(var(--tetiary-100)  / <alpha-value>)",
          200: "rgb(var(--tetiary-200)  / <alpha-value>)",
          300: "rgb(var(--tetiary-300)  / <alpha-value>)",
          400: "rgb(var(--tetiary-400)  / <alpha-value>)",
          500: "rgb(var(--tetiary-500)  / <alpha-value>)",
          600: "rgb(var(--tetiary-600)  / <alpha-value>)",
          700: "rgb(var(--tetiary-700)  / <alpha-value>)",
          800: "rgb(var(--tetiary-800)  / <alpha-value>)",
          900: "rgb(var(--tetiary-900)  / <alpha-value>)",
          950: "rgb(var(--tetiary-950)  / <alpha-value>)"
        }
      }
    }
  },
  plugins: []
};

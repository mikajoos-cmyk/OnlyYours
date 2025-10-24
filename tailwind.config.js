module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(0, 0%, 15%)",
        input: "hsl(0, 0%, 15%)",
        ring: "hsl(45, 63%, 52%)",
        background: "hsl(0, 0%, 0%)",
        foreground: "hsl(45, 63%, 92%)",
        primary: {
          DEFAULT: "hsl(0, 0%, 0%)",
          foreground: "hsl(45, 63%, 92%)",
        },
        secondary: {
          DEFAULT: "hsl(45, 63%, 52%)",
          foreground: "hsl(0, 0%, 0%)",
        },
        tertiary: {
          DEFAULT: "hsl(0, 0%, 10%)",
          foreground: "hsl(45, 63%, 92%)",
        },
        neutral: {
          DEFAULT: "hsl(0, 0%, 15%)",
          foreground: "hsl(45, 63%, 52%)",
        },
        destructive: {
          DEFAULT: "hsl(0, 84%, 60%)",
          foreground: "hsl(50, 30%, 92%)",
        },
        success: {
          DEFAULT: "hsl(145, 38%, 45%)",
          foreground: "hsl(50, 30%, 92%)",
        },
        warning: {
          DEFAULT: "hsl(35, 90%, 55%)",
          foreground: "hsl(0, 0%, 0%)",
        },
        muted: {
          DEFAULT: "hsl(0, 0%, 20%)",
          foreground: "hsl(45, 30%, 70%)",
        },
        accent: {
          DEFAULT: "hsl(45, 63%, 52%)",
          foreground: "hsl(0, 0%, 0%)",
        },
        popover: {
          DEFAULT: "hsl(0, 0%, 0%)",
          foreground: "hsl(45, 63%, 92%)",
        },
        card: {
          DEFAULT: "hsl(0, 0%, 10%)",
          foreground: "hsl(45, 63%, 92%)",
        },
        gray: {
          50: "hsl(0, 0%, 96%)",
          100: "hsl(0, 0%, 90%)",
          200: "hsl(0, 0%, 80%)",
          300: "hsl(0, 0%, 70%)",
          400: "hsl(0, 0%, 60%)",
          500: "hsl(0, 0%, 50%)",
          600: "hsl(0, 0%, 40%)",
          700: "hsl(0, 0%, 30%)",
          800: "hsl(0, 0%, 22%)",
          900: "hsl(0, 0%, 14%)",
        },
      },
      fontFamily: {
        sans: ["Lato", "sans-serif"],
        serif: ["Playfair", "serif"],
      },
      spacing: {
        '4': '1rem',
        '8': '2rem',
        '12': '3rem',
        '16': '4rem',
        '24': '6rem',
        '32': '8rem',
        '48': '12rem',
        '64': '16rem',
      },
      borderRadius: {
        lg: "0.75rem",
        md: "calc(0.75rem - 2px)",
        sm: "calc(0.75rem - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-gold": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.2)", opacity: "0.8" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-in",
        "slide-up": "slide-up 0.3s ease-out",
        "pulse-gold": "pulse-gold 0.6s ease-in-out",
      },
      backgroundImage: {
        "gradient-1": "linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 100%)",
        "gradient-2": "linear-gradient(135deg, hsl(45, 63%, 52%) 0%, hsl(45, 63%, 42%) 100%)",
        "button-border-gradient": "linear-gradient(90deg, hsla(45, 63%, 52%, 0.8) 0%, hsla(45, 63%, 65%, 0.8) 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(280, 12%, 25%)",
        input: "hsl(280, 12%, 25%)",
        ring: "hsl(45, 63%, 52%)",
        background: "hsl(276, 30%, 18%)",
        foreground: "hsl(50, 30%, 92%)",
        primary: {
          DEFAULT: "hsl(276, 30%, 18%)",
          foreground: "hsl(50, 30%, 92%)",
        },
        secondary: {
          DEFAULT: "hsl(45, 63%, 52%)",
          foreground: "hsl(276, 30%, 18%)",
        },
        tertiary: {
          DEFAULT: "hsl(50, 30%, 92%)",
          foreground: "hsl(276, 30%, 18%)",
        },
        neutral: {
          DEFAULT: "hsl(280, 12%, 25%)",
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
          foreground: "hsl(276, 30%, 18%)",
        },
        muted: {
          DEFAULT: "hsl(280, 12%, 25%)",
          foreground: "hsl(276, 10%, 70%)",
        },
        accent: {
          DEFAULT: "hsl(45, 63%, 52%)",
          foreground: "hsl(276, 30%, 18%)",
        },
        popover: {
          DEFAULT: "hsl(276, 30%, 18%)",
          foreground: "hsl(50, 30%, 92%)",
        },
        card: {
          DEFAULT: "hsl(276, 35%, 24%)",
          foreground: "hsl(50, 30%, 92%)",
        },
        gray: {
          50: "hsl(276, 15%, 96%)",
          100: "hsl(276, 14%, 90%)",
          200: "hsl(276, 12%, 80%)",
          300: "hsl(276, 10%, 70%)",
          400: "hsl(276, 9%, 60%)",
          500: "hsl(276, 8%, 50%)",
          600: "hsl(276, 10%, 40%)",
          700: "hsl(276, 15%, 30%)",
          800: "hsl(276, 20%, 22%)",
          900: "hsl(276, 30%, 14%)",
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
        "gradient-1": "linear-gradient(135deg, hsl(276, 30%, 18%) 0%, hsl(276, 35%, 24%) 100%)",
        "gradient-2": "linear-gradient(135deg, hsl(45, 63%, 52%) 0%, hsl(45, 63%, 42%) 100%)",
        "button-border-gradient": "linear-gradient(90deg, hsla(45, 63%, 52%, 0.8) 0%, hsla(45, 63%, 65%, 0.8) 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

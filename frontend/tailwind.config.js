/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-out',
        'success': 'success 0.5s ease-out',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-out',
        'zoom-in-90': 'zoom-in-90 0.2s ease-out',
        'zoom-out-95': 'zoom-out-95 0.2s ease-out',
        'slide-in-from-left-52': 'slide-in-from-left-52 0.2s ease-out',
        'slide-in-from-right-52': 'slide-in-from-right-52 0.2s ease-out',
        'slide-out-to-left-52': 'slide-out-to-left-52 0.2s ease-out',
        'slide-out-to-right-52': 'slide-out-to-right-52 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        success: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'zoom-in-90': {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'zoom-out-95': {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(0.95)' },
        },
        'slide-in-from-left-52': {
          from: { transform: 'translateX(-208px)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-from-right-52': {
          from: { transform: 'translateX(208px)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-out-to-left-52': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-208px)' },
        },
        'slide-out-to-right-52': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(208px)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

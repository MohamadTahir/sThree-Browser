/** @type {import('tailwindcss').Config} */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", "16px"],
        xs: ["12.5px", "18px"],
        sm: ["14px", "21px"],
        base: ["15px", "22px"],
        lg: ["17px", "26px"],
        xl: ["20px", "28px"],
        "2xl": ["24px", "32px"],
      },
      borderRadius: {
        sm: "5px",
        DEFAULT: "8px",
        md: "8px",
        lg: "10px",
        xl: "14px",
      },
      colors: {
        background: token("bg"),
        sidebar: token("sidebar"),
        subtle: token("subtle"),
        muted: token("muted"),
        foreground: token("fg"),
        "muted-foreground": token("fg-muted"),
        border: token("border"),
        "border-strong": token("border-strong"),
        primary: {
          DEFAULT: token("accent"),
          foreground: token("accent-fg"),
          subtle: token("accent-subtle"),
          text: token("accent-text"),
        },
        success: token("success"),
        warning: token("warning"),
        danger: {
          DEFAULT: token("danger"),
          solid: token("danger-solid"),
          subtle: token("danger-subtle"),
        },
        ring: token("ring"),
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(16 24 40 / 0.05)",
        card: "0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)",
        popover: "0 12px 32px -8px rgb(16 24 40 / 0.18), 0 4px 8px -4px rgb(16 24 40 / 0.06)",
        dialog: "0 24px 56px -12px rgb(16 24 40 / 0.28), 0 8px 16px -8px rgb(16 24 40 / 0.1)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        shimmer: "shimmer 1.4s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

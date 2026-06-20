/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0F1115",
        panel: "#15181E",
        raised: "#1B1F27",
        hairline: "#262B35",
        ink: "#E8EAED",
        mute: "#8B919C",
        amber: {
          DEFAULT: "#F0A84B",
          dim: "#7A5A2C",
        },
        teal: {
          DEFAULT: "#4FD1AE",
          dim: "#2C5C4F",
        },
        violet: {
          DEFAULT: "#8B8FFF",
          dim: "#3D3E6E",
        },
        danger: "#E86A6A",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      keyframes: {
        signal: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        signal: "signal 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

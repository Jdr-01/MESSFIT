import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F6FBD9",
        coral: "#F77F5B",
        yellow: "#F9D85C",
        purple: "#D7C3F8",
        darkGray: "#2F2F2F",
        mediumGray: "#5A5A5A",
        lightGray: "#9E9E9E",
        success: "#CFE57A",
        // Legacy support
        primary: "#F77F5B",
        secondary: "#CFE57A",
        accent: "#F9D85C",
      },
    },
  },
  plugins: [],
};
export default config;

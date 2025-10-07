import tailwindcss from "@tailwindcss/postcss";

/** @type {import('postcss').Config} */
const config = {
  plugins: {
    tailwindcss,
    autoprefixer: {},
  },
};

export default config;

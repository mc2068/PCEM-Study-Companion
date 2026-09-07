const config = {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css,mjs,yml,yaml}": ["prettier --write"],
};

export default config;

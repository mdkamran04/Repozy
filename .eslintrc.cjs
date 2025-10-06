/** @type {import("eslint").Linter.Config} */
const config = {
  // 1. Add 'extends' for recommended rules and Next.js
  extends: [
    // Next.js recommended rules for application structure and components
    "next/core-web-vitals", 
    
    // Recommended TypeScript rules
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  plugins: ["@typescript-eslint"],
  
  // OPTIONAL: Add 'rules' for project-specific overrides if needed
  // rules: {
  //   "@typescript-eslint/no-unused-vars": "error",
  // },
};

module.exports = config;
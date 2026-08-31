import js from "@eslint/js";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/.next/**", "**/cdk.out/**", "**/coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  security.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["apps/api/prisma.config.ts", "apps/api/prisma/seed.ts"]
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
);

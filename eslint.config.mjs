import { defineConfig, globalIgnores } from "eslint/config";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  globalIgnores([
    "src/api/database/sequelize-adapter-src",
    "**/next.config.js",
  ]),

  {
    extends: compat.extends(
      "next/core-web-vitals",
      "plugin:@typescript-eslint/recommended",
      "plugin:prettier/recommended",
    ),

    rules: {
      "object-curly-spacing": ["error", "always"],
      semi: ["error", "always"],

      "import/no-restricted-paths": ["error", {
        zones: [{
          target: "./src/api",
          from: ["./src"],
          except: ["./api", "./shared", "./pages/api"],
          message: "Files in `src/api` must not refer to files outside of `src/api`, `src/shared` or `src/pages/api`. See README.md",
        }, {
          target: "./src/shared",
          from: ["./src"],
          except: ["./shared"],
          message: "Files in `src/shared` must not refer to files outside of `src/shared`. See README.md",
        }, {
          target: [
            "./src/!(api|pages)/**/*",
            "./src/pages/!(api)/**/*",
            "./src/*.[t]*",
            "./src/pages/*.[t]*",
          ],

          from: ["./src/api/"],
          except: ["./apiRouter.ts"],
          message: "Files outside of `src/api` must not refer to files in `src/api`. See README.md",
        }],
      }],

      "import/no-absolute-path": "error",
      "require-await": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
    
      // TODO: Other @typescript-eslint rules to be reset to default
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./tsconfig.json"],
      },
    },
  },
]);

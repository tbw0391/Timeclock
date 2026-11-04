import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // supabase/functions is Deno code that runs on Supabase, not part of the Next app.
  { ignores: ["node_modules/**", ".next/**", "next-env.d.ts", "supabase/functions/**"] },
];

export default config;

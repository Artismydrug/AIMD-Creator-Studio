// Minimal ImportMeta declarations so this lib compiles without a vite dependency.
interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

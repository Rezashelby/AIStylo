/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STYLIST_API?: string
  readonly VITE_STYLIST_API_KEY?: string
}
interface ImportMeta { readonly env: ImportMetaEnv }

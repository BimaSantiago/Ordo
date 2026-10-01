type CryptoLike = Pick<Crypto, "getRandomValues"> & { randomUUID?: () => string };

/**
 * UUID v4 generado en el cliente (sección 6 de CLAUDE.md).
 * `crypto.randomUUID()` solo existe en contextos seguros (HTTPS o localhost): al abrir la app
 * desde el celular por la IP de la PC (http://192.168.x.x) no está, y por eso hay respaldo con
 * `getRandomValues`, que sí existe en cualquier contexto.
 */
export function createId(source: CryptoLike = globalThis.crypto): string {
  if (typeof source.randomUUID === "function") return source.randomUUID();

  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

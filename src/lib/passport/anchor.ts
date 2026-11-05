import type { LotVerification } from "./api";
import type { LotPassport } from "./types";

// Verificación del anclaje del expediente (contrato de la Ola 3 §7.3, PUB-03). Al certificar un
// lote, el SHA-256 de su expediente se registra como `memo` de una transacción de la red. El visor
// lo comprueba por su cuenta: descarga los bytes canónicos, recalcula la huella con WebCrypto en
// el navegador y la compara con la que publica el pasaporte (`dossier.hash`) y con la del memo
// (`anchor.memoHashHex`). Módulo puro: sin red ni React.

export type DossierAnchor = NonNullable<LotPassport["dossier"]["anchor"]>;

/**
 * Qué puede decir el visor del anclaje:
 * - `none`: no hay anclaje (expediente abierto, o un backend que aún responde `anchor: null`).
 * - `pending`: la transacción existe pero la red aún no la confirmó (`FAILED` se publica así).
 * - `anchored`: confirmada, con su hash de transacción.
 */
export type AnchorStage = "none" | "pending" | "anchored";

export function anchorStage(lot: LotPassport): AnchorStage {
  const anchor = lot.dossier.anchor;
  if (lot.dossier.status !== "CLOSED" || !anchor) return "none";
  return anchor.status === "ANCHORED" && anchor.txHash ? "anchored" : "pending";
}

const sameHash = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a) && Boolean(b) && a!.trim().toLowerCase() === b!.trim().toLowerCase();

/** SHA-256 en hexadecimal con WebCrypto; `null` si el navegador no lo ofrece (origen no seguro). */
export async function sha256HexOf(bytes: Uint8Array): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const digest = await subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export type FingerprintResult =
  /** La huella recalculada es la publicada y la del memo de la transacción. */
  | { status: "match"; computed: string }
  /** No coincide con alguna de las dos: `dossier` y `memo` dicen con cuál sí. */
  | { status: "mismatch"; computed: string; dossier: boolean; memo: boolean }
  /** Este navegador no puede calcularla aquí. */
  | { status: "unsupported" };

/** Recalcula la huella de los bytes canónicos y la compara con la publicada y con la del memo. */
export async function recomputeFingerprint(
  bytes: Uint8Array,
  expected: { dossierHash: string | null; memoHashHex: string | null },
): Promise<FingerprintResult> {
  const computed = await sha256HexOf(bytes);
  if (computed === null) return { status: "unsupported" };
  const dossier = sameHash(computed, expected.dossierHash);
  const memo = sameHash(computed, expected.memoHashHex);
  return dossier && memo ? { status: "match", computed } : { status: "mismatch", computed, dossier, memo };
}

export const ANCHOR_CHECK_KEYS = [
  "DOSSIER_CLOSED",
  "ANCHOR_CONFIRMED",
  "MEMO_MATCHES_HASH",
  "ANCHOR_ACCOUNT_OFFICIAL",
] as const;
export type AnchorCheckKey = (typeof ANCHOR_CHECK_KEYS)[number];

export type AnchorCheck = {
  key: AnchorCheckKey;
  /** `null`: aún no aplica (servidor) o no se puede comprobar desde aquí (visor). */
  pass: boolean | null;
  /** Explicación del servidor; `null` en las comprobaciones propias del visor. */
  message: string | null;
  source: "server" | "viewer";
};

/**
 * Las cuatro comprobaciones con lo que trae el propio pasaporte, para cuando el servicio de
 * verificación no responde. La cuenta oficial no se puede contrastar desde aquí: queda en `null`.
 */
export function viewerChecks(lot: LotPassport): AnchorCheck[] {
  const { dossier } = lot;
  const anchor = dossier.anchor;
  const pass: Record<AnchorCheckKey, boolean | null> = {
    DOSSIER_CLOSED: dossier.status === "CLOSED",
    ANCHOR_CONFIRMED: anchor ? anchor.status === "ANCHORED" && Boolean(anchor.txHash) : null,
    MEMO_MATCHES_HASH: anchor && dossier.hash ? sameHash(anchor.memoHashHex, dossier.hash) : null,
    ANCHOR_ACCOUNT_OFFICIAL: null,
  };
  return ANCHOR_CHECK_KEYS.map((key) => ({ key, pass: pass[key], message: null, source: "viewer" }));
}

/** Las comprobaciones del servidor, en el orden fijo del contrato; las que falten, del visor. */
export function anchorChecks(lot: LotPassport, verification: LotVerification | null): AnchorCheck[] {
  const own = viewerChecks(lot);
  if (!verification) return own;
  return own.map((fallback) => {
    const check = verification.checks.find((c) => c.key === fallback.key);
    return check ? { key: fallback.key, pass: check.pass, message: check.message, source: "server" } : fallback;
  });
}

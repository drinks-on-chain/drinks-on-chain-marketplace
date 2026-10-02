import { merkleLeaf, merkleRootFromProof } from "@drinks-on-chain/mocks";
import { z } from "zod";
import type { BottlePassport } from "./types";

// Comprobación de que un código de botella pertenece al expediente cerrado de su lote
// (contrato de la Ola 2 §10 y §12.2). El expediente no guarda los códigos en claro: guarda la
// raíz de un árbol Merkle de todos ellos. El pasaporte de la botella trae la "prueba" (su sal y
// los hermanos del camino hasta la raíz); aquí se recalcula la raíz con ella y se compara con la
// que figura en el expediente, cuya huella además se recalcula. Todo ocurre en el navegador.
//
// La forma del expediente canónico (`bottleCodes.merkleRoot`) y el cálculo de la hoja son, hasta
// el paso 2.8 del backend, los de `@drinks-on-chain/mocks` (CONTRATO.md §10.3): si cambian, cambia
// este archivo.

/** Lo único que se lee del expediente canónico: la raíz Merkle de los códigos. */
const canonicalDossierSchema = z.object({
  bottleCodes: z.object({ merkleRoot: z.string() }).nullable(),
});

export type BottleProofResult =
  /** La raíz recalculada coincide con la del expediente, y la huella del expediente también. */
  | { status: "verified" }
  /** `hash`: el expediente descargado no da la huella publicada. `root`: el código no está en él. */
  | { status: "mismatch"; reason: "hash" | "root" }
  /** No se pudo comprobar aquí (navegador sin SHA-256 o expediente con otra forma). */
  | { status: "unsupported" };

/** Raíz Merkle que resulta de la prueba de la botella; `null` si el pasaporte no trae prueba. */
export function proofRoot(bottle: BottlePassport["bottle"]): string | null {
  if (!bottle.merkleProof) return null;
  const leaf = merkleLeaf({ serial: bottle.serial, code: bottle.code, salt: bottle.merkleProof.salt });
  return merkleRootFromProof(leaf, bottle.merkleProof.path);
}

/** SHA-256 en hexadecimal de un texto (UTF-8); `null` si el navegador no ofrece `crypto.subtle`. */
export async function sha256Hex(text: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Comprueba la prueba de una botella contra el expediente canónico de su lote (`canonical`: el
 * texto exacto de `GET /v1/public/lots/{lotCode}/dossier`).
 */
export async function verifyBottleProof(passport: BottlePassport, canonical: string): Promise<BottleProofResult> {
  const root = proofRoot(passport.bottle);
  const expectedHash = passport.lot.dossier.hash;
  if (!root || !expectedHash) return { status: "unsupported" };

  const hash = await sha256Hex(canonical);
  if (hash === null) return { status: "unsupported" };
  if (hash !== expectedHash.toLowerCase()) return { status: "mismatch", reason: "hash" };

  let json: unknown;
  try {
    json = JSON.parse(canonical);
  } catch {
    return { status: "unsupported" };
  }
  const dossier = canonicalDossierSchema.safeParse(json);
  if (!dossier.success || !dossier.data.bottleCodes) return { status: "unsupported" };
  return dossier.data.bottleCodes.merkleRoot === root ? { status: "verified" } : { status: "mismatch", reason: "root" };
}

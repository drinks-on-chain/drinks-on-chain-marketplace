import { CanonicalDossierSchema, merkleLeaf, sha256Hex, verifyMerkleProof } from "@drinks-on-chain/mocks";
import type { BottlePassport } from "./types";

// Comprobación de que un código de botella pertenece al expediente cerrado de su lote
// (contrato de la Ola 2 §10 y §12.2; `@drinks-on-chain/mocks` CONTRATO.md §11.2, el cálculo del
// backend). El expediente no guarda los códigos en claro: guarda la raíz de un árbol Merkle de
// todos ellos. El pasaporte de la botella trae la "prueba" (su sal y los hermanos del camino
// hasta la raíz), **sin la raíz**: esa se lee de `bottleCodes.merkleRoot` en los bytes canónicos
// del expediente, cuya huella además se recalcula. Todo ocurre en el navegador.
//
// Las reglas tienen una sola fuente, los mocks: hoja = SHA-256("{serie}:{código}:{sal}"), padre =
// SHA-256 de los **bytes** de los dos hijos (`merkleLeaf`, `verifyMerkleProof`), huella =
// SHA-256 de los bytes del expediente (`sha256Hex`), forma `doc-dossier/1` (`CanonicalDossierSchema`).

export type BottleProofResult =
  /** La prueba lleva de la hoja a la raíz del expediente, y la huella del expediente coincide. */
  | { status: "verified" }
  /** `hash`: el expediente descargado no da la huella publicada. `root`: el código no está en él. */
  | { status: "mismatch"; reason: "hash" | "root" }
  /** No se pudo comprobar aquí (pasaporte sin prueba o expediente con otra forma). */
  | { status: "unsupported" };

/** Hoja Merkle de la botella; `null` si el pasaporte no trae prueba. */
export function proofLeaf(bottle: BottlePassport["bottle"]): string | null {
  if (!bottle.merkleProof) return null;
  return merkleLeaf({ serial: bottle.serial, code: bottle.code, salt: bottle.merkleProof.salt });
}

/**
 * Comprueba la prueba de una botella contra el expediente canónico de su lote (`canonical`: el
 * texto exacto de `GET /v1/public/lots/{lotCode}/dossier`).
 */
export function verifyBottleProof(passport: BottlePassport, canonical: string): BottleProofResult {
  const proof = passport.bottle.merkleProof;
  const leaf = proofLeaf(passport.bottle);
  const expectedHash = passport.lot.dossier.hash;
  if (!proof || !leaf || !expectedHash) return { status: "unsupported" };

  if (sha256Hex(canonical) !== expectedHash.toLowerCase()) return { status: "mismatch", reason: "hash" };

  let json: unknown;
  try {
    json = JSON.parse(canonical);
  } catch {
    return { status: "unsupported" };
  }
  // Solo hace falta la raíz; el resto del expediente no se interpreta aquí.
  const dossier = CanonicalDossierSchema.pick({ bottleCodes: true }).safeParse(json);
  if (!dossier.success || !dossier.data.bottleCodes) return { status: "unsupported" };
  return verifyMerkleProof(leaf, proof.path, dossier.data.bottleCodes.merkleRoot)
    ? { status: "verified" }
    : { status: "mismatch", reason: "root" };
}

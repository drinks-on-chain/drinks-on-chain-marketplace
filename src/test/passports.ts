import { publicFixtures } from "@drinks-on-chain/mocks/fixtures";
import { anchorChecks, anchorStage } from "@/lib/passport/anchor";
import type { AnchorVerificationQuery } from "@/lib/passport/hooks";
import type { BottlePassport, LotPassport } from "@/lib/passport/types";

// Pasaportes para las pruebas, a partir de los fixtures de `@drinks-on-chain/mocks` (lo que el
// visor recibe de verdad). Cada llamada devuelve una copia que la prueba puede retocar.

/** Caso del contrato §18: singani con el expediente cerrado y anclado, una corrección, un adjunto. */
export const CASE_LOT = "CVJ-2026-SINGANI-004";
/** Vino migrado, sin laboratorio y con el expediente abierto. */
export const WINE_LOT = "CVJ-2026-WINE-003";

export function lotPassport(lotCode: string = CASE_LOT, patch: Partial<LotPassport> = {}): LotPassport {
  const passport = publicFixtures.passports[lotCode];
  if (!passport) throw new Error(`Sin pasaporte de muestra para ${lotCode}`);
  return { ...structuredClone(passport), ...patch };
}

/** Pasaporte de la botella n.º 1 del caso (sin prueba Merkle salvo que se pase una). */
export function bottlePassport(
  bottle: Partial<BottlePassport["bottle"]> = {},
  lot: LotPassport = lotPassport(),
): BottlePassport {
  return {
    kind: "BOTTLE",
    bottle: {
      code: "664TWFDA",
      codeFormatted: "664T-WFDA",
      serial: 1,
      lotTotal: 2950,
      status: "ACTIVE",
      merkleProof: null,
      ...bottle,
    },
    lot,
    redemption: null,
  };
}

/** El mismo lote como lo devuelve un backend sin anclajes (Ola 2): `anchor: null`. */
export function lotWithoutAnchor(lotCode: string = CASE_LOT): LotPassport {
  const lot = lotPassport(lotCode);
  lot.stage = lot.stage === "ANCHORED" ? "CERTIFIED" : lot.stage;
  lot.dossier.anchor = null;
  return lot;
}

/** El mismo lote con la transacción de anclaje aún sin confirmar. */
export function lotWithPendingAnchor(lotCode: string = CASE_LOT): LotPassport {
  const lot = lotPassport(lotCode);
  const anchor = lot.dossier.anchor;
  if (!anchor) throw new Error(`${lotCode} no tiene anclaje en los fixtures`);
  lot.stage = "CERTIFIED";
  lot.dossier.anchor = {
    ...anchor,
    status: "PENDING",
    txHash: null,
    ledger: null,
    anchoredAt: null,
    explorerUrl: null,
  };
  return lot;
}

/** Verificación del anclaje ya resuelta, para pintar `PassportDocument` sin red. */
export function anchorQuery(lot: LotPassport, patch: Partial<AnchorVerificationQuery> = {}): AnchorVerificationQuery {
  const stage = anchorStage(lot);
  return {
    stage,
    fingerprint: stage === "anchored" ? { status: "match", computed: lot.dossier.hash ?? "" } : { status: "idle" },
    checks: anchorChecks(lot, null),
    checksSource: "viewer",
    verification: null,
    retryFingerprint: () => {},
    retryChecks: () => {},
    ...patch,
  };
}

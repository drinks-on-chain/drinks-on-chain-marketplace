import { publicFixtures } from "@drinks-on-chain/mocks/fixtures";
import type { BottlePassport, LotPassport } from "@/lib/passport/types";

// Pasaportes para las pruebas, a partir de los fixtures de `@drinks-on-chain/mocks` (lo que el
// visor recibe de verdad). Cada llamada devuelve una copia que la prueba puede retocar.

/** Caso del contrato §18: singani certificado, expediente cerrado, una corrección, un adjunto. */
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

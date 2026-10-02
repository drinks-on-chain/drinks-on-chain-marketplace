import { PublicBottlePassportSchema, PublicLotPassportSchema } from "@drinks-on-chain/mocks";
import { z } from "zod";

// Esquema con el que se valida la respuesta de `GET /v1/public/passports/{code}`: el de
// `@drinks-on-chain/mocks` (contrato de la Ola 2 §12.2) con **una** tolerancia.
//
// El backend de desarrollo (02-10-2026) devuelve `fermentation.startDate` y `endDate` como
// instantes (`2025-03-11T14:30:00.000Z`), mientras que el contrato y los mocks 0.5.0-rc.1 las
// definen como fechas de calendario (`2025-03-11`). El visor solo las pinta con `fmtDate`, que
// acepta las dos formas, así que aquí se admiten ambas para que un pasaporte real no se rechace
// entero por eso. Retirar la tolerancia cuando el backend y los mocks coincidan (rc.2).

const dateOrInstant = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);

const lotPassportSchema = PublicLotPassportSchema.extend({
  fermentation: PublicLotPassportSchema.shape.fermentation.extend({
    startDate: dateOrInstant.nullable(),
    endDate: dateOrInstant.nullable(),
  }),
});

/** Pasaporte de botella o de lote, discriminado por `kind`. */
export const passportSchema = z.discriminatedUnion("kind", [
  PublicBottlePassportSchema.extend({ lot: lotPassportSchema }),
  lotPassportSchema,
]);

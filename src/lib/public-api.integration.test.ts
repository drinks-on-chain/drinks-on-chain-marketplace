// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { luhnMod32CheckChar } from "@drinks-on-chain/mocks";
import { SINGANI_CASE, publicFixtures } from "@drinks-on-chain/mocks/fixtures";
import { PUBLIC_LOOKUP_LIMIT } from "@drinks-on-chain/mocks/handlers";
import { resetErpDb, setupMockServer } from "@drinks-on-chain/mocks/node";
import { ApiError } from "@/lib/api/errors";
import { fetchCollection, fetchCollections, isCatalogUnavailable } from "@/lib/catalog/api";
import { fetchCanonicalDossier, fetchPassport, passportErrorState } from "@/lib/passport/api";
import type { BottlePassport } from "@/lib/passport/types";
import { proofLeaf, verifyBottleProof } from "@/lib/passport/verify";
import { fetchWineries, fetchWinery } from "@/lib/wineries/api";

// La capa de datos pública contra los handlers reales de `@drinks-on-chain/mocks` (los mismos que
// corren en el navegador): esquemas, errores del contrato, límite de consultas y la comprobación
// Merkle de una botella contra el expediente canónico.

const ORIGIN = "http://localhost:3005";
const server = setupMockServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  // El cliente llama a `/api/v1/*` del propio origen; en Node hay que darle uno. Se envuelve el
  // `fetch` que MSW ya interceptó.
  const intercepted = globalThis.fetch;
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
    intercepted(typeof input === "string" && input.startsWith("/") ? `${ORIGIN}${input}` : input, init),
  );
});
afterEach(() => {
  server.resetHandlers();
  resetErpDb();
});
afterAll(() => {
  vi.unstubAllGlobals();
  server.close();
});

const CASE_LOT = "CVJ-2026-SINGANI-004";
const caseCodes = publicFixtures.bottleCodes.find((sample) => sample.lotCode === CASE_LOT)!;
const activeCode = caseCodes.codes.find((c) => c.serial === 1)!.code;
const voidedCode = caseCodes.codes.find((c) => c.status === "VOIDED")!.code;
const replacementCode = caseCodes.codes.find(
  (c) => c.serial === SINGANI_CASE.replacedSerial && c.status === "ACTIVE",
)!.code;

/** Código de botella con el control correcto que no existe en los datos. */
function missingCode(n: number): string {
  const payload = `ZZZZ${n.toString(32).toUpperCase().padStart(3, "0")}`.replace(/[ILOU]/g, "X");
  return payload + luhnMod32CheckChar(payload);
}

async function bottle(code: string): Promise<BottlePassport> {
  const passport = await fetchPassport(code);
  if (passport.kind !== "BOTTLE") throw new Error(`${code} no es una botella`);
  return passport;
}

describe("pasaporte público", () => {
  it("todos los lotes de muestra cumplen el esquema", async () => {
    for (const lotCode of Object.keys(publicFixtures.passports)) {
      const passport = await fetchPassport(lotCode);
      expect(passport.kind).toBe("LOT");
      if (passport.kind === "LOT") expect(passport.lotCode).toBe(lotCode);
    }
  });

  it("todos los códigos de botella de muestra resuelven a su lote, con su serie", async () => {
    for (const sample of publicFixtures.bottleCodes) {
      for (const ref of sample.codes) {
        const passport = await bottle(ref.code);
        expect(passport.lot.lotCode).toBe(sample.lotCode);
        expect(passport.bottle).toMatchObject({ serial: ref.serial, lotTotal: sample.total, status: ref.status });
      }
    }
  });

  it("el caso del contrato: expediente cerrado, con huella, y una corrección registrada", async () => {
    const passport = await fetchPassport(CASE_LOT);
    if (passport.kind !== "LOT") throw new Error("no es un lote");
    expect(passport.name).toBe(SINGANI_CASE.name);
    expect(passport.stage).toBe("CERTIFIED");
    expect(passport.dossier).toMatchObject({ status: "CLOSED", canonicalUrl: `/v1/public/lots/${CASE_LOT}/dossier` });
    expect(passport.dossier.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(passport.corrections.count).toBeGreaterThan(0);
    // De las personas solo sale el rol.
    for (const event of passport.timeline) expect(event).not.toHaveProperty("actor");
  });

  it("un código anulado llega como VOIDED y sin prueba; el que lo sustituye, activo", async () => {
    const voided = await bottle(voidedCode);
    expect(voided.bottle).toMatchObject({ status: "VOIDED", merkleProof: null, serial: SINGANI_CASE.replacedSerial });
    const replacement = await bottle(replacementCode);
    expect(replacement.bottle.status).toBe("ACTIVE");
    expect(replacement.bottle.merkleProof).not.toBeNull();
  });

  it("un lote con el expediente abierto no trae prueba ni expediente canónico", async () => {
    const open = publicFixtures.bottleCodes.find((sample) => sample.lotCode !== CASE_LOT)!;
    const passport = await bottle(open.codes[0]!.code);
    expect(passport.lot.dossier).toMatchObject({ status: "OPEN", hash: null, canonicalUrl: null });
    expect(passport.bottle.merkleProof).toBeNull();
    expect(proofLeaf(passport.bottle)).toBeNull();
    expect(fetchCanonicalDossier(passport.lot)).toBeNull();
  });

  it("404, 422 y el freno a la enumeración (429 con Retry-After) llegan como estados del visor", async () => {
    await expect(fetchPassport(missingCode(0)).catch(passportErrorState)).resolves.toEqual({ status: "not-found" });
    await expect(fetchPassport("CVJ-2026-SINGANI-999").catch(passportErrorState)).resolves.toEqual({
      status: "not-found",
    });
    // Control incorrecto: el servidor lo rechaza como mal formado (y no cuenta para el límite).
    await expect(fetchPassport("K7M2Q9XA").catch(passportErrorState)).resolves.toEqual({ status: "malformed" });

    for (let i = 1; i <= PUBLIC_LOOKUP_LIMIT.misses; i++) await fetchPassport(missingCode(i)).catch(() => undefined);
    const limited = await fetchPassport(activeCode).catch(passportErrorState);
    expect(limited).toMatchObject({ status: "rate-limited" });
    if ("retryAfter" in limited) {
      expect(limited.retryAfter).toBeGreaterThan(0);
      expect(limited.retryAfter).toBeLessThanOrEqual(PUBLIC_LOOKUP_LIMIT.windowMs / 1000);
    }
  });
});

describe("comprobación de la botella contra el expediente (prueba Merkle)", () => {
  it("un código activo de un expediente cerrado se verifica", async () => {
    for (const code of [activeCode, replacementCode]) {
      const passport = await bottle(code);
      const canonical = await fetchCanonicalDossier(passport.lot);
      expect(canonical).not.toBeNull();
      expect(verifyBottleProof(passport, (await canonical)!)).toEqual({ status: "verified" });
    }
  });

  it("si el expediente descargado cambia, su huella ya no coincide", async () => {
    const passport = await bottle(activeCode);
    const canonical = (await fetchCanonicalDossier(passport.lot))!;
    expect(verifyBottleProof(passport, canonical.replace("2950", "2951"))).toEqual({
      status: "mismatch",
      reason: "hash",
    });
  });

  it("un código que no está en el expediente no cuadra con la raíz", async () => {
    const passport = await bottle(activeCode);
    const canonical = (await fetchCanonicalDossier(passport.lot))!;
    const forged: BottlePassport = { ...passport, bottle: { ...passport.bottle, code: missingCode(7) } };
    expect(verifyBottleProof(forged, canonical)).toEqual({ status: "mismatch", reason: "root" });
    const otherSerial: BottlePassport = { ...passport, bottle: { ...passport.bottle, serial: 2 } };
    expect(verifyBottleProof(otherSerial, canonical)).toEqual({ status: "mismatch", reason: "root" });
  });

  it("sin prueba, o con un expediente de otra forma, no se afirma nada", async () => {
    const passport = await bottle(activeCode);
    const noProof: BottlePassport = { ...passport, bottle: { ...passport.bottle, merkleProof: null } };
    expect(verifyBottleProof(noProof, "{}")).toEqual({ status: "unsupported" });
  });
});

describe("bodegas", () => {
  it("el directorio y la ficha cumplen el esquema", async () => {
    const page = await fetchWineries();
    expect(page.items.map((w) => w.slug)).toEqual(publicFixtures.wineries.map((w) => w.slug));
    const winery = await fetchWinery(page.items[0]!.slug);
    expect(winery).toEqual(page.items[0]);
  });

  it("una bodega que no existe es un 404", async () => {
    await expect(fetchWinery("no-existe")).rejects.toMatchObject({ status: 404 });
  });
});

describe("catálogo (BORRADOR §17.1)", () => {
  it("la lista cumple el esquema del borrador y pagina", async () => {
    const all = await fetchCollections();
    expect(all.total).toBe(publicFixtures.collections.length);
    const page = await fetchCollections({}, { limit: 2, offset: 2 });
    expect(page.items.map((c) => c.slug)).toEqual(all.items.slice(2, 4).map((c) => c.slug));
  });

  it("filtra por tipo, estado, bodega y texto", async () => {
    const wines = await fetchCollections({ productType: "WINE" });
    expect(wines.items.length).toBeGreaterThan(0);
    expect(wines.items.every((c) => c.productType === "WINE")).toBe(true);

    const presale = await fetchCollections({ status: "PRESALE" });
    expect(presale.items.every((c) => c.status === "PRESALE")).toBe(true);

    const slug = winerySlugs()[0]!;
    const ofWinery = await fetchCollections({ winery: slug });
    expect(ofWinery.items.every((c) => c.winery.slug === slug)).toBe(true);

    const search = await fetchCollections({ q: "gran reserva" });
    expect(search.items.map((c) => c.name)).toEqual([SINGANI_CASE.name]);
  });

  it("la ficha trae la línea de tiempo del lote; el precio puede faltar", async () => {
    const collection = await fetchCollection("singani-gran-reserva-2026");
    expect(collection.lot.lotCode).toBe(CASE_LOT);
    expect(collection.lot.timeline.length).toBeGreaterThan(0);

    const withoutPrice = publicFixtures.collections.find((c) => c.price === null)!;
    await expect(fetchCollection(withoutPrice.slug)).resolves.toMatchObject({ price: null, status: "PRESALE" });
  });

  it("un catálogo que el backend aún no publica (404 o 501) no es un error de la pantalla", async () => {
    expect(isCatalogUnavailable(new ApiError({ status: 404, code: "NOT_FOUND", message: "" }))).toBe(true);
    expect(isCatalogUnavailable(new ApiError({ status: 501, code: "NOT_IMPLEMENTED", message: "" }))).toBe(true);
    expect(isCatalogUnavailable(new ApiError({ status: 500, code: "INTERNAL_ERROR", message: "" }))).toBe(false);
    await expect(fetchCollection("no-existe")).rejects.toMatchObject({ status: 404 });
  });
});

function winerySlugs(): string[] {
  return publicFixtures.wineries.map((w) => w.slug);
}

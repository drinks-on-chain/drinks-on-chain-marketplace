// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PASSPORT_CASES, publicFixtures } from "@drinks-on-chain/mocks/fixtures";
import { resetErpDb, resetScenario, setScenario, setupMockServer } from "@drinks-on-chain/mocks/node";
import { apiHref, apiPathFrom } from "@/lib/api/paths";
import { fetchCollections } from "@/lib/catalog/api";
import { dossierPath, fetchCanonicalDossier, fetchPassport, passportErrorState } from "./api";
import { lotOf, type BottlePassport } from "./types";
import { verifyBottleProof } from "./verify";

// Casos del pasaporte de `@drinks-on-chain/mocks` 0.5.0-rc.2 (`PASSPORT_CASES`), el límite de
// consultas por minuto, las URL absolutas del expediente y el catálogo con `featured` y `sort`,
// contra los handlers reales de los mocks.

const ORIGIN = "http://localhost:3005";
const server = setupMockServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  const intercepted = globalThis.fetch;
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
    intercepted(typeof input === "string" && input.startsWith("/") ? `${ORIGIN}${input}` : input, init),
  );
});
afterEach(() => {
  server.resetHandlers();
  resetScenario();
  resetErpDb();
});
afterAll(() => {
  vi.unstubAllGlobals();
  server.close();
});

const firstCode = (lotCode: string) => publicFixtures.bottleCodes.find((s) => s.lotCode === lotCode)!.codes[0]!.code;

async function bottle(code: string): Promise<BottlePassport> {
  const passport = await fetchPassport(code);
  if (passport.kind !== "BOTTLE") throw new Error(`${code} no es una botella`);
  return passport;
}

describe("casos del pasaporte (PASSPORT_CASES)", () => {
  it("todos cumplen el esquema, como lote y como botella", async () => {
    for (const lotCode of new Set(Object.values(PASSPORT_CASES))) {
      const lot = await fetchPassport(lotCode);
      expect(lot.kind, lotCode).toBe("LOT");
      expect(lotOf(await fetchPassport(firstCode(lotCode))).lotCode).toBe(lotCode);
    }
  });

  it("cada caso trae lo que su aviso necesita", async () => {
    const lot = async (code: string) => lotOf(await fetchPassport(code));
    expect((await lot(PASSPORT_CASES.wineryInactive)).winery.active).toBe(false);
    expect((await lot(PASSPORT_CASES.discarded)).stage).toBe("DISCARDED");
    expect((await lot(PASSPORT_CASES.doByException)).denomination).toMatchObject({
      status: "ELIGIBLE_BY_EXCEPTION",
      legalException: true,
    });
    expect((await lot(PASSPORT_CASES.lateEntry)).timeline.some((event) => event.lateEntry)).toBe(true);
    const nonConforming = await lot(PASSPORT_CASES.labNonConforming);
    expect(nonConforming.lab.status).toBe("NON_CONFORMING");
    expect(nonConforming.lab.checks.some((check) => check.result === "FAIL")).toBe(true);
    expect((await lot(PASSPORT_CASES.labNotRecorded)).lab).toMatchObject({ status: "NOT_RECORDED", checks: [] });
  });

  it("las fechas de la fermentación son instantes y el esquema de los mocks las acepta sin tolerancias", async () => {
    const lot = lotOf(await fetchPassport(PASSPORT_CASES.bottled));
    expect(lot.fermentation.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("las botellas de un lote retirado llegan anuladas y no se dan por verificadas", async () => {
    const passport = await bottle(firstCode(PASSPORT_CASES.discarded));
    expect(passport.bottle.status).toBe("VOIDED");
    expect(passport.lot.stage).toBe("DISCARDED");
    expect(verifyBottleProof(passport, "{}")).toEqual({ status: "unsupported" });
  });
});

describe("límite de consultas por minuto (escenario pasaporte-saturado)", () => {
  it("429 TOO_MANY_REQUESTS con Retry-After llega como «demasiados intentos»", async () => {
    setScenario("pasaporte-saturado");
    await expect(fetchPassport(PASSPORT_CASES.certified).catch(passportErrorState)).resolves.toEqual({
      status: "rate-limited",
      retryAfter: 60,
    });
    resetScenario();
    await expect(fetchPassport(PASSPORT_CASES.certified)).resolves.toMatchObject({ kind: "LOT" });
  });
});

describe("rutas de la API que llegan en los datos", () => {
  it("acepta la ruta relativa, la URL absoluta y el prefijo del proxy", () => {
    const path = "/v1/public/lots/CVJ-2026-SINGANI-004/dossier";
    expect(apiPathFrom(path)).toBe(path);
    expect(apiPathFrom(`https://api.ejemplo.bo${path}`)).toBe(path);
    expect(apiPathFrom(`https://api.ejemplo.bo/api${path}?v=1`)).toBe(`${path}?v=1`);
    expect(apiPathFrom(`/api${path}`)).toBe(path);
    expect(dossierPath("CVJ-2026-SINGANI-004")).toBe(path);
  });

  it("lo que no apunta a la API no se pide por el proxy", () => {
    expect(apiPathFrom(null)).toBeNull();
    expect(apiPathFrom("")).toBeNull();
    expect(apiPathFrom("/otra/ruta")).toBeNull();
    expect(apiPathFrom("//otro.ejemplo/v1/x")).toBeNull();
    expect(apiPathFrom("javascript:alert(1)")).toBeNull();
    expect(apiPathFrom("https://cdn.ejemplo.bo/archivo.pdf")).toBeNull();
  });

  it("apiHref: por el proxy si es de la API; tal cual si es otra URL http(s); nada si no", () => {
    expect(apiHref("/v1/public/lots/X/attachments/1")).toBe("/api/v1/public/lots/X/attachments/1");
    expect(apiHref("https://api.ejemplo.bo/v1/public/lots/X/attachments/1")).toBe(
      "/api/v1/public/lots/X/attachments/1",
    );
    expect(apiHref("https://cdn.ejemplo.bo/archivo.pdf")).toBe("https://cdn.ejemplo.bo/archivo.pdf");
    expect(apiHref("javascript:alert(1)")).toBeNull();
    expect(apiHref("/otra/ruta")).toBeNull();
  });

  it("el expediente se descarga igual si canonicalUrl llega absoluta (o con otra forma)", async () => {
    const passport = await bottle(firstCode(PASSPORT_CASES.certified));
    const relative = (await fetchCanonicalDossier(passport.lot))!;
    for (const canonicalUrl of [
      `https://api.ejemplo.bo${passport.lot.dossier.canonicalUrl}`,
      "https://api.ejemplo.bo/descargas/expediente",
    ]) {
      const lot = { ...passport.lot, dossier: { ...passport.lot.dossier, canonicalUrl } };
      await expect(fetchCanonicalDossier(lot)).resolves.toBe(relative);
      expect(verifyBottleProof({ ...passport, lot }, relative)).toEqual({ status: "verified" });
    }
  });
});

describe("catálogo (BORRADOR §17.1) en rc.2: destacadas y orden", () => {
  it("`featured` filtra las destacadas, que además van primero por defecto", async () => {
    const featured = await fetchCollections({ featured: true });
    expect(featured.items.length).toBeGreaterThan(0);
    expect(featured.items.every((c) => c.featured)).toBe(true);

    const all = await fetchCollections();
    expect(all.items.slice(0, featured.items.length).map((c) => c.slug)).toEqual(featured.items.map((c) => c.slug));
  });

  it("`sort` ordena en el servidor; las que no tienen precio, al final", async () => {
    const byPrice = await fetchCollections({ sort: "price-asc" });
    const prices = byPrice.items.map((c) => c.price?.amountMinor ?? Infinity);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(byPrice.items.at(-1)!.price).toBeNull();

    const byName = await fetchCollections({ sort: "name" });
    const names = byName.items.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "es")));
  });
});

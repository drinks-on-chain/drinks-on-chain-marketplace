// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIENT_IP_HEADER, SIGNATURE_HEADER, TIMESTAMP_HEADER, signProxyRequest } from "@/lib/api-proxy";
import { CASE_LOT, WINE_LOT, lotPassport } from "@/test/passports";
import { lotDescription, lotMetadata, lotTitle } from "./metadata";

// `unstable_cache` de Next, reducido a lo que importa aquí: la clave son las partes y los
// argumentos (nunca quién visita), y solo se guarda lo que la función devuelve sin lanzar.
const cacheStore = new Map<string, unknown>();
const cacheOptions: { keyParts: string[]; revalidate: number | false | undefined }[] = [];
vi.mock("next/cache", () => ({
  unstable_cache: (
    fn: (...args: unknown[]) => Promise<unknown>,
    keyParts: string[],
    options?: { revalidate?: number | false },
  ) => {
    cacheOptions.push({ keyParts, revalidate: options?.revalidate });
    return async (...args: unknown[]) => {
      const key = JSON.stringify([keyParts, args]);
      if (cacheStore.has(key)) return cacheStore.get(key);
      const value = await fn(...args);
      cacheStore.set(key, value);
      return value;
    };
  },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-real-ip": "203.0.113.7" }) }));

const { CERTIFIED_LOT_REVALIDATE_SECONDS, LOT_REVALIDATE_SECONDS, getLotPassport, isCertified, loadLotPassport } =
  await import("./server");

const ORIGIN = "https://api.ejemplo.bo";
const SECRET = "secreto-de-prueba";
const visitor = (ip: string) => new Headers({ "x-real-ip": ip, "user-agent": "prueba" });

const ok = (data: unknown) => new Response(JSON.stringify({ success: true, statusCode: 200, data }), { status: 200 });
const fail = (status: number, code: string, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ success: false, statusCode: status, error: { code, message: code } }), {
    status,
    headers,
  });

describe("pasaporte del lote en el servidor", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const calls = () =>
    fetchMock.mock.calls.map(([url, init]) => ({ url: String(url), headers: new Headers(init?.headers), init: init! }));

  beforeEach(() => {
    cacheStore.clear();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("API_ORIGIN", ORIGIN);
    vi.stubEnv("PROXY_SHARED_SECRET", SECRET);
    vi.stubEnv("NEXT_PUBLIC_MOCKS", "0");
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("pide el lote al backend con la IP de quien visita firmada, como el proxy", async () => {
    fetchMock.mockResolvedValueOnce(ok(lotPassport(WINE_LOT)));
    const result = await loadLotPassport(WINE_LOT, visitor("198.51.100.23"));
    expect(result).toMatchObject({ status: "found", passport: { lotCode: WINE_LOT } });

    expect(calls()).toHaveLength(1);
    const [call] = calls();
    expect(call!.url).toBe(`${ORIGIN}/v1/public/lots/${WINE_LOT}`);
    expect(call!.init.cache).toBe("no-store");
    expect(call!.headers.get("X-Client-App")).toBe("MARKETPLACE");
    // La IP es la del visitante, no la del servidor, y la firma es la que valida el backend.
    expect(call!.headers.get(CLIENT_IP_HEADER)).toBe("198.51.100.23");
    const timestamp = call!.headers.get(TIMESTAMP_HEADER)!;
    expect(call!.headers.get(SIGNATURE_HEADER)).toBe(
      signProxyRequest(SECRET, "GET", `/v1/public/lots/${WINE_LOT}`, "198.51.100.23", timestamp),
    );
    // No se reenvía nada más de la petición del visitante.
    expect(call!.headers.get("user-agent")).toBeNull();
  });

  it("sin secreto no firma (el backend usa la IP de la conexión), pero responde", async () => {
    vi.stubEnv("PROXY_SHARED_SECRET", "");
    fetchMock.mockResolvedValueOnce(ok(lotPassport(WINE_LOT)));
    await expect(loadLotPassport(WINE_LOT, visitor("198.51.100.23"))).resolves.toMatchObject({ status: "found" });
    expect(calls()[0]!.headers.get(CLIENT_IP_HEADER)).toBeNull();
    expect(calls()[0]!.headers.get(SIGNATURE_HEADER)).toBeNull();
  });

  it("la caché es por código de lote: otra visita no vuelve a consultar al backend", async () => {
    fetchMock.mockResolvedValueOnce(ok(lotPassport(WINE_LOT)));
    await loadLotPassport(WINE_LOT, visitor("198.51.100.23"));
    const second = await loadLotPassport(WINE_LOT, visitor("203.0.113.99"));
    expect(second).toMatchObject({ status: "found", passport: { lotCode: WINE_LOT } });
    // Una sola petición: ni una por caché (la corta y la larga) ni una por visitante.
    expect(calls()).toHaveLength(1);
  });

  it("guarda 60 s lo abierto y 3600 s lo certificado, como el Cache-Control del backend", async () => {
    expect(LOT_REVALIDATE_SECONDS).toBe(60);
    expect(CERTIFIED_LOT_REVALIDATE_SECONDS).toBe(3600);
    expect(cacheOptions.map((o) => o.revalidate).sort()).toEqual([3600, 60]);
    expect(isCertified(lotPassport(CASE_LOT))).toBe(true);
    expect(isCertified(lotPassport(WINE_LOT))).toBe(false);

    fetchMock.mockResolvedValueOnce(ok(lotPassport(CASE_LOT))).mockResolvedValueOnce(ok(lotPassport(WINE_LOT)));
    await loadLotPassport(CASE_LOT, visitor("198.51.100.23"));
    await loadLotPassport(WINE_LOT, visitor("198.51.100.23"));
    const stored = (kind: string, lotCode: string) =>
      cacheStore.get(JSON.stringify([["public-lot-passport", kind], [lotCode]]));
    // El certificado queda en la caché larga; el abierto, solo en la corta.
    expect(stored("certified", CASE_LOT)).toMatchObject({ lotCode: CASE_LOT });
    expect(stored("open", CASE_LOT)).toBeUndefined();
    expect(stored("certified", WINE_LOT)).toBeNull();
    expect(stored("open", WINE_LOT)).toMatchObject({ lotCode: WINE_LOT });
  });

  it("un lote inexistente no se guarda: cada intento llega al backend con la IP de quien lo hace", async () => {
    fetchMock.mockImplementation(async () => fail(404, "PUB_CODE_NOT_FOUND"));
    await expect(loadLotPassport("CVJ-2026-SINGANI-999", visitor("198.51.100.23"))).resolves.toEqual({
      status: "not-found",
    });
    await expect(loadLotPassport("CVJ-2026-SINGANI-999", visitor("203.0.113.99"))).resolves.toEqual({
      status: "not-found",
    });
    expect(calls().map((c) => c.headers.get(CLIENT_IP_HEADER))).toEqual(["198.51.100.23", "203.0.113.99"]);
    expect(cacheStore.size).toBe(0);
  });

  it("el freno de una persona (429) no se guarda ni afecta a la siguiente", async () => {
    fetchMock
      .mockResolvedValueOnce(fail(429, "PUB_TOO_MANY_LOOKUPS", { "Retry-After": "540" }))
      .mockResolvedValueOnce(ok(lotPassport(WINE_LOT)));
    await expect(loadLotPassport(WINE_LOT, visitor("198.51.100.23"))).resolves.toEqual({
      status: "rate-limited",
      retryAfter: 540,
    });
    await expect(loadLotPassport(WINE_LOT, visitor("203.0.113.99"))).resolves.toMatchObject({ status: "found" });
    expect(calls()).toHaveLength(2);
  });

  it("traduce el resto de fallos sin lanzar", async () => {
    fetchMock.mockResolvedValueOnce(fail(422, "PUB_CODE_MALFORMED"));
    await expect(loadLotPassport("AB-2026-WINE-001", visitor("198.51.100.23"))).resolves.toEqual({
      status: "malformed",
    });

    fetchMock.mockResolvedValueOnce(fail(429, "TOO_MANY_REQUESTS"));
    await expect(loadLotPassport(WINE_LOT, visitor("198.51.100.23"))).resolves.toEqual({
      status: "rate-limited",
      retryAfter: null,
    });

    fetchMock.mockResolvedValueOnce(fail(500, "INTERNAL_ERROR"));
    await expect(loadLotPassport(WINE_LOT, visitor("198.51.100.23"))).resolves.toEqual({ status: "error" });

    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(loadLotPassport(WINE_LOT, visitor("198.51.100.23"))).resolves.toEqual({ status: "error" });

    // Una respuesta que no cumple el contrato no es un pasaporte a medias, y tampoco se guarda.
    fetchMock.mockResolvedValueOnce(ok({ kind: "LOT", lotCode: WINE_LOT }));
    await expect(loadLotPassport(WINE_LOT, visitor("198.51.100.23"))).resolves.toEqual({ status: "error" });
    expect(cacheStore.size).toBe(0);
  });

  it("sin API_ORIGIN no hay a quién preguntar: error, sin petición", async () => {
    vi.stubEnv("API_ORIGIN", "");
    await expect(loadLotPassport(WINE_LOT, visitor("198.51.100.23"))).resolves.toEqual({ status: "error" });
    expect(calls()).toHaveLength(0);
  });

  it("getLotPassport toma la IP de las cabeceras de la petición en curso", async () => {
    fetchMock.mockResolvedValueOnce(ok(lotPassport(WINE_LOT)));
    await expect(getLotPassport(WINE_LOT)).resolves.toMatchObject({ status: "found" });
    expect(calls()[0]!.headers.get(CLIENT_IP_HEADER)).toBe("203.0.113.7");
  });
});

describe("metadatos del lote", () => {
  it("título, descripción y Open Graph salen del pasaporte; la página se puede indexar", () => {
    const lot = lotPassport(CASE_LOT);
    expect(lotTitle(lot)).toBe("Singani Gran Reserva 2026 · Destilería Cinti Viejo");
    const description = lotDescription(lot);
    expect(description).toContain("Singani de la añada 2026 de Destilería Cinti Viejo");
    expect(description).toContain("2.950 botellas.");
    expect(description).toContain("Expediente cerrado, con su huella anclada en la red.");
    expect(description).toContain(CASE_LOT);

    const metadata = lotMetadata(lot);
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates).toEqual({ canonical: `/b/${CASE_LOT}` });
    expect(metadata.openGraph).toMatchObject({ title: lotTitle(lot), description, url: `/b/${CASE_LOT}` });
  });

  it("lo que el pasaporte no trae no se menciona", () => {
    const lot = lotPassport(WINE_LOT);
    lot.origin.terroirs = [];
    lot.bottling.bottles = null;
    const description = lotDescription(lot);
    expect(description).not.toContain("Origen:");
    expect(description).not.toContain("botellas");
    expect(description).not.toContain("Expediente cerrado");
  });
});

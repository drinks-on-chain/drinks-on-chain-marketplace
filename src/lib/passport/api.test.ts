import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, ContractError, NetworkError } from "@/lib/api/errors";
import { resetSessionForTests } from "@/lib/api/session";
import { fetchPassport, passportErrorState } from "./api";
import { toPassportState } from "./hooks";

const ok = (data: unknown) => new Response(JSON.stringify({ success: true, statusCode: 200, data }), { status: 200 });
const fail = (status: number, code: string, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ success: false, statusCode: status, error: { code, message: code } }), {
    status,
    headers,
  });

describe("fetchPassport", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const calls = () => fetchMock.mock.calls.map(([url, init]) => ({ url: String(url), init: init! }));

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    resetSessionForTests();
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("pide el pasaporte al propio origen, sin sesión y como Marketplace", async () => {
    fetchMock.mockResolvedValueOnce(ok({ kind: "BOTTLE" }));
    await expect(fetchPassport("K7M2Q9XM")).resolves.toEqual({ kind: "BOTTLE" });

    // Una sola petición: sin sesión no se intenta renovar nada antes.
    expect(calls()).toHaveLength(1);
    const [call] = calls();
    expect(call!.url).toBe("/api/v1/public/passports/K7M2Q9XM");
    const headers = call!.init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers["X-Client-App"]).toBe("MARKETPLACE");
  });

  it("el código de lote viaja tal cual en la ruta", async () => {
    fetchMock.mockResolvedValueOnce(ok({ kind: "LOT" }));
    await fetchPassport("CVJ-2026-SINGANI-004");
    expect(calls()[0]!.url).toBe("/api/v1/public/passports/CVJ-2026-SINGANI-004");
  });

  it("los errores del contrato llegan como estados del visor", async () => {
    fetchMock.mockResolvedValueOnce(fail(404, "PUB_CODE_NOT_FOUND"));
    await expect(fetchPassport("K7M2Q9XM").catch(passportErrorState)).resolves.toEqual({ status: "not-found" });

    fetchMock.mockResolvedValueOnce(fail(422, "PUB_CODE_MALFORMED"));
    await expect(fetchPassport("AB-2026-CD-1").catch(passportErrorState)).resolves.toEqual({ status: "malformed" });

    fetchMock.mockResolvedValueOnce(fail(429, "PUB_TOO_MANY_LOOKUPS", { "Retry-After": "120" }));
    await expect(fetchPassport("K7M2Q9XM").catch(passportErrorState)).resolves.toEqual({
      status: "rate-limited",
      retryAfter: 120,
    });

    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(fetchPassport("K7M2Q9XM").catch(passportErrorState)).resolves.toEqual({ status: "offline" });
  });
});

describe("passportErrorState", () => {
  const apiError = (status: number, code: string, retryAfter?: number) =>
    new ApiError({ status, code, message: code, retryAfter });

  it("404: no encontrado (también el 404 sin envoltorio de un despliegue sin el dominio público)", () => {
    expect(passportErrorState(apiError(404, "PUB_CODE_NOT_FOUND"))).toEqual({ status: "not-found" });
    expect(passportErrorState(apiError(404, "HTTP_404"))).toEqual({ status: "not-found" });
  });

  it("422 PUB_CODE_MALFORMED: mal escrito", () => {
    expect(passportErrorState(apiError(422, "PUB_CODE_MALFORMED"))).toEqual({ status: "malformed" });
  });

  it("429: demasiados intentos, con la espera de Retry-After si llega", () => {
    expect(passportErrorState(apiError(429, "PUB_TOO_MANY_LOOKUPS", 600))).toEqual({
      status: "rate-limited",
      retryAfter: 600,
    });
    expect(passportErrorState(apiError(429, "RATE_LIMITED"))).toEqual({ status: "rate-limited", retryAfter: null });
  });

  it("sin red: sin conexión", () => {
    expect(passportErrorState(new NetworkError(new TypeError("Failed to fetch")))).toEqual({ status: "offline" });
  });

  it("lo demás: error genérico con reintento", () => {
    expect(passportErrorState(apiError(500, "INTERNAL_ERROR"))).toEqual({ status: "error" });
    expect(passportErrorState(apiError(501, "NOT_IMPLEMENTED"))).toEqual({ status: "error" });
    expect(passportErrorState(apiError(422, "VALIDATION_ERROR"))).toEqual({ status: "error" });
    expect(passportErrorState(new ContractError("/v1/public/passports/X", []))).toEqual({ status: "error" });
    expect(passportErrorState(new Error("otro"))).toEqual({ status: "error" });
  });
});

describe("toPassportState", () => {
  it("pendiente: cargando; con datos: encontrado; con error: su estado", () => {
    expect(toPassportState({ isPending: true, error: null, data: undefined })).toEqual({ status: "loading" });
    expect(toPassportState({ isPending: false, error: null, data: { kind: "LOT" } })).toEqual({
      status: "found",
      passport: { kind: "LOT" },
    });
    expect(
      toPassportState({
        isPending: false,
        error: new ApiError({ status: 404, code: "PUB_CODE_NOT_FOUND", message: "" }),
        data: undefined,
      }),
    ).toEqual({ status: "not-found" });
  });
});

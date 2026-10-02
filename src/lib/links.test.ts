import { describe, expect, it } from "vitest";
import { buildLinks, join, routes } from "./links";

describe("routes", () => {
  it("el visor vive en /b/{código}", () => {
    expect(routes.verify).toBe("/b");
    expect(routes.passport("K7M2Q9XM")).toBe("/b/K7M2Q9XM");
    expect(routes.passport("CVJ-2026-SINGANI-004")).toBe("/b/CVJ-2026-SINGANI-004");
  });

  it("codifica lo que no puede ir tal cual en la ruta", () => {
    expect(routes.passport("a/b c?")).toBe("/b/a%2Fb%20c%3F");
  });
});

describe("join", () => {
  it("une sin duplicar barras", () => {
    expect(join("https://sitio.ejemplo.bo/")).toBe("https://sitio.ejemplo.bo/");
    expect(join("https://sitio.ejemplo.bo///", "/unirse")).toBe("https://sitio.ejemplo.bo/unirse");
    expect(join("https://sitio.ejemplo.bo", "")).toBe("https://sitio.ejemplo.bo");
  });

  it("sin host configurado no hay enlace", () => {
    expect(join("")).toBeNull();
    expect(join("", "/b/K7M2Q9XM")).toBeNull();
  });
});

describe("buildLinks", () => {
  const configured = buildLinks({
    landing: "https://landing.ejemplo.bo",
    bodegas: "https://bodegas.ejemplo.bo/",
    app: "https://app.ejemplo.bo/",
  });

  it("los hosts salen solo de la configuración", () => {
    expect(configured.landing).toBe("https://landing.ejemplo.bo/");
    expect(configured.bodegas).toBe("https://bodegas.ejemplo.bo/");
    expect(configured.app).toBe("https://app.ejemplo.bo");
  });

  it("la URL del QR apunta al visor del propio Marketplace", () => {
    expect(configured.passportUrl("K7M2Q9XM")).toBe("https://app.ejemplo.bo/b/K7M2Q9XM");
    expect(configured.passportUrl("CVJ-2026-SINGANI-004")).toBe("https://app.ejemplo.bo/b/CVJ-2026-SINGANI-004");
  });

  it("sin variables, los enlaces externos no existen", () => {
    const empty = buildLinks({ landing: "", bodegas: "", app: "" });
    expect(empty.landing).toBeNull();
    expect(empty.bodegas).toBeNull();
    expect(empty.app).toBeNull();
    expect(empty.passportUrl("K7M2Q9XM")).toBeNull();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fmtDate } from "@/lib/format";
import type { BottleProofQuery, BottleProofState } from "@/lib/passport/hooks";
import type { Passport } from "@/lib/passport/types";
import { CASE_LOT, WINE_LOT, bottlePassport, lotPassport } from "@/test/passports";
import { PassportDocument, type DossierDownload } from "./passport-document";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const idleDownload: DossierDownload = { onDownload: vi.fn(), pending: false, failed: false };
const proofOf = (state: BottleProofState, retry = vi.fn()): BottleProofQuery => ({ state, retry });

function renderDocument(
  passport: Passport,
  options: { proof?: BottleProofQuery; download?: DossierDownload; fromBottle?: string | null } = {},
) {
  return render(
    <PassportDocument
      passport={passport}
      proof={options.proof ?? proofOf({ status: "none" })}
      download={options.download ?? idleDownload}
      fromBottle={options.fromBottle ?? null}
    />,
  );
}

const section = (name: string) => screen.getByRole("region", { name });

describe("PassportDocument · qué identifica el código", () => {
  afterEach(cleanup);

  it("cabecera: nombre, tipo, añada y bodega con enlace a su página", () => {
    renderDocument(lotPassport());
    expect(screen.getByRole("heading", { level: 1, name: "Singani Gran Reserva 2026" })).toBeInTheDocument();
    expect(screen.getByText("Singani · Añada 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver la página de Destilería Cinti Viejo" })).toHaveAttribute(
      "href",
      "/bodegas/destileria-cinti-viejo",
    );
  });

  it("botella: serie N de M, su código y enlace al lote (con la vuelta a la botella)", () => {
    renderDocument(bottlePassport({ serial: 1234 }));
    expect(screen.getByText("Botella n.º 1.234 de 2.950")).toBeInTheDocument();
    expect(screen.getByText("664T-WFDA")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver el lote completo" })).toHaveAttribute(
      "href",
      `/b/${CASE_LOT}?desde=664TWFDA`,
    );
  });

  it("lote: la etiqueta identifica el lote, sin número de botella", () => {
    renderDocument(lotPassport());
    expect(screen.getByText("Esta etiqueta identifica el lote")).toBeInTheDocument();
    expect(screen.queryByText(/Botella n\.º/)).toBeNull();
    // Sin botella de partida, se invita a escribir su código.
    expect(screen.getByRole("heading", { name: "¿Tienes una botella de este lote?" })).toBeInTheDocument();
  });

  it("lote abierto desde una botella: ofrece volver a ella", () => {
    renderDocument(lotPassport(), { fromBottle: "664TWFDA" });
    expect(screen.getByRole("link", { name: "Volver a tu botella 664TWFDA" })).toHaveAttribute("href", "/b/664TWFDA");
  });
});

describe("PassportDocument · avisos", () => {
  afterEach(cleanup);

  it("código anulado: aviso destacado y sin comprobación", () => {
    renderDocument(bottlePassport({ status: "VOIDED", serial: 17 }), { proof: proofOf({ status: "none" }) });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Este código fue anulado por la bodega");
    expect(alert).toHaveTextContent("avisa a la bodega");
    expect(screen.queryByText(/pertenece al expediente cerrado/)).toBeNull();
  });

  it("lote retirado y bodega no activa: se avisa y la bodega no se enlaza", () => {
    const lot = lotPassport(CASE_LOT, { stage: "DISCARDED" });
    lot.winery.active = false;
    renderDocument(lot);
    const alerts = screen.getAllByRole("alert").map((a) => a.textContent);
    expect(alerts.some((text) => text?.includes("La bodega retiró este lote"))).toBe(true);
    expect(alerts.some((text) => text?.includes("Esta bodega no está activa en la red"))).toBe(true);
    expect(screen.queryByRole("link", { name: /Ver la página de/ })).toBeNull();
    expect(screen.getByText("Destilería Cinti Viejo")).toBeInTheDocument();
  });

  it("sin nada que avisar no hay alertas", () => {
    renderDocument(lotPassport());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("PassportDocument · solo datos registrados", () => {
  afterEach(cleanup);

  it("lo que el pasaporte trae como null se escribe «No registrado», no un valor", () => {
    const lot = lotPassport(WINE_LOT);
    lot.harvest.maturity = null;
    lot.harvest.phytosanitary = "NOT_RECORDED";
    lot.bottling.finalAbv = null;
    lot.aging.containerMaterial = null;
    lot.aging.containerType = null;
    renderDocument(lot);

    const process = section("Elaboración");
    const valueOf = (term: string) =>
      within(process)
        .getAllByText(term)
        .map((dt) => dt.nextElementSibling?.textContent);
    expect(valueOf("Madurez de la uva")).toEqual(["No registrado"]);
    expect(valueOf("Dictamen fitosanitario")).toEqual(["No registrado"]);
    expect(valueOf("Grado alcohólico")).toEqual(["No registrado"]);
    expect(valueOf("Recipiente")).toEqual(["No registrado"]);
  });

  it("una etapa aplicable sin datos se marca «No registrado»; la que no aplica no aparece", () => {
    const lot = lotPassport(WINE_LOT);
    lot.aging = { ...lot.aging, status: "NOT_RECORDED" };
    renderDocument(lot);
    const process = section("Elaboración");
    const aging = within(process).getByRole("heading", { name: "Crianza" }).closest("li")!;
    expect(aging).toHaveTextContent("No registrado");
    // Un vino no se destila: la etapa no aplica y no se pinta.
    expect(within(process).queryByRole("heading", { name: "Destilación y reposo" })).toBeNull();
  });

  it("laboratorio sin registrar: lo dice, sin tabla de parámetros", () => {
    renderDocument(lotPassport(WINE_LOT));
    const lab = section("Laboratorio");
    expect(lab).toHaveTextContent("No registrado");
    expect(lab).toHaveTextContent("La bodega no registró un análisis de laboratorio de este lote.");
    expect(within(lab).queryByText("Metanol")).toBeNull();
  });

  it("origen sin parcelas registradas", () => {
    const lot = lotPassport();
    lot.origin = { status: "NOT_RECORDED", terroirs: [] };
    renderDocument(lot);
    expect(section("Origen")).toHaveTextContent("No registrado");
  });

  it("no muestra precio, reseñas ni nombres de personas", () => {
    const { container } = renderDocument(bottlePassport());
    expect(container).not.toHaveTextContent(/Bs\s?\d/);
    expect(container).not.toHaveTextContent(/reseña/i);
    expect(container).not.toHaveTextContent(/Lic\.|Ing\.|@/);
  });
});

describe("PassportDocument · secciones del lote", () => {
  afterEach(cleanup);

  it("origen y D.O.: parcela, altitud, variedad y las reglas usadas", () => {
    renderDocument(lotPassport());
    const origin = section("Origen");
    expect(origin).toHaveTextContent("Parcela 2 · Cañón Viejo");
    expect(origin).toHaveTextContent("2.410 m s. n. m.");
    expect(origin).toHaveTextContent("Moscatel de Alejandría");
    expect(origin).toHaveTextContent("Cumple la Denominación de Origen");
    expect(origin).toHaveTextContent("parcelas a 1.600 m s. n. m. o más");
  });

  it("D.O. por excepción legal: lo explica; en un vino, no aplica", () => {
    const lot = lotPassport();
    lot.denomination = { ...lot.denomination, status: "ELIGIBLE_BY_EXCEPTION", legalException: true };
    renderDocument(lot);
    expect(section("Origen")).toHaveTextContent("Cumple por excepción legal");
    expect(section("Origen")).toHaveTextContent("por una excepción legal autorizada");
    cleanup();
    renderDocument(lotPassport(WINE_LOT));
    expect(section("Origen")).toHaveTextContent("Este producto no lleva Denominación de Origen.");
  });

  it("elaboración: destilación y reposo del singani, embotellado y tratamientos sin dosis", () => {
    renderDocument(lotPassport());
    const process = section("Elaboración");
    expect(process).toHaveTextContent("60 % vol");
    expect(process).toHaveTextContent("180 días");
    expect(process).toHaveTextContent("2.950");
    expect(process).toHaveTextContent("75 cL");
    expect(process).toHaveTextContent("Adición de sulfuroso");
    expect(process).toHaveTextContent("SENASAG-REG-ADD-2024-88");
    // Un singani no tiene crianza.
    expect(within(process).queryByRole("heading", { name: "Crianza" })).toBeNull();
  });

  it("registro del lote: rol de quien registró (nunca el nombre), correcciones y registros tardíos", () => {
    const lot = lotPassport();
    lot.timeline[1] = { ...lot.timeline[1]!, lateEntry: true, recordedAt: "2026-03-12T10:00:00Z" };
    renderDocument(lot);
    const log = section("Registro del lote");
    const items = within(log).getAllByRole("listitem");
    expect(items).toHaveLength(lot.timeline.length);
    expect(items[0]).toHaveTextContent("Uva recibida y pesada en la bodega");
    expect(items[0]).toHaveTextContent("Operación de bodega");
    expect(items[0]).toHaveTextContent("Corregido");
    expect(items[1]).toHaveTextContent("Agronomía");
    expect(items[1]).toHaveTextContent(`Anotado después, el ${fmtDate("2026-03-12T10:00:00Z")}`);
    expect(log).toHaveTextContent(`1 corrección registrada; la última, el ${fmtDate(lot.corrections.lastAt!)}.`);
  });

  it("un evento del sistema se atribuye al registro automático", () => {
    const lot = lotPassport();
    lot.timeline = [{ ...lot.timeline[0]!, actorRole: null, corrected: false }];
    lot.corrections = { count: 0, lastAt: null };
    renderDocument(lot);
    const log = section("Registro del lote");
    expect(log).toHaveTextContent("Registro automático");
    expect(log).toHaveTextContent("Sin correcciones registradas.");
  });

  it("laboratorio: conformidad y cada parámetro frente a su límite y unidad", () => {
    renderDocument(lotPassport());
    const lab = section("Laboratorio");
    expect(lab).toHaveTextContent("Conforme");
    expect(lab).toHaveTextContent("Laboratorio de Servicios Analíticos ISO 17025");
    const methanol = within(lab).getByText("Metanol").closest("li")!;
    expect(methanol).toHaveTextContent("46,5 mg/100 mL de alcohol anhidro");
    expect(methanol).toHaveTextContent("máx. 300 mg/100 ml a.a.");
    expect(methanol).toHaveTextContent("Cumple");
    const abv = within(lab).getByText("Grado alcohólico").closest("li")!;
    expect(abv).toHaveTextContent("Sin límite fijado");
  });

  it("laboratorio no conforme: el parámetro que falla lo dice", () => {
    const lot = lotPassport();
    lot.lab.status = "NON_CONFORMING";
    lot.lab.checks[0] = { ...lot.lab.checks[0]!, value: 320, result: "FAIL" };
    lot.lab.checks[1] = { ...lot.lab.checks[1]!, value: null, result: "MISSING" };
    renderDocument(lot);
    const lab = section("Laboratorio");
    expect(lab).toHaveTextContent("No conforme");
    expect(within(lab).getByText("Metanol").closest("li")).toHaveTextContent("No cumple");
    const copper = within(lab).getByText("Cobre").closest("li")!;
    expect(copper).toHaveTextContent("Sin dato");
    expect(copper).toHaveTextContent("No registrado");
  });

  it("reglas del lote: valores de la instantánea, con la excepción legal marcada", () => {
    const lot = lotPassport();
    lot.rules.items[0] = { ...lot.rules.items[0]!, legalException: true };
    renderDocument(lot);
    const rules = section("Reglas con las que se hizo el lote");
    expect(rules).toHaveTextContent("Altitud mínima de la parcela (D.O. Singani)");
    expect(rules).toHaveTextContent("1.600 msnm");
    expect(rules).toHaveTextContent("Excepción legal");
    expect(rules).toHaveTextContent("180 días");
    expect(rules).toHaveTextContent("Sí");
    expect(rules).toHaveTextContent("Metanol: máx. 300 mg/100 ml a.a.");
    cleanup();
    renderDocument(lotPassport(WINE_LOT));
    expect(section("Reglas con las que se hizo el lote")).toHaveTextContent(
      "Reglas fijadas al pasar el lote al registro actual.",
    );
  });

  it("documentos públicos: enlazan a la API del propio origen; sin documentos no hay sección", () => {
    const lot = lotPassport();
    renderDocument(lot);
    const link = within(section("Documentos públicos")).getByRole("link");
    expect(link).toHaveTextContent("Etiqueta frontal aprobada");
    expect(link).toHaveAttribute("href", `/api${lot.publicAttachments[0]!.url}`);
    cleanup();
    renderDocument(lotPassport(WINE_LOT));
    expect(screen.queryByRole("region", { name: "Documentos públicos" })).toBeNull();
  });
});

describe("PassportDocument · expediente y comprobación", () => {
  afterEach(cleanup);

  it("expediente cerrado: fecha, huella abreviada y descarga", async () => {
    const lot = lotPassport();
    const onDownload = vi.fn();
    renderDocument(lot, { download: { onDownload, pending: false, failed: false } });
    const dossier = section("Expediente del lote");
    expect(dossier).toHaveTextContent(`Expediente cerrado el ${fmtDate(lot.dossier.closedAt!)}`);
    expect(dossier).toHaveTextContent(`${lot.dossier.hash!.slice(0, 8)}…${lot.dossier.hash!.slice(-8)}`);
    expect(dossier).toHaveTextContent("Anclaje en la red: pendiente");
    await userEvent.setup().click(within(dossier).getByRole("button", { name: "Descargar expediente" }));
    expect(onDownload).toHaveBeenCalledOnce();
  });

  it("si la descarga falla, lo avisa", () => {
    renderDocument(lotPassport(), { download: { onDownload: vi.fn(), pending: false, failed: true } });
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos descargar el expediente.");
  });

  it("expediente abierto: sin huella ni descarga", () => {
    renderDocument(lotPassport(WINE_LOT));
    const dossier = section("Expediente del lote");
    expect(dossier).toHaveTextContent("Expediente abierto");
    expect(within(dossier).queryByRole("button", { name: "Descargar expediente" })).toBeNull();
    expect(dossier).not.toHaveTextContent("Huella");
  });

  it("botella verificada: «este código pertenece al expediente cerrado»", () => {
    renderDocument(bottlePassport(), { proof: proofOf({ status: "verified" }) });
    expect(screen.getByText("Este código pertenece al expediente cerrado")).toBeInTheDocument();
    expect(screen.getByText(/Lo comprobamos en tu dispositivo/)).toBeInTheDocument();
  });

  it("mientras comprueba, lo dice", () => {
    renderDocument(bottlePassport(), { proof: proofOf({ status: "checking" }) });
    expect(screen.getByText("Comprobando el código con el expediente…")).toBeInTheDocument();
  });

  it("con el expediente abierto explica que la comprobación llegará al cerrarlo", () => {
    renderDocument(bottlePassport({}, lotPassport(WINE_LOT)), { proof: proofOf({ status: "none" }) });
    expect(screen.getByText(/La bodega aún no cerró el expediente de este lote/)).toBeInTheDocument();
  });

  it("el código no está en el expediente: aviso claro", () => {
    renderDocument(bottlePassport(), { proof: proofOf({ status: "mismatch", reason: "root" }) });
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos confirmar este código");
  });

  it("si no se pudo descargar el expediente, se puede reintentar", async () => {
    const retry = vi.fn();
    renderDocument(bottlePassport(), { proof: proofOf({ status: "failed" }, retry) });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("No pudimos descargar el expediente para comprobar el código.");
    await userEvent.setup().click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("un pasaporte de lote no enseña comprobación de botella", () => {
    renderDocument(lotPassport(), { proof: proofOf({ status: "verified" }) });
    expect(screen.queryByText("Este código pertenece al expediente cerrado")).toBeNull();
  });
});

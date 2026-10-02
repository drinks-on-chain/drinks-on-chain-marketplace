import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseCode, type MalformedCode, type ValidCode } from "@/lib/codes/parse";
import type { PassportState } from "@/lib/passport/types";
import { bottlePassport, lotPassport } from "@/test/passports";
import { MalformedCodeView, PassportView } from "./passport-view";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const bottle = parseCode("K7M2Q9XM") as ValidCode;
const lot = parseCode("CVJ-2026-SINGANI-004") as ValidCode;

function renderView(state: PassportState, code: ValidCode = bottle, retrying = false) {
  const retry = vi.fn();
  // El pasaporte encontrado conecta la comprobación y la descarga: necesita el cliente de consultas.
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PassportView code={code} query={{ state, retry, retrying }} />
    </QueryClientProvider>,
  );
  return { retry };
}

describe("PassportView", () => {
  afterEach(cleanup);

  it("muestra el código como título, formateado como en la etiqueta", () => {
    renderView({ status: "loading" });
    expect(screen.getByRole("heading", { level: 1, name: "K7M2-Q9XM" })).toBeInTheDocument();
    expect(screen.getByText("Código de botella")).toBeInTheDocument();
  });

  it("cargando: esqueleto con aviso para lectores de pantalla, sin formulario", () => {
    renderView({ status: "loading" });
    expect(screen.getByRole("status")).toHaveTextContent("Buscando el código…");
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("no encontrado (botella): lo explica y deja probar otro código", () => {
    renderView({ status: "not-found" });
    expect(screen.getByRole("heading", { name: "No encontramos este código" })).toBeInTheDocument();
    expect(screen.getByText(/no figura en el registro\. Compáralo con la etiqueta/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Código de la botella" })).toHaveValue("");
  });

  it("no encontrado (lote): el texto habla del lote", () => {
    renderView({ status: "not-found" }, lot);
    expect(screen.getByRole("heading", { level: 1, name: "CVJ-2026-SINGANI-004" })).toBeInTheDocument();
    expect(screen.getByText("Código de lote")).toBeInTheDocument();
    expect(screen.getByText(/Ese lote no figura en el registro/)).toBeInTheDocument();
  });

  it("mal escrito según el servidor: formulario con el código para corregirlo", () => {
    renderView({ status: "malformed" }, lot);
    expect(screen.getByRole("heading", { name: "Este código está mal escrito" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Código de la botella" })).toHaveValue("CVJ-2026-SINGANI-004");
  });

  it("demasiados intentos: dice cuánto esperar y permite reintentar, sin formulario", async () => {
    const { retry } = renderView({ status: "rate-limited", retryAfter: 120 });
    expect(screen.getByRole("alert")).toHaveTextContent("Demasiados intentos");
    expect(screen.getByRole("alert")).toHaveTextContent("espera 2 minutos antes de volver a intentarlo");
    expect(screen.queryByRole("textbox")).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("demasiados intentos sin Retry-After: espera genérica", () => {
    renderView({ status: "rate-limited", retryAfter: null });
    expect(screen.getByRole("alert")).toHaveTextContent("espera unos minutos");
  });

  it("sin conexión: aviso y reintento", async () => {
    const { retry } = renderView({ status: "offline" });
    expect(screen.getByRole("alert")).toHaveTextContent("Sin conexión");
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("error: aviso con reintento; mientras reintenta, el botón queda ocupado", async () => {
    const { retry } = renderView({ status: "error" });
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos consultar el código");
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
    cleanup();
    renderView({ status: "error" }, bottle, true);
    expect(screen.getByRole("button", { name: /Reintentar/ })).toBeDisabled();
  });

  it("encontrado: pinta el pasaporte, con el nombre del lote como título", () => {
    renderView({ status: "found", passport: bottlePassport() });
    expect(screen.getByRole("heading", { level: 1, name: "Singani Gran Reserva 2026" })).toBeInTheDocument();
    expect(screen.getByText("Botella n.º 1 de 2.950")).toBeInTheDocument();
    cleanup();
    renderView({ status: "found", passport: lotPassport() }, lot);
    expect(screen.getByText("Esta etiqueta identifica el lote")).toBeInTheDocument();
  });
});

describe("MalformedCodeView", () => {
  afterEach(cleanup);

  it("explica el error en el campo y ofrece la sugerencia", () => {
    render(<MalformedCodeView problem={parseCode("K7MZ-Q9XM") as MalformedCode} />);
    expect(screen.getByRole("heading", { level: 1, name: "Este código está mal escrito" })).toBeInTheDocument();
    const field = screen.getByRole("textbox", { name: "Código de la botella" });
    expect(field).toHaveValue("K7MZ-Q9XM");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(/Ese código no es válido/);
    expect(screen.getByRole("button", { name: "Usar K7M2-Q9XM" })).toBeInTheDocument();
  });
});

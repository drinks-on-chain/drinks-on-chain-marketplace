import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseCode, type MalformedCode } from "@/lib/codes/parse";
import { CodeEntryForm } from "./code-entry-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const field = () => screen.getByRole("textbox", { name: "Código de la botella" });
const submit = () => screen.getByRole("button", { name: "Verificar" });

describe("CodeEntryForm", () => {
  beforeEach(() => push.mockReset());
  afterEach(cleanup);

  it("con un código válido navega al visor con la forma canónica", async () => {
    const user = userEvent.setup();
    render(<CodeEntryForm />);
    await user.type(field(), "k7m2-q9xm");
    await user.click(submit());
    expect(push).toHaveBeenCalledWith("/b/K7M2Q9XM");
    expect(field()).not.toHaveAttribute("aria-invalid");
  });

  it("acepta el código de lote y se envía con Intro", async () => {
    const user = userEvent.setup();
    render(<CodeEntryForm />);
    await user.type(field(), "cvj-2026-singani-004{Enter}");
    expect(push).toHaveBeenCalledWith("/b/CVJ-2026-SINGANI-004");
  });

  it("vacío: marca el campo, asocia el mensaje y deja el foco en él", async () => {
    const user = userEvent.setup();
    render(<CodeEntryForm />);
    await user.click(submit());
    expect(push).not.toHaveBeenCalled();
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAccessibleDescription(/Escribe el código que aparece en la etiqueta\./);
    expect(screen.getByRole("alert")).toHaveTextContent("Escribe el código que aparece en la etiqueta.");
    expect(field()).toHaveFocus();
  });

  it("mal escrito: explica el motivo con los caracteres contados", async () => {
    const user = userEvent.setup();
    render(<CodeEntryForm />);
    await user.type(field(), "K7M2-Q9X{Enter}");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("El código tiene 8 caracteres y escribiste 7.");
    // Al corregir, el error desaparece.
    await user.type(field(), "M");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(field()).not.toHaveAttribute("aria-invalid");
  });

  it("ofrece la sugerencia y, al aceptarla, abre ese código", async () => {
    const user = userEvent.setup();
    render(<CodeEntryForm />);
    await user.type(field(), "K7MZ-Q9XM{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("Ese código no es válido");
    await user.click(screen.getByRole("button", { name: "Usar K7M2-Q9XM" }));
    expect(push).toHaveBeenCalledWith("/b/K7M2Q9XM");
    expect(field()).toHaveValue("K7M2-Q9XM");
  });

  it("sin sugerencia única no ofrece ninguna", async () => {
    const user = userEvent.setup();
    render(<CodeEntryForm />);
    await user.type(field(), "K7M2-Q9XB{Enter}");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Usar / })).toBeNull();
  });

  it("arranca con el código mal escrito de la URL y su error", () => {
    const problem = parseCode("K7M2Q9UM") as MalformedCode;
    render(<CodeEntryForm initialValue={problem.input} initialProblem={problem} />);
    expect(field()).toHaveValue("K7M2Q9UM");
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("no usa la letra U");
  });

  it("no corrige ni autocompleta lo que se escribe", () => {
    render(<CodeEntryForm />);
    expect(field()).toHaveAttribute("autocomplete", "off");
    expect(field()).toHaveAttribute("autocapitalize", "characters");
    expect(field()).toHaveAttribute("spellcheck", "false");
  });
});

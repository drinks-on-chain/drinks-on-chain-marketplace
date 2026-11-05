// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { sha256Hex } from "@drinks-on-chain/mocks";
import { lotPassport, lotWithPendingAnchor, lotWithoutAnchor, WINE_LOT } from "@/test/passports";
import { anchorChecks, anchorStage, recomputeFingerprint, sha256HexOf, viewerChecks } from "./anchor";
import type { LotVerification } from "./api";

const bytesOf = (text: string) => new TextEncoder().encode(text);

describe("anchorStage", () => {
  it("sin anclaje: expediente abierto o backend que aún responde `anchor: null`", () => {
    expect(anchorStage(lotPassport(WINE_LOT))).toBe("none");
    expect(anchorStage(lotWithoutAnchor())).toBe("none");
  });

  it("pendiente: hay transacción sin confirmar, o un «anclado» sin hash de transacción", () => {
    expect(anchorStage(lotWithPendingAnchor())).toBe("pending");
    const lot = lotPassport();
    lot.dossier.anchor = { ...lot.dossier.anchor!, txHash: null };
    expect(anchorStage(lot)).toBe("pending");
  });

  it("anclado: confirmado y con su transacción", () => {
    expect(anchorStage(lotPassport())).toBe("anchored");
  });

  it("un expediente abierto nunca cuenta como anclado, traiga lo que traiga", () => {
    const lot = lotPassport();
    lot.dossier.status = "OPEN";
    expect(anchorStage(lot)).toBe("none");
  });
});

describe("recálculo de la huella con WebCrypto", () => {
  it("SHA-256 de los bytes, igual que el cálculo de referencia", async () => {
    expect(await sha256HexOf(bytesOf("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    const canonical = '{"lotCode":"CVJ-2026-SINGANI-004","ñ":"año"}';
    expect(await sha256HexOf(bytesOf(canonical))).toBe(sha256Hex(canonical));
  });

  it("coincide con la huella publicada y con la del memo (sin distinguir mayúsculas)", async () => {
    const bytes = bytesOf("expediente");
    const hash = (await sha256HexOf(bytes))!;
    await expect(recomputeFingerprint(bytes, { dossierHash: hash, memoHashHex: hash.toUpperCase() })).resolves.toEqual({
      status: "match",
      computed: hash,
    });
  });

  it("si un solo byte cambia, no coincide; y dice con cuál de las dos", async () => {
    const hash = (await sha256HexOf(bytesOf("expediente")))!;
    const other = (await sha256HexOf(bytesOf("expedientf")))!;
    await expect(
      recomputeFingerprint(bytesOf("expedientf"), { dossierHash: hash, memoHashHex: hash }),
    ).resolves.toEqual({ status: "mismatch", computed: other, dossier: false, memo: false });
    await expect(
      recomputeFingerprint(bytesOf("expediente"), { dossierHash: hash, memoHashHex: other }),
    ).resolves.toEqual({ status: "mismatch", computed: hash, dossier: true, memo: false });
    await expect(
      recomputeFingerprint(bytesOf("expediente"), { dossierHash: null, memoHashHex: hash }),
    ).resolves.toMatchObject({ status: "mismatch", dossier: false, memo: true });
  });

  it("sin WebCrypto (origen no seguro) no afirma nada", async () => {
    vi.stubGlobal("crypto", {});
    try {
      await expect(recomputeFingerprint(bytesOf("x"), { dossierHash: "a", memoHashHex: "a" })).resolves.toEqual({
        status: "unsupported",
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("comprobaciones", () => {
  it("las propias del visor: lo que se deduce del pasaporte; la cuenta oficial no se puede comprobar aquí", () => {
    expect(viewerChecks(lotPassport()).map((c) => [c.key, c.pass])).toEqual([
      ["DOSSIER_CLOSED", true],
      ["ANCHOR_CONFIRMED", true],
      ["MEMO_MATCHES_HASH", true],
      ["ANCHOR_ACCOUNT_OFFICIAL", null],
    ]);
    expect(viewerChecks(lotWithPendingAnchor()).map((c) => c.pass)).toEqual([true, false, true, null]);
    expect(viewerChecks(lotWithoutAnchor()).map((c) => c.pass)).toEqual([true, null, null, null]);
  });

  it("un memo que no es la huella del pasaporte no pasa", () => {
    const lot = lotPassport();
    lot.dossier.anchor = { ...lot.dossier.anchor!, memoHashHex: "0".repeat(64) };
    expect(viewerChecks(lot).find((c) => c.key === "MEMO_MATCHES_HASH")?.pass).toBe(false);
  });

  it("con la respuesta del servidor mandan las suyas, en el orden del contrato", () => {
    const lot = lotPassport();
    const verification = {
      checks: [
        { key: "ANCHOR_ACCOUNT_OFFICIAL", pass: true, message: "Es la cuenta oficial." },
        { key: "DOSSIER_CLOSED", pass: true, message: "Cerrado." },
      ],
    } as LotVerification;
    const checks = anchorChecks(lot, verification);
    expect(checks.map((c) => [c.key, c.source])).toEqual([
      ["DOSSIER_CLOSED", "server"],
      ["ANCHOR_CONFIRMED", "viewer"],
      ["MEMO_MATCHES_HASH", "viewer"],
      ["ANCHOR_ACCOUNT_OFFICIAL", "server"],
    ]);
    expect(checks[3]).toMatchObject({ pass: true, message: "Es la cuenta oficial." });
    expect(anchorChecks(lot, null)).toEqual(viewerChecks(lot));
  });
});

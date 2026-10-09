// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { routes } from "@/lib/links";
import { config, proxy } from "@/proxy";
import { ACCOUNT_MATCHERS, ACCOUNT_OFF_PATH, accountFlagOn, isAccountPath } from "./routes";

describe("rutas de la cuenta y de los pedidos", () => {
  it("reconoce todas las rutas de `routes` que son de la cuenta, y solo esas", () => {
    for (const path of [
      routes.login,
      routes.signup,
      routes.forgotPassword,
      routes.resetPassword,
      routes.verifyEmail,
      routes.account,
      routes.orders,
      routes.order("abc"),
      "/cuenta/",
    ]) {
      expect(isAccountPath(path), path).toBe(true);
    }
    for (const path of ["/", "/catalogo", "/colecciones/x", "/b/K7M2Q9XM", "/bodegas", "/cuentas", "/entrar-ya"]) {
      expect(isAccountPath(path), path).toBe(false);
    }
  });

  it("el proxy vigila exactamente esas rutas (además de la API)", () => {
    expect(config.matcher).toEqual(["/api/v1/:path*", ...ACCOUNT_MATCHERS]);
  });

  it("la bandera solo se enciende con `1`", () => {
    expect(accountFlagOn("1")).toBe(true);
    for (const value of [undefined, "", "0", "true"]) expect(accountFlagOn(value)).toBe(false);
  });
});

describe("proxy con la bandera apagada (por defecto)", () => {
  it("las rutas de la cuenta se reescriben a una ruta que no existe: 404", () => {
    for (const path of ["/entrar", "/cuenta", "/cuenta/pedidos/abc"]) {
      const response = proxy(new NextRequest(`https://app.ejemplo.test${path}`));
      expect(response.headers.get("x-middleware-rewrite"), path).toBe(`https://app.ejemplo.test${ACCOUNT_OFF_PATH}`);
    }
  });
});

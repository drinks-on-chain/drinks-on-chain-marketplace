import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { ConsumerProfile } from "@/lib/account/api";
import { ApiError } from "@/lib/api/errors";
import { storeDesktopNavigation, storeTabs } from "@/lib/navigation";
import { AddressReadOnly, ProfileView } from "./account-screen";
import { LoginForm, SignupForm } from "./auth-forms";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const api = vi.hoisted(() => ({ login: vi.fn(), signup: vi.fn() }));
vi.mock("@/lib/account/api", async (original) => ({
  ...(await original<typeof import("@/lib/account/api")>()),
  login: api.login,
  signup: api.signup,
}));

const wrap = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      {ui}
    </QueryClientProvider>,
  );

beforeEach(() => {
  api.login.mockReset();
  api.signup.mockReset();
});
afterEach(cleanup);

describe("bandera de la cuenta apagada (por defecto)", () => {
  it("la navegación no tiene ningún enlace a la cuenta", () => {
    const labels = [...storeTabs, ...storeDesktopNavigation].map((item) => String(item.label));
    expect(labels).not.toContain("Cuenta");
    expect([...storeTabs, ...storeDesktopNavigation].map((item) => item.href)).not.toContain("/cuenta");
  });
});

describe("LoginForm", () => {
  it("valida antes de enviar y pone el foco en el primer campo con error", async () => {
    wrap(<LoginForm onAuthenticated={vi.fn()} onSwitch={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Entrar" }));
    const email = screen.getByRole("textbox", { name: /Correo electrónico/ });
    expect(email).toHaveAccessibleDescription(/Escribe tu correo\./);
    expect(email).toHaveFocus();
    expect(api.login).not.toHaveBeenCalled();
  });

  it("entra con correo y contraseña; nada de passkeys ni proveedores sociales", async () => {
    api.login.mockResolvedValue(undefined);
    const onAuthenticated = vi.fn();
    wrap(<LoginForm onAuthenticated={onAuthenticated} onSwitch={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: /Correo electrónico/ }), " maria@tribu.test ");
    await user.type(screen.getByLabelText(/Contraseña/), "una-clave-larga");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
    expect(api.login.mock.calls[0]![0]).toEqual({ email: "maria@tribu.test", password: "una-clave-larga" });
    expect(screen.queryByText(/passkey|Google|Apple|Facebook|SMS/i)).toBeNull();
  });

  it("credenciales incorrectas: un aviso general, sin decir cuál falló", async () => {
    api.login.mockRejectedValue(new ApiError({ status: 401, code: "AUTH_INVALID_CREDENTIALS", message: "x" }));
    wrap(<LoginForm onAuthenticated={vi.fn()} onSwitch={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: /Correo electrónico/ }), "maria@tribu.test");
    await user.type(screen.getByLabelText(/Contraseña/), "no-es-esta");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El correo o la contraseña no son correctos.");
  });
});

describe("SignupForm", () => {
  async function fill(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByRole("textbox", { name: /Nombre completo/ }), "Lucía Vargas");
    await user.type(screen.getByRole("textbox", { name: /Correo electrónico/ }), "lucia@ejemplo.test");
    await user.type(screen.getByLabelText(/^Contraseña/), "una-clave-larga");
  }

  it("sin aceptar los términos ni declarar la mayoría de edad no envía, y lo dice en cada casilla", async () => {
    wrap(<SignupForm onAuthenticated={vi.fn()} onSwitch={vi.fn()} />);
    const user = userEvent.setup();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(screen.getByRole("checkbox", { name: /Acepto el aviso legal/ })).toHaveAccessibleDescription(
      /tienes que aceptar el aviso legal/,
    );
    expect(screen.getByRole("checkbox", { name: /mayor de 18 años/ })).toHaveAccessibleDescription(
      /tienes que declarar que eres mayor de 18 años/,
    );
    expect(api.signup).not.toHaveBeenCalled();
  });

  it("envía el alta del borrador: términos, mayoría de edad, captcha de prueba y el campo trampa vacío", async () => {
    api.signup.mockResolvedValue({ kind: "signed-in" });
    const onAuthenticated = vi.fn();
    wrap(<SignupForm onAuthenticated={onAuthenticated} onSwitch={vi.fn()} />);
    const user = userEvent.setup();
    await fill(user);
    await user.click(screen.getByRole("checkbox", { name: /Acepto el aviso legal/ }));
    await user.click(screen.getByRole("checkbox", { name: /mayor de 18 años/ }));
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
    expect(api.signup.mock.calls[0]![0]).toEqual({
      fullName: "Lucía Vargas",
      email: "lucia@ejemplo.test",
      password: "una-clave-larga",
      acceptTerms: true,
      ageDeclaration: true,
      captchaToken: "XXXX.DUMMY.TOKEN.XXXX",
      website: "",
    });
  });

  it("el campo trampa existe, pero ni se ve ni se llega a él", () => {
    const { container } = wrap(<SignupForm onAuthenticated={vi.fn()} onSwitch={vi.fn()} />);
    const trap = container.querySelector<HTMLInputElement>('input[name="website"]')!;
    expect(trap).toHaveAttribute("tabindex", "-1");
    expect(trap.closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.queryByRole("textbox", { name: /Sitio web/ })).toBeNull();
  });

  it("[BORRADOR §13.1] si el alta pide confirmar el correo, lo dice y no da la cuenta por abierta", async () => {
    api.signup.mockResolvedValue({ kind: "verification-sent" });
    const onAuthenticated = vi.fn();
    wrap(<SignupForm onAuthenticated={onAuthenticated} onSwitch={vi.fn()} />);
    const user = userEvent.setup();
    await fill(user);
    await user.click(screen.getByRole("checkbox", { name: /Acepto el aviso legal/ }));
    await user.click(screen.getByRole("checkbox", { name: /mayor de 18 años/ }));
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(await screen.findByText("Revisa tu correo")).toBeInTheDocument();
    expect(screen.getByText(/Te enviamos un enlace a lucia@ejemplo\.test/)).toBeInTheDocument();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it("un correo que ya tiene cuenta se marca en su campo", async () => {
    api.signup.mockRejectedValue(
      new ApiError({ status: 409, code: "CONFLICT", message: "El correo electrónico ya existe" }),
    );
    wrap(<SignupForm onAuthenticated={vi.fn()} onSwitch={vi.fn()} />);
    const user = userEvent.setup();
    await fill(user);
    await user.click(screen.getByRole("checkbox", { name: /Acepto el aviso legal/ }));
    await user.click(screen.getByRole("checkbox", { name: /mayor de 18 años/ }));
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: /Correo electrónico/ })).toHaveAccessibleDescription(
        /Ya hay una cuenta con ese correo/,
      ),
    );
  });
});

const profile: ConsumerProfile = {
  userId: "u-1",
  fullName: "María Fernández",
  email: "maria@tribu.test",
  emailVerified: true,
  address: {
    address: "GCODFRQQCUPIEV6A3F6NQ23TXZNOI74Z42TAOSAA26ODC4YOZUKCRTP7",
    network: "TESTNET",
    explorerUrl: "https://explorador.ejemplo.test/account/GCODFRQQCUPIEV6A3F6NQ23TXZNOI74Z42TAOSAA26ODC4YOZUKCRTP7",
    custodial: true,
  },
  preferences: { lotProgress: true, redemptionReminders: true, promotions: false },
  createdAt: "2026-09-01T12:00:00Z",
};

describe("perfil y dirección informativa", () => {
  it("AddressReadOnly: la dirección, quién la gestiona y el enlace del backend; nada que editar", () => {
    render(<AddressReadOnly address={profile.address} />);
    const region = screen.getByRole("region", { name: "Tu dirección en la red" });
    expect(region).toHaveTextContent("La gestiona Drinks on Chain; no necesitas hacer nada.");
    expect(region).toHaveTextContent("GCODFR");
    expect(within(region).getByRole("link", { name: /Ver la dirección en el explorador/ })).toHaveAttribute(
      "href",
      profile.address!.explorerUrl,
    );
    expect(within(region).queryByRole("textbox")).toBeNull();
    expect(region).not.toHaveTextContent(/wallet|billetera|clave|frase/i);
  });

  it("AddressReadOnly sin dirección todavía: lo dice, sin enlace", () => {
    render(<AddressReadOnly address={null} />);
    const region = screen.getByRole("region", { name: "Tu dirección en la red" });
    expect(region).toHaveTextContent("Todavía no tienes una dirección asignada");
    expect(within(region).queryByRole("link")).toBeNull();
  });

  it("ProfileView: datos, correo confirmado, pedidos, avisos y cerrar sesión", async () => {
    const onLogout = vi.fn();
    render(<ProfileView profile={profile} onLogout={onLogout} loggingOut={false} />);
    expect(screen.getByText("María Fernández")).toBeInTheDocument();
    expect(screen.getByText("Correo confirmado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mis pedidos/ })).toHaveAttribute("href", "/cuenta/pedidos");
    const notices = within(screen.getByRole("region", { name: "Avisos por correo" })).getAllByRole("listitem");
    expect(notices.map((item) => item.textContent)).toEqual([
      "Avances de tus lotesActivado",
      "Recordatorios de canjeActivado",
      "Novedades y promocionesDesactivado",
    ]);
    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("correo sin confirmar: aviso con la forma de pedir otro enlace", () => {
    render(<ProfileView profile={{ ...profile, emailVerified: false }} onLogout={vi.fn()} loggingOut={false} />);
    expect(screen.getByText("Correo sin confirmar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pedir otro enlace" })).toHaveAttribute("href", "/verificar-correo");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Order } from "@/lib/orders/api";
import { OrderBottles, OrderEnded, OrderStatusBadge, PaymentReceived } from "./order-parts";
import { OrderRow, OrderView } from "./orders-screen";

// [BORRADOR §13.1] Piezas de la compra: estado del pedido, «pago recibido» y las botellas.

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const nbsp = (text: string | null) => (text ?? "").replace(/[  ]/g, " ");

const order = (patch: Partial<Order> = {}): Order => ({
  id: "o-1",
  status: "PAID",
  collection: {
    id: "c-1",
    slug: "singani-gran-reserva-2026",
    name: "Singani Gran Reserva 2026",
    coverImageUrl: null,
    winery: { slug: "destileria-cinti-viejo", tradeName: "Destilería Cinti Viejo" },
  },
  quantity: 2,
  unitPrice: { amountMinor: 28000, currency: "BOB" },
  total: { amountMinor: 56000, currency: "BOB" },
  reservedUntil: null,
  payment: { id: "p-1", provider: "TEST", status: "APPROVED", paidAt: "2026-10-09T12:05:00Z" },
  tokens: [
    { tokenId: 4, bottleNumber: 5, transfer: null },
    { tokenId: 5, bottleNumber: 6, transfer: null },
  ],
  createdAt: "2026-10-09T12:00:00Z",
  updatedAt: "2026-10-09T12:05:00Z",
  ...patch,
});

const wrap = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

afterEach(cleanup);

describe("estado del pedido", () => {
  it("cada fase con su texto", () => {
    const cases: [Order["status"], string][] = [
      ["AWAITING_PAYMENT", "Esperando el pago"],
      ["PAID", "Pago recibido"],
      ["PAYMENT_FAILED", "Pago no completado"],
      ["EXPIRED", "Reserva caducada"],
    ];
    for (const [status, label] of cases) {
      render(<OrderStatusBadge order={{ status }} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      cleanup();
    }
  });
});

describe("pago recibido y botellas (A-23)", () => {
  it("«Pago recibido» dice el importe en bolivianos y cuándo se pagó", () => {
    render(<PaymentReceived order={order()} />);
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("Pago recibido");
    expect(nbsp(notice.textContent)).toContain("Recibimos tu pago de Bs 560.");
    expect(notice).toHaveTextContent("Pagado el 9 oct 2026");
  });

  it("con el pago recibido: «Botella N de M», su NFT y la entrega en la red pendiente", () => {
    render(<OrderBottles order={order()} editionSize={60} />);
    const items = within(screen.getByRole("list", { name: "Tus botellas" })).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Botella 5 de 60");
    expect(items[0]).toHaveTextContent("NFT n.º 4");
    expect(items[0]).toHaveTextContent("Entrega en la red: pendiente");
    expect(items[1]).toHaveTextContent("Botella 6 de 60");
  });

  it("sin el tamaño de la colección no se inventa: «Botella n.º N»", () => {
    render(<OrderBottles order={order()} editionSize={null} />);
    expect(screen.getByText("Botella n.º 5")).toBeInTheDocument();
  });

  it("sin el pago recibido no se pinta ninguna botella, aunque el pedido las traiga", () => {
    for (const status of ["AWAITING_PAYMENT", "PAYMENT_FAILED", "EXPIRED"] as const) {
      const { container } = render(<OrderBottles order={order({ status })} editionSize={60} />);
      expect(container).toBeEmptyDOMElement();
      cleanup();
    }
  });
});

describe("página de un pedido", () => {
  it("pagado: el «Pago recibido» va antes que las botellas", () => {
    wrap(<OrderView order={order()} editionSize={60} />);
    const received = screen.getByRole("status");
    expect(received).toHaveTextContent("Pago recibido");
    const bottles = screen.getByRole("list", { name: "Tus botellas" });
    expect(received.compareDocumentPosition(bottles) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver la colección" })).toHaveAttribute(
      "href",
      "/colecciones/singani-gran-reserva-2026",
    );
  });

  it("esperando el pago: la pasarela de prueba, sin botellas", () => {
    wrap(
      <OrderView
        order={order({
          status: "AWAITING_PAYMENT",
          tokens: [],
          reservedUntil: "2026-10-09T12:30:00Z",
          payment: { id: "p-1", provider: "TEST", status: "PENDING", paidAt: null },
        })}
        editionSize={60}
      />,
    );
    const gateway = screen.getByRole("region", { name: "Pasarela de prueba" });
    expect(gateway).toHaveTextContent("no se cobra nada");
    expect(
      within(gateway)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Aprobar el pago", "Rechazar el pago", "Demorar la respuesta"]);
    // 12:30 UTC son las 08:30 en Bolivia.
    expect(screen.getByText("Guardamos tus botellas hasta las 08:30 (hora de Bolivia).")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Tus botellas" })).toBeNull();
    expect(screen.queryByText("Pago recibido")).toBeNull();
  });

  it("pago fallido y reserva caducada: se dice que no se cobró nada", () => {
    render(<OrderEnded order={order({ status: "PAYMENT_FAILED", tokens: [] })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("El pago no se completó");
    expect(screen.getByRole("alert")).toHaveTextContent("No se cobró nada");
    cleanup();
    const onRetry = vi.fn();
    render(<OrderEnded order={order({ status: "EXPIRED", tokens: [] })} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("La reserva caducó");
    expect(screen.getByRole("button", { name: "Empezar de nuevo" })).toBeInTheDocument();
  });

  it("fila del historial: colección, fecha, botellas, total y estado", () => {
    render(<OrderRow order={order()} />);
    const row = screen.getByRole("article");
    expect(within(row).getByRole("link", { name: "Ver el pedido de Singani Gran Reserva 2026" })).toHaveAttribute(
      "href",
      "/cuenta/pedidos/o-1",
    );
    expect(row).toHaveTextContent("Pedido del 9 oct 2026");
    expect(row).toHaveTextContent("2 botellas");
    expect(nbsp(row.textContent)).toContain("Bs 560");
    expect(row).toHaveTextContent("Pago recibido");
  });
});

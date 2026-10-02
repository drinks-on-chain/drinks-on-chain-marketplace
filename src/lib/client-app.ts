// App de origen de las peticiones (contrato de la Ola 1 §7). El backend la guarda en cada
// entrada de la bitácora a partir de la cabecera `X-Client-App`, que el cliente de API envía
// siempre. Cada app que nace de la plantilla fija aquí su valor: esta es el Marketplace.

export type ClientApp = "ERP" | "BACKOFFICE" | "MARKETPLACE" | "POS" | "API";

export const CLIENT_APP_HEADER = "X-Client-App";

export const CLIENT_APP: ClientApp = "MARKETPLACE";

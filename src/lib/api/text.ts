import { CLIENT_APP, CLIENT_APP_HEADER } from "@/lib/client-app";
import { buildUrl } from "./client";
import { errorEnvelope } from "./envelope";
import { ApiError, NetworkError } from "./errors";

/** `GET` público sin el envoltorio `{ success, data }`; los errores sí llegan envueltos (`ApiError`). */
async function rawGet(path: string, signal?: AbortSignal): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(buildUrl(path), {
      headers: { Accept: "application/json", "Accept-Language": "es", [CLIENT_APP_HEADER]: CLIENT_APP },
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new NetworkError(cause);
  }
  if (!res.ok) {
    const retryAfter = Number(res.headers.get("Retry-After"));
    const parsed = errorEnvelope.safeParse(await res.json().catch(() => null));
    throw new ApiError({
      status: res.status,
      code: parsed.success ? parsed.data.error.code : `HTTP_${res.status}`,
      message: parsed.success ? parsed.data.error.message : res.statusText || "Error",
      path,
      retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    });
  }
  return res;
}

/**
 * `GET` público que devuelve el cuerpo **tal cual**, sin el envoltorio `{ success, data }`
 * (p. ej. los bytes canónicos del expediente, que hay que recibir intactos para recalcular su
 * huella). Los errores sí llegan con el envoltorio común y se lanzan como `ApiError`.
 */
export async function apiText(path: string, { signal }: { signal?: AbortSignal } = {}): Promise<string> {
  return (await rawGet(path, signal)).text();
}

/** Como `apiText`, pero entrega los **bytes** recibidos, sin decodificarlos (huella con WebCrypto). */
export async function apiBytes(path: string, { signal }: { signal?: AbortSignal } = {}): Promise<Uint8Array> {
  return new Uint8Array(await (await rawGet(path, signal)).arrayBuffer());
}

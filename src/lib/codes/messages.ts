import { es } from "@/lib/i18n/es";
import type { MalformedCode } from "./parse";

/** Mensaje para la persona, en español, de por qué un código está mal escrito. */
export function malformedMessage(problem: MalformedCode): string {
  const { errors } = es.verify;
  if (problem.reason === "too-short" || problem.reason === "too-long") return errors[problem.reason](problem.length);
  return errors[problem.reason];
}

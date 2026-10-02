import type { Metadata } from "next";
import { CodeEntryForm } from "@/components/code-entry-form";
import { es } from "@/lib/i18n/es";

export const metadata: Metadata = { title: es.verify.title, description: es.verify.lead };

// Entrada manual del código (2E). El escáner con cámara llega con `CameraScanner` (O4-PK-1).
export default function VerifyPage() {
  return (
    <div className="mx-auto w-full max-w-[46rem] px-5 py-10 md:px-8 md:py-16">
      <header className="mb-8 text-center md:mb-10">
        <h1 className="m-0 font-display text-4xl leading-tight font-medium md:text-5xl">{es.verify.title}</h1>
        <p className="mx-auto mt-4 mb-0 max-w-[46ch] text-lg leading-editorial text-fg-muted">{es.verify.lead}</p>
      </header>

      <div className="rounded-lg border border-border bg-bg-raised p-5 md:p-8">
        <CodeEntryForm />
      </div>

      <section aria-labelledby="donde-titulo" className="mt-8 text-center">
        <h2 id="donde-titulo" className="m-0 font-display text-xl font-medium">
          {es.verify.where}
        </h2>
        <p className="mx-auto mt-2 mb-0 max-w-[52ch] text-md leading-editorial text-fg-muted">{es.verify.whereBody}</p>
      </section>
    </div>
  );
}

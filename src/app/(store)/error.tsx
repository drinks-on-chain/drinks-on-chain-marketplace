"use client";

import { ErrorState } from "@drinks-on-chain/ui";
import { es } from "@/lib/i18n/es";

// Next 16.3: `retry()` vuelve a pedir y a pintar lo que falló (sustituye a `reset()`).
export default function StoreError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[46rem] px-5 py-10 md:px-8 md:py-16">
      <h1 className="sr-only">{es.errors.genericTitle}</h1>
      <ErrorState
        title={es.errors.genericTitle}
        description={es.errors.genericBody}
        onRetry={() => retry()}
        retryLabel={es.common.retry}
      />
    </div>
  );
}

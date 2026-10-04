"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SCENARIOS, getScenario, setScenario, type ScenarioName } from "@drinks-on-chain/mocks/browser";
import { SCENARIO_DESCRIPTIONS } from "@drinks-on-chain/mocks/handlers";
import { Alert, Card, CardHeader, Field, Select } from "@drinks-on-chain/ui";
import { env } from "@/lib/env";
import { es } from "@/lib/i18n/es";

// Panel de desarrollo: escenario de los mocks. El Marketplace no tiene usuarios de demo con los
// que entrar (no hay sesión en esta ola).
export function MocksPanel() {
  const queryClient = useQueryClient();
  const [scenario, setScenarioState] = useState<ScenarioName>(() => getScenario());

  function changeScenario(value: string) {
    const next = value as ScenarioName;
    setScenario(next);
    setScenarioState(next);
    void queryClient.invalidateQueries();
  }

  return (
    <main className="mx-auto grid max-w-(--doc-content-max) gap-6 p-6">
      <header className="grid gap-1">
        <p className="m-0 text-2xs tracking-label text-fg-subtle uppercase">{es.mocks.eyebrow}</p>
        <h1 className="m-0 font-display text-3xl">{es.mocks.title}</h1>
      </header>

      {!env.mocks && <Alert tone="warning">{es.mocks.off}</Alert>}

      <Card className="grid gap-4 p-6">
        <CardHeader title={es.mocks.scenario} description={es.mocks.note} />
        <Field label={es.mocks.scenario} hideLabel className="w-full max-w-xl">
          <Select
            value={scenario}
            onValueChange={changeScenario}
            options={SCENARIOS.map((s) => ({ value: s, label: `${s} · ${SCENARIO_DESCRIPTIONS[s]}` }))}
          />
        </Field>
      </Card>
    </main>
  );
}

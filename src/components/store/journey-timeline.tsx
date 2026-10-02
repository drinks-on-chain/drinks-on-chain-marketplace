import type { PublicTimelineEvent } from "@drinks-on-chain/mocks";
import { Badge, cn } from "@drinks-on-chain/ui";
import { fmtDate } from "@/lib/format";
import { es } from "@/lib/i18n/es";

// Pendiente de mover a @drinks-on-chain/ui (`JourneyTimeline`, 05 §3.2): el viaje del lote en
// familia editorial. `Timeline` del paquete es la versión operativa (Inter, compacta).

/** Rol de quien registró el evento. Nunca un nombre (S-21); `null` es el propio sistema. */
export const roleLabel = (role: PublicTimelineEvent["actorRole"]) =>
  role === null ? es.passport.systemRole : (es.passport.roles[role] ?? role);

/**
 * Eventos públicos del lote, del más antiguo al más reciente: qué pasó, cuándo y qué rol lo
 * registró. Un registro tardío muestra también cuándo se anotó; uno corregido lo dice.
 */
export function JourneyTimeline({ events, className }: { events: PublicTimelineEvent[]; className?: string }) {
  if (events.length === 0) return <p className="m-0 text-md text-fg-muted">{es.passport.timelineEmpty}</p>;
  return (
    <ol className={cn("m-0 grid list-none p-0", className)}>
      {events.map((event, index) => {
        const last = index === events.length - 1;
        return (
          <li key={`${event.type}-${event.occurredAt}-${index}`} className="relative pb-6 pl-7 last:pb-0">
            {last ? null : <span aria-hidden="true" className="absolute top-3 -bottom-1 left-[5px] w-px bg-rule" />}
            <span
              aria-hidden="true"
              className="absolute top-[0.45rem] left-0 size-[11px] rounded-full border-2 border-accent bg-bg"
            />
            <p className="m-0 font-ui text-xs font-medium tracking-label text-fg-subtle uppercase">
              <time dateTime={event.occurredAt}>{fmtDate(event.occurredAt)}</time>
            </p>
            <p className="m-0 mt-0.5 font-display text-xl leading-snug">{event.summary}</p>
            <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
              <span>{roleLabel(event.actorRole)}</span>
              {event.lateEntry ? <span>· {es.passport.lateEntry(fmtDate(event.recordedAt))}</span> : null}
              {event.corrected ? <Badge tone="warning">{es.passport.corrected}</Badge> : null}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

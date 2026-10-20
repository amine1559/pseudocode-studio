"use client";

import { useStudioStore } from "@/store/studio-store";

export function VariableInspector(): React.ReactElement {
  const variables = useStudioStore((s) => s.variables);
  const callStack = useStudioStore((s) => s.callStack);
  const loops = useStudioStore((s) => s.loops);
  const history = useStudioStore((s) => s.history);
  const status = useStudioStore((s) => s.status);

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950 text-sm">
      <Section title="État d'exécution">
        <p className="text-zinc-400">
          Statut : <span className="text-zinc-100">{status}</span>
        </p>
        {loops.length > 0 && (
          <ul className="mt-2 space-y-1 text-zinc-300">
            {loops.map((loop) => (
              <li key={`${loop.name}-${loop.line}`}>
                {loop.name} — itération {loop.iteration}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Variables">
        {variables.length === 0 ? (
          <p className="text-zinc-500">Aucune variable pour le moment.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="text-zinc-500">
              <tr>
                <th className="py-1 font-medium">Nom</th>
                <th className="py-1 font-medium">Type</th>
                <th className="py-1 font-medium">Valeur</th>
              </tr>
            </thead>
            <tbody>
              {variables.map((variable) => (
                <tr key={`${variable.scope}-${variable.name}`} className="border-t border-zinc-800 font-mono">
                  <td className="py-1 text-cyan-300">{variable.name}</td>
                  <td className="py-1 text-zinc-400">{variable.type}</td>
                  <td className="py-1 text-amber-200">{variable.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Pile d'appels">
        {callStack.length === 0 ? (
          <p className="text-zinc-500">Vide</p>
        ) : (
          <ol className="space-y-1 font-mono text-xs text-zinc-300">
            {[...callStack].reverse().map((frame, index) => (
              <li key={`${frame.name}-${index}`}>
                {frame.name}:{frame.line}
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Historique">
        {history.length === 0 ? (
          <p className="text-zinc-500">L&apos;historique apparaît pendant l&apos;exécution.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-1 pr-2">Pas</th>
                  <th className="py-1 pr-2">Instruction</th>
                  <th className="py-1">Variables</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().slice(0, 40).map((entry) => (
                  <tr key={entry.step} className="border-t border-zinc-800 align-top font-mono">
                    <td className="py-1 pr-2 text-zinc-500">{entry.step}</td>
                    <td className="py-1 pr-2 text-zinc-200">{entry.instruction}</td>
                    <td className="py-1 text-zinc-400">
                      {Object.entries(entry.variables)
                        .map(([name, value]) => `${name}=${value}`)
                        .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="min-h-0 flex-1 overflow-auto border-b border-zinc-800 p-3 last:border-b-0">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>
      {children}
    </section>
  );
}

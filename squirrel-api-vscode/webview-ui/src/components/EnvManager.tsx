import { useCallback } from "react";
import { Plus, Trash2, Lock, Palette } from "lucide-react";
import { EnvironmentDefinition } from "./types";
import { useDialog } from "./DialogProvider";

interface EnvManagerProps {
  environments: EnvironmentDefinition[];
  onChange(environments: EnvironmentDefinition[]): void;
}

const glass = "bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10";

const randomId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36));

export function EnvManager({ environments, onChange }: EnvManagerProps) {
  const dialog = useDialog();
  const update = useCallback(
    (updater: (envs: EnvironmentDefinition[]) => EnvironmentDefinition[]) => {
      onChange(updater(environments));
    },
    [environments, onChange]
  );

  const addEnvironment = useCallback(async () => {
    const name = (await dialog.prompt({
      title: "New environment",
      placeholder: "Environment name",
      confirmLabel: "Create",
    }))?.trim();
    if (!name) return;
    update((envs) => [
      ...envs,
      {
        id: randomId(),
        name,
        variables: { baseUrl: "https://api.example.com" },
        color: randomGradient(),
      },
    ]);
  }, [dialog, update]);

  const updateEnvironment = (id: string, updater: (env: EnvironmentDefinition) => EnvironmentDefinition) => {
    update((envs) => envs.map((env) => (env.id === id ? updater(env) : env)));
  };

  const removeEnvironment = useCallback(
    async (id: string) => {
      const confirmed = await dialog.confirm({
        title: "Delete environment",
        description: "Variables and secrets stored for this environment will be removed.",
        tone: "danger",
        confirmLabel: "Delete",
      });
      if (!confirmed) return;
      update((envs) => envs.filter((env) => env.id !== id));
    },
    [dialog, update]
  );

  const setDefault = (id: string) => {
    update((envs) => envs.map((env) => ({ ...env, isDefault: env.id === id })));
  };

  return (
    <section className={`p-4 rounded-3xl space-y-4 ${glass}`}>
      <header className="flex items-center justify-between">
        <div className="uppercase text-xs tracking-[0.2em] text-slate-200">Environments</div>
        <button className="px-2 py-1 text-xs rounded-full bg-emerald-500/30 text-emerald-100" onClick={addEnvironment}>
          <Plus size={14} />
        </button>
      </header>
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {environments.map((env) => (
          <div key={env.id} className="rounded-2xl border border-white/10 p-3 space-y-3 bg-slate-900/40">
            <div className="flex items-center justify-between">
              <input
                className="bg-transparent text-sm font-semibold text-slate-100 w-full mr-2 focus:outline-none"
                value={env.name}
                onChange={(event) =>
                  updateEnvironment(env.id, (current) => ({ ...current, name: event.target.value, color: current.color }))
                }
              />
              <div className="flex items-center gap-2 text-xs">
                <button
                  className={`px-2 py-1 rounded-full ${env.isDefault ? "bg-emerald-500/40 text-emerald-100" : "bg-slate-800/60"}`}
                  onClick={() => setDefault(env.id)}
                >
                  <Lock size={12} />
                </button>
                <button
                  className="px-2 py-1 rounded-full bg-slate-800/60"
                  onClick={() =>
                    updateEnvironment(env.id, (current) => ({
                      ...current,
                      color: randomGradient(),
                    }))
                  }
                >
                  <Palette size={12} />
                </button>
                <button className="px-2 py-1 rounded-full bg-rose-500/30 text-rose-100" onClick={() => removeEnvironment(env.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(env.variables ?? {}).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <input
                    className="flex-1 rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1 text-slate-200"
                    value={key}
                    onChange={(event) =>
                      updateEnvironment(env.id, (current) => ({
                        ...current,
                        variables: renameKey(current.variables ?? {}, key, event.target.value),
                      }))
                    }
                    placeholder="Variable"
                  />
                  <input
                    className="flex-[2] rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1 text-slate-200"
                    value={value}
                    onChange={(event) =>
                      updateEnvironment(env.id, (current) => ({
                        ...current,
                        variables: { ...(current.variables ?? {}), [key]: event.target.value },
                      }))
                    }
                    placeholder="Value"
                  />
                  <button
                    className="px-2 py-1 rounded-lg bg-slate-800/60 text-xs"
                    onClick={() =>
                      updateEnvironment(env.id, (current) => {
                        const copy = { ...(current.variables ?? {}) };
                        delete copy[key];
                        return { ...current, variables: copy };
                      })
                    }
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="text-xs text-teal-200 hover:text-teal-100"
              onClick={() =>
                updateEnvironment(env.id, (current) => ({
                  ...current,
                  variables: { ...(current.variables ?? {}), [`VAR_${Object.keys(current.variables ?? {}).length + 1}`]: "" },
                }))
              }
            >
              + Add variable
            </button>
          </div>
        ))}
        {!environments.length && <p className="text-xs text-slate-500">Create environments to interpolate variables like {{baseUrl}}.</p>}
      </div>
    </section>
  );
}

const renameKey = (variables: Record<string, string>, from: string, to: string) => {
  if (!to) {
    const copy = { ...variables };
    delete copy[from];
    return copy;
  }
  const copy = { ...variables };
  delete copy[from];
  copy[to] = variables[from];
  return copy;
};

const randomGradient = () => {
  const palette = [
    "linear-gradient(120deg, rgba(56,189,248,0.4), rgba(14,165,233,0.3))",
    "linear-gradient(120deg, rgba(129,140,248,0.4), rgba(236,72,153,0.3))",
    "linear-gradient(120deg, rgba(45,212,191,0.4), rgba(20,184,166,0.3))",
  ];
  return palette[Math.floor(Math.random() * palette.length)];
};

import { useState } from "react";
import { Plus, ShieldCheck, RefreshCw, Trash2, LockKeyhole } from "lucide-react";
import { AuthCredentials, AuthType } from "./types";
import { useDialog } from "./DialogProvider";

interface AuthManagerProps {
  credentials: AuthCredentials[];
  onChange(auth: AuthCredentials[]): void;
  onAuthorize(id: string): void;
  onRefresh(id: string): void;
  secretsAvailable?: boolean;
}

const glass = "bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10";

const randomId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36));

export function AuthManager({ credentials, onChange, onAuthorize, onRefresh, secretsAvailable }: AuthManagerProps) {
  const [type, setType] = useState<AuthType>("none");
  const dialog = useDialog();

  const create = async () => {
    const name = (await dialog.prompt({
      title: "New credential",
      placeholder: "Credential name",
      confirmLabel: "Create",
    }))?.trim();
    if (!name) return;
    const id = randomId();
    const base: AuthCredentials = { id, name, type: "none" };
    let credential: AuthCredentials = base;
    switch (type) {
      case "basic":
        credential = { id, name, type: "basic", data: { username: "", password: "" } };
        break;
      case "bearer":
        credential = { id, name, type: "bearer", data: { token: "" } };
        break;
      case "apiKey":
        credential = { id, name, type: "apiKey", data: { key: "", placement: "header", target: "Authorization" } };
        break;
      case "oauth2":
        credential = {
          id,
          name,
          type: "oauth2",
          data: {
            authorizeUrl: "https://example.com/oauth/authorize",
            tokenUrl: "https://example.com/oauth/token",
            clientId: "",
            scopes: ["read"],
            usePKCE: true,
          },
        };
        break;
      default:
        break;
    }
    onChange([...credentials, credential]);
  };

  const updateCredential = (id: string, credential: AuthCredentials) => {
    onChange(credentials.map((item) => (item.id === id ? credential : item)));
  };

  const removeCredential = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: "Delete credential",
      description: "This credential will be removed for all environments.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!confirmed) return;
    onChange(credentials.filter((item) => item.id !== id));
  };

  return (
    <section className={`p-4 rounded-3xl space-y-4 ${glass}`}>
      <header className="flex items-center justify-between">
        <div className="uppercase text-xs tracking-[0.2em] text-slate-200">Auth</div>
        <div className="flex items-center gap-2 text-xs">
          <select
            className="bg-slate-900/60 border border-white/10 rounded-full px-2 py-1"
            value={type}
            onChange={(event) => setType(event.target.value as AuthType)}
          >
            <option value="none">None</option>
            <option value="basic">Basic</option>
            <option value="bearer">Bearer</option>
            <option value="apiKey">API Key</option>
            <option value="oauth2">OAuth2</option>
          </select>
          <button className="px-2 py-1 rounded-full bg-sky-500/30 text-sky-100" onClick={create}>
            <Plus size={14} />
          </button>
        </div>
      </header>
      {!secretsAvailable && (
        <p className="text-[11px] text-amber-300">
          Secret storage unavailable. Credentials are stored in workspace state.
        </p>
      )}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {credentials.map((credential) => (
          <div key={credential.id} className="rounded-2xl border border-white/10 p-3 space-y-3 bg-slate-900/40">
            <div className="flex items-center justify-between">
              <input
                className="bg-transparent text-sm font-semibold text-slate-100 w-full mr-2 focus:outline-none"
                value={credential.name}
                onChange={(event) => updateCredential(credential.id, { ...credential, name: event.target.value })}
              />
              <div className="flex items-center gap-2 text-xs">
                {credential.type === "oauth2" && (
                  <>
                    <button
                      className="px-2 py-1 rounded-full bg-emerald-500/40 text-emerald-100"
                      onClick={() => onAuthorize(credential.id)}
                    >
                      <ShieldCheck size={12} />
                    </button>
                    <button className="px-2 py-1 rounded-full bg-slate-800/60" onClick={() => onRefresh(credential.id)}>
                      <RefreshCw size={12} />
                    </button>
                  </>
                )}
                <button
                  className="px-2 py-1 rounded-full bg-rose-500/30 text-rose-100"
                  onClick={() => removeCredential(credential.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <CredentialFields credential={credential} onChange={(next) => updateCredential(credential.id, next)} />
          </div>
        ))}
        {!credentials.length && <p className="text-xs text-slate-500">Add authentication profiles for per-environment reuse.</p>}
      </div>
    </section>
  );
}

function CredentialFields({ credential, onChange }: { credential: AuthCredentials; onChange(credential: AuthCredentials): void }) {
  switch (credential.type) {
    case "basic":
      return (
        <div className="space-y-2 text-xs text-slate-300">
          <input
            className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1"
            placeholder="Username"
            value={credential.data.username}
            onChange={(event) =>
              onChange({ ...credential, data: { ...credential.data, username: event.target.value } })
            }
          />
          <input
            className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1"
            placeholder="Password"
            type="password"
            value={credential.data.password}
            onChange={(event) =>
              onChange({ ...credential, data: { ...credential.data, password: event.target.value } })
            }
          />
        </div>
      );
    case "bearer":
      return (
        <textarea
          className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1 text-xs text-slate-300"
          placeholder="Bearer token"
          rows={2}
          value={credential.data.token}
          onChange={(event) => onChange({ ...credential, data: { token: event.target.value } })}
        />
      );
    case "apiKey":
      return (
        <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">
          <input
            className="col-span-2 rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1"
            placeholder="API Key"
            value={credential.data.key}
            onChange={(event) => onChange({ ...credential, data: { ...credential.data, key: event.target.value } })}
          />
          <select
            className="rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1"
            value={credential.data.placement}
            onChange={(event) =>
              onChange({ ...credential, data: { ...credential.data, placement: event.target.value as "header" | "query" } })
            }
          >
            <option value="header">Header</option>
            <option value="query">Query</option>
          </select>
          <input
            className="col-span-3 rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1"
            placeholder="Target (e.g. Authorization or api_key)"
            value={credential.data.target}
            onChange={(event) => onChange({ ...credential, data: { ...credential.data, target: event.target.value } })}
          />
        </div>
      );
    case "oauth2":
      return (
        <div className="space-y-2 text-xs text-slate-300">
          <input
            className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1"
            placeholder="Authorize URL"
            value={credential.data.authorizeUrl}
            onChange={(event) => onChange({ ...credential, data: { ...credential.data, authorizeUrl: event.target.value } })}
          />
          <input
            className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1"
            placeholder="Token URL"
            value={credential.data.tokenUrl}
            onChange={(event) => onChange({ ...credential, data: { ...credential.data, tokenUrl: event.target.value } })}
          />
          <input
            className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1"
            placeholder="Client ID"
            value={credential.data.clientId}
            onChange={(event) => onChange({ ...credential, data: { ...credential.data, clientId: event.target.value } })}
          />
          <input
            className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1"
            placeholder="Client Secret"
            value={credential.data.clientSecret ?? ""}
            onChange={(event) => onChange({ ...credential, data: { ...credential.data, clientSecret: event.target.value } })}
          />
          <input
            className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1"
            placeholder="Redirect URI"
            value={credential.data.redirectUri ?? ""}
            onChange={(event) => onChange({ ...credential, data: { ...credential.data, redirectUri: event.target.value } })}
          />
          <textarea
            className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1"
            placeholder="Scopes (comma separated)"
            value={credential.data.scopes?.join(", ") ?? ""}
            onChange={(event) =>
              onChange({ ...credential, data: { ...credential.data, scopes: event.target.value.split(/[,\s]+/).filter(Boolean) } })
            }
          />
          {credential.token && (
            <div className="flex items-center gap-2 text-emerald-200">
              <LockKeyhole size={14} />
              <span>Token expires {credential.token.expiresAt ? new Date(credential.token.expiresAt).toLocaleString() : "soon"}</span>
            </div>
          )}
        </div>
      );
    default:
      return <p className="text-xs text-slate-500">No authentication will be applied.</p>;
  }
}

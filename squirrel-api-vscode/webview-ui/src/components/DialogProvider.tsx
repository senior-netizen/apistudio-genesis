import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export interface PromptOptions {
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  multiline?: boolean;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}

export interface AlertOptions {
  title: string;
  description?: string;
  acknowledgeLabel?: string;
  tone?: "default" | "danger";
}

type DialogState =
  | { id: string; type: "prompt"; options: PromptOptions }
  | { id: string; type: "confirm"; options: ConfirmOptions }
  | { id: string; type: "alert"; options: AlertOptions };

type Resolver = (value: unknown) => void;

interface DialogContextValue {
  prompt(options: PromptOptions): Promise<string | undefined>;
  confirm(options: ConfirmOptions): Promise<boolean>;
  alert(options: AlertOptions): Promise<void>;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolverRef = useRef<Resolver>();

  const close = useCallback((value: unknown) => {
    resolverRef.current?.(value);
    resolverRef.current = undefined;
    setDialog(null);
  }, []);

  const open = useCallback((state: DialogState) => {
    return new Promise<unknown>((resolve) => {
      resolverRef.current = resolve;
      setDialog(state);
    });
  }, []);

  const prompt = useCallback(
    async (options: PromptOptions) => {
      const result = await open({
        id: crypto.randomUUID?.() ?? Math.random().toString(36),
        type: "prompt",
        options,
      });
      if (typeof result === "string") {
        return result;
      }
      return undefined;
    },
    [open]
  );

  const confirm = useCallback(
    async (options: ConfirmOptions) => {
      const result = await open({
        id: crypto.randomUUID?.() ?? Math.random().toString(36),
        type: "confirm",
        options,
      });
      return Boolean(result);
    },
    [open]
  );

  const alert = useCallback(
    async (options: AlertOptions) => {
      await open({
        id: crypto.randomUUID?.() ?? Math.random().toString(36),
        type: "alert",
        options,
      });
    },
    [open]
  );

  const value = useMemo<DialogContextValue>(
    () => ({ prompt, confirm, alert }),
    [prompt, confirm, alert]
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      {createPortal(
        <AnimatePresence>
          {dialog && (
            <DialogRenderer key={dialog.id} dialog={dialog} onResolve={close} />
          )}
        </AnimatePresence>,
        document.body
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}

function DialogRenderer({ dialog, onResolve }: { dialog: DialogState; onResolve(value: unknown): void }) {
  const [value, setValue] = useState(
    dialog.type === "prompt" ? dialog.options.defaultValue ?? "" : ""
  );

  useEffect(() => {
    if (dialog.type === "prompt") {
      setValue(dialog.options.defaultValue ?? "");
    }
  }, [dialog]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dialog]);

  const tone =
    dialog.type === "confirm" || dialog.type === "alert"
      ? dialog.options.tone ?? "default"
      : "default";

  const primaryClass =
    tone === "danger"
      ? "bg-rose-500/90 hover:bg-rose-500 text-white"
      : "bg-teal-400/90 hover:bg-teal-300 text-slate-900";

  const handleSubmit = () => {
    if (dialog.type === "prompt") {
      onResolve(value);
    } else if (dialog.type === "confirm") {
      onResolve(true);
    } else {
      onResolve(undefined);
    }
  };

  function handleCancel() {
    if (dialog.type === "confirm") {
      onResolve(false);
    } else {
      onResolve(undefined);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleCancel}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.18 }}
        className="mx-4 w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/80 p-6 text-slate-100 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold tracking-tight">
          {dialog.options.title}
        </h2>
        {dialog.options.description && (
          <p className="mt-2 text-sm text-slate-400">{dialog.options.description}</p>
        )}
        {dialog.type === "prompt" && (
          dialog.options.multiline ? (
            <textarea
              className="mt-4 h-32 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400/60"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={dialog.options.placeholder}
              autoFocus
            />
          ) : (
            <input
              className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400/60"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={dialog.options.placeholder}
              autoFocus
            />
          )
        )}
        <div className="mt-6 flex items-center justify-end gap-3 text-sm">
          {dialog.type !== "alert" && (
            <button
              type="button"
              className="rounded-full border border-white/10 px-4 py-2 text-slate-300 transition hover:bg-white/10"
              onClick={handleCancel}
            >
              {dialog.type === "confirm"
                ? dialog.options.cancelLabel ?? "Cancel"
                : dialog.options.cancelLabel ?? "Cancel"}
            </button>
          )}
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${primaryClass}`}
            onClick={handleSubmit}
          >
            {dialog.type === "prompt"
              ? dialog.options.confirmLabel ?? "Save"
              : dialog.type === "confirm"
              ? dialog.options.confirmLabel ?? "Confirm"
              : dialog.options.acknowledgeLabel ?? "Got it"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

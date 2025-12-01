import { useState } from 'react';

interface PluginManagerModalProps {
  pluginId: string;
}

export default function PluginManagerModal({ pluginId }: PluginManagerModalProps) {
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  const toggleInstall = () => {
    setInstalled((state) => !state);
  };

  return (
    <div className="plugin-manager-modal">
      <button type="button" onClick={() => setOpen(true)}>
        Manage
      </button>
      {open && (
        <div className="plugin-manager-modal__dialog" role="dialog" aria-modal="true">
          <header>
            <h3>Manage Plugin</h3>
            <button type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </header>
          <p>Plugin: {pluginId}</p>
          <button type="button" onClick={toggleInstall}>
            {installed ? 'Uninstall' : 'Install'}
          </button>
        </div>
      )}
    </div>
  );
}

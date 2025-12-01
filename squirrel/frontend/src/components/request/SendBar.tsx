import { Button } from '@sdl/ui';
import { CopyPlus, MoreHorizontal, Play, Save, Star } from 'lucide-react';
import type { ApiRequest } from '../../types/api';
import { useAppStore } from '../../store';

interface SendBarProps {
  request: ApiRequest;
  onSend: () => void;
  onSave: () => void;
  onRevert: () => void;
  unsavedChanges: boolean;
  isSending: boolean;
}

export default function SendBar({ request, onSend, onSave, onRevert, unsavedChanges, isSending }: SendBarProps) {
  const duplicateRequest = useAppStore((state) => state.duplicateRequest);
  const saveExample = useAppStore((state) => state.saveExample);

  return (
    <div className="flex flex-col gap-4 text-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          variant="primary"
          onClick={onSend}
          disabled={isSending}
          className="h-12 min-w-[150px] justify-center gap-2 text-sm font-semibold shadow-soft"
        >
          <Play className="h-4 w-4" aria-hidden />
          Send (⌘⏎)
        </Button>
        <Button
          variant="subtle"
          onClick={onSave}
          disabled={!unsavedChanges}
          className="h-12 min-w-[140px] justify-center gap-2"
        >
          <Save className="h-4 w-4" aria-hidden />
          Save (⌘S)
        </Button>
        <Button
          variant="ghost"
          onClick={onRevert}
          disabled={!unsavedChanges}
          className="h-12 min-w-[140px] justify-center"
        >
          Revert changes
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => duplicateRequest(request.id as string)}
          title="Duplicate request"
          className="h-10 gap-2"
        >
          <CopyPlus className="h-4 w-4" aria-hidden /> Duplicate
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            saveExample(request.id as string, {
              name: `${request.name} example`,
              description: 'Saved from latest response'
            })
          }
          className="h-10 gap-2"
        >
          <Star className="h-4 w-4" aria-hidden /> Save as example
        </Button>
        <Button size="sm" variant="ghost" className="h-10 w-10 items-center justify-center">
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

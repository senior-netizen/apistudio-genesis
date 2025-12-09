import { Button } from '@sdl/ui';
import { CopyPlus, Loader2, MoreHorizontal, Play, Save, Star } from 'lucide-react';
import type { ApiRequest } from '../../types/api';
import { useAppStore } from '../../store';
import { Tooltip } from '../ui/Tooltip';

interface SendBarProps {
  request: ApiRequest;
  onSend: () => void;
  onSave: () => void;
  onRevert: () => void;
  unsavedChanges: boolean;
  isSending: boolean;
  readOnly?: boolean;
}

export default function SendBar({ request, onSend, onSave, onRevert, unsavedChanges, isSending, readOnly }: SendBarProps) {
  const duplicateRequest = useAppStore((state) => state.duplicateRequest);
  const saveExample = useAppStore((state) => state.saveExample);

  return (
    <div className="flex flex-col gap-4 text-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          variant="primary"
          onClick={onSend}
          disabled={isSending}
          className="h-12 min-w-[160px] justify-center gap-2 rounded-[12px] text-sm font-semibold shadow-soft"
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
          {isSending ? 'Sending…' : 'Send (⌘⏎)'}
        </Button>
        <Button
          variant="subtle"
          onClick={onSave}
          disabled={!unsavedChanges || readOnly}
          className="h-12 min-w-[140px] justify-center gap-2"
        >
          <Save className="h-4 w-4" aria-hidden />
          Save (⌘S)
        </Button>
        <Button
          variant="ghost"
          onClick={onRevert}
          disabled={!unsavedChanges || readOnly}
          className="h-12 min-w-[140px] justify-center"
        >
          Revert changes
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Tooltip content="Duplicate request">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => duplicateRequest(request.id as string)}
            className="h-10 gap-2 rounded-[10px]"
            disabled={readOnly}
          >
            <CopyPlus className="h-4 w-4" aria-hidden /> Duplicate
          </Button>
        </Tooltip>
        <Tooltip content="Capture response as reusable example">
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              saveExample(request.id as string, {
                name: `${request.name} example`,
                description: 'Saved from latest response'
              })
            }
            className="h-10 gap-2 rounded-[10px]"
            disabled={readOnly}
          >
            <Star className="h-4 w-4" aria-hidden /> Save as example
          </Button>
        </Tooltip>
        <Tooltip content="More request actions">
          <Button size="sm" variant="ghost" className="h-10 w-10 items-center justify-center rounded-[10px]">
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

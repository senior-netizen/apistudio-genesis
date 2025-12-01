import { useRef } from 'react';
import { useCollaboratorsForField, useElementWidth } from './useCollaborativeField';

export function CollaborativeCursors({ field }: { field: string }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(overlayRef);
  const collaborators = useCollaboratorsForField(field);

  if (!collaborators.length) {
    return null;
  }

  return (
    <div ref={overlayRef} className="pointer-events-none absolute inset-0">
      {collaborators.map((member) => {
        const cursor = member.cursor;
        if (!cursor || width === 0) {
          return null;
        }
        const ratio = cursor.valueLength > 0 ? cursor.position / cursor.valueLength : 0;
        const clampedRatio = Math.min(1, Math.max(0, ratio));
        const left = clampedRatio * width;
        return (
          <div
            key={member.socketId}
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{
              left,
              transition: 'left 0.18s cubic-bezier(0.22, 1, 0.36, 1), transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <div
              className="h-5 w-0.5 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
              style={{ backgroundColor: member.color, transition: 'opacity 0.18s ease, transform 0.18s ease' }}
            />
            <span
              className="mt-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-white shadow-lg"
              style={{ backgroundColor: member.color, transition: 'opacity 0.18s ease, transform 0.18s ease' }}
            >
              {member.displayName}
            </span>
          </div>
        );
      })}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useCollab } from './CollabProvider';
import type { CollaboratorState } from '@sdl/collab-client';

export function useCollaborativeField(
  field: string,
  ref: RefObject<HTMLInputElement | HTMLTextAreaElement>,
  enabled = true,
) {
  const { updateCursor } = useCollab();
  const timeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const element = ref.current;
    if (!element) {
      return;
    }
    const publish = () => {
      const position = element.selectionStart ?? 0;
      const selectionEnd = element.selectionEnd ?? position;
      const valueLength = element.value?.length ?? 0;
      updateCursor?.({
        field,
        position,
        valueLength,
        selection: selectionEnd !== position ? { start: position, end: selectionEnd } : null,
      });
    };
    const schedule = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        publish();
      }, 80);
    };
    const clear = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      updateCursor?.(null);
    };
    element.addEventListener('keyup', schedule);
    element.addEventListener('mouseup', schedule);
    element.addEventListener('input', schedule);
    element.addEventListener('select', schedule);
    element.addEventListener('blur', clear);
    publish();
    return () => {
      element.removeEventListener('keyup', schedule);
      element.removeEventListener('mouseup', schedule);
      element.removeEventListener('input', schedule);
      element.removeEventListener('select', schedule);
      element.removeEventListener('blur', clear);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      clear();
    };
  }, [enabled, field, ref, updateCursor]);
}

export function useCollaboratorsForField(field: string): CollaboratorState[] {
  const { members } = useCollab();
  return useMemo(
    () => members.filter((member) => member.cursor?.field === field),
    [field, members],
  );
}

export function useElementWidth(ref: RefObject<HTMLElement>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const update = () => {
      setWidth(element.getBoundingClientRect().width);
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
    };
  }, [ref]);
  return width;
}

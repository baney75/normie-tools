import { useCallback, useState } from "react";

export type SavedFlow<T> = { v: 1; step: number; value: T; at: string };

const keyFor = (flowId: string) => `nt:flow:${flowId}`;

export function readSaved<T = unknown>(flowId: string): SavedFlow<T> | null {
  try {
    const raw = window.localStorage.getItem(keyFor(flowId));
    if (raw === null) return null;
    const data = JSON.parse(raw) as Partial<SavedFlow<T>> | null;
    if (!data || typeof data !== "object" || data.v !== 1) return null;
    if (typeof data.step !== "number" || typeof data.at !== "string" || !("value" in data)) return null;
    return data as SavedFlow<T>;
  } catch {
    return null;
  }
}

export function writeSaved<T>(flowId: string, step: number, value: T): boolean {
  try {
    const entry: SavedFlow<T> = { v: 1, step, value, at: new Date().toISOString() };
    window.localStorage.setItem(keyFor(flowId), JSON.stringify(entry));
    return true;
  } catch {
    return false;
  }
}

export function clearSaved(flowId: string): void {
  try {
    window.localStorage.removeItem(keyFor(flowId));
  } catch {
    /* keep working in memory */
  }
}

export function useAutosave<T>(flowId: string, initial: T) {
  const [saved, setSaved] = useState<SavedFlow<T> | null>(() => readSaved<T>(flowId));
  const [value, setValueState] = useState<T>(initial);
  const [step, setStepState] = useState(0);
  const [savedAt, setSavedAt] = useState<string | undefined>(undefined);

  const setValue = useCallback(
    (next: T) => {
      setValueState(next);
      if (writeSaved(flowId, step, next)) setSavedAt(new Date().toISOString());
    },
    [flowId, step],
  );

  const setStep = useCallback(
    (next: number) => {
      setStepState(next);
      if (writeSaved(flowId, next, value)) setSavedAt(new Date().toISOString());
    },
    [flowId, value],
  );

  const restore = useCallback(() => {
    if (!saved) return;
    setValueState(saved.value);
    setStepState(saved.step);
    setSavedAt(saved.at);
    setSaved(null);
  }, [saved]);

  const clear = useCallback(() => {
    clearSaved(flowId);
    setSaved(null);
    setSavedAt(undefined);
  }, [flowId]);

  return { value, setValue, savedAt, step, setStep, hasSaved: saved !== null, saved, clear, restore };
}

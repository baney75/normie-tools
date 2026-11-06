import { useCallback, useRef, useState } from "react";

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
  // The latest value and step, so a setValue and a setStep in the same tap both save what the person sees.
  const latest = useRef({ value, step });

  const setValue = useCallback(
    (next: T) => {
      latest.current = { ...latest.current, value: next };
      setValueState(next);
      if (writeSaved(flowId, latest.current.step, next)) setSavedAt(new Date().toISOString());
    },
    [flowId],
  );

  const setStep = useCallback(
    (next: number) => {
      latest.current = { ...latest.current, step: next };
      setStepState(next);
      if (writeSaved(flowId, next, latest.current.value)) setSavedAt(new Date().toISOString());
    },
    [flowId],
  );

  const restore = useCallback(() => {
    if (!saved) return;
    latest.current = { value: saved.value, step: saved.step };
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

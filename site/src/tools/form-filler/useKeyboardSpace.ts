import { useEffect, type RefObject } from "react";

/**
 * Keeps the box you are typing in on screen when the phone keyboard opens or turns sideways.
 * Sets --nt-ff-vh on the page from visualViewport.height. The CSS turns that into room under the form.
 * Uses events only. No timers.
 */
export function useKeyboardSpace(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const vv = window.visualViewport;
    const root = ref.current;
    if (!vv || !root) return;
    const apply = () => {
      root.style.setProperty("--nt-ff-vh", `${vv.height}px`);
      const now = document.activeElement;
      if (now instanceof HTMLElement && root.contains(now) && isTypingBox(now)) {
        now.scrollIntoView?.({ block: "center" });
      }
    };
    apply();
    vv.addEventListener("resize", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      root.style.removeProperty("--nt-ff-vh");
    };
  }, [ref]);
}

/** True for boxes you type in or pick from. Round and square ticks are left out: moving the page on a tap would make the tap miss. */
function isTypingBox(el: HTMLElement) {
  if (!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return false;
  const type = (el as HTMLInputElement).type;
  return type !== "radio" && type !== "checkbox";
}

/** Call from onFocus on the form. Scrolls the focused box to the middle of what you can see. */
export function keepInView(target: EventTarget) {
  if (target instanceof HTMLElement && isTypingBox(target)) {
    target.scrollIntoView?.({ block: "center" });
  }
}

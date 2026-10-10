import { useSyncExternalStore } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
export type Theme = "system" | "light" | "dark";
const key = "engjatra.theme";
const event = "engjatra-theme";
function preference(): Theme {
  const value = document.documentElement.dataset.themePreference;
  return value === "light" || value === "dark" ? value : "system";
}
function subscribe(callback: () => void) {
  window.addEventListener(event, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(event, callback);
    window.removeEventListener("storage", callback);
  };
}
export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const value = useSyncExternalStore(
    subscribe,
    preference,
    () => "system" as Theme,
  );
  return (
    <div
      className={`theme-picker ${compact ? "compact" : ""}`}
      role="group"
      aria-label="রঙের ধরন"
    >
      {(
        [
          ["light", "হালকা", Sun],
          ["dark", "গাঢ়", Moon],
          ["system", "ডিভাইস অনুযায়ী", Monitor],
        ] as const
      ).map(([id, label, Icon]) => (
        <button
          type="button"
          key={id}
          aria-label={label}
          title={label}
          aria-pressed={value === id}
          onClick={() => {
            try {
              localStorage.setItem(key, id);
            } catch {
              /* Theme still applies for this page. */
            }
            document.documentElement.dataset.themePreference = id;
            document.documentElement.dataset.theme =
              id === "system"
                ? matchMedia("(prefers-color-scheme: dark)").matches
                  ? "dark"
                  : "light"
                : id;
            window.dispatchEvent(new CustomEvent(event, { detail: id }));
          }}
        >
          <Icon size={17} aria-hidden="true" />
          {!compact && <span>{label}</span>}
        </button>
      ))}
    </div>
  );
}

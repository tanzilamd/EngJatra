import { useEffect, useState } from "react";
import { Download, RefreshCw, WifiOff } from "lucide-react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
let offer: InstallEvent | null = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  offer = event as InstallEvent;
  window.dispatchEvent(new Event("engjatra-install-ready"));
});
const dismissedKey = "engjatra.install.dismissed";
function dismissed() {
  try {
    return (
      Date.now() - Number(localStorage.getItem(dismissedKey) || 0) <
      14 * 86400000
    );
  } catch {
    return false;
  }
}
function standalone() {
  return (
    matchMedia("(display-mode: standalone)").matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone
  );
}
export function PwaExperience({
  engaged,
  allowUpdate = true,
}: {
  engaged: boolean;
  allowUpdate?: boolean;
}) {
  const [install, setInstall] = useState<InstallEvent | null>(() => offer);
  const [hidden, setHidden] = useState(() => dismissed() || standalone());
  const [offline, setOffline] = useState(!navigator.onLine);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [instructions, setInstructions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  useEffect(() => {
    const ready = () => setInstall(offer);
    const installed = () => {
      offer = null;
      setInstall(null);
      setHidden(true);
    };
    const network = () => setOffline(!navigator.onLine);
    window.addEventListener("engjatra-install-ready", ready);
    window.addEventListener("appinstalled", installed);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    let registration: ServiceWorkerRegistration | undefined;
    let alive = true;
    const changed = () => {
      const worker = registration?.installing;
      worker?.addEventListener("statechange", () => {
        if (
          alive &&
          worker.state === "installed" &&
          navigator.serviceWorker.controller
        )
          setWaiting(registration?.waiting ?? null);
      });
    };
    const bind = () => {
      if ("serviceWorker" in navigator)
        navigator.serviceWorker
          .getRegistration()
          .then((r) => {
            if (!alive) return;
            registration = r;
            if (r?.waiting) setWaiting(r.waiting);
            r?.addEventListener("updatefound", changed);
          })
          .catch(() => undefined);
    };
    bind();
    window.addEventListener("engjatra-worker-ready", bind);
    return () => {
      alive = false;
      window.removeEventListener("engjatra-worker-ready", bind);
      window.removeEventListener("engjatra-install-ready", ready);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      registration?.removeEventListener("updatefound", changed);
    };
  }, []);
  return (
    <>
      {offline && (
        <div className="notice network-status" role="status">
          <WifiOff size={16} />
          <span>
            এখন অফলাইন। গত ২৪ ঘণ্টায় খোলা ও এই ডিভাইসে সংরক্ষিত পাঠ পড়তে পারবে।
            পাঠের সর্বশেষ পরিবর্তন দেখতে সংযোগ দরকার। AI ও অ্যাকাউন্টের কাজে
            ইন্টারনেট লাগবে।
          </span>
        </div>
      )}
      {waiting && (
        <div className="pwa-surface" role="status">
          <div>
            <h2>নতুন সংস্করণ প্রস্তুত</h2>
            <p>
              {allowUpdate
                ? "সুবিধামতো আপডেট করো। এই ডিভাইসে রাখা অগ্রগতি মুছে যাবে না।"
                : "পাঠ থেকে হোমে ফিরে আপডেট করো। এতে চলতি অনুশীলন মাঝপথে বন্ধ হবে না।"}
            </p>
          </div>
          <button
            disabled={!allowUpdate}
            onClick={() => {
              navigator.serviceWorker.addEventListener(
                "controllerchange",
                () => location.reload(),
                { once: true },
              );
              waiting.postMessage({ type: "ACTIVATE_UPDATE" });
              setWaiting(null);
            }}
          >
            <RefreshCw size={17} /> আপডেট করো
          </button>
        </div>
      )}
      {engaged && !hidden && !standalone() && (install || ios) && (
        <section className="pwa-surface" aria-label="অ্যাপ ইনস্টল">
          <div className="row">
            <img
              className="pwa-icon"
              src="/brand/logo-mark.svg"
              alt=""
              width="44"
              height="44"
            />
            <div>
              <h2>শেখার জায়গা, আরও হাতের কাছে</h2>
              <p>হোম স্ক্রিনে EngJatra রাখো। পরেরবার এক ট্যাপেই শুরু।</p>
            </div>
          </div>
          <div className="row">
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                if (!install) {
                  setInstructions(true);
                  return;
                }
                setBusy(true);
                setError("");
                try {
                  await install.prompt();
                  const result = await install.userChoice;
                  offer = null;
                  setInstall(null);
                  if (result.outcome === "accepted") setHidden(true);
                  else {
                    try {
                      localStorage.setItem(dismissedKey, String(Date.now()));
                    } catch {
                      /* Optional preference. */
                    }
                    setHidden(true);
                  }
                } catch {
                  setError(
                    "ইনস্টল করা যায়নি। ব্রাউজারের মেনু থেকে চেষ্টা করো।",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Download size={17} />
              {ios && !install ? "কীভাবে রাখব?" : "অ্যাপ ইনস্টল"}
            </button>
            <button
              className="quiet"
              onClick={() => {
                try {
                  localStorage.setItem(dismissedKey, String(Date.now()));
                } catch {
                  /* Optional preference. */
                }
                setHidden(true);
              }}
            >
              পরে করব
            </button>
          </div>
          {instructions && (
            <p>
              iPhone বা iPad-এ Safari দিয়ে সাইটটি খোলো। শেয়ার বোতাম চাপো, তারপর
              “Add to Home Screen” বেছে নিয়ে “Add” চাপো। ব্রাউজার বা ডিভাইস
              অনুযায়ী মেনুর অবস্থান আলাদা হতে পারে।
            </p>
          )}
          {error && <p role="alert">{error}</p>}
        </section>
      )}
    </>
  );
}

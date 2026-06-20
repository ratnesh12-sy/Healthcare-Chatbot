"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, BellRing, CheckCircle2, Clock } from "lucide-react";
import { ReminderService, Reminder } from "@/lib/reminderService";
import { PushService } from "@/lib/push";

/**
 * In-app notification bell. Polls the backend for reminders that are due now
 * and lets the user mark them done. Polling pauses while the tab is hidden,
 * and refreshes whenever reminders change elsewhere ("remindersUpdated").
 */
export default function NotificationBell() {
  const [due, setDue] = useState<Reminder[]>([]);
  const [open, setOpen] = useState(false);
  const [pushState, setPushState] = useState<"loading" | "on" | "off" | "unsupported" | "denied">("loading");
  const ref = useRef<HTMLDivElement>(null);

  const refreshPushState = useCallback(async () => {
    if (!PushService.isSupported()) return setPushState("unsupported");
    const perm = PushService.permission();
    if (perm === "denied") return setPushState("denied");
    const sub = await PushService.currentSubscription();
    setPushState(sub ? "on" : "off");
  }, []);

  const enablePush = async () => {
    const res = await PushService.subscribe();
    if (res.ok) setPushState("on");
    else if (res.reason === "denied") setPushState("denied");
    else if (res.reason === "unsupported") setPushState("unsupported");
  };

  const snooze = async (id: string) => {
    setDue((prev) => prev.filter((r) => r.id !== id));
    try {
      await ReminderService.snooze(id, 30);
    } catch {
      load();
    }
  };

  const load = useCallback(async () => {
    try {
      setDue(await ReminderService.getDue());
    } catch {
      // Silent: the bell simply shows nothing if the request fails.
    }
  }, []);

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener("remindersUpdated", onUpdate);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60000);
    return () => {
      window.removeEventListener("remindersUpdated", onUpdate);
      clearInterval(interval);
    };
  }, [load]);

  // Reflect current push subscription/permission state.
  useEffect(() => {
    refreshPushState();
  }, [refreshPushState]);

  // Close dropdown on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const dismiss = async (id: string) => {
    setDue((prev) => prev.filter((r) => r.id !== id));
    try {
      await ReminderService.toggle(id);
    } catch {
      load();
    }
  };

  const count = due.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-muted hover:text-primary transition-colors"
        aria-label={count > 0 ? `${count} notifications` : "Notifications"}
      >
        <Bell className="w-6 h-6" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-line z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-secondary text-sm">Notifications</h3>
            </div>
            {pushState === "off" && (
              <button
                onClick={enablePush}
                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-[#5040c0] bg-primary-soft hover:bg-primary-soft px-2 py-1 rounded-lg transition-colors"
              >
                <BellRing className="w-3 h-3" /> Enable alerts
              </button>
            )}
            {pushState === "on" && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600">
                <BellRing className="w-3 h-3" /> Alerts on
              </span>
            )}
            {pushState === "denied" && (
              <span className="text-[11px] font-semibold text-muted" title="Allow notifications in your browser settings">
                Alerts blocked
              </span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {count === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted">
                You&apos;re all caught up 🎉
              </div>
            ) : (
              due.map((r) => (
                <div
                  key={r.id}
                  className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                >
                  <div className="mt-0.5 p-1.5 bg-primary-soft text-primary rounded-lg flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="flex-1 text-sm text-slate-700 font-medium">{r.text}</p>
                  <button
                    onClick={() => snooze(r.id)}
                    className="text-slate-300 hover:text-amber-500 flex-shrink-0 transition-colors"
                    aria-label="Snooze 30 minutes"
                    title="Snooze 30 min"
                  >
                    <Clock className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => dismiss(r.id)}
                    className="text-slate-300 hover:text-green-500 flex-shrink-0 transition-colors"
                    aria-label="Mark done"
                    title="Mark done"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

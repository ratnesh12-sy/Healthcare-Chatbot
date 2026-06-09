import api from "@/lib/api";

export type Reminder = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  isCompleted: boolean;
  source?: "ai" | "manual";
  type?: "one-time" | "recurring";
  // Scheduling / notification fields (optional — present on scheduled reminders)
  category?: string;
  status?: string;
  remindAt?: string | null;
  everyMinutes?: number | null;
  repeatUntil?: string | null;
  appointmentId?: string | null;
};

export type ParsedSchedule = {
  hasSchedule: boolean;
  everyMinutes?: number | null;
  durationDays?: number | null;
  category?: string;
  summary?: string;
  source?: "ai" | "heuristic" | "none";
};

export type NewReminder = {
  text: string;
  source?: "ai" | "manual";
  category?: string;
  remindAt?: string | null;
  everyMinutes?: number | null;
  repeatUntil?: string | null;
};

const LEGACY_KEY = "health_reminders_v1";
const MIGRATED_FLAG = "health_reminders_migrated_v1";

const emitUpdateEvent = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("remindersUpdated"));
  }
};

/** Normalises an axios/network error into an Error whose message matches the
 *  backend message (so existing UI checks like "Reminder already exists" work). */
const toError = (e: any): Error => {
  const msg = e?.response?.data?.message || e?.message || "Something went wrong";
  return new Error(msg);
};

/**
 * One-time best-effort migration of reminders previously kept in localStorage
 * into the backend, so users don't lose what they already saved. Runs at most
 * once per browser (guarded by a flag), and is safe to call repeatedly.
 */
let migrationPromise: Promise<void> | null = null;
const migrateLegacyReminders = async (): Promise<void> => {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATED_FLAG)) return;
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const r of parsed) {
            if (!r?.text) continue;
            try {
              const res = await api.post("/v1/reminders", {
                text: r.text,
                source: r.source === "ai" ? "ai" : "manual",
              });
              // Preserve completion state if it was ticked off.
              if (r.isCompleted && res?.data?.id) {
                await api.patch(`/v1/reminders/${res.data.id}/toggle`);
              }
            } catch {
              // Skip duplicates / limit hits; keep migrating the rest.
            }
          }
        }
      }
      localStorage.setItem(MIGRATED_FLAG, "1");
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // Leave the flag unset so we retry on the next load.
    } finally {
      migrationPromise = null;
    }
  })();

  return migrationPromise;
};

export const ReminderService = {
  getAll: async (): Promise<Reminder[]> => {
    await migrateLegacyReminders();
    try {
      const { data } = await api.get<Reminder[]>("/v1/reminders");
      return Array.isArray(data) ? data : [];
    } catch (e) {
      throw toError(e);
    }
  },

  /** Reminders that are due now — drives the in-app notification bell. */
  getDue: async (): Promise<Reminder[]> => {
    try {
      const { data } = await api.get<Reminder[]>("/v1/reminders/due");
      return Array.isArray(data) ? data : [];
    } catch (e) {
      throw toError(e);
    }
  },

  // `type` is kept in the signature for backward compatibility; the backend
  // derives one-time vs recurring from the schedule fields.
  add: async (
    text: string,
    source: "ai" | "manual" = "manual",
    _type: "one-time" | "recurring" = "one-time"
  ): Promise<void> => {
    try {
      await api.post("/v1/reminders", { text: text.trim(), source });
      emitUpdateEvent();
    } catch (e) {
      throw toError(e);
    }
  },

  /** Creates a reminder with full options (used by the AI schedule-confirm flow). */
  create: async (payload: NewReminder): Promise<void> => {
    try {
      await api.post("/v1/reminders", { ...payload, text: payload.text.trim() });
      emitUpdateEvent();
    } catch (e) {
      throw toError(e);
    }
  },

  /** Asks the backend to parse advice text into a suggested schedule. */
  parseAdvice: async (text: string): Promise<ParsedSchedule> => {
    try {
      const { data } = await api.post<ParsedSchedule>("/v1/reminders/parse-advice", { text });
      return data || { hasSchedule: false };
    } catch {
      return { hasSchedule: false };
    }
  },

  /** Logs medication adherence and marks the reminder done. */
  markTaken: async (id: string): Promise<void> => {
    try {
      await api.patch(`/v1/reminders/${id}/taken`);
      emitUpdateEvent();
    } catch (e) {
      throw toError(e);
    }
  },

  toggle: async (id: string): Promise<void> => {
    try {
      await api.patch(`/v1/reminders/${id}/toggle`);
      emitUpdateEvent();
    } catch (e) {
      throw toError(e);
    }
  },

  snooze: async (id: string, minutes = 30): Promise<void> => {
    try {
      await api.patch(`/v1/reminders/${id}/snooze?minutes=${minutes}`);
      emitUpdateEvent();
    } catch (e) {
      throw toError(e);
    }
  },

  update: async (id: string, text: string): Promise<void> => {
    try {
      await api.put(`/v1/reminders/${id}`, { text: text.trim() });
      emitUpdateEvent();
    } catch (e) {
      throw toError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/v1/reminders/${id}`);
      emitUpdateEvent();
    } catch (e) {
      throw toError(e);
    }
  },
};

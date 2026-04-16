export type Reminder = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  isCompleted: boolean;
  source?: "ai" | "manual";
  type?: "one-time" | "recurring";
};

const STORAGE_KEY = "health_reminders_v1";
const MAX_REMINDERS = 50;
const MAX_LENGTH = 120;

const emitUpdateEvent = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("remindersUpdated"));
  }
};

const normalize = (text: string) => text.trim();

export const ReminderService = {
  getAll: async (): Promise<Reminder[]> => {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      
      return parsed as Reminder[];
    } catch (error) {
      console.error("Failed to parse reminders from storage", error);
      return []; // Fallback gracefully if corrupted
    }
  },

  add: async (text: string, source: "ai" | "manual" = "manual", type: "one-time" | "recurring" = "one-time"): Promise<void> => {
    if (typeof window === "undefined") throw new Error("Storage unavailable");
    
    const normalizedText = normalize(text);
    if (!normalizedText) throw new Error("Reminder text cannot be empty");
    if (normalizedText.length > MAX_LENGTH) throw new Error(`Exceeded maximum length of ${MAX_LENGTH} characters`);

    try {
      const reminders = await ReminderService.getAll();
      
      if (reminders.length >= MAX_REMINDERS) {
        throw new Error("Storage limit reached");
      }

      const duplicateExists = reminders.some(r => normalize(r.text).toLowerCase() === normalizedText.toLowerCase());
      if (duplicateExists) {
        throw new Error("Reminder already exists");
      }

      const now = new Date().toISOString();
      const newReminder: Reminder = {
        id: crypto.randomUUID(),
        text: normalizedText,
        createdAt: now,
        updatedAt: now,
        isCompleted: false,
        source,
        type,
      };

      reminders.push(newReminder);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
      emitUpdateEvent();
    } catch (e: any) {
      // Re-throw known validation errors safely
      if (e.message) throw e;
      throw new Error("Storage unavailable");
    }
  },

  toggle: async (id: string): Promise<void> => {
    if (typeof window === "undefined") throw new Error("Storage unavailable");
    
    try {
      const reminders = await ReminderService.getAll();
      const index = reminders.findIndex(r => r.id === id);
      if (index === -1) return;

      reminders[index].isCompleted = !reminders[index].isCompleted;
      reminders[index].updatedAt = new Date().toISOString();

      localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
      emitUpdateEvent();
    } catch (e) {
      throw new Error("Storage unavailable");
    }
  },

  update: async (id: string, text: string): Promise<void> => {
     if (typeof window === "undefined") throw new Error("Storage unavailable");
     const normalizedText = normalize(text);
     if (!normalizedText) throw new Error("Reminder text cannot be empty");

     try {
       const reminders = await ReminderService.getAll();
       const index = reminders.findIndex(r => r.id === id);
       if (index === -1) return;

       reminders[index].text = normalizedText;
       reminders[index].updatedAt = new Date().toISOString();
       
       localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
       emitUpdateEvent();
     } catch (e) {
       throw new Error("Storage unavailable");
     }
  },

  delete: async (id: string): Promise<void> => {
    if (typeof window === "undefined") throw new Error("Storage unavailable");
    try {
      const reminders = await ReminderService.getAll();
      const filtered = reminders.filter(r => r.id !== id);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      emitUpdateEvent();
    } catch (e) {
      throw new Error("Storage unavailable");
    }
  }
};

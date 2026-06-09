import api from "@/lib/api";

export type HealthMetric = {
  id: number;
  type: string; // HEART_RATE | BLOOD_PRESSURE | CALORIES | SLEEP_HOURS | MEDICATION_TAKEN
  value: string;
  recordedAt: string;
};

export type Adherence = {
  takenToday: number;
  takenLast7Days: number;
  streakDays: number;
  lastTakenAt: string | null;
  recent: HealthMetric[];
};

export const METRIC_LABELS: Record<string, string> = {
  HEART_RATE: "Heart Rate",
  BLOOD_PRESSURE: "Blood Pressure",
  CALORIES: "Calories",
  SLEEP_HOURS: "Sleep",
  MEDICATION_TAKEN: "Medication",
};

export const METRIC_UNITS: Record<string, string> = {
  HEART_RATE: "bpm",
  BLOOD_PRESSURE: "",
  CALORIES: "kcal",
  SLEEP_HOURS: "hrs",
};

export const HealthMetricService = {
  getLatest: async (): Promise<HealthMetric[]> => {
    const { data } = await api.get<HealthMetric[]>("/v1/metrics/latest");
    return Array.isArray(data) ? data : [];
  },

  getHistory: async (type?: string): Promise<HealthMetric[]> => {
    const { data } = await api.get<HealthMetric[]>("/v1/metrics", {
      params: type ? { type } : undefined,
    });
    return Array.isArray(data) ? data : [];
  },

  add: async (type: string, value: string): Promise<void> => {
    await api.post("/v1/metrics", { type, value: value.trim() });
  },

  getAdherence: async (): Promise<Adherence> => {
    const { data } = await api.get<Adherence>("/v1/metrics/adherence");
    return data;
  },
};

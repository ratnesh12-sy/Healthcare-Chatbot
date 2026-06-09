import api from "@/lib/api";

/** Converts a base64url VAPID key to the Uint8Array the Push API expects. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export type SubscribeResult = { ok: boolean; reason?: "unsupported" | "disabled" | "denied" | "error" };

export const PushService = {
  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  },

  permission(): NotificationPermission | "unsupported" {
    if (!PushService.isSupported()) return "unsupported";
    return Notification.permission;
  },

  async currentSubscription(): Promise<PushSubscription | null> {
    if (!PushService.isSupported()) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return null;
    return reg.pushManager.getSubscription();
  },

  /** Registers the SW, asks permission, subscribes, and saves the subscription server-side. */
  async subscribe(): Promise<SubscribeResult> {
    if (!PushService.isSupported()) return { ok: false, reason: "unsupported" };
    try {
      const { data } = await api.get("/v1/push/public-key");
      if (!data?.enabled || !data?.publicKey) return { ok: false, reason: "disabled" };

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return { ok: false, reason: "denied" };

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
        });
      }
      await api.post("/v1/push/subscribe", sub.toJSON());
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: "error" };
    }
  },

  async unsubscribe(): Promise<void> {
    const sub = await PushService.currentSubscription();
    if (sub) {
      try {
        await api.delete("/v1/push/unsubscribe", { data: { endpoint: sub.endpoint } });
      } catch {
        /* ignore */
      }
      await sub.unsubscribe();
    }
  },
};

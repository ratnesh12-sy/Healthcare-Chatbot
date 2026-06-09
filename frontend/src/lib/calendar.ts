import api from "@/lib/api";

/**
 * Downloads an appointment's .ics calendar file (with built-in alarms) so the
 * user's own calendar app handles the reminders. Fetched via the authenticated
 * axios client so cookies are always sent, then saved as a blob download.
 */
export async function downloadAppointmentIcs(appointmentId: string | number): Promise<void> {
  const res = await api.get(`/appointments/${appointmentId}/calendar.ics`, {
    responseType: "blob",
  });
  const blob = new Blob([res.data], { type: "text/calendar" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `appointment-${appointmentId}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Notifies the standalone Socket.IO server (see server/socket-server.ts).
 * On Vercel, deploy the socket service separately and set SOCKET_SERVER_URL + REALTIME_EMIT_SECRET.
 */
export async function emitRealtime(
  event: string,
  rooms: string[],
  payload: Record<string, unknown> = {}
) {
  const base = process.env.SOCKET_SERVER_URL?.replace(/\/$/, "");
  const secret = process.env.REALTIME_EMIT_SECRET;
  if (!base || !secret || rooms.length === 0) {
    return;
  }
  try {
    await fetch(`${base}/internal/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ event, rooms, payload }),
    });
  } catch (e) {
    console.error("emitRealtime failed", e);
  }
}

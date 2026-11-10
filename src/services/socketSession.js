const disposers = new WeakMap();
// Reconnect every namespace with the current credential; never keep a previous user's rooms.
export function bindSocketSession(client, getToken) {
  let token = getToken(),
    stopped = false;
  const changed = () => {
    if (stopped) return;
    const next = getToken();
    if (next === token) return;
    token = next;
    client.disconnect();
    if (token && !stopped) client.connect();
  };
  window.addEventListener("auth:changed", changed);
  window.addEventListener("storage", changed);
  disposers.set(client, () => {
    stopped = true;
    window.removeEventListener("auth:changed", changed);
    window.removeEventListener("storage", changed);
  });
  if (token) client.connect();
  return client;
}
export function disposeRealtimeSocket(client) {
  disposers.get(client)?.();
  disposers.delete(client);
  client.removeAllListeners?.();
  client.disconnect();
}

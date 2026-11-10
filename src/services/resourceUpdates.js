// Resource notifications carry names only. All record data is reloaded through scoped HTTP APIs.
export const PORTAL_RESOURCES = [
  "portal",
  "workspace",
  "branch",
  "room",
  "class",
  "class-staff",
  "class-room",
  "class-weekly-schedule",
  "course",
  "enrollment",
  "schedule",
  "attendance-record",
  "homework",
  "homework-submission",
  "score",
  "notification",
  "document",
  "class-document",
  "student-certificate",
  "student",
  "staff",
  "user-account",
  "finance-transaction",
  "payment",
  "debt-schedule",
  "lesson-library",
  "system-settings",
];
const dependencies = {
  workspace: ["schedule", "attendance-record", "notification"],
  portal: [
    "schedule",
    "homework",
    "homework-submission",
    "score",
    "notification",
    "student-certificate",
  ],
  "system-settings": ["branch", "staff", "user-account"],
};
export function affectsResources(change, allowed) {
  if (!change || !Array.isArray(change.resources)) return false;
  return (
    change.resync === true ||
    !allowed.length ||
    change.resources.some(
      (resource) =>
        allowed.includes(resource) ||
        dependencies[resource]?.some((item) => allowed.includes(item)),
    )
  );
}
export function startUpdates({
  client,
  target,
  document,
  eventName,
  onStatus = () => {},
  canConnect = () => true,
}) {
  let active = true,
    watching = false,
    live = false,
    generation = 0;
  let flushTimer, retryTimer;
  const pending = new Set();
  const status = (value) => {
    if (active) onStatus(value);
  };
  const schedule = (resource) => {
    if (!active) return;
    pending.add(resource);
    if (flushTimer !== undefined) return;
    flushTimer = setTimeout(() => {
      flushTimer = undefined;
      if (!active) return;
      const resources = [...pending];
      pending.clear();
      target.dispatchEvent(
        new CustomEvent(eventName, {
          detail: { resources, resync: resources.includes("*") },
        }),
      );
    }, 200);
  };
  const reset = () => {
    generation++;
    watching = false;
    live = false;
    clearTimeout(retryTimer);
  };
  const watch = () => {
    if (!active || !client.connected) return;
    clearTimeout(retryTimer);
    const attempt = ++generation;
    client.timeout(5000).emit("updates:watch", {}, (error, response) => {
      if (!active || !client.connected || attempt !== generation) return;
      const result = response?.data ?? response;
      watching = !error && result?.ok === true;
      live = watching && result.ready === true;
      status(live ? "live" : "fallback");
      if (watching) schedule("*");
      else retryTimer = setTimeout(watch, 3000);
    });
  };
  const handlers = {
    connect: () => {
      reset();
      status("connecting");
      watch();
    },
    "resources:changed": (event) => {
      if (watching && /^[a-z][a-z-]{0,63}$/.test(event?.resource || ""))
        schedule(event.resource);
    },
    "updates:status": (event) => {
      const wasLive = live;
      live = watching && event?.ready === true;
      status(live ? "live" : "fallback");
      if (live && !wasLive) schedule("*");
    },
    disconnect: () => {
      reset();
      status("fallback");
    },
    connect_error: () => {
      reset();
      status("fallback");
    },
  };
  for (const [name, handler] of Object.entries(handlers))
    client.on(name, handler);
  const onFocus = () => {
    if (!active || document.hidden || !canConnect()) return;
    schedule("*");
    if (!client.connected) client.connect();
    else if (!watching) watch();
  };
  const fallback = setInterval(() => {
    if (!live && !document.hidden) onFocus();
  }, 30000);
  target.addEventListener("focus", onFocus);
  target.addEventListener("online", onFocus);
  document.addEventListener("visibilitychange", onFocus);
  status("connecting");
  if (client.connected) watch();
  return () => {
    active = false;
    reset();
    pending.clear();
    clearTimeout(flushTimer);
    clearInterval(fallback);
    target.removeEventListener("focus", onFocus);
    target.removeEventListener("online", onFocus);
    document.removeEventListener("visibilitychange", onFocus);
    for (const [name, handler] of Object.entries(handlers))
      client.off(name, handler);
  };
}

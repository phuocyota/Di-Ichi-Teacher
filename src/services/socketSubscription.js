// One acknowledged subscription per connection. Late acknowledgements cannot
// restore a room from a previous transport, plan, or permission state.
export function subscribeSocket(
  client,
  {
    event,
    payload,
    accept,
    onReady,
    onUnavailable,
    onRejected = () => {},
    statusEvent,
    isReady = (result) => result.realtimeReady !== false,
  },
) {
  let active = true,
    generation = 0,
    retryTimer;
  const reset = () => {
    generation++;
    clearTimeout(retryTimer);
    onUnavailable();
  };
  const retry = () => {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (active && client.connected) watch();
    }, 3000);
  };
  const watch = () => {
    if (!active) return;
    reset();
    const attempt = generation;
    client.timeout(5000).emit(event, payload, (error, response) => {
      if (!active || attempt !== generation) return;
      const result = response?.data ?? response;
      if (error) {
        retry();
        return;
      }
      if (!accept(result)) {
        onRejected(result);
        return;
      }
      if (isReady(result)) onReady(result);
      else retry();
    });
  };
  const handlers = {
    connect: watch,
    disconnect: reset,
    connect_error: reset,
    exception: () => {
      reset();
      retry();
    },
  };
  if (statusEvent)
    handlers[statusEvent] = (value) => {
      if (!active) return;
      if (value?.ready && client.connected) watch();
      else reset();
    };
  for (const [name, handler] of Object.entries(handlers))
    client.on(name, handler);
  if (client.connected) watch();
  return () => {
    active = false;
    generation++;
    clearTimeout(retryTimer);
    for (const [name, handler] of Object.entries(handlers))
      client.off?.(name, handler);
  };
}

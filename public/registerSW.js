if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      if (reg.active && reg.active.scriptURL && reg.active.scriptURL.endsWith('/sw.js')) {
        reg.unregister();
      }
    }
  }).catch(() => {});
}

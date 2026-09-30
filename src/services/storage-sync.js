export function installStorageSync({ store, router, target = window, storage = localStorage }) {
  store.restoreApplication()
  const onStorage = event => {
    if (event.storageArea && event.storageArea !== storage) return
    if (event.key === 'PowerJwt' || event.key === null) {
      store.resetSessionView()
      // Re-run the existing Server session check and discard the previous tab's views.
      Promise.resolve(router.replace('/loginHomepage')).catch(() => {})
    } else if (event.key === 'Power_appId' || event.key === 'Power_appName') {
      store.restoreApplication()
      if (!store.appInfo.id && router.currentRoute.value.path.startsWith('/oms')) {
        Promise.resolve(router.replace('/admin/app')).catch(() => {})
      }
    }
  }
  target.addEventListener('storage', onStorage)
  return () => target.removeEventListener('storage', onStorage)
}

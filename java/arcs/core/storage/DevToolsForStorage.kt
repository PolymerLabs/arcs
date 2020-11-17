package arcs.core.storage

/**
 * DevTools API exposed to the Storage Stack.
 */
interface DevToolsForStorage {

  /**
   * Exposes the DevTools API suitable for an instances of a [DirectStore].
   */
  fun forDirectStore(options: StoreOptions): DevToolsForDirectStore

  /**
   * Exposes the DevTools API suitable for an instances of a [ReferenceModeStore].
   */
  fun forRefModeStore(options: StoreOptions): DevToolsForRefModeStore
}

/**
 * DevTools API exposed to [DirectStore] instances.
 */
interface DevToolsForDirectStore : DevToolsForStorage {
  /**
   * Function to call when a [DirectStore] receives a [ProxyMessage].
   */
  fun onDirectStoreProxyMessage(proxyMessage: UntypedProxyMessage)
}

/**
 * DevTools API exposed to [ReferenceModeStore] instances.
 */
interface DevToolsForRefModeStore : DevToolsForStorage {
  /**
   * Function to call when a [ReferenceModeStore] receives a [ProxyMessage].
   */
  fun onRefModeStoreProxyMessage(proxyMessage: UntypedProxyMessage)
}

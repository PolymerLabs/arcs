package arcs.core.storage

/**
 * Exposed API to communicate between an [ActiveStore] and [DevToolsService].
 */
interface DevToolsProxy {

  /**
   * Function to call when a [ReferenceModeStore] receives a [ProxyMessage].
   */
  fun onRefModeStoreProxyMessage(proxyMessage: ProxyMessage<*, *, *>)

  /**
   * Function to call when a [ReferenceModeStore] receives a [ProxyMessage].
   */
  fun onDirectStoreProxyMessage(proxyMessage: ProxyMessage<*, *, *>)
}

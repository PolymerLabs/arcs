package arcs.android.storage.service;

/** Callback allowing DevToolsService to receive proxy messages from the StorageService. */
interface IDevToolsProxyCallback {
    /**
     * Handles an incoming ProxyMessage.
     *
     * @param proxyMessage {@link arcs.android.storage.ProxyMessageProto},
     *     serialized to bytes.
     * @param storageKey storage key for the proxy message.
     */
    oneway void onProxyMessage(in byte[] proxyMessage, in String storageKey);
}

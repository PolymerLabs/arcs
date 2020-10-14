package arcs.android.storage.service;

import arcs.android.storage.service.IDevToolsProxyCallback;

/**
 * Exposed API to communicate between [StorageService] and [DevToolsService].
 */
interface IDevToolsProxy {

    /**
     * Register a callback to be called when the [ReferenceModeStore] receives a [ProxyMessage]
     */
    int registerRefModeStoreProxyMessageCallback(in IDevToolsProxyCallback callback);

    /**
     * Remove a callback that is called when the [ReferenceModeStore] receives a [ProxyMessage]
     */
    oneway void deRegisterRefModeStoreProxyMessageCallback(in int callbackToken);

    /**
     * Register a callback to be called when the [DirectStore] receives a [ProxyMessage]
     */
    int registerDirectStoreProxyMessageCallback(in IDevToolsProxyCallback callback);

    /**
     * Remove a callback that is called when the [DirectStore] receives a [ProxyMessage]
     */
    oneway void deRegisterDirectStoreProxyMessageCallback(in int callbackToken);
}

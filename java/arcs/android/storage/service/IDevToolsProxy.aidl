package arcs.android.storage.service;

import arcs.android.storage.service.IStorageServiceCallback;

/**
 * Exposed API to communicate between [StorageService] and [DevToolsService].
 */
interface IDevToolsProxy {

    /**
     * Register a callback to be called when the [ReferenceModeStore] receives a [ProxyMessage]
     */
    int registerRefModeStoreProxyMessageCallback(in IStorageServiceCallback callback);

    /**
     * Remove a callback that is called when the [ReferenceModeStore] receives a [ProxyMessage]
     */
    oneway void deRegisterRefModeStoreProxyMessageCallback(in int callbackToken);
}

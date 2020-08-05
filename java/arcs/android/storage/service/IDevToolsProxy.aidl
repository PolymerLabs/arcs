package arcs.android.storage.service;

import arcs.android.storage.service.IStorageServiceCallback;

/**
 * Exposed API to communicate between [StorageService] and [DevToolsService].
 */
interface IDevToolsProxy {

    /**
     * TODO: (sarahheimlich) remove once we dive into stores (b/162955831)
     *
     * Register a callback to be called with the [BindingContext] receives a [ProxyMessage]
     */
    oneway void registerBindingContextProxyMessageCallback(in IStorageServiceCallback callback);

    /**
     * TODO: (sarahheimlich) remove once we dive into stores (b/162955831)
     *
     * Remove a callback that is called with the [BindingContext] receives a [ProxyMessage]
     */
    oneway void deRegisterBindingContextProxyMessageCallback(in IStorageServiceCallback callback);
}

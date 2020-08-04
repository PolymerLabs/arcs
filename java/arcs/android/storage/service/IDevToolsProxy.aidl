package arcs.android.storage.service;

import arcs.android.storage.service.IStorageServiceCallback;

/**
 * Exposed API to manage storage for DevTools
 */
interface IDevToolsProxy {

    void onBindingContextProxyMessage(in byte[] proxyMessage);

    void registerBindingContextProxyMessageCallback(IStorageServiceCallback callback);
}

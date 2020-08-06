/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.devtools

import android.app.Service
import android.content.Intent
import android.os.IBinder
import arcs.android.devtools.storage.DevToolsConnectionFactory
import arcs.android.storage.decodeProxyMessage
import arcs.android.storage.service.IDevToolsProxy
import arcs.android.storage.service.IDevToolsStorageManager
import arcs.android.storage.service.IStorageServiceCallback
import arcs.sdk.android.storage.service.StorageService
import arcs.sdk.android.storage.service.StorageServiceConnection
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Implementation of [Service] for devtools to enable a [DevWebSocket] connection to a remote
 * device by exposing the [IDevToolsService] API.
 */
class DevToolsService : Service() {

    private val coroutineContext = Dispatchers.Default + CoroutineName("DevtoolsService")
    private val scope = CoroutineScope(coroutineContext)
    private lateinit var binder: DevToolsBinder
    private val devToolsServer = DevWebServerImpl

    private var storageService: IDevToolsStorageManager? = null
    private var serviceConnection: StorageServiceConnection? = null
    private var storageClass: Class<StorageService> = StorageService::class.java
    private var devToolsProxy: IDevToolsProxy? = null

    private val forwardProxyMessage = object : IStorageServiceCallback.Stub() {
        override fun onProxyMessage(proxyMessage: ByteArray) {
            scope.launch {
                val actualMessage = proxyMessage.decodeProxyMessage()
                devToolsServer.send(actualMessage.toString())
            }
        }
    }
    private var forwardProxyMessageToken: Int = -1

    override fun onCreate() {
        binder = DevToolsBinder(scope, devToolsServer)
        scope.launch {
            suspendCancellableCoroutine { cont ->
                cont.invokeOnCancellation {
                    devToolsServer.close()
                }
                devToolsServer.start()
                cont.resume(Unit) {}
            }
        }
    }

    override fun onBind(intent: Intent): IBinder? {
        scope.launch {
            val extras = intent.extras
            if (extras != null) {
                storageClass = extras.getSerializable("STORAGE_CLASS") as Class<StorageService>
            }
            val service = initialize()
            val proxy = service.getDevToolsProxy()

            forwardProxyMessageToken = proxy.registerBindingContextProxyMessageCallback(
                forwardProxyMessage
            )

            binder.send(service.getStorageKeys() ?: "")
            devToolsServer.addOnOpenWebsocketCallback {
                devToolsServer.send(service?.getStorageKeys() ?: "")
            }

            storageService = service
            devToolsProxy = proxy
        }
        return binder
    }

    override fun onDestroy() {
        super.onDestroy()
        devToolsServer.close()
        devToolsProxy?.deRegisterBindingContextProxyMessageCallback(forwardProxyMessageToken)
        scope.cancel()
    }

    private suspend fun initialize(): IDevToolsStorageManager {
        check(
            serviceConnection == null ||
            storageService == null ||
            storageService?.asBinder()?.isBinderAlive != true
        ) {
            "Connection to StorageService is already alive."
        }
        val connectionFactory = DevToolsConnectionFactory(
            this@DevToolsService,
            storageClass
        )
        this.serviceConnection = connectionFactory()
        // Need to initiate the connection on the main thread.
        return IDevToolsStorageManager.Stub.asInterface(
            serviceConnection?.connectAsync()?.await()
        )
    }
}

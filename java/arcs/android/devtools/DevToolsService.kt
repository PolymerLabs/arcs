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
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.IBinder
import arcs.android.devtools.storage.DevToolsConnectionFactory
import arcs.android.storage.service.IDevToolsStorageManager
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
        scope.launch { initialize() }
    }

    override fun onBind(intent: Intent): IBinder? {
        binder.send(storageService?.getStorageKeys() ?: "")
        devToolsServer.addOnOpenWebsocketCallback {
            devToolsServer.send(storageService?.getStorageKeys() ?: "")
        }
        return binder
    }

    override fun onDestroy() {
        super.onDestroy()
        devToolsServer.close()
        scope.cancel()
    }

    suspend fun initialize() {
        check(
            serviceConnection == null ||
            storageService == null ||
            storageService?.asBinder()?.isBinderAlive != true
        ) {
            "Connection to StorageService is already alive."
        }
        val connectionFactory = DevToolsConnectionFactory(
            this@DevToolsService,
            getStorageClass()
        )
        this.serviceConnection = connectionFactory()
        // Need to initiate the connection on the main thread.
        this.storageService = IDevToolsStorageManager.Stub.asInterface(
            serviceConnection?.connectAsync()?.await()
        )
    }

    private fun getStorageClass(): Class<StorageService> {
        val storageClass: Class<StorageService> = StorageService::class.java
        val packageManager: PackageManager = packageManager
        val installedPackages: List<PackageInfo> = packageManager
            .getInstalledPackages(PackageManager.GET_SERVICES)
        for (packageInfo in installedPackages) {
            val services: Array<ServiceInfo>? = packageInfo.services
            services?.forEach { service ->
                if (service.javaClass.superclass == storageClass) {
                    service.javaClass
                }
            }
        }
        return storageClass
    }
}

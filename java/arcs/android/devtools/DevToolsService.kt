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

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.annotation.VisibleForTesting
import arcs.android.devtools.DevToolsMessage.Companion.DIRECT
import arcs.android.devtools.DevToolsMessage.Companion.REFERENCEMODE
import arcs.android.storage.decodeProxyMessage
import arcs.android.storage.service.IDevToolsProxy
import arcs.android.storage.service.IDevToolsProxyCallback
import arcs.android.storage.service.IDevToolsStorageManager
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ProxyMessage
import arcs.core.util.Json
import arcs.core.util.JsonValue
import arcs.sdk.android.storage.service.BoundService
import arcs.sdk.android.storage.service.DefaultBindHelper
import arcs.sdk.android.storage.service.StorageService
import arcs.sdk.android.storage.service.bindForIntent
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Implementation of [Service] for devtools to enable a [DevWebSocket] connection to a remote
 * device by exposing the [IDevToolsService] API.
 */
@OptIn(ExperimentalCoroutinesApi::class)
open class DevToolsService : Service() {

  private val coroutineContext = Dispatchers.Default + CoroutineName("DevtoolsService")
  private val scope = CoroutineScope(coroutineContext)
  private lateinit var binder: DevToolsBinder
  private val devToolsServer = DevWebServerImpl

  private var boundService: BoundService<IDevToolsStorageManager>? = null
  @VisibleForTesting(otherwise = VisibleForTesting.PACKAGE_PRIVATE)
  var storageService: IDevToolsStorageManager? = null
  private var storageClass: Class<StorageService> = StorageService::class.java
  private var devToolsProxy: IDevToolsProxy? = null

  private var refModeStoreCallbackToken: Int = -1
  private var directStoreCallbackToken: Int = -1

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // Connect to the storage service and obtain the devToolsProxy.
    scope.launch {
      val extras = intent?.extras
      if (extras != null) {
        @Suppress("UNCHECKED_CAST")
        storageClass = extras.getSerializable(STORAGE_CLASS) as Class<StorageService>
      }
      if (boundService != null) return@launch
      val boundService = initialize()
      val service = boundService.service
      val proxy = service.devToolsProxy

      refModeStoreCallbackToken = proxy.registerRefModeStoreProxyMessageCallback(
        object : IDevToolsProxyCallback.Stub() {
          override fun onProxyMessage(proxyMessage: ByteArray, storageKey: String) {
            scope.launch {
              createAndSendProxyMessages(
                proxyMessage.decodeProxyMessage(),
                REFERENCEMODE,
                storageKey
              )
            }
          }
        }
      )

      directStoreCallbackToken = proxy.registerDirectStoreProxyMessageCallback(
        object : IDevToolsProxyCallback.Stub() {
          override fun onProxyMessage(proxyMessage: ByteArray, storageKey: String) {
            scope.launch {
              createAndSendProxyMessages(
                proxyMessage.decodeProxyMessage(),
                DIRECT,
                storageKey
              )
            }
          }
        }
      )

      binder.send(service.storageKeys ?: "")
      devToolsServer.addOnOpenWebsocketCallback {
        devToolsServer.send(service.storageKeys ?: "")
      }

      devToolsServer.addOnMessageCallback { message, socket ->
        onMessageCallback(message, socket)
      }

      this@DevToolsService.boundService = boundService
      devToolsProxy = proxy
    }

    // Create the notification and start this service in the foreground.
    val serviceChannel = NotificationChannel(
      CHANNEL_ID,
      "Foreground Service Channel",
      NotificationManager.IMPORTANCE_LOW
    )
    val manager: NotificationManager = getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(serviceChannel)
    val notification: Notification = Notification.Builder(this, CHANNEL_ID)
      .setContentTitle("Arcs DevTools")
      .setContentText("Connect a client to view Arcs developer tooling")
      .setSmallIcon(R.drawable.devtools_icon)
      .build()

    startForeground(2, notification)
    return START_NOT_STICKY
  }

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

  @Suppress("UNCHECKED_CAST")
  override fun onBind(intent: Intent): IBinder? {
    return binder
  }

  override fun onDestroy() {
    super.onDestroy()
    devToolsServer.close()
    devToolsProxy?.deRegisterRefModeStoreProxyMessageCallback(refModeStoreCallbackToken)
    devToolsProxy?.deRegisterDirectStoreProxyMessageCallback(directStoreCallbackToken)
    scope.cancel()
  }

  private suspend fun initialize(): BoundService<IDevToolsStorageManager> {
    check(
      boundService == null ||
        boundService?.service?.asBinder()?.isBinderAlive != true
    ) {
      "Connection to StorageService is already alive."
    }

    val intent = Intent(this, storageClass).apply {
      action = StorageService.DEVTOOLS_ACTION
    }
    return DefaultBindHelper(this).bindForIntent(
      intent,
      IDevToolsStorageManager.Stub::asInterface
    )
  }

  private fun createAndSendProxyMessages(
    actualMessage: ProxyMessage<CrdtData, CrdtOperation, Any?>,
    storeType: String,
    storageKey: String
  ) {
    val message = when (actualMessage) {
      is ProxyMessage.SyncRequest -> {
        StoreSyncMessage(actualMessage, storeType, storageKey)
      }
      is ProxyMessage.Operations -> {
        StoreOperationMessage(actualMessage, storeType, storageKey)
      }
      is ProxyMessage.ModelUpdate -> {
        ModelUpdateMessage(actualMessage, storeType, storageKey)
      }
    }
    val rawMessage = RawDevToolsMessage(
      JsonValue.JsonString(actualMessage.toString())
    )
    devToolsServer.send(message.toJson())
    devToolsServer.send(rawMessage.toJson())
  }

  @VisibleForTesting(otherwise = VisibleForTesting.PACKAGE_PRIVATE)
  fun onMessageCallback(message: String, socket: DevWebServerImpl.WsdSocket) {
    val json = Json.parse(message)
    when (json) {
      is JsonValue.JsonObject -> {
        if (json["type"].value == "request" && json["message"].value == "storageKeys") {
          devToolsServer.send(storageService?.storageKeys ?: "", socket)
        }
      }
    }
  }

  companion object {
    private const val CHANNEL_ID = "DevToolsChannel"

    /**
     * [STORAGE_CLASS] should be used the key in a bundle to tell DevToolsService to bind to
     * a subclass of [StorageService].
     */
    const val STORAGE_CLASS = "STORAGE_CLASS"
  }
}

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
package arcs.sdk.android.storage.service.testutil

import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import arcs.android.storage.ParcelableStoreOptions
import arcs.sdk.android.storage.service.ConnectionFactory
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import arcs.sdk.android.storage.service.StorageService
import arcs.sdk.android.storage.service.StorageServiceBindingDelegate
import java.util.concurrent.ConcurrentHashMap
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.robolectric.Robolectric

/**
 * Create a [ConnectionFactory] to bind to the storage service via [Robolectric], providing
 * access to the [TestBindingDelegate].
 */
@ExperimentalCoroutinesApi
class TestStorageServiceFactory private constructor(
  val bindingDelegate: TestBindingDelegate,
  connectionFactory: ConnectionFactory
) : ConnectionFactory by connectionFactory {
  companion object {
    fun create(
      context: Context,
      coroutineContext: CoroutineContext
    ): TestStorageServiceFactory {
      val bindingDelegate = TestBindingDelegate(context)
      val connectionFactory = DefaultConnectionFactory(context, bindingDelegate, coroutineContext)
      return TestStorageServiceFactory(bindingDelegate, connectionFactory)
    }
  }
}

/**
 * Create a [ConnectionFactory] that creates service bindings using a [Robolectric] service
 * instances.
 */
@Suppress("EXPERIMENTAL_IS_NOT_ENABLED")
@OptIn(ExperimentalCoroutinesApi::class)
fun TestConnectionFactory(ctx: Context) = DefaultConnectionFactory(ctx, TestBindingDelegate(ctx))

@Suppress("EXPERIMENTAL_IS_NOT_ENABLED")
@OptIn(ExperimentalCoroutinesApi::class)
fun TestConnectionFactorySingleService(ctx: Context) =
  DefaultConnectionFactory(ctx, TestBindingDelegateSingleService(ctx))

/**
 * This TestBindingDelegate can be used in tests with [DefaultConnectionFactory] in order to
 * successfully bind with [StorageService] when using Robolectric.
 */
class TestBindingDelegate(private val context: Context) : StorageServiceBindingDelegate {
  private val serviceController =
    Robolectric.buildService(StorageService::class.java, null).create()
  private val bindings = ConcurrentHashMap<ServiceConnection, Intent>()

  @ExperimentalCoroutinesApi
  override fun bindStorageService(
    conn: ServiceConnection,
    flags: Int,
    options: ParcelableStoreOptions
  ): Boolean {
    val intent = StorageService.createBindIntent(context, options)
    val binder = serviceController.get().onBind(intent)
    bindings[conn] = intent
    conn.onServiceConnected(null, binder)
    return true
  }

  override fun unbindStorageService(conn: ServiceConnection) {
    val intent = bindings.remove(conn)
    serviceController.get().onUnbind(intent)
  }

  fun activeBindings() = bindings.size
}

class TestBindingDelegateSingleService(
  private val context: Context
) : StorageServiceBindingDelegate {

  @ExperimentalCoroutinesApi
  override fun bindStorageService(
    conn: ServiceConnection,
    flags: Int,
    options: ParcelableStoreOptions
  ): Boolean {
    val intent = StorageService.createBindIntent(context, options)
    val binder = serviceController.get().onBind(intent)
    conn.onServiceConnected(null, binder)
    return true
  }

  override fun unbindStorageService(conn: ServiceConnection) = Unit

  companion object {
    private val serviceController by lazy {
      Robolectric.buildService(StorageService::class.java).create()
    }
  }
}

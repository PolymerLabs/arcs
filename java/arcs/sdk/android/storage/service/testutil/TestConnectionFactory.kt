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
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import arcs.sdk.android.storage.service.ManagerConnectionFactory
import arcs.sdk.android.storage.service.StorageService
import arcs.sdk.android.storage.service.StorageServiceBindingDelegate
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.robolectric.Robolectric
import java.util.concurrent.ConcurrentHashMap

/**
 * Create a [ConnectionFactory] that creates service bindings using a [Robolectric] service
 * instances.
 */
@Suppress("EXPERIMENTAL_IS_NOT_ENABLED")
@OptIn(ExperimentalCoroutinesApi::class)
fun TestConnectionFactory(ctx: Context) = DefaultConnectionFactory(ctx, TestBindingDelegate(ctx))

@Suppress("EXPERIMENTAL_IS_NOT_ENABLED")
@OptIn(ExperimentalCoroutinesApi::class)
fun TestManagerConnectionFactory(ctx: Context) =
    ManagerConnectionFactory(ctx, TestBindingDelegateSingleService(ctx, manager = true))

@Suppress("EXPERIMENTAL_IS_NOT_ENABLED")
@OptIn(ExperimentalCoroutinesApi::class)
fun TestConnectionFactorySingleService(ctx: Context) =
    DefaultConnectionFactory(ctx, TestBindingDelegateSingleService(ctx, manager = false))

/**
 * This TestBindingDelegate can be used in tests with [DefaultConnectionFactory] in order to
 * successfully bind with [StorageService] when using Robolectric.
 */
class TestBindingDelegate(private val context: Context) : StorageServiceBindingDelegate {
    private val serviceController by lazy {
        Robolectric.buildService(StorageService::class.java, null).create()
    }
    private val bindings = ConcurrentHashMap<ServiceConnection, Intent>()

    @ExperimentalCoroutinesApi
    override fun bindStorageService(
        conn: ServiceConnection,
        flags: Int,
        options: ParcelableStoreOptions?
    ): Boolean {
        val intent = StorageService.createBindIntent(context, options!!)
        val binder = serviceController.get().onBind(intent)
        bindings[conn] = intent
        conn.onServiceConnected(null, binder)
        return true
    }

    override fun unbindStorageService(conn: ServiceConnection) {
        val intent = bindings.remove(conn)
        serviceController.get().onUnbind(intent)
        if (bindings.isEmpty()) {
            serviceController.destroy()
        }
    }
}

class TestBindingDelegateSingleService(
    private val context: Context,
    private val manager: Boolean = false
) : StorageServiceBindingDelegate {

    @ExperimentalCoroutinesApi
    override fun bindStorageService(
        conn: ServiceConnection,
        flags: Int,
        options: ParcelableStoreOptions?
    ): Boolean {
        val intent = if (manager) StorageService.createStorageManagerBindIntent(context)
            else StorageService.createBindIntent(context, options!!)
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

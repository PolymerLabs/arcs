/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.sdk.android.storage.service

import android.content.ComponentName
import android.content.Context
import android.content.ServiceConnection
import android.os.IBinder
import arcs.android.crdt.ParcelableCrdtType
import arcs.android.storage.ParcelableStoreOptions
import arcs.android.storage.toParcelable
import arcs.core.storage.StoreOptions
import kotlin.coroutines.CoroutineContext
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job

/** A [ConnectionFactory] is capable of creating a [StorageServiceConnection]. */
typealias ConnectionFactory =
        (StoreOptions<*, *, *>, ParcelableCrdtType) -> StorageServiceConnection

typealias ManagerConnectionFactory = () -> StorageServiceConnection

/**
 * Returns a default [ConnectionFactory] implementation which uses the provided [context] to bind to
 * the [StorageService] and the provided [coroutineContext] as the parent for
 * [StorageServiceConnection.connectAsync]'s [Deferred] return value.
 */
@Suppress("FunctionName")
@ExperimentalCoroutinesApi
fun DefaultConnectionFactory(
    context: Context,
    bindingDelegate: StorageServiceBindingDelegate = DefaultStorageServiceBindingDelegate(context),
    coroutineContext: CoroutineContext = Dispatchers.IO
): ConnectionFactory = { options, crdtType ->
    StorageServiceConnection(bindingDelegate, options.toParcelable(crdtType), coroutineContext)
}

/**
 * Returns a [Connection] implementation which uses the provided [context] to bind to
 * the [StorageService] and the provided [coroutineContext] as the parent for
 * [StorageServiceConnection.connectAsync]'s [Deferred] return value.
 */
@Suppress("FunctionName")
@ExperimentalCoroutinesApi
@Deprecated(
    "Use ManagerConnectionFactory to get a Factory",
    ReplaceWith("ManagerConnectionFactory(context, bindingDelegate, coroutineContext)")
)
fun GetManagerConnection(
    context: Context,
    bindingDelegate: StorageServiceBindingDelegate = StorageServiceManagerBindingDelegate(context),
    coroutineContext: CoroutineContext = Dispatchers.IO
): StorageServiceConnection = StorageServiceConnection(bindingDelegate, null, coroutineContext)

/**
 * Returns a [ManagerConnectionFactory] implementation which uses the provided [context] to bind to
 * the [StorageService] and the provided [coroutineContext] as the parent for
 * [StorageServiceConnection.connectAsync]'s [Deferred] return value.
 */
@Suppress("FunctionName")
@ExperimentalCoroutinesApi
fun ManagerConnectionFactory(
    context: Context,
    bindingDelegate: StorageServiceBindingDelegate = StorageServiceManagerBindingDelegate(context),
    coroutineContext: CoroutineContext = Dispatchers.IO
): ManagerConnectionFactory = { StorageServiceConnection(bindingDelegate, null, coroutineContext) }

/** Defines an object capable of binding-to and unbinding-from the [StorageService]. */
interface StorageServiceBindingDelegate {
    fun bindStorageService(
        conn: ServiceConnection,
        flags: Int,
        options: ParcelableStoreOptions?
    ): Boolean

    fun unbindStorageService(conn: ServiceConnection)
}

/** Default implementation of the [StorageServiceBindingDelegate]. */
class DefaultStorageServiceBindingDelegate(
    private val context: Context
) : StorageServiceBindingDelegate {
    @Suppress("NAME_SHADOWING")
    override fun bindStorageService(
        conn: ServiceConnection,
        flags: Int,
        options: ParcelableStoreOptions?
    ): Boolean {
        val options = requireNotNull(options) {
            "ParcelableStoreOptions are required when binding to the StorageService from a " +
                                "ServiceStore."
        }
        return context.bindService(StorageService.createBindIntent(context, options), conn, flags)
    }

    override fun unbindStorageService(conn: ServiceConnection) = context.unbindService(conn)
}

/** Implementation of the [StorageServiceBindingDelegate] that creates a IStorageServiceManager
 * binding to the [StorageService].
 */
class StorageServiceManagerBindingDelegate(
    private val context: Context
) : StorageServiceBindingDelegate {
    override fun bindStorageService(
        conn: ServiceConnection,
        flags: Int,
        options: ParcelableStoreOptions?
    ): Boolean {
        return context.bindService(
            StorageService.createStorageManagerBindIntent(context),
            conn,
            flags
        )
    }

    override fun unbindStorageService(conn: ServiceConnection) = context.unbindService(conn)
}

/** Object capable of managing a connection to the [StorageService]. */
@OptIn(ExperimentalCoroutinesApi::class)
class StorageServiceConnection(
    /**
     * Delegate which is responsible for actually initiating and tearing-down a binding to the
     * [StorageService].
     */
    private val bindingDelegate: StorageServiceBindingDelegate,
    /** Parcelable [StoreOptions] to pass to the [bindingDelegate] when connecting. */
    private val storeOptions: ParcelableStoreOptions?,
    /** Parent [CoroutineContext] for the [Deferred] returned by [connectAsync]. */
    private val coroutineContext: CoroutineContext = Dispatchers.IO
) : ServiceConnection {
    private var needsDisconnect = false
    private var service = atomic<CompletableDeferred<IBinder>?>(null)

    /** Whether or not the connection is active/alive. */
    val isConnected: Boolean
        get() = needsDisconnect &&
            service.value?.let {
                it.isCompleted && it.getCompleted().isBinderAlive
            } == true

    /**
     * Initiates a connection with the [StorageService], returns a [Deferred] which will be resolved
     * with the [IBinder] binder.
     */
    fun connectAsync(): Deferred<IBinder> {
        if (isConnected) {
            return requireNotNull(service.value) {
                "isConnected is true, but the deferred was null"
            }
        }

        val deferred = CompletableDeferred<IBinder>(coroutineContext[Job.Key])
        service.update {
            it?.cancel()
            deferred
        }
        needsDisconnect =
            bindingDelegate.bindStorageService(
                this,
                flags = Context.BIND_AUTO_CREATE,
                options = storeOptions
            ).also {
                if (!it) {
                    deferred.completeExceptionally(
                        IllegalStateException("Could not initiate connection to the StorageService")
                    )
                }
            }
        return deferred
    }

    /** Disconnects from the [StorageService]. */
    fun disconnect() {
        if (needsDisconnect) {
            bindingDelegate.unbindStorageService(this)
            service.value?.takeIf { !it.isCompleted }
                ?.completeExceptionally(
                    IllegalStateException("Can't expect a binder after disconnect")
                )
        }
    }

    override fun onServiceConnected(name: ComponentName?, service: IBinder) {
        this.service.value?.complete(service)
    }

    override fun onServiceDisconnected(name: ComponentName?) {
        // Reset the needsDisconnect flag, since we no longer need to disconnect - and to make
        // isConnected return false.
        needsDisconnect = false
    }
}

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

package arcs.storage.service

import android.content.ComponentName
import android.content.Context
import android.content.ServiceConnection
import android.os.IBinder
import androidx.annotation.VisibleForTesting
import arcs.crdt.parcelables.ParcelableCrdtType
import arcs.storage.StoreOptions
import arcs.storage.parcelables.ParcelableStoreOptions
import arcs.storage.parcelables.toParcelable
import kotlin.coroutines.CoroutineContext
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job

/** A [ConnectionFactory] is capable of creating a [StorageServiceConnection]. */
typealias ConnectionFactory =
    (StoreOptions<*, *, *>, ParcelableCrdtType) -> StorageServiceConnection

/**
 * Returns a default [ConnectionFactory] implementation which uses the provided [context] to bind to
 * the [StorageService] and the provided [coroutineContext] as the parent for
 * [StorageServiceConnection.connectAsync]'s [Deferred] return value.
 */
@Suppress("FunctionName")
@ExperimentalCoroutinesApi
fun DefaultConnectionFactory(
    context: Context,
    coroutineContext: CoroutineContext = Dispatchers.Default
): ConnectionFactory = { options, crdtType ->
    StorageServiceConnectionImpl(context, options.toParcelable(crdtType), coroutineContext)
}

/**
 * Interface for implementations capable of connecting-to and disconnecting-from the
 * [StorageService].
 */
interface StorageServiceConnection {
    /** Whether or not the connection is active/alive. */
    val isConnected: Boolean

    /**
     * Initiates a connection with the [StorageService], returns a [Deferred] which will be resolved
     * with the [IStorageService] binder.
     */
    fun connectAsync(): Deferred<IStorageService>

    /** Disconnects from the [StorageService]. */
    fun disconnect()
}

/** Default implementation of the [StorageServiceConnection]. */
@ExperimentalCoroutinesApi
@VisibleForTesting(otherwise = VisibleForTesting.PACKAGE_PRIVATE)
class StorageServiceConnectionImpl(
    /** Android [Context] to use when connecting to the [StorageService]. */
    private val context: Context,
    /** Parcelable [StoreOptions] to pass to the [StorageService] when connecting. */
    private val storeOptions: ParcelableStoreOptions,
    /** Parent [CoroutineContext] for the [Deferred] returned by [connectAsync]. */
    private val coroutineContext: CoroutineContext = Dispatchers.Default
) : StorageServiceConnection, ServiceConnection {
    private var needsDisconnect = false
    private var service = atomic(CompletableDeferred<IStorageService>(coroutineContext[Job.Key]))

    override val isConnected: Boolean
        get() = needsDisconnect &&
            service.value.let { it.isCompleted && it.getCompleted().asBinder().isBinderAlive }

    override fun connectAsync(): Deferred<IStorageService> {
        if (isConnected) return service.value

        val deferred = CompletableDeferred<IStorageService>(coroutineContext[Job.Key])
        service.value = deferred
        needsDisconnect = context.bindService(
            StorageService.createBindIntent(context, storeOptions),
            /* conn = */ this,
            /* flags = */ 0
        )
        return deferred
    }

    override fun disconnect() {
        if (needsDisconnect) context.unbindService(this)
    }

    override fun onServiceConnected(name: ComponentName?, service: IBinder) {
        this.service.value.complete(service as IStorageService)
    }

    override fun onServiceDisconnected(name: ComponentName?) {
        // Reset the needsDisconnect flag, since we no longer need to disconnect - and to make
        // isConnected return false.
        needsDisconnect = false
    }
}

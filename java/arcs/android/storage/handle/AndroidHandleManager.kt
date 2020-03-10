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
package arcs.android.storage.handle

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.android.crdt.ParcelableCrdtType
import arcs.core.common.Referencable
import arcs.core.crdt.CrdtEntity
import arcs.core.data.RawEntity
import arcs.core.storage.EntityActivationFactory
import arcs.core.storage.handle.ActivationFactoryFactory
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.handle.SetData
import arcs.core.storage.handle.SetOp
import arcs.core.storage.handle.SingletonData
import arcs.core.storage.handle.SingletonOp
import arcs.jvm.util.JvmTime
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.ConnectionFactory
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext

@UseExperimental(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
typealias SingletonServiceStoreFactory<T> =
    ServiceStoreFactory<SingletonData<T>, SingletonOp<T>, T?>
@UseExperimental(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
typealias SetServiceStoreFactory<T> = ServiceStoreFactory<SetData<T>, SetOp<T>, Set<T>>
@UseExperimental(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
typealias EntityServiceStoreFactory =
    ServiceStoreFactory<CrdtEntity.Data, CrdtEntity.Operation, RawEntity>

/**
 * AndroidHandleManager will create a [HandleManager] instance, replacing the default
 * [ActivationFactoryFactory] with one that generates [ServiceStore] instances that can
 * communication with a running [StorageService].
 */
@UseExperimental(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
fun AndroidHandleManager(
    context: Context,
    lifecycle: Lifecycle,
    coroutineContext: CoroutineContext = EmptyCoroutineContext,
    connectionFactory: ConnectionFactory? = null
) = HandleManager(
    JvmTime,
    object : ActivationFactoryFactory {
        /**
         * Create an [ActivationFactory] which will create [ServiceStore] instances that can manage
         * [CrdtEntity] objects.
         */
        override fun dereferenceFactory(): EntityActivationFactory = EntityServiceStoreFactory(
            context,
            lifecycle,
            ParcelableCrdtType.Entity,
            coroutineContext,
            connectionFactory
        )

        /**
         * Create an [ActivationFactory] that will create [ServiceStore] instances that can manage
         * singleton [RawEntities]
         */
        override fun <T : Referencable> singletonFactory() = SingletonServiceStoreFactory<T>(
            context,
            lifecycle,
            ParcelableCrdtType.Singleton,
            coroutineContext,
            connectionFactory
        )

        /**
         * Create a ActivationFactory that will create [ServiceStore] instances that can manage
         * sets of [RawEntities]
         */
        override fun <T : Referencable> setFactory() = SetServiceStoreFactory<T>(
            context,
            lifecycle,
            ParcelableCrdtType.Set,
            coroutineContext,
            connectionFactory
        )
    }
)

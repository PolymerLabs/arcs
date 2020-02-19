package arcs.android.storage.handle

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.android.crdt.ParcelableCrdtType
import arcs.core.data.RawEntity
import arcs.core.storage.handle.ActivationFactoryFactory
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.handle.SetData
import arcs.core.storage.handle.SetOp
import arcs.core.storage.handle.SingletonData
import arcs.core.storage.handle.SingletonOp
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.ConnectionFactory
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext

@UseExperimental(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
typealias SingletonServiceStoreFactory<T> =
    ServiceStoreFactory<SingletonData<T>, SingletonOp<T>, T?>
@UseExperimental(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
typealias SetServiceStoreFactory<T> = ServiceStoreFactory<SetData<T>, SetOp<T>, Set<T>>

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
    object : ActivationFactoryFactory {
        /**
         * Create a ActivationFactory that will create [ServiceStore] instances that can manage
         * singleton [RawEntities]
         */
        override fun singletonFactory() = SingletonServiceStoreFactory<RawEntity>(
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
        override fun setFactory() = SetServiceStoreFactory<RawEntity>(
            context,
            lifecycle,
            ParcelableCrdtType.Set,
            coroutineContext,
            connectionFactory
        )
    }
)

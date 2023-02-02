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
package arcs.core.entity

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.RawEntity
import arcs.core.storage.StorageProxy
import kotlinx.coroutines.Job

typealias SingletonData<T> = CrdtSingleton.Data<T>
typealias SingletonOp<T> = CrdtSingleton.IOperation<T>
typealias SingletonProxy<T> = StorageProxy<SingletonData<T>, SingletonOp<T>, T?>

/**
 * This class implements all of the methods that are needed by the various singleton [Handle]
 * interfaces:
 * * [Handle]
 * * [ReadableHandle]
 * * [ReadSingletonHandle]
 * * [WriteSingletonHandle]
 * * [ReadWriteSingletonHandle]
 *
 * It manages the storage and retrieval of items of the specified [Entity] type, including
 * their conversion to and from the backing [RawEntity] type that the storage layer requires.
 *
 * This class won't be returned directly; instead it will be wrapped in a facade object that
 * exposes only the methods that should be exposed.
 *
 * For entity-based handles, [E] is a concrete entity class and [I] is the interface for that.
 * For reference handles, [E] and [I] are both a [Reference] to a concrete entity class.
 */
class SingletonHandle<E : Storable, I : Storable, R : Referencable>(
  config: Config<E, I, R>
) : BaseHandle(config), ReadWriteSingletonHandle<E, I> {
  private val storageProxy = config.proxy
  private val storageAdapter = config.storageAdapter

  init {
    check(spec.containerType == HandleContainerType.Singleton)
  }

  // region implement ReadSingletonHandle<E>
  override fun fetch() = checkPreconditions {
    adaptValue(storageProxy.getParticleViewUnsafe())
  }
  // endregion

  // region implement WriteSingletonHandle<I>
  override fun store(element: I): Job = checkPreconditions {
    storageProxy.applyOp(
      CrdtSingleton.Operation.Update(
        name,
        storageProxy.getVersionMap().increment(name),
        storageAdapter.storableToReferencable(element)
      )
    )
  }

  override fun clear(): Job = checkPreconditions {
    storageProxy.applyOp(
      CrdtSingleton.Operation.Clear(
        name,
        storageProxy.getVersionMap()
      )
    )
  }
  // endregion

  // region implement ReadableHandle<E>
  override fun onUpdate(action: (SingletonDelta<E>) -> Unit) =
    storageProxy.addOnUpdate(callbackIdentifier) { oldValue, newValue ->
      action(SingletonDelta(adaptValue(oldValue), adaptValue(newValue)))
    }

  override fun onDesync(action: () -> Unit) =
    storageProxy.addOnDesync(callbackIdentifier, action)

  override fun onResync(action: () -> Unit) =
    storageProxy.addOnResync(callbackIdentifier, action)

  override suspend fun <E : Entity> createReference(entity: E): Reference<E> {
    val entityId = requireNotNull(entity.entityId) {
      "Entity must have an ID before it can be referenced."
    }
    adaptValue(storageProxy.getParticleViewUnsafe()).let {
      require(it is Entity) {
        "Cannot createReference on Reference handles."
      }
      require(it.entityId == entityId) {
        "Cannot createReference for unmatching entity id."
      }
    }
    return createReferenceInternal(entity)
  }
  // endregion

  private fun adaptValue(value: R?): E? {
    return value?.takeUnless {
      storageAdapter.isExpired(it)
    }?.let {
      storageAdapter.referencableToStorable(it)
    }
  }

  /** Configuration required to instantiate a [SingletonHandle]. */
  class Config<E : Storable, I : Storable, R : Referencable>(
    /** See [BaseHandleConfig.name]. */
    name: String,
    /** See [BaseHandleConfig.spec]. */
    spec: HandleSpec,
    /**
     * Interface to storage for [RawEntity] objects backing an `entity: E`.
     *
     * See [BaseHandleConfig.storageProxy].
     */
    val proxy: SingletonProxy<R>,
    /** Will ensure that necessary fields are present on the [RawEntity] before storage. */
    val storageAdapter: StorageAdapter<E, I, R>,
    /** See [BaseHandleConfig.dereferencerFactory]. */
    dereferencerFactory: EntityDereferencerFactory,
    /** See [BaseHandleConfig.particleId]. */
    particleId: String
  ) : BaseHandleConfig(name, spec, proxy, dereferencerFactory, particleId)
}

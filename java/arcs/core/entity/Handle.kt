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

import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.ReferenceType
import arcs.core.data.SingletonType
import arcs.core.storage.StorageProxy
import arcs.core.storage.StorageProxy.StorageEvent
import arcs.core.type.Type
import kotlin.coroutines.resume
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Job
import kotlinx.coroutines.suspendCancellableCoroutine

/** Base interface for all handle classes. */
interface Handle {
  val name: String

  /** The read/write/query permissions for this handle. */
  val mode: HandleMode

  /**
   * If you need to access or mutate the [Handle]'s data from outside of a particle or handle
   * lifecycle callback, you must use this dispatcher (or the handleDispatcher from your particle)
   * to run your operations.
   *
   * TODO(b/155229971): Add handleDispatcher to particle interface.
   */
  val dispatcher: CoroutineDispatcher

  // TODO(b/157188866): move this to ReadableHandle (write-only handles should not receive this)
  /** Assign a callback when the handle is synced for the first time. */
  fun onReady(action: () -> Unit)

  /** Release resources needed by this, unregister all callbacks. */
  fun close()

  // TODO(b/158785940): move internal methods to an internal interface
  /** Internal method used to connect [StorageProxy] events to the [ParticleContext]. */
  fun registerForStorageEvents(notify: (StorageEvent) -> Unit)

  /** Remove any storage callbacks, but still allow write methods. */
  fun unregisterForStorageEvents()

  /** Internal method used to trigger a sync request on this handle's [StorageProxy]. */
  fun maybeInitiateSync()

  /** Internal method to return this handle's underlying [StorageProxy]. */
  fun getProxy(): StorageProxy<*, *, *>

  /**
   * Create a foreign [Reference] of type [T] with the given [id], checking for validity of
   * that [id].
   *
   * Note: this is a temporary method, this functionality will be part of the EntityHandle when we
   * have one and it is used to create references. That is, you first get the foreign entity, then
   * a reference to it.
   *
   * Returns null if the [id] is not valid.
   */
  suspend fun <E : Entity> createForeignReference(spec: EntitySpec<E>, id: String): Reference<E>?
}

/** Suspends until the [Handle] has synced with the store. */
suspend fun <T : Handle> T.awaitReady(): T = suspendCancellableCoroutine { cont ->
  this.onReady {
    if (cont.isActive) cont.resume(this@awaitReady)
  }
}

/** Base interface for types that can be stored in a [Handle] (see [Entity] and [Reference]). */
interface Storable

/** Configuration for a [Handle]. */
data class HandleSpec(
  val baseName: String,
  val mode: HandleMode,
  val type: Type,
  val entitySpecs: Set<EntitySpec<*>>
) {
  // Convenience constructor for a single EntitySpec.
  constructor(
    baseName: String,
    mode: HandleMode,
    type: Type,
    entitySpec: EntitySpec<*>
  ) : this(baseName, mode, type, setOf(entitySpec))

  val containerType: HandleContainerType
    get() = when (type) {
      is CollectionType<*> -> HandleContainerType.Collection
      is SingletonType<*> -> HandleContainerType.Singleton
      else -> throw IllegalStateException(
        "Handle type ${type.tag} for handle $baseName should be a Collection or a Singleton"
      )
    }

  val dataType: HandleDataType
    get() = when (innerType) {
      is EntityType -> HandleDataType.Entity
      is ReferenceType<*> -> HandleDataType.Reference
      else -> throw IllegalStateException("Unrecognized Type: ${innerType.tag}")
    }

  private val innerType: Type
    get() = when (type) {
      is CollectionType<*> -> type.collectionType
      is SingletonType<*> -> type.containedType
      else -> throw IllegalStateException(
        "Handle type ${type.tag} for handle $baseName should be a Collection or a Singleton"
      )
    }
}

typealias HandleMode = HandleMode

/** The type of container that a [Handle] represents. */
enum class HandleContainerType {
  Singleton,
  Collection
}

/** The type of data stored in a [Handle]. */
enum class HandleDataType {
  Entity,
  Reference
}

/**
 * Base class for all readable handle types. [ValueType] is not required for this interface itself,
 * but allows generic processing of multiple handles (e.g. [arcs.sdk.combineUpdates]).
 */
interface ReadableHandle<ValueType, UpdateType> : Handle {
  /** Assign a callback when the handle's data changes. */
  fun onUpdate(action: (UpdateType) -> Unit)

  /** Assign a callback when the handle is desynced. */
  fun onDesync(action: () -> Unit)

  /** Assign a callback when the handle is re-synced after being desynced. */
  fun onResync(action: () -> Unit)

  /**
   * Creates and returns a [Reference] to the given entity.
   *
   * The entity must already be stored and present in the handle before calling this method.
   *
   * Note that this method only works for handles which store [Entity] types (i.e. not handles
   * containing [Reference]s). [E] must be the same type the handle stores.
   */
  suspend fun <E : Entity> createReference(entity: E): Reference<E>
}

/** The UpdateType for ReadSingletonHandle; reports the change for a single value in onUpdate. */
data class SingletonDelta<T : Storable>(
  val old: T? = null,
  val new: T? = null
)

/** The UpdateType for ReadCollectionHandle; reports the items added and removed in onUpdate. */
data class CollectionDelta<T : Storable>(
  val added: Set<T> = setOf(),
  val removed: Set<T> = setOf()
)

/** A singleton handle with read access. [E] is a concrete entity class. */
interface ReadSingletonHandle<E : Storable> : ReadableHandle<E?, SingletonDelta<E>> {
  /** Returns the value of the singleton. */
  fun fetch(): E?
}

/** A singleton handle with write access. [I] is the interface for an entity class. */
interface WriteSingletonHandle<I : Storable> : Handle {
  /** Sets the value of the singleton. */
  fun store(element: I): Job

  /** Clears the value of the singleton. */
  fun clear(): Job
}

/** A singleton handle with read and write access. */
interface ReadWriteSingletonHandle<E : Storable, I : Storable> :
  ReadSingletonHandle<E>, WriteSingletonHandle<I>

/** A collection handle with read access. [E] is a concrete entity class. */
interface ReadCollectionHandle<E : Storable> : ReadableHandle<Set<E>, CollectionDelta<E>> {
  /** The number of elements in the collection. */
  fun size(): Int

  /** Returns true if the collection is empty. */
  fun isEmpty(): Boolean

  /** Returns a set with all the entities in the collection. */
  fun fetchAll(): Set<E>

  /** Return the entity with the provided [entityId]. */
  fun fetchById(entityId: String): E?
}

/** A collection handle with write access. [I] is the interface for an entity class. */
interface WriteCollectionHandle<I : Storable> : Handle {
  /** Adds the given [element] to the collection. */
  fun store(element: I): Job

  /** Adds the given [elements] to the collection. */
  fun storeAll(elements: Collection<I>): Job

  /** Removes everything from the collection. */
  fun clear(): Job

  /** Removes the given [element] from the collection. It is equivalent to deleting by the id of the
   * provided entity (all other fields are ignored). */
  fun remove(element: I): Job

  /** Removes the element with the given [id] from the collection. */
  fun removeById(id: String): Job
}

/** A collection handle with query access. [E] is a concrete entity class. */
interface QueryCollectionHandle<E : Storable, QueryArgs> : Handle {
  /** Returns a set with all the entities in the collection that match the associated query. */
  fun query(args: QueryArgs): Set<E>
}

/** A collection handle with remove-by-query access. */
interface RemoveQueryCollectionHandle<QueryArgs> : Handle {
  /** Removes all the entities from the collection that match the associated query. */
  fun removeByQuery(args: QueryArgs): Job
}

/** A collection handle with read and write access. */
interface ReadWriteCollectionHandle<E : Storable, I : Storable> :
  ReadCollectionHandle<E>, WriteCollectionHandle<I>

/** A collection handle with read and query access. */
interface ReadQueryCollectionHandle<E : Storable, QueryArgs> :
  ReadCollectionHandle<E>, QueryCollectionHandle<E, QueryArgs>

/** A collection handle with write and remove-by-query access. */
interface WriteQueryCollectionHandle<I : Storable, QueryArgs> :
  WriteCollectionHandle<I>, RemoveQueryCollectionHandle<QueryArgs>

/** A collection handle with read, write and query access. */
interface ReadWriteQueryCollectionHandle<E : Storable, I : Storable, QueryArgs> :
  ReadWriteCollectionHandle<E, I>,
  WriteQueryCollectionHandle<I, QueryArgs>,
  ReadQueryCollectionHandle<E, QueryArgs>

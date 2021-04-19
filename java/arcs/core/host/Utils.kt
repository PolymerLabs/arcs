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
package arcs.core.host

import arcs.core.data.EntitySchemaProviderType
import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.entity.Entity
import arcs.core.entity.EntitySpec
import arcs.core.entity.Handle
import arcs.core.entity.HandleSpec
import arcs.core.entity.Reference
import arcs.core.host.api.HandleHolder
import arcs.core.host.api.Particle
import arcs.core.storage.StorageKey
import arcs.core.type.Tag
import arcs.flags.BuildFlags
import kotlin.reflect.KClass
import kotlinx.coroutines.CoroutineDispatcher

/**
 * [KClass.java] and [KClass.qualifiedName] are not accessible in JS, which means they cannot be
 * used in shared code. This is a multiplatform workaround that uses toString() to obtain the
 * internal class name and replaces inner-class '$' separators with '.'.
 *
 * TODO: replace with official mechanisms once Kotlin Multiplatform's Kotlin-Reflect improves.
 */
fun KClass<*>.className(): String {
  // format is "interface|class|enum foo.bar.Bar$Inner<Type> (error messages)"
  return this.toString()
    .substringAfter(' ')
    .substringBefore(' ')
    .substringBefore('<')
    .replace('$', '.')
}

/** Returns a pair mapping [ParticleIdentifier] to [ParticleConstructor] */
inline fun <reified T : Particle> (() -> T).toRegistration(): ParticleRegistration {
  val construct: suspend (Plan.Particle?) -> T = { _ -> this.invoke() }
  return T::class.toParticleIdentifier() to construct
}

/** Returns a pair mapping [ParticleIdentifier] to [ParticleConstructor] */
inline fun <reified T : Particle> ((Plan.Particle?) -> T).toRegistration(): ParticleRegistration {
  val construct: suspend (Plan.Particle?) -> T = { this.invoke(it) }
  return T::class.toParticleIdentifier() to construct
}

/**
 * Given a handle name, a [Plan.HandleConnection], and a [HandleHolder] construct an Entity
 * [Handle] of the right type.
 *
 * [particleId] is meant to be a namespace for the handle, wherein handle callbacks will be
 * triggered according to the rules of the [Scheduler].
 */
suspend fun createHandle(
  handleManager: HandleManager,
  handleName: String,
  connectionSpec: Plan.HandleConnection,
  holder: HandleHolder,
  particleId: String = "",
  immediateSync: Boolean = true,
  storeSchema: Schema? = null,
  writeOnly: Boolean = false
): Handle {
  val handleSpec = HandleSpec(
    handleName,
    connectionSpec.mode,
    connectionSpec.type,
    holder.getEntitySpecs(handleName)
  )
  return handleManager.createHandle(
    handleSpec,
    connectionSpec.storageKey,
    connectionSpec.ttl,
    particleId,
    immediateSync,
    storeSchema,
    connectionSpec.actor,
    writeOnly
  ).also { holder.setHandle(handleName, it) }
}

/**
 * Create and set [Handle]s inside the [HandleHolder] of a [Particle].
 *
 * @returns a list of the created [Handle]s added to the [HandleHolder].
 */
suspend fun Particle.createAndSetHandles(
  partition: Plan.Partition,
  handleManager: HandleManager,
  particleSpec: Plan.Particle,
  immediateSync: Boolean = true
): List<Handle> {
  return particleSpec.handles.map { (handleName, handleConnection) ->
    createHandle(
      handleManager,
      handleName,
      handleConnection,
      this.handles,
      this.toString(),
      immediateSync = immediateSync,
      storeSchema = (handleConnection.handle.type as? EntitySchemaProviderType)?.entitySchema,
      writeOnly = isWriteOnlyStorageKey(partition, handleConnection.handle.storageKey)
    )
  }
}

/** A NoOp [Particle] that serves as a default value in [ParticleContext]s. */
object NoOpArcHostParticle : Particle {
  private const val UNSUPPORTED_EXCEPTION_MSG =
    "Arc Host Particle should never be used."

  override val handles = object : HandleHolder {
    override val dispatcher: CoroutineDispatcher
      get() = throw UnsupportedOperationException(UNSUPPORTED_EXCEPTION_MSG)

    override fun getHandle(handleName: String): Handle =
      throw UnsupportedOperationException(UNSUPPORTED_EXCEPTION_MSG)

    override fun getEntitySpecs(handleName: String): Set<EntitySpec<out Entity>> =
      throw UnsupportedOperationException(UNSUPPORTED_EXCEPTION_MSG)

    override fun setHandle(handleName: String, handle: Handle) =
      throw UnsupportedOperationException(UNSUPPORTED_EXCEPTION_MSG)

    override fun detach() =
      throw UnsupportedOperationException(UNSUPPORTED_EXCEPTION_MSG)

    override fun reset() =
      throw UnsupportedOperationException(UNSUPPORTED_EXCEPTION_MSG)

    override fun isEmpty(): Boolean =
      throw UnsupportedOperationException(UNSUPPORTED_EXCEPTION_MSG)

    override suspend fun <T : Entity> createForeignReference(
      spec: EntitySpec<T>,
      id: String
    ): Reference<T>? =
      throw UnsupportedOperationException(UNSUPPORTED_EXCEPTION_MSG)
  }
}

/**
 * Examines all [Plan.HandleConnection]s in a given [Plan.Partition] and returns true if and only if
 * every connection with a matching key is both a [Tag.CollectionType] and uses a [HandleMode]
 * that cannot read.
 */
fun isWriteOnlyStorageKey(partition: Plan.Partition, key: StorageKey): Boolean =
  BuildFlags.WRITE_ONLY_STORAGE_STACK &&
    partition.particles.flatMap { it.handles.values }.filter { it.storageKey == key }.all {
      !it.mode.canRead && it.type.tag == Tag.Collection
    }

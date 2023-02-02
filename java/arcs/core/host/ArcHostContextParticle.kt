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

import arcs.core.common.toArcId
import arcs.core.data.Annotation
import arcs.core.data.Capabilities
import arcs.core.data.Capability.Ttl
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.data.SchemaSerializer
import arcs.core.data.SingletonType
import arcs.core.data.expression.deserializeExpression
import arcs.core.data.expression.serialize
import arcs.core.data.toSchema
import arcs.core.entity.Reference
import arcs.core.host.api.Particle
import arcs.core.host.generated.AbstractArcHostContextParticle
import arcs.core.host.generated.ArcHostContextPlan
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.StorageKeyManager
import arcs.core.type.Tag
import arcs.core.type.Type
import arcs.core.util.plus
import arcs.core.util.traverse
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.withContext

typealias ArcHostContextParticle_HandleConnections = AbstractArcHostContextParticle.HandleConnection
typealias ArcHostContextParticle_Particles = AbstractArcHostContextParticle.ParticleSchema
typealias ArcHostContextParticle_PlanHandle = AbstractArcHostContextParticle.PlanHandle

/**
 * An implicit [Particle] that lives within the [ArcHost] and used as a utility class to
 * serialize/deserialize [ArcHostContext] information from [Plan.Handle]s. It does not live in an
 * Arc or participate in normal [Particle] lifecycle.
 */
class ArcHostContextParticle(
  private val hostId: String,
  private val handleManager: HandleManager,
  private val storageKeyManager: StorageKeyManager,
  private val serializer: SchemaSerializer<String>
) : AbstractArcHostContextParticle() {
  /**
   * Given an [ArcHostContext], convert these types to Arc Schema types, and write them to the
   * appropriate handles. See `ArcHostContext.arcs` for schema definitions.
   */
  suspend fun writeArcHostContext(
    context: arcs.core.host.ArcHostContext
  ) = onHandlesReady {
    try {
      handles.planHandles.clear()
      val connections = context.particles.flatMap {
        it.planParticle.handles.map { (handleName, handle) ->
          val planHandle = ArcHostContextParticle_PlanHandle(
            storageKey = handle.handle.storageKey.toString(),
            type = handle.handle.type.tag.name,
            schema = serializer.serialize(handle.handle.type.toSchema())
          )
          // Write Plan.Handle
          handles.planHandles.store(planHandle).join()
          ArcHostContextParticle_HandleConnections(
            connectionName = handleName,
            planHandle = handles.planHandles.createReference(planHandle),
            storageKey = handle.storageKey.toString(),
            mode = handle.mode.name, type = handle.type.tag.name,
            ttl = handle.ttl.minutes.toDouble(),
            expression = handle.expression?.serialize() ?: "",
            schema = serializer.serialize(handle.type.toSchema())
          )
        }
      }
      // Write Plan.HandleConnection
      handles.handleConnections.clear()
      connections.map { handles.handleConnections.store(it) }.joinAll()

      val particles = context.particles.map {
        ArcHostContextParticle_Particles(
          particleName = it.planParticle.particleName,
          location = it.planParticle.location,
          particleState = it.particleState.toString(),
          consecutiveFailures = it.consecutiveFailureCount.toDouble(),
          handles = connections.map { connection ->
            handles.handleConnections.createReference(connection)
          }.toSet()
        )
      }

      // Write Plan.Particle + ParticleContext
      handles.particles.clear()
      particles.map { handles.particles.store(it) }.joinAll()

      val arcHostContext = AbstractArcHostContextParticle.ArcHostContext(
        arcId = context.arcId, hostId = hostId, arcState = context.arcState.toString(),
        particles = particles.map { handles.particles.createReference(it) }.toSet()
      )

      handles.arcHostContext.clear()
      handles.arcHostContext.store(arcHostContext).join()
    } catch (e: Exception) {
      // TODO: retry?
      throw IllegalStateException("Unable to serialize ${context.arcId} for $hostId", e)
    }
  }

  /**
   * Reads [ArcHostContext] from serialized representation as Arcs Schema types. See
   * `ArcHostContext.arcs' for Schema definitions. NOTE: This is more complex than it needs
   * to be because references are not supported yet in schema2kotlin, and so this information
   * is stored in de-normalized format.
   */
  suspend fun readArcHostContext(
    arcHostContext: arcs.core.host.ArcHostContext
  ): arcs.core.host.ArcHostContext? = onHandlesReady {
    val arcId = arcHostContext.arcId

    try {
      // TODO(cromwellian): replace with .query(arcId, hostId) when queryHandles are efficient
      val arcStateEntity = handles.arcHostContext.fetch()
        ?: return@onHandlesReady null
      val particles = arcStateEntity.particles.map {
        requireNotNull(it.dereference()) {
          "Invalid particle reference when deserialising arc $arcId for host $hostId"
        }
      }.map { particleEntity ->
        val handlesMap = createHandlesMap(
          arcId,
          particleEntity.particleName,
          particleEntity.handles
        )

        ParticleContext(
          Plan.Particle(particleEntity.particleName, particleEntity.location, handlesMap),
          ParticleState.fromString(particleEntity.particleState),
          particleEntity.consecutiveFailures.toInt()
        )
      }

      return@onHandlesReady ArcHostContext(
        arcId,
        particles.toMutableList(),
        initialArcState = ArcState.fromString(arcStateEntity.arcState)
      )
    } catch (e: Exception) {
      throw IllegalStateException("Unable to deserialize $arcId for $hostId", e)
    }
  }

  private suspend inline fun <T> onHandlesReady(
    coroutineContext: CoroutineContext = handles.dispatcher,
    crossinline block: suspend () -> T
  ): T {
    val onReadyJobs = mapOf(
      "particles" to Job(),
      "arcHostContext" to Job(),
      "handleConnections" to Job(),
      "planHandles" to Job()
    )
    handles.particles.onReady { onReadyJobs["particles"]?.complete() }
    handles.arcHostContext.onReady { onReadyJobs["arcHostContext"]?.complete() }
    handles.handleConnections.onReady { onReadyJobs["handleConnections"]?.complete() }
    handles.planHandles.onReady { onReadyJobs["planHandles"]?.complete() }
    onReadyJobs.values.joinAll()
    return withContext(coroutineContext) { block() }
  }

  suspend fun close() { handleManager.close() }

  private suspend fun createHandlesMap(
    arcId: String,
    particleName: String,
    handles: Set<Reference<ArcHostContextParticle_HandleConnections>>
  ) = handles.map { handle ->
    requireNotNull(handle.dereference()) {
      "HandleConnection couldn't be dereferenced for arcId $arcId, particle $particleName"
    }
  }.map { handle ->
    val planHandle = requireNotNull(requireNotNull(handle.planHandle).dereference()) {
      "PlanHandle couldn't be dereferenced for arcId $arcId, particle $handle.connectionName"
    }
    handle.connectionName to Plan.HandleConnection(
      Plan.Handle(
        storageKeyManager.parse(planHandle.storageKey),
        fromTag(arcId, serializer.deserialize(planHandle.schema), planHandle.type),
        emptyList()
      ),
      HandleMode.valueOf(handle.mode),
      fromTag(arcId, serializer.deserialize(handle.schema), handle.type),
      if (handle.ttl != Ttl.TTL_INFINITE.toDouble()) {
        listOf(Annotation.createTtl("$handle.ttl minutes"))
      } else {
        emptyList()
      },
      handle.expression.ifEmpty { null }?.let { it.deserializeExpression() }
    )
  }.toSet().associateBy({ it.first }, { it.second })

  /**
   * Using instantiated particle to obtain [Schema] objects through their
   * associated [EntitySpec], reconstruct an associated [Type] object.
   */
  fun fromTag(arcId: String, schema: Schema, tag: String): Type {
    return when (Tag.valueOf(tag)) {
      Tag.Singleton -> SingletonType(EntityType(schema))
      Tag.Collection -> CollectionType(EntityType(schema))
      Tag.Entity -> EntityType(schema)
      else -> throw IllegalArgumentException(
        "Illegal Tag $tag when deserializing ArcHostContext with ArcId '$arcId'"
      )
    }
  }

  /**
   * When recipe2plan is finished, the 'Plan' to serialize/deserialize ArcHost information
   * will be code-genned, and this method will mostly go away, in combination with
   * the move away from denormalized schemas to schema definitions using references.
   */
  fun createArcHostContextPersistencePlan(
    capability: Capabilities,
    arcId: String
  ): Plan.Partition {
    val resolver = CapabilitiesResolver(
      CapabilitiesResolver.Options(arcId.toArcId())
    )

    /*
     * Because query() isn't efficient yet, we don't store all serializations under a
     * single key in the recipe, but per-arcId.
     * TODO: once efficient queries exist, remove and use recipe2plan key
     */
    val arcHostContextKey = resolver.createStorageKey(
      capability, EntityType(AbstractArcHostContextParticle.ArcHostContext.SCHEMA),
      "${hostId}_arcState"
    )

    val particlesKey = resolver.createStorageKey(
      capability, EntityType(ArcHostContextParticle_Particles.SCHEMA),
      "${hostId}_arcState_particles"
    )

    val handleConnectionsKey = resolver.createStorageKey(
      capability, EntityType(ArcHostContextParticle_HandleConnections.SCHEMA),
      "${hostId}_arcState_handleConnections"
    )
    val planHandlesKey = resolver.createStorageKey(
      capability, EntityType(ArcHostContextParticle_PlanHandle.SCHEMA),
      "${hostId}_arcState_planHandles"
    )

    // replace keys with per-arc created ones.
    val allStorageKeyLens = Plan.Particle.handlesLens.traverse() +
      Plan.HandleConnection.handleLens + Plan.Handle.storageKeyLens
    val particle = allStorageKeyLens.mod(ArcHostContextPlan.particles.first()) { storageKey ->
      val keyString = storageKey.toKeyString()
      when {
        "arcHostContext" in keyString -> arcHostContextKey
        "particles" in keyString -> particlesKey
        "handleConnections" in keyString -> handleConnectionsKey
        "planHandles" in keyString -> planHandlesKey
        else -> storageKey
      }
    }

    return Plan.Partition(arcId, hostId, listOf(particle))
  }
}

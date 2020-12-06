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
import arcs.core.data.SingletonType
import arcs.core.data.expression.deserializeExpression
import arcs.core.data.expression.serialize
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
 * serialize/deserialize [ArcHostContext] information from [Handle]s. It does not live in an
 * Arc or participate in normal [Particle] lifecycle.
 */
class ArcHostContextParticle(
  private val hostId: String,
  private val handleManager: HandleManager,
  private val instantiateParticle: suspend (ParticleIdentifier, Plan.Particle?) -> Particle,
  private val instantiatedParticles: MutableMap<String, Particle> = mutableMapOf()
) : AbstractArcHostContextParticle() {
  /**
   * Given an [ArcId], [hostId], and [ArcHostContext], convert these types to Arc Schema
   * types, and write them to the appropriate handles. See `ArcHostContext.arcs` for schema
   * definitions.
   */
  suspend fun writeArcHostContext(
    arcId: String,
    context: arcs.core.host.ArcHostContext
  ) = onHandlesReady {
    try {
      handles.planHandles.clear()
      val connections = context.particles.flatMap {
        it.planParticle.handles.map { handle ->
          val planHandle = ArcHostContextParticle_PlanHandle(
            storageKey = handle.value.handle.storageKey.toString(),
            type = handle.value.handle.type.tag.name
          )
          // Write Plan.Handle
          handles.planHandles.store(planHandle).join()
          ArcHostContextParticle_HandleConnections(
            connectionName = handle.key,
            planHandle = handles.planHandles.createReference(planHandle),
            storageKey = handle.value.storageKey.toString(),
            mode = handle.value.mode.name, type = handle.value.type.tag.name,
            ttl = handle.value.ttl.minutes.toDouble(),
            expression = handle.value.expression?.serialize() ?: ""
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
        arcId = arcId, hostId = hostId, arcState = context.arcState.toString(),
        particles = particles.map { handles.particles.createReference(it) }.toSet()
      )

      handles.arcHostContext.clear()
      handles.arcHostContext.store(arcHostContext).join()
    } catch (e: Exception) {
      // TODO: retry?
      throw IllegalStateException("Unable to serialize $arcId for $hostId", e)
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
        val particle =
          tryInstantiateParticle(particleEntity.particleName, particleEntity.location)

        val handlesMap = createHandlesMap(
          arcId, particleEntity.particleName, particle, particleEntity.handles
        )

        ParticleContext(
          particle,
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

  private suspend fun tryInstantiateParticle(
    particleName: String,
    location: String
  ): Particle = instantiatedParticles.getOrPut(particleName) {
    // TODO(b/154855909) Address null Plan.Particle argument
    instantiateParticle(ParticleIdentifier.from(location), null)
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
    return withContext(coroutineContext) { block() }.also { handleManager.close() }
  }

  private suspend fun createHandlesMap(
    arcId: String,
    particleName: String,
    particle: Particle,
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
        StorageKeyManager.GLOBAL_INSTANCE.parse(planHandle.storageKey),
        // TODO(b/161818462): Properly serialize serialize Handle Type's schema.
        fromTag(arcId, particle, planHandle.type, handle.connectionName),
        emptyList()
      ),
      HandleMode.valueOf(handle.mode),
      fromTag(arcId, particle, handle.type, handle.connectionName),
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
  fun fromTag(arcId: String, particle: Particle, tag: String, connectionName: String): Type {
    try {
      val schema = particle.handles.getEntitySpecs(connectionName).single().SCHEMA
      return when (Tag.valueOf(tag)) {
        Tag.Singleton -> SingletonType(EntityType(schema))
        Tag.Collection -> CollectionType(EntityType(schema))
        Tag.Entity -> EntityType(schema)
        else -> throw IllegalArgumentException(
          "Illegal Tag $tag when deserializing ArcHostContext with ArcId $arcId"
        )
      }
    } catch (e: NoSuchElementException) {
      throw IllegalStateException(
        """
                Can't create Type $tag for Handle $connectionName and ${particle::class}. This usually
                occurs because the Particle or ArcHost implementation has changed since
                the last time this arc was serialized.
        """.trimIndent(),
        e
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
    val arcHostContextKey = requireNotNull(
      resolver.createStorageKey(
        capability, EntityType(AbstractArcHostContextParticle.ArcHostContext.SCHEMA),
        "${hostId}_arcState"
      )
    ) {
      "Can't create arcHostContextKey for $arcId and $hostId"
    }

    val particlesKey = requireNotNull(
      resolver.createStorageKey(
        capability, EntityType(ArcHostContextParticle_Particles.SCHEMA),
        "${hostId}_arcState_particles"
      )
    ) {
      "Can't create particlesKey $arcId and $hostId"
    }

    val handleConnectionsKey = requireNotNull(
      resolver.createStorageKey(
        capability, EntityType(ArcHostContextParticle_HandleConnections.SCHEMA),
        "${hostId}_arcState_handleConnections"
      )
    ) {
      "Can't create handleConnectionsKey $arcId and $hostId"
    }
    val planHandlesKey = requireNotNull(
      resolver.createStorageKey(
        capability, EntityType(ArcHostContextParticle_PlanHandle.SCHEMA),
        "${hostId}_arcState_planHandles"
      )
    ) {
      "Can't create handlesKey $arcId and $hostId"
    }

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

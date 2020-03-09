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
import arcs.core.data.Capabilities
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.Plan
import arcs.core.data.SingletonType
import arcs.core.data.Ttl
import arcs.core.host.api.Particle
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.StorageKeyParser
import arcs.core.type.Tag
import arcs.core.type.Type

/**
 * An implicit [Particle] that lives within the [ArcHost] and used as a utility class to
 * serialize/deserialize [ArcHostContext] information from [Handle]s. It does not live in an
 * Arc or participate in normal [Particle] lifecycle.
 */
class ArcHostContextParticle : AbstractArcHostParticle() {
    /**
     * Given an [ArcId], [hostId], and [ArcHostContext], convert these types to Arc Schema
     * types, and write them to the appropriate handles. See `ArcHostContext.arcs` for schema
     * definitions.
     */
    suspend fun writeArcHostContext(arcId: String, hostId: String, context: ArcHostContext) {
        try {
            val connections = context.particles.flatMap {
                it.key.handles.map { handle ->
                    ArcHostParticle_HandleConnections(
                        arcId = arcId,
                        particleName = it.key.particleName,
                        handleName = handle.key,
                        storageKey = handle.value.storageKey.toString(),
                        mode = handle.value.mode.name,
                        type = handle.value.type.tag.name,
                        ttl = handle.value.ttl?.minutes?.toDouble() ?: 0.0
                    )
                }
            }
            val arcState = ArcHostParticle_ArcHostContext(arcId, hostId, context.arcState.name)
            val particles = context.particles.map {
                ArcHostParticle_Particles(
                    arcId = arcId,
                    particleName = it.key.particleName,
                    location = it.key.location,
                    particleState = it.value.particleState.name,
                    consecutiveFailures = it.value.consecutiveFailureCount.toDouble()
                )
            }

            // Write ArcHostContext
            handles.arcHostContext.store(arcState)

            // Write Plan.Particle + ParticleContext
            handles.particles.clear()
            particles.forEach { handles.particles.store(it) }

            // Write Plan.HandleConnection
            handles.handleConnections.clear()
            connections.forEach { handles.handleConnections.store(it) }
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
        arcId: String,
        hostId: String,
        instantiateParticle: suspend (ParticleIdentifier) -> Particle
    ): ArcHostContext? {
        try {
            val arcStateEntity = handles.arcHostContext.fetch()
            val particleEntities = handles.particles.fetchAll()
            val connectionEntities = handles.handleConnections.fetchAll()

            // This arc has never been serialized before
            if (arcStateEntity == null ||
                particleEntities.isEmpty() ||
                connectionEntities.isEmpty()) {
                return null
            }

            // construct a map of particleName to Particle instance
            val instantiatedParticles = particleEntities.map {
                it.particleName to instantiateParticle(ParticleIdentifier.from(it.location))
            }.associateBy({ it.first }, { it.second })

            // construct a map from particleName to a list of handleNames mapped to HandleConnection
            val handleConnections = connectionEntities.map { entity ->
                ParticleConnection(
                    entity.particleName,
                    createHandleConnection(
                        entity,
                        arcId,
                        hostId,
                        instantiatedParticles
                    )
                )
            }.groupBy { it.particleName }

            // construct a map from Plan.Particle to ParticleContext
            val particles = particleEntities.map {
                Plan.Particle(
                    it.particleName,
                    it.location,
                    createHandlesMap(handleConnections, it, arcId)
                ) to ParticleContext(
                    requireNotNull(instantiatedParticles[it.particleName]) {
                        "${it.particleName} not instantiable for $arcId and $hostId"
                    },
                    mutableMapOf(),
                    ParticleState.valueOf(it.particleState),
                    it.consecutiveFailures.toInt()
                )
            }.associateBy({ it.first }, { it.second })

            return ArcHostContext(
                particles.toMutableMap(),
                arcStateEntity?.let {
                    ArcState.valueOf(it.arcState)
                } ?: ArcState.NeverStarted
            )
        } catch (e: Exception) {
            throw IllegalStateException("Unable to deserialize $arcId for $hostId", e)
        }
    }

    data class NamedHandleConnection(
        val handleName: String,
        val handleConnection: Plan.HandleConnection
    )
    data class ParticleConnection(val particleName: String, val connection: NamedHandleConnection)

    private fun createHandlesMap(
        handleConnections: Map<String, List<ParticleConnection>>,
        it: ArcHostParticle_Particles,
        arcId: String
    ): Map<String, Plan.HandleConnection> {
        return handleConnections[it.particleName]?.associateBy(
            { it.connection.handleName },
            { it.connection.handleConnection }
        ) ?: throw IllegalArgumentException(
            "Can't find handleConnection for ${it.particleName} in $arcId"
        )
    }

    private fun createHandleConnection(
        entity: ArcHostParticle_HandleConnections,
        arcId: String,
        hostId: String,
        instantiatedParticles: Map<String, Particle>
    ): NamedHandleConnection {
        return NamedHandleConnection(
            entity.handleName,
            Plan.HandleConnection(
                StorageKeyParser.parse(entity.storageKey),
                HandleMode.valueOf(entity.mode),
                fromTag(
                    arcId,
                    requireNotNull(instantiatedParticles[entity.particleName]) {
                        "${entity.particleName} not instantiable for $arcId and $hostId"
                    },
                    entity.type,
                    entity.handleName
                ),
                entity.ttl.let { num -> if (num != 0.0) Ttl.Minutes(num.toInt()) else null }
            )
        )
    }

    /**
     * Using instantiated particle to obtain [Schema] objects throught their
     * associated [EntitySpec], reconstruct an associated [Type] object.
     */
    fun fromTag(arcId: String, particle: Particle, tag: String, handleName: String): Type {
        try {
            val schema = particle.handles.getEntitySpec(handleName).schema()
            return when (Tag.valueOf(tag)) {
                Tag.Singleton -> SingletonType(EntityType(schema))
                Tag.Collection -> CollectionType(EntityType(schema))
                Tag.Entity -> EntityType(schema)
                else -> throw IllegalArgumentException(
                    "Illegal Tag $tag when deserializing ArcHostContext"
                )
            }
        } catch (e: NoSuchElementException) {
            throw IllegalStateException("""
                Can't create Type $tag for Handle $handleName and ${particle::class}. This usually
                occurs because the Particle or ArcHost implementation has changed since
                the last time this arc was serialized.
            """.trimIndent(), e)
        }
    }

    /**
     * When recipe2plan is finished, the 'Plan' to serialize/deserialize ArcHost information
     * will be code-genned, and this method will mostly go away, in combination with
     * the move away from denormalized schemas to schema definitions using references.
     */
    fun createArcHostContextPersistencePlan(
        capability: Capabilities,
        arcId: String,
        hostId: String
    ): Plan.Partition {
        val resolver = CapabilitiesResolver(
            CapabilitiesResolver.CapabilitiesResolverOptions(arcId.toArcId())
        )

        // Because we don't have references/collections support yet, we use 3 handles/schemas
        val arcStateKey = resolver.createStorageKey(
            capability,
            ArcHostParticle_ArcHostContext_Spec.schema,
            "${hostId}_arcState"
        )

        val particlesStateKey = resolver.createStorageKey(
            capability,
            ArcHostParticle_Particles_Spec.schema,
            "${hostId}_arcState_particles"
        )

        val handleConnectionsKey = resolver.createStorageKey(
            capability,
            ArcHostParticle_HandleConnections_Spec.schema,
            "${hostId}_arcState_handleConnections"
        )

        return Plan.Partition(
            arcId,
            hostId,
            listOf(
                Plan.Particle(
                    "ArcHostContextParticle",
                    ArcHostContextParticle::class.toParticleIdentifier().id,
                    mapOf(
                        "arcHostContext" to Plan.HandleConnection(
                            arcStateKey!!,
                            HandleMode.ReadWrite,
                            SingletonType(
                                EntityType(ArcHostParticle_ArcHostContext_Spec.schema)
                            )
                        ),
                        "particles" to Plan.HandleConnection(
                            particlesStateKey!!,
                            HandleMode.ReadWrite,
                            CollectionType(
                                EntityType(ArcHostParticle_Particles_Spec.schema)
                            )
                        ),
                        "handleConnections" to Plan.HandleConnection(
                            handleConnectionsKey!!,
                            HandleMode.ReadWrite,
                            CollectionType(
                                EntityType(ArcHostParticle_HandleConnections_Spec.schema)
                            )
                        )
                    )
                )
            )
        )
    }
}

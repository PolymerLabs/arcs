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
package arcs.core.data

import arcs.core.data.Capability.Ttl
import arcs.core.data.expression.Expression
import arcs.core.storage.StorageKey
import arcs.core.type.Type
import arcs.core.util.lens

/**
 * A [Plan] is usually produced by running the build time Particle Accelerator tool, it consists
 * of a set of specs for handles, particles used in a recipe, and mappings between them.
 */
data class Plan(
    // TODO(cromwellian): add more fields as needed (e.g. RecipeName, etc for debugging)
    val particles: List<Particle>,
    val handles: List<Handle> = emptyList(),
    val annotations: List<Annotation> = emptyList()
) {
    val arcId: String?
        get() {
            return annotations.find { it.name == "arcId" }?.let {
                return it.getStringParam("id")
            }
        }

    /** Adds all [Schema]s from the [Plan] to the [SchemaRegistry]. */
    fun registerSchemas() {
        val connections = particles.flatMap { it.handles.values }
        val allTypes = handles.map { it.type } +
            connections.map { it.type } +
            connections.map { it.handle.type }

        allTypes.forEach { registerSchema(it) }
    }

    /** Add contained [Schema] to the [SchemaRegistry] */
    private fun registerSchema(type: Type?): Unit = when (type) {
        null -> Unit
        is TypeVariable -> registerSchema(type.constraint)
        is Type.TypeContainer<*> -> registerSchema(type.containedType)
        is EntitySchemaProviderType -> type.entitySchema?.let {
            SchemaRegistry.register(it)
        } ?: Unit
        else -> registerSchema(type.resolvedType)
    }

    /**
     * A [Particle] consists of the information necessary to instantiate a particle
     * when starting an arc.
     * @property particleName is human readable name of the Particle in the recipe.
     * @property location is either a fully qualified Java class name, or a filesystem path.
     * @property handles is a map from particle connection name to connection info.
     */
    data class Particle(
        val particleName: String,
        val location: String,
        val handles: Map<String, HandleConnection>
    ) {
        companion object {
            val locationLens = lens(Particle::location) { t, f -> t.copy(location = f) }
            val handlesLens = lens(Particle::handles) { t, f -> t.copy(handles = f) }
        }
    }

    /** A [Handle] representation for the [Plan]. */
    data class Handle(
        val storageKey: StorageKey,
        val type: Type,
        val annotations: List<Annotation>
    ) {
        companion object {
            val storageKeyLens =
                lens(Handle::storageKey) { t, f -> t.copy(storageKey = f) }
        }
    }

    /** Represents a use of a [Handle] by a [Particle]. */
    data class HandleConnection(
        val handle: Handle,
        val mode: HandleMode,
        val type: Type,
        val annotations: List<Annotation> = emptyList(),
        val expression: Expression<*>? = null
    ) {
        val storageKey: StorageKey
            get() = handle.storageKey

        val ttl: Ttl
            get() {
                return annotations.find { it.name == "ttl" }?.let {
                    return Ttl.fromString(it.getStringParam("value"))
                } ?: Ttl.Infinite()
            }

        companion object {
            val handleLens = lens(HandleConnection::handle) { t, f -> t.copy(handle = f) }
        }
    }

    /**
     * A [Plan.Partition] is a part of a [Plan] that runs on an [ArcHost]. Since [Plan]s may span
     * multiple [ArcHost]s, an [Allocator] must partition a plan by [ArcHost].
     */
    data class Partition(
        val arcId: String,
        val arcHost: String,
        val particles: List<Particle>
    ) {
        companion object {
            val particlesLens = lens(Partition::particles) { t, f -> t.copy(particles = f) }
        }
    }

    companion object {
        val particleLens = lens(Plan::particles) { t, f ->
            Plan(particles = f, handles = t.handles, annotations = t.annotations)
        }
    }
}

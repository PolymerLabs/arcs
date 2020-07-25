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


    /** Initialize the [Plan]. */
    fun init() {
        // Register all Schemas
        val allTypes = handles.map { it.type } + particles
            .flatMap { it.handles.values }
            .map { it.type }

        allTypes.forEach { registerSchema(it) }
    }

    /** Add contained [Schema]s to the [SchemaRegistry] */
    private fun registerSchema(type: Type?): Unit = when(type) {
        null -> Unit
        is EntitySchemaProviderType -> type.entitySchema?.let { SchemaRegistry.register(it) } ?: Unit
        is Type.TypeContainer<*> -> registerSchema(type.containedType)
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

    /** Represents the expression to be evaluated to produce a new field. */
    data class AdapterField<T>(
        val fieldName: String,
        val expression: Expression<T>
    )

    /**
     *  Represents a data adapter to be applied to a [Handle].
     *
     *  @property name name of the adapter specified in the manifest.
     *  @property contextParams the names of parameters that can be bound from context
     *  @property type the output [Type] of this adapter
     *  @property fields a list of fields (with expressions) that map contextParams to output [type]
     */
    data class Adapter(
        val name: String,
        val contextParams: List<String>,
        val type: Type,
        val fields: List<AdapterField<*>>
    )

    /** Represents a use of a [Handle] by a [Particle]. */
    data class HandleConnection(
        val handle: Handle,
        val mode: HandleMode,
        val type: Type,
        val annotations: List<Annotation> = emptyList(),
        val adapter: Adapter? = null
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

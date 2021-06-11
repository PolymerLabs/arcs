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

import arcs.core.storage.StorageKeyManager
import arcs.core.type.Type

/** Representation of recipe in an Arcs manifest. */
data class Recipe(
  val name: String?,
  val handles: Map<String, Handle>,
  val particles: List<Particle>,
  val annotations: List<Annotation> = emptyList()
) {
  /** The name of the policy with which this recipe must comply. */
  val policyName: String?
    get() = annotations.find { it.name == "policy" }?.getStringParam("name")

  /** Representation of a particle in a recipe. */
  data class Particle(
    val spec: ParticleSpec,
    val handleConnections: List<HandleConnection>
  ) {
    private val hashCode by lazy { 31 * spec.hashCode() + handleConnections.hashCode() }

    /** Representation of a handle connection in a particle. */
    data class HandleConnection(
      val spec: HandleConnectionSpec,
      val handle: Handle,
      val type: Type
    )

    override fun equals(other: Any?): Boolean {
      if (this === other) return true
      if (other !is Particle) return false

      if (spec != other.spec) return false
      if (handleConnections != other.handleConnections) return false

      return true
    }

    override fun hashCode(): Int = hashCode
  }

  /** Definition of a handle in a recipe. */
  data class Handle(
    val name: String,
    val fate: Fate,
    val type: Type,
    val storageKey: String? = null,
    val annotations: List<Annotation> = emptyList(),
    val associatedHandles: List<Handle> = emptyList(),
    val id: String = "",
    val tags: List<String> = emptyList()
  ) {
    enum class Fate {
      CREATE, USE, MAP, COPY, JOIN
    }

    private val hashCode by lazy {
      var result = name.hashCode()
      result = 31 * result + fate.hashCode()
      result = 31 * result + type.hashCode()
      result = 31 * result + (storageKey?.hashCode() ?: 0)
      result = 31 * result + annotations.hashCode()
      result = 31 * result + associatedHandles.hashCode()
      result = 31 * result + id.hashCode()
      result = 31 * result + tags.hashCode()
      result
    }

    val capabilities: Capabilities
      get() {
        return Capabilities.fromAnnotations(annotations)
      }

    override fun equals(other: Any?): Boolean {
      if (this === other) return true
      if (other !is Handle) return false

      if (name != other.name) return false
      if (fate != other.fate) return false
      if (type != other.type) return false
      if (storageKey != other.storageKey) return false
      if (annotations != other.annotations) return false
      if (associatedHandles != other.associatedHandles) return false
      if (id != other.id) return false
      if (tags != other.tags) return false

      return true
    }

    override fun hashCode(): Int = hashCode
  }
}

/** Translates a [Recipe] into a [Plan] */
fun Recipe.toPlan() = Plan(
  particles = particles.map { it.toPlanParticle() },
  handles = handles.values.map { it.toPlanHandle() },
  annotations = annotations
)

/** Translates a [Recipe.Handle] into a [Plan.Handle] */
fun Recipe.Handle.toPlanHandle() = Plan.Handle(
  type = type,
  storageKey = StorageKeyManager.GLOBAL_INSTANCE.parse(requireNotNull(storageKey)),
  annotations = annotations
)

/** Translates a [Recipe.Particle] into a [Plan.Particle] */
fun Recipe.Particle.toPlanParticle() = Plan.Particle(
  particleName = spec.name,
  location = when {
    spec.location.isNotEmpty() -> spec.location
    handleConnections.any { it.spec.expression != null } ->
      // Direct reference would causes a cyclic dependency.
      // Test verifies it matches the qualified name of a particle class.
      "arcs.core.data.expression.EvaluatorParticle"
    else -> ""
  },
  handles = handleConnections.associate { it.spec.name to it.toPlanHandleConnection() }
)

/** Translates a [Recipe.Particle.HandleConnection] into a [Plan.HandleConnection] */
fun Recipe.Particle.HandleConnection.toPlanHandleConnection() = Plan.HandleConnection(
  handle = handle.toPlanHandle(),
  mode = spec.direction,
  type = type,
  annotations = handle.annotations,
  expression = spec.expression
)

/** Translates a [Recipe.Handle] into a [StorageKey] */
fun Recipe.Handle.toStorageKey() = when {
  storageKey != null -> StorageKeyManager.GLOBAL_INSTANCE.parse(storageKey)
  else -> CreatableStorageKey(name)
}

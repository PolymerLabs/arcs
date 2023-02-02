/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.data.builder

import arcs.core.data.Annotation
import arcs.core.data.AnnotationParam
import arcs.core.data.HandleMode
import arcs.core.data.Plan
import arcs.core.data.expression.Expression
import arcs.core.storage.StorageKey
import arcs.core.type.Type

/**
 * Builds a [Plan] using a [PlanBuilder] lambda.
 *
 * Example:
 *
 * ```kotlin
 * // The fooStore will be shared between more than one plan, so we will create it outside of our
 * // plan builder.
 * val fooStore = handle(RamDiskStorageKey("foos")) {
 *   annotation("encrypted")
 *   annotation("ttl") { param("duration", "15 days" }
 *
 *   type = CollectionType(..)
 * }
 *
 * val fooToBarPlan = plan {
 *   // Add our pre-created handle to the plan.
 *   addExisting(fooStore)
 *
 *   // Bar store doesn't need to be shared, so let's make it local to our plan by declaring
 *   // it here. We still store the built handle to a variable so we can reference it when
 *   // defining particles below, however.
 *   val barStore = handle(RamDiskStorageKey("bars")) {
 *     type = CollectionType(..)
 *   }
 *
 *   particle("FooToBar", "com.company.FooToBarParticle") {
 *     connection("foos", HandleMode.Read, fooStore)
 *     connection("bars", HandleMode.Write, barStore)
 *   }
 *
 *   particle("BarLogger", "com.company.BarLoggerParticle") {
 *     connection("bars", HandleMode.Read, barStore)
 *   }
 * }
 * ```
 */
fun plan(block: PlanBuilder.() -> Unit = {}): Plan = PlanBuilder().apply(block).build()

/**
 * Builds a [Plan.Handle] using a [PlanBuilder.HandleBuilder] lambda.
 *
 * Note: `type` must be specified within the lambda.
 *
 * Example:
 *
 * ```kotlin
 * val fooStore = handle(RamDiskStorageKey("foos")) {
 *   annotation("encrypted")
 *   annotation("ttl") { param("duration", "15 days" }
 *
 *   type = CollectionType(..)
 * }
 * ```
 */
fun handle(storageKey: StorageKey, block: PlanBuilder.HandleBuilder.() -> Unit): Plan.Handle =
  PlanBuilder.HandleBuilder(storageKey).apply(block).build()

/**
 * Builds a [Plan.Handle] using an optional [PlanBuilder.HandleBuilder] lambda.
 */
fun handle(
  storageKey: StorageKey,
  type: Type,
  block: PlanBuilder.HandleBuilder.() -> Unit = {}
): Plan.Handle = PlanBuilder.HandleBuilder(storageKey, type).apply(block).build()

/**
 * Builds a [Plan.Particle] using an optional [PlanBuilder.ParticleBuilder] lambda.
 *
 * The [name] is the particle name, [location] is either a fully-qualified Java class name or a
 * filesystem path.
 *
 * Example:
 *
 * ```kotlin
 * val fooStore = handle(..)
 * val barStore = handle(..)
 *
 * particle("FooToBar", "com.company.FooToBarParticle") {
 *   connection("foos", HandleMode.Read, fooStore)
 *   connection("bars", HandleMode.Write, barStore)
 * }
 * ```
 */
fun particle(
  name: String,
  location: String,
  block: PlanBuilder.ParticleBuilder.() -> Unit = {}
): Plan.Particle = PlanBuilder.ParticleBuilder(name, location).apply(block).build()

/**
 * Builds a [Plan.HandleConnection] using a [PlanBuilder.HandleConnectionBuilder] lambda.
 *
 * Example:
 *
 * ```kotlin
 * val fooConn = handleConnection(HandleMode.Read, fooStore) {
 *   type = // Subtype of fooStore's type, if unspecified - fooStore.type is used.
 *   expression = // Expression the handle uses.
 * }
 * ```
 */
fun handleConnection(
  mode: HandleMode,
  handle: Plan.Handle,
  block: PlanBuilder.HandleConnectionBuilder.() -> Unit = {}
): Plan.HandleConnection = PlanBuilder.HandleConnectionBuilder(mode, handle).apply(block).build()

/** Builder of [Plan] objects. */
@DataDsl
class PlanBuilder internal constructor() {
  private val particles = mutableSetOf<Plan.Particle>()
  private val handles = mutableSetOf<Plan.Handle>()
  private val annotations = mutableSetOf<Annotation>()

  /** Sets the arc id for the [Plan] being built. */
  var arcId: String?
    set(value) {
      annotations.removeAll { it.name == "arcId" }
      if (value != null) annotation("arcId") { param("id", value) }
    }
    get() {
      val arcIdAnnotation = annotations.find { it.name == "arcId" } ?: return null
      val idParam = arcIdAnnotation.params["id"] as? AnnotationParam.Str ?: return null
      return idParam.value
    }

  /** Adds a pre-built [Plan.Handle] to the [Plan] being built. */
  fun add(handle: Plan.Handle): PlanBuilder {
    handles.add(handle)
    return this
  }

  /** Adds a pre-built [Plan.Particle] to the [Plan] being built. */
  fun add(particle: Plan.Particle): PlanBuilder {
    particles.add(particle)
    handles.addAll(particle.handles.values.map { it.handle })
    return this
  }

  /** Adds a pre-built [Annotation] to the [Plan] being built. */
  fun add(annotation: Annotation): PlanBuilder {
    annotations.add(annotation)
    return this
  }

  /** Adds a new [Plan.Handle] to the [Plan] being built. */
  fun handle(storageKey: StorageKey, block: HandleBuilder.() -> Unit): Plan.Handle =
    HandleBuilder(storageKey).apply(block).build().also(this::add)

  /** Adds a new [Plan.Handle] to the [Plan] being built. */
  fun handle(
    storageKey: StorageKey,
    type: Type,
    block: HandleBuilder.() -> Unit = {}
  ): Plan.Handle = HandleBuilder(storageKey, type).apply(block).build().also(this::add)

  /** Adds a [Plan.Particle] to the [Plan] being built. */
  fun particle(
    name: String,
    location: String,
    block: ParticleBuilder.() -> Unit = {}
  ): Plan.Particle {
    return ParticleBuilder(name, location).apply(block).build().also(this::add)
  }

  /** Adds an [Annotation] to the [Plan] being built. */
  fun annotation(name: String, block: AnnotationBuilder.() -> Unit = {}): Annotation =
    AnnotationBuilder(name).apply(block).build().also(this::add)

  fun build(): Plan = Plan(particles.toList(), handles.toList(), annotations.toList())

  /**
   * Builder of [Plan.Handle] objects.
   *
   * Note: `type` must be specified.
   *
   * Example:
   *
   * ```kotlin
   * val fooHandle = handle(RamDiskStorageKey("foos")) {
   *   annotation("encrypted")
   *   annotation("ttl") { param("duration", "15 days" }
   *
   *   type = fooType
   * }
   * ```
   */
  @DataDsl
  class HandleBuilder(var storageKey: StorageKey, private var backingType: Type? = null) {
    var type: Type
      get() = requireNotNull(backingType) { "Type must be specified in Plan.Handle builder" }
      set(value) { backingType = value }

    private val annotations = mutableSetOf<Annotation>()

    /** Adds a pre-built [Annotation] to the [Plan.Handle] being built. */
    fun add(annotation: Annotation): HandleBuilder {
      annotations.add(annotation)
      return this
    }

    /** Adds an [Annotation] to the [Plan.Handle] being built. */
    fun annotation(name: String, block: AnnotationBuilder.() -> Unit = {}): Annotation =
      AnnotationBuilder(name).apply(block).build().also(this::add)

    /** Builds the [Plan.Handle]. */
    fun build(): Plan.Handle = Plan.Handle(storageKey, type, annotations.toList())
  }

  /**
   * Builder of [Plan.Particle] objects.
   *
   * Example:
   *
   * ```kotlin
   * val plan = plan {
   *   val fooHandle = handle {
   *     // ...
   *   }
   *
   *   particle("BarParticle", "com.company.particles.BarParticle") {
   *     handleConnection("foos", HandleMode.ReadWrite, fooHandle)
   *   }
   * }
   * ```
   */
  @DataDsl
  class ParticleBuilder internal constructor(
    private val name: String,
    private val location: String
  ) {
    private val handles = mutableMapOf<String, Plan.HandleConnection>()

    /**
     * Adds an already-built [Plan.HandleConnection] to the [Plan.Particle] being built.
     *
     * Example:
     *
     * ```kotlin
     * val barConn = handleConnection(...)
     *
     * particle("BarParticle", "com.company.particles.BarParticle") {
     *   + ("bars" to barConn)
     * }
     * ```
     */
    fun add(namedHandleConn: Pair<String, Plan.HandleConnection>): ParticleBuilder {
      handles[namedHandleConn.first] = namedHandleConn.second
      return this
    }

    /** Adds a [Plan.HandleConnection] to the [Plan.Particle] being built. */
    fun handleConnection(
      name: String,
      mode: HandleMode,
      handle: Plan.Handle,
      block: HandleConnectionBuilder.() -> Unit = {}
    ): Plan.HandleConnection {
      return HandleConnectionBuilder(mode, handle).apply(block).build().also { add(name to it) }
    }

    fun build(): Plan.Particle = Plan.Particle(name, location, handles.toMap())
  }

  /**
   * Builder of [Plan.HandleConnection] objects.
   *
   * Example:
   *
   * ```kotlin
   * val plan = plan {
   *   val foohandle = handle { ... }
   *
   *   particle("BarParticle", "com.company.particles.BarParticle") {
   *     handleConnection("foos", HandleMode.ReadWrite, fooHandle) {
   *       handle = foohandle
   *       annotation("ttl") {
   *         param("duration", "15 days")
   *       }
   *     }
   *   }
   * }
   * ```
   */
  @DataDsl
  class HandleConnectionBuilder internal constructor(
    private val mode: HandleMode,
    var handle: Plan.Handle
  ) {
    /**
     * The [Type] of the [HandleConnection]. This can differ from the type of the [Handle] because
     * particles can declare they only need a subset of a handle type's fields.
     */
    var type: Type = handle.type
    /** An optional [Expression] to associate with the [HandleConnection] being built. */
    var expression: Expression<*>? = null

    private val annotations = mutableSetOf<Annotation>()

    /** Adds a pre-built [Annotation] to the [HandleConnection] being built. */
    fun add(annotation: Annotation): HandleConnectionBuilder {
      annotations.add(annotation)
      return this
    }

    /** Adds an [Annotation] to the [HandleConnection] being built. */
    fun annotation(name: String, block: AnnotationBuilder.() -> Unit = {}): Annotation =
      AnnotationBuilder(name).apply(block).build().also(this::add)

    /** Builds the [Plan.HandleConnection]. */
    fun build(): Plan.HandleConnection =
      Plan.HandleConnection(handle, mode, type, annotations.toList(), expression)
  }
}

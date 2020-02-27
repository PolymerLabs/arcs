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

package arcs.sdk

/**
 * Interface used by [ArcHost]s to interact dynamically with code-generated [Handle] fields
 * used by [Particle]s.
 */
typealias HandleHolder = arcs.core.host.HandleHolder

/** Base interface for all particles. */
typealias Particle = arcs.core.host.Particle

/**
 * Base class used by `schema2kotlin` code-generator tool to generate a class containing all
 * declared handles.
 */
abstract class HandleHolderBase(
    override val handles: Map<String, Handle>,
    override val entitySpecs: Map<String, EntitySpec<out Entity>>
) : HandleHolder

/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.storage

import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update

/**
 * Manages a single global [DriverFactory] instance.
 */
object DefaultDriverFactory {
  private val instance = atomic(FixedDriverFactory(emptySet()))

  /** Return the current [DriverFactory]. */
  fun get(): DriverFactory = instance.value

  /** Replace the current [DriverFactory] with a new one supporting the provided set of drivers. */
  fun update(providers: Set<DriverProvider>) {
    instance.update {
      FixedDriverFactory(providers)
    }
  }

  /** Replace the current [DriverFactory] with a new one supporting the provided set of drivers. */
  fun update(vararg providers: DriverProvider) {
    update(providers.toSet())
  }
}

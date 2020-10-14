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
  private val instance = atomic(FixedDriverFactory(emptyList()))

  /** Return the current [DriverFactory]. */
  fun get(): DriverFactory = instance.value

  /**
   * Replace the current [DriverFactory] with a new one supporting the provided set of drivers.
   *
   * If multiple [DriverProvider]s return `true` for [willSupport], the one that occurs the
   * earliest in the list will be selected.
   */
  fun update(providers: List<DriverProvider>) {
    instance.update {
      FixedDriverFactory(providers)
    }
  }

  /**
   * Replace the current [DriverFactory] with a new one supporting the provided set of drivers.
   *
   * If multiple [DriverProvider]s return `true` for [willSupport], the one that occurs the
   * earliest in the list of arguments will be selected.
   */
  fun update(vararg providers: DriverProvider) {
    update(providers.asList())
  }
}

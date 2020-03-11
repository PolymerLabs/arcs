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
package arcs.core.util

import kotlin.math.pow
import kotlin.random.Random as KotlinRandom

/**
 * Instance of [kotlin.random.Random] to use arcs-wide.
 *
 * TODO: Consider seeding the random object ourselves. Unfortunately kotlin.system.getTimeMillis
 *   isn't in the common kotlin library. This will mean we need to make this an `expect` and
 *   implement it for JVM, JS, and WASM targets. Bonus points for using SecureRandom when running in
 *   JVM.
 */
val Random: KotlinRandom
    get() = RandomBuilder(null)

/**
 * Generator of a kotlin random class instance.
 *
 * This variable is configurable so as to make it possible for tests to make predictable 'random'
 * behavior possible.
 */
var RandomBuilder: (seed: Long?) -> KotlinRandom = fn@{ seed ->
    val globalRandom = globalRandomInstance

    @Suppress("IfThenToElvis") // Because it's more readable like this.
    if (globalRandom != null) {
        // If we've already initialized the global random instance, use it.
        return@fn globalRandom
    } else {
        // Looks like we need to initialize it still, so - depending on whether or not we have a
        // seed, either return a seeded KotlinRandom, or the default.
        return@fn (seed?.let { KotlinRandom(seed) } ?: KotlinRandom.Default)
            // Stash it as the global instance.
            .also { globalRandomInstance = it }
    }
}

/** Gets the next Arcs-safe random long value. */
fun KotlinRandom.nextSafeRandomLong(): Long = Random.nextLong(MAX_SAFE_LONG)

private val MAX_SAFE_LONG = 2.0.pow(50).toLong()
private var globalRandomInstance: KotlinRandom? = null

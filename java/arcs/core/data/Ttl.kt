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

/**  A class containing retention policy information. */
data class Ttl(
    val count: Int?,
    val units: Units?
) {
    enum class Units {
        Minute,
        Hour,
        Day
    }

    fun isInfinite(): Boolean = this == Ttl.Infinite

    companion object {
        val Infinite = Ttl(-1, null)
    }
}

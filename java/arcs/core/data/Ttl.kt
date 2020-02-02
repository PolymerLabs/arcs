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

/** A class containing retention policy information. */
data class Ttl(
    val count: Int,
    val units: Units?
) {
    init {
        require((count >= 0 && units != null) || (count == -1 && units == null)) {
            "count must be non-negative when units are provided, or -1 if units is null"
        }
    }

    enum class Units {
        Minute,
        Hour,
        Day
    }

    val isInfinite: Boolean
        get() = this.count == -1 && this.units == null

    override fun equals(other: Any?): Boolean =
        other is Ttl && this.minutes == other.minutes

    override fun hashCode(): Int = this.minutes.hashCode()

    val minutes: Int
        get() {
            if (this.isInfinite) {
                return -1
            }
            return count * when (this.units) {
                Units.Minute -> 1
                Units.Hour -> 60
                Units.Day -> 60 * 24
                null -> {
                    throw UnsupportedOperationException("Units not available")
                }
            }
        }

    companion object {
        val Infinite = Ttl(-1, null)
    }
}

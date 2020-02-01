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
    val count: Int,
    val units: Units?
) {
    enum class Units {
        Minute,
        Hour,
        Day
    }

    fun isInfinite(): Boolean = this == Ttl.Infinite

    override fun equals(other: Any?): Boolean =
        other is Ttl && this.toMinutes() == other.toMinutes()

    override fun hashCode(): Int = this.toMinutes().hashCode()

    fun toMinutes(): Int {
        when (this.units) {
            Units.Minute -> return this.count
            Units.Hour -> return this.count * 60
            Units.Day -> return this.count * 60 * 24
            else -> { // Note the block
                throw IllegalArgumentException("Unsupported TTL units: ${this.units}")
            }
        }
    }

    companion object {
        val Infinite = Ttl(-1, null)
    }
}

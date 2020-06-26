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

/**
 * Store capabilities containing a combination of individual [CapabilityNew]s (e.g. Persistence
 * and/or Ttl and/or Queryable etc).
 * If a certain capability does not appear in the combination, it is not restricted.
 */
class CapabilitiesNew(capabilities: List<CapabilityNew> = emptyList()) {
    val ranges: List<CapabilityNew.Range>

    init {
        ranges = capabilities.map { it -> it.toRange() }
        require(ranges.distinctBy { it.min.tag }.size == capabilities.size) {
            "Capabilities must be unique $capabilities."
        }
    }

    val persistence: CapabilityNew.Persistence?
        get() = getCapability<CapabilityNew.Persistence>()

    val ttl: CapabilityNew.Ttl?
        get() = getCapability<CapabilityNew.Ttl>()

    val isEncrypted: Boolean?
        get() = getCapability<CapabilityNew.Encryption>()?.let { it.value }

    val isQueryable: Boolean?
        get() = getCapability<CapabilityNew.Queryable>()?.let { it.value }

    val isShareable: Boolean?
        get() = getCapability<CapabilityNew.Shareable>()?.let { it.value }

    val isEmpty = ranges.isEmpty()

    /**
     * Returns true, if the given [CapabilityNew] is within the corresponding [CapabilityNew.Range]
     * of same type of this.
     * For example, [CapabilitiesNew] with Ttl range of 1-5 days `contains` a Ttl of 3 days.
     */
    fun contains(capability: CapabilityNew): Boolean {
        val otherTag = when (capability.tag) {
            CapabilityNew.Range.TAG -> (capability as CapabilityNew.Range).min.tag
            else -> capability.tag
        }
        return ranges.find { it.min.tag == otherTag }?.contains(capability) ?: false
    }

    /**
     * Returns true if all ranges in the given [CapabilitiesNew] are contained in this.
     */
    fun containsAll(other: CapabilitiesNew): Boolean {
        return other.ranges.all { otherRange -> contains(otherRange) }
    }

    private inline fun <reified T : CapabilityNew> getCapability(): T? {
        return ranges.find { it.min is T }?.let {
            require(it.min.isEquivalent(it.max)) { "Cannot get capability for a range" }
            it.min as T
        }
    }

    companion object {
        fun fromAnnotations(annotations: List<Annotation>): CapabilitiesNew {
            val ranges = mutableListOf<CapabilityNew.Range>()
            CapabilityNew.Persistence.fromAnnotations(annotations)?.let {
                ranges.add(it.toRange())
            }
            CapabilityNew.Encryption.fromAnnotations(annotations)?.let { ranges.add(it.toRange()) }
            CapabilityNew.Ttl.fromAnnotations(annotations)?.let { ranges.add(it.toRange()) }
            CapabilityNew.Queryable.fromAnnotations(annotations)?.let { ranges.add(it.toRange()) }
            CapabilityNew.Shareable.fromAnnotations(annotations)?.let { ranges.add(it.toRange()) }
            return CapabilitiesNew(ranges)
        }
    }
}

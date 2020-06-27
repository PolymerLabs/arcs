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
 * Store capabilities containing a combination of individual [Capability]s (e.g. Persistence
 * and/or Ttl and/or Queryable etc).
 * If a certain capability does not appear in the combination, it is not restricted.
 */
class Capabilities(capabilities: List<Capability> = emptyList()) {
    val ranges: List<Capability.Range>

    constructor(capability: Capability) : this(listOf(capability))

    init {
        ranges = capabilities.map { it -> it.toRange() }
        require(ranges.distinctBy { it.min.tag }.size == capabilities.size) {
            "Capabilities must be unique $capabilities."
        }
    }

    val persistence: Capability.Persistence?
        get() = getCapability<Capability.Persistence>()

    val ttl: Capability.Ttl?
        get() = getCapability<Capability.Ttl>()

    val isEncrypted: Boolean?
        get() = getCapability<Capability.Encryption>()?.let { it.value }

    val isQueryable: Boolean?
        get() = getCapability<Capability.Queryable>()?.let { it.value }

    val isShareable: Boolean?
        get() = getCapability<Capability.Shareable>()?.let { it.value }

    val isEmpty = ranges.isEmpty()

    /**
     * Returns true, if the given [Capability] is within the corresponding [Capability.Range]
     * of same type of this.
     * For example, [Capabilities] with Ttl range of 1-5 days `contains` a Ttl of 3 days.
     */
    fun contains(capability: Capability): Boolean {
        val otherTag = when (capability.tag) {
            Capability.Range.TAG -> (capability as Capability.Range).min.tag
            else -> capability.tag
        }
        return ranges.find { it.min.tag == otherTag }?.contains(capability) ?: false
    }

    /**
     * Returns true if all ranges in the given [Capabilities] are contained in this.
     */
    fun containsAll(other: Capabilities): Boolean {
        return other.ranges.all { otherRange -> contains(otherRange) }
    }

    private inline fun <reified T : Capability> getCapability(): T? {
        return ranges.find { it.min is T }?.let {
            require(it.min.isEquivalent(it.max)) { "Cannot get capability for a range" }
            it.min as T
        }
    }

    companion object {
        fun fromAnnotations(annotations: List<Annotation>): Capabilities {
            val ranges = mutableListOf<Capability.Range>()
            Capability.Persistence.fromAnnotations(annotations)?.let {
                ranges.add(it.toRange())
            }
            Capability.Encryption.fromAnnotations(annotations)?.let { ranges.add(it.toRange()) }
            Capability.Ttl.fromAnnotations(annotations)?.let { ranges.add(it.toRange()) }
            Capability.Queryable.fromAnnotations(annotations)?.let { ranges.add(it.toRange()) }
            Capability.Shareable.fromAnnotations(annotations)?.let { ranges.add(it.toRange()) }
            return Capabilities(ranges)
        }

        fun fromAnnotation(annotation: Annotation) = fromAnnotations(listOf(annotation))
    }
}

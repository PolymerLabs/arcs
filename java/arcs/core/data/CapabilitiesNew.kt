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

/** Store capabilities containing a grouping of individual capabilities */
class CapabilitiesNew(val ranges: List<CapabilityNew.Range> = emptyList()) {

    val persistence: CapabilityNew.Persistence?
        get() {
            return ranges.find { it.min is CapabilityNew.Persistence }?.let {
                require(it.min.isEquivalent(it.max)) { "Cannot get Persistence for a range" }
                return it.min as CapabilityNew.Persistence
            }
        }

    val ttl: CapabilityNew.Ttl?
        get() {
            return ranges.find { it.min is CapabilityNew.Ttl }?.let {
                require(it.min.isEquivalent(it.max)) { "Cannot get Ttl for a range" }
                return it.min as CapabilityNew.Ttl
            }
        }

    val isEncrypted: Boolean?
        get() {
            return ranges.find { it.min is CapabilityNew.Encryption }?.let {
                require(it.min.isEquivalent(it.max)) { "Cannot get Encryption for a range" }
                return (it.min as CapabilityNew.Encryption).value
            }
        }

    val isQueryable: Boolean?
        get() {
            return ranges.find { it.min is CapabilityNew.Queryable }?.let {
                require(it.min.isEquivalent(it.max)) { "Cannot get Queryable for a range" }
                return (it.min as CapabilityNew.Queryable).value
            }
        }

    val isShareable: Boolean?
        get() {
            return ranges.find { it.min is CapabilityNew.Shareable }?.let {
                require(it.min.isEquivalent(it.max)) { "Cannot get Encryption for a range" }
                return (it.min as CapabilityNew.Shareable).value
            }
        }

    val isEmpty = ranges.isEmpty()

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

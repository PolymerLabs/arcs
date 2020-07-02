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

package arcs.core.policy

import arcs.core.data.Annotation
import arcs.core.data.Capabilities
import arcs.core.data.Capability

/** Defines a data usage policy. See [PolicyProto] for the canonical definition of a policy. */
data class Policy(
    val name: String,
    val egressType: EgressType,
    val description: String = "",
    val targets: List<PolicyTarget> = emptyList(),
    val configs: Map<String, PolicyConfig> = emptyMap(),
    val annotations: List<Annotation> = emptyList()
) {
    /** The name of the egress particle that matches this policy. */
    val egressParticleName = "Egress_$name"

    /** The set of all fields (included nested fields). */
    val allFields: Set<PolicyField> = computeAllFields()

    /** The set of all redaction labels mentioned in the policy. */
    val allRedactionLabels: Set<String> = allFields.flatMap { it.redactedUsages.keys }.toSet()

    private fun computeAllFields(): Set<PolicyField> {
        val result = mutableSetOf<PolicyField>()
        fun addField(field: PolicyField) {
            result.add(field)
            field.subfields.forEach { addField(it) }
        }
        targets.forEach { target ->
            target.fields.forEach { addField(it) }
        }
        return result
    }
}

/** Target schema governed by a policy, see [PolicyTargetProto]. */
data class PolicyTarget(
    // TODO(b/157605232): Resolve the schema name to a type.
    val schemaName: String,
    val maxAgeMs: Long = 0,
    val retentions: List<PolicyRetention> = emptyList(),
    val fields: List<PolicyField> = emptyList(),
    val annotations: List<Annotation> = emptyList()
) {

    fun toCapabilities(): List<Capabilities> {
        return retentions.map {
            val ranges = mutableListOf<Capability>()
            ranges.add(when (it.medium) {
                StorageMedium.DISK -> Capability.Persistence.ON_DISK
                StorageMedium.RAM -> Capability.Persistence.IN_MEMORY
            })
            if (it.encryptionRequired) {
                ranges.add(Capability.Encryption(true))
            }
            ranges.add(Capability.Ttl.Minutes((maxAgeMs / Capability.Ttl.MILLIS_IN_MIN).toInt()))
            Capabilities(ranges)
        }
    }
}

/** Allowed usages for fields in a schema, see [PolicyFieldProto]. */
data class PolicyField(
    // TODO(b/157605232): Resolve the field name to a type.
    val fieldName: String,
    /** Valid usages of this field without redaction. */
    val rawUsages: Set<UsageType> = emptySet(),
    /** Valid usages of this field with redaction first. Maps from redaction label to usages. */
    val redactedUsages: Map<String, Set<UsageType>> = emptyMap(),
    val subfields: List<PolicyField> = emptyList(),
    val annotations: List<Annotation> = emptyList()
)

/** Retention options for storing data, see [PolicyRetentionProto]. */
data class PolicyRetention(
    val medium: StorageMedium,
    val encryptionRequired: Boolean
)

/**
 * Config options specified by a policy, see [PolicyConfigProto]. These are arbitrary string
 * key-value pairs set by the policy author. They have no direct affect on the policy itself.
 */
typealias PolicyConfig = Map<String, String>

/** Egress type permitted by a policy, see [PolicyProto.EgressType]. */
enum class EgressType {
    LOGGING,
    FEDERATED_AGGREGATION,
}

/** Type of usage permitted of a field, see [PolicyFieldProto.UsageType]. */
enum class UsageType {
    ANY,
    EGRESS,
    JOIN,
}

/** Target schema governed by a policy, see [PolicyRetentionProto.Medium]. */
enum class StorageMedium {
    RAM,
    DISK,
}

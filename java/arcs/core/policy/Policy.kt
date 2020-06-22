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

/** Defines a data usage policy. See [PolicyProto] for the canonical definition of a policy. */
data class Policy(
    val name: String,
    val description: String,
    val egressType: EgressType,
    val targets: List<PolicyTarget>,
    val configs: Map<String, PolicyConfig>,
    val annotations: List<Annotation>
)

/** Target schema governed by a policy, see [PolicyTargetProto]. */
data class PolicyTarget(
    // TODO(b/157605232): Resolve the schema name to a type.
    val schemaName: String,
    val maxAgeMs: Long,
    val retentions: List<PolicyRetention>,
    val fields: List<PolicyField>,
    val annotations: List<Annotation>
)

/** Allowed usages for fields in a schema, see [PolicyFieldProto]. */
data class PolicyField(
    // TODO(b/157605232): Resolve the field name to a type.
    val fieldName: String,
    /** Valid usages of this field without redaction. */
    val rawUsages: Set<UsageType>,
    /** Valid usages of this field with redaction first. Maps from redaction label to usages. */
    val redactedUsages: Map<String, Set<UsageType>>,
    val subfields: List<PolicyField>,
    val annotations: List<Annotation>
)

/** Retention options for storing data, see [PolicyRetentionProto]. */
data class PolicyRetention(
    val medium: StorageMedium,
    val encryptionRequired: Boolean
)

/** Target schema governed by a policy, see [PolicyConfigProto]. */
typealias PolicyConfig = Map<String, String>

/** Egress type permitted by a policy, see [PolicyProto.EgressType]. */
enum class EgressType {
    Logging,
    FederatedAggregation,
}

/** Type of usage permitted of a field, see [PolicyFieldProto.UsageType]. */
enum class UsageType {
    Any,
    Egress,
    Join,
}

/** Target schema governed by a policy, see [PolicyRetentionProto.Medium]. */
enum class StorageMedium {
    Ram,
    Disk,
}

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

package arcs.core.policy.proto

import arcs.core.data.proto.PolicyFieldProto
import arcs.core.data.proto.PolicyProto
import arcs.core.data.proto.PolicyRetentionProto
import arcs.core.data.proto.PolicyTargetProto
import arcs.core.data.proto.decode
import arcs.core.policy.EgressType
import arcs.core.policy.Policy
import arcs.core.policy.PolicyField
import arcs.core.policy.PolicyRetention
import arcs.core.policy.PolicyTarget
import arcs.core.policy.StorageMedium
import arcs.core.policy.UsageType

fun PolicyProto.decode(): Policy {
    return Policy(
        name = name,
        description = description,
        egressType = egressType.decode(),
        targets = targetsList.map { it.decode() },
        configs = configsList.associateBy(
            keySelector = { it.name },
            valueTransform = { it.metadataMap }
        ),
        annotations = annotationsList.map { it.decode() }
    )
}

private fun PolicyTargetProto.decode(): PolicyTarget {
    return PolicyTarget(
        schemaName = schemaType,
        maxAgeMs = maxAgeMs,
        retentions = retentionsList.map { it.decode() },
        fields = fieldsList.map { it.decode() },
        annotations = annotationsList.map { it.decode() }
    )
}

private fun PolicyFieldProto.decode(): PolicyField {
    val rawUsages = mutableSetOf<UsageType>()
    val redactedUsages = mutableMapOf<String, MutableSet<UsageType>>()
    for (usage in usagesList) {
        if (usage.redactionLabel.isEmpty()) {
            rawUsages.add(usage.usage.decode())
        } else {
            redactedUsages.getOrPut(usage.redactionLabel) {
                mutableSetOf()
            }.add(usage.usage.decode())
        }
    }
    return PolicyField(
        fieldName = name,
        rawUsages = rawUsages,
        redactedUsages = redactedUsages,
        subfields = subfieldsList.map { it.decode() },
        annotations = annotationsList.map { it.decode() }
    )
}

private fun PolicyRetentionProto.decode(): PolicyRetention {
    return PolicyRetention(
        medium = medium.decode(),
        encryptionRequired = encryptionRequired
    )
}

private fun PolicyProto.EgressType.decode() = when (this) {
    PolicyProto.EgressType.LOGGING -> EgressType.LOGGING
    PolicyProto.EgressType.FEDERATED_AGGREGATION -> EgressType.FEDERATED_AGGREGATION
    PolicyProto.EgressType.EGRESS_TYPE_UNSPECIFIED, PolicyProto.EgressType.UNRECOGNIZED ->
        throw UnsupportedOperationException("Unknown egress type: $this")
}

private fun PolicyFieldProto.UsageType.decode() = when (this) {
    PolicyFieldProto.UsageType.ANY -> UsageType.ANY
    PolicyFieldProto.UsageType.EGRESS -> UsageType.EGRESS
    PolicyFieldProto.UsageType.JOIN -> UsageType.JOIN
    PolicyFieldProto.UsageType.USAGE_TYPE_UNSPECIFIED, PolicyFieldProto.UsageType.UNRECOGNIZED ->
        throw UnsupportedOperationException("Unknown usage type: $this")
}

private fun PolicyRetentionProto.Medium.decode() = when (this) {
    PolicyRetentionProto.Medium.RAM -> StorageMedium.RAM
    PolicyRetentionProto.Medium.DISK -> StorageMedium.DISK
    PolicyRetentionProto.Medium.MEDIUM_UNSPECIFIED, PolicyRetentionProto.Medium.UNRECOGNIZED ->
        throw UnsupportedOperationException("Unknown retention medium: $this")
}

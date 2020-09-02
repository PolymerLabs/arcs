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

package arcs.core.data.proto

import arcs.core.data.InformationFlowLabel
import arcs.core.data.InformationFlowLabel.Predicate

/** Decodes an [InformationFlowLabelProto] into [InformationFlowLabel]. */
fun InformationFlowLabelProto.decode() = when (labelCase) {
    InformationFlowLabelProto.LabelCase.SEMANTIC_TAG ->
        InformationFlowLabel.SemanticTag(semanticTag)
    InformationFlowLabelProto.LabelCase.LABEL_NOT_SET ->
        throw IllegalArgumentException("Unknown information flow label.")
    else -> throw IllegalArgumentException("Cannot decode a [InformationLabelProto].")
}

/** Encodes an [InformationFlowLabel.SemanticTag] into [InformationFlowLabelProto]. */
fun InformationFlowLabel.SemanticTag.encode(): InformationFlowLabelProto {
    return InformationFlowLabelProto.newBuilder().setSemanticTag(name).build()
}

/** Encodes an [InformationFlowLabel.Predicate] into [InformationFlowLabelProto.Predicate]. */
fun Predicate.encode(): InformationFlowLabelProto.Predicate {
    val proto = InformationFlowLabelProto.Predicate.newBuilder()
    when (this) {
        is Predicate.Label -> {
            val label = requireNotNull(label as? InformationFlowLabel.SemanticTag) {
                "Unsupported label type: $label"
            }
            proto.label = InformationFlowLabelProto.newBuilder().setSemanticTag(label.name).build()
        }
        is Predicate.Not -> proto.not = InformationFlowLabelProto.Predicate.Not.newBuilder()
            .setPredicate(predicate.encode())
            .build()
        is Predicate.Or -> proto.or = InformationFlowLabelProto.Predicate.Or.newBuilder()
            .setDisjunct0(lhs.encode())
            .setDisjunct1(rhs.encode())
            .build()
        is Predicate.And -> proto.and = InformationFlowLabelProto.Predicate.And.newBuilder()
            .setConjunct0(lhs.encode())
            .setConjunct1(rhs.encode())
            .build()
        else -> throw UnsupportedOperationException("Unsupported Predicate type: $this")
    }
    return proto.build()
}

/** Decodes an [InformationFlowLabelProto.Predicate] into [InformationFlowLabel.Predicate]. */
fun InformationFlowLabelProto.Predicate.decode(): Predicate = when (predicateCase) {
    InformationFlowLabelProto.Predicate.PredicateCase.LABEL ->
        Predicate.Label(label.decode())
    InformationFlowLabelProto.Predicate.PredicateCase.NOT ->
        Predicate.Not(not.predicate.decode())
    InformationFlowLabelProto.Predicate.PredicateCase.OR ->
        Predicate.Or(or.disjunct0.decode(), or.disjunct1.decode())
    InformationFlowLabelProto.Predicate.PredicateCase.AND ->
        Predicate.And(and.conjunct0.decode(), and.conjunct1.decode())
    else -> TODO("TODO(bgogul): Implement the rest of the predicate cases.")
}

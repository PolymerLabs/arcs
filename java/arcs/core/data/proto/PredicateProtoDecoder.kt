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

/** Decodes an [InformationFlowLabelProto.Predicate] into [InformationFlowLabel.Predicate]. */
fun InformationFlowLabelProto.Predicate.decode(): Predicate = when (predicateCase) {
    InformationFlowLabelProto.Predicate.PredicateCase.LABEL ->
        Predicate.Label(label.decode())
    InformationFlowLabelProto.Predicate.PredicateCase.NOT ->
        Predicate.Not(not.predicate.decode())
    else -> TODO("TODO(bgogul): Implement the rest of the predicate cases.")
}

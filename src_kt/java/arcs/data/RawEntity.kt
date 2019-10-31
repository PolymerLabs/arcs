/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.data

import arcs.common.Referencable
import arcs.common.ReferenceId

/** Minimal representation of an unresolved [Entity]. */
data class RawEntity(
    /** Singleton fields and the [Referencable] values. */
    val singletons: Map<FieldName, Referencable?> = emptyMap(),
    /**
     * Collection ([Set]) fields and the set of [ReferenceId]s referencing the values in those
     * collections.
     */
    val collections: Map<FieldName, Set<Referencable>> = emptyMap()
) {
    /** Constructor for a [RawEntity] when only the field names are known. */
    constructor(
        singletonFields: Set<FieldName> = emptySet(),
        collectionFields: Set<FieldName> = emptySet()
    ) : this(
        singletonFields.associateWith { null },
        collectionFields.associateWith { emptySet<Referencable>() }
    )

}

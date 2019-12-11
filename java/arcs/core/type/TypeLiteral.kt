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

package arcs.core.type

import arcs.core.common.Literal

/** Serialized form of a [Type]. */
interface TypeLiteral : Literal {
    /** Identifier of the [Type] this instance is a [TypeLiteral] for. */
    val tag: Tag

    /** Extra data required to instantiate the [Type] this [TypeLiteral] describes. */
    val data: Literal
        get() = object : Literal {}
}

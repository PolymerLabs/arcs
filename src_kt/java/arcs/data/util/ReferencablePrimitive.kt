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

package arcs.data.util

import arcs.common.Referencable
import arcs.common.ReferenceId

data class ReferencablePrimitive<T>(val value: T) : Referencable {
    override val id: ReferenceId
        get() = toString()
}

fun Int.toReferencable(): ReferencablePrimitive<Double> = ReferencablePrimitive(this.toDouble())
fun Float.toReferencable(): ReferencablePrimitive<Double> = ReferencablePrimitive(this.toDouble())
fun Double.toReferencable(): ReferencablePrimitive<Double> = ReferencablePrimitive(this)
fun String.toReferencable(): ReferencablePrimitive<String> = ReferencablePrimitive(this)
fun Boolean.toReferencable(): ReferencablePrimitive<Boolean> = ReferencablePrimitive(this)
fun ByteArray.toReferencable(): ReferencablePrimitive<ByteArray> = ReferencablePrimitive(this)

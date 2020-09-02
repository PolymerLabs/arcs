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

/** [Annotation] parameter's value: may be string, numeric or boolean. */
sealed class AnnotationParam {
    data class Str(val value: String) : AnnotationParam()
    data class Num(val value: Int) : AnnotationParam()
    data class Bool(val value: Boolean) : AnnotationParam()
}

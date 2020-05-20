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

package arcs.core.entity

/** A one element Tuple of [Storable]s */
data class Tuple1<
    out A : Storable
>(
    val first: A
) : Storable

/** A two element Tuple of [Storable]s */
data class Tuple2<
    out A : Storable,
    out B : Storable
>(
    val first: A,
    val second: B
) : Storable

/** A three element Tuple of [Storable]s */
data class Tuple3<
    out A : Storable,
    out B : Storable,
    out C : Storable
>(
    val first: A,
    val second: B,
    val third: C
) : Storable

/** A four element Tuple of [Storable]s */
data class Tuple4<
    out A : Storable,
    out B : Storable,
    out C : Storable,
    out D : Storable
>(
    val first: A,
    val second: B,
    val third: C,
    val fourth: D
) : Storable

/** A five element Tuple of [Storable]s */
data class Tuple5<
    out A : Storable,
    out B : Storable,
    out C : Storable,
    out D : Storable,
    out E : Storable
>(
    val first: A,
    val second: B,
    val third: C,
    val fourth: D,
    val fifth: E
) : Storable

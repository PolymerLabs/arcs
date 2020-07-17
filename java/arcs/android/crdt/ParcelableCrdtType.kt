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

package arcs.android.crdt

import arcs.core.crdt.CrdtModel

/** Enumeration of the parcelable [CrdtModel] types. */
enum class ParcelableCrdtType {
    Count,
    Set,
    Singleton,
    Entity,
}

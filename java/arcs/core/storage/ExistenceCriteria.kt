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

package arcs.core.storage

/** Storage existence criteria for data. */
enum class ExistenceCriteria {
    /** The data should already exist in storage. */
    ShouldExist,
    /** The data should **not** exist in storage yet. */
    ShouldCreate,
    /** The data may exist already, or may not.. no big whup. */
    MayExist
}

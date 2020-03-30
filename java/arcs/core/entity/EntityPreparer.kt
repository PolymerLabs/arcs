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

import arcs.core.common.Id
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.Ttl
import arcs.core.util.Time

/** Prepares the provided entity and serializes it for storage. */
@Suppress("GoodTime") // use Instant
class EntityPreparer<T : Entity>(
    val handleName: String,
    val idGenerator: Id.Generator,
    val schema: Schema,
    val ttl: Ttl,
    val time: Time
) {
    fun prepareEntity(entity: T): RawEntity {
        entity.ensureEntityFields(idGenerator, handleName, time, ttl)

        val rawEntity = entity.serialize()

        require(schema.refinement(rawEntity)) {
            "Invalid entity stored to handle $handleName(failed refinement)"
        }
        return rawEntity
    }
}

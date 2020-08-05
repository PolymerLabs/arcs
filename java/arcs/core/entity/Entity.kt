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

package arcs.core.entity

import arcs.core.common.Id
import arcs.core.common.Referencable
import arcs.core.data.Capability.Ttl
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.util.Time
import kotlin.IllegalArgumentException
import kotlin.reflect.KClass

interface Entity : Storable {
    /** The ID for the entity, or null if it is does not have one yet. */
    val entityId: String?

    /** The creation timestamp of the entity. Set at the same time the ID is set. */
    val creationTimestamp: Long

    /** The expiration timestamp of the entity. Set at the same time the ID is set. */
    val expirationTimestamp: Long

    /**
     * Generates a new ID for the Entity, if it doesn't already have one. Also sets creation
     * timestamp, and expiry timestamp if a ttl is given
     * */
    fun ensureEntityFields(
        idGenerator: Id.Generator,
        handleName: String,
        time: Time,
        ttl: Ttl = Ttl.Infinite()
    )

    /**
     * Takes a concrete entity class [T] and convert it to [RawEntity].
     * @param storeSchema an optional [Schema] restricting entity serialization only to fields
     * allowed by the policies.
     */
    fun serialize(storeSchema: Schema? = null): RawEntity

    /** Resets all fields to the default value. */
    fun reset()
}

/**
 * Spec for an [Entity] type. Can create and deserialize new entities.
 *
 * Implementation classes are autogenerated for each entity type.
 */
interface EntitySpec<T : Entity> {
    /**
     * Takes a [RawEntity] and convert it to concrete entity class [T].
     *
     * TODO: replace this with kotlinx.serialization
     */
    fun deserialize(data: RawEntity): T

    /** The corresponding [Schema] for the specified [Entity]. */
    val SCHEMA: Schema
}

/**
 * Try to extract the primitive value from a [ReferencablePrimitive].
 */
@Suppress("UNCHECKED_CAST")
fun <T : Any> Referencable?.toPrimitiveValue(
    valueType: KClass<T>,
    defaultValue: T
): T {
    if (this == null) {
        return defaultValue
    }
    if (this is ReferencablePrimitive<*> && this.value!!::class == valueType) {
        return (this as ReferencablePrimitive<T>).value
    }
    throw IllegalArgumentException(
        "$this of type ${this::class} is not a ReferenceablePrimitive<$valueType>"
    )
}

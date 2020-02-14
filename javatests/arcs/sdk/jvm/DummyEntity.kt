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

package arcs.sdk.jvm

import arcs.core.common.Referencable
import arcs.core.data.FieldName
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.sdk.Entity
import arcs.sdk.EntitySpec
import arcs.sdk.JvmEntity
import arcs.sdk.JvmEntitySpec

/** Fake [Entity] implementation. */
data class DummyEntity(val text: String) : JvmEntity {
    override fun serialize() = RawEntity(
        internalId,
        singletons = mapOf(
            "text" to text.toReferencable()
        ),
        collections = emptyMap()
    )

    override var internalId = text

    override fun schemaHash() = "def"

    /** Fake [EntitySpec] implementation for [DummyEntity]. */
    class Spec : JvmEntitySpec<DummyEntity> {
        override fun create() = DummyEntity("default")
        override fun deserialize(rawEntity: RawEntity) = DummyEntity(
            (rawEntity.singletons["text"] as ReferencablePrimitive<String>).value
        )
    }

    companion object {
        val schema = Schema(
            listOf(SchemaName("dummy")),
            SchemaFields(
                singletons = mapOf(
                    "text" to FieldType.Text
                ),
                collections = emptyMap()
            ),
            SchemaDescription(),
            "abc123"
        )

    }

}

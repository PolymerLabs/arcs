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

import arcs.core.type.Type.ToStringOptions
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class SchemaFieldsTest {

    @Test
    fun toStringCanHideFields() {
        assertThat(
            SchemaFields(
                mapOf("name" to FieldType.Text),
                mapOf()
            ).toString(ToStringOptions(hideFields = true))
        ).isEqualTo("{...}")
    }

    @Test
    fun toStringWorksForPrimitiveFields() {
        assertThat(
            SchemaFields(
                singletons = mapOf(
                    "name" to FieldType.Text,
                    "sku" to FieldType.Text
                ),
                collections = mapOf(
                    "ratings" to FieldType.Number
                )
            ).toString(ToStringOptions())
        ).isEqualTo(
            "{name: Text, sku: Text, ratings: [Number]}"
        )
    }

    @Test
    fun toStringWorksForTupleFields() {
        assertThat(
            SchemaFields(
                singletons = mapOf("dimensions" to FieldType.Tuple(listOf(
                    FieldType.Number,
                    FieldType.Number,
                    FieldType.Number
                ))),
                collections = mapOf("reviews" to FieldType.Tuple(listOf(
                    FieldType.Text,
                    FieldType.Number
                )))
            ).toString(ToStringOptions())
        ).isEqualTo(
            "{dimensions: (Number, Number, Number), reviews: [(Text, Number)]}"
        )
    }

    @Test
    fun toStringWorksForReferenceFields() {
        assertThat(
            SchemaFields(
                singletons = mapOf("manufacturer" to FieldType.EntityRef(schemaHash = "x1y2z3")),
                collections = mapOf("reviews" to FieldType.EntityRef(schemaHash = "a1b2c3d4"))
            ).toString(ToStringOptions())
        ).isEqualTo(
            "{manufacturer: &x1y2z3, reviews: [&a1b2c3d4]}"
        )
    }

    @Test
    fun toStringWithoutArgumentsWorks() {
        assertThat(
            SchemaFields(
                singletons = mapOf(
                    "name" to FieldType.Text,
                    "dimensions" to FieldType.Tuple(listOf(
                        FieldType.Number,
                        FieldType.Number,
                        FieldType.Number
                    )),
                    "manufacturer" to FieldType.EntityRef(schemaHash = "x1y2z3")
                ),
                collections = mapOf()
            ).toString()
        ).isEqualTo(
            "{name: Text, dimensions: (Number, Number, Number), manufacturer: &x1y2z3}"
        )
    }

    @Test
    fun primitiveTypeIsWellStructured() {
        val seenValues = PrimitiveType.values().map { it.id }.toSet()
        for (i in 0..seenValues.size - 1) {
            assertThat(seenValues).contains(i)
        }
        assertThat(seenValues.size).isEqualTo(LARGEST_PRIMITIVE_TYPE_ID + 1)
    }
}

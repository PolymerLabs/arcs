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

import arcs.core.type.Tag
import arcs.core.type.Type.ToStringOptions
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class TupleTypeTest {

    @Test
    fun tagIsTuple() {
        assertThat(TupleType.of().tag).isEqualTo(Tag.Tuple)
    }

    @Test
    fun toStringListsElementTypes() {
        assertThat(
            TupleType.of(
                TypeVariable("a"),
                ReferenceType(EntityType(PRODUCT_SCHEMA))
            ).toString(ToStringOptions())
        ).isEqualTo(
            "(~a, &Product {})"
        )
    }

    companion object {
        private val PRODUCT_SCHEMA = Schema(
            setOf(SchemaName("Product")),
            SchemaFields(mapOf(), mapOf()),
            "fake-hash"
        )
    }
}

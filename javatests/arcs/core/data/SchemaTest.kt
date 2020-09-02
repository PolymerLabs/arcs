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
class SchemaTest {

    @Test
    fun toStringWithArgumentsPrintsOutTheSchema() {
        assertThat(PRODUCT_SCHEMA.toString(ToStringOptions())).isEqualTo(
            "Product Thing {name: Text, ratings: [Number]}"
        )
    }

    @Test
    fun toStringWithoutArgumentsPrintsOutTheSchema() {
        assertThat(PRODUCT_SCHEMA.toString()).isEqualTo(
            "Product Thing {name: Text, ratings: [Number]}"
        )
    }

    @Test
    fun toStringCanHideFields() {
        assertThat(PRODUCT_SCHEMA.toString(ToStringOptions(hideFields = true))).isEqualTo(
            "Product Thing {...}"
        )
    }

    companion object {
        private val PRODUCT_SCHEMA = Schema(
            setOf(SchemaName("Product"), SchemaName("Thing")),
            SchemaFields(
                mapOf("name" to FieldType.Text),
                mapOf("ratings" to FieldType.Number)
            ),
            "fake-hash"
        )
    }
}

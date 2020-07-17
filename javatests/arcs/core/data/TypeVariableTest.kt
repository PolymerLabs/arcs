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

/** Tests for [TypeVariable]. */
@RunWith(JUnit4::class)
class TypeVariableTest {
    @Test
    fun tagIsTypeVariable() {
        assertThat(TypeVariable("a").tag).isEqualTo(Tag.TypeVariable)
    }

    @Test
    fun toStringContainsNameAndTag() {
        val typeVarA = TypeVariable("A")
        val typeVarBaz = TypeVariable("Baz")
        assertThat(typeVarA.toString(ToStringOptions())).isEqualTo("~A")
        assertThat(typeVarBaz.toString(ToStringOptions())).isEqualTo("~Baz")
    }

    @Test
    fun toLiteralContainsNameAndTag() {
        val typeVarA = TypeVariable("A")
        val typeVarBaz = TypeVariable("Baz")
        assertThat(typeVarA.toLiteral()).isEqualTo(
            TypeVariable.Literal(Tag.TypeVariable, TypeVariable.VariableLiteral("A"))
        )
        assertThat(typeVarBaz.toLiteral()).isEqualTo(
            TypeVariable.Literal(Tag.TypeVariable, TypeVariable.VariableLiteral("Baz"))
        )
    }

    @Test
    fun toLiteralContainsNameTagAndConstraint() {
        val constraint = EntityType(Schema(
            setOf(SchemaName("Product"), SchemaName("Thing")),
            SchemaFields(
                mapOf("name" to FieldType.Text),
                mapOf("ratings" to FieldType.Number)
            ),
            "fake-hash"
        ))
        val typeVarBaz = TypeVariable("Baz", constraint)
        assertThat(typeVarBaz.toLiteral()).isEqualTo(
            TypeVariable.Literal(
                Tag.TypeVariable,
                TypeVariable.VariableLiteral("Baz", constraint.toLiteral())
            )
        )
    }

    @Test
    fun toLiteralContainsNameTagAndEmptyConstraint() {
        val constraint = EntityType(Schema.EMPTY)
        val typeVarA = TypeVariable("A", constraint)
        assertThat(typeVarA.toLiteral()).isEqualTo(
            TypeVariable.Literal(
                Tag.TypeVariable,
                TypeVariable.VariableLiteral("A", constraint.toLiteral())
            )
        )
    }
}

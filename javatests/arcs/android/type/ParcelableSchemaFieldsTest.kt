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

package arcs.android.type

import android.os.Parcel
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.data.FieldType
import arcs.core.data.SchemaFields
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableSchemaFields]. */
@RunWith(AndroidJUnit4::class)
class ParcelableSchemaFieldsTest {
  @Test
  fun parcelableRoundtrip_works() {
    val fields = SchemaFields(
      singletons = mapOf(
        "foo" to FieldType.Text,
        "bar" to FieldType.Number,
        "foolist" to FieldType.ListOf(FieldType.Text),
        "barlist" to FieldType.ListOf(FieldType.EntityRef("schema hash R Us"))
      ),
      collections = mapOf(
        "fooCollection" to FieldType.Text,
        "barCollection" to FieldType.Number
      )
    )

    val marshalled = with(Parcel.obtain()) {
      writeSchemaFields(fields, 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readSchemaFields()
    }

    assertThat(unmarshalled).isEqualTo(fields)
  }

  @Test
  fun parcelable_invalidList_throwsException() {
    val unexpectedListType = SchemaFields(
      singletons = mapOf(
        "foo" to FieldType.ListOf(FieldType.ListOf(FieldType.Text))
      ),
      collections = emptyMap()
    )

    with(Parcel.obtain()) {
      assertFailsWith<IllegalStateException> {
        writeSchemaFields(unexpectedListType, 0)
      }
    }
  }

  @Test
  fun parcelable_invalidTuple_throwsException() {
    val unexpectedTupleType = SchemaFields(
      singletons = mapOf(
        "foo" to FieldType.Tuple(listOf(FieldType.Tuple(emptyList())))
      ),
      collections = emptyMap()
    )

    val marshalled = with(Parcel.obtain()) {
      writeSchemaFields(unexpectedTupleType, 0)
      marshall()
    }

    with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      assertFailsWith<IllegalStateException> {
        readSchemaFields()
      }
    }
  }

  @Test
  fun parcelableRoundtrip_works_refs() {
    val fields = SchemaFields(
      singletons = mapOf(
        "ref" to FieldType.EntityRef("hash"),
        "refList" to FieldType.ListOf(FieldType.EntityRef("hash1"))
      ),
      collections = mapOf(
        "refCollection" to FieldType.EntityRef("hash2")
      )
    )

    val marshalled = with(Parcel.obtain()) {
      writeSchemaFields(fields, 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readSchemaFields()
    }

    assertThat(unmarshalled).isEqualTo(fields)
  }

  @Test
  fun parcelableRoundtrip_works_inlineEntities() {
    val fields = SchemaFields(
      singletons = mapOf(
        "inline" to FieldType.InlineEntity("hash"),
        "inlineList" to FieldType.ListOf(FieldType.InlineEntity("hash1"))
      ),
      collections = mapOf(
        "inlineCollection" to FieldType.InlineEntity("hash2")
      )
    )

    val marshalled = with(Parcel.obtain()) {
      writeSchemaFields(fields, 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readSchemaFields()
    }

    assertThat(unmarshalled).isEqualTo(fields)
  }

  @Test
  fun parcelableRoundtrip_works_emptySets() {
    val fields = SchemaFields(
      singletons = emptyMap(),
      collections = emptyMap()
    )

    val marshalled = with(Parcel.obtain()) {
      writeSchemaFields(fields, 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readSchemaFields()
    }

    assertThat(unmarshalled).isEqualTo(fields)
  }

  @Test
  fun parcelableRoundtrip_works_tuples() {
    val fields = SchemaFields(
      singletons = mapOf(
        "foo" to FieldType.Text,
        "tup" to FieldType.Tuple(
          listOf(
            FieldType.Boolean,
            FieldType.Number,
            FieldType.EntityRef("hash"),
            FieldType.ListOf(FieldType.Boolean),
            FieldType.InlineEntity("hash2")
          )
        )
      ),
      collections = mapOf(
        "fooCollection" to FieldType.Text,
        "tupCollection" to FieldType.Tuple(listOf(FieldType.Boolean, FieldType.Number))
      )
    )

    val marshalled = with(Parcel.obtain()) {
      writeSchemaFields(fields, 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readSchemaFields()
    }

    assertThat(unmarshalled).isEqualTo(fields)
  }
}

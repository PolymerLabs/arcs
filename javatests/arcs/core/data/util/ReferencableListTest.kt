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

package arcs.core.data.util

import arcs.core.data.FieldType
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFails
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ReferencableListTest {
  @Test
  fun id_embedsValueHashcode() {
    val list = listOf("foo".toReferencable(), "bar".toReferencable())

    assertThat(list.toReferencable(FieldType.ListOf(FieldType.Text)).id)
      .isEqualTo("ReferencableList(${list.hashCode()})")
  }

  @Test
  fun toString_hasListPrefix_withValue() {
    val list = listOf(5.toReferencable(), 6.toReferencable())

    assertThat(list.toReferencable(FieldType.ListOf(FieldType.Int)).toString())
      .isEqualTo("List($list)")
  }

  @Test
  fun toReferencable_throwsIf_itemTypeIsNotListOf() {
    val e = assertFails {
      listOf("foo".toReferencable()).toReferencable(FieldType.Text)
    }
    assertThat(e).hasMessageThat().contains("ReferencableLists must have List itemTypes")
  }

  @Test
  fun toReference_convertsCorrectly() {
    val original = listOf("a".toReferencable())
    val referenceList = original.toReferencable(FieldType.ListOf(FieldType.Text))

    assertThat(referenceList.value).isEqualTo(original)
    assertThat(referenceList.itemType).isEqualTo(FieldType.ListOf(FieldType.Text))
  }
}

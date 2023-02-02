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

import arcs.core.data.CollectionType
import arcs.core.data.CountType
import arcs.core.data.EntityType
import arcs.core.data.ReferenceType
import arcs.core.data.SingletonType
import arcs.core.entity.testutil.DummyEntity
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class HandleTest {
  @Test
  fun handleSpec_containerType_collectionType() {
    val collectionHandleSpec = HandleSpec(
      "collection",
      HandleMode.ReadWrite,
      CollectionType(EntityType(DummyEntity.SCHEMA)),
      DummyEntity
    )

    assertThat(collectionHandleSpec.containerType).isEqualTo(HandleContainerType.Collection)
  }

  @Test
  fun handleSpec_containerType_singletonType() {
    val singletonHandleSpec = HandleSpec(
      "singleton",
      HandleMode.ReadWrite,
      SingletonType(EntityType(DummyEntity.SCHEMA)),
      DummyEntity
    )

    assertThat(singletonHandleSpec.containerType).isEqualTo(HandleContainerType.Singleton)
  }

  @Test
  fun handleSpec_containerType_invalid() {
    val invalidHandleSpec = HandleSpec(
      "invalid",
      HandleMode.ReadWrite,
      EntityType(DummyEntity.SCHEMA),
      DummyEntity
    )

    val invalidTypeException = assertFailsWith<IllegalStateException> {
      invalidHandleSpec.containerType
    }
    assertThat(invalidTypeException).hasMessageThat().isEqualTo(
      "Handle type Entity for handle invalid should be a Collection or a Singleton"
    )
  }

  @Test
  fun handleSpec_dataType_entityType() {
    val entityHandleSpec = HandleSpec(
      "entity",
      HandleMode.ReadWrite,
      CollectionType(EntityType(DummyEntity.SCHEMA)),
      DummyEntity
    )

    assertThat(entityHandleSpec.dataType).isEqualTo(HandleDataType.Entity)
  }

  @Test
  fun handleSpec_dataType_referenceType() {
    val referenceHandleSpec = HandleSpec(
      "reference",
      HandleMode.ReadWrite,
      SingletonType(ReferenceType(EntityType(DummyEntity.SCHEMA))),
      DummyEntity
    )

    assertThat(referenceHandleSpec.dataType).isEqualTo(HandleDataType.Reference)
  }

  @Test
  fun handleSpec_dataType_invalidContainerType() {
    val rawEntityHandleSpec = HandleSpec(
      "rawEntity",
      HandleMode.ReadWrite,
      EntityType(DummyEntity.SCHEMA),
      DummyEntity
    )

    val rawEntityException = assertFailsWith<IllegalStateException> { rawEntityHandleSpec.dataType }
    assertThat(rawEntityException).hasMessageThat().isEqualTo(
      "Handle type Entity for handle rawEntity should be a Collection or a Singleton"
    )
  }

  @Test
  fun handleSpec_dataType_invalidInnerType() {
    val countHandleSpec = HandleSpec(
      "count",
      HandleMode.ReadWrite,
      SingletonType(CountType()),
      DummyEntity
    )

    val countException = assertFailsWith<IllegalStateException> { countHandleSpec.dataType }
    assertThat(countException).hasMessageThat().isEqualTo("Unrecognized Type: Count")
  }
}

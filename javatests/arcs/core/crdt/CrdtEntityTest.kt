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

package arcs.core.crdt

import arcs.core.crdt.CrdtEntity.Operation.AddToSet
import arcs.core.crdt.CrdtEntity.Operation.ClearSingleton
import arcs.core.crdt.CrdtEntity.Operation.RemoveFromSet
import arcs.core.crdt.CrdtEntity.Operation.SetSingleton
import arcs.core.crdt.CrdtEntity.ReferenceImpl as Reference
import arcs.core.data.RawEntity
import arcs.core.testutil.assertThrows
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [CrdtEntity]. */
@RunWith(JUnit4::class)
class CrdtEntityTest {
    @Test
    fun reasonableDefaults() {
        val rawEntity = RawEntity(
            singletonFields = setOf("foo"),
            collectionFields = setOf("bar")
        )
        val entity = CrdtEntity(VersionMap(), rawEntity)

        assertThat(entity.consumerView.singletons).isEqualTo(mapOf("foo" to null))
        assertThat(entity.consumerView.collections).isEqualTo(mapOf("bar" to emptySet<Reference>()))
    }

    @Test
    fun canApply_aSetOperation_toASingleField() {
        val rawEntity = RawEntity(
            singletonFields = setOf("foo"),
            collectionFields = setOf("bar")
        )
        val entity = CrdtEntity(VersionMap(), rawEntity)

        assertThat(
            entity.applyOperation(
                SetSingleton("me", VersionMap("me" to 1), "foo", Reference("fooRef"))
            )
        ).isTrue()
        assertThat(entity.consumerView.singletons).isEqualTo(mapOf("foo" to Reference("fooRef")))
        assertThat(entity.consumerView.collections).isEqualTo(mapOf("bar" to emptySet<Reference>()))
    }

    @Test
    fun initializesFromRawData() {
        val rawEntity = RawEntity(
            singletons = mapOf("foo" to Reference("fooRef")),
            collections = mapOf(
                "bar" to setOf(Reference("barRef1"), Reference("barRef2")),
                "baz" to setOf(Reference("bazRef"))
            )
        )
        val entity = CrdtEntity(VersionMap(), rawEntity)

        assertThat(entity.data.singletons["foo"]?.consumerView)
            .isEqualTo(Reference("fooRef"))
        assertThat(entity.data.collections["bar"]?.consumerView)
            .containsExactly(
                Reference("barRef1"), Reference("barRef2")
            )
        assertThat(entity.data.collections["baz"]?.consumerView)
            .containsExactly(Reference("bazRef"))
    }

    @Test
    fun canApply_aClearOperation_toASingleField() {
        val rawEntity = RawEntity(
            singletons = mapOf("foo" to Reference("fooRef"))
        )
        val entity = CrdtEntity(VersionMap("me" to 1), rawEntity)

        assertThat(entity.applyOperation(ClearSingleton("me", VersionMap("me" to 1), "foo")))
            .isTrue()
        assertThat(entity.consumerView.singletons["foo"]).isNull()
    }

    @Test
    fun canApply_anAddOperation_toASingleField() {
        val rawEntity = RawEntity(
            collectionFields = setOf("foo")
        )
        val entity = CrdtEntity(VersionMap(), rawEntity)

        assertThat(
            entity.applyOperation(
                AddToSet("me", VersionMap("me" to 1), "foo", Reference("fooRef"))
            )
        ).isTrue()
        assertThat(entity.consumerView.collections["foo"]).containsExactly(Reference("fooRef"))
    }

    @Test
    fun canApply_aRemoveOperation_toACollectionField() {
        val rawEntity = RawEntity(
            collections = mapOf("foo" to setOf(Reference("fooRef1"), Reference("fooRef2")))
        )
        val entity = CrdtEntity(VersionMap("me" to 1), rawEntity)

        assertThat(
            entity.applyOperation(
                RemoveFromSet("me", VersionMap("me" to 1), "foo", Reference("fooRef1"))
            )
        ).isTrue()
        assertThat(entity.consumerView.collections["foo"]).containsExactly(Reference("fooRef2"))
    }

    @Test
    fun canApplyOperations_toMultipleFields() {
        val rawEntity = RawEntity(
            singletonFields = setOf("name", "age"),
            collectionFields = setOf("tags", "favoriteNumbers")
        )
        val entity = CrdtEntity(VersionMap(), rawEntity)

        val name = Reference("bob")
        val age = Reference("42")
        val tag = Reference("#perf")
        val favoriteNumber = Reference("4")

        assertThat(
            entity.applyOperation(SetSingleton("me", VersionMap("me" to 1), "name", name))
        ).isTrue()
        assertThat(
            entity.applyOperation(SetSingleton("me", VersionMap("me" to 1), "age", age))
        ).isTrue()
        assertThat(
            entity.applyOperation(AddToSet("me", VersionMap("me" to 1), "tags", tag))
        ).isTrue()
        assertThat(
            entity.applyOperation(
                AddToSet("me", VersionMap("me" to 1), "favoriteNumbers", favoriteNumber)
            )
        ).isTrue()

        assertThat(entity.consumerView)
            .isEqualTo(
                RawEntity(
                    singletons = mapOf(
                        "name" to name,
                        "age" to age
                    ),
                    collections = mapOf(
                        "tags" to setOf(tag),
                        "favoriteNumbers" to setOf(favoriteNumber)
                    )
                )
            )
    }

    @Test
    fun keepsSeparateClocks_forSeparateFields() {
        val rawEntity = RawEntity(
            singletonFields = setOf("name", "age")
        )
        val entity = CrdtEntity(VersionMap(), rawEntity)

        val name1 = Reference("bob")
        val name2 = Reference("dave")
        val age1 = Reference("42")
        val age2 = Reference("37")

        assertThat(
            entity.applyOperation(SetSingleton("me", VersionMap("me" to 1), "name", name1))
        ).isTrue()
        assertThat(
            entity.applyOperation(SetSingleton("me", VersionMap("me" to 1), "age", age1))
        ).isTrue()
        assertThat(
            entity.applyOperation(SetSingleton("me", VersionMap("me" to 2), "name", name2))
        ).isTrue()
        assertThat(
            entity.applyOperation(
                SetSingleton("them", VersionMap("me" to 1, "them" to 1), "age", age2)
            )
        ).isTrue()
    }

    @Test
    fun failsWhen_anInvalidFieldName_isProvided() {
        val entity = CrdtEntity(VersionMap(), RawEntity("", emptySet(), emptySet()))

        assertThrows(CrdtException::class) {
            entity.applyOperation(
                SetSingleton("me", VersionMap("me" to 1), "invalid", Reference("foo"))
            )
        }
        assertThrows(CrdtException::class) {
            entity.applyOperation(
                ClearSingleton("me", VersionMap("me" to 1), "invalid")
            )
        }
        assertThrows(CrdtException::class) {
            entity.applyOperation(
                AddToSet("me", VersionMap("me" to 1), "invalid", Reference("foo"))
            )
        }
        assertThrows(CrdtException::class) {
            entity.applyOperation(
                RemoveFromSet("me", VersionMap("me" to 1), "invalid", Reference("foo"))
            )
        }
    }

    @Test
    fun failsWhen_singletonOperations_areProvidedTo_collectionFields() {
        val entity = CrdtEntity(VersionMap(), RawEntity(collectionFields = setOf("things")))

        assertThrows(CrdtException::class) {
            entity.applyOperation(
                SetSingleton("me", VersionMap("me" to 1), "things", Reference("foo"))
            )
        }
        assertThrows(CrdtException::class) {
            entity.applyOperation(
                ClearSingleton("me", VersionMap("me" to 1), "things")
            )
        }
    }

    @Test
    fun failsWhen_collectionOperations_areProvidedTo_singletonFields() {
        val entity = CrdtEntity(VersionMap(), RawEntity(singletonFields = setOf("thing")))

        assertThrows(CrdtException::class) {
            entity.applyOperation(AddToSet("me", VersionMap("me" to 1), "thing", Reference("foo")))
        }
        assertThrows(CrdtException::class) {
            entity.applyOperation(
                RemoveFromSet("me", VersionMap("me" to 1), "thing", Reference("foo"))
            )
        }
    }
}

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

import arcs.core.crdt.VersionMap
import arcs.core.storage.testutil.DummyStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import arcs.core.storage.Reference as StorageReference

@RunWith(JUnit4::class)
@Suppress("UNCHECKED_CAST")
open class EntityBaseTest : EntityTestBase<DummyEntity>() {

    @Before
    override fun setUp() {
        SchemaRegistry.register(DummyEntity.SCHEMA)
        entity = DummyEntity()
    }

    @Test
    override fun serializeRoundTrip() {
        with (entity) {
            text = "abc"
            num = 12.0
            bool = true
            ref = createReference("foo")
            texts = setOf("aa", "bb")
            nums = setOf(1.0, 2.0)
            bools = setOf(true, false)
            refs = setOf(createReference("ref1"), createReference("ref2"))
        }

        val rawEntity = entity.serialize()
        val deserialized = DummyEntity()
        deserialized.deserializeForTest(rawEntity)

        assertThat(deserialized).isEqualTo(entity)
        assertThat(deserialized.serialize()).isEqualTo(rawEntity)
    }

    override fun createReference(id: String): Reference<DummyEntity> = Reference(
        DummyEntity,
        StorageReference(id, DummyStorageKey(id), VersionMap("id" to 1))
    )
}

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

package arcs.crdt.internal

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [VersionMap]. */
@RunWith(JUnit4::class)
class VersionMapTest {
  @Test
  fun nonExistentActor_hasDefaultVersion() {
    val versions = VersionMap()
    assertThat(versions["alice"]).isEqualTo(VersionMap.DEFAULT_VERSION)
  }

  @Test
  fun nonExistentActor_containsReturnsFalse() {
    val versions = VersionMap()
    assertThat("alice" in versions).isFalse()
  }

  @Test
  fun existingActor_hasConfiguredVersion() {
    val versions = VersionMap()
    versions["alice"] = 15
    assertThat(versions["alice"]).isEqualTo(15)
  }

  @Test
  fun existingActor_containsReturnsTrue() {
    val versions = VersionMap()
    versions["alice"] = 15
    assertThat("alice" in versions).isTrue()
  }

  @Test
  fun dominatesReturnsTrue_whenVersionMapsAreEqual() {
    var a = VersionMap()
    a["alice"]++
    a["bob"] = 42
    var b = VersionMap(a)
    assertThat(a dominates b).isTrue()

    a = VersionMap()
    b = VersionMap(a)
    assertThat(a dominates b).isTrue()
  }

  @Test
  fun dominatesReturnsTrue_whenVersionMapDominatesAnother() {
    val a = VersionMap()
    val b = VersionMap()

    a["alice"]++
    assertThat(a dominates b).isTrue()

    a["bob"] = 2
    b["bob"] = 2
    assertThat(a dominates b).isTrue()
  }

  @Test
  fun dominatesReturnsFalse_whenVersionMapIsDominatedByAnother() {
    val a = VersionMap()
    val b = VersionMap()

    b["alice"]++
    assertThat(a dominates b).isFalse()

    a["bob"] = 2
    b["bob"] = 2
    assertThat(a dominates b).isFalse()
  }

  @Test
  fun mergeWith_mergesTwoEmptyMaps() {
    val a = VersionMap()
    val b = VersionMap()

    val merged = a mergeWith b
    assertThat(merged.size).isEqualTo(0)
    assertThat(merged.isEmpty()).isTrue()
  }

  @Test
  fun mergeWith_mergesTwoMaps() {
    val a = VersionMap()
    val b = VersionMap()

    a["alice"] = 42
    b["bob"] = 1337

    val merged = a mergeWith b
    assertThat(merged.size).isEqualTo(2)
    assertThat(merged["alice"]).isEqualTo(42)
    assertThat(merged["bob"]).isEqualTo(1337)
  }

  @Test
  fun mergeWith_doesNotModifyReceiverNorArgument() {
    val a = VersionMap()
    val b = VersionMap()

    a["alice"]++
    b["bob"]++

    val merged = a mergeWith b
    assertThat("bob" !in a).isTrue()
    assertThat(a["bob"]).isEqualTo(0)
    assertThat("alice" !in b).isTrue()
    assertThat(b["alice"]).isEqualTo(0)
  }

  @Test
  fun equals_returnsTrueWhenMapsAreEqual() {
    val a = VersionMap()
    val b = VersionMap()

    assertThat(a == b).isTrue()

    a["alice"] = 1
    b["alice"] = 1

    assertThat(a == b).isTrue()
  }

  @Test
  fun equals_returnsFalseWhenMapsAreNotEqual() {
    val a = VersionMap()
    val b = VersionMap()

    a["alice"] = 1

    assertThat(a != b).isTrue()

    b["alice"] = 1
    b["bob"] = 1

    assertThat(a != b).isTrue()

    a["bob"] = 2

    assertThat(a != b).isTrue()
  }
}

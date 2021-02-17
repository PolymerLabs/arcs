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

package arcs.core.common

import arcs.core.util.RandomBuilder
import arcs.core.util.nextSafeRandomLong
import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
import arcs.flags.testing.ParameterizedBuildFlags
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.TruthJUnit.assume
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

/** Tests for [Id]. */
@RunWith(Parameterized::class)
class IdTest(private val parameters: ParameterizedBuildFlags) {

  @get:Rule val rule = BuildFlagsRule.parameterized(parameters)

  private val testSessionid = "sessionId"
  private lateinit var testGenerator: Id.Generator

  companion object {
    @get:JvmStatic
    @get:Parameterized.Parameters(name = "{0}")
    val PARAMETERS = ParameterizedBuildFlags.of("STORAGE_STRING_REDUCTION")
  }

  @Before
  fun setup() {
    testGenerator = Id.Generator.newForTest(testSessionid)
  }

  @Test
  fun parses_withExclamationMarks() {
    assertThat(Id.fromString("!root")).isEqualTo(IdImpl("root"))
    assertThat(Id.fromString("!root:")).isEqualTo(IdImpl("root"))
    assertThat(Id.fromString("!root:x:y")).isEqualTo(IdImpl("root", listOf("x", "y")))
  }

  @Test
  fun parses_withoutExclamationMarks() {
    assertThat(Id.fromString("x")).isEqualTo(IdImpl("", listOf("x")))
    assertThat(Id.fromString("x:y")).isEqualTo(IdImpl("", listOf("x", "y")))
  }

  @Test
  fun encodesToAString() {
    assertThat(IdImpl("root").toString()).isEqualTo("!root:")
    assertThat(IdImpl("root", listOf("x", "y")).toString()).isEqualTo("!root:x:y")
  }

  @Test
  fun encodesIdTree() {
    assertThat(IdImpl("root").idTreeString).isEqualTo("")
    assertThat(IdImpl("root", listOf("x", "y")).idTreeString).isEqualTo("x:y")
  }

  @Test
  fun idGenerator_newSession_generatesRandomSessionId() {
    val seed = 0
    val knownRandom = { kotlin.random.Random(seed) }

    // Set the global random builder.
    val oldRandomBuilder = RandomBuilder
    RandomBuilder = { knownRandom() }

    val expectedRandomValue = knownRandom().nextSafeRandomLong()
    val idGenerator = Id.Generator.newSession()

    assertThat(idGenerator.currentSessionId).isEqualTo(expectedRandomValue.toString())
    RandomBuilder = oldRandomBuilder
  }

  @Test
  fun idGenerator_newChildId_createsChildIds_usingItsSessionId() {
    val parentId = IdImpl("root")
    val childId = testGenerator.newChildId(parentId, "z")
    assertThat(childId.root).isEqualTo(testSessionid)
  }

  @Test
  fun idGenerator_newChildId_appendsSubComponents() {
    val parentId = IdImpl("root", listOf("x", "y"))
    val childId = testGenerator.newChildId(parentId, "z")
    assertThat(childId.idTree).containsExactly("x", "y", "z0")
  }

  @Test
  fun idGenerator_newChildId_incrementsItsCounter() {
    val parentId = IdImpl("root", listOf("x", "y"))
    assertThat(testGenerator.newChildId(parentId, "z").idTree).containsExactly("x", "y", "z0")
    assertThat(testGenerator.newChildId(parentId, "z").idTree).containsExactly("x", "y", "z1")
    assertThat(testGenerator.newChildId(parentId, "z").idTree).containsExactly("x", "y", "z2")
  }

  @Test
  fun idGenerator_newArcId_createsAValidArcId() {
    val arcId = testGenerator.newArcId("foo")
    assertThat(arcId).isInstanceOf(ArcId::class.java)
    assertThat(arcId.toString()).isEqualTo("!sessionId:foo")
  }

  @Test
  fun idGenerator_newStringId_generatesRandomEntityString() {
    assume().that(BuildFlags.STORAGE_STRING_REDUCTION).isTrue()

    val seed = 0
    val knownRandom = { kotlin.random.Random(seed) }

    // Set the global random builder.
    val oldRandomBuilder = RandomBuilder
    RandomBuilder = { knownRandom() }

    val expectedRandomValue = String(knownRandom().nextBytes(8))
    val id = Id.Generator.newSession().newMinimizedId()

    assertThat(id).isEqualTo(expectedRandomValue)
    RandomBuilder = oldRandomBuilder
  }
}

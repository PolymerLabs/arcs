/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.entity

import arcs.core.allocator.Allocator
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.host.TestHost
import arcs.core.host.toRegistration
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.testutil.runTest
import arcs.jvm.host.ExplicitHostRegistry
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.TestCoroutineScope
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.junit.Test

// Writer feeds entities into the middle and bottom layer of Slicer's handle lattice.
class Writer : AbstractWriter() {
  override fun onFirstStart() {
    handles.l.store(Writer_L("left", 2.3))
    handles.r.store(Writer_R("right", setOf()))
    handles.b.store(Writer_B("bottom", 8.0, setOf(5, 9), true))
  }
}

// Slicer has handles with types arranged in a diamond lattice (casting is allowed upwards):
//     T
//    / \
//   L   R
//    \ /
//     B
class Slicer : AbstractSlicer() {
  override fun onReady() {
    // Read the input from Writer as concrete entities.
    val left = requireNotNull(handles.l.fetch())
    val right = requireNotNull(handles.r.fetch())
    val bottom = requireNotNull(handles.b.fetch())

    assertThat(left).isInstanceOf(Slicer_L::class.java)
    assertThat(right).isInstanceOf(Slicer_R::class.java)
    assertThat(bottom).isInstanceOf(Slicer_B::class.java)

    // Write the input entities to all handles that should accept them (via slice interfaces).
    Reader.expected = 7

    // Top handle can accept all types from the diamond.
    handles.t.store(left)
    handles.t.store(right)
    handles.t.store(bottom)

    // Left and right handles can accept the bottom type in addition to their own.
    handles.l.store(left)
    handles.l.store(bottom)
    handles.r.store(right)
    handles.r.store(bottom)
  }
}

// Reader collectes the sliced writes from Slicer for verification in the unit test.
class Reader : AbstractReader() {
  override fun onStart() {
    handles.t.onUpdate { topReceived.add(requireNotNull(it.new)) }
    handles.l.onUpdate { leftReceived.add(requireNotNull(it.new)) }
    handles.r.onUpdate { rightReceived.add(requireNotNull(it.new)) }
  }

  override fun onUpdate() {
    if (--expected == 0) latch.complete()
  }

  companion object {
    var expected = 0
    val latch = Job() // Single job works since only one test requires it.
    val topReceived = mutableListOf<Reader_T>()
    val leftReceived = mutableListOf<Reader_L>()
    val rightReceived = mutableListOf<Reader_R>()
  }
}

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class TypeSlicingTest {

  @Test
  fun particlesCanWriteToSliceInterfaces() = runTest {
    RamDisk.clear()
    DriverAndKeyConfigurator.configure(null)
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = TestHost(
      schedulerProvider,
      ::Reader.toRegistration(),
      ::Slicer.toRegistration(),
      ::Writer.toRegistration()
    )
    val hostRegistry = ExplicitHostRegistry().apply { registerHost(host) }
    val allocator = Allocator.createNonSerializing(hostRegistry, TestCoroutineScope())
    val arc = allocator.startArcForPlan(TypeSlicingTestPlan).waitForStart()

    Reader.latch.join()

    assertThat(Reader.topReceived.map { it.a }).isEqualTo(listOf("left", "right", "bottom"))

    assertThat(Reader.leftReceived.map { "${it.a}:${it.b}" })
      .isEqualTo(listOf("left:2.3", "bottom:8.0"))

    assertThat(Reader.rightReceived.map { "${it.a}:${it.c}" })
      .isEqualTo(listOf("right:[]", "bottom:[5, 9]"))

    arc.stop()
    arc.waitForStop()
    schedulerProvider.cancelAll()
  }

  @Test
  fun castingBetweenRelatedSchemas() {
    // Re-use the type lattice from Reader to check direct casts across the entire lattice.
    checkCasts(Reader_T("abc"), true, false, false, false)
    checkCasts(Reader_L("abc", 5.7), true, true, false, false)
    checkCasts(Reader_R("abc", setOf(4, 6)), true, false, true, false)
    checkCasts(Reader_B("abc", 5.7, setOf(4, 6), true), true, true, true, true)

    // An unrelated type should fail all casts.
    checkCasts(Reader_X(5.7), false, false, false, false)
  }

  fun checkCasts(x: Any, isTop: Boolean, isLeft: Boolean, isRight: Boolean, isBottom: Boolean) {
    try {
      (x as Reader_T_Slice).let {
        assertThat(it.a).isEqualTo("abc")
      }
      assertWithMessage("Cast of $x to Reader_T_Slice succeeded but should have failed")
        .that(isTop).isTrue()
    } catch (e: ClassCastException) {
      assertWithMessage("Cast of $x to Reader_T_Slice failed but should have succeeded")
        .that(isTop).isFalse()
    }

    try {
      (x as Reader_L_Slice).let {
        assertThat(it.a).isEqualTo("abc")
        assertThat(it.b).isEqualTo(5.7)
      }
      assertWithMessage("Cast of $x to Reader_L_Slice succeeded but should have failed")
        .that(isLeft).isTrue()
    } catch (e: ClassCastException) {
      assertWithMessage("Cast of $x to Reader_L_Slice failed but should have succeeded")
        .that(isLeft).isFalse()
    }

    try {
      (x as Reader_R_Slice).let {
        assertThat(it.a).isEqualTo("abc")
        assertThat(it.c).isEqualTo(setOf(4, 6))
      }
      assertWithMessage("Cast of $x to Reader_R_Slice succeeded but should have failed")
        .that(isRight).isTrue()
    } catch (e: ClassCastException) {
      assertWithMessage("Cast of $x to Reader_R_Slice failed but should have succeeded")
        .that(isRight).isFalse()
    }

    try {
      (x as Reader_B_Slice).let {
        assertThat(it.a).isEqualTo("abc")
        assertThat(it.b).isEqualTo(5.7)
        assertThat(it.c).isEqualTo(setOf(4, 6))
        assertThat(it.d).isEqualTo(true)
      }
      assertWithMessage("Cast of $x to Reader_B_Slice succeeded but should have failed")
        .that(isBottom).isTrue()
    } catch (e: ClassCastException) {
      assertWithMessage("Cast of $x to Reader_B_Slice failed but should have succeeded")
        .that(isBottom).isFalse()
    }
  }
}

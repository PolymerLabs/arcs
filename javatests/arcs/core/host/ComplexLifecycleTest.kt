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
package arcs.core.host

import arcs.core.allocator.Arc
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.testutil.assertVariableOrdering
import arcs.core.testutil.group
import arcs.core.testutil.handles.dispatchStore
import arcs.core.testutil.runTest
import arcs.core.testutil.sequence
import arcs.core.testutil.single
import kotlin.random.Random
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/**
 * This test suite exercises the particle and handle lifecycles in a more complex arc.
 *
 * The particles are basically identical and serve only to forward a "message" sequence around the
 * graph, controlled by a simple text encoding stored in the entity. The particle names don't really
 * mean anything beyond providing a memorable label. See the [Messager] class for more details.
 *
 * Tests drive the arc via the two ingress particles and use the [Witness] singleton to observe the
 * resulting sequence of lifecycle events.
 *
 * The arc structure is:
 *
 *                       .---- FB <----.
 *                      /               \
 *                     v                 \              I1: Ingress1
 *        I1 -------> C1 <------ C3 <---> RW            I2: Ingress2
 *                   ^ |\        ^ \                    C1: Cycle1
 *            ______/  ; \      /   \                   C2: Cycle2
 *           /        /   \    /     \                  C3: Cycle3
 *          /        v     v  /       v                 RW: ReadWriteEgress
 *        I2 -----> M1 ===> C2         WO               FB: Feedback
 *          \       ^   #1            ^                 M1: Middle1
 *           \      |                /                  M2: Middle2
 *            \     v               /                   M3: Middle3
 *             `--> M2 <========> M3                    RF: Reflect
 *                  ^      #2                           WO: WriteOnlyEgress
 *                  |
 *                  v
 *                  RF
 *
 *    #1: M1 has two handles writing to C2 in parallel.
 *    #2: M2 and M3 have two parallel handles with their read/write direction flipped.
 */
@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class ComplexLifecycleTest : LifecycleTestBase(
  ::Ingress1.toRegistration(),
  ::Ingress2.toRegistration(),
  ::Cycle1.toRegistration(),
  ::Cycle2.toRegistration(),
  ::Cycle3.toRegistration(),
  ::ReadWriteEgress.toRegistration(),
  ::Feedback.toRegistration(),
  ::Middle1.toRegistration(),
  ::Middle2.toRegistration(),
  ::Middle3.toRegistration(),
  ::Reflect.toRegistration(),
  ::WriteOnlyEgress.toRegistration()
) {
  override fun extraSetUp() {
    Witness.recordVerbose = false
    Witness.clear()
  }

  @Test
  fun allEdgesAndAllEvents() = runTest {
    // Record all events. To reduce noise, other tests will not set this flag.
    Witness.recordVerbose = true

    val arc = allocator.startArcForPlan(ComplexGraphTestPlan).waitForStart()
    val inputHelper = InputHelper.create(arc, testHost)

    // Send two message sequences to traverse every handle connection in the arc.
    inputHelper.sendI1(
      """
        C1 C2 C3 {
          C1 M1
          RW {
            FB C1
            C3
          }
          WO
        }
      """
    )

    inputHelper.sendI2(
      """
        C1
        M1 {
          C2a
          C2b
          M2 RF M2 M1
        }
        M2 M3w {
          M2w
          WO
        }
      """
    )

    scheduler.waitForIdle()
    arc.stop()
    arc.waitForStop()

    // First check the basic sequencing:
    //  1. All particles receive onFirstStart followed by onStart.
    //  2. All particles receive onReady.
    //  3. For each message sent, check the following constraints without worrying about the
    //     specific message ordering:
    //     - Particles with handle-specific onUpdate callbacks receive handle.onUpdate,
    //       particle.onUpdate in sequence.
    //     - Otherwise the particle.onUpdate alone is received.
    //     - For particles with a read/write handle, we receive some particle-level onUpdate
    //       events that can't easily be filtered; these are noted by comments.
    //  4. All particles receive onShutdown.
    assertVariableOrdering(
      Witness.events,
      group(
        sequence("I1.first", "I1.start"), sequence("FB.first", "FB.start"),
        sequence("I2.first", "I2.start"), sequence("M1.first", "M1.start"),
        sequence("C1.first", "C1.start"), sequence("M2.first", "M2.start"),
        sequence("C2.first", "C2.start"), sequence("M3.first", "M3.start"),
        sequence("C3.first", "C3.start"), sequence("RF.first", "RF.start"),
        sequence("RW.first", "RW.start"), sequence("WO.first", "WO.start")
      ),
      group(
        "I1.ready", "I2.ready", "C1.ready", "C2.ready", "C3.ready", "RW.ready",
        "FB.ready", "M1.ready", "M2.ready", "M3.ready", "RF.ready", "WO.ready"
      ),
      // Result of message sent to I1.
      group(
        single("I1.update"),
        sequence("C1.i1.update", "C1.update"),
        sequence("C2.c1.update", "C2.update"),
        sequence("C3.c2.update", "C3.update"),
        sequence("C1.c3.update", "C1.update"),
        sequence("M1.c1.update", "M1.update"),
        single("RW.update"),
        single("C3.update"), // C3 writing to RW causes a logged self-update
        single("FB.update"),
        sequence("C1.fb.update", "C1.update"),
        sequence("C3.rw.update", "C3.update"),
        sequence("WO.c3.update", "WO.update")
      ),
      // Result of message sent to I2.
      group(
        single("I2.update"),
        sequence("C1.i2.update", "C1.update"),
        sequence("M1.i2.update", "M1.update"),
        sequence("C2.m1a.update", "C2.update"),
        sequence("C2.m1b.update", "C2.update"),
        sequence("M2.m1.update", "M2.update"),
        single("M1.update"), // M1 writing to M2 causes a logged self-update
        single("RF.update"),
        single("M2.update"), // M2 writing to RF causes a logged self-update
        sequence("M2.rf.update", "M2.update"),
        sequence("M1.m2.update", "M1.update"),
        single("M2.update"), // M2 writing to M1 causes a logged self-update
        sequence("M2.i2.update", "M2.update"),
        sequence("M3.m2r.update", "M3.update"),
        sequence("M2.m3r.update", "M2.update"),
        sequence("WO.m3.update", "WO.update")
      ),
      group(
        "I1.stop", "I2.stop", "C1.stop", "C2.stop", "C3.stop", "RW.stop",
        "FB.stop", "M1.stop", "M2.stop", "M3.stop", "RF.stop", "WO.stop"
      )
    )

    // Now verify that the update events are correctly sequenced in detail. Note that the
    // constraints here mirror the path structure provided in the calls to inputHelper above.
    // We can ignore unmatched items since the check above has already verified the full set;
    // we just want to inspect the specific update sequencing.
    assertVariableOrdering(
      Witness.events,
      group(
        // Full message sequencing from I1 input.
        sequence(
          sequence("I1.update", "C1.i1.update", "C2.c1.update", "C3.c2.update"),
          group(
            sequence("C1.c3.update", "M1.c1.update"),
            sequence(
              single("RW.update"),
              group(
                sequence("FB.update", "C1.fb.update"),
                single("C3.rw.update")
              )
            ),
            single("WO.c3.update")
          )
        ),

        // Full message sequencing from I2 input.
        group(
          single("I2.update"),
          group(
            single("C1.i2.update"),
            sequence(
              single("M1.i2.update"),
              group(
                single("C2.m1a.update"),
                single("C2.m1b.update"),
                sequence("M2.m1.update", "RF.update", "M2.rf.update", "M1.m2.update")
              )
            ),
            sequence(
              sequence("M2.i2.update", "M3.m2r.update"),
              group(
                single("M2.m3r.update"),
                single("WO.m3.update")
              )
            )
          )
        )
      ),
      allowUnmatched = true
    )
  }

  @Test
  fun simultaneousTransit() = runTest {
    val arc = allocator.startArcForPlan(ComplexGraphTestPlan).waitForStart()
    val inputHelper = InputHelper.create(arc, testHost)

    // First two lines: "simultaneous" bi-directional messages over the same r/w handle.
    // Second two lines: "simultaneous" bi-directional messages over two handles.
    inputHelper.sendI2(
      """
        M1 M2 M1 C2a
        M2 M1 M2 RF
        M1 M2 M3w WO
        M2 M3w M2w RF
      """
    )

    scheduler.waitForIdle()
    arc.stop()
    arc.waitForStop()

    assertVariableOrdering(
      Witness.events,
      single("I2.update"),
      group(
        sequence("M1.i2.update", "M2.m1.update", "M1.m2.update", "C2.m1a.update"),
        sequence("M2.i2.update", "M1.m2.update", "M2.m1.update", "RF.update"),
        sequence("M1.i2.update", "M2.m1.update", "M3.m2r.update", "WO.m3.update"),
        sequence("M2.i2.update", "M3.m2r.update", "M2.m3r.update", "RF.update")
      )
    )
  }

  @Test
  fun randomizedCrissCrossLoops() = runTest {
    val seed = System.currentTimeMillis()
    log("Random seed: $seed")

    val arc = allocator.startArcForPlan(ComplexGraphTestPlan).waitForStart()
    val inputHelper = InputHelper.create(arc, testHost)

    // Send looping message sequences, with repeats, in random order.
    val senders = mutableListOf(
      suspend { inputHelper.sendI1("C1 C2 C3 C1 M1 C2a C3 WO") },
      suspend { inputHelper.sendI1("C1 C2 C3 C1 M1 C2a C3 WO") },
      suspend { inputHelper.sendI1("C1 C2 C3 RW FB C1 C2 C3 WO") },
      suspend { inputHelper.sendI2("C1 M1 C2b C3 RW FB C1 M1 M2 M3w WO") },
      suspend { inputHelper.sendI2("M1 M2 M3w M2w RF M2 M3w WO") },
      suspend { inputHelper.sendI2("M1 M2 M3w M2w RF M2 M3w WO") },
      suspend { inputHelper.sendI2("M2 M1 C2a C3 RW") }
    )
    senders.shuffle(Random(seed))
    senders.forEach { it.invoke() }

    scheduler.waitForIdle()
    arc.stop()
    arc.waitForStop()

    assertVariableOrdering(
      Witness.events,
      group(
        sequence(
          "I1.update", "C1.i1.update", "C2.c1.update", "C3.c2.update", "C1.c3.update",
          "M1.c1.update", "C2.m1a.update", "C3.c2.update", "WO.c3.update"
        ),
        sequence(
          "I1.update", "C1.i1.update", "C2.c1.update", "C3.c2.update", "C1.c3.update",
          "M1.c1.update", "C2.m1a.update", "C3.c2.update", "WO.c3.update"
        ),
        sequence(
          "I1.update", "C1.i1.update", "C2.c1.update", "C3.c2.update", "RW.update", "FB.update",
          "C1.fb.update", "C2.c1.update", "C3.c2.update", "WO.c3.update"
        ),
        sequence(
          "I2.update", "C1.i2.update", "M1.c1.update", "C2.m1b.update", "C3.c2.update",
          "RW.update", "FB.update", "C1.fb.update", "M1.c1.update", "M2.m1.update",
          "M3.m2r.update", "WO.m3.update"
        ),
        sequence(
          "I2.update", "M1.i2.update", "M2.m1.update", "M3.m2r.update", "M2.m3r.update",
          "RF.update", "M2.rf.update", "M3.m2r.update", "WO.m3.update"
        ),
        sequence(
          "I2.update", "M1.i2.update", "M2.m1.update", "M3.m2r.update", "M2.m3r.update",
          "RF.update", "M2.rf.update", "M3.m2r.update", "WO.m3.update"
        ),
        sequence(
          "I2.update", "M2.i2.update", "M1.m2.update", "C2.m1a.update", "C3.c2.update", "RW.update"
        )
      )
    )
  }
}

/** Simple helper for establishing and using ingress test handles. */
class InputHelper private constructor(
  private val ingress1: ReadWriteSingletonHandle<Ingress1_Input, Ingress1_Input_Slice>,
  private val ingress2: ReadWriteSingletonHandle<Ingress2_Input, Ingress2_Input_Slice>
) {
  // [str] should not start with 'I1' or 'I2'.
  suspend fun sendI1(str: String) = ingress1.dispatchStore(Ingress1_Input(str))
  suspend fun sendI2(str: String) = ingress2.dispatchStore(Ingress2_Input(str))

  companion object {
    suspend fun create(arc: Arc, testHost: TestingHost) = InputHelper(
      testHost.singletonForTest<Ingress1_Input, Ingress1_Input_Slice>(arc.id, "Ingress1", "input"),
      testHost.singletonForTest<Ingress2_Input, Ingress2_Input_Slice>(arc.id, "Ingress2", "input")
    )
  }
}

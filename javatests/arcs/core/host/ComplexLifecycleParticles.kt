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

import arcs.core.entity.Storable
import arcs.core.entity.WriteSingletonHandle
import arcs.sdk.EntityBase
import arcs.sdk.HandleHolderBase
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update

/** Singleton used to track event ordering; it is reset before each test. */
object Witness {
  private val _events = atomic(listOf<String>())
  val events: List<String>
    get() = _events.value

  // If true, all events are logged; otherwise only updates are included.
  var recordVerbose = false

  fun clear() = _events.update { emptyList() }

  fun log(event: String) = _events.update { it + event }

  fun logVerbose(event: String) {
    if (recordVerbose) _events.update { it + event }
  }
}

/**
 * This class provides the implementation for all test particles. It parses the encoded messaging
 * sequence received on a read handle (in the 'msg' field) and forwards the next payload to the
 * appropriate write handle.
 *
 * The message encoding is a simple stream of particle codes identifying the sequence in which the
 * "message" should be sent around the arc. The sequence can branched by instructing particles to
 * write multiple entities by using multiple lines with brace notation:
 *
 *    C1 C2 C3 WO    // indicates a linear sequence of Cycle1, Cycle2, Cycle3, WriteOnlyEgress
 *
 *    C1 M1 {        // start with Cycle1, Middle1, then send three messages:
 *      M2 {         // - first to Middle2, which then branches again:
 *        M3 WO      //   - Middle3 then WriteOnlyEgress
 *        RF M2 M1   //   - Reflect, back to Middle2 then Middle1
 *      }            //
 *      C2a          // - second just to Cycle2 (on the 'a' channel of the duplicate handles)
 *      M2 M1 C2b    // - third to Middle2 again, bounce it back then to Cycle2 on the 'b' channel
 *    }
 *
 * Particle handles are named after the particle on the other end of the handle connection: M1.i2
 * is the Middle1 handle reading from Ingress2; FB.c1 is the Feedback handle writing to Cycle1.
 * This is both for readability and to allow the Messager class to find the destination handle
 * using the particle codes in the message stream.
 *
 * @param particleCode Used to ignore self-initiated update events on read/write handles.
 * @param handles The particle's handle container; provides a generic mechanism for looking up
 *     destination handles based on the particle code in the message payload.
 * @param createEntity Constructor for the particle's internal entity class.
 */
class Messager<T : Storable>(
  val particleCode: String,
  val handles: HandleHolderBase,
  val createEntity: (msg: String, src: String) -> T
) {
  private var str = ""
  private var pos = 0

  @Suppress("UNCHECKED_CAST")
  fun go(event: String, input: EntityBase?) {
    // Writing to a read/write handles causes an update on the same particle, which doesn't
    // work with our messaging forwarding system; halt further message propagation.
    if (input!!.getSingletonValue("src") as String == particleCode) {
      return
    }

    Witness.log(event)

    // Ensure a final newline to simplify parsing; the -1 in the while loop accounts for this
    // newline in otherwise empty input.
    str = (input.getSingletonValue("msg") as String).trim().toLowerCase() + '\n'
    pos = 0
    while (pos < str.length - 1) {
      val (dest, payload) = next()
      val handle = requireNotNull(handles.handles[dest]) {
        "$event: output handle '$dest' not found; test input is incorrect"
      }
      (handle as WriteSingletonHandle<T>).store(createEntity(payload, particleCode))
    }
  }

  // Extracts the next destination particle code and the payload to send. For simple linear
  // sequences this is just the first code and the rest of the line:
  //    'A B C D' -> dst = 'A', payload = 'B C D'
  //
  // For brace expressions the enclosed text is extracted, leaving any further lines for the
  // next 'next()' invocation:
  //    A {       -> dst = 'A', payload = '{\n B C\n D E F\n }'; 'G H' will be left in [str] buffer
  //      B C
  //      D E F
  //    }
  //    G H
  private fun next(): Pair<String, String> {
    // Extract the first alphanumeric token as the destination code and skip any following spaces.
    var start = pos
    while (str[pos] !in " {\n") pos++
    val dest = str.substring(start, pos)
    while (str[pos] == ' ') pos++

    // Find the next opening brace or newline.
    start = pos
    while (str[pos] !in "{\n") pos++

    // Extract the payload for the message to be sent to dest.
    val payload = if (str[pos] == '\n') {
      // Newline: simple linear sequence of messages; send the rest of the line.
      //   A B C D  ->  send('B C D')
      str.substring(start, pos).trimEnd()
    } else {
      // Brace: multi-line block for sending parallel message sequences.
      matchBrace()
      pos++ // skip closing '}'

      // If the brace block is immediately after dest, strip the outer block before sending:
      //   A { ... }    ->  send('...')
      //   A B { ... }  ->  send('B { ... }')
      val strip = if (str[start] == '{') 1 else 0
      str.substring(start + strip, pos - strip).trim()
    }

    // Advance to the next non-whitespace character or the end of the input.
    pos++
    while (pos < str.length && str[pos] in " \n") pos++
    return dest to payload
  }

  // Move [pos] past the matching closing brace, accounting for nested brace blocks.
  private fun matchBrace() {
    while (++pos < str.length) {
      when (str[pos]) {
        '{' -> matchBrace()
        '}' -> return
      }
    }
    throw IllegalArgumentException("unmatched '{'")
  }
}

// Particle classes.

class Ingress1 : AbstractIngress1() {
  val messager = Messager("I1", handles, ::Ingress1Internal1)

  override fun onFirstStart() = Witness.logVerbose("I1.first")

  override fun onStart() = Witness.logVerbose("I1.start")

  override fun onReady() = Witness.logVerbose("I1.ready")

  override fun onUpdate() = messager.go("I1.update", handles.input.fetch())

  override fun onShutdown() = Witness.logVerbose("I1.stop")
}

class Ingress2 : AbstractIngress2() {
  val messager = Messager("I2", handles, ::Ingress2Internal1)

  override fun onFirstStart() = Witness.logVerbose("I2.first")

  override fun onStart() = Witness.logVerbose("I2.start")

  override fun onReady() = Witness.logVerbose("I2.ready")

  override fun onUpdate() = messager.go("I2.update", handles.input.fetch())

  override fun onShutdown() = Witness.logVerbose("I2.stop")
}

class Cycle1 : AbstractCycle1() {
  val messager = Messager("C1", handles, ::Cycle1Internal1)

  // For particles with multiple read handles, set up individual onUpdate handlers.
  override fun onFirstStart() {
    Witness.logVerbose("C1.first")
    handles.i1.onUpdate { messager.go("C1.i1.update", it.new) }
    handles.i2.onUpdate { messager.go("C1.i2.update", it.new) }
    handles.fb.onUpdate { messager.go("C1.fb.update", it.new) }
    handles.c3.onUpdate { messager.go("C1.c3.update", it.new) }
  }

  override fun onStart() = Witness.logVerbose("C1.start")

  override fun onReady() = Witness.logVerbose("C1.ready")

  // This can be verbose because each handle logs its own update.
  override fun onUpdate() = Witness.logVerbose("C1.update")

  override fun onShutdown() = Witness.logVerbose("C1.stop")
}

class Cycle2 : AbstractCycle2() {
  val messager = Messager("C2", handles, ::Cycle2Internal1)

  override fun onFirstStart() {
    Witness.logVerbose("C2.first")
    handles.m1a.onUpdate { messager.go("C2.m1a.update", it.new) }
    handles.m1b.onUpdate { messager.go("C2.m1b.update", it.new) }
    handles.c1.onUpdate { messager.go("C2.c1.update", it.new) }
  }

  override fun onStart() = Witness.logVerbose("C2.start")

  override fun onReady() = Witness.logVerbose("C2.ready")

  override fun onUpdate() = Witness.logVerbose("C2.update")

  override fun onShutdown() = Witness.logVerbose("C2.stop")
}

class Cycle3 : AbstractCycle3() {
  val messager = Messager("C3", handles, ::Cycle3Internal1)

  override fun onFirstStart() {
    Witness.logVerbose("C3.first")
    handles.c2.onUpdate { messager.go("C3.c2.update", it.new) }
    handles.rw.onUpdate { messager.go("C3.rw.update", it.new) }
  }

  override fun onStart() = Witness.logVerbose("C3.start")

  override fun onReady() = Witness.logVerbose("C3.ready")

  override fun onUpdate() = Witness.logVerbose("C3.update")

  override fun onShutdown() = Witness.logVerbose("C3.stop")
}

class ReadWriteEgress : AbstractReadWriteEgress() {
  val messager = Messager("RW", handles, ::ReadWriteEgressInternal1)

  // For particles with only one read handle, use the particle-level onUpdate to respond.
  override fun onFirstStart() = Witness.logVerbose("RW.first")

  override fun onStart() = Witness.logVerbose("RW.start")

  override fun onReady() = Witness.logVerbose("RW.ready")

  override fun onUpdate() = messager.go("RW.update", handles.c3.fetch())

  override fun onShutdown() = Witness.logVerbose("RW.stop")
}

class Feedback : AbstractFeedback() {
  val messager = Messager("FB", handles, ::FeedbackInternal1)

  override fun onFirstStart() = Witness.logVerbose("FB.first")

  override fun onStart() = Witness.logVerbose("FB.start")

  override fun onReady() = Witness.logVerbose("FB.ready")

  override fun onUpdate() = messager.go("FB.update", handles.rw.fetch())

  override fun onShutdown() = Witness.logVerbose("FB.stop")
}

class Middle1 : AbstractMiddle1() {
  val messager = Messager("M1", handles, ::Middle1Internal1)

  override fun onFirstStart() {
    Witness.logVerbose("M1.first")
    handles.i2.onUpdate { messager.go("M1.i2.update", it.new) }
    handles.c1.onUpdate { messager.go("M1.c1.update", it.new) }
    handles.m2.onUpdate { messager.go("M1.m2.update", it.new) }
  }

  override fun onStart() = Witness.logVerbose("M1.start")

  override fun onReady() = Witness.logVerbose("M1.ready")

  override fun onUpdate() = Witness.logVerbose("M1.update")

  override fun onShutdown() = Witness.logVerbose("M1.stop")
}

class Middle2 : AbstractMiddle2() {
  val messager = Messager("M2", handles, ::Middle2Internal1)

  override fun onFirstStart() {
    Witness.logVerbose("M2.first")
    handles.i2.onUpdate { messager.go("M2.i2.update", it.new) }
    handles.m3r.onUpdate { messager.go("M2.m3r.update", it.new) }
    handles.m1.onUpdate { messager.go("M2.m1.update", it.new) }
    handles.rf.onUpdate { messager.go("M2.rf.update", it.new) }
  }

  override fun onStart() = Witness.logVerbose("M2.start")

  override fun onReady() = Witness.logVerbose("M2.ready")

  override fun onUpdate() = Witness.logVerbose("M2.update")

  override fun onShutdown() = Witness.logVerbose("M2.stop")
}

class Middle3 : AbstractMiddle3() {
  val messager = Messager("M3", handles, ::Middle3Internal1)

  // This particle only has one read handle but we'll use the handle event to respond for more
  // thorough coverage (other one-handle particles just use the particle-level onUpdate).
  override fun onFirstStart() {
    Witness.logVerbose("M3.first")
    handles.m2r.onUpdate { messager.go("M3.m2r.update", it.new) }
  }

  override fun onStart() = Witness.logVerbose("M3.start")

  override fun onReady() = Witness.logVerbose("M3.ready")

  override fun onUpdate() = Witness.logVerbose("M3.update")

  override fun onShutdown() = Witness.logVerbose("M3.stop")
}

class Reflect : AbstractReflect() {
  val messager = Messager("RF", handles, ::Reflect_M2)

  override fun onFirstStart() = Witness.logVerbose("RF.first")

  override fun onStart() = Witness.logVerbose("RF.start")

  override fun onReady() = Witness.logVerbose("RF.ready")

  override fun onUpdate() = messager.go("RF.update", handles.m2.fetch())

  override fun onShutdown() = Witness.logVerbose("RF.stop")
}

class WriteOnlyEgress : AbstractWriteOnlyEgress() {
  val messager = Messager("WO", handles, ::WriteOnlyEgressInternal1)

  override fun onFirstStart() {
    Witness.logVerbose("WO.first")

    // Just log the handle events; this is a write-only particle so no further messaging occurs.
    handles.c3.onUpdate { Witness.log("WO.c3.update") }
    handles.m3.onUpdate { Witness.log("WO.m3.update") }
  }

  override fun onStart() = Witness.logVerbose("WO.start")

  override fun onReady() = Witness.logVerbose("WO.ready")

  override fun onUpdate() = Witness.logVerbose("WO.update")

  override fun onShutdown() = Witness.logVerbose("WO.stop")
}

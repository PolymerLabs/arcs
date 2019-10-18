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

package arcs.crdt.entity

import org.junit.BeforeClass
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [CrdtEntityDescriptor]. */
@RunWith(JUnit4::class)
class CrdtEntityDescriptorTest {
  @Test(expected = IllegalArgumentException::class)
  fun unsupportedType_triggersIllegalArgumentException() {
    CrdtEntityDescriptor("dummy" to MyDummyType::class)
  }

  @Test
  fun supportedTypes_areSupported() {
    CrdtEntityDescriptor(
      "name" to Text::class,
      "age" to Number::class,
      "website" to Url::class,
      "knowsKotlin" to Boolean::class
    )

    // Shouldn't throw.
  }

  class MyDummyType

  companion object {
    @BeforeClass
    @JvmStatic
    fun beforeClass() {
      FieldValueInterpreter.registerPrimitives()
    }
  }
}

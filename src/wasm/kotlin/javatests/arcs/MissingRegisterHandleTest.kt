/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package wasm.kotlin.javatests.arcs

import arcs.Particle
import arcs.wasm.toAddress
import kotlin.native.internal.ExportForCppRuntime
import kotlin.native.Retain

class MissingRegisterHandleTest : Particle()

@Retain
@ExportForCppRuntime("_newMissingRegisterHandleTest")
fun constructMissingRegisterHandleTest() = MissingRegisterHandleTest().toAddress()

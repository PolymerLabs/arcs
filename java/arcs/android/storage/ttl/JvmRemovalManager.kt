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

package arcs.android.storage.ttl

import arcs.core.storage.ttl.RemovalManager
import arcs.jvm.util.JvmTime

/**
 * [JvmRemovalManager] is a jvm implementation of [RemovalManager.
 */
class JvmRemovalManager() : RemovalManager(JvmTime)

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
package arcs.core.allocator

import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/**
 * Tests run on JVM.
 */
@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class CoreAllocatorIntegrationTest : AllocatorIntegrationTestBase()

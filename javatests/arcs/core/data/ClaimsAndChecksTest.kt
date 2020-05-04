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

package arcs.core.data

import arcs.core.data.InformationFlowLabel.SemanticTag
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ClaimsAndChecksTest {
    @Test
    fun prettyPrintSemanticTag() {
        assertThat("${SemanticTag("packageName")}").isEqualTo("packageName")
        assertThat("${SemanticTag("coarseLocation")}").isEqualTo("coarseLocation")
    }
}

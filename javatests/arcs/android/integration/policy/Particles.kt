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
package arcs.android.integration.policy

/** Egresses Thing{ a, b }. */
class EgressAB : AbstractEgressAB() {
  val outputForTest = mutableListOf<Thing>()
  override fun onFirstStart() {
    handles.output.onUpdate { outputForTest.addAll(it.added) }
  }
}

/** Ingresses Things. */
class IngressThing : AbstractIngressThing() {
  override fun onFirstStart() {
    handles.input.storeAll(listOf(
      Thing("Once", "upon", "a", "midnight"),
      Thing("dreary", "while", "I", "pondered"),
      Thing("weak", "and", "weary", "over"),
      Thing("many", "a", "quaint", "and"),
      Thing("curious", "volumes", "of", "forgotten"),
      Thing("lore", "while", "I", "nodded")
    ))
  }
}

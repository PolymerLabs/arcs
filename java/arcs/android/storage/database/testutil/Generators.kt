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

package arcs.android.storage.database.testutil

import arcs.core.crdt.VersionMap
import arcs.core.data.Schema
import arcs.core.storage.RawReference
import arcs.core.storage.database.DatabaseOp
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.testutil.FuzzingRandom
import arcs.core.testutil.Generator
import arcs.core.testutil.IntInRange
import arcs.core.testutil.ListOf

/**
 * Generates a sequence of [DatabaseOp]s.
 */
class DatabaseOpsGenerator(
  val s: FuzzingRandom,
  val idGenerator: Generator<String>,
  val addGenerator: Generator<DatabaseOp.AddToCollection>,
  val removeGenerator: Generator<DatabaseOp.RemoveFromCollection>
) : Generator<List<DatabaseOp>> {
  override fun invoke(): List<DatabaseOp> {
    return ListOf(
      OpGenerator(s, addGenerator, removeGenerator),
      IntInRange(s, 1, 10)
    )()
  }
}

class OpGenerator(
  val s: FuzzingRandom,
  val addGenerator: Generator<DatabaseOp.AddToCollection>,
  val removeGenerator: Generator<DatabaseOp.RemoveFromCollection>
) : Generator<DatabaseOp> {
  override fun invoke(): DatabaseOp {
    return if (s.nextBoolean()) {
      addGenerator()
    } else {
      removeGenerator()
    }
  }
}

class AddOpGenerator(val idGenerator: Generator<String>) :
  Generator<DatabaseOp.AddToCollection> {
  override fun invoke(): DatabaseOp.AddToCollection {
    val reference = RawReference(idGenerator(), DummyStorageKey("backing"), VersionMap())
    return DatabaseOp.AddToCollection(reference, Schema.EMPTY)
  }
}

class RemoveOpGenerator(val idGenerator: Generator<String>) :
  Generator<DatabaseOp.RemoveFromCollection> {
  override fun invoke(): DatabaseOp.RemoveFromCollection {
    return DatabaseOp.RemoveFromCollection(idGenerator(), Schema.EMPTY)
  }
}

/**
 * Generates Strings from a fixed pool of 10 values. Useful if you want ids that overlap some of the
 * times.
 */
class SmallIntegerIdGenerator(val s: FuzzingRandom) : Generator<String> {
  override fun invoke(): String {
    return s.nextLessThan(10).toString()
  }
}

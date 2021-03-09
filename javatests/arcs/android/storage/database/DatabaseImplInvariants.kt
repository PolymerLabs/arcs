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

package arcs.android.storage.database

import arcs.core.storage.StorageKey
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.DatabaseOp
import com.google.common.truth.Truth.assertThat

/**
 * Applies the list of ops to the given storage key, and checks that the collection looks as
 * expected.
 */
suspend fun invariant_addAndRemoveOpsAddUp(
  ops: List<DatabaseOp>,
  storageKey: StorageKey,
  database: DatabaseImpl
) {
  // Precondition
  assertThat(ops).isNotEmpty()

  // Body
  val expected = mutableSetOf<String>()
  for (op in ops) {
    if (op is DatabaseOp.AddToCollection) expected.add(op.value.id)
    if (op is DatabaseOp.RemoveFromCollection) expected.remove(op.id)
  }
  val schema = ops.first().schema

  ops.forEach { database.applyOp(storageKey, it) }

  // Postcondition
  val collection = database.get(
    storageKey,
    DatabaseData.Collection::class,
    schema
  ) as DatabaseData.Collection?
  val collectionRefs = collection?.values?.map { it.rawReference.id } ?: emptyList()
  assertThat(collectionRefs).containsExactlyElementsIn(expected)
}

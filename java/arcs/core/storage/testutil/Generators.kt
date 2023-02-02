package arcs.core.storage.testutil

import arcs.core.storage.RawReference
import arcs.core.storage.StorageKey
import arcs.core.testutil.FuzzingRandom
import arcs.core.testutil.Generator
import arcs.core.testutil.midSizedAlphaNumericString

/**
 * A [Generator] of [RawReference]s. Requires an [id] Generator and a [storageKey] Generator.
 */
class RawReferenceGenerator(
  val id: Generator<String>,
  val storageKey: Generator<StorageKey>
) : Generator<RawReference> {
  override fun invoke() = RawReference(id(), storageKey(), null)
}

/**
 * A [Generator] of [DummyStorageKey]s
 */
class DummyStorageKeyGenerator(val key: Generator<String>) : Generator<StorageKey> {
  override fun invoke() = DummyStorageKey(key())
}

/**
 * A simple utility for generating dummy [RawReference] objects.
 */
fun dummyReference(s: FuzzingRandom): Generator<RawReference> {
  return RawReferenceGenerator(
    midSizedAlphaNumericString(s),
    DummyStorageKeyGenerator(midSizedAlphaNumericString(s))
  )
}

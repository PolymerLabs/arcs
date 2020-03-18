/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.golden

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support references or optional field detection

import arcs.sdk.*
import arcs.sdk.testing.*
import kotlinx.coroutines.CoroutineScope

class GoldTestHarness<P : AbstractGold>(
    factory : (CoroutineScope) -> P
) : BaseTestHarness<P>(factory, listOf(
    HandleDescriptor("data", Gold_Data, HandleFlavor.SINGLETON),
    HandleDescriptor("qCollection", Gold_QCollection, HandleFlavor.COLLECTION),
    HandleDescriptor("alias", Gold_Alias, HandleFlavor.SINGLETON),
    HandleDescriptor("collection", Gold_Collection, HandleFlavor.SINGLETON)
)) {
    val data: ReadWriteSingletonHandle<Gold_Data> by handleMap
    val qCollection: ReadWriteCollectionHandle<Gold_QCollection> by handleMap
    val alias: ReadWriteSingletonHandle<Gold_Alias> by handleMap
    val collection: ReadWriteSingletonHandle<Gold_Collection> by handleMap
}

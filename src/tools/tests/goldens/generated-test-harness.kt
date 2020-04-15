/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.golden

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support optional field detection

import arcs.core.entity.HandleContainerType
import arcs.core.entity.HandleDataType
import arcs.core.entity.HandleMode
import arcs.core.entity.HandleSpec
import arcs.sdk.*
import arcs.sdk.testing.*
import kotlinx.coroutines.CoroutineScope

class GoldTestHarness<P : AbstractGold>(
    factory : (CoroutineScope) -> P
) : BaseTestHarness<P>(factory, listOf(
    HandleSpec("data", HandleMode.ReadWrite, HandleContainerType.Singleton, Gold_Data, HandleDataType.Entity),
    HandleSpec("allPeople", HandleMode.ReadWrite, HandleContainerType.Collection, Gold_AllPeople, HandleDataType.Entity),
    HandleSpec("qCollection", HandleMode.ReadWrite, HandleContainerType.Collection, Gold_QCollection, HandleDataType.Entity),
    HandleSpec("alias", HandleMode.ReadWrite, HandleContainerType.Singleton, Gold_Alias, HandleDataType.Entity),
    HandleSpec("collection", HandleMode.ReadWrite, HandleContainerType.Collection, Gold_Collection, HandleDataType.Entity)
)) {
    val data: ReadWriteSingletonHandle<Gold_Data> by handleMap
    val allPeople: ReadWriteCollectionHandle<Gold_AllPeople> by handleMap
    val qCollection: ReadWriteQueryCollectionHandle<Gold_QCollection, String> by handleMap
    val alias: ReadWriteSingletonHandle<Gold_Alias> by handleMap
    val collection: ReadWriteCollectionHandle<Gold_Collection> by handleMap
}

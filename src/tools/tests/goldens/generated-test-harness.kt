/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.golden

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support optional field detection

import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.ReferenceType
import arcs.core.data.SingletonType
import arcs.core.data.TupleType
import arcs.core.entity.HandleContainerType
import arcs.core.entity.HandleDataType
import arcs.core.entity.HandleMode
import arcs.core.entity.HandleSpec
import arcs.core.entity.Tuple1
import arcs.core.entity.Tuple2
import arcs.core.entity.Tuple3
import arcs.core.entity.Tuple4
import arcs.core.entity.Tuple5
import arcs.sdk.*
import arcs.sdk.testing.*
import kotlinx.coroutines.CoroutineScope

class GoldTestHarness<P : AbstractGold>(
    factory : (CoroutineScope) -> P
) : BaseTestHarness<P>(factory, listOf(
    HandleSpec("data", HandleMode.Read, SingletonType(EntityType(Gold_Data.SCHEMA)), setOf(Gold_Data)),
    HandleSpec(
        "allPeople",
        HandleMode.Read,
        CollectionType(EntityType(Gold_AllPeople.SCHEMA)),
        setOf(Gold_AllPeople)
    ),
    HandleSpec(
        "qCollection",
        HandleMode.ReadQuery,
        CollectionType(EntityType(Gold_QCollection.SCHEMA)),
        setOf(Gold_QCollection)
    ),
    HandleSpec(
        "alias",
        HandleMode.Write,
        SingletonType(EntityType(Gold_Alias.SCHEMA)),
        setOf(Gold_Alias)
    ),
    HandleSpec(
        "collection",
        HandleMode.Read,
        CollectionType(EntityType(Gold_Collection.SCHEMA)),
        setOf(Gold_Collection)
    )
)) {
    val data: ReadWriteSingletonHandle<Gold_Data> by handleMap
    val allPeople: ReadWriteCollectionHandle<Gold_AllPeople> by handleMap
    val qCollection: ReadWriteQueryCollectionHandle<Gold_QCollection, String> by handleMap
    val alias: ReadWriteSingletonHandle<Gold_Alias> by handleMap
    val collection: ReadWriteCollectionHandle<Gold_Collection> by handleMap
}

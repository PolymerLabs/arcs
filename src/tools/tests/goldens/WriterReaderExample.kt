/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.core.data.testdata

//
// GENERATED CODE -- DO NOT EDIT
//

import arcs.core.data.*
import arcs.core.storage.StorageKeyParser

object IngestionPlan : Plan(
    listOf(
        Particle(
            "Writer",
            "",
            mapOf(
                "data" to HandleConnection(
                    CreateableStorageKey("my-handle-id"),
                    HandleMode.Write,
                    EntityType(Writer_Data.SCHEMA),
                    Ttl.Days(20)
                )
            )
        )
    ),
    "writingArcId"
)
object ConsumptionPlan : Plan(
    listOf(
        Particle(
            "Reader",
            "",
            mapOf(
                "data" to HandleConnection(
                    StorageKeyParser.parse(
                        "reference-mode://{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/Thing}{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:writingArcId/handle/my-handle-id}"
                    ),
                    HandleMode.Read,
                    EntityType(Reader_Data.SCHEMA),
                    Ttl.Infinite
                )
            )
        )
    ),
    "readingArcId"
)

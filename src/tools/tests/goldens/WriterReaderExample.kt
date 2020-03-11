/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.core.data.testdata

//
// GENERATED CODE -- DO NOT EDIT
//

import arcs.core.data.*
import arcs.core.storage.*

object IngestionPlan : Plan(
    listOf(
        Particle(
            "Writer",
            "",
            mapOf(
                "data" to HandleConnection(
                    StorageKeyParser.parse(""),
                    HandleMode.Write,
                    EntityType(Writer_Data_Spec.SCHEMA),
                    Ttl.Infinite
                )
            )
        )
    )
)
object ConsumptionPlan : Plan(
    listOf(
        Particle(
            "Reader",
            "",
            mapOf(
                "data" to HandleConnection(
                    StorageKeyParser.parse("reference-mode://{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/Thing}{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:writingArcId/handle/my-handle-id}"),
                    HandleMode.Read,
                    EntityType(Reader_Data_Spec.SCHEMA),
                    Ttl.Infinite
                )
            )
        )
    )
)

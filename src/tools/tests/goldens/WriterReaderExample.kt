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
                    CreateableStorageKey("my-handle-id"),
                    HandleMode.Write,
                    null,
                    null
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
                    StorageKeyParser.parse("db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!228758327805841:writingArcId/handle/my-handle-id"),
                    HandleMode.Read,
                    null,
                    null
                )
            )
        )
    )
)

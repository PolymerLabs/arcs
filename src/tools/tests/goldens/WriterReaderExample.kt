/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.core.data.testdata

//
// GENERATED CODE -- DO NOT EDIT
//

import arcs.core.data.*
import arcs.core.storage.*

object WritingRecipePlan : Plan(
    listOf(
        Particle(
            "Writer",
            "",
            mapOf("data" to HandleConnection(StorageKeyParser.parse(""), HandleMode.Write, null, null))
        )
    )
)
object ReadingRecipePlan : Plan(
    listOf(
        Particle(
            "Reader",
            "",
            mapOf("data" to HandleConnection(StorageKeyParser.parse("ramdisk://"), HandleMode.Read, null, null))
        )
    )
)

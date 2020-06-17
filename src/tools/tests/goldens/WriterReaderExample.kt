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
            "Reader",
            "arcs.core.data.testdata.Reader",
            mapOf(
                "data" to HandleConnection(
                    StorageKeyParser.parse(
                        "reference-mode://{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/Thing}{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:writingArcId/handle/my-handle-id}"
                    ),
                    HandleMode.Read,
                    SingletonType(EntityType(Reader_Data.SCHEMA)),
                    Ttl.Days(20),
                    listOf(
                        Annotation("persistent", emptyMap()),
                        Annotation("ttl", mapOf("value" to AnnotationParam.Str("20d")))
                    )
                )
            )
        ),
        Particle(
            "Writer",
            "arcs.core.data.testdata.Writer",
            mapOf(
                "data" to HandleConnection(
                    StorageKeyParser.parse(
                        "reference-mode://{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/Thing}{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:writingArcId/handle/my-handle-id}"
                    ),
                    HandleMode.Write,
                    SingletonType(EntityType(Writer_Data.SCHEMA)),
                    Ttl.Days(20),
                    listOf(
                        Annotation("persistent", emptyMap()),
                        Annotation("ttl", mapOf("value" to AnnotationParam.Str("20d")))
                    )
                )
            )
        )
    ),
    listOf(Annotation("arcId", mapOf("id" to AnnotationParam.Str("writingArcId")))),
    "writingArcId"
)
object ConsumptionPlan : Plan(
    listOf(
        Particle(
            "Reader",
            "arcs.core.data.testdata.Reader",
            mapOf(
                "data" to HandleConnection(
                    StorageKeyParser.parse(
                        "reference-mode://{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/Thing}{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:writingArcId/handle/my-handle-id}"
                    ),
                    HandleMode.Read,
                    SingletonType(EntityType(Reader_Data.SCHEMA)),
                    Ttl.Infinite,
                    emptyList()
                )
            )
        )
    ),
    listOf(Annotation("arcId", mapOf("id" to AnnotationParam.Str("readingArcId")))),
    "readingArcId"
)
object EphemeralWritingPlan : Plan(
    listOf(
        Particle(
            "Writer",
            "arcs.core.data.testdata.Writer",
            mapOf(
                "data" to HandleConnection(
                    StorageKeyParser.parse("create://my-ephemeral-handle-id"),
                    HandleMode.Write,
                    SingletonType(EntityType(Writer_Data.SCHEMA)),
                    Ttl.Infinite,
                    emptyList()
                )
            )
        )
    )
)
object EphemeralReadingPlan : Plan(
    listOf(
        Particle(
            "Reader",
            "arcs.core.data.testdata.Reader",
            mapOf(
                "data" to HandleConnection(
                    StorageKeyParser.parse(
                        "reference-mode://{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/Thing}{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:writingArcId/handle/my-handle-id}"
                    ),
                    HandleMode.Read,
                    SingletonType(EntityType(Reader_Data.SCHEMA)),
                    Ttl.Infinite,
                    emptyList()
                )
            )
        )
    )
)
object ReferencesRecipePlan : Plan(
    listOf(
        Particle(
            "ReadWriteReferences",
            "",
            mapOf(
                "inThingRefs" to HandleConnection(
                    StorageKeyParser.parse(
                        "db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:referencesArcId/handle/my-refs-id"
                    ),
                    HandleMode.Read,
                    CollectionType(ReferenceType(EntityType(ReadWriteReferences_InThingRefs.SCHEMA))),
                    Ttl.Infinite,
                    listOf(Annotation("persistent", emptyMap()))
                ),
                "outThingRef" to HandleConnection(
                    StorageKeyParser.parse(
                        "memdb://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:referencesArcId/handle/my-ref-id"
                    ),
                    HandleMode.Write,
                    SingletonType(ReferenceType(EntityType(ReadWriteReferences_OutThingRef.SCHEMA))),
                    Ttl.Days(1),
                    listOf(Annotation("ttl", mapOf("value" to AnnotationParam.Str("1d"))))
                )
            )
        )
    ),
    listOf(Annotation("arcId", mapOf("id" to AnnotationParam.Str("referencesArcId")))),
    "referencesArcId"
)

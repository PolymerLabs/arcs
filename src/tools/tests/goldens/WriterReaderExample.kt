/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.core.data.testdata

//
// GENERATED CODE -- DO NOT EDIT
//

import arcs.core.data.*
import arcs.core.data.Plan.*
import arcs.core.storage.StorageKeyParser
import arcs.core.entity.toPrimitiveValue

val Ingestion_Handle0 = Handle(
    StorageKeyParser.parse(
        "reference-mode://{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/Thing}{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:writingArcId/handle/my-handle-id}"
    ),
    EntityType(
        Schema(
            setOf(SchemaName("Thing")),
            SchemaFields(
                singletons = mapOf("name" to FieldType.Text),
                collections = emptyMap()
            ),
            "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516",
            refinement = { _ -> true },
            query = null
        )
    ),
    listOf(
        Annotation("persistent", emptyMap()),
        Annotation("ttl", mapOf("value" to AnnotationParam.Str("20d")))
    )
)
val IngestionPlan = Plan(
    listOf(
        Particle(
            "Reader",
            "arcs.core.data.testdata.Reader",
            mapOf(
                "data" to HandleConnection(
                    Ingestion_Handle0,
                    HandleMode.Read,
                    SingletonType(EntityType(Reader_Data.SCHEMA)),
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
                    Ingestion_Handle0,
                    HandleMode.Write,
                    SingletonType(EntityType(Writer_Data.SCHEMA)),
                    listOf(
                        Annotation("persistent", emptyMap()),
                        Annotation("ttl", mapOf("value" to AnnotationParam.Str("20d")))
                    )
                )
            )
        )
    ),
    listOf(Ingestion_Handle0),
    listOf(Annotation("arcId", mapOf("id" to AnnotationParam.Str("writingArcId"))))
)
val Consumption_Handle0 = Handle(
    StorageKeyParser.parse(
        "reference-mode://{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/Thing}{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:writingArcId/handle/my-handle-id}"
    ),
    EntityType(
        Schema(
            setOf(SchemaName("Thing")),
            SchemaFields(
                singletons = mapOf("name" to FieldType.Text),
                collections = emptyMap()
            ),
            "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516",
            refinement = { _ -> true },
            query = null
        )
    ),
    emptyList()
)
val ConsumptionPlan = Plan(
    listOf(
        Particle(
            "Reader",
            "arcs.core.data.testdata.Reader",
            mapOf(
                "data" to HandleConnection(
                    Consumption_Handle0,
                    HandleMode.Read,
                    SingletonType(EntityType(Reader_Data.SCHEMA)),
                    emptyList()
                )
            )
        )
    ),
    listOf(Consumption_Handle0),
    listOf(Annotation("arcId", mapOf("id" to AnnotationParam.Str("readingArcId"))))
)
val EphemeralWriting_Handle0 = Handle(
    StorageKeyParser.parse("create://my-ephemeral-handle-id"),
    EntityType(
        Schema(
            setOf(SchemaName("Thing")),
            SchemaFields(
                singletons = mapOf("name" to FieldType.Text),
                collections = emptyMap()
            ),
            "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516",
            refinement = { _ -> true },
            query = null
        )
    ),
    emptyList()
)
val EphemeralWritingPlan = Plan(
    listOf(
        Particle(
            "Writer",
            "arcs.core.data.testdata.Writer",
            mapOf(
                "data" to HandleConnection(
                    EphemeralWriting_Handle0,
                    HandleMode.Write,
                    SingletonType(EntityType(Writer_Data.SCHEMA)),
                    emptyList()
                )
            )
        )
    ),
    listOf(EphemeralWriting_Handle0),
    emptyList()
)
val EphemeralReading_Handle0 = Handle(
    StorageKeyParser.parse(
        "reference-mode://{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/Thing}{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:writingArcId/handle/my-handle-id}"
    ),
    EntityType(
        Schema(
            setOf(SchemaName("Thing")),
            SchemaFields(
                singletons = mapOf("name" to FieldType.Text),
                collections = emptyMap()
            ),
            "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516",
            refinement = { _ -> true },
            query = null
        )
    ),
    emptyList()
)
val EphemeralReadingPlan = Plan(
    listOf(
        Particle(
            "Reader",
            "arcs.core.data.testdata.Reader",
            mapOf(
                "data" to HandleConnection(
                    EphemeralReading_Handle0,
                    HandleMode.Read,
                    SingletonType(EntityType(Reader_Data.SCHEMA)),
                    emptyList()
                )
            )
        )
    ),
    listOf(EphemeralReading_Handle0),
    emptyList()
)
val ReferencesRecipe_Handle0 = Handle(
    StorageKeyParser.parse(
        "db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:referencesArcId/handle/my-refs-id"
    ),
    CollectionType(
        ReferenceType(
            EntityType(
                Schema(
                    setOf(SchemaName("Thing")),
                    SchemaFields(
                        singletons = mapOf("name" to FieldType.Text),
                        collections = emptyMap()
                    ),
                    "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516",
                    refinement = { _ -> true },
                    query = null
                )
            )
        )
    ),
    listOf(Annotation("persistent", emptyMap()))
)
val ReferencesRecipe_Handle1 = Handle(
    StorageKeyParser.parse(
        "memdb://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:referencesArcId/handle/my-ref-id"
    ),
    ReferenceType(
        EntityType(
            Schema(
                setOf(SchemaName("Thing")),
                SchemaFields(
                    singletons = mapOf("name" to FieldType.Text),
                    collections = emptyMap()
                ),
                "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516",
                refinement = { _ -> true },
                query = null
            )
        )
    ),
    listOf(Annotation("ttl", mapOf("value" to AnnotationParam.Str("1d"))))
)
val ReferencesRecipePlan = Plan(
    listOf(
        Particle(
            "ReadWriteReferences",
            "",
            mapOf(
                "inThingRefs" to HandleConnection(
                    ReferencesRecipe_Handle0,
                    HandleMode.Read,
                    CollectionType(ReferenceType(EntityType(ReadWriteReferences_InThingRefs.SCHEMA))),
                    listOf(Annotation("persistent", emptyMap()))
                ),
                "outThingRef" to HandleConnection(
                    ReferencesRecipe_Handle1,
                    HandleMode.Write,
                    SingletonType(ReferenceType(EntityType(ReadWriteReferences_OutThingRef.SCHEMA))),
                    listOf(Annotation("ttl", mapOf("value" to AnnotationParam.Str("1d"))))
                )
            )
        )
    ),
    listOf(ReferencesRecipe_Handle0, ReferencesRecipe_Handle1),
    listOf(Annotation("arcId", mapOf("id" to AnnotationParam.Str("referencesArcId"))))
)

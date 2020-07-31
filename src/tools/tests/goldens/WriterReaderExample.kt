/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.core.data.testdata

//
// GENERATED CODE -- DO NOT EDIT
//

import arcs.core.data.*
import arcs.core.data.expression.*
import arcs.core.data.expression.Expression.*
import arcs.core.data.expression.Expression.BinaryOp.*
import arcs.core.data.Plan.*
import arcs.core.storage.StorageKeyParser
import arcs.core.entity.toPrimitiveValue
import java.time.Instant

val IngestionOnly_Handle0 by lazy {
    Handle(
        StorageKeyParser.parse(
            "reference-mode://{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/Thing}{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/!:writingOnlyArcId/handle/my-handle-id-writing}"
        ),
        arcs.core.data.SingletonType(
            arcs.core.data.EntityType(
                arcs.core.data.Schema(
                    setOf(arcs.core.data.SchemaName("Thing")),
                    arcs.core.data.SchemaFields(
                        singletons = mapOf("name" to arcs.core.data.FieldType.Text),
                        collections = emptyMap()
                    ),
                    "503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b",
                    refinementExpression = true.asExpr(),
                    queryExpression = true.asExpr()
                )
            )
        ),
        listOf(
            Annotation("persistent", emptyMap()),
            Annotation("ttl", mapOf("value" to AnnotationParam.Str("20d")))
        )
    )
}
val IngestionOnlyPlan by lazy {
    Plan(
        listOf(
            Particle(
                "Writer",
                "arcs.core.data.testdata.Writer",
                mapOf(
                    "data" to HandleConnection(
                        IngestionOnly_Handle0,
                        HandleMode.Write,
                        arcs.core.data.SingletonType(arcs.core.data.EntityType(Writer_Data.SCHEMA)),
                        listOf(
                            Annotation("persistent", emptyMap()),
                            Annotation("ttl", mapOf("value" to AnnotationParam.Str("20d")))
                        )
                    )
                )
            )
        ),
        listOf(IngestionOnly_Handle0),
        listOf(Annotation("arcId", mapOf("id" to AnnotationParam.Str("writingOnlyArcId"))))
    )
}
val Ingestion_Handle0 by lazy {
    Handle(
        StorageKeyParser.parse(
            "reference-mode://{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/Thing}{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/!:writingArcId/handle/my-handle-id}"
        ),
        arcs.core.data.SingletonType(
            arcs.core.data.EntityType(
                arcs.core.data.Schema(
                    setOf(arcs.core.data.SchemaName("Thing")),
                    arcs.core.data.SchemaFields(
                        singletons = mapOf("name" to arcs.core.data.FieldType.Text),
                        collections = emptyMap()
                    ),
                    "503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b",
                    refinementExpression = true.asExpr(),
                    queryExpression = true.asExpr()
                )
            )
        ),
        listOf(
            Annotation("persistent", emptyMap()),
            Annotation("ttl", mapOf("value" to AnnotationParam.Str("20d")))
        )
    )
}
val IngestionPlan by lazy {
    Plan(
        listOf(
            Particle(
                "Reader",
                "arcs.core.data.testdata.Reader",
                mapOf(
                    "data" to HandleConnection(
                        Ingestion_Handle0,
                        HandleMode.Read,
                        arcs.core.data.SingletonType(arcs.core.data.EntityType(Reader_Data.SCHEMA)),
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
                        arcs.core.data.SingletonType(arcs.core.data.EntityType(Writer_Data.SCHEMA)),
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
}
val Consumption_Handle0 by lazy {
    Handle(
        StorageKeyParser.parse(
            "reference-mode://{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/Thing}{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/!:writingArcId/handle/my-handle-id}"
        ),
        arcs.core.data.SingletonType(
            arcs.core.data.EntityType(
                arcs.core.data.Schema(
                    setOf(arcs.core.data.SchemaName("Thing")),
                    arcs.core.data.SchemaFields(
                        singletons = mapOf("name" to arcs.core.data.FieldType.Text),
                        collections = emptyMap()
                    ),
                    "503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b",
                    refinementExpression = true.asExpr(),
                    queryExpression = true.asExpr()
                )
            )
        ),
        emptyList()
    )
}
val ConsumptionPlan by lazy {
    Plan(
        listOf(
            Particle(
                "Reader",
                "arcs.core.data.testdata.Reader",
                mapOf(
                    "data" to HandleConnection(
                        Consumption_Handle0,
                        HandleMode.Read,
                        arcs.core.data.SingletonType(arcs.core.data.EntityType(Reader_Data.SCHEMA)),
                        emptyList()
                    )
                )
            )
        ),
        listOf(Consumption_Handle0),
        listOf(Annotation("arcId", mapOf("id" to AnnotationParam.Str("readingArcId"))))
    )
}
val EphemeralWriting_Handle0 by lazy {
    Handle(
        StorageKeyParser.parse("create://my-ephemeral-handle-id"),
        arcs.core.data.SingletonType(
            arcs.core.data.EntityType(
                arcs.core.data.Schema(
                    setOf(arcs.core.data.SchemaName("Thing")),
                    arcs.core.data.SchemaFields(
                        singletons = emptyMap(),
                        collections = emptyMap()
                    ),
                    "239fa577fcc63fc84d28a2f5e98199847c239629",
                    refinementExpression = true.asExpr(),
                    queryExpression = true.asExpr()
                )
            )
        ),
        listOf(
            Annotation("inMemory", emptyMap()),
            Annotation("ttl", mapOf("value" to AnnotationParam.Str("99d")))
        )
    )
}
val EphemeralWritingPlan by lazy {
    Plan(
        listOf(
            Particle(
                "Writer",
                "arcs.core.data.testdata.Writer",
                mapOf(
                    "data" to HandleConnection(
                        EphemeralWriting_Handle0,
                        HandleMode.Write,
                        arcs.core.data.SingletonType(arcs.core.data.EntityType(Writer_Data.SCHEMA)),
                        listOf(
                            Annotation("inMemory", emptyMap()),
                            Annotation("ttl", mapOf("value" to AnnotationParam.Str("99d")))
                        )
                    )
                )
            )
        ),
        listOf(EphemeralWriting_Handle0),
        emptyList()
    )
}
val EphemeralReading_Handle0 by lazy {
    Handle(
        StorageKeyParser.parse(
            "reference-mode://{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/Thing}{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/!:writingOnlyArcId/handle/my-handle-id-writing}"
        ),
        arcs.core.data.SingletonType(
            arcs.core.data.EntityType(
                arcs.core.data.Schema(
                    setOf(arcs.core.data.SchemaName("Thing")),
                    arcs.core.data.SchemaFields(
                        singletons = mapOf("name" to arcs.core.data.FieldType.Text),
                        collections = emptyMap()
                    ),
                    "503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b",
                    refinementExpression = true.asExpr(),
                    queryExpression = true.asExpr()
                )
            )
        ),
        emptyList()
    )
}
val EphemeralReadingPlan by lazy {
    Plan(
        listOf(
            Particle(
                "Reader",
                "arcs.core.data.testdata.Reader",
                mapOf(
                    "data" to HandleConnection(
                        EphemeralReading_Handle0,
                        HandleMode.Read,
                        arcs.core.data.SingletonType(arcs.core.data.EntityType(Reader_Data.SCHEMA)),
                        emptyList()
                    )
                )
            )
        ),
        listOf(EphemeralReading_Handle0),
        emptyList()
    )
}
val ReferencesRecipe_Handle0 by lazy {
    Handle(
        StorageKeyParser.parse(
            "db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/!:referencesArcId/handle/my-refs-id"
        ),
        arcs.core.data.CollectionType(
            arcs.core.data.ReferenceType(
                arcs.core.data.EntityType(
                    arcs.core.data.Schema(
                        setOf(arcs.core.data.SchemaName("Thing")),
                        arcs.core.data.SchemaFields(
                            singletons = mapOf("name" to arcs.core.data.FieldType.Text),
                            collections = emptyMap()
                        ),
                        "503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b",
                        refinementExpression = true.asExpr(),
                        queryExpression = true.asExpr()
                    )
                )
            )
        ),
        listOf(
            Annotation("persistent", emptyMap()),
            Annotation("ttl", mapOf("value" to AnnotationParam.Str("99d")))
        )
    )
}
val ReferencesRecipe_Handle1 by lazy {
    Handle(
        StorageKeyParser.parse(
            "memdb://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/!:referencesArcId/handle/my-ref-id"
        ),
        arcs.core.data.SingletonType(
            arcs.core.data.ReferenceType(
                arcs.core.data.EntityType(
                    arcs.core.data.Schema(
                        setOf(arcs.core.data.SchemaName("Thing")),
                        arcs.core.data.SchemaFields(
                            singletons = mapOf("name" to arcs.core.data.FieldType.Text),
                            collections = emptyMap()
                        ),
                        "503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b",
                        refinementExpression = true.asExpr(),
                        queryExpression = true.asExpr()
                    )
                )
            )
        ),
        listOf(
            Annotation("inMemory", emptyMap()),
            Annotation("ttl", mapOf("value" to AnnotationParam.Str("1d")))
        )
    )
}
val ReferencesRecipePlan by lazy {
    Plan(
        listOf(
            Particle(
                "ReadWriteReferences",
                "",
                mapOf(
                    "inThingRefs" to HandleConnection(
                        ReferencesRecipe_Handle0,
                        HandleMode.Read,
                        arcs.core.data.CollectionType(
                            arcs.core.data.ReferenceType(arcs.core.data.EntityType(ReadWriteReferences_InThingRefs.SCHEMA))
                        ),
                        listOf(
                            Annotation("persistent", emptyMap()),
                            Annotation("ttl", mapOf("value" to AnnotationParam.Str("99d")))
                        )
                    ),
                    "outThingRef" to HandleConnection(
                        ReferencesRecipe_Handle1,
                        HandleMode.ReadWrite,
                        arcs.core.data.SingletonType(
                            arcs.core.data.ReferenceType(arcs.core.data.EntityType(ReadWriteReferences_OutThingRef.SCHEMA))
                        ),
                        listOf(
                            Annotation("inMemory", emptyMap()),
                            Annotation("ttl", mapOf("value" to AnnotationParam.Str("1d")))
                        )
                    )
                )
            )
        ),
        listOf(ReferencesRecipe_Handle0, ReferencesRecipe_Handle1),
        listOf(Annotation("arcId", mapOf("id" to AnnotationParam.Str("referencesArcId"))))
    )
}

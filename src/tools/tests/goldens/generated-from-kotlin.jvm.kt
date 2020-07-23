package arcs.core.data.testdata

import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.Plan
import arcs.core.data.ReferenceType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.StorageKeyParser

val Ingestion_handle0: Plan.Handle = Plan.Handle(
            storageKey =
                StorageKeyParser.parse("reference-mode://{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/Thing}{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:writingArcId/handle/my-handle-id}"),
            type = EntityType(Schema(
            names = setOf(SchemaName("Thing")),
            fields = SchemaFields(
            singletons = mapOf("name" to FieldType.Text),
            collections = emptyMap()
        ),
            hash = "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516"
        )),    
            annotations = emptyList()
        )

val IngestionPlan: Plan = Plan(
            particles = emptyList(),
            handles = listOf(Ingestion_handle0),
            annotations = emptyList()
        )

val Consumption_handle0: Plan.Handle = Plan.Handle(
            storageKey =
                StorageKeyParser.parse("reference-mode://{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/Thing}{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:writingArcId/handle/my-handle-id}"),
            type = EntityType(Schema(
            names = setOf(SchemaName("Thing")),
            fields = SchemaFields(
            singletons = mapOf("name" to FieldType.Text),
            collections = emptyMap()
        ),
            hash = "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516"
        )),    
            annotations = emptyList()
        )

val ConsumptionPlan: Plan = Plan(
            particles = emptyList(),
            handles = listOf(Consumption_handle0),
            annotations = emptyList()
        )

val EphemeralWriting_handle0: Plan.Handle = Plan.Handle(
            storageKey = StorageKeyParser.parse("create://my-ephemeral-handle-id"),
            type = EntityType(Schema(
            names = setOf(SchemaName("Thing")),
            fields = SchemaFields(
            singletons = mapOf("name" to FieldType.Text),
            collections = emptyMap()
        ),
            hash = "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516"
        )),    
            annotations = emptyList()
        )

val EphemeralWritingPlan: Plan = Plan(
            particles = emptyList(),
            handles = listOf(EphemeralWriting_handle0),
            annotations = emptyList()
        )

val EphemeralReading_handle0: Plan.Handle = Plan.Handle(
            storageKey =
                StorageKeyParser.parse("reference-mode://{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/Thing}{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:writingArcId/handle/my-handle-id}"),
            type = EntityType(Schema(
            names = setOf(SchemaName("Thing")),
            fields = SchemaFields(
            singletons = mapOf("name" to FieldType.Text),
            collections = emptyMap()
        ),
            hash = "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516"
        )),    
            annotations = emptyList()
        )

val EphemeralReadingPlan: Plan = Plan(
            particles = emptyList(),
            handles = listOf(EphemeralReading_handle0),
            annotations = emptyList()
        )

val ReferencesRecipe_handle0: Plan.Handle = Plan.Handle(
            storageKey =
                StorageKeyParser.parse("db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:referencesArcId/handle/my-refs-id"),
            type = CollectionType(ReferenceType(EntityType(Schema(
            names = setOf(SchemaName("Thing")),
            fields = SchemaFields(
            singletons = mapOf("name" to FieldType.Text),
            collections = emptyMap()
        ),
            hash = "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516"
        )))),    
            annotations = emptyList()
        )

val ReferencesRecipe_handle1: Plan.Handle = Plan.Handle(
            storageKey =
                StorageKeyParser.parse("memdb://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:referencesArcId/handle/my-ref-id"),
            type = ReferenceType(EntityType(Schema(
            names = setOf(SchemaName("Thing")),
            fields = SchemaFields(
            singletons = mapOf("name" to FieldType.Text),
            collections = emptyMap()
        ),
            hash = "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516"
        ))),    
            annotations = emptyList()
        )

val ReferencesRecipePlan: Plan = Plan(
            particles = emptyList(),
            handles = listOf(ReferencesRecipe_handle0, ReferencesRecipe_handle1),
            annotations = emptyList()
        )

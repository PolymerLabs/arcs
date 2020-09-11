// GENERATED CODE -- DO NOT EDIT
//
// TODO(b/161941018): Improve whitespace / formatting.
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

val IngestionOnly_handle0: Plan.Handle = Plan.Handle(
            storageKey =
                StorageKeyParser.parse("reference-mode://{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/Thing}{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/!:writingOnlyArcId/handle/my-handle-id-writing}"),
            type = EntityType(Schema(
            names = setOf(SchemaName("Thing")),
            fields = SchemaFields(
            singletons = mapOf("name" to FieldType.Text, "description" to FieldType.Text),
            collections = emptyMap()
        ),
            hash = "bcad5f5a9eba82228b6e85d611f11f80ced7c7b5"
        )),    
            annotations = emptyList()
        )

val IngestionOnlyPlan: Plan = Plan(
            particles = emptyList(),
            handles = listOf(IngestionOnly_handle0),
            annotations = emptyList()
        )

val Ingestion_handle0: Plan.Handle = Plan.Handle(
            storageKey =
                StorageKeyParser.parse("reference-mode://{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/Thing}{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/!:writingArcId/handle/my-handle-id}"),
            type = EntityType(Schema(
            names = setOf(SchemaName("Thing")),
            fields = SchemaFields(
            singletons = mapOf("name" to FieldType.Text),
            collections = emptyMap()
        ),
            hash = "503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b"
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
                StorageKeyParser.parse("reference-mode://{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/Thing}{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/!:writingArcId/handle/my-handle-id}"),
            type = EntityType(Schema(
            names = setOf(SchemaName("Thing")),
            fields = SchemaFields(
            singletons = mapOf("name" to FieldType.Text),
            collections = emptyMap()
        ),
            hash = "503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b"
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
            singletons = mapOf("name" to FieldType.Text, "description" to FieldType.Text),
            collections = emptyMap()
        ),
            hash = "bcad5f5a9eba82228b6e85d611f11f80ced7c7b5"
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
                StorageKeyParser.parse("reference-mode://{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/Thing}{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/!:writingOnlyArcId/handle/my-handle-id-writing}"),
            type = EntityType(Schema(
            names = setOf(SchemaName("Thing")),
            fields = SchemaFields(
            singletons = mapOf("name" to FieldType.Text),
            collections = emptyMap()
        ),
            hash = "503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b"
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
                StorageKeyParser.parse("db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/!:referencesArcId/handle/my-refs-id"),
            type = CollectionType(ReferenceType(EntityType(Schema(
            names = setOf(SchemaName("Thing")),
            fields = SchemaFields(
            singletons = mapOf("name" to FieldType.Text),
            collections = emptyMap()
        ),
            hash = "503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b"
        )))),    
            annotations = emptyList()
        )

val ReferencesRecipe_handle1: Plan.Handle = Plan.Handle(
            storageKey =
                StorageKeyParser.parse("memdb://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/!:referencesArcId/handle/my-ref-id"),
            type = ReferenceType(EntityType(Schema(
            names = setOf(SchemaName("Thing")),
            fields = SchemaFields(
            singletons = mapOf("name" to FieldType.Text),
            collections = emptyMap()
        ),
            hash = "503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b"
        ))),    
            annotations = emptyList()
        )

val ReferencesRecipePlan: Plan = Plan(
            particles = emptyList(),
            handles = listOf(ReferencesRecipe_handle0, ReferencesRecipe_handle1),
            annotations = emptyList()
        )

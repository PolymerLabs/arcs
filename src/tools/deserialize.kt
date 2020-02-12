package arcs.tools


data class Type(
    val tag: String,
    val data: TypeData
)

sealed class TypeData

data class NestedType(
    val tag: String,
    val data: Type
) : TypeData()
//data class Count(val tag: String) : TypeData()
data class Entity(
    val names: List<String>,
    val fields: Map<String, SerializedSchemaField>,
    val description: Description
) : TypeData()
//data class Singleton(val tag: String) : TypeData()


data class Description(val pattern: String?)

data class SerializedHandleConnectionSpec(
    val direction: String,
    val relaxed: Boolean,
    val name: String,
    val type: TypeData,
    val isOptional: Boolean,
    val tags: List<String>?,
    val dependantConnections: List<SerializedHandleConnectionSpec>,
    val check: String?
)

data class SerializedSlotConnectionSpec(
    val name: String,
    val isRequired: Boolean?,
    val isSet: Boolean?,
    val tags: List<String>?,
    val formFactor: String,
    val handles: List<String>?,
    val provideSlotConnections: List<SerializedSlotConnectionSpec>
    // val check: Check?
)

data class SerializedParticleSpec(
    val name: String,
    val id: String?,
    val verbs: List<String>,
    val args: List<SerializedHandleConnectionSpec>,
    // val description: Description,
    val external: Boolean,
    val implFile: String,
    val implBlobUrl: String?,
    val modality: List<String>,
    val slotConnections: List<SerializedSlotConnectionSpec>
)

data class SerializedSchemaLocation(
    val offset: Integer,
    val line: Integer,
    val column: Integer
)

sealed class Field

data class PrimitiveField(
    val kind: String,
    val type: String,
    // val refinement: Refinement,
    val location: Map<String, SerializedSchemaLocation>
): Field()

data class ReferenceField(
   val kind: String,
   val schema: Field
): Field()

data class InlineField(
    val kind: String,
    val model: Type
): Field()

data class SerializedSchemaField(
    val kind: String,
    val type: String,
    // val refinement: Refinement
    val location: Map<String, SerializedSchemaLocation>
)

data class SerializedSchema(
    val names: List<String>,
    val fields: Map<String, SerializedSchemaField>,
    // val description: Description,
    val refinement: Boolean
)

data class EntryPoint(
    val particles: List<SerializedParticleSpec>,
    val schemas: List<SerializedSchema>
)

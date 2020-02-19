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

data class Entity(
    val names: List<String>,
    val fields: Map<String, SchemaField>,
    val description: Description
//  val refinement: Refinement
) : TypeData()


data class Description(val pattern: String?)

data class HandleConnectionSpec(
    val name: String,
    val type: TypeData,
    val direction: String,
    val isOptional: Boolean,
    val dependantConnections: List<HandleConnectionSpec>
)

data class ParticleSpec(
    val particleName: String,
    val location: String,
    val handles: List<HandleConnectionSpec>
)

data class SchemaLocation(
    val offset: Integer,
    val line: Integer,
    val column: Integer
)

data class SchemaField(
    val kind: String,
    val type: String?,
    val schema: SchemaModel?,
    // val refinement: Refinement
    val location: Map<String, SchemaLocation>?
)

data class SchemaModel(
    val kind: String,
    val model: Type
)

data class SerializedManifest(
    val particles: List<ParticleSpec>,
    val schemas: List<Entity>
)

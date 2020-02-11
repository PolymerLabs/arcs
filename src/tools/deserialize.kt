package arcs.tools

data class Type (val tag: String)

data class Description(val pattern: String?)

data class SerializedHandleConnectionSpec(
    val direction: String,
    val relaxed: Boolean,
    val name: String,
    // val type: Type
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

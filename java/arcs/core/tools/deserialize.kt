package arcs.core.tools

import arcs.core.data.ParticleSpec
import arcs.core.data.Schema
import com.google.gson.Gson

data class SerializedManifest(
//    val particles: List<ParticleSpec>,
    val schemas: List<Schema>
)


fun parse(jsonString: String): SerializedManifest {
    val gson = Gson()

    return gson.fromJson(jsonString, SerializedManifest::class.java)
}

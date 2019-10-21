package arcs.android.accelerator

import arcs.api.Constants
import com.beust.klaxon.Json

data class ParticleData(@Json("id") val particleId: String, @Json("name") val particleName: String,
                        @Json(Constants.PROVIDED_SLOT_ID_FIELD) val providedSlotId: String = "")
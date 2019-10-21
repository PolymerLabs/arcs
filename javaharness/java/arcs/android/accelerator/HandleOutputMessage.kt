package arcs.android.accelerator

import arcs.api.PecInnerPort
import com.beust.klaxon.Json

data class Content(val template: String, val model: String)

class HandleOutputMessage(@Json(PecInnerPort.PARTICLE_FIELD)
                          var particle: String? = null,

                          @Json(PecInnerPort.CONTENT_FIELD)
                          var content: Content? = null) : MessageBody() {

  override fun processMessage(pecId: String, accelerator: AcceleratorPipesShell) {
    TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
  }
}
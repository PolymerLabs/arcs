package arcs.android.accelerator

import arcs.android.accelerator.Log.logger
import arcs.api.PecInnerPort
import com.beust.klaxon.Json

data class Content(val template: String, val model: String)

class HandleOutputMessage(@Json(PecInnerPort.PARTICLE_FIELD)
                          var particle: String? = null,
                          @Json(PecInnerPort.CONTENT_FIELD)
                          var content: Content? = null) : MessageBody() {

  override fun processPecMessage(pecId: String, accelerator: AcceleratorPipesShell) {
    logger.info("""
      NOT IMPLEMENTED: Output $particle with content ${content?.template}
      and model ${content?.model}
    """.trimIndent())
  }
}
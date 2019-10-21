package arcs.android.accelerator

import arcs.android.accelerator.Log.logger
import arcs.api.PecInnerPort
import com.beust.klaxon.Json

class HandleRemoveMessage : HandleMessage() {
  override fun processPecMessage(pecId: String, accelerator: AcceleratorPipesShell) {
    logger.info("NOT IMPLEMENTED: HandleRemoveMessage $pecId")
  }
}

class HandleRemoveMultipleMessage : HandleMessage() {
  override fun processPecMessage(pecId: String, accelerator: AcceleratorPipesShell) {
    logger.info("NOT IMPLEMENTED: HandleRemoveMultipleMessage $pecId")
  }

}

class HandleToListMessage : HandleMessage() {
  override fun processPecMessage(pecId: String, accelerator: AcceleratorPipesShell) {
    logger.info("NOT IMPLEMENTED: HandleToListMessage $pecId")
  }
}

class HandleStoreMessage : HandleMessage() {
  override fun processPecMessage(pecId: String, accelerator: AcceleratorPipesShell) {
    logger.info("NOT IMPLEMENTED: HandleStoreMessage $pecId")
  }
}

abstract class HandleMessage : MessageBody() {
  @Json(PecInnerPort.DATA_FIELD)
  var data: String? = null

  @Json(PecInnerPort.HANDLE_PARTICLE_ID_FIELD)
  var handleParticleId: String? = null
}
package arcs.android.accelerator

import arcs.api.PecInnerPort
import com.beust.klaxon.Json

class HandleRemoveMessage : HandleMessage() {
  override fun processMessage(pecId: String, accelerator: AcceleratorPipesShell) {
    TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
  }

}

class HandleRemoveMultipleMessage : HandleMessage() {
  override fun processMessage(pecId: String, accelerator: AcceleratorPipesShell) {
    TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
  }

}

class HandleToListMessage : HandleMessage() {
  override fun processMessage(pecId: String, accelerator: AcceleratorPipesShell) {
    TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
  }
}

class HandleStoreMessage : HandleMessage() {
  override fun processMessage(pecId: String, accelerator: AcceleratorPipesShell) {
    TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
  }

}

abstract class HandleMessage : MessageBody() {
  @Json(PecInnerPort.DATA_FIELD)
  var data: String? = null

  @Json(PecInnerPort.HANDLE_PARTICLE_ID_FIELD)
  var handleParticleId: String? = null
}
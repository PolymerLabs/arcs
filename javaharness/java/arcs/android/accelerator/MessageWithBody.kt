package arcs.android.accelerator

import arcs.api.PecInnerPort
import com.beust.klaxon.Json

abstract class MessageBody(
    @Json(PecInnerPort.PROXY_HANDLE_ID_FIELD) val proxyHandleId: String? = null,
    @Json(PecInnerPort.PROXY_CALLBACK_FIELD) val callback: String? = null
) {
  abstract fun processPecMessage(pecId: String, acceleratorPipesShell: AcceleratorPipesShell)
}

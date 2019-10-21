package arcs.android.accelerator

import arcs.android.accelerator.Log.logger
import arcs.api.Constants
import arcs.api.PecInnerPort
import com.beust.klaxon.Json
import com.beust.klaxon.TypeAdapter
import com.beust.klaxon.TypeFor
import kotlin.reflect.KClass

/**
 * Handles all outgoing messages sent by [PecInnerPort.postMessage].
 */
class PecMessagePayload(@Json(PecInnerPort.MESSAGE_PEC_ID_FIELD)
                        val pecId: String,
                        @Json(Constants.PEC_ENTITY_KEY)
                        val pecMessage: PecMessage) : ShellMessage(Constants.PEC_MESSAGE) {

  override fun process(accelerator: AcceleratorPipesShell) {
    logger.info("Pec message received with pecId $pecId and arcId")
    pecMessage!!.processPecMessage(pecId!!, accelerator)
  }
}

class PecMessageAdapter : TypeAdapter<MessageBody> {
  override fun classFor(type: Any): KClass<out MessageBody> = when (type as String) {
    PecInnerPort.INITIALIZE_PROXY_MSG -> InitializeProxyMessage::class
    PecInnerPort.SYNCHRONIZE_PROXY_MSG -> SynchronizeProxyMessage::class
    PecInnerPort.HANDLE_STORE_MSG -> HandleStoreMessage::class
    PecInnerPort.HANDLE_TO_LIST_MSG -> HandleToListMessage::class
    PecInnerPort.HANDLE_REMOVE_MSG -> HandleRemoveMessage::class
    PecInnerPort.HANDLE_REMOVE_MULTIPLE_MSG -> HandleRemoveMultipleMessage::class
    PecInnerPort.OUTPUT_MSG -> HandleOutputMessage::class
    else -> throw IllegalArgumentException("Unknown type: $type")
  }
}

class PecMessage(
    @TypeFor(field = PecInnerPort.MESSAGE_BODY_FIELD, adapter = PecMessageAdapter::class)
    @Json(PecInnerPort.MESSAGE_TYPE_FIELD)
    val messageType: String,
    @Json(PecInnerPort.MESSAGE_BODY_FIELD)
    val messageBody: MessageBody) {
  fun processPecMessage(pecId: String, accelerator: AcceleratorPipesShell) {
    messageBody.processPecMessage(pecId, accelerator)
  }
}


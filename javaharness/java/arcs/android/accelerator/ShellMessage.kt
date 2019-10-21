package arcs.android.accelerator

import arcs.api.Constants
import com.beust.klaxon.Json
import com.beust.klaxon.TypeAdapter
import com.beust.klaxon.TypeFor
import kotlin.reflect.KClass

/**
 * This is used by Klaxon to implement polymorphic deserialization by introspecting the field
 * value, and mapping it to a concrete class.
 */
class ShellMessageAdapter : TypeAdapter<ShellMessage> {
  override fun classFor(type: Any): KClass<out ShellMessage> = when (type as String) {
    Constants.RUN_ARC_MESSAGE -> RunArcMessage::class
    Constants.STOP_ARC_MESSAGE -> StopArcMessage::class
    Constants.PEC_MESSAGE -> PecMessagePayload::class
    else -> throw IllegalArgumentException("Unknown type: $type")
  }
}


/**
 * Base class for all messages send to the runtime. We use Klaxon for parsing and object binding,
 * because kotlinx.serialization doesn't have a convenient bazel rule yet.
 */
@TypeFor(field = Constants.MESSAGE_FIELD, adapter = ShellMessageAdapter::class)
abstract class ShellMessage(@Json(Constants.MESSAGE_FIELD) val message: String) {
  /**
   * Executable the parsed message in the context of the accelerator.
   */
  abstract fun process(accelerator: AcceleratorPipesShell)
}
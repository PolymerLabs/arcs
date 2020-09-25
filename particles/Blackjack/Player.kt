package arcs.tutorials.blackjack

import arcs.sdk.Utils.log
import arcs.sdk.wasm.WasmHandle

class Player : AbstractPlayer() {
  val name = "Player"

  init {
    eventHandler("onHit") {
      handles.cardRequest.store(Player_CardRequest(player = name))
      log("Hit.")
    }
    eventHandler("onStand") {
      log("Stand to be implemented.")
    }
  }

  override fun getTemplate(slotName: String) = """
            $name: <button type="button" on-click="onHit"> Hit </button>
            <button type="button" on-click="onStand"> Stand </button>
            <span>{{hand}}</span>
         """.trimIndent()

  override fun populateModel(slotName: String, model: Map<String, Any>): Map<String, Any> {
    val desc = handles.hand.fetchAll().joinToString(separator = ":") { card ->
      Card.cardDesc(card.value.toInt())
    }
    return model + mapOf("hand" to desc)
  }

  override fun onHandleUpdate(handle: WasmHandle) {
    // We only respond to changes to nextCard.
    if (handle.name != "nextCard") return
    val nc = handles.nextCard.fetch()?.takeIf { it.player == name } ?: return
    handles.hand.store(Player_Hand(value = nc.card))
    this.renderOutput()
  }
}

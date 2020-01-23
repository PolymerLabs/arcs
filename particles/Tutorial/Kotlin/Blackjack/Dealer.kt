package arcs.tutorials.blackjack

import arcs.sdk.Handle
import arcs.sdk.Utils.log

class Dealer : AbstractDealer() {
    val name = "Dealer"

    override fun getTemplate(slotName: String) = """
        ${name}: <button type="button" on-click="onHit"> Hit </button> 
        <button type="button" on-click="onStand"> Stand </button>
        <span>{{hand}}</span> 
     """.trimIndent()

    override fun populateModel(slotName: String, model: Map<String, Any>): Map<String, Any> {
        val desc = hand.joinToString(separator = ":", transform = {
            card -> Card.cardDesc(card.value.toInt())
        })
        return model + mapOf("hand" to desc)
    }

    override fun onHandleUpdate(handle: Handle) {
        // We only respond to changes to nextCard.
        if (handle.name != "nextCard") return
        val nc = nextCard.get()
        if (nc == null) { return }
        if (nc.player != name) { return }
        hand.store(Dealer_Hand(value = nc.card))
        this.renderOutput()
    }

    init {
        eventHandler("onHit") {
            cardRequest.set(Dealer_CardRequest(player = name))
            log("Hit.")
        }
        eventHandler("onStand") {
            log("Stand to be implemented.")
        }
    }
}
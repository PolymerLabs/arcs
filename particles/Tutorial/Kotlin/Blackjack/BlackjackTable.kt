package arcs.tutorials.blackjack

import arcs.sdk.Handle

class BlackjackTable : AbstractBlackjackTable() {
    override fun getTemplate(slotName: String): String {
        return """
           <b>Welcome to the Arcs Casino!</b> <p>
           <div slotId="dealerHandSlot"></div>
           <div slotId="playerHandSlot"></div>
        """.trimIndent()

    }
}

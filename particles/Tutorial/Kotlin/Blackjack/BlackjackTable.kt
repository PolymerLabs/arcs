package arcs.tutorials.blackjack

import arcs.sdk.Handle

class BlackjackTable : AbstractBlackjackTable() {
    override fun getTemplate(slotName: String): String {
        return """
           <b>Hello from the Arcs Casino!</b> <p>
           <div slotId="nextCardSlot"></div>
        """.trimIndent()

    }
}

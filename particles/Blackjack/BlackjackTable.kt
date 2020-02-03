package arcs.tutorials.blackjack

class BlackjackTable : AbstractBlackjackTable() {
    override fun getTemplate(slotName: String) =
        """
           <b>Welcome to the Arcs Casino!</b> <p>
           <div slotId="dealerHandSlot"></div>
           <div slotId="playerHandSlot"></div>
        """.trimIndent()
}

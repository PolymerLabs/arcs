package arcs.tutorials.blackjack

import kotlin.random.Random
import arcs.sdk.Handle

import arcs.sdk.Utils.log

class DealingShoe : AbstractDealingShoe() {
    val cardPresent = "x"
    val cardAbsent = "-"
    val numDecks = 1
    val totalCards = numDecks * 52
    val emptyDeck = cardAbsent.repeat(totalCards)

    override fun getTemplate(slotName: String) = """
        Card is <span>{{nextCard}}</span>
     """.trimIndent()

    override fun populateModel(slotName: String, model: Map<String, Any>): Map<String, Any> {
        return model + mapOf("nextCard" to nextCard.toString())
    }

    override fun onHandleUpdate(handle: Handle) {
        if (handle.name != "cardRequest") { return }
        val request = cardRequest.get()
        if (request == null) { return }
        val card: Card? = pickACard()
        if (card == null) { return }
        nextCard.set(DealingShoe_NextCard(
                player = request.player,
                card = card.value.toDouble()))
        this.renderOutput()
    }

    /**
     * Returns an initialized set of decks.
     */
    fun initializedDecks(): DealingShoe_Decks{
        var d = DealingShoe_Decks()
        d.cards = cardPresent.repeat(totalCards)
        return d
    }

    fun pickACard(): Card? {
        var localDecks = decks.get() ?: initializedDecks()
        var choice = Random.nextInt(totalCards)
        var cards = localDecks.cards
        if (cards.equals(emptyDeck)) return null
        // This could be done more efficiently, but should suffice for now.
        var readCards = 0
        while (readCards < totalCards && cards[choice] == cardAbsent[0]) {
            choice = (choice + 1) % totalCards
            ++readCards
        }
        localDecks.cards = cards.replaceRange(choice, choice + 1, cardAbsent)
        decks.set(localDecks)
        return Card(choice % 52)
    }
}

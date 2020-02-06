package arcs.tutorials.blackjack

import arcs.sdk.Handle
import kotlin.random.Random

class DealingShoe : AbstractDealingShoe() {
    val cardPresent = "x"
    val cardAbsent = "-"
    val numDecks = 1
    val totalCards = numDecks * 52
    val emptyDeck = cardAbsent.repeat(totalCards)

    override fun getTemplate(slotName: String) = "Card is <span>{{nextCard}}</span>"

    override fun populateModel(slotName: String, model: Map<String, Any>) =
        model + mapOf("nextCard" to handles.nextCard.toString())

    override fun onHandleUpdate(handle: Handle) {
        if (handle.name != "cardRequest") return
        val request = handles.cardRequest.fetch() ?: return
        val card = pickACard() ?: return
        handles.nextCard.set(
            DealingShoe_NextCard(
                player = request.player,
                card = card.value.toDouble()
            )
        )
        this.renderOutput()
    }

    /**
     * Returns an initialized set of decks.
     */
    fun initializedDecks(): DealingShoe_Decks {
        return DealingShoe_Decks(
            cards = cardPresent.repeat(totalCards)
        )
    }

    fun pickACard(): Card? {
        val localDecks = handles.decks.fetch() ?: initializedDecks()
        var choice = Random.nextInt(totalCards)
        val cards = localDecks.cards.takeIf { it != emptyDeck } ?: return null
        // This could be done more efficiently, but should suffice for now.
        var readCards = 0
        while (readCards < totalCards && cards[choice] == cardAbsent[0]) {
            choice = (choice + 1) % totalCards
            ++readCards
        }
        handles.decks.set(localDecks.copy(
            cards = cards.replaceRange(choice, choice + 1, cardAbsent)
        ))
        return Card(choice % 52)
    }
}

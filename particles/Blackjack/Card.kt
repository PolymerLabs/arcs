package arcs.tutorials.blackjack

// Describes a card in a deck.
class Card(inputValue: Int = -1) {
    val value = inputValue

    init {
        require(inputValue in -1 until 52)
    }

    override fun toString() = Card.cardDesc(value)

    companion object {
        val cardNames = arrayOf("A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K")
        var suitNames = arrayOf("♦", "♥", "♠", "♣")
        public fun cardDesc(faceValue: Int): String {
            if (faceValue == -1) return "Joker"
            return cardNames[faceValue % 13] + suitNames[faceValue % 4]
        }
    }
}

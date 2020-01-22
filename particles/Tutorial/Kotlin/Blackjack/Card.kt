package arcs.tutorials.blackjack

class Card (inputValue: Int = -1) {
    val cardNames = arrayOf("A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K")
    var suitNames = arrayOf("♦", "♥", "♠", "♣")
    val value = inputValue

    init  {
      assert (inputValue >= -1 && inputValue < 52)
    }

    override fun toString(): String {
        if (value == -1) return "Joker"
        return cardNames[value % 13] + suitNames[value % 4]
    }
}
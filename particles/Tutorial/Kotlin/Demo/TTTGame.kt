package arcs.tutorials

import arcs.Collection
import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.TTTGame_Events
import arcs.TTTGame_GameState
import arcs.TTTGame_PlayerOne
import arcs.TTTGame_PlayerOneMove
import arcs.TTTGame_PlayerTwo
import arcs.TTTGame_PlayerTwoMove
import kotlin.native.internal.ExportForCppRuntime

class TTTGame : Particle() {
    private val gameState = Singleton { TTTGame_GameState() }
    private val playerOne = Singleton { TTTGame_PlayerOne() }
    private val playerOneMove = Singleton { TTTGame_PlayerOneMove() }
    private val playerTwo = Singleton { TTTGame_PlayerTwo() }
    private val playerTwoMove = Singleton { TTTGame_PlayerTwoMove() }
    private val events = Collection { TTTGame_Events() }

    private val winningSequences = arrayOf(
        arrayOf(0, 1, 2),
        arrayOf(3, 4, 5),
        arrayOf(6, 7, 8),
        arrayOf(0, 3, 6),
        arrayOf(1, 4, 7),
        arrayOf(2, 5, 8),
        arrayOf(0, 4, 8),
        arrayOf(2, 4, 6)
    )

    init {
        registerHandle("gameState", gameState)
        registerHandle("playerOne", playerOne)
        registerHandle("playerOneMove", playerOneMove)
        registerHandle("playerTwo", playerTwo)
        registerHandle("playerTwoMove", playerTwoMove)
        registerHandle("events", events)
    }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (this.gameState.get()?.board == null) {
            this.gameState.set(TTTGame_GameState(
                board = ",,,,,,,,",
                currentPlayer = 0.0,
                gameOver = false
            ))
        }
        if (handle.name.equals("playerOne") && this.playerOne.get()?.id != 0.0) {
            val p1 = playerOne.get() ?: TTTGame_PlayerOne()
            p1.id = 0.0
            this.playerOne.set(p1)
        }
        if (handle.name.equals("playerTwo") && this.playerTwo.get()?.id != 1.0) {
            val p2 = playerTwo.get() ?: TTTGame_PlayerOne()
            p2.id = 1.0
            this.playerTwo.set(p2)
        }
    }

    override fun populateModel(slotName: String, model: Map<String, Any?>): Map<String, Any?> {

        val winnerName = this.gameState.get()?.winnerAvatar ?: ""
        val congrats = this.gameState.get()?.gameOver ?: false
        val message = if (congrats) "Congratulations $winnerName, you won!" else ""
        return model + mapOf(
            "message" to message
        )
    }

    override fun onHandleUpdate(handle: Handle) {
        val gs = this.gameState.get() ?: TTTGame_GameState()
        val board = gs.board ?: ",,,,,,,,"
        val boardArr = board.split(",").map { it }.toMutableList()
        var player = TTTGame_PlayerOne()
        var mv = -1
        if (!(gs.gameOver ?: false) && !handle.name.equals("gameState")) {
            if (gs.currentPlayer == 0.0) {
                player = playerOne.get() ?: TTTGame_PlayerOne()
                mv = playerOneMove.get()?.move?.toInt() ?: -1
            } else if (gs.currentPlayer == 1.0) {
                player = playerTwo.get() ?: TTTGame_PlayerTwo()
                mv = playerTwoMove.get()?.move?.toInt() ?: -1
            }
            if (mv > -1 && mv < 10 && boardArr[mv] == "") {
                boardArr[mv] = player.avatar ?: ""
                gs.board = boardArr.joinToString(",")

                winningSequences.forEach { sequence ->
                    if (boardArr[sequence[0]] != "" &&
                        boardArr[sequence[0]] == boardArr[sequence[1]] &&
                        boardArr[sequence[0]] == boardArr[sequence[2]]) {
                        gs.gameOver = true
                        gs.winnerAvatar = player.avatar ?: ""
                    }
                }

                val cp = gs.currentPlayer ?: 0.0
                gs.currentPlayer = (cp + 1) % 2
                this.gameState.set(gs)
                this.events.clear()
            }
        }
//        if (reset.get()?.reset ?: false) {
//            log("TTTGame Boo!")
//            gs.board = ",,,,,,,,"
//            this.gameState.set(gs)
//            this.reset.set(TTTGame_Reset(reset = false))
//        }
        this.renderOutput()
        super.onHandleUpdate(handle)
    }

    override fun getTemplate(slotName: String): String {

        return """
            <div slotid="boardSlot"></div>
            <div><span>{{message}}</span></div>
            """
    }
}

@Retain
@ExportForCppRuntime("_newTTTGame")
fun constructTTTGame() = TTTGame().toWasmAddress()

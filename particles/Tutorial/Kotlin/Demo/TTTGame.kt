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
import arcs.log
import kotlin.native.internal.ExportForCppRuntime

class TTTGame : Particle() {
    private val gameState = Singleton { TTTGame_GameState() }
    private val playerOne = Singleton { TTTGame_PlayerOne() }
    private val playerOneMove = Singleton { TTTGame_PlayerOneMove() }
    private val playerTwo = Singleton { TTTGame_PlayerTwo() }
    private val playerTwoMove = Singleton { TTTGame_PlayerTwoMove() }
    private val events = Collection { TTTGame_Events() }

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
                currentPlayer = 1.0
            ))
        }
        if (this.playerOne.get()?.id != 1.0) {
            val p1 = playerOne.get() ?: TTTGame_PlayerOne()
            p1.id = 1.0
            this.playerOne.set(p1)
        }
        if (this.playerTwo.get()?.id != 2.0) {
            val p2 = playerTwo.get() ?: TTTGame_PlayerOne()
            p2.id = 2.0
            this.playerTwo.set(p2)
        }
    }

    override fun onHandleUpdate(handle: Handle) {
        log("in OnHandlUpdate in game")
        val gs = this.gameState.get() ?: TTTGame_GameState()
        if (gs.currentPlayer == 1.0) {
            log("The current player is one!")
            val p1 = playerOne.get() ?: TTTGame_PlayerOne()
            val mv = playerOneMove.get()?.move?.toInt() ?: -1
            val board = gs.board ?: ",,,,,,,,"
            var boardArr = board.split(",").map { it.trim() }.toMutableList()
            if (mv > -1 && mv < 10 && boardArr[mv] == "") {
                log("the move is valid! $mv")
                boardArr[mv.toInt()] = p1.avatar ?: "X"
                log("the fixed board is $boardArr")
                gs.board = boardArr.joinToString(",")
                log("fixed boardStr = ${gs.board}")
                gs.currentPlayer = 2.0
                this.gameState.set(gs)
                this.events.clear()
            }
        }
        if (gs.currentPlayer == 2.0) {
            log("The current player is Two!")
            val p2 = playerTwo.get() ?: TTTGame_PlayerTwo()
            val mv = playerTwoMove.get()?.move?.toInt() ?: -1
            val board = gs.board ?: ",,,,,,,,"
            var boardArr = board.split(",").map { it.trim() }.toMutableList()
            if (mv > -1 && mv < 10 && boardArr[mv] == "") {
                log("the move is valid! $mv")
                boardArr[mv.toInt()] = p2.avatar ?: "O"
                log("the fixed board is $boardArr")
                gs.board = boardArr.joinToString(",")
                log("fixed boardStr = ${gs.board}")
                gs.currentPlayer = 1.0
                this.gameState.set(gs)
                this.events.clear()
            }
        }
        super.onHandleUpdate(handle)
    }

    override fun getTemplate(slotName: String): String {

        return """
            <div slotid="boardSlot"></div>
            """
    }
}

@Retain
@ExportForCppRuntime("_newTTTGame")
fun constructTTTGame() = TTTGame().toWasmAddress()

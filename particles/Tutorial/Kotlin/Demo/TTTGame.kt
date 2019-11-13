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
        if (this.playerOne.get()?.id != 0.0) {
            val p1 = playerOne.get() ?: TTTGame_PlayerOne()
            p1.id = 0.0
            this.playerOne.set(p1)
        }
        if (this.playerTwo.get()?.id != 1.0) {
            val p2 = playerTwo.get() ?: TTTGame_PlayerOne()
            p2.id = 1.0
            this.playerTwo.set(p2)
        }
    }

    override fun onHandleUpdate(handle: Handle) {
        log("in OnHandlUpdate in game")
        val gs = this.gameState.get() ?: TTTGame_GameState()
        val board = gs.board ?: ",,,,,,,,"
        val boardArr = board.split(",").map { it.trim() }.toMutableList()
        var player = TTTGame_PlayerOne()
        var mv = -1
        if (gs.currentPlayer == 0.0) {
            log("The current player is one!")
            player = playerOne.get() ?: TTTGame_PlayerOne()
            mv = playerOneMove.get()?.move?.toInt() ?: -1
        } else if (gs.currentPlayer == 1.0) {
            log("The current player is Two!")
            player = playerTwo.get() ?: TTTGame_PlayerTwo()
            mv = playerTwoMove.get()?.move?.toInt() ?: -1
        }
        if (mv > -1 && mv < 10 && boardArr[mv] == "") {
            log("the move is valid! $mv")
            boardArr[mv.toInt()] = player.avatar ?: ""
            log("the fixed board is $boardArr")
            gs.board = boardArr.joinToString(",")
            log("fixed boardStr = ${gs.board}")
            val cp = gs.currentPlayer ?: 0.0
            gs.currentPlayer = (cp + 1) % 2
            this.gameState.set(gs)
            this.events.clear()
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

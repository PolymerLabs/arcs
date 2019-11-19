package arcs.tutorials.tictactoe

import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.TTTRandomComputer_GameState
import arcs.TTTRandomComputer_MyMove
import arcs.TTTRandomComputer_Player
import arcs.log
import kotlin.native.internal.ExportForCppRuntime

class TTTRandomComputer : Particle() {
    private val gameState = Singleton { TTTRandomComputer_GameState() }
    private val myMove = Singleton { TTTRandomComputer_MyMove() }
    private val player = Singleton { TTTRandomComputer_Player() }

    init {
        registerHandle("gameState", gameState)
        registerHandle("myMove", myMove)
        registerHandle("player", player)
    }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        onHandleUpdate(gameState)
    }

    override fun onHandleUpdate(handle: Handle) {
        if (gameState.get()?.currentPlayer == player.get()?.id) {
            val board = gameState.get()?.board ?: ",,,,,,,,"
            val boardArr = board.split(",").map { it }.toMutableList()
            val emptyCells = mutableListOf<Double>()

            boardArr.forEachIndexed { index, cell ->
                if (cell == "") emptyCells.add(index.toDouble())
            }
            if (emptyCells.size > 0) {
                val mv = emptyCells.shuffled().first()
                log("setting random computer move to $mv")
                this.myMove.set(TTTRandomComputer_MyMove(move = mv))
            }
        }
        super.onHandleUpdate(handle)
    }
}

@Retain
@ExportForCppRuntime("_newTTTRandomComputer")
fun constructTTTHRandomComputer() = TTTRandomComputer().toWasmAddress()

package arcs.tutorials.tictactoe

import arcs.Collection
import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.TTTHumanPlayer_Events
import arcs.TTTHumanPlayer_GameState
import arcs.TTTHumanPlayer_MyMove
import arcs.TTTHumanPlayer_Player
import kotlin.native.internal.ExportForCppRuntime

class TTTHumanPlayer : Particle() {
    private val gameState = Singleton { TTTHumanPlayer_GameState() }
    private val events = Collection { TTTHumanPlayer_Events() }
    private val myMove = Singleton { TTTHumanPlayer_MyMove() }
    private val player = Singleton { TTTHumanPlayer_Player() }

    init {
        registerHandle("gameState", gameState)
        registerHandle("events", events)
        registerHandle("myMove", myMove)
        registerHandle("player", player)
    }

    override fun onHandleUpdate(handle: Handle) {
        if (events.size > 0 && gameState.get()?.currentPlayer == player.get()?.id) {
            // Get the element with the largest time as this will be the most recent.
            val event = (events.sortedBy { it.time }).elementAt(events.size - 1)
            // Set the move
            if (event.type.equals("move")) {
                val newMove = TTTHumanPlayer_MyMove(event.move)
                myMove.set(newMove)
            }
        }
    }
}

@Retain
@ExportForCppRuntime("_newTTTHumanPlayer")
fun constructTTTHumanPlayer() = TTTHumanPlayer().toWasmAddress()

package arcs.tutorials.tictactoe

import arcs.Collection
import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.TTTHumanPlayer_Events
import arcs.TTTHumanPlayer_GameState
import arcs.TTTHumanPlayer_MyMove
import arcs.TTTHumanPlayer_Player
import arcs.log
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
        log("sync in TTTHumanPlayer called!")
    }

    override fun onHandleUpdate(handle: Handle) {
        log("OnHandleUpdate in TTTHumanPlayer called!")
        this.events.forEach { event ->
            log("Events: $event")
        }
        log("gameState: ${gameState.get()}")
        log("player: ${player.get()}")
//        if (events.size > 0 && gameState.get()?.currentPlayer == player.get()?.id) {
//            log("let's look at the events!")
//        }
        super.onHandleUpdate(handle)
    }
}

@Retain
@ExportForCppRuntime("_newTTTHumanPlayer")
fun constructTTTHumanPlayer() = TTTHumanPlayer().toWasmAddress()

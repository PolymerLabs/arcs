package arcs.tutorials

import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.TTTGame_GameState
import arcs.TTTGame_PlayerOne
import arcs.log
import kotlin.native.internal.ExportForCppRuntime

class TTTGame : Particle() {
    private val gameState = Singleton { TTTGame_GameState() }
    private val playerOne = Singleton { TTTGame_PlayerOne() }

    init {
        registerHandle("gameState", gameState)
        registerHandle("playerOne", playerOne)
    }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        log("In TTTGame onHandleSync, ${this.gameState.get()}")

        val gs = this.gameState.get() ?: TTTGame_GameState(
            board = "Yo there",
            currentPlayer = 57.0
        )

        val board = gs.board ?: ""

        log("In TTTGame onHandleSync, gs = $gs")
        log("In TTTGame onHandleSync, board = $board")

        if (this.gameState.get()?.board == null) {
            this.gameState.set(TTTGame_GameState(
                board = ",,,,,,,,",
                currentPlayer = 971.0
            ))
        }
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

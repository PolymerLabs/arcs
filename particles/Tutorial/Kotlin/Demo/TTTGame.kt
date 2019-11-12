package arcs.tutorials

import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.TTTGame_GameState
import arcs.TTTGame_PlayerOne
import kotlin.native.internal.ExportForCppRuntime

class TTTGame : Particle() {
    private val gameState = Singleton { TTTGame_GameState() }
    private val playerOne = Singleton { TTTGame_PlayerOne() }

    init {
        registerHandle("gameState", gameState)
        registerHandle("playerOne", playerOne)
    }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (this.gameState.get()?.board == null) {
            this.gameState.set(TTTGame_GameState(
                board = ",,,,,,,,",
                currentPlayer = 971.0
            ))
        }
        if (this.playerOne.get()?.id != 1.0) {
            val p1 = playerOne.get() ?: TTTGame_PlayerOne()
            p1.id = 1.0
            this.playerOne.set(p1)
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

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
import arcs.wasm.toAddress
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

    private val defaultGame = TTTGame_GameState(
        board = ",,,,,,,,",
        currentPlayer = (0..1).random().toDouble(),
        gameOver = false
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
        if (gameState.get()?.board == null) {
            gameState.set(defaultGame)
        }
        if (handle.name == "playerOne" && playerOne.get()?.id != 0.0) {
            val p1 = playerOne.get() ?: TTTGame_PlayerOne()
            p1.id = 0.0
            playerOne.set(p1)
        }
        if (handle.name == "playerTwo" && playerTwo.get()?.id != 1.0) {
            val p2 = playerTwo.get() ?: TTTGame_PlayerOne()
            p2.id = 1.0
            playerTwo.set(p2)
        }
    }

    override fun populateModel(slotName: String, model: Map<String, Any?>): Map<String, Any?> {
        val gs = gameState.get() ?: TTTGame_GameState()

        val cp = gs.currentPlayer ?: -1.0
        val p1 = playerOne.get() ?: TTTGame_PlayerOne()
        val p2 = playerTwo.get() ?: TTTGame_PlayerTwo()

        val cpName = if (cp == p1.id) p1.name else p2.name
        val cpAvatar = if (cp == p1.id) p1.avatar else p2.avatar

        val congratsMessage = gs.winnerAvatar?.let {
            if (it == p1.avatar) p1.name else p2.name
        }?.let { "Congratulations $it, you won!" } ?: "It's a tie!"

        return mapOf(
            "message" to congratsMessage,
            "hideCongrats" to !(gs.gameOver ?: false),
            "playerDetails" to "$cpName playing as $cpAvatar"
        )
    }

    override fun onHandleUpdate(handle: Handle) {
        val gs = gameState.get() ?: TTTGame_GameState()
        // Apply the moves
        if (gs.gameOver != true) {
            val board = gs.board ?: defaultGame.board!!
            val boardList = board.split(",").toMutableList()
            // Check the handle updated matches the current player
            if (handle.name == "playerOneMove" && gs.currentPlayer == 0.0) {
                applyMove(
                    mv = playerOneMove.get()?.move?.toInt() ?: -1,
                    avatar = playerOne.get()?.avatar ?: "",
                    boardList = boardList,
                    gs = gs
                )
            } else if (handle.name == "playerTwoMove" && gs.currentPlayer == 1.0) {
                applyMove(
                    mv = playerTwoMove.get()?.move?.toInt() ?: -1,
                    avatar = playerTwo.get()?.avatar ?: "",
                    boardList = boardList,
                    gs = gs
                )
            }
        }
        if (hasReset()) {
            gameState.set(defaultGame)
            playerOneMove.set(TTTGame_PlayerOneMove())
            playerTwoMove.set(TTTGame_PlayerTwoMove())
            events.clear()
        }
        renderOutput()
    }

    override fun getTemplate(slotName: String): String = """
        It is your turn <span>{{playerDetails}}</span>.
        <div slotid="boardSlot"></div>
        <div hidden="{{hideCongrats}}"><span>{{message}}</span></div>
        """.trimIndent()

    private fun applyMove(
        mv: Int,
        avatar: String,
        boardList: MutableList<String>,
        gs: TTTGame_GameState
    ) {
        if (!mv.isValidMove(boardList)) return
        boardList[mv] = avatar
        gs.board = boardList.joinToString(",")

        val cp = gs.currentPlayer ?: 0.0
        gs.currentPlayer = (cp + 1) % 2
        gameState.set(gs)

        gameState.set(checkGameOver(boardList, gs, avatar))
    }

    private fun checkGameOver(
        boardList: List<String>,
        gs: TTTGame_GameState,
        avatar: String
    ): TTTGame_GameState {
        // Check if the board is full, meaning the game is tied
        gs.gameOver = !boardList.contains("")

        // Check if the game is over
        winningSequences.forEach { sequence ->
            if (boardList[sequence[0]] != "" &&
                boardList[sequence[0]] == boardList[sequence[1]] &&
                boardList[sequence[0]] == boardList[sequence[2]]) {
                gs.gameOver = true
                gs.winnerAvatar = avatar
            }
        }
        return gs
    }

    private fun hasReset() = events.any { it.type == "reset" }

    private fun Int.isValidMove(boardList: List<String>) = this in 0..9 && boardList[this] == ""
}

@Retain
@ExportForCppRuntime("_newTTTGame")
fun constructTTTGame() = TTTGame().toAddress()

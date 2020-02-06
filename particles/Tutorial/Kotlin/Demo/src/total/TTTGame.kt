/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.tutorials.tictactoe

import arcs.sdk.Handle

class TTTGame : AbstractTTTGame() {
    private val defaultGame = TTTGame_GameState(
        board = ",,,,,,,,",
        currentPlayer = (0..1).random().toDouble(),
        gameOver = false,
        winnerAvatar = ""
    )

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

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (gameState.fetch()?.board == null) {
            gameState.set(defaultGame)
        }
        if (handle.name == "playerOne" && playerOne.fetch()?.id != 0.0) {
            val p1 = playerOne.fetch() ?: TTTGame_PlayerOne()
            playerOne.set(p1.copy(id = 0.0))
        }
        if (handle.name == "playerTwo" && playerTwo.fetch()?.id != 1.0) {
            val p2 = playerTwo.fetch() ?: TTTGame_PlayerTwo()
            playerTwo.set(p2.copy(id = 1.0))
        }
    }

    override fun populateModel(slotName: String, model: Map<String, Any>): Map<String, Any> {
        val gs = gameState.fetch() ?: TTTGame_GameState()
        val p1 = playerOne.fetch() ?: TTTGame_PlayerOne()
        val p2 = playerTwo.fetch() ?: TTTGame_PlayerTwo()

        val cpName = if (gs.currentPlayer == p1.id) p1.name else p2.name
        val cpAvatar = if (gs.currentPlayer == p1.id) p1.avatar else p2.avatar

        val congratsMessage = gs.winnerAvatar.let {
            if (it == p1.avatar) "Congratulations ${p1.name}, you won!"
            else if (it == p2.avatar) "Congratulations ${p2.name}, you won!"
            else "It's a tie!"
        }

        return mapOf(
            "message" to congratsMessage,
            "hideCongrats" to !gs.gameOver,
            "playerDetails" to "$cpName playing as $cpAvatar"
        )
    }

    override fun onHandleUpdate(handle: Handle) {
        val gs = gameState.fetch() ?: TTTGame_GameState()
        val p1 = playerOne.fetch() ?: TTTGame_PlayerOne()
        val p2 = playerTwo.fetch() ?: TTTGame_PlayerTwo()
        val mv1 = playerOneMove.fetch() ?: TTTGame_PlayerOneMove()
        val mv2 = playerTwoMove.fetch() ?: TTTGame_PlayerTwoMove()
        // Apply the moves
        if (gs.gameOver != true) {
            val boardList = gs.board.split(",").toMutableList()
            // Check the handle updated matches the current player
            if (handle.name == "playerOneMove" && gs.currentPlayer == 0.0) {
                applyMove(
                    mv = mv1.move.toInt(),
                    avatar = p1.avatar,
                    boardList = boardList,
                    gs = gs
                )
            } else if (handle.name == "playerTwoMove" && gs.currentPlayer == 1.0) {
                applyMove(
                    mv = mv2.move.toInt(),
                    avatar = p2.avatar,
                    boardList = boardList,
                    gs = gs
                )
            }
        }
        if (hasReset()) {
            gameState.set(TTTGame_GameState(
                board = ",,,,,,,,",
                currentPlayer = (0..1).random().toDouble(),
                gameOver = false,
                winnerAvatar = ""
            ))
            playerOneMove.set(mv1.copy(move = -1.0))
            playerTwoMove.set(mv2.copy(move = -1.0))
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

        var gameOver = !boardList.contains("")

        // Check if the game is over
        winningSequences.forEach { sequence ->
            if (boardList[sequence[0]] != "" &&
                boardList[sequence[0]] == boardList[sequence[1]] &&
                boardList[sequence[0]] == boardList[sequence[2]]) {
                gameOver = true
            }
        }

        gameState.set(gs.copy(
            board = boardList.joinToString(","),
            currentPlayer = (gs.currentPlayer + 1) % 2,
            gameOver = gameOver,
            winnerAvatar = if (gameOver) avatar else ""
        ))
    }

    private fun hasReset() = events.any { it.type == "reset" }

    private fun Int.isValidMove(boardList: List<String>) = this in 0..9 && boardList[this] == ""
}

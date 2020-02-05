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
        currentPlayer = (0..1).random().toDouble()
    )

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (gameState.fetch()?.board == null) {
            gameState.set(defaultGame)
        }
        if (handle.name == "playerOne" && playerOne.fetch()?.id != 0.0) {
            val p1 = playerOne.fetch() ?: TTTGame_PlayerOne()
            p1.id = 0.0
            playerOne.set(p1)
        }
        if (handle.name == "playerTwo" && playerTwo.fetch()?.id != 1.0) {
            val p2 = playerTwo.fetch() ?: TTTGame_PlayerTwo()
            p2.id = 1.0
            playerTwo.set(p2)
        }
    }

    override fun onHandleUpdate(handle: Handle) {
        val gs = gameState.fetch() ?: defaultGame
        val p1 = playerOne.fetch() ?: TTTGame_PlayerOne()
        val p2 = playerTwo.fetch() ?: TTTGame_PlayerTwo()
        val mv1 = playerOneMove.fetch() ?: TTTGame_PlayerOneMove()
        val mv2 = playerTwoMove.fetch() ?: TTTGame_PlayerTwoMove()

        // Apply the moves
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
        renderOutput()
    }

    override fun getTemplate(slotName: String): String = """
        <div slotid="boardSlot"></div>
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

        gs.currentPlayer = (gs.currentPlayer + 1) % 2
        gameState.set(gs)
    }

    private fun Int.isValidMove(boardList: List<String>) = this in 0..9 && boardList[this] == ""
}

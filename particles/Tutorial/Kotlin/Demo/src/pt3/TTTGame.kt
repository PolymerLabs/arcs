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
        if (handles.gameState.fetch()?.board == null) {
            handles.gameState.set(defaultGame)
        }
        if (handle.name == "handles.playerOne" && handles.playerOne.fetch()?.id != 0.0) {
            val p1 = handles.playerOne.fetch() ?: TTTGame_PlayerOne()
            handles.playerOne.set(p1.copy(id = 0.0))
        }
        if (handle.name == "playerTwo" && handles.playerTwo.fetch()?.id != 1.0) {
            val p2 = handles.playerTwo.fetch() ?: TTTGame_PlayerTwo()
            handles.playerTwo.set(p2.copy(id = 1.0))
        }
    }

    override fun onHandleUpdate(handle: Handle) {
        val gs = handles.gameState.fetch() ?: defaultGame
        val p1 = handles.playerOne.fetch() ?: TTTGame_PlayerOne()
        val p2 = handles.playerTwo.fetch() ?: TTTGame_PlayerTwo()
        val mv1 = handles.playerOneMove.fetch() ?: TTTGame_PlayerOneMove()
        val mv2 = handles.playerTwoMove.fetch() ?: TTTGame_PlayerTwoMove()

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

        handles.gameState.set(gs.copy(
            board = boardList.joinToString(","),
            currentPlayer = (gs.currentPlayer + 1) % 2
        ))
    }

    private fun Int.isValidMove(boardList: List<String>) = this in 0..9 && boardList[this] == ""
}

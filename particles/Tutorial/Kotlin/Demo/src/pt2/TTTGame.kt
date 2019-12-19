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

import arcs.Collection
import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.TTTGame_Events
import arcs.TTTGame_GameState
import arcs.TTTGame_PlayerOne
import arcs.TTTGame_PlayerOneMove

class TTTGame : Particle() {
    private val defaultGame = TTTGame_GameState(board = ",,,,,,,,")

    private val gameState = Singleton(this, "gameState") { TTTGame_GameState() }
    private val playerOne = Singleton(this, "playerOne") { TTTGame_PlayerOne() }
    private val playerOneMove = Singleton(this, "playerOneMove") { TTTGame_PlayerOneMove() }
    private val events = Collection(this, "events") { TTTGame_Events() }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (gameState.get() == null) {
            gameState.set(defaultGame)
        }
    }

    override fun onHandleUpdate(handle: Handle) {
        val gs = gameState.get() ?: defaultGame
        val p1 = playerOne.get() ?: TTTGame_PlayerOne()
        val mv = playerOneMove.get() ?: TTTGame_PlayerOneMove()
        val boardList = gs.board.split(",").toMutableList()
        // Check the handle updated matches the current player
        if (handle.name == "playerOneMove") {
            applyMove(
                    mv = mv.move.toInt(),
                    avatar = p1.avatar,
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
        boardList[mv] = avatar
        gs.board = boardList.joinToString(",")
        gameState.set(gs)
    }
}

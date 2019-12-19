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

import arcs.sdk.kotlin.Collection
import arcs.sdk.kotlin.Handle
import arcs.sdk.kotlin.Particle
import arcs.sdk.kotlin.Singleton
import arcs.sdk.kotlin.TTTGame_Events
import arcs.sdk.kotlin.TTTGame_GameState
import arcs.sdk.kotlin.TTTGame_PlayerOne
import arcs.sdk.kotlin.TTTGame_PlayerOneMove

class TTTGame : Particle() {
    private val defaultGame = TTTGame_GameState(board = ",,,,,,,,")
    private val defaultPlayerOne = TTTGame_PlayerOne(
        name = "PlayerOne",
        avatar = ""
    )
    private val defaultMove = TTTGame_PlayerOneMove(-1.0)

    private val gameState = Singleton(this, "gameState") { defaultGame }
    private val playerOne = Singleton(this, "playerOne") { defaultPlayerOne }
    private val playerOneMove = Singleton(this, "playerOneMove") { defaultMove }
    private val events = Collection(this, "events") { TTTGame_Events(
        type = "",
        move = -1.0,
        time = -1.0
    ) }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (gameState.get() == null) {
            gameState.set(defaultGame)
        }
    }

    override fun onHandleUpdate(handle: Handle) {
        val gs = gameState.get() ?: defaultGame
        val p1 = playerOne.get() ?: defaultPlayerOne
        val mv = playerOneMove.get() ?: defaultMove
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

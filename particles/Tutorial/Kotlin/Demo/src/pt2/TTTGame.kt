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

package arcs.tutorials

import arcs.Collection
import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.TTTGame_Events
import arcs.TTTGame_GameState
import arcs.TTTGame_PlayerOne
import arcs.TTTGame_PlayerOneMove
import arcs.addressable.toAddress
import kotlin.native.Retain
import kotlin.native.internal.ExportForCppRuntime

class TTTGame : Particle() {
    private val gameState = Singleton { TTTGame_GameState() }
    private val playerOne = Singleton { TTTGame_PlayerOne() }
    private val playerOneMove = Singleton { TTTGame_PlayerOneMove() }
    private val events = Collection { TTTGame_Events() }

    init {
        registerHandle("gameState", gameState)
        registerHandle("playerOne", playerOne)
        registerHandle("playerOneMove", playerOneMove)
        registerHandle("events", events)
    }

    private val defaultGame = TTTGame_GameState(board = ",,,,,,,,")

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (gameState.get()?.board == null) {
            gameState.set(defaultGame)
        }
    }

    override fun onHandleUpdate(handle: Handle) {
        val gs = gameState.get() ?: TTTGame_GameState()
        // Apply the moves
        val board = gs.board ?: defaultGame.board!!
        val boardList = board.split(",").toMutableList()
        // Check the handle updated matches the current player
        if (handle.name == "playerOneMove") {
            applyMove(
                    mv = playerOneMove.get()?.move?.toInt() ?: -1,
                    avatar = playerOne.get()?.avatar ?: "",
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

@Retain
@ExportForCppRuntime("_newTTTGame")
fun constructTTTGame() = TTTGame().toAddress()

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
import arcs.TTTGame_PlayerTwo
import arcs.TTTGame_PlayerTwoMove
import arcs.addressable.toAddress
import kotlin.native.Retain
import kotlin.native.internal.ExportForCppRuntime

class TTTGame : Particle() {
    private val defaultGame = TTTGame_GameState(
        board = ",,,,,,,,",
        currentPlayer = (0..1).random().toDouble()
    )
    private val defaultPlayerOne = TTTGame_PlayerOne(
        name = "PlayerOne",
        avatar = "",
        id = -1.0
    )
    private val defaultPlayerOneMove = TTTGame_PlayerOneMove(-1.0)
    private val defaultPlayerTwo = TTTGame_PlayerTwo(
        name = "PlayerTwo",
        avatar = "",
        id = -1.0
    )
    private val defaultPlayerTwoMove = TTTGame_PlayerTwoMove(-1.0)

    private val gameState = Singleton(this, "gameState") { defaultGame }
    private val playerOne = Singleton(this, "playerOne") { defaultPlayerOne }
    private val playerOneMove = Singleton(this, "playerOneMove") { defaultPlayerOneMove }
    private val playerTwo = Singleton(this, "playerTwo") { defaultPlayerTwo }
    private val playerTwoMove = Singleton(this, "playerTwoMove") { defaultPlayerOneMove }
    private val events = Collection(this, "events") { TTTGame_Events(
        type = "",
        move = -1.0,
        time = -1.0
    ) }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (gameState.get()?.board == null) {
            gameState.set(defaultGame)
        }
        if (handle.name == "playerOne" && playerOne.get()?.id != 0.0) {
            val p1 = playerOne.get() ?: defaultPlayerOne
            p1.id = 0.0
            playerOne.set(p1)
        }
        if (handle.name == "playerTwo" && playerTwo.get()?.id != 1.0) {
            val p2 = playerTwo.get() ?: defaultPlayerTwo
            p2.id = 1.0
            playerTwo.set(p2)
        }
    }

    override fun onHandleUpdate(handle: Handle) {
        val gs = gameState.get() ?: defaultGame
        val p1 = playerOne.get() ?: defaultPlayerOne
        val p2 = playerTwo.get() ?: defaultPlayerTwo
        val mv1 = playerOneMove.get() ?: defaultPlayerOneMove
        val mv2 = playerTwoMove.get() ?: defaultPlayerTwoMove

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

@Retain
@ExportForCppRuntime("_newTTTGame")
fun constructTTTGame() = TTTGame().toAddress()

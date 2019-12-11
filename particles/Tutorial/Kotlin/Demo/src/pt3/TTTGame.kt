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
    private val gameState = Singleton(this, "gameState") { TTTGame_GameState() }
    private val playerOne = Singleton(this, "playerOne") { TTTGame_PlayerOne() }
    private val playerOneMove = Singleton(this, "playerOneMove") { TTTGame_PlayerOneMove() }
    private val playerTwo = Singleton(this, "playerTwo") { TTTGame_PlayerTwo() }
    private val playerTwoMove = Singleton(this, "playerTwoMove") { TTTGame_PlayerTwoMove() }
    private val events = Collection(this, "events") { TTTGame_Events() }

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
        currentPlayer = 0.0
    )

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

    override fun onHandleUpdate(handle: Handle) {
        val gs = gameState.get() ?: TTTGame_GameState()
        // Apply the moves
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

        val cp = gs.currentPlayer ?: 0.0
        gs.currentPlayer = (cp + 1) % 2
        gameState.set(gs)
    }

    private fun Int.isValidMove(boardList: List<String>) = this in 0..9 && boardList[this] == ""
}

@Retain
@ExportForCppRuntime("_newTTTGame")
fun constructTTTGame() = TTTGame().toAddress()

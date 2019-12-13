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

import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.TTTRandomComputer_GameState
import arcs.TTTRandomComputer_MyMove
import arcs.TTTRandomComputer_Player
import arcs.addressable.toAddress
import kotlin.native.Retain
import kotlin.native.internal.ExportForCppRuntime

class TTTRandomComputer : Particle() {
    private val defaultGameState = TTTRandomComputer_GameState(
        board = ",,,,,,,,",
        currentPlayer = (0..1).random().toDouble(),
        gameOver = false,
        winnerAvatar = ""
    )
    private val defaultMove = TTTRandomComputer_MyMove(-1.0)
    private val defaultPlayer = TTTRandomComputer_Player(
        name = "Computer",
        avatar = "",
        id = -1.0
    )

    private val gameState = Singleton(this, "gameState") { defaultGameState }
    private val myMove = Singleton(this, "myMove") { defaultMove }
    private val player = Singleton(this, "player") { defaultPlayer }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) = onHandleUpdate(gameState)

    override fun onHandleUpdate(handle: Handle) {
        if (gameState.get()?.currentPlayer != player.get()?.id) return

        val gs = gameState.get() ?: defaultGameState

        val boardArr = gs.board.split(",")
        val emptyCells = mutableListOf<Double>()

        // Find all the empty cells
        boardArr.forEachIndexed { index, cell ->
            if (cell == "") emptyCells.add(index.toDouble())
        }

        // Choose a random cell as the move
        if (emptyCells.isNotEmpty()) {
            val mv = emptyCells.shuffled().first()
            myMove.set(TTTRandomComputer_MyMove(move = mv))
        }
    }
}

@Retain
@ExportForCppRuntime("_newTTTRandomComputer")
fun constructTTTHRandomComputer() = TTTRandomComputer().toAddress()

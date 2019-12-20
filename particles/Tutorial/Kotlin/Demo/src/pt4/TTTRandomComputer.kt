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
import arcs.sdk.Particle
import arcs.sdk.Singleton
import arcs.sdk.TTTRandomComputer_GameState
import arcs.sdk.TTTRandomComputer_MyMove
import arcs.sdk.TTTRandomComputer_Player

class TTTRandomComputer : Particle() {

    private val gameState = Singleton(this, "gameState") { TTTRandomComputer_GameState() }
    private val myMove = Singleton(this, "myMove") { TTTRandomComputer_MyMove() }
    private val player = Singleton(this, "player") { TTTRandomComputer_Player() }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) = onHandleUpdate(gameState)

    override fun onHandleUpdate(handle: Handle) {
        if (gameState.get()?.currentPlayer != player.get()?.id) return

        val gs = gameState.get() ?: TTTRandomComputer_GameState()

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

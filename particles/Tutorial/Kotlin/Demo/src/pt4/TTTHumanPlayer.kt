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
import arcs.sdk.kotlin.TTTHumanPlayer_Events
import arcs.sdk.kotlin.TTTHumanPlayer_GameState
import arcs.sdk.kotlin.TTTHumanPlayer_MyMove
import arcs.sdk.kotlin.TTTHumanPlayer_Player

class TTTHumanPlayer : Particle() {
    private val gameState = Singleton(this, "gameState") { TTTHumanPlayer_GameState() }
    private val events = Collection(this, "events") { TTTHumanPlayer_Events() }
    private val myMove = Singleton(this, "myMove") { TTTHumanPlayer_MyMove() }
    private val player = Singleton(this, "player") { TTTHumanPlayer_Player() }

    override fun onHandleUpdate(handle: Handle) {
        if (events.size <= 0 || gameState.get()?.currentPlayer != player.get()?.id) return

        // Get the element with the largest time as this will be the most recent.
        val event = events.sortedBy { it.time }.last()
        // Set the move
        if (event.type == "move") {
            myMove.set(TTTHumanPlayer_MyMove(event.move))
        }
    }
}

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
import arcs.TTTHumanPlayer_Events
import arcs.TTTHumanPlayer_GameState
import arcs.TTTHumanPlayer_MyMove
import arcs.TTTHumanPlayer_Player
import arcs.addressable.toAddress
import kotlin.native.Retain
import kotlin.native.internal.ExportForCppRuntime

class TTTHumanPlayer : Particle() {
    private val gameState = Singleton(this, "gameState") { TTTHumanPlayer_GameState(
        board = ",,,,,,,,",
        currentPlayer = (0..1).random().toDouble(),
        gameOver = false,
        winnerAvatar = ""
    ) }
    private val events = Collection(this, "events") { TTTHumanPlayer_Events(
        type = "",
        move = -1.0,
        time = -1.0
    ) }
    private val myMove = Singleton(this, "myMove") { TTTHumanPlayer_MyMove(-1.0) }
    private val player = Singleton(this, "player") { TTTHumanPlayer_Player(
        name = "PlayerOne",
        avatar = "",
        id = -1.0
    ) }

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

@Retain
@ExportForCppRuntime("_newTTTHumanPlayer")
fun constructTTTHumanPlayer() = TTTHumanPlayer().toAddress()

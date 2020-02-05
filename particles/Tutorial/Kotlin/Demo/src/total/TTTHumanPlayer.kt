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

class TTTHumanPlayer : AbstractTTTHumanPlayer() {
    override fun onHandleUpdate(handle: Handle) {
        if (events.size <= 0 || gameState.fetch()?.currentPlayer != player.fetch()?.id) return

        // Get the element with the largest time as this will be the most recent.
        val event = events.sortedBy { it.time }.last()
        // Set the move
        if (event.type == "move") {
            myMove.set(TTTHumanPlayer_MyMove(event.move))
        }
    }
}

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

    init {
        handles.events.onUpdate { events ->
            if(events.size > 0) {
                val event = events.sortedBy { it.time }.last()
                if (event.type == "move") {
                    handles.myMove.set(TTTHumanPlayer_MyMove(event.move))
                }
            }
        }
    }
}

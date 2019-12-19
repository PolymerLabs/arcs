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
import arcs.TTTGame_Events
import arcs.TTTGame_GameState

class TTTGame : Particle() {
    private val defaultGame = TTTGame_GameState(board = ",,,,,,,,")

    private val gameState = Singleton(this, "gameState") { TTTGame_GameState() }
    private val events = Collection(this, "events") { TTTGame_Events() }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (gameState.get() == null) {
            gameState.set(defaultGame)
        }
    }

    override fun getTemplate(slotName: String): String = """
        <div slotid="boardSlot"></div>
        """.trimIndent()
}

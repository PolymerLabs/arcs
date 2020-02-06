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

class TTTGame : AbstractTTTGame() {
    private val defaultGame = TTTGame_GameState(board = ",,,,,,,,")

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (handles.gameState.fetch() == null) {
            handles.gameState.set(defaultGame)
        }
    }

    override fun getTemplate(slotName: String): String = """
        <div slotid="boardSlot"></div>
        """.trimIndent()
}

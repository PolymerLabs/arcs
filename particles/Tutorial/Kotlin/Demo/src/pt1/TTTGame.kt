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
import arcs.addressable.toAddress
import kotlin.native.Retain
import kotlin.native.internal.ExportForCppRuntime

class TTTGame : Particle() {
    private val gameState = Singleton { TTTGame_GameState() }
    private val events = Collection { TTTGame_Events() }

    init {
        registerHandle("gameState", gameState)
        registerHandle("events", events)
    }

    private val defaultGame = TTTGame_GameState(board = ",,,,,,,,")

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (gameState.get()?.board == null) {
            gameState.set(defaultGame)
        }
    }

    override fun getTemplate(slotName: String): String = """
        <div slotid="boardSlot"></div>
        """.trimIndent()
}

@Retain
@ExportForCppRuntime("_newTTTGame")
fun constructTTTGame() = TTTGame().toAddress()

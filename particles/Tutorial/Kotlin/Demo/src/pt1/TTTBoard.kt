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

class TTTBoard : AbstractTTTBoard() {
    private var clicks = 0.0

    init {
        eventHandler("onClick") { eventData ->
            handles.events.store(TTTBoard_Events(
                    type = "move",
                    move = eventData["value"]?.toDouble() ?: -1.0,
                    time = clicks
            ))
            clicks++
        }

        eventHandler("reset") {
            handles.events.store(TTTBoard_Events(type = "reset", time = clicks, move = -1.0))
            clicks++
        }
    }

    override fun onHandleUpdate(handle: Handle) = renderOutput()

    override fun populateModel(slotName: String, model: Map<String, Any>): Map<String, Any> {
        val gs = handles.gameState.fetch() ?: TTTBoard_GameState()
        val boardList = gs.board.split(",")
        val boardModel = mutableListOf<Map<String, String?>>()
        boardList.forEachIndexed { index, cell ->
            boardModel.add(mapOf("cell" to cell, "value" to index.toString()))
        }

        return mapOf(
            "buttons" to mapOf(
                "\$template" to "button",
                "models" to boardModel
            )
        )
    }

    override fun getTemplate(slotName: String): String = """
            <style>
              .grid-container {
                display: grid;
                grid-template-columns: 50px 50px 50px;
                grid-column-gap: 0px;
              }

              .valid-butt {
                border: 1px outset blue;
                height: 50px;
                width: 50px;
                cursor: pointer;
                background-color: lightblue;
              }

              .valid-butt:hover {
                background-color: blue;
                color: white;
              }
            </style>
            <div class="grid-container">{{buttons}}</div>
            <template button>
              <button class="valid-butt" type="button" on-click="onClick" value="{{value}}" \>
                <span>{{cell}}</span>
              </button>
            </template>
            Please hit reset to start a new game.<button on-click="reset">Reset</button>
        """.trimIndent()
}

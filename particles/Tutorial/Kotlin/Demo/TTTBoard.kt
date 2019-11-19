package arcs.tutorials.tictactoe

import arcs.Collection
import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.TTTBoard_Events
import arcs.TTTBoard_GameState
import kotlin.native.internal.ExportForCppRuntime

class TTTBoard : Particle() {

    private val gameState = Singleton { TTTBoard_GameState() }
    private val events = Collection { TTTBoard_Events() }
    private var clicks = 0.0

    init { registerHandle("gameState", gameState)
        registerHandle("events", events)

        eventHandler("onClick") { eventData ->
            this.events.store(TTTBoard_Events(
                type = "move",
                move = eventData["value"]?.toDouble() ?: -1.0,
                time = clicks
            ))
            clicks++
        }

        eventHandler("reset") {
            this.events.store(TTTBoard_Events(type = "reset", time = clicks))
            clicks++
        }
    }

    override fun onHandleUpdate(handle: Handle) {
        if (handle.name.equals("gameState")) {
            this.renderOutput()
        }
    }

    override fun populateModel(slotName: String, model: Map<String, Any?>): Map<String, Any?> {
        val board = this.gameState.get()?.board ?: ",,,,,,,,"
        val boardArr = board.split(",").map { it.trim() }
        val boardList = mutableListOf<Map<String, String?>>()
        boardArr.forEachIndexed { index, cell ->
            boardList.add(mapOf("cell" to cell, "value" to index.toString()))
        }

        return mapOf(
            "buttons" to mapOf(
                "\$template" to "button",
                "models" to boardList
            )
        )
    }

    override fun getTemplate(slotName: String): String {
        return """
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
"""
    }
}

@Retain
@ExportForCppRuntime("_newTTTBoard")
fun constructTTTBoard() = TTTBoard().toWasmAddress()

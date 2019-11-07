package arcs.tutorials.tictactoe

import arcs.*
import kotlin.native.internal.ExportForCppRuntime


class TTTBoard : Particle() {

  private val gameState = Singleton { TTTBoard_GameState() }
  private val events = Collection { TTTBoard_Events() }


  init {
    registerHandle("gameState", gameState)
    registerHandle("events", events)
  }

  override fun populateModel(slotName: String, model: Map<String, Any?>): Map<String, Any?> {

      val boardArr = listOf(0, 0, 0, 0, 0, 0, 0, 0, 0)
      val boardList = mutableListOf<Map<String, String?>>()
      boardArr.forEachIndexed{ index, cell ->
          boardList.add(mapOf("cell" to cell.toString(), "value" to index.toString()))
      }

      return mapOf("hideReset" to "true",
        "buttons" to mapOf(
          "\$template" to "button",
          "models" to boardList
        ))
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
"""
  }
}

@Retain
@ExportForCppRuntime("_newTTTBoard")
fun constructTTTBoard() = TTTBoard().toWasmAddress()

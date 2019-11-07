package arcs.tutorials.tictactoe

import arcs.Particle
import arcs.Singleton
import arcs.Collection
import kotlin.native.internal.ExportForCppRuntime

class TTTGame : Particle() {


  override fun getTemplate(slotName: String): String {
    return """
<div slotid="boardSlot"></div>
"""
  }
}

@Retain
@ExportForCppRuntime("_newTTTGame")
fun constructTTTGame() = TTTGame().toWasmAddress()

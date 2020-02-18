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
    private val defaultGame = TTTGame_GameState(
        board = ",,,,,,,,",
        currentPlayer = (0..1).random().toDouble(),
        gameOver = false,
        winnerAvatar = ""
    )

    private val winningSequences = arrayOf(
        arrayOf(0, 1, 2),
        arrayOf(3, 4, 5),
        arrayOf(6, 7, 8),
        arrayOf(0, 3, 6),
        arrayOf(1, 4, 7),
        arrayOf(2, 5, 8),
        arrayOf(0, 4, 8),
        arrayOf(2, 4, 6)
    )

    init {

        handles.playerOneMove.onUpdate { move ->
            applyMove(
              move ?: TTTGame_PlayerOneMove(),
              handles.playerOne.fetch() ?: TTTGame_PlayerOne()
            )
        }

        handles.playerTwoMove.onUpdate { move ->
            applyMove(
              move ?: TTTGame_PlayerTwoMove(),
              handles.playerTwo.fetch() ?: TTTGame_PlayerTwo()
            )
        }

        handles.events.onUpdate {
            if (hasReset()) {
                with(handles) {
                    gameState.set(defaultGame)
                    playerOneMove.set(handles.playerOneMove.fetch()!!.copy(move = -1.0))
                    playerTwoMove.set(handles.playerTwoMove.fetch()!!.copy(move = -1.0))
                    events.clear()
                }
                renderOutput()
            }
        }
    }

    private fun applyMove(move: TTTGame_PlayerOneMove, player: TTTGame_PlayerOne) {
        val mv = move.move.toInt()
        val gs = handles.gameState.fetch() ?: TTTGame_GameState()

        // Check if move is valid
        val boardList = gs.board.split(",").toMutableList()
        if (!mv.isValidMove(boardList) || gs.currentPlayer != player.id || gs.gameOver) return

        // Apply the move
        boardList[mv] = player.avatar

        var gameOver = !boardList.contains("")
        var avatar = ""

        // Check if the game is over
        winningSequences.forEach { sequence ->
            if (boardList[sequence[0]] != "" &&
              boardList[sequence[0]] == boardList[sequence[1]] &&
              boardList[sequence[0]] == boardList[sequence[2]]) {
                gameOver = true
                avatar = player.avatar
            }
        }

        handles.gameState.set(gs.copy(
          board = boardList.joinToString(","),
          currentPlayer = (gs.currentPlayer + 1) % 2,
          gameOver = gameOver,
          winnerAvatar = avatar
        ))
        renderOutput()
    }

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (handles.gameState.fetch()?.board == null) {
            handles.gameState.set(defaultGame)
        }
        if (handle.name == "playerOne" && handles.playerOne.fetch()?.id != 0.0) {
            val p1 = handles.playerOne.fetch() ?: TTTGame_PlayerOne()
            handles.playerOne.set(p1.copy(id = 0.0))
        }
        if (handle.name == "playerTwo" && handles.playerTwo.fetch()?.id != 1.0) {
            val p2 = handles.playerTwo.fetch() ?: TTTGame_PlayerTwo()
            handles.playerTwo.set(p2.copy(id = 1.0))
        }
    }

    override fun populateModel(slotName: String, model: Map<String, Any>): Map<String, Any> {
        val gs = handles.gameState.fetch() ?: TTTGame_GameState()
        val p1 = handles.playerOne.fetch() ?: TTTGame_PlayerOne()
        val p2 = handles.playerTwo.fetch() ?: TTTGame_PlayerTwo()

        val cpName = if (gs.currentPlayer == p1.id) p1.name else p2.name
        val cpAvatar = if (gs.currentPlayer == p1.id) p1.avatar else p2.avatar

        val congratsMessage = gs.winnerAvatar.let {
            if (it == p1.avatar) "Congratulations ${p1.name}, you won!"
            else if (it == p2.avatar) "Congratulations ${p2.name}, you won!"
            else "It's a tie!"
        }

        return mapOf(
            "message" to congratsMessage,
            "hideCongrats" to !gs.gameOver,
            "playerDetails" to "$cpName playing as $cpAvatar"
        )
    }

    override fun getTemplate(slotName: String): String = """
        It is your turn <span>{{playerDetails}}</span>.
        <div slotid="boardSlot"></div>
        <div hidden="{{hideCongrats}}"><span>{{message}}</span></div>
        """.trimIndent()

    private fun hasReset() = handles.events.fetchAll().any { it.type == "reset" }

    private fun Int.isValidMove(boardList: List<String>) = this in 0..9 && boardList[this] == ""
}

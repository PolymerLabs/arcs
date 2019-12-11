# Behold Tic Tac Toe

## Articles about Designing with Particles

So from our introductory tutorials, we have the following definition of a particle:

> *Particle* - Modular component of functionality. Ideally small units so particles can be reusable.

While that tells us _what_ a particle is, it does not say _how_ a particle should be used and _how_
a recipe should be divided into particles. To better understand how to design a system in Arcs, it
is important to have a full mental picture of particles. Just as there are multiple sides to any
person, particles have multiple faces. To fully understand them, we must look below the surface to
see the soul of particles.

#### Smallest Components
Even from the definition of particles, we know they should be small components. Just as with object
oriented programming, this lets us have easily interchangeable components. One can envision a world
where particles are made by external developers and combined to form recipes - much the way
developers use external libraries in object-oriented languages.

However, making particles as small as possible leads us towards a "turtles all the way down"
mentality. There is obvious overhead involved in each particle, therefore the desire for small
particles must be balanced against having too many.

#### Bounds of Data Knowledge
Arcs' mission statement says that users have sovereignty over their data and its use. To ensure
data only travels as intended, Arcs uses data flow analysis to make guarantees about data flow. But,
for this to work properly, particles must delineate knowledge boundaries. Just as each nation has a
border so customs and immigration can know where to operate, we need to create systems with well
defined boundaries so Arcs can know where data should (and more importantly, shouldn't) go.


#### Functional Components
When we create recipes, there are going to be occasions when it makes sense to extract some
functionality into its own particle. This is easiest to understand with an example, which we provide in
more detail below.

### Tic-Tac-Toe, here we go!

Alright, so let's get to putting this in practice with our tic-tac-toe game. As with any good
engineering project, we need a set of requirements. Here are ours:
 1. Play Tic Tac Toe with the traditional rules.
 2. Be able to have a human play against a computer.
 3. The players (human or computer) may make invalid moves at invalid times.
 4. Personal information, such as names, should be restricted to the components that need to know about them.
 5. The system should say who's turn it is.
 6. The system should congratulate the winner by name.
 7. The system should let you reset the game.

Based on these requirements, we can see right off the bat that we are going to need to have some
way to create a barrier since since the winner must be congratulated by name, but we want to restrict the
particles that know any personal information. To meet this requirement, we will devide the system into a
main game particle that can know personal information, and a board which cannot. We also know
we need a human and computer player. Thus, we start with these four particles.

![Tic Tac Toe Particles](diagrams/TTTParticles.jpg)

Now you might be wondering how does this relate to the three ways of thinking about particles we
talked about above?

![Tic Tac Toe Particle Types](diagrams/TTTParticleTypes.jpg)

Ok, so now we've got 4 particles, but they currently have no way of communicating. Let's add some
handles to our system! To start off, we know the Board is going to need to communicate when things
have been clicked - be it a cell or the reset button. Let's call these Events. We know the Human
needs these events to determine their move. The Game will need it as well to enable resets.

![Tic Tac Toe Events](diagrams/TTTEvents.jpg)

Next, the Game needs a way of communicating the current state of things to everyone. This will
include things like what the board should look like and the current player.

![Tic Tac Toe GameState](diagrams/TTTGameState.jpg)

At this point, the Human and Computer can see the current state of the game, but they have no way to
change it.  We need them to be able to pass moves to the game!

![Tic Tac Toe Moves](diagrams/TTTMoves.jpg)

And finally, we need a way to hold information about the players.

![Tic Tac Toe Design](diagrams/TTT.jpg)

Phew, there we have it. Now let's think about to our requirements. We had one that said the main UI
could not be trusted with any personal information. The personal information is held in PlayerOne and
PlayerTwo, and our main UI is the Board. Have we protected this data? Well, by looking at the diagram
with the untrusted particle highlighted, we can see the handles with personal data do not directly
connect to the Board. So the data should be safe.

![Tic Tac Toe Untrusted](diagrams/TTTUntrusted.jpg)

## Designing the Best Manifest

Alright, so now we've got the basic design for our system, it's
time to go put it all together! Let's start by writing our Arcs
Manifest file. To do this, we know the particles and handles,
and how they fit together. But we don't know what the entities
the handles point to look like.

By looking at our diagram again, it becomes obvious we need four
schemas: Person, GameState, Event, and Move. These different types
are colored in the graph below to show where schemas are reused.

![Tic Tac Toe Handle Types](diagrams/TTTHandleTypes.jpg)

For now, let's not worry about what fields each of these schemas
has. This will become apparent as we start implementing the
system.

To start with, let's create the Board and the Game.  To do this,
we will also need to implement at least basic versions of the
GameState and Event handles. The Board needs to know what it
should display, thus GameState must include a representation of
the board. Meanwhile, the Board needs to provide the type of
move (it could be a reset or an actual move) and the move.
Because collections are not ordered, we also need some sort of
time so we can sort the Events and ensure only the most recent
Event is processed. In total, this gives us the following Schemas.

```
schema GameState
  board: Text

schema Event
  type: Text
  move: Number
  time: Number
```

Next comes the particles. Based on our diagram, we know the basic
flow of data. However, the diagram is slightly misleading. In Arcs,
if a handle is only listed as a "writes", then the particle cannot
read it. As a result, some of our outputs also need to be inputs
so we can store our own state. Taking this into account, we get the
following particles:

```
particle TTTBoard in 'TTTBoard.wasm'
  events: writes [Event]
  gameState: reads GameState
  boardSlot: consumes

particle TTTGame in 'TTTGame.wasm'
  gameState: reads writes GameState
  events: reads writes [Event]
  root: consumes
    boardSlot: provides
```

And finally, we need to put it together in the recipe:

```
recipe GamePlayersDemoRecipe
  TTTGame
    gameState: reads writes gameState
    events: reads writes events
    root: consumes
      boardSlot: provides board
  TTTBoard
    gameState: reads gameState
    events: writes events
    boardSlot: consumes board
  description `Kotlin Tutorial TicTacToe Demo`

```

Putting these three components together, we have the start of our
Tic-Tac-Toe game! Next up, we'll implement the Board particle.

## DevTools Rule

Before we can get to the Board, we need a very basic implementation
of the Game as this is what provides the slot for the Board. This
is shown below:

```kotlin
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
    private val gameState = Singleton(this, "gameState") { TTTGame_GameState() }
    private val events = Collection(this, "events") { TTTGame_Events() }

    // We represent the board as a comma seperated string
    private val defaultGame = TTTGame_GameState(board = ",,,,,,,,")

    override fun onHandleSync(handle: Handle, allSynced: Boolean) {
        // If the gameState doesn't exist, set it.
        if (gameState.get()?.board == null) {
            gameState.set(defaultGame)
        }
    }

    // Provide the boardSlot
    override fun getTemplate(slotName: String): String = """
        <div slotid="boardSlot"></div>
        """.trimIndent()
}

@Retain
@ExportForCppRuntime("_newTTTGame")
fun constructTTTGame() = TTTGame().toAddress()
```

Next, we implement the Game. This is explained in more detail
in the comments.
```kotlin
package arcs.tutorials.tictactoe

import arcs.Collection
import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.TTTBoard_Events
import arcs.TTTBoard_GameState
import arcs.addressable.toAddress
import kotlin.native.Retain
import kotlin.native.internal.ExportForCppRuntime

class TTTBoard : Particle() {

    private val gameState = Singleton(this, "gameState") { TTTBoard_GameState() }
    private val events = Collection(this, "events") { TTTBoard_Events() }

    // We use clicks as the way to sort Events in other particles.
    private var clicks = 0.0
    // The empty board will be used in multiple null checks.
    private val emptyBoard = listOf("", "", "", "", "", "", "", "", "")

    init {
        // When a cell is clicked, add the click to the Events.
        eventHandler("onClick") { eventData ->
            events.store(TTTBoard_Events(
                    type = "move",
                    move = eventData["value"]?.toDouble() ?: -1.0,
                    time = clicks
            ))
            clicks++
        }

        // When the reset button is clicked, add it to the Events.
        eventHandler("reset") {
            events.store(TTTBoard_Events(type = "reset", time = clicks))
            clicks++
        }
    }

    // When a handle is updated, we want to update the board.
    override fun onHandleUpdate(handle: Handle) = renderOutput()

    override fun populateModel(slotName: String, model: Map<String, Any?>): Map<String, Any?> {
        // We use template interpolation to easily create the board. To
        // do this, we need to create a model of the board to return.
        val boardList = gameState.get()?.board?.split(",") ?: emptyBoard
        val boardModel = mutableListOf<Map<String, String?>>()
        boardList.forEachIndexed { index, cell ->
            // Map what should be displayed in the cell and the index.
            // This is what lets the onClick work as "value" becomes
            // the move.
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

@Retain
@ExportForCppRuntime("_newTTTBoard")
fun constructTTTBoard() = TTTBoard().toAddress()
```

And finally, to build it all we need the BUILD file:
```BUILD
load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_binary", "arcs_kt_schema")

arcs_kt_schema(
    name = "game_schemas",
    srcs = ["TTTGame.arcs"],
)

arcs_kt_binary(
    name = "TTTBoard",
    srcs = ["TTTBoard.kt"],
    deps = [":game_schemas"],
)

arcs_kt_binary(
    name = "TTTGame",
    srcs = ["TTTGame.kt"],
    deps = [":game_schemas"],
)
```

Alright, go ahead and pat yourself on the back. We are well on our
way to having Tic-Tac-Toe working. I know it doesn't seem that way
but don't worry, you're further along than you think. I know you
probably don't believe this, and your probably would like to see
something working. But how can we do this?

This is where the DevTools are your new best friend. Go ahead and
load your recipe in the Web Shell and then open the DevTools in
Chrome, make sure you've gone to the Arcs tab, and selected the
correct recipe.

![Tic Tac Toe DevTools](diagrams/TTTDevTools.png)

We can see here our particles are correct connected using the
handles we specified in the recipe. This is cool, but in our case
not particularly useful. Now, navigate to the Storage tab.

![Tic Tac Toe Storage](diagrams/TTTDevToolsStorage.png)

Here we can see the two handles. Now, click on one of the cells in
your Tic Tac Toe board. The Events handle should flash yellow when
you click on the board as the handle is being updated.

![Tic Tac Toe onClick](diagrams/TTTDevToolsOnClick.png)

Now if you click on Events, then values, then object you can see
the value of the event! In our case, we clicked on the first cell
which you can see because the move has a value of 0.

![Tic Tac Toe Event Move](diagrams/TTTDevToolsOnMove.png)

You can also click reset, and see this update in Events. In this
case, we can also see that the `time` is also updating properly.

![Tic Tac Toe Reset](diagrams/TTTDevToolsOnReset.png)

Ta-da! We've managed to successfully create the Tic Tac Toe board,
and using the DevTools can see our handles update accordingly.

Next, we'll implement our players so you can actually play the
game!

## Creating the Human Player Layer

Currently you should have a tic-tac-toe board that does nothing.
Sure, you can click it and see the Events populate, but that is
still rather boring. Let's make it more fun by adding a human 
player. By now, that original design we made in the first section
is probably not in the forefront of your mind, so we'll start by
looking at our design diagram.

![Tic Tac Toe Design](diagrams/TTT.jpg)  

From this, we can see that the Human Player needs a Player and
Move handle, and these handles connect the Game and Human Player.
We also need to populate the information about the player, so
we create a store. This updates our Arcs Manifest File to 
the one [here](https://github.com/PolymerLabs/arcs/blob/master/particles/Tutorial/Kotlin/Demo/src/pt2/TTTGame.arcs).

Next, we create the human player to take the events stream and
convert it to a move. This can be viewed in TTTHumanPlayer.kt 
[here](https://github.com/PolymerLabs/arcs/blob/master/particles/Tutorial/Kotlin/Demo/src/pt2/TTTHumanPlayer.kt).

Next, we need to update the game particle to update the board
based on the move. This gives us the updated TTTGame file 
[here](https://github.com/PolymerLabs/arcs/blob/master/particles/Tutorial/Kotlin/Demo/src/pt2/TTTGame.kt).

And finally, as always, we need to add the HumanPlayer to the
[BUILD file](https://github.com/PolymerLabs/arcs/blob/master/particles/Tutorial/Kotlin/Demo/src/pt2/BUILD).

By building and running this, when you click on a cell it should
be populate with the avatar set in the resource. By using this
sample code, this is an "X".

Next up, adding the computer player!

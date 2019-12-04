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

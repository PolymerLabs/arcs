# Remote Shell

Remote Shell demonstrates how a Shell can be separated from
Arcs Runtime and rendering surfaces via serial busses.

One can imagine the Remote Shell running as a process on a mobile device.

Remote Shell uses a message bus to communicate with an Arcs Runtime
process. In this implementation the Arcs Runtime is provided by Pipes Shell.
Remote Shell attaches to the Pipes Shell bus and uses the bus to communicate
with Arcs Runtime.

The Pipes Shell implements a Ui Broker that forwards rendering commands over
the bus. Remote Shell in turn forwards rendering commands to the Rendering
Surface.

The Rendering Surface is a Web View (iframe) spawned by Remote Shell. The
Rendering Surface has code to interpret Arcs render-packets and reify the
DOM composition.

In this version of the application, the following occurs:

- Remote Shell spawns the Pipes Shell and the Rendering Surface.
- When Pipes Shell declares readiness, Remote Shell asks it to spawn an Arc.
- Rendering packages are sent from Pipes Shell to Remote Shell, and then
to the Rendering Surface, where actual DOM is created.

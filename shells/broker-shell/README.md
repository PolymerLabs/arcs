# UniversalShell

UniversalShell represents an application that utilizes Arcs Runtime running in another process.
This UniversalShell is actually a web page, but it could be a Java application, a Node application,
or something else.

One can imagine UniversalShell running as a process on a mobile device
(as in, a Java application or service).

UniversalShell communicates with ArcsRuntime via the PipesShell bus; this API is fundamentally simple and consists only of a message-send/receive pair.

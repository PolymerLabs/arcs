# BrokerShell

BrokerShell represents an application that utilizes Arcs Runtime running in another process.
This BrokerShell is actually a web page, but it could be a Java application, a Node application,
or something else.

One can imagine BrokerShell running as a process on a mobile device
(as in, a Java application or service).

BrokerShell communicates with ArcsRuntime via the PipesShell bus; this API is fundamentally
simple and consists only of a message-send/receive pair.

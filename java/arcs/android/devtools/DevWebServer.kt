package arcs.android.devtools

/**
 * An interface for the DevTools server. This allows the [DevToolsService] to send data to a client.
 */
interface DevWebServer {

    /**
     * Send a string to the client.
     */
    fun send(msg: String)
}

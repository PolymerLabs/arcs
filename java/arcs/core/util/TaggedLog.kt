package arcs.core.util

/**
 * Allows the user to create a scoped log utility where everything logged will be prepended with the output of
 * [tagBuilder].
 */
class TaggedLog(private val tagBuilder: () -> String) {
    private fun taggedMessageBuilder(messageBuilder: () -> String): () -> String {
        return { "${tagBuilder()}: ${messageBuilder()}" }
    }

    /** Logs at a debug-level. */
    fun debug(throwable: Throwable? = null, messageBuilder: () -> String) =
        Log.debug(throwable, taggedMessageBuilder(messageBuilder))

    /** Logs at an info-level. */
    fun info(throwable: Throwable? = null, messageBuilder: () -> String) =
        Log.info(throwable, taggedMessageBuilder(messageBuilder))

    /** Logs at a warning-level. */
    fun warning(throwable: Throwable? = null, messageBuilder: () -> String) =
        Log.warning(throwable, taggedMessageBuilder(messageBuilder))

    /** Logs at an error-level. */
    fun error(throwable: Throwable? = null, messageBuilder: () -> String) =
        Log.error(throwable, taggedMessageBuilder(messageBuilder))

    /** Logs at a wtf-level. */
    fun wtf(throwable: Throwable? = null, messageBuilder: () -> String) =
        Log.wtf(throwable, taggedMessageBuilder(messageBuilder))
}

package arcs.arcs.util.testutil

import arcs.arcs.util.Log
import java.io.PrintWriter
import java.io.StringWriter
import java.util.Locale

/** Initializes [Log] for tests on the JVM. */
fun initLogForTest() {
    Log.level = Log.Level.Debug
    Log.writer = ::println
    Log.formatter = { index, level, throwable, rawMessage ->
        val stackTrace = throwable?.let {
            val writer = StringWriter()
            throwable.printStackTrace(PrintWriter(writer))
            "\n$writer"
        } ?: ""

        String.format(
            Locale.ENGLISH,
            "%05d (%10s) %s: %s%s",
            index, Thread.currentThread().name, level, rawMessage, stackTrace
        )
    }

    val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, error ->
        Log.wtf(error) { "Uncaught Exception" }
        defaultHandler.uncaughtException(thread, error)
    }
}

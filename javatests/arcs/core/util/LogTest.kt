package arcs.core.util

import com.google.common.truth.Truth.assertThat
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Log]. */
@RunWith(JUnit4::class)
class LogTest {
    private val loggedMessages = mutableListOf<String>()

    @Before
    fun setup() {
        Log.restoreDefaults()
        Log.logIndex.value = 0
        loggedMessages.clear()

        Log.writer = { _, message, _ -> loggedMessages.add(message) }
    }

    @Test
    fun debug_onlyLogs_whenAppropriate() {
        listOf(Log.Level.Info, Log.Level.Warning, Log.Level.Error, Log.Level.Wtf).forEach {
            Log.level = it
            Log.debug { "My message" }
            assertThat(loggedMessages).isEmpty()
        }

        Log.level = Log.Level.Debug
        Log.debug { "This should log" }
        assertThat(loggedMessages).containsExactly("1 - Debug: This should log")
    }

    @Test
    fun info_onlyLogs_whenAppropriate() {
        listOf(Log.Level.Warning, Log.Level.Error, Log.Level.Wtf).forEach {
            Log.level = it
            Log.info { "My message" }
            assertThat(loggedMessages).isEmpty()
        }

        Log.level = Log.Level.Info
        Log.info { "This should log" }
        assertThat(loggedMessages).containsExactly(
            "1 - Info: This should log"
        )
    }

    @Test
    fun warning_onlyLogs_whenAppropriate() {
        listOf(Log.Level.Error, Log.Level.Wtf).forEach {
            Log.level = it
            Log.warning { "My message" }
            assertThat(loggedMessages).isEmpty()
        }

        Log.level = Log.Level.Warning
        Log.warning { "This should log" }
        assertThat(loggedMessages).containsExactly(
            "1 - Warning: This should log"
        )
    }

    @Test
    fun error_onlyLogs_whenAppropriate() {
        listOf(Log.Level.Wtf).forEach {
            Log.level = it
            Log.error { "My message" }
            assertThat(loggedMessages).isEmpty()
        }

        Log.level = Log.Level.Error
        Log.error { "This should log" }
        assertThat(loggedMessages).containsExactly(
            "1 - Error: This should log"
        )
    }

    @Test
    fun messageBuilder_onlyCalledWhenLogLevel_requiresLogging() {
        Log.level = Log.Level.Warning

        Log.debug {
            fail("Should not have been called.")
            ""
        }
    }
}

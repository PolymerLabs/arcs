package arcs.core.util

import com.google.common.truth.Truth.assertThat
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Log] and [TaggedLog]. */
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
    fun verbose_onlyLogs_whenAppropriate() {
        Log.Level.values().forEach {
            Log.level = it
            Log.verbose { "logging at $it" }
        }
        assertThat(loggedMessages).containsExactly(
            "1 - Verbose: logging at Verbose"
        )
    }

    @Test
    fun debug_onlyLogs_whenAppropriate() {
        Log.Level.values().forEach {
            Log.level = it
            Log.debug { "logging at $it" }
        }
        assertThat(loggedMessages).containsExactly(
            "1 - Debug: logging at Verbose",
            "2 - Debug: logging at Debug"
        )
    }

    @Test
    fun info_onlyLogs_whenAppropriate() {
        Log.Level.values().forEach {
            Log.level = it
            Log.info { "logging at $it" }
        }
        assertThat(loggedMessages).containsExactly(
            "1 - Info: logging at Verbose",
            "2 - Info: logging at Debug",
            "3 - Info: logging at Info"
        )
    }

    @Test
    fun warning_onlyLogs_whenAppropriate() {
        Log.Level.values().forEach {
            Log.level = it
            Log.warning { "logging at $it" }
        }
        assertThat(loggedMessages).containsExactly(
            "1 - Warning: logging at Verbose",
            "2 - Warning: logging at Debug",
            "3 - Warning: logging at Info",
            "4 - Warning: logging at Warning"
        )
    }

    @Test
    fun error_onlyLogs_whenAppropriate() {
        Log.Level.values().forEach {
            Log.level = it
            Log.error { "logging at $it" }
        }
        assertThat(loggedMessages).containsExactly(
            "1 - Error: logging at Verbose",
            "2 - Error: logging at Debug",
            "3 - Error: logging at Info",
            "4 - Error: logging at Warning",
            "5 - Error: logging at Error"
        )
    }

    @Test
    fun wtf_alwaysLogs() {
        Log.Level.values().forEach {
            Log.level = it
            Log.wtf { "logging at $it" }
        }
        assertThat(loggedMessages).containsExactly(
            "1 - Wtf: logging at Verbose",
            "2 - Wtf: logging at Debug",
            "3 - Wtf: logging at Info",
            "4 - Wtf: logging at Warning",
            "5 - Wtf: logging at Error",
            "6 - Wtf: logging at Wtf"
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

    @Test
    fun taggedLog() {
        val taggedLog = TaggedLog { "tag" }
        Log.Level.values().forEach {
            Log.level = it
            taggedLog.warning { "logging at $it" }
        }
        assertThat(loggedMessages).containsExactly(
            "1 - Warning: tag: logging at Verbose",
            "2 - Warning: tag: logging at Debug",
            "3 - Warning: tag: logging at Info",
            "4 - Warning: tag: logging at Warning"
        )
    }

    @Test
    fun taggedLog_withSuffix() {
        // Also check that the string builders are executed with each log call (i.e. not just when
        // the logger is constructed).
        var tagIndex = 5
        var sfxIndex = 7
        val taggedLog = TaggedLog { "tag-$tagIndex" }.withSuffix { "(suffix-$sfxIndex)" }

        Log.level = Log.Level.Info
        taggedLog.info { "message A" }
        tagIndex++
        sfxIndex++
        taggedLog.info { "message B" }
        assertThat(loggedMessages).containsExactly(
            "1 - Info: tag-5: message A (suffix-7)",
            "2 - Info: tag-6: message B (suffix-8)"
        )
    }
}

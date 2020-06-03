/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.util.testutil

import arcs.core.util.Log
import arcs.core.util.TaggedLog
import java.io.PrintWriter
import java.io.StringWriter
import java.util.Locale
import java.util.concurrent.CopyOnWriteArrayList
import org.junit.rules.TestRule
import org.junit.runner.Description
import org.junit.runners.model.Statement

/** JUnit [TestRule] which prints wrappers around the log output from each test. */
class LogRule(
    private val logLevel: Log.Level = Log.Level.Debug,
    private val withTimes: Boolean = false
) : TestRule {
    private val taggedLog = TaggedLog { "TEST" }
    lateinit var loggedMessages: List<String>

    override fun apply(base: Statement, desc: Description): Statement = object : Statement() {
        override fun evaluate() {
            val messages = CopyOnWriteArrayList<String>()
            loggedMessages = messages

            println()
            println("+${"-".repeat(98)}+")
            println("| Logs From ${" ".repeat(87)}|")
            println("|   ${desc.testName.padEnd(94, ' ')} |")
            println("+${"-".repeat(98)}+")
            println()
            initLogForTest(messages, logLevel, withTimes)
            base.evaluate()
            println()
        }
    }

    operator fun invoke(message: String) = taggedLog.info { message }

    private val Description.testName: String
        get() = "${testClass.simpleName}.$methodName()"

    companion object {
        /** Initializes [Log] for tests on the JVM. */
        private fun initLogForTest(
            collectedMessages: MutableList<String>,
            logLevel: Log.Level,
            withTimes: Boolean
        ) {
            val startTime = System.currentTimeMillis()
            Log.logIndex.value = 0
            Log.level = logLevel
            Log.writer = { level, renderedMessage, _ ->
                collectedMessages.add(renderedMessage)
                if (
                    level == Log.Level.Warning ||
                    level == Log.Level.Error ||
                    level == Log.Level.Wtf
                ) {
                    System.err.println(renderedMessage)
                } else {
                    println(renderedMessage)
                }
            }
            Log.formatter = { index, level, throwable, rawMessage ->
                val stackTrace = throwable?.let {
                    val writer = StringWriter()
                    throwable.printStackTrace(PrintWriter(writer))
                    "\n$writer"
                } ?: ""

                if (withTimes) {
                    val time = System.currentTimeMillis()
                    String.format(
                        Locale.ENGLISH,
                        "%05d %d(%d) (%10s) %s: %s%s",
                        index,
                        time,
                        time - startTime,
                        Thread.currentThread().name,
                        level,
                        rawMessage,
                        stackTrace
                    )
                } else {
                    String.format(
                        Locale.ENGLISH,
                        "%05d (%10s) %s: %s%s",
                        index, Thread.currentThread().name, level, rawMessage, stackTrace
                    )
                }
            }

            val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
            Thread.setDefaultUncaughtExceptionHandler { thread, error ->
                Log.wtf(error) { "Uncaught Exception" }
                defaultHandler?.uncaughtException(thread, error)
            }
        }
    }
}

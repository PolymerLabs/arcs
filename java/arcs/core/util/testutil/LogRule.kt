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
import org.junit.rules.TestRule
import org.junit.runner.Description
import org.junit.runners.model.Statement
import java.io.PrintWriter
import java.io.StringWriter
import java.util.Locale

/** JUnit [TestRule] which prints wrappers around the log output from each test. */
class LogRule : TestRule {
    private val taggedLog = TaggedLog { "TEST" }

    override fun apply(base: Statement, desc: Description): Statement = object : Statement() {
        override fun evaluate() {
            println()
            println("+${"-".repeat(98)}+")
            println("| Logs From ${" ".repeat(87)}|")
            println("|   ${desc.testName.padEnd(94, ' ')} |")
            println("+${"-".repeat(98)}+")
            println()
            initLogForTest()
            base.evaluate()
            println()
        }
    }

    operator fun invoke(message: String) = taggedLog.info { message }

    private val Description.testName: String
        get() = "${testClass.simpleName}.$methodName()"

    companion object {
        /** Initializes [Log] for tests on the JVM. */
        private fun initLogForTest() {
            Log.logIndex.value = 0
            Log.level = Log.Level.Debug
            Log.writer = { level, renderedMessage ->
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

                String.format(
                    Locale.ENGLISH,
                    "%05d (%10s) %s: %s%s",
                    index, Thread.currentThread().name, level, rawMessage, stackTrace
                )
            }

            val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
            Thread.setDefaultUncaughtExceptionHandler { thread, error ->
                Log.wtf(error) { "Uncaught Exception" }
                defaultHandler?.uncaughtException(thread, error)
            }
        }
    }
}

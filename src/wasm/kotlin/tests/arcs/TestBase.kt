package wasm.kotlin.tests.arcs

import arcs.Particle
import arcs.Collection
import kotlin.native.internal.ExportForCppRuntime

import kotlin.test.Asserter
import kotlin.test.AsserterContributor
import kotlin.test.AssertionError


class ParticleAsserter : Particle(), Asserter {
    private val errors = Collection { Test_Data() }

    init {
        registerHandle("errors", errors)
    }

    private fun <T> assertContainerEqualOrdered(container: Collection<T>, converter: (T) -> String, expected: List<String>, isOrdered: Boolean = true) {
        if (container.size != expected.size) {
            fail("expected container to have ${expected.size} items; " +
                "actual size ${container.size}")
        }

        // Convert result values to strings and sort them when checking an unordered container.
        val res = mutableListOf<String>()
        for (val it in container) {
            res.add(converter(it))
        }
        if(!isOrdered) {
            res.sort()
        }

        // Compare against expected.
        val marks = mutableListOf<String>()
        var ok = true
        for (pair in expected zip res) {
            val match = pair.first.equals(pair.second)
            marks.add(if(match) " " else "*")
            ok = ok && match
        }

    }

    fun assertContainerEqualUnordered() = Unit


    override fun fail(message: String?): Nothing {
        val err = if (message == null) Test_Data(txt="Failure") else Test_Data(txt=message)
        errors.store(err)

        if(message == null)
            throw AssertionError()
        else
            throw AssertionError(message)
    }
}


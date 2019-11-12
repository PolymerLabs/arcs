package wasm.kotlin.tests.arcs

import arcs.Particle
import arcs.Collection
import kotlin.native.internal.ExportForCppRuntime

import kotlin.test.Asserter
import kotlin.test.AsserterContributor
import kotlin.test.AssertionError


class TestBase : Particle() {

}

class ParticleTestContributor : AsserterContributor {
    override fun contributeO(): Asserter? {
        return if (hasArcsParticleInClassPath) ParticleAsserter else null
    }

    private val hasArcsParticleInClassPath = try {
        Class.forName("arcs.Particle")
        true
    } catch (_: java.lang.ClassNotFoundException) {
        false
    }
}

object ParticleAsserter : Particle(), Asserter {
    private val errors = Collection { Test_Data() }

    init {
        registerHandle("errors", errors)
    }

    override fun fail(message: String?): Nothing {
        val err = if (message == null) Test_Data(txt="Failure") else Test_Data(txt=message)
        errors.store(err)

        if(message == null)
            throw AssertionError()
        else
            throw AssertionError(message)
    }
}


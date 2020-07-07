package arcs.showcase.references

import arcs.showcase.ShowcaseEnvironment
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout

/** Container for WriteRecipe specific things */
@ExperimentalCoroutinesApi
class ArcsStorage(private val env: ShowcaseEnvironment) {

    // This is a helper for public methods to dispatcher the suspend calls onto a coroutine and
    // wait for the result, and to wrap the suspend methods in a timeout, converting a potential
    // test timeout into a more specific test failure.
    private inline fun <T> run(crossinline block: suspend () -> T) = runBlocking {
        withTimeout(15000) {
            block()
        }
    }

    fun all0(): List<MyLevel0> = run {
        env.getParticle<Reader0>(WriteRecipePlan).read()
    }

    fun put0(item: MyLevel0) = run {
        env.getParticle<Writer0>(WriteRecipePlan).write(item)
    }

    fun all1(): List<MyLevel1> = run {
        env.getParticle<Reader1>(WriteRecipePlan).read()
    }

    fun put1(item: MyLevel1) = run {
        env.getParticle<Writer1>(WriteRecipePlan).write(item)
    }

    fun all2(): List<MyLevel2> = run {
        env.getParticle<Reader2>(WriteRecipePlan).read()
    }

    fun put2(item: MyLevel2) = run {
        env.getParticle<Writer2>(WriteRecipePlan).write(item)
    }
}

package arcs.showcase.mappedread

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
        withTimeout(30000) { block() }
    }

    fun all0(): List<ClientItem> = run {
        env.getParticle<Reader>(ExternalReaderPlan).read()
    }

    fun put0(item: ClientItem) = run {
        env.getParticle<Writer>(WriteRecipePlan).write(item)
    }
}

package arcs.showcase.inlines

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.host.toRegistration
import arcs.showcase.ShowcaseEnvironment
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@ExperimentalCoroutinesApi
@RunWith(AndroidJUnit4::class)
class InlinesTest {

    @get:Rule
    val env = ShowcaseEnvironment(
        ::TypeWriter.toRegistration(),
        ::IntegralReader.toRegistration(),
        ::FloatingReader.toRegistration(),
        ::CharReader.toRegistration(),
        ::IntegralSetReader.toRegistration(),
        ::FloatingSetReader.toRegistration(),
        ::CharSetReader.toRegistration(),
        ::UseUpExtraRegisterSpace.toRegistration()
    )

    @Test
    fun kotlinTypes_runArc() = runBlocking {
        val arc = env.startArc(UseKotlinTypesPlan)

        withTimeout(1500) {
            IntegralReader.updated.join()
            FloatingReader.updated.join()
            CharReader.updated.join()
            IntegralSetReader.updated.join()
            FloatingSetReader.updated.join()
            CharSetReader.updated.join()
        }

        env.stopArc(arc)
    }
}

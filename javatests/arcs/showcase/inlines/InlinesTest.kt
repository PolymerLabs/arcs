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
        ::Generator.toRegistration(),
        ::CopyInlineComponent.toRegistration(),
        ::ExractReferencedComponent.toRegistration(),
        ::ChildModifier.toRegistration(),
        ::ConfirmFinalValue.toRegistration(),
        ::RemoveEntity.toRegistration(),
        ::Trigger.toRegistration(),
    )

    @Test
    fun kotlinTypes_runArc() = runBlocking {
        val arc = env.startArc(UseInlineEntitiesPlan)

        withTimeout(1500) {
            ConfirmFinalValue.updated.join()
        }

        env.stopArc(arc)
    }
}

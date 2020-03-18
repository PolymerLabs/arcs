package arcs.android.storage.handle

import android.app.Application
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.test.core.app.ApplicationProvider
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.core.storage.handle.HandleManagerTestBase
import com.nhaarman.mockitokotlin2.mock
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.runBlocking
import org.junit.Before

@Suppress("EXPERIMENTAL_API_USAGE")
open class AndroidHandleManagerTestBase : HandleManagerTestBase(), LifecycleOwner {
    private lateinit var lifecycle: LifecycleRegistry
    override fun getLifecycle() = lifecycle

    lateinit var app: Application

    // Android tests spawn other threads, so runBlockingTest won't work
    override var testRunner = { block: suspend CoroutineScope.() -> Unit ->
        runBlocking { this.block() }
    }

    @Before
    fun setUp() {
        lifecycle = LifecycleRegistry(this).apply {
            setCurrentState(Lifecycle.State.CREATED)
            setCurrentState(Lifecycle.State.STARTED)
            setCurrentState(Lifecycle.State.RESUMED)
        }
        app = ApplicationProvider.getApplicationContext()

        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)
    }

}

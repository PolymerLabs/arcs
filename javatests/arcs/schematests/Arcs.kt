@file:Suppress("EXPERIMENTAL_IS_NOT_ENABLED")

package arcs.schematests

import android.content.Context
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import arcs.android.sdk.host.AndroidHost
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.allocator.Allocator
import arcs.core.common.toArcId
import arcs.core.host.EntityHandleManager
import arcs.core.host.SchedulerProvider
import arcs.core.host.toRegistration
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.ConnectionFactory
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.coroutines.EmptyCoroutineContext


/** Container to own the allocator and start the long-running arc. */
class Arcs(
    private val context: Context,
    // A test [ConnectionFactory] can be provided here under test.
    // In production, leave this parameter as null. Arcs will provide a default implementation.
    connectionFactory: ConnectionFactory? = null
)  {
    val schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)


    private val fakeLifecycleOwner = object : LifecycleOwner {
        private val lifecycle = LifecycleRegistry(this)
        override fun getLifecycle() = lifecycle
    }


    val arcHost = ArcHost(
        context,
        fakeLifecycleOwner.lifecycle,
        schedulerProvider,
        connectionFactory
    )

    private lateinit var allocator: Allocator

    /**
     * Start the arc containing the particles that provide the persistence. This should be run
     * one time per instance, via [startIfNot].
     */
    private suspend fun startArc() {
        /** This should probably live in an initializer somewhere. */
        val hostRegistry = ExplicitHostRegistry().apply {
            registerHost(arcHost)
        }

        allocator = Allocator.create(
            hostRegistry,
            EntityHandleManager(
                arcId = "allocator",
                hostId = "allocator",
                time = JvmTime,
                scheduler = schedulerProvider.invoke("allocator")
            )
        )

        allocator.startArcForPlan("", WriteRecipePlan)
    }

    suspend fun stop() {
        allocator.stopArc("!:testArc".toArcId())
    }

    private var started = false
    val mutex = Mutex()

    private suspend fun startIfNot() = mutex.withLock {
        if (!started) {
            startArc()
            started = true
        }
    }

    fun all0(): List<Level0> {
        return runBlocking {
            startIfNot()
            arcHost.reader0.initialize().read()
        }
    }

    fun put0(item: Level0) {
        runBlocking {
            startIfNot()
            arcHost.writer0.initialize().write(item)
        }
    }

    fun all1(): List<Level1> {
        return runBlocking {
            startIfNot()
            arcHost.reader1.initialize().read()
        }
    }

    fun put1(item: Level1) {
        runBlocking {
            startIfNot()
            arcHost.writer1.initialize().write(item)
        }
    }

    fun all2(): List<Level2> {
        return runBlocking {
            startIfNot()
            arcHost.reader2.initialize().read()
        }
    }

    fun put2(item: Level2) {
        runBlocking {
            startIfNot()
            arcHost.writer2.initialize().write(item)
        }
    }
}

    /**
     * This [ArcHost] is the home of the three particles used by the ParticipantPersistence recipe.
     *
     * It exposes their public methods to provide required read/write functionality.
     */
    class ArcHost(
        context: Context,
        lifecycle: Lifecycle,
        schedulerProvider: SchedulerProvider,
        connectionFactory: ConnectionFactory? = null
    ) : AndroidHost(
        context,
        lifecycle,
        schedulerProvider,
        ::Reader0.toRegistration(),
        ::Writer0.toRegistration(),
        ::Reader1.toRegistration(),
        ::Writer1.toRegistration(),
        ::Reader2.toRegistration(),
        ::Writer2.toRegistration()
    ) {
        @OptIn(ExperimentalCoroutinesApi::class)
        override val activationFactory = ServiceStoreFactory(
            context,
            lifecycle,
            connectionFactory = connectionFactory
        )

        @Suppress("UNCHECKED_CAST")
        private fun <T> getParticle(name: String) =
            getArcHostContext("!:testArc")!!.particles[name]!!.particle as T

        val reader0: Reader0
            get() = getParticle("Reader0")

        val writer0: Writer0
            get() = getParticle("Writer0")

        val reader1: Reader1
            get() = getParticle("Reader1")

        val writer1: Writer1
            get() = getParticle("Writer1")

        val reader2: Reader2
            get() = getParticle("Reader2")

        val writer2: Writer2
            get() = getParticle("Writer2")

    }


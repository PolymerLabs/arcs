package arcs.android.integration

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.work.Configuration
import androidx.work.WorkManager
import androidx.work.testing.SynchronousExecutor
import androidx.work.testing.TestDriver
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.android.storage.database.DatabaseGarbageCollectionPeriodicTask
import arcs.android.storage.database.DatabaseImpl
import arcs.android.storage.ttl.PeriodicCleanupTask
import arcs.core.allocator.Allocator
import arcs.core.allocator.Arc
import arcs.core.data.Capability
import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.entity.ForeignReferenceChecker
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.entity.Handle
import arcs.core.entity.HandleSpec
import arcs.core.host.AbstractArcHost
import arcs.core.host.ArcHost
import arcs.core.host.HandleManager
import arcs.core.host.HandleManagerFactory
import arcs.core.host.HandleManagerImpl
import arcs.core.host.NoOpArcHostContextSerializer
import arcs.core.host.ParticleRegistration
import arcs.core.host.ParticleState
import arcs.core.host.SchedulerProvider
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageProxy
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.driver.RamDisk
import arcs.core.util.Scheduler
import arcs.core.util.TaggedLog
import arcs.core.util.Time
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.util.JvmTime
import arcs.sdk.Particle
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.DatabaseGarbageCollectionPeriodicTaskV2
import arcs.sdk.android.storage.service.StorageService
import arcs.sdk.android.storage.service.StorageService.StorageServiceConfig
import arcs.sdk.android.storage.service.StorageServiceManagerEndpointImpl
import arcs.sdk.android.storage.service.testutil.TestBindHelper
import arcs.sdk.android.storage.service.testutil.TestWorkerFactory
import kotlin.coroutines.CoroutineContext
import kotlin.time.Duration
import kotlin.time.hours
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.withTimeout
import org.junit.rules.TestRule
import org.junit.runner.Description
import org.junit.runners.model.Statement
import org.robolectric.shadows.ShadowSystemClock

/**
 * A JUnit rule setting up an Arcs environment for integration tests.
 *
 * Usage example follows:
 *
 * ```
 * @get:Rule val env = IntegrationEnvironment(
 *     ::SomeParticle.toRegistration(),
 *     ::OtherParticle.toRegistration(),
 * )
 *
 * @Test
 * fun answerToEverythingIsCorrect() = runTest {
 *   // Start an Arc.
 *   val arc = env.startArc(YourGeneratedPlan)
 *
 *   // Do something with it.
 *   env.getParticle<SomeParticle>(arc).query("what's the answer?")
 *
 *   // Assert result.
 *   assertThat(env.getParticle<OtherParticle>(arc).state).isEqualTo(42)
 * }
 * ```
 *
 * This form sets up an environment with a single host. To dynamically add multiple hosts each with
 * their own explicitly grouped particles, you must use the [addNewHostWith] method.
 *
 * ```
 * @Test
 * fun answerToEverythingIsCorrect() = runTest {
 *   env.addNewHostWith(::MyParticle1.toRegistration(), ::MyParticle2.toRegistration())
 *   env.addNewHostWith(::MyParticle3.toRegistration(), ::MyParticle4.toRegistration())
 *
 *   // Start an Arc.
 *   val arc = env.startArc(YourGeneratedPlan)
 * ```
 *
 * Rudimentary support for inspecting the database state exists, given you know the storage
 * key and schema. Note: what actually gets written to storage may differ (be more specific) than
 * the stated fields in the schema.
 *
 * ```
 * @Test
 * fun checkThatStorageLooksOk() = runTest {
 *  // Get storage key location from a live particle
 *  val startingKey = getStorageKeyFromHandle(someParticle.handles.input)
 *
 *  // Returns a list of [DatabaseData] data classes
 *  val storageState = env.getStorageState(startingKey, AbstractSomeParticle.FooType.SCHEMA)
 *
 *  // ...
 * }
 * ```
 *
 * This will allow the allocator to start a plan spread across multiple hosts.
 */
@OptIn(ExperimentalCoroutinesApi::class, kotlin.time.ExperimentalTime::class)
class IntegrationEnvironment(
  vararg particleRegistrations: ParticleRegistration,
  foreignReferenceChecker: ForeignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap()),
  private val periodicWorkConfig: StorageServiceConfig = StorageServiceConfig(
    ttlJobEnabled = true,
    garbageCollectionJobEnabled = true
  )
) : TestRule {
  private val lifecycleTimeoutMillis: Long = 60000
  private val arcHostsToBuild = setOf(Host(foreignReferenceChecker, *particleRegistrations))
  private val log = TaggedLog { "IntegrationEnvironment" }

  private lateinit var allocator: Allocator
  lateinit var hostRegistry: ExplicitHostRegistry
  private lateinit var dbManager: AndroidSqliteDatabaseManager
  private lateinit var handleManagerFactory: HandleManagerFactory

  private val startedArcs = mutableListOf<Arc>()
  private val testScope = TestCoroutineScope()

  /**
   * Information needed to construct an [IntegrationHost] populated with the given particle
   * registrations
   **/
  class Host(
    val foreignReferenceChecker: ForeignReferenceChecker,
    vararg val particleRegistrations: ParticleRegistration
  )

  /**
   * Starts an [Arc] for a given [Plan] and waits for it to be ready.
   */
  suspend fun startArc(plan: Plan): Arc {
    log.info { "Starting arc for plan: $plan" }
    val arc = allocator.startArcForPlan(plan)
    startedArcs.add(arc)
    log.info { "Waiting for start of $arc" }
    arc.waitForStart()
    log.info { "Arc started: $arc" }
    return arc
  }

  /**
   * Retrieves a [Particle] instance from a given [Arc].
   */
  suspend inline fun <reified T : Particle> getParticle(plan: Plan): T {
    require(plan.arcId != null) {
      "retrieving a particle for non-singleton plans is not supported"
    }
    val arc = startArc(plan)
    return getParticle<T>(arc)
  }

  /**
   * Retrieves a [Particle] instance from a given [Arc].
   */
  suspend inline fun <reified T : Particle> getParticle(arc: Arc): T {
    val arcId = arc.id.toString()
    val particleName = T::class.simpleName!!
    return requireNotNull(
      hostRegistry.availableArcHosts().firstOrNull {
        it as IntegrationHost
        it.hasParticle(arc.id.toString(), T::class.simpleName!!)
      } as IntegrationHost?
    ) { "No ArcHosts found for particle $particleName" }.getParticle(arcId, particleName)
  }

  /**
   * Stops a given [Arc].
   */
  suspend fun stopArc(arc: Arc) = allocator.stopArc(arc.id)

  override fun apply(statement: Statement, description: Description): Statement {
    val suspendingStatement = object : SuspendingStatement {
      override suspend fun evaluate() {
        val components = startupArcs()
        try {
          // Running the test within a try block, so we can clean up in the finally
          // section, even if the test fails.
          statement.evaluate()
        } finally {
          teardownArcs(components)
        }
      }
    }

    return TimeLimitedStatement(suspendingStatement, description, lifecycleTimeoutMillis)
  }

  private interface SuspendingStatement {
    suspend fun evaluate()
  }

  private class TimeLimitedStatement(
    private val innerStatement: SuspendingStatement,
    @Suppress("unused") private val description: Description,
    private val timeoutMillis: Long
  ) : Statement() {
    override fun evaluate() = runBlocking {
      withTimeout(timeoutMillis) { innerStatement.evaluate() }
    }
  }

  private lateinit var workManager: WorkManager
  private lateinit var workManagerTestDriver: TestDriver

  /**
   * Operations performed:
   * Clear RamDisk
   * Initialize WorkManager and TestDriver
   * Setup AndroidSqlDatabaseManager
   * Run DriverAndKeyConfigurator
   * Construct all Hosts and add them an an ExplicitHostRegistry
   * Create an Allocator.
   */
  private suspend fun startupArcs(maxDbSize: Int? = null): IntegrationArcsComponents {
    // Reset the RamDisk.
    RamDisk.clear()

    // Initializing the environment...
    val context = ApplicationProvider.getApplicationContext<Application>()

    WorkManagerTestInitHelper.initializeTestWorkManager(
      context,
      Configuration.Builder().setExecutor(SynchronousExecutor())
        .setWorkerFactory(TestWorkerFactory(IntegrationStorageService::class)).build()
    )

    workManagerTestDriver = requireNotNull(WorkManagerTestInitHelper.getTestDriver(context)) {
      "WorkManager TestDriver cannot be null"
    }
    workManager = WorkManager.getInstance(context)

    // Set up the Database manager, drivers, and keys/key-parsers.
    dbManager = AndroidSqliteDatabaseManager(context, maxDbSize)
    // Be sure we always start with a fresh, empty database.
    dbManager.resetAll()

    DriverAndKeyConfigurator.configure(dbManager)

    hostRegistry = ExplicitHostRegistry().apply {
      arcHostsToBuild.forEach {
        registerHost(
          createIntegrationHost(context, it.foreignReferenceChecker, it.particleRegistrations)
        )
      }
    }

    // TODO: add method/parameter to switch between serializing/non-serializing for tests
    allocator = Allocator.createNonSerializing(hostRegistry, testScope)

    return IntegrationArcsComponents(testScope, dbManager)
  }

  suspend fun resetDbWithMaxSize(maxDbSize: Int) {
    startupArcs(maxDbSize)
  }

  private fun createIntegrationHost(
    context: Application,
    foreignReferenceChecker: ForeignReferenceChecker,
    particleRegistrations: Array<out ParticleRegistration>
  ): IntegrationHost {
    // Create a child job so we can cancel it to shut down the endpoint manager,
    // without breaking the test.
    val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)
    val testBindHelper = TestBindHelper(context, IntegrationStorageService::class)
    // Create our ArcHost, capturing the StoreManager so we can manually wait for idle
    // on it once the test is done.
    val storageEndpointManager = AndroidStorageServiceEndpointManager(
      testScope,
      testBindHelper,
      IntegrationStorageService::class.java
    )

    (testBindHelper.serviceController.get() as IntegrationStorageService).changeConfig(
      periodicWorkConfig
    )

    handleManagerFactory = CachedHandleManagerFactory(
      schedulerProvider = schedulerProvider,
      storageEndpointManager = storageEndpointManager,
      platformTime = JvmTime,
      foreignReferenceChecker = foreignReferenceChecker
    )

    return IntegrationHost(
      Dispatchers.Default,
      handleManagerFactory,
      *particleRegistrations
    )
  }

  private suspend fun teardownArcs(components: IntegrationArcsComponents) {
    // Stop all the arcs and shut down the arcHost.
    startedArcs.forEach { it.stop() }
    hostRegistry.availableArcHosts().forEach { it.shutdown() }

    // Reset the Databases and close them.
    components.dbManager.resetAll()
    components.dbManager.close()

    // cancel() throws an error if coroutineScope has no job.
    if (components.scope.coroutineContext[Job] != null) {
      components.scope.cancel()
    }
  }

  private data class IntegrationArcsComponents(
    val scope: CoroutineScope,
    val dbManager: AndroidSqliteDatabaseManager
  )

  suspend fun getEntitiesCount() = dbManager.getEntitiesCount(persistent = true)

  fun triggerCleanupWork() {
    // Advance 49 hours, as only entities older than 48 hours are garbage collected.
    advanceClock(49.hours)
    triggerWork(PeriodicCleanupTask.WORKER_TAG)
    // Need to run twice, once to mark orphans, once to delete them
    val tag = if (periodicWorkConfig.useGarbageCollectionTaskV2) {
      DatabaseGarbageCollectionPeriodicTaskV2.WORKER_TAG
    } else DatabaseGarbageCollectionPeriodicTask.WORKER_TAG
    triggerWork(tag)
    triggerWork(tag)
  }

  private fun triggerWork(tag: String) {
    workManager.getWorkInfosByTag(tag).get().single().let { job ->
      workManagerTestDriver.setAllConstraintsMet(job.id)
      workManagerTestDriver.setPeriodDelayMet(job.id)
      workManagerTestDriver.setInitialDelayMet(job.id)
    }
  }

  suspend fun triggerHardReferenceDelete(namespace: Schema, id: String): Long {
    return StorageServiceManagerEndpointImpl(
      TestBindHelper(ApplicationProvider.getApplicationContext()),
      testScope
    ).triggerForeignHardReferenceDeletion(namespace, id)
  }

  suspend fun reconcileHardReference(namespace: Schema, fullSet: Set<String>): Long {
    return StorageServiceManagerEndpointImpl(
      TestBindHelper(ApplicationProvider.getApplicationContext()),
      testScope
    ).reconcileForeignHardReference(namespace, fullSet)
  }

  suspend fun waitForIdle(arc: Arc) {
    hostRegistry.availableArcHosts().forEach { arcHost ->
      arcHost.waitForArcIdle(arc.id.toString())
    }
  }

  fun advanceClock(duration: Duration) {
    ShadowSystemClock.advanceBy(
      duration.toComponents { seconds, nanoseconds ->
        java.time.Duration.ofSeconds(seconds, nanoseconds.toLong())
      }
    )
  }

  suspend fun addNewHostWith(vararg particleRegistrations: ParticleRegistration) {
    hostRegistry.registerHost(
      createIntegrationHost(
        ApplicationProvider.getApplicationContext<Application>(),
        ForeignReferenceCheckerImpl(emptyMap()),
        particleRegistrations
      )
    )
  }

  suspend fun waitForArcIdle(arcId: String) {
    hostRegistry.availableArcHosts().forEach { it.waitForArcIdle(arcId) }
  }

  class IntegrationStorageService : StorageService() {
    fun changeConfig(config: StorageServiceConfig) = schedulePeriodicJobs(config)
  }

  /** Returns a collection of [CreateHandleArgs] that arose from starting the [Arc]. */
  fun getCreateHandleArgs(): List<CreateHandleArgs> {
    val handleManager = requireNotNull(
      (handleManagerFactory as CachedHandleManagerFactory).handleManager
    ) {
      "HandleManagerImpl has not yet been initialized! Make sure startArc() has been called."
    }
    return handleManager.createHandleArguments.toList()
  }

  /** Get collection of [DatabaseData] for all databases; includes referenced entities. */
  suspend fun getStorageState(startingKey: StorageKey, fullSchema: Schema): List<DatabaseData> {
    val classes = listOf(
      DatabaseData.Collection::class,
      DatabaseData.Singleton::class,
      DatabaseData.Entity::class
    )

    val dbs = dbManager.registry.fetchAll()
      .map { dbManager.getDatabase(it.name, it.isPersistent) as DatabaseImpl }

    return dbs.flatMap { dbImpl ->
      // Get the first value at the storage key location, guessing if it's a singleton, collection,
      // or entity.
      val data = classes.mapNotNull { klass ->
        try {
          dbImpl.get(startingKey, klass, fullSchema)
        } catch (e: IllegalArgumentException) {
          null
        }
      }.firstOrNull()

      // Return the value found (if it exists) and the values it references (if it's a singleton or
      // collection).
      when (data) {
        null -> emptyList()
        is DatabaseData.Singleton -> {
          val singletonKey = data.value?.rawReference?.referencedStorageKey()
          if (singletonKey == null) listOf(data)
          else listOfNotNull(
            data,
            dbImpl.get(singletonKey, DatabaseData.Entity::class, fullSchema)
          )
        }
        is DatabaseData.Collection -> {
          val collectionKeys = data.values.map { it.rawReference.referencedStorageKey() }
          listOf(data) + collectionKeys.mapNotNull { key ->
            dbImpl.get(key, DatabaseData.Entity::class, fullSchema)
          }
        }
        is DatabaseData.Entity -> listOf(data)
      }
    }
  }
}

/** A [HandleManager] that exposes data about created [Handle]s. */
class IntegrationHandleManager(private val handleManagerImpl: HandleManagerImpl) : HandleManager {
  val createHandleArguments = mutableListOf<CreateHandleArgs>()

  override suspend fun createHandle(
    spec: HandleSpec,
    storageKey: StorageKey,
    ttl: Capability.Ttl,
    particleId: String,
    immediateSync: Boolean,
    storeSchema: Schema?,
    actor: String?
  ): Handle {
    createHandleArguments.add(
      CreateHandleArgs(spec, storageKey, ttl, particleId, storeSchema, actor)
    )
    return handleManagerImpl.createHandle(
      spec, storageKey, ttl, particleId, immediateSync, storeSchema, actor
    )
  }

  override fun scheduler(): Scheduler = handleManagerImpl.scheduler()

  override suspend fun close() = handleManagerImpl.close()

  override suspend fun allStorageProxies(): List<StorageProxy<*, *, *>> =
    handleManagerImpl.allStorageProxies()
}

/** A record of arguments passed to [HandleManager.createHandle]. */
data class CreateHandleArgs(
  val spec: HandleSpec,
  val storageKey: StorageKey,
  val ttl: Capability.Ttl,
  val particleId: String,
  val storeSchema: Schema?,
  val actor: String?
)

/** A [HandleManagerFactory] that caches and exposes the [HandleManagerImpl]. */
class CachedHandleManagerFactory(
  schedulerProvider: SchedulerProvider,
  storageEndpointManager: StorageEndpointManager,
  platformTime: Time,
  foreignReferenceChecker: ForeignReferenceChecker = ForeignReferenceCheckerImpl(
    emptyMap()
  )
) : HandleManagerFactory(
  schedulerProvider,
  storageEndpointManager,
  platformTime,
  foreignReferenceChecker = foreignReferenceChecker
) {
  lateinit var handleManager: IntegrationHandleManager

  @Suppress("UNCHECKED_CAST")
  override fun build(arcId: String, hostId: String): HandleManager {
    handleManager = IntegrationHandleManager(super.build(arcId, hostId) as HandleManagerImpl)
    return handleManager
  }
}

/**
 * An [ArcHost] exposing the ability to get instances of particles.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class IntegrationHost(
  coroutineContext: CoroutineContext,
  handleManagerFactory: HandleManagerFactory,
  vararg particleRegistrations: ParticleRegistration
) : AbstractArcHost(
  coroutineContext = coroutineContext,
  handleManagerFactory = handleManagerFactory,
  arcHostContextSerializer = NoOpArcHostContextSerializer(),
  initialParticles = particleRegistrations
) {
  suspend fun hasParticle(arcId: String, particleName: String): Boolean {
    return getArcHostContext(arcId)?.particles?.firstOrNull {
      it.planParticle.particleName == particleName
    } != null
  }

  @Suppress("UNCHECKED_CAST")
  suspend fun <T> getParticle(arcId: String, particleName: String): T {
    val arcHostContext = requireNotNull(getArcHostContext(arcId)) {
      "ArcHost: No arc host context found for $arcId"
    }
    val particleContext = requireNotNull(
      arcHostContext.particles.first {
        it.planParticle.particleName == particleName
      }
    ) {
      "ArcHost: No particle named $particleName found in $arcId"
    }
    val allowableStartStates = arrayOf(ParticleState.Running, ParticleState.Waiting)
    check(particleContext.particleState in allowableStartStates) {
      "ArcHost: Particle $particleName has failed, or not been started"
    }

    @Suppress("UNCHECKED_CAST")
    return particleContext.particle as T
  }

  override fun toString(): String = "IntegrationHost"
}

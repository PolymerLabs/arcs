package arcs.android.common.resurrection

import android.app.Service
import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import arcs.core.storage.StorageKey
import arcs.core.util.guardWith
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

/**
 * Extension point for [Service]s which wish to be capable of resurrecting their clients.
 */
abstract class ResurrectorService : Service() {
    /**
     * The filename of the SQLite database used to persist [ResurrectionRequest]s.
     */
    protected open val resurrectionDatabaseName: String = DbHelper.RESURRECTION_DB_NAME

    private val job = Job() + Dispatchers.IO + CoroutineName("ResurrectorService")
    private val dbHelper: DbHelper by lazy { DbHelper(this, resurrectionDatabaseName) }

    private val mutex = Mutex()
    private var registeredRequests: Set<ResurrectionRequest>
        by guardWith(mutex, setOf())
    private var registeredRequestsByNotifiers: Map<StorageKey?, Set<ResurrectionRequest>>
        by guardWith(mutex, mapOf())

    override fun onCreate() {
        super.onCreate()

        CoroutineScope(job).loadRequests()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        ResurrectionRequest.createFromIntent(intent)?.let { CoroutineScope(job).registerRequest(it) }
        return super.onStartCommand(intent, flags, startId)
    }

    override fun onDestroy() {
        super.onDestroy()
        job.cancelChildren()
    }

    /**
     * Makes [Context.startService] or [Context.startActivity] calls to all clients who are
     * registered for the specified [events] (or are registered for *all* events).
     */
    protected fun resurrectClients(vararg events: StorageKey) = resurrectClients(events.toList())

    /**
     * Makes [Context.startService] or [Context.startActivity] calls to all clients who are
     * registered for the specified [events] (or are registered for *all* events).
     */
    protected fun resurrectClients(events: Collection<StorageKey>) {
        CoroutineScope(job).launch {
            val requests = mutableSetOf<ResurrectionRequest>()
            mutex.withLock {
                events.forEach { event ->
                    registeredRequestsByNotifiers[event]?.let { requests.addAll(it) }
                }
                registeredRequestsByNotifiers[null]?.let { requests.addAll(it) }
            }

            withContext(Dispatchers.Main) {
                requests.forEach { it.issueResurrection(events) }
            }
        }
    }

    private fun CoroutineScope.loadRequests() = launch {
        val byNotifiers = mutableMapOf<StorageKey?, MutableSet<ResurrectionRequest>>()

        val registrations = async { dbHelper.getRegistrations() }.await()

        mutex.withLock {
            registeredRequests = registrations.toSet().onEach { req ->
                req.notifyOn.forEach {
                    val list = byNotifiers[it] ?: mutableSetOf()
                    list.add(req)
                    byNotifiers[it] = list
                }
                if (req.notifyOn.isEmpty()) {
                    val list = byNotifiers[null] ?: mutableSetOf()
                    list.add(req)
                    byNotifiers[null] = list
                }
            }
            registeredRequestsByNotifiers = byNotifiers
        }
    }

    private fun CoroutineScope.registerRequest(request: ResurrectionRequest) = launch {
        dbHelper.registerRequest(request)

        mutex.withLock {
            registeredRequests = registeredRequests + request
            registeredRequestsByNotifiers = registeredRequestsByNotifiers.toMutableMap().apply {
                request.notifyOn.forEach {
                    val list = this[it]?.toMutableSet() ?: mutableSetOf()
                    list.add(request)
                    this[it] = list
                }
                if (request.notifyOn.isEmpty()) {
                    val list = this[null]?.toMutableSet() ?: mutableSetOf()
                    list.add(request)
                    this[null] = list
                }
            }
        }
    }

    private fun CoroutineScope.unregisterRequest(componentName: ComponentName) = launch {
        dbHelper.unregisterRequest(componentName)

        loadRequests()
    }

    private fun ResurrectionRequest.issueResurrection(events: Collection<StorageKey>) {
        val intent = Intent()
        intent.component = this.componentName
        intent.action = this.intentAction

        this.intentExtras?.let { intent.putExtras(Bundle(it)) }

        intent.putStringArrayListExtra(
            ResurrectionRequest.EXTRA_RESURRECT_NOTIFIER,
            ArrayList(events.toSet().map(StorageKey::toString))
        )

        when (this.componentType) {
            ResurrectionRequest.ComponentType.Activity -> startActivity(intent)
            ResurrectionRequest.ComponentType.Service -> startService(intent)
        }
    }
}

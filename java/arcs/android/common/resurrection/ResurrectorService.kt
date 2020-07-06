/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.common.resurrection

import android.app.Service
import android.content.Intent
import android.os.Bundle
import androidx.annotation.VisibleForTesting
import arcs.android.common.resurrection.ResurrectionRequest.UnregisterRequest
import arcs.core.storage.StorageKey
import arcs.core.util.guardedBy
import arcs.jvm.util.JvmDispatchers
import java.io.PrintWriter
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Extension point for [Service]s which wish to be capable of resurrecting their clients.
 */
abstract class ResurrectorService : Service() {
    /**
     * The filename of the SQLite database used to persist [ResurrectionRequest]s.
     */
    protected open val resurrectionDatabaseName: String = DbHelper.RESURRECTION_DB_NAME

    protected open val job =
        Job() + JvmDispatchers.IO + CoroutineName("ResurrectorService")

    private val dbHelper: DbHelper by lazy { DbHelper(this, resurrectionDatabaseName) }

    private val mutex = Mutex()
    private var registeredRequests: Set<ResurrectionRequest>
        by guardedBy(mutex, setOf())
    private var registeredRequestsByNotifiers: Map<StorageKey?, Set<ResurrectionRequest>>
        by guardedBy(mutex, mapOf())
    @VisibleForTesting var loadJob: Job? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.action?.takeIf { it == ACTION_RESET_REGISTRATIONS }?.let {
            loadJob = CoroutineScope(job).resetRequests()
        } ?: ResurrectionRequest.createFromIntent(intent)?.let {
            loadJob = CoroutineScope(job).registerRequest(it)
        } ?: ResurrectionRequest.unregisterRequestFromUnrequestIntent(intent)?.let {
            loadJob = CoroutineScope(job).unregisterRequest(it)
        } ?: {
            loadJob = CoroutineScope(job).launch {
                val needToLoad = mutex.withLock { registeredRequests.isEmpty() }
                if (needToLoad) loadRequests()
            }
        }()

        return super.onStartCommand(intent, flags, startId)
    }

    override fun onDestroy() {
        super.onDestroy()
        dbHelper.close()
        job.cancelChildren()
    }

    /**
     * Makes [Context.startService] or [Context.startActivity] calls to all clients who are
     * registered for the specified [events] (or are registered for *all* events).
     */
    @VisibleForTesting(otherwise = VisibleForTesting.PROTECTED)
    suspend fun resurrectClients(vararg storageKeys: StorageKey) =
        resurrectClients(storageKeys.toList())

    /**
     * Makes [Context.startService] or [Context.startActivity] calls to all clients who are
     * registered for the specified [events] (or are registered for *all* events).
     */
    @VisibleForTesting(otherwise = VisibleForTesting.PROTECTED)
    suspend fun resurrectClients(storageKeys: Collection<StorageKey>) {
        loadJob?.join()

        val requests = mutableSetOf<ResurrectionRequest>()
        mutex.withLock {
            storageKeys.forEach { event ->
                registeredRequestsByNotifiers[event]?.let { requests.addAll(it) }
            }
            registeredRequestsByNotifiers[null]?.let { requests.addAll(it) }
        }

        requests.forEach { it.issueResurrection(storageKeys) }
    }

    /**
     * Utility to call within the implementing-service's [Service.dump], which will include
     * current registration requests.
     */
    @VisibleForTesting(otherwise = VisibleForTesting.PROTECTED)
    fun dumpRegistrations(writer: PrintWriter) {
        val registeredRequests = runBlocking {
            loadJob?.join()
            mutex.withLock { this@ResurrectorService.registeredRequests.toList() }
        }

        writer.println(
            """
                Resurrection Requests
                ---------------------
            """.trimIndent()
        )

        val requests = StringBuilder().apply {
            append("[")
            var isFirst = true
            registeredRequests.forEach {
                if (!isFirst) {
                    append(",\n")
                } else {
                    append("\n")
                }
                append("  ${it.componentName} [${it.componentType.name}]: [\n")
                append(
                    it.notifyOn.joinToString(separator = ",\n", postfix = "\n") {
                        "    $it"
                    }
                )
                append("  ]")
                isFirst = false
            }
            append("\n]")
        }

        writer.println(requests)
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
        loadRequests().join()
    }

    private fun CoroutineScope.unregisterRequest(unregisterRequest: UnregisterRequest) = launch {
        dbHelper.unregisterRequest(unregisterRequest.componentName, unregisterRequest.targetId)
        loadRequests().join()
    }

    private fun CoroutineScope.resetRequests() = launch {
        dbHelper.reset()
        mutex.withLock {
            registeredRequests = emptySet()
            registeredRequestsByNotifiers = emptyMap()
        }
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

        intent.putExtra(ResurrectionRequest.EXTRA_REGISTRATION_TARGET_ID, this.targetId)

        when (this.componentType) {
            ResurrectionRequest.ComponentType.Activity -> startActivity(intent)
            ResurrectionRequest.ComponentType.Service -> startService(intent)
        }
    }

    companion object {
        const val ACTION_RESET_REGISTRATIONS =
            "arcs.android.common.resurrection.ACTION_RESET_REGISTRATIONS"
    }
}

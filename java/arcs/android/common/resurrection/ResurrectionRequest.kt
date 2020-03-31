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

import android.app.Activity
import android.app.Service
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.PersistableBundle
import androidx.annotation.VisibleForTesting
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser

/**
 * Represents a request to the [ResurrectorService] from a client which wishes to be resurrected
 * when certain events occur to selected [StorageKey]s (see: [notifyOn]).
 */
data class ResurrectionRequest(
    val componentName: ComponentName,
    val componentType: ComponentType,
    val intentAction: String?,
    val intentExtras: PersistableBundle?,
    /**
     * [StorageKey]s the requesting component is interested in being resurrected in response to
     * changes.
     *
     * If empty, the client requests resurrection for *any* change to *any* [StorageKey]-identified
     * data.
     */
    val notifyOn: List<StorageKey> = emptyList(),
    /**
     * Used to associate [notifierId] with a set of [StorageKeys] and is sent back to listeners
     * on resurrection along with the keys.
     */
    val notifierId: String
) {
    /**
     * Populates an [intent] with actions/extras needed to make a request to the
     * [ResurrectorService] for future resurrection.
     */
    fun populateRequestIntent(intent: Intent) {
        intent.apply {
            action = ACTION_REQUEST_RESURRECTION
            putExtra(EXTRA_REGISTRATION_PACKAGE_NAME, componentName.packageName)
            putExtra(EXTRA_REGISTRATION_CLASS_NAME, componentName.className)
            putExtra(EXTRA_REGISTRATION_COMPONENT_TYPE, componentType.name)
            intentAction?.let { putExtra(EXTRA_REGISTRATION_ACTION, it) }
            intentExtras?.let { putExtra(EXTRA_REGISTRATION_EXTRAS, it) }
            putStringArrayListExtra(
                EXTRA_REGISTRATION_NOTIFIERS,
                ArrayList(notifyOn.map(StorageKey::toString))
            )
            putExtra(EXTRA_REGISTRATION_NOTIFIER_ID, notifierId)
        }
    }

    /**
     * Populates an [intent] with actions/extras needed to unsubscribe for resurrection.
     */
    fun populateUnrequestIntent(intent: Intent) {
        intent.apply {
            action = ACTION_REQUEST_NO_RESURRECTION
            putExtra(EXTRA_REGISTRATION_PACKAGE_NAME, componentName.packageName)
            putExtra(EXTRA_REGISTRATION_CLASS_NAME, componentName.className)
            putExtra(EXTRA_REGISTRATION_NOTIFIER_ID, notifierId)
        }
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as ResurrectionRequest

        if (componentName != other.componentName) return false
        if (componentType != other.componentType) return false
        if (intentAction != other.intentAction) return false

        val myExtras = intentExtras ?: PersistableBundle()
        val theirExtras = other.intentExtras ?: PersistableBundle()

        if (myExtras.size() != theirExtras.size()) return false
        if (myExtras.keySet().any { myExtras.get(it) != theirExtras.get(it) }) return false

        if (notifyOn.toSet() != other.notifyOn.toSet()) return false

        return true
    }

    override fun hashCode(): Int {
        var result = componentName.hashCode()
        result = 31 * result + componentType.hashCode()
        result = 31 * result + (intentAction?.hashCode() ?: 0)
        result = 31 * result + (intentExtras?.hashCode() ?: 0)
        result = 31 * result + notifyOn.hashCode()
        return result
    }

    override fun toString(): String =
        "ResurrectionRequest(" +
            "componentName=$componentName, componentType=$componentType, " +
            "intentAction=$intentAction, intentExtras=${intentExtras?.keySet()?.toSet()}, " +
            "notifyOn=$notifyOn notifierId=$notifierId)"

    /**
     * Type of client requesting resurrection.
     *
     * Depending on the [ComponentType], different launch mechanisms are used.
     */
    enum class ComponentType {
        Service,
        Activity,
    }

    data class UnregisterRequest(val componentName: ComponentName, val notifierId: String)

    companion object {
        const val ACTION_RESURRECT = "arcs.android.common.resurrection.TIME_TO_WAKEUP"
        const val EXTRA_RESURRECT_NOTIFIER = "arcs.android.common.resurrection.RESURRECT_NOTIFIER"

        const val ACTION_REQUEST_RESURRECTION = "arcs.android.common.resurrection.REQUEST"
        const val ACTION_REQUEST_NO_RESURRECTION = "arcs.android.common.resurrection.UNREQUEST"
        const val EXTRA_REGISTRATION_PACKAGE_NAME = "registration_intent_package_name"
        const val EXTRA_REGISTRATION_CLASS_NAME = "registration_intent_class_name"
        const val EXTRA_REGISTRATION_COMPONENT_TYPE = "registration_intent_component_type"
        const val EXTRA_REGISTRATION_ACTION = "registration_intent_action"
        const val EXTRA_REGISTRATION_EXTRAS = "registration_intent_extras"
        const val EXTRA_REGISTRATION_NOTIFIER_ID = "registration_notifier_id"
        const val EXTRA_REGISTRATION_NOTIFIERS = "registration_notifiers"

        /**
         * Creates a [ResurrectionRequest] for the component defined by the given [context] when the
         * events listed in [resurrectOn] occur.
         */
        fun createDefault(
            context: Context,
            resurrectOn: List<StorageKey>,
            notifierId: String
        ): ResurrectionRequest {
            return ResurrectionRequest(
                ComponentName(context, context::class.java),
                when (context) {
                    is Service -> ComponentType.Service
                    is Activity -> ComponentType.Activity
                    else -> ComponentType.Service
                },
                ACTION_RESURRECT,
                null,
                resurrectOn,
                notifierId
            )
        }

        /**
         * Given an [intent] received by the [ResurrectorService] from a client, extract a
         * [ResurrectionRequest] from its extras.
         */
        @VisibleForTesting(otherwise = VisibleForTesting.PACKAGE_PRIVATE)
        fun createFromIntent(requestIntent: Intent?): ResurrectionRequest? {
            if (requestIntent?.action?.startsWith(ACTION_REQUEST_RESURRECTION) != true) return null
            val extras = requestIntent.extras ?: return null

            val packageName = extras.getString(EXTRA_REGISTRATION_PACKAGE_NAME) ?: return null
            val className = extras.getString(EXTRA_REGISTRATION_CLASS_NAME) ?: return null
            val componentTypeName = extras.getString(EXTRA_REGISTRATION_COMPONENT_TYPE)
                ?: return null
            val notifiers = extras.getStringArrayList(EXTRA_REGISTRATION_NOTIFIERS)
                ?.map { StorageKeyParser.parse(it) } ?: emptyList()
            val notifierId = extras.getString(EXTRA_REGISTRATION_NOTIFIER_ID) ?: return null

            val componentType = try {
                ComponentType.valueOf(componentTypeName)
            } catch (e: IllegalArgumentException) { return null }

            return ResurrectionRequest(
                ComponentName(packageName, className),
                componentType,
                extras.getString(EXTRA_REGISTRATION_ACTION),
                extras.getParcelable(EXTRA_REGISTRATION_EXTRAS),
                notifiers,
                notifierId
            )
        }

        /**
         * Given an [intent] received by the [ResurrectorService] from a client, if it's a request
         * to unsubscribe from resurrection - gets the component name of the component wishing to
         * unsubscribe.
         */
        @VisibleForTesting(otherwise = VisibleForTesting.PACKAGE_PRIVATE)
        fun unregisterRequestFromUnrequestIntent(intent: Intent?): UnregisterRequest? {
            if (intent?.action?.startsWith(ACTION_REQUEST_NO_RESURRECTION) != true) return null
            val extras = intent.extras ?: return null
            val packageName = extras.getString(EXTRA_REGISTRATION_PACKAGE_NAME) ?: return null
            val className = extras.getString(EXTRA_REGISTRATION_CLASS_NAME) ?: return null
            val notifierId = extras.getString(EXTRA_REGISTRATION_NOTIFIER_ID) ?: return null

            return UnregisterRequest(ComponentName(packageName, className), notifierId)
        }
    }
}

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
import android.content.ContextWrapper
import android.content.Intent
import android.os.PersistableBundle
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
    val notifyOn: List<StorageKey> = emptyList()
) {
    /**
     * Populates an [intent] with actions/extras needed to make a request to the
     * [ResurrectorService] for future resurrection.
     */
    internal fun populateRequestIntent(intent: Intent) {
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
        }
    }

    /**
     * Type of client requesting resurrection.
     *
     * Depending on the [ComponentType], different launch mechanisms are used.
     */
    enum class ComponentType {
        Service,
        Activity,
    }

    companion object {
        const val ACTION_RESURRECT = "arcs.android.common.resurrection.TIME_TO_WAKEUP"
        const val EXTRA_RESURRECT_NOTIFIER = "arcs.android.common.resurrection.RESURRECT_NOTIFIER"

        private const val ACTION_REQUEST_RESURRECTION = "arcs.android.common.resurrection.REQUEST"
        private const val EXTRA_REGISTRATION_PACKAGE_NAME = "registration_intent_package_name"
        private const val EXTRA_REGISTRATION_CLASS_NAME = "registration_intent_class_name"
        private const val EXTRA_REGISTRATION_COMPONENT_TYPE = "registration_intent_component_type"
        private const val EXTRA_REGISTRATION_ACTION = "registration_intent_action"
        private const val EXTRA_REGISTRATION_EXTRAS = "registration_intent_extras"
        private const val EXTRA_REGISTRATION_NOTIFIERS = "registration_notifiers"

        /**
         * Creates a [ResurrectionRequest] for the component defined by the given [context] when the
         * events listed in [resurrectOn] occur.
         */
        internal fun createDefault(
            context: Context,
            resurrectOn: List<StorageKey>
        ): ResurrectionRequest {
            return ResurrectionRequest(
                ComponentName(context, context::class.java),
                when ((context as? ContextWrapper)?.baseContext ?: context) {
                    is Service -> ComponentType.Service
                    is Activity -> ComponentType.Activity
                    else -> ComponentType.Service
                },
                ACTION_RESURRECT,
                null,
                resurrectOn
            )
        }

        /**
         * Given an [intent] received by the [ResurrectorService] from a client, extract a
         * [ResurrectionRequest] from its extras.
         */
        internal fun createFromIntent(requestIntent: Intent?): ResurrectionRequest? {
            if (requestIntent?.action?.startsWith(ACTION_REQUEST_RESURRECTION) != true) return null
            val extras = requestIntent.extras ?: return null

            val packageName = extras.getString(EXTRA_REGISTRATION_PACKAGE_NAME) ?: return null
            val className = extras.getString(EXTRA_REGISTRATION_CLASS_NAME) ?: return null
            val componentType = extras.getString(EXTRA_REGISTRATION_COMPONENT_TYPE) ?: return null
            val notifiers = extras.getStringArrayList(EXTRA_REGISTRATION_NOTIFIERS)
                ?.map { StorageKeyParser.parse(it) } ?: emptyList()

            return ResurrectionRequest(
                ComponentName(packageName, className),
                ComponentType.valueOf(
                    componentType
                ),
                extras.getString(EXTRA_REGISTRATION_ACTION),
                extras.getParcelable(EXTRA_REGISTRATION_EXTRAS),
                notifiers
            )
        }
    }
}

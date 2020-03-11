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

import android.content.ComponentName
import android.content.Intent
import android.os.PersistableBundle
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.rule.ActivityTestRule
import arcs.core.storage.StorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.testutil.fail
import com.google.common.truth.Truth.assertThat
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ResurrectionRequestTest {
    @get:Rule
    val activity = ActivityTestRule(ClientActivity::class.java)

    @Test
    fun createDefault() {
        val request = ResurrectionRequest.createDefault(activity.activity, emptyList())

        assertThat(request.componentName).isEqualTo(activity.activity.componentName)
        assertThat(request.componentType).isEqualTo(ResurrectionRequest.ComponentType.Activity)
        assertThat(request.intentAction).isEqualTo(ResurrectionRequest.ACTION_RESURRECT)
        assertThat(request.intentExtras).isNull()
        assertThat(request.notifyOn).isEmpty()
    }

    @Test
    fun createFromIntent() {
        val bundle = PersistableBundle().apply {
            putBoolean("foo", true)
            putString("bar", "hello")
        }
        val keys = listOf(
            RamDiskStorageKey("blah"),
            RamDiskStorageKey("bleh")
        )
        val intent = Intent().apply {
            action = ResurrectionRequest.ACTION_REQUEST_RESURRECTION
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_PACKAGE_NAME, "com.google.test")
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_CLASS_NAME, "MyService")
            putExtra(
                ResurrectionRequest.EXTRA_REGISTRATION_COMPONENT_TYPE,
                ResurrectionRequest.ComponentType.Service.name
            )
            putExtra(
                ResurrectionRequest.EXTRA_REGISTRATION_NOTIFIERS,
                ArrayList(keys.map(StorageKey::toString))
            )

            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_ACTION, "StartMePlz")
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_EXTRAS, bundle)
        }

        val actual = ResurrectionRequest.createFromIntent(intent) ?: fail("Expected a request")

        assertThat(actual.componentName).isEqualTo(ComponentName("com.google.test", "MyService"))
        assertThat(actual.componentType).isEqualTo(ResurrectionRequest.ComponentType.Service)
        assertThat(actual.intentAction).isEqualTo("StartMePlz")
        assertThat(actual.intentExtras?.getBoolean("foo")).isTrue()
        assertThat(actual.intentExtras?.getString("bar")).isEqualTo("hello")
        assertThat(actual.notifyOn).containsExactlyElementsIn(keys)
    }

    @Test
    fun roundtrip_fromRequest_toIntent_toRequest() {
        val keys = listOf(
            RamDiskStorageKey("blah"),
            RamDiskStorageKey("bleh")
        )
        val request = ResurrectionRequest.createDefault(activity.activity, keys)
        val intent = Intent().also(request::populateRequestIntent)
        val actual = ResurrectionRequest.createFromIntent(intent)

        assertThat(actual).isEqualTo(request)
    }

    @Test
    fun createFromIntent_returnsNull_ifActionIsInvalid() {
        val intent = Intent().apply { action = "IncorrectAction" }
        assertThat(ResurrectionRequest.createFromIntent(intent)).isNull()
    }

    @Test
    fun createFromIntent_returnsNull_ifNoExtras() {
        val intent = Intent().apply {
            action = ResurrectionRequest.ACTION_REQUEST_RESURRECTION
            // no extras
        }
        assertThat(ResurrectionRequest.createFromIntent(intent)).isNull()
    }

    @Test
    fun createFromIntent_returnsNull_ifNoPackageName() {
        val intent = Intent().apply {
            action = ResurrectionRequest.ACTION_REQUEST_RESURRECTION
            // Don't include the package name in this one.
            // putExtra(ResurrectionRequest.EXTRA_REGISTRATION_PACKAGE_NAME, "com.google.test")
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_CLASS_NAME, "MyService")
            putExtra(
                ResurrectionRequest.EXTRA_REGISTRATION_COMPONENT_TYPE,
                ResurrectionRequest.ComponentType.Service.name
            )
        }
        assertThat(ResurrectionRequest.createFromIntent(intent)).isNull()
    }

    @Test
    fun createFromIntent_returnsNull_ifNoClassName() {
        val intent = Intent().apply {
            action = ResurrectionRequest.ACTION_REQUEST_RESURRECTION
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_PACKAGE_NAME, "com.google.test")
            // Don't include the class name in this one.
            // putExtra(ResurrectionRequest.EXTRA_REGISTRATION_CLASS_NAME, "MyService")
            putExtra(
                ResurrectionRequest.EXTRA_REGISTRATION_COMPONENT_TYPE,
                ResurrectionRequest.ComponentType.Service.name
            )
        }
        assertThat(ResurrectionRequest.createFromIntent(intent)).isNull()
    }

    @Test
    fun createFromIntent_returnsNull_ifNoComponentType() {
        val intent = Intent().apply {
            action = ResurrectionRequest.ACTION_REQUEST_RESURRECTION
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_PACKAGE_NAME, "com.google.test")
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_CLASS_NAME, "MyService")
            // Don't include the component type in this one.
            // putExtra(
            //     ResurrectionRequest.EXTRA_REGISTRATION_COMPONENT_TYPE,
            //     ResurrectionRequest.ComponentType.Service.name
            // )
        }
        assertThat(ResurrectionRequest.createFromIntent(intent)).isNull()
    }

    @Test
    fun createFromIntent_returnsNull_ifInvalidComponentType() {
        val intent = Intent().apply {
            action = ResurrectionRequest.ACTION_REQUEST_RESURRECTION
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_PACKAGE_NAME, "com.google.test")
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_CLASS_NAME, "MyService")
            putExtra(
                ResurrectionRequest.EXTRA_REGISTRATION_COMPONENT_TYPE,
                "Not a component"
            )
        }
        assertThat(ResurrectionRequest.createFromIntent(intent)).isNull()
    }

    @Test
    fun componentNameFromUnrequestIntent_returnsNull_ifWrongAction() {
        val intent = Intent().apply {
            action = "Not what we were looking for"
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_PACKAGE_NAME, "com.google.test")
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_CLASS_NAME, "MyService")
        }
        assertThat(ResurrectionRequest.componentNameFromUnrequestIntent(intent)).isNull()
    }

    @Test
    fun componentNameFromUnrequestIntent_returnsNull_ifNoExtras() {
        val intent = Intent().apply {
            action = ResurrectionRequest.ACTION_REQUEST_NO_RESURRECTION
        }
        assertThat(ResurrectionRequest.componentNameFromUnrequestIntent(intent)).isNull()
    }

    @Test
    fun componentNameFromUnrequestIntent_returnsNull_ifMissingPackagename() {
        val intent = Intent().apply {
            action = ResurrectionRequest.ACTION_REQUEST_NO_RESURRECTION
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_CLASS_NAME, "MyService")
        }
        assertThat(ResurrectionRequest.componentNameFromUnrequestIntent(intent)).isNull()
    }

    @Test
    fun componentNameFromUnrequestIntent_returnsNull_ifMissingClassName() {
        val intent = Intent().apply {
            action = ResurrectionRequest.ACTION_REQUEST_NO_RESURRECTION
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_PACKAGE_NAME, "com.google.test")
        }
        assertThat(ResurrectionRequest.componentNameFromUnrequestIntent(intent)).isNull()
    }

    @Test
    fun componentNameFromUnrequestIntent() {
        val intent = Intent().apply {
            action = ResurrectionRequest.ACTION_REQUEST_NO_RESURRECTION
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_PACKAGE_NAME, "com.google.test")
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_CLASS_NAME, "MyService")
        }
        assertThat(ResurrectionRequest.componentNameFromUnrequestIntent(intent))
            .isEqualTo(ComponentName("com.google.test", "MyService"))
    }

    @Test
    fun populateRequestIntent() {
        val request = ResurrectionRequest.createDefault(activity.activity, emptyList())
        val intent = Intent()
        request.populateUnrequestIntent(intent)

        val componentName = ResurrectionRequest.componentNameFromUnrequestIntent(intent)

        assertThat(componentName).isEqualTo(request.componentName)
    }
}

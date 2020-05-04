package arcs.android.systemhealth.testapp

import android.app.Application
import androidx.work.Configuration
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.android.util.initLogForAndroid
import arcs.core.entity.SchemaRegistry
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk

/** Application class for Arcs System Health measures. */
class TestApplication : Application(), Configuration.Provider {

    override fun getWorkManagerConfiguration() =
        Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.DEBUG)
            .build()

    override fun onCreate() {
        super.onCreate()

        RamDisk.clear()
        SchemaRegistry.register(TestEntity)
        DriverAndKeyConfigurator.configure(AndroidSqliteDatabaseManager(this))

        initLogForAndroid()
    }
}

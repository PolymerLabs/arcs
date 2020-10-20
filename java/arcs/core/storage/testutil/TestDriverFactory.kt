package arcs.core.storage.testutil

import arcs.core.storage.FixedDriverFactory
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.VolatileDriverProviderFactory

val testDriverFactory = FixedDriverFactory(
  RamDiskDriverProvider(),
  VolatileDriverProviderFactory()
)

val testDatabaseDriverFactory = FixedDriverFactory(
  RamDiskDriverProvider(),
  VolatileDriverProviderFactory(),
  DatabaseDriverProvider
)

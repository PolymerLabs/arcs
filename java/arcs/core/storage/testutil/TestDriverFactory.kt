package arcs.core.storage.testutil

import arcs.core.storage.FixedDriverFactory
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.VolatileDriverProvider

val testDriverFactory = FixedDriverFactory(
  RamDiskDriverProvider(),
  VolatileDriverProvider()
)

val testDatabaseDriverFactory = FixedDriverFactory(
  RamDiskDriverProvider(),
  VolatileDriverProvider(),
  DatabaseDriverProvider
)

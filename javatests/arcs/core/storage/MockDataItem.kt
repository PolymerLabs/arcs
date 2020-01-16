package arcs.core.storage

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId

data class MockDataItem(override val id: ReferenceId) : Referencable

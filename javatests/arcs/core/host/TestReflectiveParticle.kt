package arcs.core.host

import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.entity.EntityBaseSpec
import arcs.sdk.BaseParticle
import arcs.sdk.EntityBase
import arcs.sdk.HandleHolderBase
import arcs.sdk.ReadCollectionHandle

open class TestReflectiveParticle(val spec: Plan.Particle?) : BaseParticle() {
    val schema = spec!!.handles.getValue("data").type.toSchema()
    override val handles = Handles(schema)

    class Handles(schema: Schema) : HandleHolderBase(
        "TestReflectiveParticle",
        mapOf(
            "data" to setOf(EntityBaseSpec(schema))
        )
    ) {
        val data: ReadCollectionHandle<EntityBase> by handles
    }
}

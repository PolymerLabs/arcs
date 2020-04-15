package arcs.core.host

import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.entity.EntityBaseSpec
import arcs.sdk.BaseParticle
import arcs.sdk.HandleHolderBase

class TestPlannedParticle(val spec: Plan.Particle) : BaseParticle() {
    val schema = spec.handles.getValue("data").type.toSchema()
    override val handles = Handles(schema)

    class Handles(val schema: Schema) : HandleHolderBase(
        "TestConstructedParticle",
        mapOf(
            (schema.name?.name ?: "anonymousSchema") to EntityBaseSpec(schema)
        )
    )
}

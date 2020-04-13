package arcs.core.host

import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.entity.EntityBaseSpec
import arcs.sdk.BaseParticle
import arcs.sdk.HandleHolderBase

fun build(spec: Plan.Particle): TestConstructedParticle {
    val schema = spec.handles["data"]!!.type.toSchema()
    return TestConstructedParticle(schema)
}

class TestConstructedParticle(val schema: Schema) : BaseParticle() {
    override val handles = Handles(schema)

    class Handles(val schema: Schema) : HandleHolderBase(
        "TestConstructedParticle",
        mapOf(
            (schema.name?.name ?: "anonymousSchema") to EntityBaseSpec(schema)
        )
    )
}

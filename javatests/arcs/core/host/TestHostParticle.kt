package arcs.core.host

import arcs.sdk.BaseParticle
import arcs.sdk.HandleHolderBase
import arcs.sdk.Particle

class TestHostParticle : BaseParticle() {
    override val handles: HandleHolder = object : HandleHolderBase(mutableMapOf(), mutableMapOf()) {
    }
}

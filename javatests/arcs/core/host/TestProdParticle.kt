package arcs.core.host

import arcs.sdk.BaseParticle
import arcs.sdk.HandleHolderBase

class TestProdParticle : BaseParticle() {
    override val handles: HandleHolder = HandleHolderBase("TestProdParticle", emptyMap())
}

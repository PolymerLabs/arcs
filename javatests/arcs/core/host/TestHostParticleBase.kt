package arcs.core.host

import arcs.sdk.Entity
import arcs.sdk.EntitySpec
import arcs.sdk.Handle
import arcs.sdk.HandleHolder
import arcs.sdk.Particle

open class TestHostHandleHolder(
    override val map: MutableMap<String, Handle> = mutableMapOf(),
    override val entitySpecs: MutableMap<String, EntitySpec<out Entity>> = mutableMapOf()
) : HandleHolder

open class TestHostParticleBase(override val handles: HandleHolder) : Particle

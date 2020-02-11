/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.sdk

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support references or optional field detection

import arcs.sdk.*
import arcs.core.data.RawEntity
import arcs.core.data.util.toReferencable

class GoldInternal1() : JvmEntity {

    override var internalId = ""

    var val_ = ""
        get() = field
        private set(_value) {
            field = _value
        }

    constructor(
        val_: String = ""
    ) : this() {
        this.val_ = val_
    }

    fun copy(
        val_: String = this.val_
    ) = GoldInternal1(
        val_ = val_
    )

    fun reset() {
        val_ = ""
    }

    override fun schemaHash() = "485712110d89359a3e539dac987329cd2649d889"

    override fun serialize() = RawEntity(
        "",
        mapOf(
            "val" to val_.toReferencable()
        )
    )
}

class GoldInternal1_Spec() : JvmEntitySpec<GoldInternal1> {

    override fun create() = GoldInternal1()

}

typealias Gold_Data_Ref = GoldInternal1
typealias Gold_Data_Ref_Spec = GoldInternal1_Spec
typealias Gold_Alias = GoldInternal1
typealias Gold_Alias_Spec = GoldInternal1_Spec

class Gold_Data() : JvmEntity {

    override var internalId = ""

    var num = 0.0
        get() = field
        private set(_value) {
            field = _value
        }
    var txt = ""
        get() = field
        private set(_value) {
            field = _value
        }
    var lnk = ""
        get() = field
        private set(_value) {
            field = _value
        }
    var flg = false
        get() = field
        private set(_value) {
            field = _value
        }

    constructor(
        num: Double = 0.0,
        txt: String = "",
        lnk: String = "",
        flg: Boolean = false
    ) : this() {
        this.num = num
        this.txt = txt
        this.lnk = lnk
        this.flg = flg
    }

    fun copy(
        num: Double = this.num,
        txt: String = this.txt,
        lnk: String = this.lnk,
        flg: Boolean = this.flg
    ) = Gold_Data(
        num = num,
        txt = txt,
        lnk = lnk,
        flg = flg
    )

    fun reset() {
        num = 0.0
        txt = ""
        lnk = ""
        flg = false
    }

    override fun schemaHash() = "d8058d336e472da47b289eafb39733f77eadb111"

    override fun serialize() = RawEntity(
        "",
        mapOf(
            "num" to num.toReferencable(),
            "txt" to txt.toReferencable(),
            "lnk" to lnk.toReferencable(),
            "flg" to flg.toReferencable()
        )
    )
}

class Gold_Data_Spec() : JvmEntitySpec<Gold_Data> {

    override fun create() = Gold_Data()

}


class GoldHandles(particle : BaseParticle) {
    val data: ReadableSingleton<Gold_Data> = SingletonImpl(particle, "data", Gold_Data_Spec())
    val alias: WritableSingleton<Gold_Alias> = SingletonImpl(particle, "alias", Gold_Alias_Spec())
}

abstract class AbstractGold : BaseParticle() {
    protected val handles: GoldHandles = GoldHandles(this)
}

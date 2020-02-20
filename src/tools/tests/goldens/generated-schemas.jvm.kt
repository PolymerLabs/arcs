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
import arcs.core.data.util.ReferencablePrimitive

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

    override fun toString() = "GoldInternal1(val_ = $val_)"
}

class GoldInternal1_Spec() : JvmEntitySpec<GoldInternal1> {

    override fun create() = GoldInternal1()

    override fun deserialize(data: RawEntity): GoldInternal1 {
      // TODO: only handles singletons for now
      return create().copy(
        val_ = (data.singletons["val_"] as? ReferencablePrimitive<String>?)?.value ?: ""
      )
    }

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

    override fun toString() = "Gold_Data(num = $num, txt = $txt, lnk = $lnk, flg = $flg)"
}

class Gold_Data_Spec() : JvmEntitySpec<Gold_Data> {

    override fun create() = Gold_Data()

    override fun deserialize(data: RawEntity): Gold_Data {
      // TODO: only handles singletons for now
      return create().copy(
        num = (data.singletons["num"] as? ReferencablePrimitive<Double>?)?.value ?: 0.0,
        txt = (data.singletons["txt"] as? ReferencablePrimitive<String>?)?.value ?: "",
        lnk = (data.singletons["lnk"] as? ReferencablePrimitive<String>?)?.value ?: "",
        flg = (data.singletons["flg"] as? ReferencablePrimitive<Boolean>?)?.value ?: false
      )
    }

}


class GoldHandles(
    particle : BaseParticle
) : HandleHolderBase(
        mutableMapOf(),
        mapOf(
            "data" to Gold_Data_Spec(),
            "alias" to Gold_Alias_Spec()
        )
    ) {
    val data: ReadableSingleton<Gold_Data> by map
    val alias: WritableSingleton<Gold_Alias> by map
}

abstract class AbstractGold : BaseParticle() {
    override val handles: GoldHandles = GoldHandles(this)
}

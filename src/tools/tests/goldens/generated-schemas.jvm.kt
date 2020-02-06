/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.sdk

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support references or optional field detection

import arcs.sdk.*


class GoldInternal1() : Entity {

    override var internalId = ""

    var val_ = ""
        get() = field
        private set(value) {
            val_ = value        }

    constructor(
        val_: String
    ) : this() {
        this.val_ = val_
    }

    fun copy(
        val_: String = this.val_
    ) : GoldInternal1 {
      return GoldInternal1(
          val_ = val_
      )
    }

    fun reset() {
        val_ = ""
    }

    override fun schemaHash() = "485712110d89359a3e539dac987329cd2649d889"

}

class GoldInternal1_Spec() : EntitySpec<GoldInternal1> {

    override fun create() = GoldInternal1()

}

typealias Gold_Data_Ref = GoldInternal1
typealias Gold_Data_Ref_Spec = GoldInternal1_Spec
typealias Gold_Alias = GoldInternal1
typealias Gold_Alias_Spec = GoldInternal1_Spec

class Gold_Data() : Entity {

    override var internalId = ""

    var num = 0.0
        get() = field
        private set(value) {
            num = value        }
    var txt = ""
        get() = field
        private set(value) {
            txt = value        }
    var lnk = ""
        get() = field
        private set(value) {
            lnk = value        }
    var flg = false
        get() = field
        private set(value) {
            flg = value        }

    constructor(
        num: Double,
        txt: String,
        lnk: String,
        flg: Boolean
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
    ) : Gold_Data {
      return Gold_Data(
          num = num,
          txt = txt,
          lnk = lnk,
          flg = flg
      )
    }

    fun reset() {
        num = 0.0
        txt = ""
        lnk = ""
        flg = false
    }

    override fun schemaHash() = "d8058d336e472da47b289eafb39733f77eadb111"

}

class Gold_Data_Spec() : EntitySpec<Gold_Data> {

    override fun create() = Gold_Data()

}


abstract class AbstractGold : BaseParticle() {
    protected val data: ReadableSingleton<Gold_Data> = SingletonImpl(this, "data", Gold_Data_Spec())
    protected val alias: WritableSingleton<Gold_Alias> = SingletonImpl(this, "alias", Gold_Alias_Spec())
}

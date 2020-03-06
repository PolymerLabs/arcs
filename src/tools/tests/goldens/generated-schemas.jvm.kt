/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.sdk

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support references or optional field detection

import arcs.sdk.*
import arcs.sdk.Entity
import arcs.core.data.*
import arcs.core.data.util.toReferencable
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.storage.api.toPrimitiveValue

class GoldInternal1() : Entity {

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

    override fun equals(other: Any?): Boolean {
      if (this === other) {
        return true
      }

      if (other is GoldInternal1) {
        if (internalId != "") {
          return internalId == other.internalId
        }
        return toString() == other.toString()
      }
      return false;
    }

    override fun hashCode(): Int =
      if (internalId != "") internalId.hashCode() else toString().hashCode()

    override fun schemaHash() = "485712110d89359a3e539dac987329cd2649d889"

    override fun serialize() = RawEntity(
        internalId,
        mapOf(
            "val" to val_.toReferencable()
        )
    )

    override fun toString() = "GoldInternal1(val_ = $val_)"
}

class GoldInternal1_Spec() : EntitySpec<GoldInternal1> {

    companion object {
        val schema = Schema(
            listOf(),
            SchemaFields(
                singletons = mapOf("val" to FieldType.Text),
                collections = emptyMap()
            ),
            "485712110d89359a3e539dac987329cd2649d889"
        )

        init {
            SchemaRegistry.register(schema)
        }
    }

    override fun schema() = schema

    override fun create() = GoldInternal1()

    override fun deserialize(data: RawEntity): GoldInternal1 {
      // TODO: only handles singletons for now
      val rtn = create().copy(
        val_ = data.singletons["val_"].toPrimitiveValue(String::class, "")
      )
      rtn.internalId = data.id
      return rtn
    }

}

typealias Gold_Data_Ref = GoldInternal1
typealias Gold_Data_Ref_Spec = GoldInternal1_Spec
typealias Gold_Alias = GoldInternal1
typealias Gold_Alias_Spec = GoldInternal1_Spec

class Gold_Data() : Entity {

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

    override fun equals(other: Any?): Boolean {
      if (this === other) {
        return true
      }

      if (other is Gold_Data) {
        if (internalId != "") {
          return internalId == other.internalId
        }
        return toString() == other.toString()
      }
      return false;
    }

    override fun hashCode(): Int =
      if (internalId != "") internalId.hashCode() else toString().hashCode()

    override fun schemaHash() = "d8058d336e472da47b289eafb39733f77eadb111"

    override fun serialize() = RawEntity(
        internalId,
        mapOf(
            "num" to num.toReferencable(),
            "txt" to txt.toReferencable(),
            "lnk" to lnk.toReferencable(),
            "flg" to flg.toReferencable()
        )
    )

    override fun toString() = "Gold_Data(num = $num, txt = $txt, lnk = $lnk, flg = $flg)"
}

class Gold_Data_Spec() : EntitySpec<Gold_Data> {

    companion object {
        val schema = Schema(
            listOf(),
            SchemaFields(
                singletons = mapOf("num" to FieldType.Number, "txt" to FieldType.Text, "lnk" to FieldType.Text, "flg" to FieldType.Boolean),
                collections = emptyMap()
            ),
            "d8058d336e472da47b289eafb39733f77eadb111"
        )

        init {
            SchemaRegistry.register(schema)
        }
    }

    override fun schema() = schema

    override fun create() = Gold_Data()

    override fun deserialize(data: RawEntity): Gold_Data {
      // TODO: only handles singletons for now
      val rtn = create().copy(
        num = data.singletons["num"].toPrimitiveValue(Double::class, 0.0),
        txt = data.singletons["txt"].toPrimitiveValue(String::class, ""),
        lnk = data.singletons["lnk"].toPrimitiveValue(String::class, ""),
        flg = data.singletons["flg"].toPrimitiveValue(Boolean::class, false)
      )
      rtn.internalId = data.id
      return rtn
    }

}


class GoldHandles : HandleHolderBase(
    "Gold",
    mapOf(
        "data" to Gold_Data_Spec(),
        "alias" to Gold_Alias_Spec()
    )
) {
    val data: ReadSingletonHandle<Gold_Data> by handles
    val alias: WriteSingletonHandle<Gold_Alias> by handles
}

abstract class AbstractGold : BaseParticle() {
    override val handles: GoldHandles = GoldHandles()
}

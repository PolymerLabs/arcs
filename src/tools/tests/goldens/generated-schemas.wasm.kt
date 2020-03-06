/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.sdk

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support references or optional field detection

import arcs.sdk.*
import arcs.sdk.wasm.*

class GoldInternal1() : WasmEntity {

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

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        val_.let { encoder.encode("val:T", val_) }
        return encoder.toNullTermByteArray()
    }

    override fun toString() = "GoldInternal1(val_ = $val_)"
}

class GoldInternal1_Spec() : WasmEntitySpec<GoldInternal1> {

    override fun create() = GoldInternal1()


    override fun decode(encoded: ByteArray): GoldInternal1? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        val internalId = decoder.decodeText()
        decoder.validate("|")

        var val_ = ""
        var i = 0
        while (i < 1 && !decoder.done()) {
            val _name = decoder.upTo(':').toUtf8String()
            when (_name) {
                "val" -> {
                    decoder.validate("T")
                    val_ = decoder.decodeText()
                }
                else -> {
                    // Ignore unknown fields until type slicing is fully implemented.
                    when (decoder.chomp(1).toUtf8String()) {
                        "T", "U" -> decoder.decodeText()
                        "N" -> decoder.decodeNum()
                        "B" -> decoder.decodeBool()
                    }
                    i--
                }
            }
            decoder.validate("|")
            i++
        }
        val _rtn = create().copy(
            val_ = val_
        )
        _rtn.internalId = internalId
        return _rtn
    }
}

typealias Gold_Data_Ref = GoldInternal1
typealias Gold_Data_Ref_Spec = GoldInternal1_Spec
typealias Gold_Alias = GoldInternal1
typealias Gold_Alias_Spec = GoldInternal1_Spec

class Gold_Data() : WasmEntity {

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

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        num.let { encoder.encode("num:N", num) }
        txt.let { encoder.encode("txt:T", txt) }
        lnk.let { encoder.encode("lnk:U", lnk) }
        flg.let { encoder.encode("flg:B", flg) }
        return encoder.toNullTermByteArray()
    }

    override fun toString() = "Gold_Data(num = $num, txt = $txt, lnk = $lnk, flg = $flg)"
}

class Gold_Data_Spec() : WasmEntitySpec<Gold_Data> {

    override fun create() = Gold_Data()


    override fun decode(encoded: ByteArray): Gold_Data? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        val internalId = decoder.decodeText()
        decoder.validate("|")

        var num = 0.0
        var txt = ""
        var lnk = ""
        var flg = false
        var i = 0
        while (i < 5 && !decoder.done()) {
            val _name = decoder.upTo(':').toUtf8String()
            when (_name) {
                "num" -> {
                    decoder.validate("N")
                    num = decoder.decodeNum()
                }
                "txt" -> {
                    decoder.validate("T")
                    txt = decoder.decodeText()
                }
                "lnk" -> {
                    decoder.validate("U")
                    lnk = decoder.decodeText()
                }
                "flg" -> {
                    decoder.validate("B")
                    flg = decoder.decodeBool()
                }
                else -> {
                    // Ignore unknown fields until type slicing is fully implemented.
                    when (decoder.chomp(1).toUtf8String()) {
                        "T", "U" -> decoder.decodeText()
                        "N" -> decoder.decodeNum()
                        "B" -> decoder.decodeBool()
                    }
                    i--
                }
            }
            decoder.validate("|")
            i++
        }
        val _rtn = create().copy(
            num = num,
            txt = txt,
            lnk = lnk,
            flg = flg
        )
        _rtn.internalId = internalId
        return _rtn
    }
}


class GoldHandles(
    particle: WasmParticleImpl
) {
    val data: WasmSingletonImpl<Gold_Data> = WasmSingletonImpl(particle, "data", Gold_Data_Spec())
    val alias: WasmSingletonImpl<Gold_Alias> = WasmSingletonImpl(particle, "alias", Gold_Alias_Spec())
}

abstract class AbstractGold : WasmParticleImpl() {
    val handles: GoldHandles = GoldHandles(this)
}

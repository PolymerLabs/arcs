/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.sdk

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support references or optional field detection

import arcs.sdk.*
import arcs.sdk.wasm.*

class GoldInternal1(val_: String = "") : WasmEntity {

    override var internalId = ""

    var val_ = val_
        get() = field
        private set(_value) {
            field = _value
        }

    fun copy(val_: String = this.val_) = GoldInternal1(val_ = val_)

    fun reset() {
        val_ = ""
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) {
            return true
        }

        if (other is GoldInternal1) {
            if (internalId.isNotEmpty()) {
                return internalId == other.internalId
            }
            return toString() == other.toString()
       }
        return false;
    }

    override fun hashCode(): Int =
        if (internalId.isNotEmpty()) internalId.hashCode() else toString().hashCode()

    override fun schemaHash() = "485712110d89359a3e539dac987329cd2649d889"

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        val_.let { encoder.encode("val:T", val_) }
        return encoder.toNullTermByteArray()
    }

    override fun toString() =
      "GoldInternal1(val_ = $val_)"
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

class Gold_QCollection(
    name: String = "",
    age: Double = 0.0,
    lastCall: Double = 0.0,
    address: String = "",
    favoriteColor: String = "",
    birthDayMonth: Double = 0.0,
    birthDayDOM: Double = 0.0
) : WasmEntity {

    override var internalId = ""

    var name = name
        get() = field
        private set(_value) {
            field = _value
        }
    var age = age
        get() = field
        private set(_value) {
            field = _value
        }
    var lastCall = lastCall
        get() = field
        private set(_value) {
            field = _value
        }
    var address = address
        get() = field
        private set(_value) {
            field = _value
        }
    var favoriteColor = favoriteColor
        get() = field
        private set(_value) {
            field = _value
        }
    var birthDayMonth = birthDayMonth
        get() = field
        private set(_value) {
            field = _value
        }
    var birthDayDOM = birthDayDOM
        get() = field
        private set(_value) {
            field = _value
        }

    fun copy(
        name: String = this.name,
        age: Double = this.age,
        lastCall: Double = this.lastCall,
        address: String = this.address,
        favoriteColor: String = this.favoriteColor,
        birthDayMonth: Double = this.birthDayMonth,
        birthDayDOM: Double = this.birthDayDOM
    ) = Gold_QCollection(
        name = name,
        age = age,
        lastCall = lastCall,
        address = address,
        favoriteColor = favoriteColor,
        birthDayMonth = birthDayMonth,
        birthDayDOM = birthDayDOM
    )

    fun reset() {
        name = ""
        age = 0.0
        lastCall = 0.0
        address = ""
        favoriteColor = ""
        birthDayMonth = 0.0
        birthDayDOM = 0.0
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) {
            return true
        }

        if (other is Gold_QCollection) {
            if (internalId.isNotEmpty()) {
                return internalId == other.internalId
            }
            return toString() == other.toString()
       }
        return false;
    }

    override fun hashCode(): Int =
        if (internalId.isNotEmpty()) internalId.hashCode() else toString().hashCode()

    override fun schemaHash() = "ccd14452cc01e1b00b94cdb25bfe34a5a632daaa"

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        name.let { encoder.encode("name:T", name) }
        age.let { encoder.encode("age:N", age) }
        lastCall.let { encoder.encode("lastCall:N", lastCall) }
        address.let { encoder.encode("address:T", address) }
        favoriteColor.let { encoder.encode("favoriteColor:T", favoriteColor) }
        birthDayMonth.let { encoder.encode("birthDayMonth:N", birthDayMonth) }
        birthDayDOM.let { encoder.encode("birthDayDOM:N", birthDayDOM) }
        return encoder.toNullTermByteArray()
    }

    override fun toString() =
      "Gold_QCollection(name = $name, age = $age, lastCall = $lastCall, address = $address, favoriteColor = $favoriteColor, birthDayMonth = $birthDayMonth, birthDayDOM = $birthDayDOM)"
}

class Gold_QCollection_Spec() : WasmEntitySpec<Gold_QCollection> {

    override fun create() = Gold_QCollection()


    override fun decode(encoded: ByteArray): Gold_QCollection? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        val internalId = decoder.decodeText()
        decoder.validate("|")

        var name = ""
        var age = 0.0
        var lastCall = 0.0
        var address = ""
        var favoriteColor = ""
        var birthDayMonth = 0.0
        var birthDayDOM = 0.0
        var i = 0
        while (i < 7 && !decoder.done()) {
            val _name = decoder.upTo(':').toUtf8String()
            when (_name) {
                "name" -> {
                    decoder.validate("T")
                    name = decoder.decodeText()
                }
                "age" -> {
                    decoder.validate("N")
                    age = decoder.decodeNum()
                }
                "lastCall" -> {
                    decoder.validate("N")
                    lastCall = decoder.decodeNum()
                }
                "address" -> {
                    decoder.validate("T")
                    address = decoder.decodeText()
                }
                "favoriteColor" -> {
                    decoder.validate("T")
                    favoriteColor = decoder.decodeText()
                }
                "birthDayMonth" -> {
                    decoder.validate("N")
                    birthDayMonth = decoder.decodeNum()
                }
                "birthDayDOM" -> {
                    decoder.validate("N")
                    birthDayDOM = decoder.decodeNum()
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

            name = name,
            age = age,
            lastCall = lastCall,
            address = address,
            favoriteColor = favoriteColor,
            birthDayMonth = birthDayMonth,
            birthDayDOM = birthDayDOM

        )
        _rtn.internalId = internalId
        return _rtn
    }
}


class Gold_Data(
    num: Double = 0.0,
    txt: String = "",
    lnk: String = "",
    flg: Boolean = false
) : WasmEntity {

    override var internalId = ""

    var num = num
        get() = field
        private set(_value) {
            field = _value
        }
    var txt = txt
        get() = field
        private set(_value) {
            field = _value
        }
    var lnk = lnk
        get() = field
        private set(_value) {
            field = _value
        }
    var flg = flg
        get() = field
        private set(_value) {
            field = _value
        }

    fun copy(
        num: Double = this.num,
        txt: String = this.txt,
        lnk: String = this.lnk,
        flg: Boolean = this.flg
    ) = Gold_Data(num = num, txt = txt, lnk = lnk, flg = flg)

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
            if (internalId.isNotEmpty()) {
                return internalId == other.internalId
            }
            return toString() == other.toString()
       }
        return false;
    }

    override fun hashCode(): Int =
        if (internalId.isNotEmpty()) internalId.hashCode() else toString().hashCode()

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

    override fun toString() =
      "Gold_Data(num = $num, txt = $txt, lnk = $lnk, flg = $flg)"
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
            num = num, txt = txt, lnk = lnk, flg = flg
        )
        _rtn.internalId = internalId
        return _rtn
    }
}


class GoldHandles(
    particle: WasmParticleImpl
) {
    val data: WasmSingletonImpl<Gold_Data> = WasmSingletonImpl(particle, "data", Gold_Data_Spec())
    val qCollection: WasmCollectionImpl<Gold_QCollection> = WasmCollectionImpl(particle, "qCollection", Gold_QCollection_Spec())
    val alias: WasmSingletonImpl<Gold_Alias> = WasmSingletonImpl(particle, "alias", Gold_Alias_Spec())
}

abstract class AbstractGold : WasmParticleImpl() {
    val handles: GoldHandles = GoldHandles(this)
}

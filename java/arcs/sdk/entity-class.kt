// This is a reference for the entity classes generated by schema2wasm, based on the schema:
//
// particle Test
//   data: reads {num: Number, txt: Text, lnk: URL, flg: Boolean, ref: &{val: Text}}

@file:Suppress("PackageName", "TopLevelName")
package arcs

import arcs.sdk.Entity
import arcs.sdk.NullTermByteArray
import arcs.sdk.Particle
import arcs.sdk.StringDecoder
import arcs.sdk.StringEncoder
import arcs.sdk.utf8ToString

class Test_Data_Ref() // Implementation omitted for brevity

class Test_Data() : Entity<Test_Data>() {

    var _numSet = false
    var num = 0.0
        get() = field
        set(value) {
            field = value
            _numSet = true
        }
    var _txtSet = false
    var txt = ""
        get() = field
        set(value) {
            field = value
            _txtSet = true
        }
    var _lnkSet = false
    var lnk = ""
        get() = field
        set(value) {
            field = value
            _lnkSet = true
        }
    var _flgSet = false
    var flg = false
        get() = field
        set(value) {
            field = value
            _flgSet = true
        }

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

    override fun isSet(): Boolean {
        return _numSet && _txtSet && _lnkSet && _flgSet
    }

    fun reset() {
        num = 0.0
        _numSet = false
        txt = ""
        _txtSet = false
        lnk = ""
        _lnkSet = false
        flg = false
        _flgSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_numSet) rtn.add("num")
        if (!_txtSet) rtn.add("txt")
        if (!_lnkSet) rtn.add("lnk")
        if (!_flgSet) rtn.add("flg")
        return rtn
    }

    override fun schemaHash() = "d8058d336e472da47b289eafb39733f77eadb111"

    override fun decodeEntity(encoded: ByteArray): Test_Data? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 5) {
            if (decoder.done()) break
            val name = decoder.upTo(':').utf8ToString()
            when (name) {
                "num" -> {
                    decoder.validate("N")
                    this.num = decoder.decodeNum()
                }
                "txt" -> {
                    decoder.validate("T")
                    this.txt = decoder.decodeText()
                }
                "lnk" -> {
                    decoder.validate("U")
                    this.lnk = decoder.decodeText()
                }
                "flg" -> {
                    decoder.validate("B")
                    this.flg = decoder.decodeBool()
                }
            }
            decoder.validate("|")
        }
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        num.let { encoder.encode("num:N", num) }
        txt.let { encoder.encode("txt:T", txt) }
        lnk.let { encoder.encode("lnk:U", lnk) }
        flg.let { encoder.encode("flg:B", flg) }
        return encoder.toNullTermByteArray()
    }
}

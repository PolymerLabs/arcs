@file:Suppress("PackageName", "TopLevelName")
package arcs.sdk

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support references or optional field detection


class GoldInternal1() : Entity() {

    var _val_Set = false
    var val_ = ""
        get() = field
        set(value) {
            field = value
            _val_Set = true
        }

    constructor(
        val_: String
    ) : this() {
        this.val_ = val_
    }

    override fun isSet(): Boolean {
        return _val_Set
    }

    fun reset() {
        val_ = ""
        _val_Set = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_val_Set) rtn.add("val_")
        return rtn
    }

    override fun schemaHash() = "485712110d89359a3e539dac987329cd2649d889"

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        val_.let { encoder.encode("val:T", val_) }
        return encoder.toNullTermByteArray()
    }
}

class GoldInternal1_Spec() : EntitySpec<GoldInternal1> {

    override fun create() = GoldInternal1()

    override fun decode(encoded: ByteArray): GoldInternal1? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        decoder.validate("|")
        val entity = create().apply {
            internalId = decoder.decodeText()
            for (_i in 0 until 1) {
                if (decoder.done()) break
                val name = decoder.upTo(':').utf8ToString()
                when (name) {
                    "val" -> {
                        decoder.validate("T")
                        this.val_ = decoder.decodeText()
                    }
                }
                decoder.validate("|")
            }
        }
        return entity
    }
}

typealias Gold_Data_Ref = GoldInternal1
typealias Gold_Data_Ref_Spec = GoldInternal1_Spec
typealias Gold_Alias = GoldInternal1
typealias Gold_Alias_Spec = GoldInternal1_Spec

class Gold_Data() : Entity() {

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

class Gold_Data_Spec() : EntitySpec<Gold_Data> {

    override fun create() = Gold_Data()

    override fun decode(encoded: ByteArray): Gold_Data? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        decoder.validate("|")
        val entity = create().apply {
            internalId = decoder.decodeText()
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
        }
        return entity
    }
}


abstract class AbstractGold : Particle() {
    protected val data = Singleton(this, "data", Gold_Data_Spec())
    protected val alias = Singleton(this, "alias", Gold_Alias_Spec())
}

@file:Suppress("PackageName", "TopLevelName")
package arcs.sdk

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support references or optional field detection


class HandleSyncUpdateTestInternal1() : Entity<HandleSyncUpdateTestInternal1>() {

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

    override fun schemaHash() = "a98c1c524edca305a86475ecf09e531a8be458df"

    override fun decodeEntity(encoded: ByteArray): HandleSyncUpdateTestInternal1? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
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
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        val_.let { encoder.encode("val:T", val_) }
        return encoder.toNullTermByteArray()
    }
}

typealias HandleSyncUpdateTest_Sng_Ref = HandleSyncUpdateTestInternal1
typealias HandleSyncUpdateTest_Col_Ref = HandleSyncUpdateTestInternal1

class HandleSyncUpdateTest_Res() : Entity<HandleSyncUpdateTest_Res>() {

    var _txtSet = false
    var txt = ""
        get() = field
        set(value) {
            field = value
            _txtSet = true
        }
    var _numSet = false
    var num = 0.0
        get() = field
        set(value) {
            field = value
            _numSet = true
        }

    constructor(
        txt: String,
        num: Double
    ) : this() {
        this.txt = txt
        this.num = num
    }

    override fun isSet(): Boolean {
        return _txtSet && _numSet
    }

    fun reset() {
        txt = ""
        _txtSet = false
        num = 0.0
        _numSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_txtSet) rtn.add("txt")
        if (!_numSet) rtn.add("num")
        return rtn
    }

    override fun schemaHash() = "b3f278f670fd972c8bac1e3b862505430da66810"

    override fun decodeEntity(encoded: ByteArray): HandleSyncUpdateTest_Res? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 2) {
            if (decoder.done()) break
            val name = decoder.upTo(':').utf8ToString()
            when (name) {
                "txt" -> {
                    decoder.validate("T")
                    this.txt = decoder.decodeText()
                }
                "num" -> {
                    decoder.validate("N")
                    this.num = decoder.decodeNum()
                }
            }
            decoder.validate("|")
        }
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        txt.let { encoder.encode("txt:T", txt) }
        num.let { encoder.encode("num:N", num) }
        return encoder.toNullTermByteArray()
    }
}

class HandleSyncUpdateTestInternal2() : Entity<HandleSyncUpdateTestInternal2>() {

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

    override fun schemaHash() = "7ce9e3f97cae5dc6b9570724bbdd33fd8b1ef930"

    override fun decodeEntity(encoded: ByteArray): HandleSyncUpdateTestInternal2? {
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

typealias HandleSyncUpdateTest_Sng = HandleSyncUpdateTestInternal2
typealias HandleSyncUpdateTest_Col = HandleSyncUpdateTestInternal2

class RenderTest_Flags() : Entity<RenderTest_Flags>() {

    var _templateSet = false
    var template = false
        get() = field
        set(value) {
            field = value
            _templateSet = true
        }
    var _modelSet = false
    var model = false
        get() = field
        set(value) {
            field = value
            _modelSet = true
        }

    constructor(
        template: Boolean,
        model: Boolean
    ) : this() {
        this.template = template
        this.model = model
    }

    override fun isSet(): Boolean {
        return _templateSet && _modelSet
    }

    fun reset() {
        template = false
        _templateSet = false
        model = false
        _modelSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_templateSet) rtn.add("template")
        if (!_modelSet) rtn.add("model")
        return rtn
    }

    override fun schemaHash() = "e44b4cba09d05e363bf939e5e88b3d53f44798eb"

    override fun decodeEntity(encoded: ByteArray): RenderTest_Flags? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 2) {
            if (decoder.done()) break
            val name = decoder.upTo(':').utf8ToString()
            when (name) {
                "template" -> {
                    decoder.validate("B")
                    this.template = decoder.decodeBool()
                }
                "model" -> {
                    decoder.validate("B")
                    this.model = decoder.decodeBool()
                }
            }
            decoder.validate("|")
        }
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        template.let { encoder.encode("template:B", template) }
        model.let { encoder.encode("model:B", model) }
        return encoder.toNullTermByteArray()
    }
}

class AutoRenderTest_Data() : Entity<AutoRenderTest_Data>() {

    var _txtSet = false
    var txt = ""
        get() = field
        set(value) {
            field = value
            _txtSet = true
        }

    constructor(
        txt: String
    ) : this() {
        this.txt = txt
    }

    override fun isSet(): Boolean {
        return _txtSet
    }

    fun reset() {
        txt = ""
        _txtSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_txtSet) rtn.add("txt")
        return rtn
    }

    override fun schemaHash() = "5c7dd9d914c51f339663d61e3c5065047540ddfb"

    override fun decodeEntity(encoded: ByteArray): AutoRenderTest_Data? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 1) {
            if (decoder.done()) break
            val name = decoder.upTo(':').utf8ToString()
            when (name) {
                "txt" -> {
                    decoder.validate("T")
                    this.txt = decoder.decodeText()
                }
            }
            decoder.validate("|")
        }
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        txt.let { encoder.encode("txt:T", txt) }
        return encoder.toNullTermByteArray()
    }
}

class EventsTest_Output() : Entity<EventsTest_Output>() {

    var _txtSet = false
    var txt = ""
        get() = field
        set(value) {
            field = value
            _txtSet = true
        }

    constructor(
        txt: String
    ) : this() {
        this.txt = txt
    }

    override fun isSet(): Boolean {
        return _txtSet
    }

    fun reset() {
        txt = ""
        _txtSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_txtSet) rtn.add("txt")
        return rtn
    }

    override fun schemaHash() = "5c7dd9d914c51f339663d61e3c5065047540ddfb"

    override fun decodeEntity(encoded: ByteArray): EventsTest_Output? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 1) {
            if (decoder.done()) break
            val name = decoder.upTo(':').utf8ToString()
            when (name) {
                "txt" -> {
                    decoder.validate("T")
                    this.txt = decoder.decodeText()
                }
            }
            decoder.validate("|")
        }
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        txt.let { encoder.encode("txt:T", txt) }
        return encoder.toNullTermByteArray()
    }
}

class ServicesTest_Output() : Entity<ServicesTest_Output>() {

    var _callSet = false
    var call = ""
        get() = field
        set(value) {
            field = value
            _callSet = true
        }
    var _tagSet = false
    var tag = ""
        get() = field
        set(value) {
            field = value
            _tagSet = true
        }
    var _payloadSet = false
    var payload = ""
        get() = field
        set(value) {
            field = value
            _payloadSet = true
        }

    constructor(
        call: String,
        tag: String,
        payload: String
    ) : this() {
        this.call = call
        this.tag = tag
        this.payload = payload
    }

    override fun isSet(): Boolean {
        return _callSet && _tagSet && _payloadSet
    }

    fun reset() {
        call = ""
        _callSet = false
        tag = ""
        _tagSet = false
        payload = ""
        _payloadSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_callSet) rtn.add("call")
        if (!_tagSet) rtn.add("tag")
        if (!_payloadSet) rtn.add("payload")
        return rtn
    }

    override fun schemaHash() = "4fea976148a3d64d870e66279f17ed74400b3738"

    override fun decodeEntity(encoded: ByteArray): ServicesTest_Output? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 3) {
            if (decoder.done()) break
            val name = decoder.upTo(':').utf8ToString()
            when (name) {
                "call" -> {
                    decoder.validate("T")
                    this.call = decoder.decodeText()
                }
                "tag" -> {
                    decoder.validate("T")
                    this.tag = decoder.decodeText()
                }
                "payload" -> {
                    decoder.validate("T")
                    this.payload = decoder.decodeText()
                }
            }
            decoder.validate("|")
        }
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        call.let { encoder.encode("call:T", call) }
        tag.let { encoder.encode("tag:T", tag) }
        payload.let { encoder.encode("payload:T", payload) }
        return encoder.toNullTermByteArray()
    }
}

class EntityClassApiTest_Empty() : Entity<EntityClassApiTest_Empty>() {





    override fun isSet(): Boolean {
        return true
    }

    fun reset() {

    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()

        return rtn
    }

    override fun schemaHash() = "42099b4af021e53fd8fd4e056c2568d7c2e3ffa8"

    override fun decodeEntity(encoded: ByteArray): EntityClassApiTest_Empty? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()

        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)

        return encoder.toNullTermByteArray()
    }
}

class EntityClassApiTest_Data_Ref() : Entity<EntityClassApiTest_Data_Ref>() {

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

    override fun schemaHash() = "a98c1c524edca305a86475ecf09e531a8be458df"

    override fun decodeEntity(encoded: ByteArray): EntityClassApiTest_Data_Ref? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
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
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        val_.let { encoder.encode("val:T", val_) }
        return encoder.toNullTermByteArray()
    }
}

class EntityClassApiTest_Errors() : Entity<EntityClassApiTest_Errors>() {

    var _msgSet = false
    var msg = ""
        get() = field
        set(value) {
            field = value
            _msgSet = true
        }

    constructor(
        msg: String
    ) : this() {
        this.msg = msg
    }

    override fun isSet(): Boolean {
        return _msgSet
    }

    fun reset() {
        msg = ""
        _msgSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_msgSet) rtn.add("msg")
        return rtn
    }

    override fun schemaHash() = "a0585fca550b0e22524d5f7355084f110e4300c1"

    override fun decodeEntity(encoded: ByteArray): EntityClassApiTest_Errors? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 1) {
            if (decoder.done()) break
            val name = decoder.upTo(':').utf8ToString()
            when (name) {
                "msg" -> {
                    decoder.validate("T")
                    this.msg = decoder.decodeText()
                }
            }
            decoder.validate("|")
        }
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        msg.let { encoder.encode("msg:T", msg) }
        return encoder.toNullTermByteArray()
    }
}

class EntityClassApiTest_Data() : Entity<EntityClassApiTest_Data>() {

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

    override fun schemaHash() = "7ce9e3f97cae5dc6b9570724bbdd33fd8b1ef930"

    override fun decodeEntity(encoded: ByteArray): EntityClassApiTest_Data? {
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

class SpecialSchemaFieldsTest_Fields() : Entity<SpecialSchemaFieldsTest_Fields>() {

    var _for_Set = false
    var for_ = ""
        get() = field
        set(value) {
            field = value
            _for_Set = true
        }
    var _internal_idSet = false
    var internal_id = 0.0
        get() = field
        set(value) {
            field = value
            _internal_idSet = true
        }
    var _internalId_Set = false
    var internalId_ = 0.0
        get() = field
        set(value) {
            field = value
            _internalId_Set = true
        }

    constructor(
        for_: String,
        internal_id: Double,
        internalId_: Double
    ) : this() {
        this.for_ = for_
        this.internal_id = internal_id
        this.internalId_ = internalId_
    }

    override fun isSet(): Boolean {
        return _for_Set && _internal_idSet && _internalId_Set
    }

    fun reset() {
        for_ = ""
        _for_Set = false
        internal_id = 0.0
        _internal_idSet = false
        internalId_ = 0.0
        _internalId_Set = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_for_Set) rtn.add("for_")
        if (!_internal_idSet) rtn.add("internal_id")
        if (!_internalId_Set) rtn.add("internalId_")
        return rtn
    }

    override fun schemaHash() = "3c7cb18c9dcded06edb78cb8052847b2ce53322c"

    override fun decodeEntity(encoded: ByteArray): SpecialSchemaFieldsTest_Fields? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 3) {
            if (decoder.done()) break
            val name = decoder.upTo(':').utf8ToString()
            when (name) {
                "for" -> {
                    decoder.validate("T")
                    this.for_ = decoder.decodeText()
                }
                "internal_id" -> {
                    decoder.validate("N")
                    this.internal_id = decoder.decodeNum()
                }
                "internalId" -> {
                    decoder.validate("N")
                    this.internalId_ = decoder.decodeNum()
                }
            }
            decoder.validate("|")
        }
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        for_.let { encoder.encode("for:T", for_) }
        internal_id.let { encoder.encode("internal_id:N", internal_id) }
        internalId_.let { encoder.encode("internalId:N", internalId_) }
        return encoder.toNullTermByteArray()
    }
}

class SpecialSchemaFieldsTest_Errors() : Entity<SpecialSchemaFieldsTest_Errors>() {

    var _msgSet = false
    var msg = ""
        get() = field
        set(value) {
            field = value
            _msgSet = true
        }

    constructor(
        msg: String
    ) : this() {
        this.msg = msg
    }

    override fun isSet(): Boolean {
        return _msgSet
    }

    fun reset() {
        msg = ""
        _msgSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_msgSet) rtn.add("msg")
        return rtn
    }

    override fun schemaHash() = "a0585fca550b0e22524d5f7355084f110e4300c1"

    override fun decodeEntity(encoded: ByteArray): SpecialSchemaFieldsTest_Errors? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 1) {
            if (decoder.done()) break
            val name = decoder.upTo(':').utf8ToString()
            when (name) {
                "msg" -> {
                    decoder.validate("T")
                    this.msg = decoder.decodeText()
                }
            }
            decoder.validate("|")
        }
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        msg.let { encoder.encode("msg:T", msg) }
        return encoder.toNullTermByteArray()
    }
}

class ReferenceClassApiTest_Data() : Entity<ReferenceClassApiTest_Data>() {

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

    constructor(
        num: Double,
        txt: String
    ) : this() {
        this.num = num
        this.txt = txt
    }

    override fun isSet(): Boolean {
        return _numSet && _txtSet
    }

    fun reset() {
        num = 0.0
        _numSet = false
        txt = ""
        _txtSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_numSet) rtn.add("num")
        if (!_txtSet) rtn.add("txt")
        return rtn
    }

    override fun schemaHash() = "b3f278f670fd972c8bac1e3b862505430da66810"

    override fun decodeEntity(encoded: ByteArray): ReferenceClassApiTest_Data? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 2) {
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
        return encoder.toNullTermByteArray()
    }
}

class ReferenceClassApiTest_Errors() : Entity<ReferenceClassApiTest_Errors>() {

    var _msgSet = false
    var msg = ""
        get() = field
        set(value) {
            field = value
            _msgSet = true
        }

    constructor(
        msg: String
    ) : this() {
        this.msg = msg
    }

    override fun isSet(): Boolean {
        return _msgSet
    }

    fun reset() {
        msg = ""
        _msgSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_msgSet) rtn.add("msg")
        return rtn
    }

    override fun schemaHash() = "a0585fca550b0e22524d5f7355084f110e4300c1"

    override fun decodeEntity(encoded: ByteArray): ReferenceClassApiTest_Errors? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 1) {
            if (decoder.done()) break
            val name = decoder.upTo(':').utf8ToString()
            when (name) {
                "msg" -> {
                    decoder.validate("T")
                    this.msg = decoder.decodeText()
                }
            }
            decoder.validate("|")
        }
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        msg.let { encoder.encode("msg:T", msg) }
        return encoder.toNullTermByteArray()
    }
}

class SingletonApiTestInternal1() : Entity<SingletonApiTestInternal1>() {

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

    constructor(
        num: Double,
        txt: String
    ) : this() {
        this.num = num
        this.txt = txt
    }

    override fun isSet(): Boolean {
        return _numSet && _txtSet
    }

    fun reset() {
        num = 0.0
        _numSet = false
        txt = ""
        _txtSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_numSet) rtn.add("num")
        if (!_txtSet) rtn.add("txt")
        return rtn
    }

    override fun schemaHash() = "b3f278f670fd972c8bac1e3b862505430da66810"

    override fun decodeEntity(encoded: ByteArray): SingletonApiTestInternal1? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 2) {
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
        return encoder.toNullTermByteArray()
    }
}

typealias SingletonApiTest_InHandle = SingletonApiTestInternal1
typealias SingletonApiTest_OutHandle = SingletonApiTestInternal1
typealias SingletonApiTest_IoHandle = SingletonApiTestInternal1

class CollectionApiTest_InHandle() : Entity<CollectionApiTest_InHandle>() {

    var _numSet = false
    var num = 0.0
        get() = field
        set(value) {
            field = value
            _numSet = true
        }

    constructor(
        num: Double
    ) : this() {
        this.num = num
    }

    override fun isSet(): Boolean {
        return _numSet
    }

    fun reset() {
        num = 0.0
        _numSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_numSet) rtn.add("num")
        return rtn
    }

    override fun schemaHash() = "1032e45209f910286cfb898c43a1c3ca7d07aea6"

    override fun decodeEntity(encoded: ByteArray): CollectionApiTest_InHandle? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 1) {
            if (decoder.done()) break
            val name = decoder.upTo(':').utf8ToString()
            when (name) {
                "num" -> {
                    decoder.validate("N")
                    this.num = decoder.decodeNum()
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
        return encoder.toNullTermByteArray()
    }
}

class CollectionApiTestInternal1() : Entity<CollectionApiTestInternal1>() {

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
        flg: Boolean
    ) : this() {
        this.num = num
        this.txt = txt
        this.flg = flg
    }

    override fun isSet(): Boolean {
        return _numSet && _txtSet && _flgSet
    }

    fun reset() {
        num = 0.0
        _numSet = false
        txt = ""
        _txtSet = false
        flg = false
        _flgSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_numSet) rtn.add("num")
        if (!_txtSet) rtn.add("txt")
        if (!_flgSet) rtn.add("flg")
        return rtn
    }

    override fun schemaHash() = "196aecdc9ca6cc64c03dad10242babc1954418ec"

    override fun decodeEntity(encoded: ByteArray): CollectionApiTestInternal1? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 3) {
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
        flg.let { encoder.encode("flg:B", flg) }
        return encoder.toNullTermByteArray()
    }
}

typealias CollectionApiTest_OutHandle = CollectionApiTestInternal1
typealias CollectionApiTest_IoHandle = CollectionApiTestInternal1

class ReferenceHandlesTest_Res() : Entity<ReferenceHandlesTest_Res>() {

    var _txtSet = false
    var txt = ""
        get() = field
        set(value) {
            field = value
            _txtSet = true
        }

    constructor(
        txt: String
    ) : this() {
        this.txt = txt
    }

    override fun isSet(): Boolean {
        return _txtSet
    }

    fun reset() {
        txt = ""
        _txtSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_txtSet) rtn.add("txt")
        return rtn
    }

    override fun schemaHash() = "5c7dd9d914c51f339663d61e3c5065047540ddfb"

    override fun decodeEntity(encoded: ByteArray): ReferenceHandlesTest_Res? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 1) {
            if (decoder.done()) break
            val name = decoder.upTo(':').utf8ToString()
            when (name) {
                "txt" -> {
                    decoder.validate("T")
                    this.txt = decoder.decodeText()
                }
            }
            decoder.validate("|")
        }
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        txt.let { encoder.encode("txt:T", txt) }
        return encoder.toNullTermByteArray()
    }
}

class ReferenceHandlesTestInternal1() : Entity<ReferenceHandlesTestInternal1>() {

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

    constructor(
        num: Double,
        txt: String
    ) : this() {
        this.num = num
        this.txt = txt
    }

    override fun isSet(): Boolean {
        return _numSet && _txtSet
    }

    fun reset() {
        num = 0.0
        _numSet = false
        txt = ""
        _txtSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_numSet) rtn.add("num")
        if (!_txtSet) rtn.add("txt")
        return rtn
    }

    override fun schemaHash() = "b3f278f670fd972c8bac1e3b862505430da66810"

    override fun decodeEntity(encoded: ByteArray): ReferenceHandlesTestInternal1? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 2) {
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
        return encoder.toNullTermByteArray()
    }
}

typealias ReferenceHandlesTest_Sng = ReferenceHandlesTestInternal1
typealias ReferenceHandlesTest_Col = ReferenceHandlesTestInternal1

class SchemaReferenceFieldsTestInternal1() : Entity<SchemaReferenceFieldsTestInternal1>() {

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

    override fun decodeEntity(encoded: ByteArray): SchemaReferenceFieldsTestInternal1? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
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
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        val_.let { encoder.encode("val:T", val_) }
        return encoder.toNullTermByteArray()
    }
}

typealias SchemaReferenceFieldsTest_Input_Ref = SchemaReferenceFieldsTestInternal1
typealias SchemaReferenceFieldsTest_Output_Ref = SchemaReferenceFieldsTestInternal1

class SchemaReferenceFieldsTest_Res() : Entity<SchemaReferenceFieldsTest_Res>() {

    var _txtSet = false
    var txt = ""
        get() = field
        set(value) {
            field = value
            _txtSet = true
        }

    constructor(
        txt: String
    ) : this() {
        this.txt = txt
    }

    override fun isSet(): Boolean {
        return _txtSet
    }

    fun reset() {
        txt = ""
        _txtSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_txtSet) rtn.add("txt")
        return rtn
    }

    override fun schemaHash() = "5c7dd9d914c51f339663d61e3c5065047540ddfb"

    override fun decodeEntity(encoded: ByteArray): SchemaReferenceFieldsTest_Res? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 1) {
            if (decoder.done()) break
            val name = decoder.upTo(':').utf8ToString()
            when (name) {
                "txt" -> {
                    decoder.validate("T")
                    this.txt = decoder.decodeText()
                }
            }
            decoder.validate("|")
        }
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        txt.let { encoder.encode("txt:T", txt) }
        return encoder.toNullTermByteArray()
    }
}

class SchemaReferenceFieldsTestInternal2() : Entity<SchemaReferenceFieldsTestInternal2>() {

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

    constructor(
        num: Double,
        txt: String
    ) : this() {
        this.num = num
        this.txt = txt
    }

    override fun isSet(): Boolean {
        return _numSet && _txtSet
    }

    fun reset() {
        num = 0.0
        _numSet = false
        txt = ""
        _txtSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_numSet) rtn.add("num")
        if (!_txtSet) rtn.add("txt")
        return rtn
    }

    override fun schemaHash() = "8aefce76994b4c77f79361f4297dd4762fffc757"

    override fun decodeEntity(encoded: ByteArray): SchemaReferenceFieldsTestInternal2? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 3) {
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
        return encoder.toNullTermByteArray()
    }
}

typealias SchemaReferenceFieldsTest_Input = SchemaReferenceFieldsTestInternal2
typealias SchemaReferenceFieldsTest_Output = SchemaReferenceFieldsTestInternal2

class UnicodeTestInternal1() : Entity<UnicodeTestInternal1>() {

    var _passSet = false
    var pass = ""
        get() = field
        set(value) {
            field = value
            _passSet = true
        }
    var _srcSet = false
    var src = ""
        get() = field
        set(value) {
            field = value
            _srcSet = true
        }

    constructor(
        pass: String,
        src: String
    ) : this() {
        this.pass = pass
        this.src = src
    }

    override fun isSet(): Boolean {
        return _passSet && _srcSet
    }

    fun reset() {
        pass = ""
        _passSet = false
        src = ""
        _srcSet = false
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        if (!_passSet) rtn.add("pass")
        if (!_srcSet) rtn.add("src")
        return rtn
    }

    override fun schemaHash() = "a8e0ca135306517ec8b837cadc82d98001fac1ff"

    override fun decodeEntity(encoded: ByteArray): UnicodeTestInternal1? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        for (_i in 0 until 2) {
            if (decoder.done()) break
            val name = decoder.upTo(':').utf8ToString()
            when (name) {
                "pass" -> {
                    decoder.validate("T")
                    this.pass = decoder.decodeText()
                }
                "src" -> {
                    decoder.validate("T")
                    this.src = decoder.decodeText()
                }
            }
            decoder.validate("|")
        }
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        pass.let { encoder.encode("pass:T", pass) }
        src.let { encoder.encode("src:T", src) }
        return encoder.toNullTermByteArray()
    }
}

typealias UnicodeTest_Sng = UnicodeTestInternal1
typealias UnicodeTest_Col = UnicodeTestInternal1
typealias UnicodeTest_Res = UnicodeTestInternal1

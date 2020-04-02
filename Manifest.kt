/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.sdk.wasm

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support optional field detection

import arcs.core.data.*
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.entity.Reference
import arcs.core.entity.SchemaRegistry
import arcs.core.entity.toPrimitiveValue
import arcs.sdk.*

typealias HandleSyncUpdateTest_HandleSyncUpdateTest_Sng_Ref = AbstractHandleSyncUpdateTest.HandleSyncUpdateTestInternal1
typealias HandleSyncUpdateTest_HandleSyncUpdateTest_Col_Ref = AbstractHandleSyncUpdateTest.HandleSyncUpdateTestInternal1
typealias HandleSyncUpdateTest_HandleSyncUpdateTest_Res = AbstractHandleSyncUpdateTest.HandleSyncUpdateTest_Res
typealias HandleSyncUpdateTest_HandleSyncUpdateTest_Sng = AbstractHandleSyncUpdateTest.HandleSyncUpdateTestInternal2
typealias HandleSyncUpdateTest_HandleSyncUpdateTest_Col = AbstractHandleSyncUpdateTest.HandleSyncUpdateTestInternal2
typealias HandleSyncUpdateTest_HandleSyncUpdateTestInternal1 = AbstractHandleSyncUpdateTest.HandleSyncUpdateTestInternal2
abstract class AbstractHandleSyncUpdateTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class HandleSyncUpdateTestInternal1(
    val_: String = ""
) : EntityBase("HandleSyncUpdateTestInternal1", SCHEMA) {

    var val_: String
        get() = super.getSingletonValue("val") as String? ?: ""
        private set(_value) = super.setSingletonValue("val", _value)

    init {
        this.val_ = val_
    }

    fun copy(val_: String = this.val_) = HandleSyncUpdateTestInternal1(val_ = val_)


    companion object : EntitySpec<HandleSyncUpdateTestInternal1> {

        override val SCHEMA = Schema(
            setOf(SchemaName("Foo")),
            SchemaFields(
                singletons = mapOf("val" to FieldType.Text),
                collections = emptyMap()
            ),
            "a98c1c524edca305a86475ecf09e531a8be458df",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = HandleSyncUpdateTestInternal1().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class HandleSyncUpdateTest_Res(
    txt: String = "",
    num: Double = 0.0
) : EntityBase("HandleSyncUpdateTest_Res", SCHEMA) {

    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)
    var num: Double
        get() = super.getSingletonValue("num") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num", _value)

    init {
        this.txt = txt
        this.num = num
    }

    fun copy(txt: String = this.txt, num: Double = this.num) = HandleSyncUpdateTest_Res(txt = txt, num = num)


    companion object : EntitySpec<HandleSyncUpdateTest_Res> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("txt" to FieldType.Text, "num" to FieldType.Number),
                collections = emptyMap()
            ),
            "b3f278f670fd972c8bac1e3b862505430da66810",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = HandleSyncUpdateTest_Res().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class HandleSyncUpdateTestInternal2(
    num: Double = 0.0,
    txt: String = "",
    lnk: String = "",
    flg: Boolean = false,
    ref: Reference<HandleSyncUpdateTestInternal1>? = null
) : EntityBase("HandleSyncUpdateTestInternal2", SCHEMA) {

    var num: Double
        get() = super.getSingletonValue("num") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num", _value)
    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)
    var lnk: String
        get() = super.getSingletonValue("lnk") as String? ?: ""
        private set(_value) = super.setSingletonValue("lnk", _value)
    var flg: Boolean
        get() = super.getSingletonValue("flg") as Boolean? ?: false
        private set(_value) = super.setSingletonValue("flg", _value)
    var ref: Reference<HandleSyncUpdateTestInternal1>?
        get() = super.getSingletonValue("ref") as Reference<HandleSyncUpdateTestInternal1>?
        private set(_value) = super.setSingletonValue("ref", _value)

    init {
        this.num = num
        this.txt = txt
        this.lnk = lnk
        this.flg = flg
        this.ref = ref
    }

    fun copy(
        num: Double = this.num,
        txt: String = this.txt,
        lnk: String = this.lnk,
        flg: Boolean = this.flg,
        ref: Reference<HandleSyncUpdateTestInternal1>? = this.ref
    ) = HandleSyncUpdateTestInternal2(num = num, txt = txt, lnk = lnk, flg = flg, ref = ref)


    companion object : EntitySpec<HandleSyncUpdateTestInternal2> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf(
                    "num" to FieldType.Number,
                    "txt" to FieldType.Text,
                    "lnk" to FieldType.Text,
                    "flg" to FieldType.Boolean,
                    "ref" to FieldType.EntityRef("a98c1c524edca305a86475ecf09e531a8be458df")
                ),
                collections = emptyMap()
            ),
            "b14969dc6af9ad4121898107493127cb81333f74",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = HandleSyncUpdateTestInternal2().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "HandleSyncUpdateTest",
        mapOf(
            "sng" to HandleSyncUpdateTest_Sng,
            "col" to HandleSyncUpdateTest_Col,
            "res" to HandleSyncUpdateTest_Res
        )
    ) {
        val sng: ReadSingletonHandle<HandleSyncUpdateTest_Sng> by handles
        val col: ReadCollectionHandle<HandleSyncUpdateTest_Col> by handles
        val res: WriteCollectionHandle<HandleSyncUpdateTest_Res> by handles
    }
}

typealias RenderTest_RenderTest_Flags = AbstractRenderTest.RenderTest_Flags
abstract class AbstractRenderTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class RenderTest_Flags(
    template: Boolean = false,
    model: Boolean = false
) : EntityBase("RenderTest_Flags", SCHEMA) {

    var template: Boolean
        get() = super.getSingletonValue("template") as Boolean? ?: false
        private set(_value) = super.setSingletonValue("template", _value)
    var model: Boolean
        get() = super.getSingletonValue("model") as Boolean? ?: false
        private set(_value) = super.setSingletonValue("model", _value)

    init {
        this.template = template
        this.model = model
    }

    fun copy(template: Boolean = this.template, model: Boolean = this.model) = RenderTest_Flags(template = template, model = model)


    companion object : EntitySpec<RenderTest_Flags> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("template" to FieldType.Boolean, "model" to FieldType.Boolean),
                collections = emptyMap()
            ),
            "e44b4cba09d05e363bf939e5e88b3d53f44798eb",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = RenderTest_Flags().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "RenderTest",
        mapOf("flags" to RenderTest_Flags)
    ) {
        val flags: ReadSingletonHandle<RenderTest_Flags> by handles
    }
}

typealias AutoRenderTest_AutoRenderTest_Data = AbstractAutoRenderTest.AutoRenderTest_Data
abstract class AbstractAutoRenderTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class AutoRenderTest_Data(
    txt: String = ""
) : EntityBase("AutoRenderTest_Data", SCHEMA) {

    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.txt = txt
    }

    fun copy(txt: String = this.txt) = AutoRenderTest_Data(txt = txt)


    companion object : EntitySpec<AutoRenderTest_Data> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("txt" to FieldType.Text),
                collections = emptyMap()
            ),
            "5c7dd9d914c51f339663d61e3c5065047540ddfb",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = AutoRenderTest_Data().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "AutoRenderTest",
        mapOf("data" to AutoRenderTest_Data)
    ) {
        val data: ReadSingletonHandle<AutoRenderTest_Data> by handles
    }
}

typealias EventsTest_EventsTest_Output = AbstractEventsTest.EventsTest_Output
abstract class AbstractEventsTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class EventsTest_Output(
    txt: String = ""
) : EntityBase("EventsTest_Output", SCHEMA) {

    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.txt = txt
    }

    fun copy(txt: String = this.txt) = EventsTest_Output(txt = txt)


    companion object : EntitySpec<EventsTest_Output> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("txt" to FieldType.Text),
                collections = emptyMap()
            ),
            "5c7dd9d914c51f339663d61e3c5065047540ddfb",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = EventsTest_Output().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "EventsTest",
        mapOf("output" to EventsTest_Output)
    ) {
        val output: WriteSingletonHandle<EventsTest_Output> by handles
    }
}

typealias ServicesTest_ServicesTest_Output = AbstractServicesTest.ServicesTest_Output
abstract class AbstractServicesTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class ServicesTest_Output(
    call: String = "",
    tag: String = "",
    payload: String = ""
) : EntityBase("ServicesTest_Output", SCHEMA) {

    var call: String
        get() = super.getSingletonValue("call") as String? ?: ""
        private set(_value) = super.setSingletonValue("call", _value)
    var tag: String
        get() = super.getSingletonValue("tag") as String? ?: ""
        private set(_value) = super.setSingletonValue("tag", _value)
    var payload: String
        get() = super.getSingletonValue("payload") as String? ?: ""
        private set(_value) = super.setSingletonValue("payload", _value)

    init {
        this.call = call
        this.tag = tag
        this.payload = payload
    }

    fun copy(call: String = this.call, tag: String = this.tag, payload: String = this.payload) = ServicesTest_Output(call = call, tag = tag, payload = payload)


    companion object : EntitySpec<ServicesTest_Output> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf(
                    "call" to FieldType.Text,
                    "tag" to FieldType.Text,
                    "payload" to FieldType.Text
                ),
                collections = emptyMap()
            ),
            "4fea976148a3d64d870e66279f17ed74400b3738",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = ServicesTest_Output().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "ServicesTest",
        mapOf("output" to ServicesTest_Output)
    ) {
        val output: WriteCollectionHandle<ServicesTest_Output> by handles
    }
}

typealias EntityClassApiTest_EntityClassApiTest_Empty = AbstractEntityClassApiTest.EntityClassApiTest_Empty
typealias EntityClassApiTest_EntityClassApiTest_Data_Ref = AbstractEntityClassApiTest.EntityClassApiTest_Data_Ref
typealias EntityClassApiTest_EntityClassApiTest_Errors = AbstractEntityClassApiTest.EntityClassApiTest_Errors
typealias EntityClassApiTest_EntityClassApiTest_Data = AbstractEntityClassApiTest.EntityClassApiTest_Data
typealias EntityClassApiTest_EntityClassApiTest_Data_Ref = AbstractEntityClassApiTest.EntityClassApiTest_Data
abstract class AbstractEntityClassApiTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class EntityClassApiTest_Empty() : EntityBase("EntityClassApiTest_Empty", SCHEMA) {





    fun copy() = EntityClassApiTest_Empty()


    companion object : EntitySpec<EntityClassApiTest_Empty> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = emptyMap(),
                collections = emptyMap()
            ),
            "42099b4af021e53fd8fd4e056c2568d7c2e3ffa8",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = EntityClassApiTest_Empty().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class EntityClassApiTest_Data_Ref(
    val_: String = ""
) : EntityBase("EntityClassApiTest_Data_Ref", SCHEMA) {

    var val_: String
        get() = super.getSingletonValue("val") as String? ?: ""
        private set(_value) = super.setSingletonValue("val", _value)

    init {
        this.val_ = val_
    }

    fun copy(val_: String = this.val_) = EntityClassApiTest_Data_Ref(val_ = val_)


    companion object : EntitySpec<EntityClassApiTest_Data_Ref> {

        override val SCHEMA = Schema(
            setOf(SchemaName("Foo")),
            SchemaFields(
                singletons = mapOf("val" to FieldType.Text),
                collections = emptyMap()
            ),
            "a98c1c524edca305a86475ecf09e531a8be458df",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = EntityClassApiTest_Data_Ref().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class EntityClassApiTest_Errors(
    msg: String = ""
) : EntityBase("EntityClassApiTest_Errors", SCHEMA) {

    var msg: String
        get() = super.getSingletonValue("msg") as String? ?: ""
        private set(_value) = super.setSingletonValue("msg", _value)

    init {
        this.msg = msg
    }

    fun copy(msg: String = this.msg) = EntityClassApiTest_Errors(msg = msg)


    companion object : EntitySpec<EntityClassApiTest_Errors> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("msg" to FieldType.Text),
                collections = emptyMap()
            ),
            "a0585fca550b0e22524d5f7355084f110e4300c1",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = EntityClassApiTest_Errors().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class EntityClassApiTest_Data(
    num: Double = 0.0,
    txt: String = "",
    lnk: String = "",
    flg: Boolean = false,
    ref: Reference<EntityClassApiTest_Data_Ref>? = null
) : EntityBase("EntityClassApiTest_Data", SCHEMA) {

    var num: Double
        get() = super.getSingletonValue("num") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num", _value)
    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)
    var lnk: String
        get() = super.getSingletonValue("lnk") as String? ?: ""
        private set(_value) = super.setSingletonValue("lnk", _value)
    var flg: Boolean
        get() = super.getSingletonValue("flg") as Boolean? ?: false
        private set(_value) = super.setSingletonValue("flg", _value)
    var ref: Reference<EntityClassApiTest_Data_Ref>?
        get() = super.getSingletonValue("ref") as Reference<EntityClassApiTest_Data_Ref>?
        private set(_value) = super.setSingletonValue("ref", _value)

    init {
        this.num = num
        this.txt = txt
        this.lnk = lnk
        this.flg = flg
        this.ref = ref
    }

    fun copy(
        num: Double = this.num,
        txt: String = this.txt,
        lnk: String = this.lnk,
        flg: Boolean = this.flg,
        ref: Reference<EntityClassApiTest_Data_Ref>? = this.ref
    ) = EntityClassApiTest_Data(num = num, txt = txt, lnk = lnk, flg = flg, ref = ref)


    companion object : EntitySpec<EntityClassApiTest_Data> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf(
                    "num" to FieldType.Number,
                    "txt" to FieldType.Text,
                    "lnk" to FieldType.Text,
                    "flg" to FieldType.Boolean,
                    "ref" to FieldType.EntityRef("a98c1c524edca305a86475ecf09e531a8be458df")
                ),
                collections = emptyMap()
            ),
            "b14969dc6af9ad4121898107493127cb81333f74",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = EntityClassApiTest_Data().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "EntityClassApiTest",
        mapOf(
            "data" to EntityClassApiTest_Data,
            "empty" to EntityClassApiTest_Empty,
            "errors" to EntityClassApiTest_Errors
        )
    ) {
        val data: ReadSingletonHandle<EntityClassApiTest_Data> by handles
        val empty: ReadSingletonHandle<EntityClassApiTest_Empty> by handles
        val errors: WriteCollectionHandle<EntityClassApiTest_Errors> by handles
    }
}

typealias SpecialSchemaFieldsTest_SpecialSchemaFieldsTest_Fields = AbstractSpecialSchemaFieldsTest.SpecialSchemaFieldsTest_Fields
typealias SpecialSchemaFieldsTest_SpecialSchemaFieldsTest_Errors = AbstractSpecialSchemaFieldsTest.SpecialSchemaFieldsTest_Errors
abstract class AbstractSpecialSchemaFieldsTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class SpecialSchemaFieldsTest_Fields(
    for_: String = "",
    internal_id: Double = 0.0,
    entityId_: Double = 0.0
) : EntityBase("SpecialSchemaFieldsTest_Fields", SCHEMA) {

    var for_: String
        get() = super.getSingletonValue("for") as String? ?: ""
        private set(_value) = super.setSingletonValue("for", _value)
    var internal_id: Double
        get() = super.getSingletonValue("internal_id") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("internal_id", _value)
    var entityId_: Double
        get() = super.getSingletonValue("entityId") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("entityId", _value)

    init {
        this.for_ = for_
        this.internal_id = internal_id
        this.entityId_ = entityId_
    }

    fun copy(
        for_: String = this.for_,
        internal_id: Double = this.internal_id,
        entityId_: Double = this.entityId_
    ) = SpecialSchemaFieldsTest_Fields(for_ = for_, internal_id = internal_id, entityId_ = entityId_)


    companion object : EntitySpec<SpecialSchemaFieldsTest_Fields> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf(
                    "for" to FieldType.Text,
                    "internal_id" to FieldType.Number,
                    "entityId" to FieldType.Number
                ),
                collections = emptyMap()
            ),
            "7930e5bd707ebd4fe0fae381490d8f2d4d7163ac",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = SpecialSchemaFieldsTest_Fields().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class SpecialSchemaFieldsTest_Errors(
    msg: String = ""
) : EntityBase("SpecialSchemaFieldsTest_Errors", SCHEMA) {

    var msg: String
        get() = super.getSingletonValue("msg") as String? ?: ""
        private set(_value) = super.setSingletonValue("msg", _value)

    init {
        this.msg = msg
    }

    fun copy(msg: String = this.msg) = SpecialSchemaFieldsTest_Errors(msg = msg)


    companion object : EntitySpec<SpecialSchemaFieldsTest_Errors> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("msg" to FieldType.Text),
                collections = emptyMap()
            ),
            "a0585fca550b0e22524d5f7355084f110e4300c1",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = SpecialSchemaFieldsTest_Errors().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "SpecialSchemaFieldsTest",
        mapOf("fields" to SpecialSchemaFieldsTest_Fields, "errors" to SpecialSchemaFieldsTest_Errors)
    ) {
        val fields: ReadSingletonHandle<SpecialSchemaFieldsTest_Fields> by handles
        val errors: WriteCollectionHandle<SpecialSchemaFieldsTest_Errors> by handles
    }
}

typealias ReferenceClassApiTest_ReferenceClassApiTest_Data = AbstractReferenceClassApiTest.ReferenceClassApiTest_Data
typealias ReferenceClassApiTest_ReferenceClassApiTest_Errors = AbstractReferenceClassApiTest.ReferenceClassApiTest_Errors
abstract class AbstractReferenceClassApiTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class ReferenceClassApiTest_Data(
    num: Double = 0.0,
    txt: String = ""
) : EntityBase("ReferenceClassApiTest_Data", SCHEMA) {

    var num: Double
        get() = super.getSingletonValue("num") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num", _value)
    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.num = num
        this.txt = txt
    }

    fun copy(num: Double = this.num, txt: String = this.txt) = ReferenceClassApiTest_Data(num = num, txt = txt)


    companion object : EntitySpec<ReferenceClassApiTest_Data> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("num" to FieldType.Number, "txt" to FieldType.Text),
                collections = emptyMap()
            ),
            "b3f278f670fd972c8bac1e3b862505430da66810",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = ReferenceClassApiTest_Data().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class ReferenceClassApiTest_Errors(
    msg: String = ""
) : EntityBase("ReferenceClassApiTest_Errors", SCHEMA) {

    var msg: String
        get() = super.getSingletonValue("msg") as String? ?: ""
        private set(_value) = super.setSingletonValue("msg", _value)

    init {
        this.msg = msg
    }

    fun copy(msg: String = this.msg) = ReferenceClassApiTest_Errors(msg = msg)


    companion object : EntitySpec<ReferenceClassApiTest_Errors> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("msg" to FieldType.Text),
                collections = emptyMap()
            ),
            "a0585fca550b0e22524d5f7355084f110e4300c1",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = ReferenceClassApiTest_Errors().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "ReferenceClassApiTest",
        mapOf("data" to ReferenceClassApiTest_Data, "errors" to ReferenceClassApiTest_Errors)
    ) {
        val data: ReadSingletonHandle<ReferenceClassApiTest_Data> by handles
        val errors: WriteCollectionHandle<ReferenceClassApiTest_Errors> by handles
    }
}

typealias SingletonApiTest_SingletonApiTest_InHandle = AbstractSingletonApiTest.SingletonApiTestInternal1
typealias SingletonApiTest_SingletonApiTest_OutHandle = AbstractSingletonApiTest.SingletonApiTestInternal1
typealias SingletonApiTest_SingletonApiTest_IoHandle = AbstractSingletonApiTest.SingletonApiTestInternal1
typealias SingletonApiTest_SingletonApiTest_Errors = AbstractSingletonApiTest.SingletonApiTest_Errors
abstract class AbstractSingletonApiTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class SingletonApiTestInternal1(
    num: Double = 0.0,
    txt: String = ""
) : EntityBase("SingletonApiTestInternal1", SCHEMA) {

    var num: Double
        get() = super.getSingletonValue("num") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num", _value)
    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.num = num
        this.txt = txt
    }

    fun copy(num: Double = this.num, txt: String = this.txt) = SingletonApiTestInternal1(num = num, txt = txt)


    companion object : EntitySpec<SingletonApiTestInternal1> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("num" to FieldType.Number, "txt" to FieldType.Text),
                collections = emptyMap()
            ),
            "b3f278f670fd972c8bac1e3b862505430da66810",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = SingletonApiTestInternal1().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class SingletonApiTest_Errors(
    msg: String = ""
) : EntityBase("SingletonApiTest_Errors", SCHEMA) {

    var msg: String
        get() = super.getSingletonValue("msg") as String? ?: ""
        private set(_value) = super.setSingletonValue("msg", _value)

    init {
        this.msg = msg
    }

    fun copy(msg: String = this.msg) = SingletonApiTest_Errors(msg = msg)


    companion object : EntitySpec<SingletonApiTest_Errors> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("msg" to FieldType.Text),
                collections = emptyMap()
            ),
            "a0585fca550b0e22524d5f7355084f110e4300c1",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = SingletonApiTest_Errors().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "SingletonApiTest",
        mapOf(
            "inHandle" to SingletonApiTest_InHandle,
            "outHandle" to SingletonApiTest_OutHandle,
            "ioHandle" to SingletonApiTest_IoHandle,
            "errors" to SingletonApiTest_Errors
        )
    ) {
        val inHandle: ReadSingletonHandle<SingletonApiTest_InHandle> by handles
        val outHandle: WriteSingletonHandle<SingletonApiTest_OutHandle> by handles
        val ioHandle: ReadWriteSingletonHandle<SingletonApiTest_IoHandle> by handles
        val errors: WriteCollectionHandle<SingletonApiTest_Errors> by handles
    }
}

typealias CollectionApiTest_CollectionApiTest_InHandle = AbstractCollectionApiTest.CollectionApiTest_InHandle
typealias CollectionApiTest_CollectionApiTest_OutHandle = AbstractCollectionApiTest.CollectionApiTestInternal1
typealias CollectionApiTest_CollectionApiTest_IoHandle = AbstractCollectionApiTest.CollectionApiTestInternal1
abstract class AbstractCollectionApiTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class CollectionApiTest_InHandle(
    num: Double = 0.0
) : EntityBase("CollectionApiTest_InHandle", SCHEMA) {

    var num: Double
        get() = super.getSingletonValue("num") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num", _value)

    init {
        this.num = num
    }

    fun copy(num: Double = this.num) = CollectionApiTest_InHandle(num = num)


    companion object : EntitySpec<CollectionApiTest_InHandle> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("num" to FieldType.Number),
                collections = emptyMap()
            ),
            "1032e45209f910286cfb898c43a1c3ca7d07aea6",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = CollectionApiTest_InHandle().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class CollectionApiTestInternal1(
    num: Double = 0.0,
    txt: String = "",
    flg: Boolean = false
) : EntityBase("CollectionApiTestInternal1", SCHEMA) {

    var num: Double
        get() = super.getSingletonValue("num") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num", _value)
    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)
    var flg: Boolean
        get() = super.getSingletonValue("flg") as Boolean? ?: false
        private set(_value) = super.setSingletonValue("flg", _value)

    init {
        this.num = num
        this.txt = txt
        this.flg = flg
    }

    fun copy(num: Double = this.num, txt: String = this.txt, flg: Boolean = this.flg) = CollectionApiTestInternal1(num = num, txt = txt, flg = flg)


    companion object : EntitySpec<CollectionApiTestInternal1> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf(
                    "num" to FieldType.Number,
                    "txt" to FieldType.Text,
                    "flg" to FieldType.Boolean
                ),
                collections = emptyMap()
            ),
            "196aecdc9ca6cc64c03dad10242babc1954418ec",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = CollectionApiTestInternal1().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "CollectionApiTest",
        mapOf(
            "inHandle" to CollectionApiTest_InHandle,
            "outHandle" to CollectionApiTest_OutHandle,
            "ioHandle" to CollectionApiTest_IoHandle
        )
    ) {
        val inHandle: ReadCollectionHandle<CollectionApiTest_InHandle> by handles
        val outHandle: WriteCollectionHandle<CollectionApiTest_OutHandle> by handles
        val ioHandle: ReadWriteCollectionHandle<CollectionApiTest_IoHandle> by handles
    }
}

typealias ReferenceHandlesTest_ReferenceHandlesTest_Res = AbstractReferenceHandlesTest.ReferenceHandlesTest_Res
typealias ReferenceHandlesTest_ReferenceHandlesTest_Sng = AbstractReferenceHandlesTest.ReferenceHandlesTestInternal1
typealias ReferenceHandlesTest_ReferenceHandlesTest_Col = AbstractReferenceHandlesTest.ReferenceHandlesTestInternal1
abstract class AbstractReferenceHandlesTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class ReferenceHandlesTest_Res(
    txt: String = ""
) : EntityBase("ReferenceHandlesTest_Res", SCHEMA) {

    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.txt = txt
    }

    fun copy(txt: String = this.txt) = ReferenceHandlesTest_Res(txt = txt)


    companion object : EntitySpec<ReferenceHandlesTest_Res> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("txt" to FieldType.Text),
                collections = emptyMap()
            ),
            "5c7dd9d914c51f339663d61e3c5065047540ddfb",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = ReferenceHandlesTest_Res().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class ReferenceHandlesTestInternal1(
    num: Double = 0.0,
    txt: String = ""
) : EntityBase("ReferenceHandlesTestInternal1", SCHEMA) {

    var num: Double
        get() = super.getSingletonValue("num") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num", _value)
    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.num = num
        this.txt = txt
    }

    fun copy(num: Double = this.num, txt: String = this.txt) = ReferenceHandlesTestInternal1(num = num, txt = txt)


    companion object : EntitySpec<ReferenceHandlesTestInternal1> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("num" to FieldType.Number, "txt" to FieldType.Text),
                collections = emptyMap()
            ),
            "b3f278f670fd972c8bac1e3b862505430da66810",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = ReferenceHandlesTestInternal1().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "ReferenceHandlesTest",
        mapOf(
            "sng" to ReferenceHandlesTest_Sng,
            "col" to ReferenceHandlesTest_Col,
            "res" to ReferenceHandlesTest_Res
        )
    ) {
        val sng: ReadWriteSingletonHandle<ReferenceHandlesTest_Sng> by handles
        val col: ReadWriteCollectionHandle<ReferenceHandlesTest_Col> by handles
        val res: WriteCollectionHandle<ReferenceHandlesTest_Res> by handles
    }
}

typealias SchemaReferenceFieldsTest_SchemaReferenceFieldsTest_Input_Ref = AbstractSchemaReferenceFieldsTest.SchemaReferenceFieldsTestInternal1
typealias SchemaReferenceFieldsTest_SchemaReferenceFieldsTest_Output_Ref = AbstractSchemaReferenceFieldsTest.SchemaReferenceFieldsTestInternal1
typealias SchemaReferenceFieldsTest_SchemaReferenceFieldsTest_Res = AbstractSchemaReferenceFieldsTest.SchemaReferenceFieldsTest_Res
typealias SchemaReferenceFieldsTest_SchemaReferenceFieldsTest_Input = AbstractSchemaReferenceFieldsTest.SchemaReferenceFieldsTestInternal2
typealias SchemaReferenceFieldsTest_SchemaReferenceFieldsTest_Output = AbstractSchemaReferenceFieldsTest.SchemaReferenceFieldsTestInternal2
typealias SchemaReferenceFieldsTest_SchemaReferenceFieldsTestInternal1 = AbstractSchemaReferenceFieldsTest.SchemaReferenceFieldsTestInternal2
abstract class AbstractSchemaReferenceFieldsTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class SchemaReferenceFieldsTestInternal1(
    val_: String = ""
) : EntityBase("SchemaReferenceFieldsTestInternal1", SCHEMA) {

    var val_: String
        get() = super.getSingletonValue("val") as String? ?: ""
        private set(_value) = super.setSingletonValue("val", _value)

    init {
        this.val_ = val_
    }

    fun copy(val_: String = this.val_) = SchemaReferenceFieldsTestInternal1(val_ = val_)


    companion object : EntitySpec<SchemaReferenceFieldsTestInternal1> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("val" to FieldType.Text),
                collections = emptyMap()
            ),
            "485712110d89359a3e539dac987329cd2649d889",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = SchemaReferenceFieldsTestInternal1().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class SchemaReferenceFieldsTest_Res(
    txt: String = ""
) : EntityBase("SchemaReferenceFieldsTest_Res", SCHEMA) {

    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.txt = txt
    }

    fun copy(txt: String = this.txt) = SchemaReferenceFieldsTest_Res(txt = txt)


    companion object : EntitySpec<SchemaReferenceFieldsTest_Res> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("txt" to FieldType.Text),
                collections = emptyMap()
            ),
            "5c7dd9d914c51f339663d61e3c5065047540ddfb",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = SchemaReferenceFieldsTest_Res().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class SchemaReferenceFieldsTestInternal2(
    num: Double = 0.0,
    txt: String = "",
    ref: Reference<SchemaReferenceFieldsTestInternal1>? = null
) : EntityBase("SchemaReferenceFieldsTestInternal2", SCHEMA) {

    var num: Double
        get() = super.getSingletonValue("num") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num", _value)
    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)
    var ref: Reference<SchemaReferenceFieldsTestInternal1>?
        get() = super.getSingletonValue("ref") as Reference<SchemaReferenceFieldsTestInternal1>?
        private set(_value) = super.setSingletonValue("ref", _value)

    init {
        this.num = num
        this.txt = txt
        this.ref = ref
    }

    fun copy(
        num: Double = this.num,
        txt: String = this.txt,
        ref: Reference<SchemaReferenceFieldsTestInternal1>? = this.ref
    ) = SchemaReferenceFieldsTestInternal2(num = num, txt = txt, ref = ref)


    companion object : EntitySpec<SchemaReferenceFieldsTestInternal2> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf(
                    "num" to FieldType.Number,
                    "txt" to FieldType.Text,
                    "ref" to FieldType.EntityRef("485712110d89359a3e539dac987329cd2649d889")
                ),
                collections = emptyMap()
            ),
            "55d0e8a1c6e6cd1f026d8c05e3eeab4aebbc31dc",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = SchemaReferenceFieldsTestInternal2().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "SchemaReferenceFieldsTest",
        mapOf(
            "input" to SchemaReferenceFieldsTest_Input,
            "output" to SchemaReferenceFieldsTest_Output,
            "res" to SchemaReferenceFieldsTest_Res
        )
    ) {
        val input: ReadSingletonHandle<SchemaReferenceFieldsTest_Input> by handles
        val output: WriteSingletonHandle<SchemaReferenceFieldsTest_Output> by handles
        val res: WriteCollectionHandle<SchemaReferenceFieldsTest_Res> by handles
    }
}

typealias UnicodeTest_UnicodeTest_Sng = AbstractUnicodeTest.UnicodeTestInternal1
typealias UnicodeTest_UnicodeTest_Col = AbstractUnicodeTest.UnicodeTestInternal1
typealias UnicodeTest_UnicodeTest_Res = AbstractUnicodeTest.UnicodeTestInternal1
abstract class AbstractUnicodeTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class UnicodeTestInternal1(
    pass: String = "",
    src: String = ""
) : EntityBase("UnicodeTestInternal1", SCHEMA) {

    var pass: String
        get() = super.getSingletonValue("pass") as String? ?: ""
        private set(_value) = super.setSingletonValue("pass", _value)
    var src: String
        get() = super.getSingletonValue("src") as String? ?: ""
        private set(_value) = super.setSingletonValue("src", _value)

    init {
        this.pass = pass
        this.src = src
    }

    fun copy(pass: String = this.pass, src: String = this.src) = UnicodeTestInternal1(pass = pass, src = src)


    companion object : EntitySpec<UnicodeTestInternal1> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("pass" to FieldType.Text, "src" to FieldType.Text),
                collections = emptyMap()
            ),
            "a8e0ca135306517ec8b837cadc82d98001fac1ff",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = UnicodeTestInternal1().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "UnicodeTest",
        mapOf("sng" to UnicodeTest_Sng, "col" to UnicodeTest_Col, "res" to UnicodeTest_Res)
    ) {
        val sng: ReadSingletonHandle<UnicodeTest_Sng> by handles
        val col: ReadCollectionHandle<UnicodeTest_Col> by handles
        val res: WriteCollectionHandle<UnicodeTest_Res> by handles
    }
}

typealias OnCreateTest_OnCreateTest_FooHandle = AbstractOnCreateTest.OnCreateTest_FooHandle
abstract class AbstractOnCreateTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class OnCreateTest_FooHandle(
    txt: String = ""
) : EntityBase("OnCreateTest_FooHandle", SCHEMA) {

    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.txt = txt
    }

    fun copy(txt: String = this.txt) = OnCreateTest_FooHandle(txt = txt)


    companion object : EntitySpec<OnCreateTest_FooHandle> {

        override val SCHEMA = Schema(
            setOf(SchemaName("FooHandle")),
            SchemaFields(
                singletons = mapOf("txt" to FieldType.Text),
                collections = emptyMap()
            ),
            "60ec304f211045244c660b562f3be4fc2548b756",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = OnCreateTest_FooHandle().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "OnCreateTest",
        mapOf("fooHandle" to OnCreateTest_FooHandle)
    ) {
        val fooHandle: ReadWriteSingletonHandle<OnCreateTest_FooHandle> by handles
    }
}

typealias EntitySlicingTest_EntitySlicingTest_S1 = AbstractEntitySlicingTest.EntitySlicingTestInternal1
typealias EntitySlicingTest_EntitySlicingTest_C1 = AbstractEntitySlicingTest.EntitySlicingTestInternal1
typealias EntitySlicingTest_EntitySlicingTest_Res = AbstractEntitySlicingTest.EntitySlicingTest_Res
typealias EntitySlicingTest_EntitySlicingTest_S2 = AbstractEntitySlicingTest.EntitySlicingTestInternal2
typealias EntitySlicingTest_EntitySlicingTest_C2 = AbstractEntitySlicingTest.EntitySlicingTestInternal2
typealias EntitySlicingTest_EntitySlicingTest_S3 = AbstractEntitySlicingTest.EntitySlicingTestInternal3
typealias EntitySlicingTest_EntitySlicingTest_C3 = AbstractEntitySlicingTest.EntitySlicingTestInternal3
abstract class AbstractEntitySlicingTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class EntitySlicingTestInternal1(
    num: Double = 0.0
) : EntityBase("EntitySlicingTestInternal1", SCHEMA) {

    var num: Double
        get() = super.getSingletonValue("num") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num", _value)

    init {
        this.num = num
    }

    fun copy(num: Double = this.num) = EntitySlicingTestInternal1(num = num)


    companion object : EntitySpec<EntitySlicingTestInternal1> {

        override val SCHEMA = Schema(
            setOf(SchemaName("Slice")),
            SchemaFields(
                singletons = mapOf("num" to FieldType.Number),
                collections = emptyMap()
            ),
            "6dee17292b6a776ea99af835ba41f2c7d85493ee",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = EntitySlicingTestInternal1().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class EntitySlicingTest_Res(
    val_: String = ""
) : EntityBase("EntitySlicingTest_Res", SCHEMA) {

    var val_: String
        get() = super.getSingletonValue("val") as String? ?: ""
        private set(_value) = super.setSingletonValue("val", _value)

    init {
        this.val_ = val_
    }

    fun copy(val_: String = this.val_) = EntitySlicingTest_Res(val_ = val_)


    companion object : EntitySpec<EntitySlicingTest_Res> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("val" to FieldType.Text),
                collections = emptyMap()
            ),
            "485712110d89359a3e539dac987329cd2649d889",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = EntitySlicingTest_Res().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class EntitySlicingTestInternal2(
    txt: String = "",
    num: Double = 0.0
) : EntityBase("EntitySlicingTestInternal2", SCHEMA) {

    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)
    var num: Double
        get() = super.getSingletonValue("num") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num", _value)

    init {
        this.txt = txt
        this.num = num
    }

    fun copy(txt: String = this.txt, num: Double = this.num) = EntitySlicingTestInternal2(txt = txt, num = num)


    companion object : EntitySpec<EntitySlicingTestInternal2> {

        override val SCHEMA = Schema(
            setOf(SchemaName("Slice")),
            SchemaFields(
                singletons = mapOf("txt" to FieldType.Text, "num" to FieldType.Number),
                collections = emptyMap()
            ),
            "1b5ebd1930200edc74b7905e3baca4534d73ebbf",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = EntitySlicingTestInternal2().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class EntitySlicingTestInternal3(
    num: Double = 0.0,
    flg: Boolean = false,
    txt: String = ""
) : EntityBase("EntitySlicingTestInternal3", SCHEMA) {

    var num: Double
        get() = super.getSingletonValue("num") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num", _value)
    var flg: Boolean
        get() = super.getSingletonValue("flg") as Boolean? ?: false
        private set(_value) = super.setSingletonValue("flg", _value)
    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.num = num
        this.flg = flg
        this.txt = txt
    }

    fun copy(num: Double = this.num, flg: Boolean = this.flg, txt: String = this.txt) = EntitySlicingTestInternal3(num = num, flg = flg, txt = txt)


    companion object : EntitySpec<EntitySlicingTestInternal3> {

        override val SCHEMA = Schema(
            setOf(SchemaName("Slice")),
            SchemaFields(
                singletons = mapOf(
                    "num" to FieldType.Number,
                    "flg" to FieldType.Boolean,
                    "txt" to FieldType.Text
                ),
                collections = emptyMap()
            ),
            "f4907f97574693c81b5d62eb009d1f0f209000b8",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = EntitySlicingTestInternal3().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "EntitySlicingTest",
        mapOf(
            "s1" to EntitySlicingTest_S1,
            "s2" to EntitySlicingTest_S2,
            "s3" to EntitySlicingTest_S3,
            "c1" to EntitySlicingTest_C1,
            "c2" to EntitySlicingTest_C2,
            "c3" to EntitySlicingTest_C3,
            "res" to EntitySlicingTest_Res
        )
    ) {
        val s1: ReadSingletonHandle<EntitySlicingTest_S1> by handles
        val s2: ReadSingletonHandle<EntitySlicingTest_S2> by handles
        val s3: ReadSingletonHandle<EntitySlicingTest_S3> by handles
        val c1: ReadCollectionHandle<EntitySlicingTest_C1> by handles
        val c2: ReadCollectionHandle<EntitySlicingTest_C2> by handles
        val c3: ReadCollectionHandle<EntitySlicingTest_C3> by handles
        val res: WriteCollectionHandle<EntitySlicingTest_Res> by handles
    }
}

typealias CombineUpdatesTest_CombineUpdatesTest_Handle1 = AbstractCombineUpdatesTest.CombineUpdatesTestInternal1
typealias CombineUpdatesTest_CombineUpdatesTest_Handle2 = AbstractCombineUpdatesTest.CombineUpdatesTestInternal1
typealias CombineUpdatesTest_CombineUpdatesTest_Handle3 = AbstractCombineUpdatesTest.CombineUpdatesTest_Handle3
typealias CombineUpdatesTest_CombineUpdatesTest_Handle4 = AbstractCombineUpdatesTest.CombineUpdatesTest_Handle4
typealias CombineUpdatesTest_CombineUpdatesTest_Handle5 = AbstractCombineUpdatesTest.CombineUpdatesTest_Handle5
typealias CombineUpdatesTest_CombineUpdatesTest_Handle6 = AbstractCombineUpdatesTest.CombineUpdatesTest_Handle6
typealias CombineUpdatesTest_CombineUpdatesTest_Handle7 = AbstractCombineUpdatesTest.CombineUpdatesTest_Handle7
typealias CombineUpdatesTest_CombineUpdatesTest_Handle8 = AbstractCombineUpdatesTest.CombineUpdatesTest_Handle8
typealias CombineUpdatesTest_CombineUpdatesTest_Handle9 = AbstractCombineUpdatesTest.CombineUpdatesTest_Handle9
typealias CombineUpdatesTest_CombineUpdatesTest_Handle10 = AbstractCombineUpdatesTest.CombineUpdatesTest_Handle10
typealias CombineUpdatesTest_CombineUpdatesTest_Errors = AbstractCombineUpdatesTest.CombineUpdatesTest_Errors
abstract class AbstractCombineUpdatesTest : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class CombineUpdatesTestInternal1(
    num: Double = 0.0
) : EntityBase("CombineUpdatesTestInternal1", SCHEMA) {

    var num: Double
        get() = super.getSingletonValue("num") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num", _value)

    init {
        this.num = num
    }

    fun copy(num: Double = this.num) = CombineUpdatesTestInternal1(num = num)


    companion object : EntitySpec<CombineUpdatesTestInternal1> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("num" to FieldType.Number),
                collections = emptyMap()
            ),
            "1032e45209f910286cfb898c43a1c3ca7d07aea6",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = CombineUpdatesTestInternal1().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class CombineUpdatesTest_Handle3(
    num3: Double = 0.0
) : EntityBase("CombineUpdatesTest_Handle3", SCHEMA) {

    var num3: Double
        get() = super.getSingletonValue("num3") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num3", _value)

    init {
        this.num3 = num3
    }

    fun copy(num3: Double = this.num3) = CombineUpdatesTest_Handle3(num3 = num3)


    companion object : EntitySpec<CombineUpdatesTest_Handle3> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("num3" to FieldType.Number),
                collections = emptyMap()
            ),
            "5f5cf9ab4b8670fe4d42c2e1172fe3077c120a93",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = CombineUpdatesTest_Handle3().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class CombineUpdatesTest_Handle4(
    num4: Double = 0.0
) : EntityBase("CombineUpdatesTest_Handle4", SCHEMA) {

    var num4: Double
        get() = super.getSingletonValue("num4") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num4", _value)

    init {
        this.num4 = num4
    }

    fun copy(num4: Double = this.num4) = CombineUpdatesTest_Handle4(num4 = num4)


    companion object : EntitySpec<CombineUpdatesTest_Handle4> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("num4" to FieldType.Number),
                collections = emptyMap()
            ),
            "df4c0aea9a85cf8dfa6fae7d96fea85fa91ed8a1",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = CombineUpdatesTest_Handle4().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class CombineUpdatesTest_Handle5(
    num5: Double = 0.0
) : EntityBase("CombineUpdatesTest_Handle5", SCHEMA) {

    var num5: Double
        get() = super.getSingletonValue("num5") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num5", _value)

    init {
        this.num5 = num5
    }

    fun copy(num5: Double = this.num5) = CombineUpdatesTest_Handle5(num5 = num5)


    companion object : EntitySpec<CombineUpdatesTest_Handle5> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("num5" to FieldType.Number),
                collections = emptyMap()
            ),
            "4916a40b842e977571ee07cacfb36b7da8a3e448",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = CombineUpdatesTest_Handle5().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class CombineUpdatesTest_Handle6(
    num6: Double = 0.0
) : EntityBase("CombineUpdatesTest_Handle6", SCHEMA) {

    var num6: Double
        get() = super.getSingletonValue("num6") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num6", _value)

    init {
        this.num6 = num6
    }

    fun copy(num6: Double = this.num6) = CombineUpdatesTest_Handle6(num6 = num6)


    companion object : EntitySpec<CombineUpdatesTest_Handle6> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("num6" to FieldType.Number),
                collections = emptyMap()
            ),
            "fca6d9719fec608b3718fae39f6fd1e639a7ec83",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = CombineUpdatesTest_Handle6().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class CombineUpdatesTest_Handle7(
    num7: Double = 0.0
) : EntityBase("CombineUpdatesTest_Handle7", SCHEMA) {

    var num7: Double
        get() = super.getSingletonValue("num7") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num7", _value)

    init {
        this.num7 = num7
    }

    fun copy(num7: Double = this.num7) = CombineUpdatesTest_Handle7(num7 = num7)


    companion object : EntitySpec<CombineUpdatesTest_Handle7> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("num7" to FieldType.Number),
                collections = emptyMap()
            ),
            "d5d2b680dc2caca1519622d958e9da8693e867e5",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = CombineUpdatesTest_Handle7().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class CombineUpdatesTest_Handle8(
    num8: Double = 0.0
) : EntityBase("CombineUpdatesTest_Handle8", SCHEMA) {

    var num8: Double
        get() = super.getSingletonValue("num8") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num8", _value)

    init {
        this.num8 = num8
    }

    fun copy(num8: Double = this.num8) = CombineUpdatesTest_Handle8(num8 = num8)


    companion object : EntitySpec<CombineUpdatesTest_Handle8> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("num8" to FieldType.Number),
                collections = emptyMap()
            ),
            "de81e83f16d508c85e58481eb2b2c70ed5ed1336",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = CombineUpdatesTest_Handle8().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class CombineUpdatesTest_Handle9(
    num9: Double = 0.0
) : EntityBase("CombineUpdatesTest_Handle9", SCHEMA) {

    var num9: Double
        get() = super.getSingletonValue("num9") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num9", _value)

    init {
        this.num9 = num9
    }

    fun copy(num9: Double = this.num9) = CombineUpdatesTest_Handle9(num9 = num9)


    companion object : EntitySpec<CombineUpdatesTest_Handle9> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("num9" to FieldType.Number),
                collections = emptyMap()
            ),
            "f7fd9182acdbd0fa81f48ad8aa4d7d9f56fd8f15",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = CombineUpdatesTest_Handle9().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class CombineUpdatesTest_Handle10(
    num10: Double = 0.0
) : EntityBase("CombineUpdatesTest_Handle10", SCHEMA) {

    var num10: Double
        get() = super.getSingletonValue("num10") as Double? ?: 0.0
        private set(_value) = super.setSingletonValue("num10", _value)

    init {
        this.num10 = num10
    }

    fun copy(num10: Double = this.num10) = CombineUpdatesTest_Handle10(num10 = num10)


    companion object : EntitySpec<CombineUpdatesTest_Handle10> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("num10" to FieldType.Number),
                collections = emptyMap()
            ),
            "6910c2b0bc28cdc7c0a77f1d3237eff443ba0931",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = CombineUpdatesTest_Handle10().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class CombineUpdatesTest_Errors(
    msg: String = ""
) : EntityBase("CombineUpdatesTest_Errors", SCHEMA) {

    var msg: String
        get() = super.getSingletonValue("msg") as String? ?: ""
        private set(_value) = super.setSingletonValue("msg", _value)

    init {
        this.msg = msg
    }

    fun copy(msg: String = this.msg) = CombineUpdatesTest_Errors(msg = msg)


    companion object : EntitySpec<CombineUpdatesTest_Errors> {

        override val SCHEMA = Schema(
            setOf(),
            SchemaFields(
                singletons = mapOf("msg" to FieldType.Text),
                collections = emptyMap()
            ),
            "a0585fca550b0e22524d5f7355084f110e4300c1",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = CombineUpdatesTest_Errors().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "CombineUpdatesTest",
        mapOf(
            "handle1" to CombineUpdatesTest_Handle1,
            "handle2" to CombineUpdatesTest_Handle2,
            "handle3" to CombineUpdatesTest_Handle3,
            "handle4" to CombineUpdatesTest_Handle4,
            "handle5" to CombineUpdatesTest_Handle5,
            "handle6" to CombineUpdatesTest_Handle6,
            "handle7" to CombineUpdatesTest_Handle7,
            "handle8" to CombineUpdatesTest_Handle8,
            "handle9" to CombineUpdatesTest_Handle9,
            "handle10" to CombineUpdatesTest_Handle10,
            "errors" to CombineUpdatesTest_Errors
        )
    ) {
        val handle1: ReadWriteSingletonHandle<CombineUpdatesTest_Handle1> by handles
        val handle2: ReadWriteCollectionHandle<CombineUpdatesTest_Handle2> by handles
        val handle3: ReadWriteSingletonHandle<CombineUpdatesTest_Handle3> by handles
        val handle4: ReadWriteSingletonHandle<CombineUpdatesTest_Handle4> by handles
        val handle5: ReadWriteSingletonHandle<CombineUpdatesTest_Handle5> by handles
        val handle6: ReadWriteSingletonHandle<CombineUpdatesTest_Handle6> by handles
        val handle7: ReadWriteSingletonHandle<CombineUpdatesTest_Handle7> by handles
        val handle8: ReadWriteSingletonHandle<CombineUpdatesTest_Handle8> by handles
        val handle9: ReadWriteSingletonHandle<CombineUpdatesTest_Handle9> by handles
        val handle10: ReadWriteSingletonHandle<CombineUpdatesTest_Handle10> by handles
        val errors: WriteCollectionHandle<CombineUpdatesTest_Errors> by handles
    }
}

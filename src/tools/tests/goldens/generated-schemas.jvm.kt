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

class GoldInternal1(val_: String = "") : Entity {

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

    override fun serialize() = RawEntity(
        internalId,
        mapOf("val" to val_.toReferencable())
    )

    override fun toString() =
      "GoldInternal1(val_ = $val_)"
}

class GoldInternal1_Spec() : EntitySpec<GoldInternal1> {

    override fun create() = GoldInternal1()

    override fun deserialize(data: RawEntity): GoldInternal1 {
        // TODO: only handles singletons for now
        val rtn = create().copy(val_ = data.singletons["val_"].toPrimitiveValue(String::class, ""))
        rtn.internalId = data.id
        return rtn
    }

    override fun schema() = SCHEMA

    companion object {
        val SCHEMA = Schema(
            listOf(),
            SchemaFields(
                singletons = mapOf("val" to FieldType.Text),
                collections = emptyMap()
            ),
            "485712110d89359a3e539dac987329cd2649d889",
            refinement = { _ -> true },
            query = null
          )

        init {
            SchemaRegistry.register(SCHEMA)
        }
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
) : Entity {

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

    override fun serialize() = RawEntity(
        internalId,
        mapOf(
            "name" to name.toReferencable(),
            "age" to age.toReferencable(),
            "lastCall" to lastCall.toReferencable(),
            "address" to address.toReferencable(),
            "favoriteColor" to favoriteColor.toReferencable(),
            "birthDayMonth" to birthDayMonth.toReferencable(),
            "birthDayDOM" to birthDayDOM.toReferencable()
        )
    )

    override fun toString() =
      "Gold_QCollection(name = $name, age = $age, lastCall = $lastCall, address = $address, favoriteColor = $favoriteColor, birthDayMonth = $birthDayMonth, birthDayDOM = $birthDayDOM)"
}

class Gold_QCollection_Spec() : EntitySpec<Gold_QCollection> {

    override fun create() = Gold_QCollection()

    override fun deserialize(data: RawEntity): Gold_QCollection {
        // TODO: only handles singletons for now
        val rtn = create().copy(
            name = data.singletons["name"].toPrimitiveValue(String::class, ""),
            age = data.singletons["age"].toPrimitiveValue(Double::class, 0.0),
            lastCall = data.singletons["lastCall"].toPrimitiveValue(Double::class, 0.0),
            address = data.singletons["address"].toPrimitiveValue(String::class, ""),
            favoriteColor = data.singletons["favoriteColor"].toPrimitiveValue(String::class, ""),
            birthDayMonth = data.singletons["birthDayMonth"].toPrimitiveValue(Double::class, 0.0),
            birthDayDOM = data.singletons["birthDayDOM"].toPrimitiveValue(Double::class, 0.0)
        )
        rtn.internalId = data.id
        return rtn
    }

    override fun schema() = SCHEMA

    companion object {
        val SCHEMA = Schema(
            listOf(SchemaName("People")),
            SchemaFields(
                singletons = mapOf(
                    "name" to FieldType.Text,
                    "age" to FieldType.Number,
                    "lastCall" to FieldType.Number,
                    "address" to FieldType.Text,
                    "favoriteColor" to FieldType.Text,
                    "birthDayMonth" to FieldType.Number,
                    "birthDayDOM" to FieldType.Number
                ),
                collections = emptyMap()
            ),
            "ccd14452cc01e1b00b94cdb25bfe34a5a632daaa",
            refinement = { _ -> true },
            query = { data, queryArgs ->
                val lastCall = data.singletons["lastCall"].toPrimitiveValue(Double::class, 0.0)
                val name = data.singletons["name"].toPrimitiveValue(String::class, "")
                val queryArgument = queryArgs as String
                ((lastCall < 259200) && (name == queryArgument))
            }
          )

        init {
            SchemaRegistry.register(SCHEMA)
        }
    }
}


class Gold_Data(
    num: Double = 0.0,
    txt: String = "",
    lnk: String = "",
    flg: Boolean = false
) : Entity {

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

    override fun serialize() = RawEntity(
        internalId,
        mapOf(
            "num" to num.toReferencable(),
            "txt" to txt.toReferencable(),
            "lnk" to lnk.toReferencable(),
            "flg" to flg.toReferencable()
        )
    )

    override fun toString() =
      "Gold_Data(num = $num, txt = $txt, lnk = $lnk, flg = $flg)"
}

class Gold_Data_Spec() : EntitySpec<Gold_Data> {

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

    override fun schema() = SCHEMA

    companion object {
        val SCHEMA = Schema(
            listOf(),
            SchemaFields(
                singletons = mapOf(
                    "num" to FieldType.Number,
                    "txt" to FieldType.Text,
                    "lnk" to FieldType.Text,
                    "flg" to FieldType.Boolean
                ),
                collections = emptyMap()
            ),
            "d8058d336e472da47b289eafb39733f77eadb111",
            refinement = { _ -> true },
            query = null
          )

        init {
            SchemaRegistry.register(SCHEMA)
        }
    }
}


class GoldHandles : HandleHolderBase(
    "Gold",
    mapOf(
        "data" to Gold_Data_Spec(),
        "qCollection" to Gold_QCollection_Spec(),
        "alias" to Gold_Alias_Spec()
    )
) {
    val data: ReadSingletonHandle<Gold_Data> by handles
    val qCollection: ReadQueryCollectionHandle<Gold_QCollection, String> by handles
    val alias: WriteSingletonHandle<Gold_Alias> by handles
}

abstract class AbstractGold : BaseParticle() {
    override val handles: GoldHandles = GoldHandles()
}

/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.golden

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

typealias Gold_Data_Ref = AbstractGold.GoldInternal1
typealias Gold_Alias = AbstractGold.GoldInternal1
typealias Gold_AllPeople = AbstractGold.Gold_AllPeople
typealias Gold_Collection = AbstractGold.Gold_Collection
typealias Gold_QCollection = AbstractGold.Gold_QCollection
typealias Gold_Data = AbstractGold.Gold_Data

abstract class AbstractGold : BaseParticle() {
    override val handles: Handles = Handles()


    @Suppress("UNCHECKED_CAST")
    class GoldInternal1(
        val_: String = "",
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp:  Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase("GoldInternal1", SCHEMA, entityId, creationTimestamp, expirationTimestamp) {

        var val_: String
            get() = super.getSingletonValue("val") as String? ?: ""
            private set(_value) = super.setSingletonValue("val", _value)

        init {
            this.val_ = val_
        }
        /**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */
        fun copy(val_: String = this.val_) = GoldInternal1(val_ = val_)
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(val_: String = this.val_) = GoldInternal1(
            val_ = val_,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : EntitySpec<GoldInternal1> {

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

            private val nestedEntitySpecs: Map<SchemaHash, EntitySpec<out Entity>> =
                emptyMap()

            init {
                SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: RawEntity) = GoldInternal1().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    class Gold_AllPeople(
        name: String = "",
        age: Double = 0.0,
        lastCall: Double = 0.0,
        address: String = "",
        favoriteColor: String = "",
        birthDayMonth: Double = 0.0,
        birthDayDOM: Double = 0.0,
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp:  Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase("Gold_AllPeople", SCHEMA, entityId, creationTimestamp, expirationTimestamp) {

        var name: String
            get() = super.getSingletonValue("name") as String? ?: ""
            private set(_value) = super.setSingletonValue("name", _value)
        var age: Double
            get() = super.getSingletonValue("age") as Double? ?: 0.0
            private set(_value) = super.setSingletonValue("age", _value)
        var lastCall: Double
            get() = super.getSingletonValue("lastCall") as Double? ?: 0.0
            private set(_value) = super.setSingletonValue("lastCall", _value)
        var address: String
            get() = super.getSingletonValue("address") as String? ?: ""
            private set(_value) = super.setSingletonValue("address", _value)
        var favoriteColor: String
            get() = super.getSingletonValue("favoriteColor") as String? ?: ""
            private set(_value) = super.setSingletonValue("favoriteColor", _value)
        var birthDayMonth: Double
            get() = super.getSingletonValue("birthDayMonth") as Double? ?: 0.0
            private set(_value) = super.setSingletonValue("birthDayMonth", _value)
        var birthDayDOM: Double
            get() = super.getSingletonValue("birthDayDOM") as Double? ?: 0.0
            private set(_value) = super.setSingletonValue("birthDayDOM", _value)

        init {
            this.name = name
            this.age = age
            this.lastCall = lastCall
            this.address = address
            this.favoriteColor = favoriteColor
            this.birthDayMonth = birthDayMonth
            this.birthDayDOM = birthDayDOM
        }
        /**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */
        fun copy(
            name: String = this.name,
            age: Double = this.age,
            lastCall: Double = this.lastCall,
            address: String = this.address,
            favoriteColor: String = this.favoriteColor,
            birthDayMonth: Double = this.birthDayMonth,
            birthDayDOM: Double = this.birthDayDOM
        ) = Gold_AllPeople(
            name = name,
            age = age,
            lastCall = lastCall,
            address = address,
            favoriteColor = favoriteColor,
            birthDayMonth = birthDayMonth,
            birthDayDOM = birthDayDOM
        )
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(
            name: String = this.name,
            age: Double = this.age,
            lastCall: Double = this.lastCall,
            address: String = this.address,
            favoriteColor: String = this.favoriteColor,
            birthDayMonth: Double = this.birthDayMonth,
            birthDayDOM: Double = this.birthDayDOM
        ) = Gold_AllPeople(
            name = name,
            age = age,
            lastCall = lastCall,
            address = address,
            favoriteColor = favoriteColor,
            birthDayMonth = birthDayMonth,
            birthDayDOM = birthDayDOM,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : EntitySpec<Gold_AllPeople> {

            override val SCHEMA = Schema(
                setOf(SchemaName("People")),
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
                query = null
            )

            private val nestedEntitySpecs: Map<SchemaHash, EntitySpec<out Entity>> =
                emptyMap()

            init {
                SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: RawEntity) = Gold_AllPeople().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    class Gold_Collection(
        num: Double = 0.0,
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp:  Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase("Gold_Collection", SCHEMA, entityId, creationTimestamp, expirationTimestamp) {

        var num: Double
            get() = super.getSingletonValue("num") as Double? ?: 0.0
            private set(_value) = super.setSingletonValue("num", _value)

        init {
            this.num = num
        }
        /**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */
        fun copy(num: Double = this.num) = Gold_Collection(num = num)
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(num: Double = this.num) = Gold_Collection(
            num = num,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : EntitySpec<Gold_Collection> {

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

            private val nestedEntitySpecs: Map<SchemaHash, EntitySpec<out Entity>> =
                emptyMap()

            init {
                SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: RawEntity) = Gold_Collection().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    class Gold_QCollection(
        name: String = "",
        age: Double = 0.0,
        lastCall: Double = 0.0,
        address: String = "",
        favoriteColor: String = "",
        birthDayMonth: Double = 0.0,
        birthDayDOM: Double = 0.0,
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp:  Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase("Gold_QCollection", SCHEMA, entityId, creationTimestamp, expirationTimestamp) {

        var name: String
            get() = super.getSingletonValue("name") as String? ?: ""
            private set(_value) = super.setSingletonValue("name", _value)
        var age: Double
            get() = super.getSingletonValue("age") as Double? ?: 0.0
            private set(_value) = super.setSingletonValue("age", _value)
        var lastCall: Double
            get() = super.getSingletonValue("lastCall") as Double? ?: 0.0
            private set(_value) = super.setSingletonValue("lastCall", _value)
        var address: String
            get() = super.getSingletonValue("address") as String? ?: ""
            private set(_value) = super.setSingletonValue("address", _value)
        var favoriteColor: String
            get() = super.getSingletonValue("favoriteColor") as String? ?: ""
            private set(_value) = super.setSingletonValue("favoriteColor", _value)
        var birthDayMonth: Double
            get() = super.getSingletonValue("birthDayMonth") as Double? ?: 0.0
            private set(_value) = super.setSingletonValue("birthDayMonth", _value)
        var birthDayDOM: Double
            get() = super.getSingletonValue("birthDayDOM") as Double? ?: 0.0
            private set(_value) = super.setSingletonValue("birthDayDOM", _value)

        init {
            this.name = name
            this.age = age
            this.lastCall = lastCall
            this.address = address
            this.favoriteColor = favoriteColor
            this.birthDayMonth = birthDayMonth
            this.birthDayDOM = birthDayDOM
        }
        /**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */
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
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(
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
            birthDayDOM = birthDayDOM,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : EntitySpec<Gold_QCollection> {

            override val SCHEMA = Schema(
                setOf(SchemaName("People")),
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

            private val nestedEntitySpecs: Map<SchemaHash, EntitySpec<out Entity>> =
                emptyMap()

            init {
                SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: RawEntity) = Gold_QCollection().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    class Gold_Data(
        num: Double = 0.0,
        txt: String = "",
        lnk: String = "",
        flg: Boolean = false,
        ref: Reference<GoldInternal1>? = null,
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp:  Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase("Gold_Data", SCHEMA, entityId, creationTimestamp, expirationTimestamp) {

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
        var ref: Reference<GoldInternal1>?
            get() = super.getSingletonValue("ref") as Reference<GoldInternal1>?
            private set(_value) = super.setSingletonValue("ref", _value)

        init {
            this.num = num
            this.txt = txt
            this.lnk = lnk
            this.flg = flg
            this.ref = ref
        }
        /**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */
        fun copy(
            num: Double = this.num,
            txt: String = this.txt,
            lnk: String = this.lnk,
            flg: Boolean = this.flg,
            ref: Reference<GoldInternal1>? = this.ref
        ) = Gold_Data(num = num, txt = txt, lnk = lnk, flg = flg, ref = ref)
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(
            num: Double = this.num,
            txt: String = this.txt,
            lnk: String = this.lnk,
            flg: Boolean = this.flg,
            ref: Reference<GoldInternal1>? = this.ref
        ) = Gold_Data(
            num = num,
            txt = txt,
            lnk = lnk,
            flg = flg,
            ref = ref,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : EntitySpec<Gold_Data> {

            override val SCHEMA = Schema(
                setOf(),
                SchemaFields(
                    singletons = mapOf(
                        "num" to FieldType.Number,
                        "txt" to FieldType.Text,
                        "lnk" to FieldType.Text,
                        "flg" to FieldType.Boolean,
                        "ref" to FieldType.EntityRef("485712110d89359a3e539dac987329cd2649d889")
                    ),
                    collections = emptyMap()
                ),
                "c539be82943f3c24e2503cb0410b865fa3688d06",
                refinement = { _ -> true },
                query = null
            )

            private val nestedEntitySpecs: Map<SchemaHash, EntitySpec<out Entity>> =
                mapOf("485712110d89359a3e539dac987329cd2649d889" to GoldInternal1)

            init {
                SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: RawEntity) = Gold_Data().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    class Handles : HandleHolderBase(
        "Gold",
        mapOf(
            "data" to Gold_Data,
            "allPeople" to Gold_AllPeople,
            "qCollection" to Gold_QCollection,
            "alias" to Gold_Alias,
            "collection" to Gold_Collection
        )
    ) {
        val data: ReadSingletonHandle<Gold_Data> by handles
        val allPeople: ReadCollectionHandle<Gold_AllPeople> by handles
        val qCollection: ReadQueryCollectionHandle<Gold_QCollection, String> by handles
        val alias: WriteSingletonHandle<Gold_Alias> by handles
        val collection: ReadCollectionHandle<Gold_Collection> by handles
    }
}

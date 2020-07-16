/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.golden

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support optional field detection

import arcs.core.data.*
import arcs.core.data.SchemaRegistry
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.entity.Reference
import arcs.core.entity.Tuple1
import arcs.core.entity.Tuple2
import arcs.core.entity.Tuple3
import arcs.core.entity.Tuple4
import arcs.core.entity.Tuple5
import arcs.core.entity.toPrimitiveValue
import arcs.sdk.*
import java.math.BigInteger

typealias KotlinPrimitivesGolden_Data_Ref = AbstractKotlinPrimitivesGolden.KotlinPrimitivesGolden_Data_Ref
typealias KotlinPrimitivesGolden_Data_Lnglst = AbstractKotlinPrimitivesGolden.Thing
typealias KotlinPrimitivesGolden_Data_Detail_Nested = AbstractKotlinPrimitivesGolden.Nested
typealias KotlinPrimitivesGolden_Data_Colors = AbstractKotlinPrimitivesGolden.Color
typealias KotlinPrimitivesGolden_Data_Products = AbstractKotlinPrimitivesGolden.Product
typealias KotlinPrimitivesGolden_Data_Detail = AbstractKotlinPrimitivesGolden.Detail
typealias KotlinPrimitivesGolden_Data = AbstractKotlinPrimitivesGolden.KotlinPrimitivesGolden_Data

abstract class AbstractKotlinPrimitivesGolden : BaseParticle() {
    override val handles: Handles = Handles()


    @Suppress("UNCHECKED_CAST")
    class KotlinPrimitivesGolden_Data_Ref(
        val_: String = "",
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase(
    "KotlinPrimitivesGolden_Data_Ref",
    SCHEMA,
    entityId,
    creationTimestamp,
    expirationTimestamp,
    false
) {

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
        fun copy(val_: String = this.val_) = KotlinPrimitivesGolden_Data_Ref(val_ = val_)
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(val_: String = this.val_) = KotlinPrimitivesGolden_Data_Ref(
            val_ = val_,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : EntitySpec<KotlinPrimitivesGolden_Data_Ref> {

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

            private val nestedEntitySpecs: Map<String, EntitySpec<out Entity>> =
                emptyMap()

            init {
                SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: RawEntity) = KotlinPrimitivesGolden_Data_Ref().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    class Thing(
        name: String = "",
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase("Thing", SCHEMA, entityId, creationTimestamp, expirationTimestamp, false) {

        var name: String
            get() = super.getSingletonValue("name") as String? ?: ""
            private set(_value) = super.setSingletonValue("name", _value)

        init {
            this.name = name
        }

        /**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */
        fun copy(name: String = this.name) = Thing(name = name)
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(name: String = this.name) = Thing(
            name = name,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : EntitySpec<Thing> {

            override val SCHEMA = Schema(
                setOf(SchemaName("Thing")),
                SchemaFields(
                    singletons = mapOf("name" to FieldType.Text),
                    collections = emptyMap()
                ),
                "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516",
                refinement = { _ -> true },
                query = null
            )

            private val nestedEntitySpecs: Map<String, EntitySpec<out Entity>> =
                emptyMap()

            init {
                SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: RawEntity) = Thing().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    class Nested(
        txt: String = "",
        num: Double = 0.0,
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase("Nested", SCHEMA, entityId, creationTimestamp, expirationTimestamp, false) {

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

        /**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */
        fun copy(txt: String = this.txt, num: Double = this.num) = Nested(txt = txt, num = num)
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(txt: String = this.txt, num: Double = this.num) = Nested(
            txt = txt,
            num = num,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : EntitySpec<Nested> {

            override val SCHEMA = Schema(
                setOf(SchemaName("Nested")),
                SchemaFields(
                    singletons = mapOf("txt" to FieldType.Text, "num" to FieldType.Number),
                    collections = emptyMap()
                ),
                "e8b8d30e041174ca9104dfba453615c934af27b3",
                refinement = { _ -> true },
                query = null
            )

            private val nestedEntitySpecs: Map<String, EntitySpec<out Entity>> =
                emptyMap()

            init {
                SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: RawEntity) = Nested().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    class Color(
        red: Char = ' ',
        green: Char = ' ',
        blue: Char = ' ',
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase("Color", SCHEMA, entityId, creationTimestamp, expirationTimestamp, true) {

        var red: Char
            get() = super.getSingletonValue("red") as Char? ?: ' '
            private set(_value) = super.setSingletonValue("red", _value)
        var green: Char
            get() = super.getSingletonValue("green") as Char? ?: ' '
            private set(_value) = super.setSingletonValue("green", _value)
        var blue: Char
            get() = super.getSingletonValue("blue") as Char? ?: ' '
            private set(_value) = super.setSingletonValue("blue", _value)

        init {
            this.red = red
            this.green = green
            this.blue = blue
        }

        /**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */
        fun copy(red: Char = this.red, green: Char = this.green, blue: Char = this.blue) = Color(red = red, green = green, blue = blue)
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(red: Char = this.red, green: Char = this.green, blue: Char = this.blue) = Color(
            red = red,
            green = green,
            blue = blue,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : EntitySpec<Color> {

            override val SCHEMA = Schema(
                setOf(SchemaName("Color")),
                SchemaFields(
                    singletons = mapOf(
                        "red" to FieldType.Char,
                        "green" to FieldType.Char,
                        "blue" to FieldType.Char
                    ),
                    collections = emptyMap()
                ),
                "e9ba6d9fa458ec35a966e462bb30a082e3f0d2f8",
                refinement = { _ -> true },
                query = null
            )

            private val nestedEntitySpecs: Map<String, EntitySpec<out Entity>> =
                emptyMap()

            init {
                SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: RawEntity) = Color().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    class Product(
        name: String = "",
        price: Float = 0.0f,
        stock: Int = 0,
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase("Product", SCHEMA, entityId, creationTimestamp, expirationTimestamp, true) {

        var name: String
            get() = super.getSingletonValue("name") as String? ?: ""
            private set(_value) = super.setSingletonValue("name", _value)
        var price: Float
            get() = super.getSingletonValue("price") as Float? ?: 0.0f
            private set(_value) = super.setSingletonValue("price", _value)
        var stock: Int
            get() = super.getSingletonValue("stock") as Int? ?: 0
            private set(_value) = super.setSingletonValue("stock", _value)

        init {
            this.name = name
            this.price = price
            this.stock = stock
        }

        /**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */
        fun copy(name: String = this.name, price: Float = this.price, stock: Int = this.stock) = Product(name = name, price = price, stock = stock)
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(name: String = this.name, price: Float = this.price, stock: Int = this.stock) = Product(
            name = name,
            price = price,
            stock = stock,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : EntitySpec<Product> {

            override val SCHEMA = Schema(
                setOf(SchemaName("Product")),
                SchemaFields(
                    singletons = mapOf(
                        "name" to FieldType.Text,
                        "price" to FieldType.Float,
                        "stock" to FieldType.Int
                    ),
                    collections = emptyMap()
                ),
                "e84265ec7993502eb817dcff9f34dec4d164db05",
                refinement = { _ -> true },
                query = null
            )

            private val nestedEntitySpecs: Map<String, EntitySpec<out Entity>> =
                emptyMap()

            init {
                SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: RawEntity) = Product().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    class Detail(
        nested: Nested = Nested(),
        txt: String = "",
        num: Double = 0.0,
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase("Detail", SCHEMA, entityId, creationTimestamp, expirationTimestamp, false) {

        var nested: Nested
            get() = super.getSingletonValue("nested") as Nested? ?: Nested()
            private set(_value) = super.setSingletonValue("nested", _value)
        var txt: String
            get() = super.getSingletonValue("txt") as String? ?: ""
            private set(_value) = super.setSingletonValue("txt", _value)
        var num: Double
            get() = super.getSingletonValue("num") as Double? ?: 0.0
            private set(_value) = super.setSingletonValue("num", _value)

        init {
            this.nested = nested
            this.txt = txt
            this.num = num
        }

        /**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */
        fun copy(nested: Nested = this.nested, txt: String = this.txt, num: Double = this.num) = Detail(nested = nested, txt = txt, num = num)
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(nested: Nested = this.nested, txt: String = this.txt, num: Double = this.num) = Detail(
            nested = nested,
            txt = txt,
            num = num,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : EntitySpec<Detail> {

            override val SCHEMA = Schema(
                setOf(SchemaName("Detail")),
                SchemaFields(
                    singletons = mapOf(
                        "nested" to FieldType.InlineEntity("e8b8d30e041174ca9104dfba453615c934af27b3"),
                        "txt" to FieldType.Text,
                        "num" to FieldType.Number
                    ),
                    collections = emptyMap()
                ),
                "efcc87f84735b2f83b285e0f2768ff577611a68c",
                refinement = { _ -> true },
                query = null
            )

            private val nestedEntitySpecs: Map<String, EntitySpec<out Entity>> =
                mapOf("e8b8d30e041174ca9104dfba453615c934af27b3" to Nested)

            init {
                SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: RawEntity) = Detail().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    class KotlinPrimitivesGolden_Data(
        num: Double = 0.0,
        txt: String = "",
        lnk: String = "",
        flg: Boolean = false,
        ref: Reference<KotlinPrimitivesGolden_Data_Ref>? = null,
        bt: Byte = 0.toByte(),
        shrt: Short = 0.toShort(),
        nt: Int = 0,
        lng: Long = 0L,
        big: BigInteger = BigInteger.ZERO,
        chr: Char = ' ',
        flt: Float = 0.0f,
        dbl: Double = 0.0,
        txtlst: List<String> = emptyList(),
        lnglst: List<Reference<Thing>> = emptyList(),
        detail: Detail = Detail(),
        colors: Set<Color> = emptySet(),
        products: List<Product> = emptyList(),
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase(
    "KotlinPrimitivesGolden_Data",
    SCHEMA,
    entityId,
    creationTimestamp,
    expirationTimestamp,
    false
) {

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
        var ref: Reference<KotlinPrimitivesGolden_Data_Ref>?
            get() = super.getSingletonValue("ref") as Reference<KotlinPrimitivesGolden_Data_Ref>?
            private set(_value) = super.setSingletonValue("ref", _value)
        var bt: Byte
            get() = super.getSingletonValue("bt") as Byte? ?: 0.toByte()
            private set(_value) = super.setSingletonValue("bt", _value)
        var shrt: Short
            get() = super.getSingletonValue("shrt") as Short? ?: 0.toShort()
            private set(_value) = super.setSingletonValue("shrt", _value)
        var nt: Int
            get() = super.getSingletonValue("nt") as Int? ?: 0
            private set(_value) = super.setSingletonValue("nt", _value)
        var lng: Long
            get() = super.getSingletonValue("lng") as Long? ?: 0L
            private set(_value) = super.setSingletonValue("lng", _value)
        var big: BigInteger
            get() = super.getSingletonValue("big") as BigInteger? ?: BigInteger.ZERO
            private set(_value) = super.setSingletonValue("big", _value)
        var chr: Char
            get() = super.getSingletonValue("chr") as Char? ?: ' '
            private set(_value) = super.setSingletonValue("chr", _value)
        var flt: Float
            get() = super.getSingletonValue("flt") as Float? ?: 0.0f
            private set(_value) = super.setSingletonValue("flt", _value)
        var dbl: Double
            get() = super.getSingletonValue("dbl") as Double? ?: 0.0
            private set(_value) = super.setSingletonValue("dbl", _value)
        var txtlst: List<String>
            get() = super.getSingletonValue("txtlst") as List<String>? ?: emptyList()
            private set(_value) = super.setSingletonValue("txtlst", _value)
        var lnglst: List<Reference<Thing>>
            get() = super.getSingletonValue("lnglst") as List<Reference<Thing>>? ?: emptyList()
            private set(_value) = super.setSingletonValue("lnglst", _value)
        var detail: Detail
            get() = super.getSingletonValue("detail") as Detail? ?: Detail()
            private set(_value) = super.setSingletonValue("detail", _value)
        var colors: Set<Color>
            get() = super.getCollectionValue("colors") as Set<Color>
            private set(_value) = super.setCollectionValue("colors", _value)
        var products: List<Product>
            get() = super.getSingletonValue("products") as List<Product>? ?: emptyList()
            private set(_value) = super.setSingletonValue("products", _value)

        init {
            this.num = num
            this.txt = txt
            this.lnk = lnk
            this.flg = flg
            this.ref = ref
            this.bt = bt
            this.shrt = shrt
            this.nt = nt
            this.lng = lng
            this.big = big
            this.chr = chr
            this.flt = flt
            this.dbl = dbl
            this.txtlst = txtlst
            this.lnglst = lnglst
            this.detail = detail
            this.colors = colors
            this.products = products
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
            ref: Reference<KotlinPrimitivesGolden_Data_Ref>? = this.ref,
            bt: Byte = this.bt,
            shrt: Short = this.shrt,
            nt: Int = this.nt,
            lng: Long = this.lng,
            big: BigInteger = this.big,
            chr: Char = this.chr,
            flt: Float = this.flt,
            dbl: Double = this.dbl,
            txtlst: List<String> = this.txtlst,
            lnglst: List<Reference<Thing>> = this.lnglst,
            detail: Detail = this.detail,
            colors: Set<Color> = this.colors,
            products: List<Product> = this.products
        ) = KotlinPrimitivesGolden_Data(
            num = num,
            txt = txt,
            lnk = lnk,
            flg = flg,
            ref = ref,
            bt = bt,
            shrt = shrt,
            nt = nt,
            lng = lng,
            big = big,
            chr = chr,
            flt = flt,
            dbl = dbl,
            txtlst = txtlst,
            lnglst = lnglst,
            detail = detail,
            colors = colors,
            products = products
        )
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(
            num: Double = this.num,
            txt: String = this.txt,
            lnk: String = this.lnk,
            flg: Boolean = this.flg,
            ref: Reference<KotlinPrimitivesGolden_Data_Ref>? = this.ref,
            bt: Byte = this.bt,
            shrt: Short = this.shrt,
            nt: Int = this.nt,
            lng: Long = this.lng,
            big: BigInteger = this.big,
            chr: Char = this.chr,
            flt: Float = this.flt,
            dbl: Double = this.dbl,
            txtlst: List<String> = this.txtlst,
            lnglst: List<Reference<Thing>> = this.lnglst,
            detail: Detail = this.detail,
            colors: Set<Color> = this.colors,
            products: List<Product> = this.products
        ) = KotlinPrimitivesGolden_Data(
            num = num,
            txt = txt,
            lnk = lnk,
            flg = flg,
            ref = ref,
            bt = bt,
            shrt = shrt,
            nt = nt,
            lng = lng,
            big = big,
            chr = chr,
            flt = flt,
            dbl = dbl,
            txtlst = txtlst,
            lnglst = lnglst,
            detail = detail,
            colors = colors,
            products = products,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : EntitySpec<KotlinPrimitivesGolden_Data> {

            override val SCHEMA = Schema(
                setOf(),
                SchemaFields(
                    singletons = mapOf(
                        "num" to FieldType.Number,
                        "txt" to FieldType.Text,
                        "lnk" to FieldType.Text,
                        "flg" to FieldType.Boolean,
                        "ref" to FieldType.EntityRef("485712110d89359a3e539dac987329cd2649d889"),
                        "bt" to FieldType.Byte,
                        "shrt" to FieldType.Short,
                        "nt" to FieldType.Int,
                        "lng" to FieldType.Long,
                        "big" to FieldType.BigInt,
                        "chr" to FieldType.Char,
                        "flt" to FieldType.Float,
                        "dbl" to FieldType.Double,
                        "txtlst" to FieldType.ListOf(FieldType.Text),
                        "lnglst" to FieldType.ListOf(FieldType.EntityRef("25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516")),
                        "detail" to FieldType.InlineEntity("efcc87f84735b2f83b285e0f2768ff577611a68c"),
                        "products" to FieldType.ListOf(FieldType.InlineEntity("e84265ec7993502eb817dcff9f34dec4d164db05"))
                    ),
                    collections = mapOf(
                        "colors" to FieldType.InlineEntity("e9ba6d9fa458ec35a966e462bb30a082e3f0d2f8")
                    )
                ),
                "4c3afdeb1bc5b03981b2460d5936ca305af4ea54",
                refinement = { data ->
                    val big = data.singletons["big"].toPrimitiveValue(BigInteger::class, BigInteger.ZERO)
                    val num = data.singletons["num"].toPrimitiveValue(Double::class, 0.0)
                    ((num < 1000) && (big > BigInteger("1")))
                },
                query = null
            )

            private val nestedEntitySpecs: Map<String, EntitySpec<out Entity>> =
                mapOf(
    "485712110d89359a3e539dac987329cd2649d889" to KotlinPrimitivesGolden_Data_Ref,
    "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516" to Thing,
    "efcc87f84735b2f83b285e0f2768ff577611a68c" to Detail,
    "e9ba6d9fa458ec35a966e462bb30a082e3f0d2f8" to Color,
    "e84265ec7993502eb817dcff9f34dec4d164db05" to Product
)

            init {
                SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: RawEntity) = KotlinPrimitivesGolden_Data().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    class Handles : HandleHolderBase(
        "KotlinPrimitivesGolden",
        mapOf("data" to setOf(KotlinPrimitivesGolden_Data))
    ) {
        val data: ReadSingletonHandle<KotlinPrimitivesGolden_Data> by handles
    }
}

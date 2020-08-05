/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.golden

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support optional field detection

import arcs.core.data.expression.*
import arcs.core.data.expression.Expression.*
import arcs.core.data.expression.Expression.BinaryOp.*
import arcs.core.data.util.toReferencable
import arcs.core.entity.toPrimitiveValue
import java.math.BigInteger

typealias KotlinPrimitivesGolden_Data_Ref = AbstractKotlinPrimitivesGolden.KotlinPrimitivesGolden_Data_Ref
typealias KotlinPrimitivesGolden_Data_Thinglst = AbstractKotlinPrimitivesGolden.Thing
typealias KotlinPrimitivesGolden_Data_Detail_Nested = AbstractKotlinPrimitivesGolden.Nested
typealias KotlinPrimitivesGolden_Data_Colors = AbstractKotlinPrimitivesGolden.Color
typealias KotlinPrimitivesGolden_Data_Products = AbstractKotlinPrimitivesGolden.Product
typealias KotlinPrimitivesGolden_Data_Detail = AbstractKotlinPrimitivesGolden.Detail
typealias KotlinPrimitivesGolden_Data = AbstractKotlinPrimitivesGolden.KotlinPrimitivesGolden_Data

abstract class AbstractKotlinPrimitivesGolden : arcs.sdk.BaseParticle() {
    override val handles: Handles = Handles()


    @Suppress("UNCHECKED_CAST")
    class KotlinPrimitivesGolden_Data_Ref(
        val_: String = "",
        entityId: String? = null,
        creationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP
    ) : arcs.sdk.EntityBase(
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

        companion object : arcs.sdk.EntitySpec<KotlinPrimitivesGolden_Data_Ref> {

            override val SCHEMA = arcs.core.data.Schema(
                setOf(),
                arcs.core.data.SchemaFields(
                    singletons = mapOf("val" to arcs.core.data.FieldType.Text),
                    collections = emptyMap()
                ),
                "485712110d89359a3e539dac987329cd2649d889",
                refinementExpression = true.asExpr(),
                queryExpression = true.asExpr()
            )

            private val nestedEntitySpecs: Map<String, arcs.sdk.EntitySpec<out arcs.sdk.Entity>> =
                emptyMap()

            init {
                arcs.core.data.SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: arcs.core.data.RawEntity) = KotlinPrimitivesGolden_Data_Ref().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    class Thing(
        name: String = "",
        entityId: String? = null,
        creationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP
    ) : arcs.sdk.EntityBase("Thing", SCHEMA, entityId, creationTimestamp, expirationTimestamp, false) {

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

        companion object : arcs.sdk.EntitySpec<Thing> {

            override val SCHEMA = arcs.core.data.Schema(
                setOf(arcs.core.data.SchemaName("Thing")),
                arcs.core.data.SchemaFields(
                    singletons = mapOf("name" to arcs.core.data.FieldType.Text),
                    collections = emptyMap()
                ),
                "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516",
                refinementExpression = true.asExpr(),
                queryExpression = true.asExpr()
            )

            private val nestedEntitySpecs: Map<String, arcs.sdk.EntitySpec<out arcs.sdk.Entity>> =
                emptyMap()

            init {
                arcs.core.data.SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: arcs.core.data.RawEntity) = Thing().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    class Nested(
        txt: String = "",
        num: Double = 0.0,
        entityId: String? = null,
        creationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP
    ) : arcs.sdk.EntityBase("Nested", SCHEMA, entityId, creationTimestamp, expirationTimestamp, false) {

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

        companion object : arcs.sdk.EntitySpec<Nested> {

            override val SCHEMA = arcs.core.data.Schema(
                setOf(arcs.core.data.SchemaName("Nested")),
                arcs.core.data.SchemaFields(
                    singletons = mapOf(
                        "txt" to arcs.core.data.FieldType.Text,
                        "num" to arcs.core.data.FieldType.Number
                    ),
                    collections = emptyMap()
                ),
                "e8b8d30e041174ca9104dfba453615c934af27b3",
                refinementExpression = true.asExpr(),
                queryExpression = true.asExpr()
            )

            private val nestedEntitySpecs: Map<String, arcs.sdk.EntitySpec<out arcs.sdk.Entity>> =
                emptyMap()

            init {
                arcs.core.data.SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: arcs.core.data.RawEntity) = Nested().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    class Color(
        red: Char = '\u0000',
        green: Char = '\u0000',
        blue: Char = '\u0000',
        entityId: String? = null,
        creationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP
    ) : arcs.sdk.EntityBase("Color", SCHEMA, entityId, creationTimestamp, expirationTimestamp, true) {

        var red: Char
            get() = super.getSingletonValue("red") as Char? ?: '\u0000'
            private set(_value) = super.setSingletonValue("red", _value)
        var green: Char
            get() = super.getSingletonValue("green") as Char? ?: '\u0000'
            private set(_value) = super.setSingletonValue("green", _value)
        var blue: Char
            get() = super.getSingletonValue("blue") as Char? ?: '\u0000'
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

        companion object : arcs.sdk.EntitySpec<Color> {

            override val SCHEMA = arcs.core.data.Schema(
                setOf(arcs.core.data.SchemaName("Color")),
                arcs.core.data.SchemaFields(
                    singletons = mapOf(
                        "red" to arcs.core.data.FieldType.Char,
                        "green" to arcs.core.data.FieldType.Char,
                        "blue" to arcs.core.data.FieldType.Char
                    ),
                    collections = emptyMap()
                ),
                "e9ba6d9fa458ec35a966e462bb30a082e3f0d2f8",
                refinementExpression = true.asExpr(),
                queryExpression = true.asExpr()
            )

            private val nestedEntitySpecs: Map<String, arcs.sdk.EntitySpec<out arcs.sdk.Entity>> =
                emptyMap()

            init {
                arcs.core.data.SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: arcs.core.data.RawEntity) = Color().apply {
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
        creationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP
    ) : arcs.sdk.EntityBase("Product", SCHEMA, entityId, creationTimestamp, expirationTimestamp, true) {

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

        companion object : arcs.sdk.EntitySpec<Product> {

            override val SCHEMA = arcs.core.data.Schema(
                setOf(arcs.core.data.SchemaName("Product")),
                arcs.core.data.SchemaFields(
                    singletons = mapOf(
                        "name" to arcs.core.data.FieldType.Text,
                        "price" to arcs.core.data.FieldType.Float,
                        "stock" to arcs.core.data.FieldType.Int
                    ),
                    collections = emptyMap()
                ),
                "e84265ec7993502eb817dcff9f34dec4d164db05",
                refinementExpression = true.asExpr(),
                queryExpression = true.asExpr()
            )

            private val nestedEntitySpecs: Map<String, arcs.sdk.EntitySpec<out arcs.sdk.Entity>> =
                emptyMap()

            init {
                arcs.core.data.SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: arcs.core.data.RawEntity) = Product().apply {
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
        creationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP
    ) : arcs.sdk.EntityBase("Detail", SCHEMA, entityId, creationTimestamp, expirationTimestamp, false) {

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

        companion object : arcs.sdk.EntitySpec<Detail> {

            override val SCHEMA = arcs.core.data.Schema(
                setOf(arcs.core.data.SchemaName("Detail")),
                arcs.core.data.SchemaFields(
                    singletons = mapOf(
                        "nested" to arcs.core.data.FieldType.InlineEntity("e8b8d30e041174ca9104dfba453615c934af27b3"),
                        "txt" to arcs.core.data.FieldType.Text,
                        "num" to arcs.core.data.FieldType.Number
                    ),
                    collections = emptyMap()
                ),
                "efcc87f84735b2f83b285e0f2768ff577611a68c",
                refinementExpression = true.asExpr(),
                queryExpression = true.asExpr()
            )

            private val nestedEntitySpecs: Map<String, arcs.sdk.EntitySpec<out arcs.sdk.Entity>> =
                mapOf("e8b8d30e041174ca9104dfba453615c934af27b3" to Nested)

            init {
                arcs.core.data.SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: arcs.core.data.RawEntity) = Detail().apply {
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
        ref: arcs.sdk.Reference<KotlinPrimitivesGolden_Data_Ref>? = null,
        bt: Byte = 0.toByte(),
        shrt: Short = 0.toShort(),
        integer: Int = 0,
        long_val: Long = 0L,
        big: BigInteger = BigInteger.ZERO,
        chr: Char = '\u0000',
        flt: Float = 0.0f,
        dbl: Double = 0.0,
        txtlst: List<String> = emptyList(),
        lnglst: List<Long> = emptyList(),
        thinglst: List<arcs.sdk.Reference<Thing>> = emptyList(),
        detail: Detail = Detail(),
        colors: Set<Color> = emptySet(),
        products: List<Product> = emptyList(),
        entityId: String? = null,
        creationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = arcs.core.data.RawEntity.UNINITIALIZED_TIMESTAMP
    ) : arcs.sdk.EntityBase(
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
        var ref: arcs.sdk.Reference<KotlinPrimitivesGolden_Data_Ref>?
            get() = super.getSingletonValue("ref") as arcs.sdk.Reference<KotlinPrimitivesGolden_Data_Ref>?
            private set(_value) = super.setSingletonValue("ref", _value)
        var bt: Byte
            get() = super.getSingletonValue("bt") as Byte? ?: 0.toByte()
            private set(_value) = super.setSingletonValue("bt", _value)
        var shrt: Short
            get() = super.getSingletonValue("shrt") as Short? ?: 0.toShort()
            private set(_value) = super.setSingletonValue("shrt", _value)
        var integer: Int
            get() = super.getSingletonValue("integer") as Int? ?: 0
            private set(_value) = super.setSingletonValue("integer", _value)
        var long_val: Long
            get() = super.getSingletonValue("long_val") as Long? ?: 0L
            private set(_value) = super.setSingletonValue("long_val", _value)
        var big: BigInteger
            get() = super.getSingletonValue("big") as BigInteger? ?: BigInteger.ZERO
            private set(_value) = super.setSingletonValue("big", _value)
        var chr: Char
            get() = super.getSingletonValue("chr") as Char? ?: '\u0000'
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
        var lnglst: List<Long>
            get() = super.getSingletonValue("lnglst") as List<Long>? ?: emptyList()
            private set(_value) = super.setSingletonValue("lnglst", _value)
        var thinglst: List<arcs.sdk.Reference<Thing>>
            get() = super.getSingletonValue("thinglst") as List<arcs.sdk.Reference<Thing>>? ?: emptyList()
            private set(_value) = super.setSingletonValue("thinglst", _value)
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
            this.integer = integer
            this.long_val = long_val
            this.big = big
            this.chr = chr
            this.flt = flt
            this.dbl = dbl
            this.txtlst = txtlst
            this.lnglst = lnglst
            this.thinglst = thinglst
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
            ref: arcs.sdk.Reference<KotlinPrimitivesGolden_Data_Ref>? = this.ref,
            bt: Byte = this.bt,
            shrt: Short = this.shrt,
            integer: Int = this.integer,
            long_val: Long = this.long_val,
            big: BigInteger = this.big,
            chr: Char = this.chr,
            flt: Float = this.flt,
            dbl: Double = this.dbl,
            txtlst: List<String> = this.txtlst,
            lnglst: List<Long> = this.lnglst,
            thinglst: List<arcs.sdk.Reference<Thing>> = this.thinglst,
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
            integer = integer,
            long_val = long_val,
            big = big,
            chr = chr,
            flt = flt,
            dbl = dbl,
            txtlst = txtlst,
            lnglst = lnglst,
            thinglst = thinglst,
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
            ref: arcs.sdk.Reference<KotlinPrimitivesGolden_Data_Ref>? = this.ref,
            bt: Byte = this.bt,
            shrt: Short = this.shrt,
            integer: Int = this.integer,
            long_val: Long = this.long_val,
            big: BigInteger = this.big,
            chr: Char = this.chr,
            flt: Float = this.flt,
            dbl: Double = this.dbl,
            txtlst: List<String> = this.txtlst,
            lnglst: List<Long> = this.lnglst,
            thinglst: List<arcs.sdk.Reference<Thing>> = this.thinglst,
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
            integer = integer,
            long_val = long_val,
            big = big,
            chr = chr,
            flt = flt,
            dbl = dbl,
            txtlst = txtlst,
            lnglst = lnglst,
            thinglst = thinglst,
            detail = detail,
            colors = colors,
            products = products,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : arcs.sdk.EntitySpec<KotlinPrimitivesGolden_Data> {

            override val SCHEMA = arcs.core.data.Schema(
                setOf(),
                arcs.core.data.SchemaFields(
                    singletons = mapOf(
                        "num" to arcs.core.data.FieldType.Number,
                        "txt" to arcs.core.data.FieldType.Text,
                        "lnk" to arcs.core.data.FieldType.Text,
                        "flg" to arcs.core.data.FieldType.Boolean,
                        "ref" to arcs.core.data.FieldType.EntityRef("485712110d89359a3e539dac987329cd2649d889"),
                        "bt" to arcs.core.data.FieldType.Byte,
                        "shrt" to arcs.core.data.FieldType.Short,
                        "integer" to arcs.core.data.FieldType.Int,
                        "long_val" to arcs.core.data.FieldType.Long,
                        "big" to arcs.core.data.FieldType.BigInt,
                        "chr" to arcs.core.data.FieldType.Char,
                        "flt" to arcs.core.data.FieldType.Float,
                        "dbl" to arcs.core.data.FieldType.Double,
                        "txtlst" to arcs.core.data.FieldType.ListOf(arcs.core.data.FieldType.Text),
                        "lnglst" to arcs.core.data.FieldType.ListOf(arcs.core.data.FieldType.Long),
                        "thinglst" to arcs.core.data.FieldType.ListOf(arcs.core.data.FieldType.EntityRef("25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516")),
                        "detail" to arcs.core.data.FieldType.InlineEntity("efcc87f84735b2f83b285e0f2768ff577611a68c"),
                        "products" to arcs.core.data.FieldType.ListOf(arcs.core.data.FieldType.InlineEntity("e84265ec7993502eb817dcff9f34dec4d164db05"))
                    ),
                    collections = mapOf(
                        "colors" to arcs.core.data.FieldType.InlineEntity("e9ba6d9fa458ec35a966e462bb30a082e3f0d2f8")
                    )
                ),
                "1b1cb0b0d53a8af5158ea9b532e73ab2f9b31add",
                refinementExpression =         ((CurrentScope<Number>(mutableMapOf())["num"] lt 1000.asExpr()) and (((CurrentScope<Number>(mutableMapOf())["big"] gt NumberLiteralExpression(BigInteger("1"))) and (NumberLiteralExpression(BigInteger("30")) lt ((CurrentScope<Number>(mutableMapOf())["integer"] * NumberLiteralExpression(BigInteger("5"))) + (CurrentScope<Number>(mutableMapOf())["integer"] * NumberLiteralExpression(BigInteger("10")))))) and ((NumberLiteralExpression(BigInteger("1000000")) gt (CurrentScope<Number>(mutableMapOf())["long_val"] * NumberLiteralExpression(BigInteger("10")))) and ((NumberLiteralExpression(BigInteger("100000")) eq (CurrentScope<Number>(mutableMapOf())["long_val"] * NumberLiteralExpression(BigInteger("10")))) or (NumberLiteralExpression(BigInteger("100000")) lt (CurrentScope<Number>(mutableMapOf())["long_val"] * NumberLiteralExpression(BigInteger("10")))))))),
                queryExpression = true.asExpr()
            )

            private val nestedEntitySpecs: Map<String, arcs.sdk.EntitySpec<out arcs.sdk.Entity>> =
                mapOf(
    "485712110d89359a3e539dac987329cd2649d889" to KotlinPrimitivesGolden_Data_Ref,
    "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516" to Thing,
    "efcc87f84735b2f83b285e0f2768ff577611a68c" to Detail,
    "e9ba6d9fa458ec35a966e462bb30a082e3f0d2f8" to Color,
    "e84265ec7993502eb817dcff9f34dec4d164db05" to Product
)

            init {
                arcs.core.data.SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: arcs.core.data.RawEntity) = KotlinPrimitivesGolden_Data().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    class Handles : arcs.sdk.HandleHolderBase(
        "KotlinPrimitivesGolden",
        mapOf("data" to setOf(KotlinPrimitivesGolden_Data))
    ) {
        val data: arcs.sdk.ReadSingletonHandle<KotlinPrimitivesGolden_Data> by handles
    }
}

/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.src

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



typealias Gold_Bar = AbstractGold.GoldInternal1
typealias Gold_Bar2 = AbstractGold.GoldInternal1


abstract class AbstractGold : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class _NoName(txt: String = "") : EntityBase("_NoName", SCHEMA) {

    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.txt = txt
    }

    fun copy(txt: String = this.txt) = _NoName(txt = txt)


    companion object : EntitySpec<_NoName> {

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

        override fun deserialize(data: RawEntity) = _NoName().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class _Foo(txt: String = "") : EntityBase("_Foo", SCHEMA) {

    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.txt = txt
    }

    fun copy(txt: String = this.txt) = _Foo(txt = txt)


    companion object : EntitySpec<_Foo> {

        override val SCHEMA = Schema(
            setOf(SchemaName("Foo")),
            SchemaFields(
                singletons = mapOf("txt" to FieldType.Text),
                collections = emptyMap()
            ),
            "9583859f8d908f629fb8cbc1d345d76eee14e64f",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = _Foo().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class 1(txt: String = "") : EntityBase("1", SCHEMA) {

    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.txt = txt
    }

    fun copy(txt: String = this.txt) = 1(txt = txt)


    companion object : EntitySpec<1> {

        override val SCHEMA = Schema(
            setOf(SchemaName("Bar")),
            SchemaFields(
                singletons = mapOf("txt" to FieldType.Text),
                collections = emptyMap()
            ),
            "5d1b9c78be786187aecadde2f246fc4217a6e731",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = 1().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class _CFoo(
    txt: String = "",
    num: Double = 0.0
) : EntityBase("_CFoo", SCHEMA) {

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

    fun copy(txt: String = this.txt, num: Double = this.num) = _CFoo(txt = txt, num = num)


    companion object : EntitySpec<_CFoo> {

        override val SCHEMA = Schema(
            setOf(SchemaName("Foo")),
            SchemaFields(
                singletons = mapOf("txt" to FieldType.Text, "num" to FieldType.Number),
                collections = emptyMap()
            ),
            "626a345029588a51b24d2b88f4afbc1de01d669d",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = _CFoo().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class _FooBar(txt: String = "") : EntityBase("_FooBar", SCHEMA) {

    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.txt = txt
    }

    fun copy(txt: String = this.txt) = _FooBar(txt = txt)


    companion object : EntitySpec<_FooBar> {

        override val SCHEMA = Schema(
            setOf(SchemaName("Foo"), SchemaName("Bar")),
            SchemaFields(
                singletons = mapOf("txt" to FieldType.Text),
                collections = emptyMap()
            ),
            "984b3d26a93c2c120e6ab40fd7d0a13c001baa2a",
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(this)
        }

        override fun deserialize(data: RawEntity) = _FooBar().apply { deserialize(data) }
    }
}

    class Handles : HandleHolderBase(
        "Gold",
        mapOf(
            "foo" to Gold_Foo,
            "cFoo" to Gold_CFoo,
            "bar" to Gold_Bar,
            "bar2" to Gold_Bar2,
            "noName" to Gold_NoName,
            "fooBar" to Gold_FooBar
        )
    ) {
        val foo: WriteSingletonHandle<Gold_Foo> by handles
        val cFoo: WriteSingletonHandle<Gold_CFoo> by handles
        val bar: WriteSingletonHandle<Gold_Bar> by handles
        val bar2: WriteSingletonHandle<Gold_Bar2> by handles
        val noName: WriteSingletonHandle<Gold_NoName> by handles
        val fooBar: WriteSingletonHandle<Gold_FooBar> by handles
    }
}

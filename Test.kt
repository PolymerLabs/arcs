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



typealias Bar2 = AbstractGold.Bar


abstract class AbstractGold : BaseParticle() {
    override val handles: Handles = Handles()


@Suppress("UNCHECKED_CAST")
class NoName(txt: String = "") : EntityBase("NoName", SCHEMA) {

    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.txt = txt
    }

    fun copy(txt: String = this.txt) = NoName(txt = txt)


    companion object : EntitySpec<NoName> {

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

        override fun deserialize(data: RawEntity) = NoName().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class Foo(txt: String = "") : EntityBase("Foo", SCHEMA) {

    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.txt = txt
    }

    fun copy(txt: String = this.txt) = Foo(txt = txt)


    companion object : EntitySpec<Foo> {

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

        override fun deserialize(data: RawEntity) = Foo().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class Bar(txt: String = "") : EntityBase("Bar", SCHEMA) {

    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.txt = txt
    }

    fun copy(txt: String = this.txt) = Bar(txt = txt)


    companion object : EntitySpec<Bar> {

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

        override fun deserialize(data: RawEntity) = Bar().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class CFoo(
    txt: String = "",
    num: Double = 0.0
) : EntityBase("CFoo", SCHEMA) {

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

    fun copy(txt: String = this.txt, num: Double = this.num) = CFoo(txt = txt, num = num)


    companion object : EntitySpec<CFoo> {

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

        override fun deserialize(data: RawEntity) = CFoo().apply { deserialize(data) }
    }
}

@Suppress("UNCHECKED_CAST")
class FooBar(txt: String = "") : EntityBase("FooBar", SCHEMA) {

    var txt: String
        get() = super.getSingletonValue("txt") as String? ?: ""
        private set(_value) = super.setSingletonValue("txt", _value)

    init {
        this.txt = txt
    }

    fun copy(txt: String = this.txt) = FooBar(txt = txt)


    companion object : EntitySpec<FooBar> {

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

        override fun deserialize(data: RawEntity) = FooBar().apply { deserialize(data) }
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

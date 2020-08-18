package arcs.tools

import arcs.core.data.CollectionType
import arcs.core.data.CountType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.Recipe
import arcs.core.data.ReferenceType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SingletonType
import arcs.core.data.TupleType
import arcs.core.data.TypeVariable
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

fun String.normalize() = this.replace("\\s".toRegex(), "")

@RunWith(JUnit4::class)
class PlanGeneratorTest {

    private val schema = Schema(
        setOf(SchemaName("Foo")),
        SchemaFields(singletons = mapOf("sku" to FieldType.Int), collections = emptyMap()),
        "fooHash"
    )

    private val entity = EntityType(schema)

    @Test
    fun handle() {
        assertThat(
            Recipe.Handle(
                name = "foo",
                fate = Recipe.Handle.Fate.CREATE,
                type = entity,
                storageKey = "AKey"
            ).toGeneration("FooPlan").toString().normalize()
        ).isEqualTo(
            """
            val FooPlan_foo: arcs.core.data.Plan.Handle = arcs.core.data.Plan.Handle(
                storageKey = arcs.core.storage.StorageKeyParser.parse("AKey"),
                type = arcs.core.data.EntityType(arcs.core.data.Schema(
                    names = setOf(arcs.core.data.SchemaName("Foo")),
                    fields = arcs.core.data.SchemaFields(
                        singletons = mapOf("sku" to arcs.core.data.FieldType.Int),
                        collections = emptyMap()
                    ),
                    hash = "fooHash"
                )),
                annotations = emptyList()
            )
            """.normalize()
        )
    }

    @Test
    fun handle_storageKey() {
        assertThat(
            Recipe.Handle(
                name = "foo",
                fate = Recipe.Handle.Fate.CREATE,
                type = entity,
                storageKey = "AKey"
            ).toGeneration("FooPlan").toString()
        ).contains("""storageKey = arcs.core.storage.StorageKeyParser.parse("AKey")""")

        assertThat(
            Recipe.Handle(
                name = "foo",
                fate = Recipe.Handle.Fate.CREATE,
                type = entity,
                storageKey = null
            ).toGeneration("FooPlan").toString()
        ).contains("""storageKey = arcs.core.data.CreatableStorageKey("foo")""")
    }

    @Test
    fun type_entity() {
        assertThat(
            entity.toGeneration().toString().normalize()
        ).isEqualTo(
            """
            arcs.core.data.EntityType(
                arcs.core.data.Schema(
                    names = setOf(arcs.core.data.SchemaName("Foo")), 
                    fields = arcs.core.data.SchemaFields(
                        singletons = mapOf("sku" to arcs.core.data.FieldType.Int), 
                        collections = emptyMap()
                    ), 
                    hash = "fooHash"
                )
            )
            """.normalize()
        )
    }

    @Test
    fun type_singleton() {
        assertThat(
            SingletonType(entity).toGeneration().toString().normalize()
        ).isEqualTo(
            """
            arcs.core.data.SingletonType(
                arcs.core.data.EntityType(
                    arcs.core.data.Schema(
                        names = setOf(arcs.core.data.SchemaName("Foo")), 
                        fields = arcs.core.data.SchemaFields(
                            singletons = mapOf("sku" to arcs.core.data.FieldType.Int), 
                            collections = emptyMap()
                        ), 
                        hash = "fooHash"
                    )
                )
            )
            """.normalize()
        )
    }

    @Test
    fun type_collection() {
        assertThat(
            CollectionType(entity).toGeneration().toString().normalize()
        ).isEqualTo(
            """
            arcs.core.data.CollectionType(
                arcs.core.data.EntityType(
                    arcs.core.data.Schema(
                        names = setOf(arcs.core.data.SchemaName("Foo")), 
                        fields = arcs.core.data.SchemaFields(
                            singletons = mapOf("sku" to arcs.core.data.FieldType.Int), 
                            collections = emptyMap()
                        ), 
                        hash = "fooHash"
                    )
                )
            )
            """.normalize()
        )
    }

    @Test
    fun type_reference() {
        assertThat(
            ReferenceType(entity).toGeneration().toString().normalize()
        ).isEqualTo(
            """
            arcs.core.data.ReferenceType(
                arcs.core.data.EntityType(
                    arcs.core.data.Schema(
                        names = setOf(arcs.core.data.SchemaName("Foo")), 
                        fields = arcs.core.data.SchemaFields(
                            singletons = mapOf("sku" to arcs.core.data.FieldType.Int), 
                            collections = emptyMap()
                        ), 
                        hash = "fooHash"
                    )
                )
            )
            """.normalize()
        )
    }

    @Test
    fun type_tuple() {
        assertThat(
            TupleType(listOf(
                SingletonType(entity), SingletonType(entity)
            )).toGeneration().toString().normalize()
        ).isEqualTo(
            """
            arcs.core.data.TupleType(
                listOf(
                    arcs.core.data.SingletonType(
                        arcs.core.data.EntityType(
                            arcs.core.data.Schema(
                                names = setOf(arcs.core.data.SchemaName("Foo")), 
                                fields = arcs.core.data.SchemaFields(
                                    singletons = mapOf("sku" to arcs.core.data.FieldType.Int), 
                                    collections = emptyMap()
                                ), 
                                hash = "fooHash"
                            )
                        )
                    ),
                    arcs.core.data.SingletonType(
                        arcs.core.data.EntityType(
                            arcs.core.data.Schema(
                                names = setOf(arcs.core.data.SchemaName("Foo")), 
                                fields = arcs.core.data.SchemaFields(
                                    singletons = mapOf("sku" to arcs.core.data.FieldType.Int), 
                                    collections = emptyMap()
                                ), 
                                hash = "fooHash"
                            )
                        )
                    )
                )
            )
            """.normalize()
        )
    }

    @Test
    fun type_variable() {
        assertThat(
            TypeVariable("a", SingletonType(entity)).toGeneration().toString().normalize()
        ).isEqualTo(
            """
            arcs.core.data.TypeVariable(
                "a",
                arcs.core.data.SingletonType(
                    arcs.core.data.EntityType(
                        arcs.core.data.Schema(
                            names = setOf(arcs.core.data.SchemaName("Foo")), 
                            fields = arcs.core.data.SchemaFields(
                                singletons = mapOf("sku" to arcs.core.data.FieldType.Int), 
                                collections = emptyMap()
                            ), 
                            hash = "fooHash"
                        )
                    )
                ),
                false
            )    
            """.normalize()
        )
    }


    @Test
    fun type_variable_unconstrained() {
        assertThat(
            TypeVariable("a").toGeneration().toString().normalize()
        ).isEqualTo("""arcs.core.data.TypeVariable("a", null, false)""".normalize())
    }

    @Test
    fun type_variable_maxAccess() {
        assertThat(
            TypeVariable("a", SingletonType(entity), true).toGeneration().toString().normalize()
        ).isEqualTo(
            """
            arcs.core.data.TypeVariable(
                "a",
                arcs.core.data.SingletonType(
                    arcs.core.data.EntityType(
                        arcs.core.data.Schema(
                            names = setOf(arcs.core.data.SchemaName("Foo")), 
                            fields = arcs.core.data.SchemaFields(
                                singletons = mapOf("sku" to arcs.core.data.FieldType.Int), 
                                collections = emptyMap()
                            ), 
                            hash = "fooHash"
                        )
                    )
                ),
                true
            )    
            """.normalize()
        )
    }

    @Test
    fun type_complex() {
        assertThat(
            TupleType(listOf(
                CollectionType(ReferenceType(entity)),
                TypeVariable("a", SingletonType(entity), true),
                CountType()
            )).toGeneration().toString().normalize()
        ).isEqualTo(
            """
            arcs.core.data.TupleType(
                listOf(
                    arcs.core.data.CollectionType(
                        arcs.core.data.ReferenceType(
                            arcs.core.data.EntityType(
                                arcs.core.data.Schema(
                                    names = setOf(arcs.core.data.SchemaName("Foo")), 
                                    fields = arcs.core.data.SchemaFields(
                                        singletons = mapOf("sku" to arcs.core.data.FieldType.Int), 
                                        collections = emptyMap()
                                    ), 
                                    hash = "fooHash"
                                )
                            )
                        )
                    ),
                    arcs.core.data.TypeVariable(
                        "a",
                        arcs.core.data.SingletonType(
                            arcs.core.data.EntityType(
                                arcs.core.data.Schema(
                                    names = setOf(arcs.core.data.SchemaName("Foo")), 
                                    fields = arcs.core.data.SchemaFields(
                                        singletons = mapOf("sku" to arcs.core.data.FieldType.Int), 
                                        collections = emptyMap()
                                    ), 
                                    hash = "fooHash"
                                )
                            )
                        ),
                        true
                    ),
                    arcs.core.data.CountType()
                )
            )
            """.normalize()
        )
    }

    @Test
    fun schema_empty() {
        assertThat(Schema.EMPTY.toGeneration().toString())
            .isEqualTo("""arcs.core.data.Schema.EMPTY""")
    }

    @Test
    fun schema_nameOnly() {
        val schemaGen = Schema(
            setOf(SchemaName("Foo")),
            SchemaFields(emptyMap(), emptyMap()),
            "fooHash"
        ).toGeneration().toString()

        // TODO(161941018): Figure out how to get indentation right so we can test whitespace
        assertThat(schemaGen).contains("SchemaName(\"Foo\")")
        assertThat(schemaGen).contains("hash = \"fooHash\"")
    }

    @Test
    fun schemaFields_empty() {
        assertThat(SchemaFields(emptyMap(), emptyMap()).toGeneration().toString())
            .isEqualTo("""
                arcs.core.data.SchemaFields(
                    singletons = emptyMap(),
                    collections = emptyMap()
                )
            """.trimIndent())
    }

    @Test
    fun schemaFields_singletons() {
        assertThat(
            SchemaFields(singletons = mapOf("sku" to FieldType.Int), collections = emptyMap())
                .toGeneration().toString()
        )
            .isEqualTo("""
                arcs.core.data.SchemaFields(
                    singletons = mapOf("sku" to arcs.core.data.FieldType.Int),
                    collections = emptyMap()
                )
            """.trimIndent())
    }

    @Test
    fun schemaFields_collections() {
        assertThat(
            SchemaFields(emptyMap(), collections = mapOf("bananas" to FieldType.Text))
                .toGeneration().toString()
        )
            .isEqualTo("""
                arcs.core.data.SchemaFields(
                    singletons = emptyMap(),
                    collections = mapOf("bananas" to arcs.core.data.FieldType.Text)
                )
            """.trimIndent())
    }

    @Test
    fun fieldType_primitives() {
        assertThat(FieldType.Boolean.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Boolean")
        assertThat(FieldType.Number.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Number")
        assertThat(FieldType.Text.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Text")
        assertThat(FieldType.Byte.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Byte")
        assertThat(FieldType.Short.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Short")
        assertThat(FieldType.Int.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Int")
        assertThat(FieldType.Long.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Long")
        assertThat(FieldType.Char.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Char")
        assertThat(FieldType.Float.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Float")
        assertThat(FieldType.Double.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Double")
        assertThat(FieldType.BigInt.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.BigInt")
    }

    @Test
    fun fieldType_inlineEntity() {
        assertThat(FieldType.InlineEntity("someHash").toGeneration().toString())
            .isEqualTo("""arcs.core.data.FieldType.InlineEntity("someHash")""")
    }

    @Test
    fun fieldType_entityRef() {
        assertThat(FieldType.EntityRef("someHash").toGeneration().toString())
            .isEqualTo("""arcs.core.data.FieldType.EntityRef("someHash")""")
    }

    @Test
    fun fieldType_tuple() {
        assertThat(
            FieldType.Tuple(listOf(FieldType.Number, FieldType.BigInt))
                .toGeneration()
                .toString()
        )
            .isEqualTo(
                "arcs.core.data.FieldType.Tuple(" +
                    "listOf(arcs.core.data.FieldType.Number, arcs.core.data.FieldType.BigInt))"
            )
        assertThat(
            FieldType.Tuple(listOf(FieldType.Char, FieldType.EntityRef("anotherHash")))
                .toGeneration()
                .toString()
        )
            .isEqualTo(
                "arcs.core.data.FieldType.Tuple(" +
                    "listOf(arcs.core.data.FieldType.Char, " +
                    "arcs.core.data.FieldType.EntityRef(\"anotherHash\")))"
            )
        assertThat(
            FieldType.Tuple(
                listOf(
                    FieldType.Tuple(listOf(FieldType.Boolean, FieldType.Byte)),
                    FieldType.EntityRef("anotherHash")
                )
            ).toGeneration().toString()
        )
            .isEqualTo(
                "arcs.core.data.FieldType.Tuple(" +
                    "listOf(arcs.core.data.FieldType.Tuple(" +
                    "listOf(arcs.core.data.FieldType.Boolean, arcs.core.data.FieldType.Byte)" +
                    "), arcs.core.data.FieldType.EntityRef(\"anotherHash\")))"
            )
    }

    @Test
    fun fieldType_listOf() {
        assertThat(FieldType.ListOf(FieldType.Boolean).toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.ListOf(arcs.core.data.FieldType.Boolean)")
        assertThat(
            FieldType.ListOf(FieldType.EntityRef("yetAnotherHash"))
                .toGeneration()
                .toString())
            .isEqualTo(
                "arcs.core.data.FieldType.ListOf(" +
                    "arcs.core.data.FieldType.EntityRef(\"yetAnotherHash\"))"
            )
    }
}

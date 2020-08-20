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
import com.squareup.kotlinpoet.buildCodeBlock
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
            buildHandleBlock(
                Recipe.Handle(
                    name = "foo",
                    fate = Recipe.Handle.Fate.CREATE,
                    type = entity,
                    storageKey = "AKey"
                )
            ).toString().normalize()
        ).isEqualTo(
            """
            arcs.core.data.Plan.Handle(
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
            buildHandleBlock(
               Recipe.Handle(
                   name = "foo",
                   fate = Recipe.Handle.Fate.CREATE,
                   type = entity,
                   storageKey = "AKey"
               )
            ).toString().normalize()
        ).contains("""storageKey=arcs.core.storage.StorageKeyParser.parse("AKey")""")

        assertThat(
            buildHandleBlock(
                Recipe.Handle(
                    name = "foo",
                    fate = Recipe.Handle.Fate.CREATE,
                    type = entity,
                    storageKey = null
                )
            ).toString().normalize()
        ).contains("""storageKey=arcs.core.data.CreatableStorageKey("foo")""")
    }

    @Test
    fun type_entity() {
        assertThat(
            buildTypeBlock(entity).toString().normalize()
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
            buildTypeBlock(SingletonType(entity)).toString().normalize()
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
            buildTypeBlock(CollectionType(entity)).toString().normalize()
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
            buildTypeBlock(ReferenceType(entity)).toString().normalize()
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
            buildTypeBlock(
                TupleType(listOf(SingletonType(entity), SingletonType(entity)))
            ).toString().normalize()
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
            buildTypeBlock(
                TypeVariable("a", SingletonType(entity))
            ).toString().normalize()
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
            buildTypeBlock(TypeVariable("a")).toString().normalize()
        ).isEqualTo("""arcs.core.data.TypeVariable("a", null, false)""".normalize())
    }

    @Test
    fun type_variable_maxAccess() {
        assertThat(
            buildTypeBlock(
                TypeVariable("a", SingletonType(entity), true)
            ).toString().normalize()
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
            buildTypeBlock(
                TupleType(
                    listOf(
                        CollectionType(ReferenceType(entity)),
                        TypeVariable("a", SingletonType(entity), true),
                        CountType()
                    )
                )
            ).toString().normalize()
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
        assertThat(buildSchemaBlock(Schema.EMPTY).toString())
            .isEqualTo("""arcs.core.data.Schema.EMPTY""")
    }

    @Test
    fun schema_nameOnly() {
        val schemaGen = buildSchemaBlock(schema).toString()
        assertThat(schemaGen).contains("SchemaName(\"Foo\")")
        assertThat(schemaGen).contains("hash = \"fooHash\"")
}

    @Test
    fun schemaFields_empty() {
        assertThat(
            buildSchemaFieldsBlock(SchemaFields(emptyMap(), emptyMap())).toString()
        )
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
            buildSchemaFieldsBlock(
                SchemaFields(singletons = mapOf("sku" to FieldType.Int), collections = emptyMap())
            ).toString()
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
            buildSchemaFieldsBlock(
                SchemaFields(emptyMap(), collections = mapOf("bananas" to FieldType.Text))
            ).toString()
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
        assertThat(buildFieldTypeBlock(FieldType.Boolean).toString())
            .isEqualTo("arcs.core.data.FieldType.Boolean")
        assertThat(buildFieldTypeBlock(FieldType.Number).toString())
            .isEqualTo("arcs.core.data.FieldType.Number")
        assertThat(buildFieldTypeBlock(FieldType.Text).toString())
            .isEqualTo("arcs.core.data.FieldType.Text")
        assertThat(buildFieldTypeBlock(FieldType.Byte).toString())
            .isEqualTo("arcs.core.data.FieldType.Byte")
        assertThat(buildFieldTypeBlock(FieldType.Short).toString())
            .isEqualTo("arcs.core.data.FieldType.Short")
        assertThat(buildFieldTypeBlock(FieldType.Int).toString())
            .isEqualTo("arcs.core.data.FieldType.Int")
        assertThat(buildFieldTypeBlock(FieldType.Long).toString())
            .isEqualTo("arcs.core.data.FieldType.Long")
        assertThat(buildFieldTypeBlock(FieldType.Char).toString())
            .isEqualTo("arcs.core.data.FieldType.Char")
        assertThat(buildFieldTypeBlock(FieldType.Float).toString())
            .isEqualTo("arcs.core.data.FieldType.Float")
        assertThat(buildFieldTypeBlock(FieldType.Double).toString())
            .isEqualTo("arcs.core.data.FieldType.Double")
        assertThat(buildFieldTypeBlock(FieldType.BigInt).toString())
            .isEqualTo("arcs.core.data.FieldType.BigInt")
    }

    @Test
    fun fieldType_inlineEntity() {
        assertThat(buildFieldTypeBlock(FieldType.InlineEntity("someHash")).toString())
            .isEqualTo("""arcs.core.data.FieldType.InlineEntity("someHash")""")
    }

    @Test
    fun fieldType_entityRef() {
        assertThat(buildFieldTypeBlock(FieldType.EntityRef("someHash")).toString())
            .isEqualTo("""arcs.core.data.FieldType.EntityRef("someHash")""")
    }

    @Test
    fun fieldType_tuple() {
        assertThat(
            buildFieldTypeBlock(
                FieldType.Tuple(listOf(FieldType.Number, FieldType.BigInt))
            ).toString()
        )
            .isEqualTo(
                "arcs.core.data.FieldType.Tuple(" +
                    "listOf(arcs.core.data.FieldType.Number, arcs.core.data.FieldType.BigInt))"
            )
        assertThat(
            buildFieldTypeBlock(
                FieldType.Tuple(listOf(FieldType.Char, FieldType.EntityRef("anotherHash")))
            ).toString()
        )
            .isEqualTo(
                "arcs.core.data.FieldType.Tuple(" +
                    "listOf(arcs.core.data.FieldType.Char, " +
                    "arcs.core.data.FieldType.EntityRef(\"anotherHash\")))"
            )
        assertThat(
            buildFieldTypeBlock(
                FieldType.Tuple(
                    listOf(
                        FieldType.Tuple(listOf(FieldType.Boolean, FieldType.Byte)),
                        FieldType.EntityRef("anotherHash")
                    )
                )
            ).toString()
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
        assertThat(buildFieldTypeBlock(FieldType.ListOf(FieldType.Boolean)).toString())
            .isEqualTo("arcs.core.data.FieldType.ListOf(arcs.core.data.FieldType.Boolean)")
        assertThat(
            buildFieldTypeBlock(FieldType.ListOf(FieldType.EntityRef("yetAnotherHash")))
                .toString())
            .isEqualTo(
                "arcs.core.data.FieldType.ListOf(" +
                    "arcs.core.data.FieldType.EntityRef(\"yetAnotherHash\"))"
            )
    }
}

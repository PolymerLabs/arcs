package arcs.tools

import arcs.core.data.CountType
import arcs.core.data.CreatableStorageKey
import arcs.core.data.EntityType
import arcs.core.data.FieldName
import arcs.core.data.FieldType
import arcs.core.data.Plan
import arcs.core.data.Recipe
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.TupleType
import arcs.core.data.TypeVariable
import arcs.core.storage.StorageKeyParser
import arcs.core.type.Type
import com.squareup.kotlinpoet.CodeBlock
import com.squareup.kotlinpoet.FileSpec
import com.squareup.kotlinpoet.PropertySpec
import com.squareup.kotlinpoet.buildCodeBlock

/**
 * Adds a code-generated [Plan] to a [FileSpec.Builder].
 *
 * Will also add code-generated [Plan.Handle] properties to the file.
 *
 * @param recipe [Recipe] source for [Plan] conversion.
 * @return self, with code-generated [Plan] and [Plan.Handle]s.
 */
fun FileSpec.Builder.addRecipe(recipe: Recipe): FileSpec.Builder {
    val handles = recipe.handles.values.map {
        PropertySpec.builder("${recipe.name}_${it.name}", Plan.Handle::class)
            .initializer(CodeBlock.builder().addHandle(it).build())
            .build()
    }

    val ctx = mapOf(
        "plan" to Plan::class,
        "handles" to handles.toGeneration("%N"),
        // TODO(161940699) Generate particles
        "particles" to listOf<Recipe.Particle>().toGeneration(),
        // TODO(161940729) Generate Annotations
        "annotations" to listOf<Annotation>().toGeneration()
    )
    val plan = PropertySpec.builder("${name}Plan", Plan::class)
        .initializer(buildCodeBlock {
            addNamed(
                """
                %plan:T(
                    particles = %particles:L,
                    handles = %handles:L,
                    annotations = %annotations:L
                )
                """.trimIndent(),
                ctx
            )
        })
        .build()

    handles.forEach { this.addProperty(it) }
    this.addProperty(plan)
    return this
}

/**
 * Adds a code-generated [Plan.Handle] to a [CodeBlock.Builder].
 *
 * @param handle a source [Recipe.Handle] for conversion.
 * @return self, with a code-generated [Plan.Handle] instance.
 */
fun CodeBlock.Builder.addHandle(handle: Recipe.Handle): CodeBlock.Builder = with(handle) {
    val ctx = mapOf(
        "handle" to Plan.Handle::class,
        // TODO(161941222) verify join handles work
        "storageParser" to StorageKeyParser::class,
        "key" to storageKey,
        "type" to buildCodeBlock { addType(type) },
        "annotations" to emptyList<Annotation>().toGeneration(),
        "creatable" to CreatableStorageKey::class,
        "name" to name
    )
    val storageKeyTemplate = storageKey
        ?.let { "storageKey = %storageParser:T.parse(%key:S)," }
        ?: "storageKey = %creatable:T(%name:S),"

    this@addHandle.addNamed(
        """
        %handle:T(
            $storageKeyTemplate
            type = %type:L,    
            annotations = %annotations:L
        )
        """.trimIndent(),
        ctx
    )
}

/** Code-generates [Type] within [CodeBlock]. */
fun CodeBlock.Builder.addType(type: Type): CodeBlock.Builder = when (type) {
    is EntityType -> add(
        "%T(%L)",
        EntityType::class,
        buildCodeBlock { addSchema(type.entitySchema) }
    )
    is Type.TypeContainer<*> -> add(
        "%T(%L)",
        type::class,
        buildCodeBlock { addType(type.containedType) })
    is CountType -> add("%T()", CountType::class)
    is TupleType -> add(
        "%T(%L)",
        TupleType::class,
        type.elementTypes.toGeneration { builder, item ->
            builder.add(buildCodeBlock { addType(item) })
        }
    )
    is TypeVariable -> add(
        "%T(%S, %L, %L)",
        TypeVariable::class,
        type.name,
        type.constraint?.let { buildCodeBlock { addType(it) } },
        type.maxAccess
    )
    else -> throw IllegalArgumentException("[Type] $type is not supported.")
}

/** Code-generates [Schema] within a [CodeBlock]. */
fun CodeBlock.Builder.addSchema(schema: Schema): CodeBlock.Builder {
    if (Schema.EMPTY == schema) {
        add("%T.EMPTY", Schema::class)
        return this
    }
    val ctx = mapOf(
        "schema" to Schema::class,
        "names" to schema.names.toGeneration { builder, item ->
            builder.add("%T(%S)", SchemaName::class, item.name)
        },
        "fields" to schema.fields.toGeneration(),
        "hash" to schema.hash
    )
    addNamed(
        """
        %schema:T(
            names = %names:L,
            fields = %fields:L,
            hash = %hash:S
        )
        """.trimIndent(),
        ctx
    )
    return this
}

/** Converts [SchemaFields] object into code-generated instances. */
fun SchemaFields.toGeneration() = buildCodeBlock {
    val fields = this@toGeneration
    val toSchemaField = { builder: CodeBlock.Builder, entry: Map.Entry<FieldName, FieldType> ->
        builder.add("%S to %L", entry.key, entry.value.toGeneration())
        Unit
    }
    val ctx = mapOf(
        "fields" to SchemaFields::class,
        "singletons" to fields.singletons.toGeneration(toSchemaField),
        "collections" to fields.collections.toGeneration(toSchemaField)
    )
    addNamed(
        """
        %fields:T(
            singletons = %singletons:L,
            collections = %collections:L
        )
        """.trimIndent(),
        ctx
    )
}

/** Converts [FieldType] into a code-generated instance. */
fun FieldType.toGeneration(): CodeBlock = buildCodeBlock {
    when (val field = this@toGeneration) {
        is FieldType.Primitive -> add(
            "%T.%L",
            FieldType::class,
            field.primitiveType
        )
        is FieldType.EntityRef -> add(
            "%T(%S)",
            field::class,
            field.schemaHash
        )
        is FieldType.InlineEntity -> add(
            "%T(%S)",
            field::class,
            field.schemaHash
        )
        is FieldType.Tuple -> add(
            "%T(%L)",
            FieldType.Tuple::class,
            field.types.toGeneration { builder, item ->
                builder.add(item.toGeneration())
            }
        )
        is FieldType.ListOf -> add(
            "%T(%L)",
            FieldType.ListOf::class,
            field.primitiveType.toGeneration()
        )
    }
}

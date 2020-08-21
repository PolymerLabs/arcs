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
 * Adds a code-generated [Plan] to a [FileSpec].
 *
 * Will also add code-generated [Plan.Handle] properties to the file.
 *
 * @param recipe [Recipe] source for [Plan] conversion.
 * @return self, with code-generated [Plan] and [Plan.Handle]s.
 */
fun FileSpec.Builder.addRecipe(recipe: Recipe): FileSpec.Builder {
    val handles = recipe.handles.values.map {
        PropertySpec.builder("${recipe.name}_${it.name}", Plan.Handle::class)
            .initializer(buildHandleBlock(it))
            .build()
    }

    val ctx = mapOf(
        "plan" to Plan::class,
        "handles" to buildCollectionBlock(handles, "%N"),
        // TODO(161940699) Generate particles
        "particles" to buildCollectionBlock(listOf<Recipe.Particle>()),
        // TODO(161940729) Generate Annotations
        "annotations" to buildCollectionBlock(listOf<Annotation>())
    )
    val plan = PropertySpec.builder("${recipe.name}Plan", Plan::class)
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
 * Adds a code-generated [Plan.Handle] to a [CodeBlock].
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
        "type" to buildTypeBlock(type),
        "annotations" to buildCollectionBlock(emptyList<Annotation>()),
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

/** Shorthand for building a [CodeBlock] with a code-generated [Plan.Handle]. */
fun buildHandleBlock(handle: Recipe.Handle): CodeBlock = buildCodeBlock { addHandle(handle) }

/** Code-generates a [Type] within a [CodeBlock]. */
fun CodeBlock.Builder.addType(type: Type): CodeBlock.Builder = when (type) {
    is EntityType -> add("%T(%L)", EntityType::class, buildSchemaBlock(type.entitySchema))
    is Type.TypeContainer<*> -> add("%T(%L)", type::class, buildTypeBlock(type.containedType))
    is CountType -> add("%T()", CountType::class)
    is TupleType -> add(
        "%T(%L)",
        TupleType::class,
        buildCollectionBlock(type.elementTypes) { builder, item ->
            builder.add(buildTypeBlock(item))
        }
    )
    is TypeVariable -> add(
        "%T(%S, %L, %L)",
        TypeVariable::class,
        type.name,
        type.constraint?.let { buildTypeBlock(it) },
        type.maxAccess
    )
    else -> throw IllegalArgumentException("[Type] $type is not supported.")
}

/** Shorthand for building a [CodeBlock] with a code-generated [Type]. */
fun buildTypeBlock(type: Type): CodeBlock = buildCodeBlock { addType(type) }

/** Code-generates a [Schema] within a [CodeBlock]. */
fun CodeBlock.Builder.addSchema(schema: Schema): CodeBlock.Builder {
    if (Schema.EMPTY == schema) {
        add("%T.EMPTY", Schema::class)
        return this
    }
    val ctx = mapOf(
        "schema" to Schema::class,
        "names" to buildCollectionBlock(schema.names) { builder, item ->
            builder.add("%T(%S)", SchemaName::class, item.name)
        },
        "fields" to buildSchemaFieldsBlock(schema.fields),
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

/** Shorthand for building a [CodeBlock] with a code-generated [Schema]. */
fun buildSchemaBlock(schema: Schema): CodeBlock = buildCodeBlock { addSchema(schema) }

/** Code-generates [SchemaFields] within a [CodeBlock]. */
fun CodeBlock.Builder.addSchemaFields(fields: SchemaFields): CodeBlock.Builder {
    val toSchemaField = { builder: CodeBlock.Builder, entry: Map.Entry<FieldName, FieldType> ->
        builder.add("%S to %L", entry.key, buildFieldTypeBlock(entry.value))
        Unit
    }
    val ctx = mapOf(
        "fields" to SchemaFields::class,
        "singletons" to buildCollectionBlock(fields.singletons, toSchemaField),
        "collections" to buildCollectionBlock(fields.collections, toSchemaField)
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
    return this
}

/** Shorthand for building a [CodeBlock] with code-generated [SchemaFields]. */
fun buildSchemaFieldsBlock(schemaFields: SchemaFields): CodeBlock = buildCodeBlock {
    addSchemaFields(schemaFields)
}

/** Code-generates [FieldType] within a [CodeBlock]. */
fun CodeBlock.Builder.addFieldType(field: FieldType): CodeBlock.Builder = when (field) {
    is FieldType.Primitive -> add("%T.%L", FieldType::class, field.primitiveType)
    is FieldType.EntityRef -> add("%T(%S)", field::class, field.schemaHash)
    is FieldType.InlineEntity -> add("%T(%S)", field::class, field.schemaHash)
    is FieldType.Tuple -> add(
        "%T(%L)",
        FieldType.Tuple::class,
        buildCollectionBlock(field.types) { builder, item -> builder.addFieldType(item) }
    )
    is FieldType.ListOf -> add(
        "%T(%L)",
        FieldType.ListOf::class,
        buildFieldTypeBlock(field.primitiveType)
    )
}

/** Shorthand for building a [CodeBlock] with a code-generated [FieldType]. */
fun buildFieldTypeBlock(field: FieldType): CodeBlock = buildCodeBlock { addFieldType(field) }

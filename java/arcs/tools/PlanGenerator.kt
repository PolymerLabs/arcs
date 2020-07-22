package arcs.tools

import arcs.core.data.CountType
import arcs.core.data.EntityType
import arcs.core.data.FieldName
import arcs.core.data.FieldType
import arcs.core.data.Plan
import arcs.core.data.PrimitiveType
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

fun Recipe.toGeneration(builder: FileSpec.Builder) {
    val handles = this.handles.values.map { it.toGeneration(name.orEmpty()) }
    val ctx = mapOf<String, Any>(
        "plan" to Plan::class,
        "particles" to listOf<Recipe.Particle>().toGeneration(),
        "handles" to handles.toGeneration(),
        "annotations" to listOf<Annotation>().toGeneration()
    )
    val plan = PropertySpec.builder("${name}Plan", Plan::class)
        .initializer(buildCodeBlock {
            addNamed("""
                %plan:T(
                    particles = %particles:L,
                    handles = %handles:L,
                    annotations = %annotations:L
                )
                """.trimIndent(), ctx)
        })
        .build()

    handles.forEach { builder.addProperty(it) }
    builder.addProperty(plan)
}

fun Recipe.Particle.toGeneration() {}

fun Recipe.Handle.toGeneration(planName: String) = PropertySpec.builder("${planName}_$name", Plan.Handle::class)
    .initializer(buildCodeBlock {
        val ctx = mapOf<String, Any>(
            "handle" to Plan.Handle::class,
            // TODO(alxr) verify join handles work
            "storageParser" to StorageKeyParser::class,
            "key" to storageKey.orEmpty(),
            "type" to type.toGeneration(),
            "annotations" to "emptyList()"
        )
        addNamed("""
            %handle:T(
                storageKey = %storageParser:T.parse(%key:S),
                type = %type:L,    
                annotations = %annotations:L
            )
        """.trimIndent(), ctx)
    })
    .build()

fun Type.toGeneration(): CodeBlock = buildCodeBlock {
    when (val type = this@toGeneration) {
        is EntityType -> add("%T(%L)", EntityType::class, type.entitySchema.toGeneration())
        is Type.TypeContainer<*> -> add("%T(%L)", type::class, type.containedType.toGeneration())
        is CountType -> add("%T()", CountType::class)
        is TupleType -> add("%T(%L)", TupleType::class, type.elementTypes.toGeneration("%L"))
        is TypeVariable -> add("%T(%S, %L)", TypeVariable::class, type.name, type.constraint?.toGeneration())
        else -> throw IllegalArgumentException("[Type] $type is not supported.")
    }
}

fun Schema.toGeneration() = buildCodeBlock {
    val schema = this@toGeneration
    val ctx = mapOf<String, Any>(
        "schema" to Schema::class,
        "names" to schema.names.toGeneration { builder, item ->
            builder.add("%T(%S)", SchemaName::class, item.name)
        },
        "fields" to schema.fields.toGeneration(),
        "hash" to schema.hash
    )
    addNamed("""
        %schema:T(
            names = %names:L,
            fields = %fields:L,
            hash = %hash:S
        )
    """.trimIndent(), ctx)
}

fun SchemaFields.toGeneration() = buildCodeBlock {
    val fields = this@toGeneration
    val toSchemaField  = { builder: CodeBlock.Builder, entry: Map.Entry<FieldName, FieldType> ->
        builder.add("%S to %L", entry.key, entry.value.toGeneration())
        Unit
    }
    val ctx = mapOf<String, Any>(
        "fields" to SchemaFields::class,
        "singletons" to fields.singletons.toGeneration(toSchemaField),
        "collections" to fields.collections.toGeneration(toSchemaField)
    )
    addNamed("""
        %fields:T(
            singletons = %singletons:L,
            collections = %collections:L
        )
    """.trimIndent(), ctx)
}

fun FieldType.toGeneration(): CodeBlock = buildCodeBlock {
    when (val field = this@toGeneration) {
        is FieldType.Primitive -> add(
            "%T.%L",
            FieldType::class,
            field.primitiveType
        )
        is FieldType.InlineEntity,
        is FieldType.EntityRef -> add(
            "%T(%S)",
            field::class,
            (field as FieldType.EntityRef).schemaHash
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
            field.toGeneration()
        )
    }
}

fun Annotation.toGeneration() {}

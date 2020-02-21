package arcs.core.tools

import arcs.core.data.FieldType
import arcs.core.data.Manifest
import arcs.core.data.Schema
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.arguments.multiple
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.file
import com.squareup.kotlinpoet.ClassName
import com.squareup.kotlinpoet.CodeBlock
import com.squareup.kotlinpoet.PropertySpec
import java.io.File

class Proto2Schema : CliktCommand(
    help = """Generates Schemas and Types from a protobuf-serialized manifest.
    
    This script reads schemas from a serialized manifest and generates Kotlin `Schema` and `Type` 
    classes.""",
    printHelpOnEmptyArgs = true
) {

    val outdir by option(help = "output directory; defaults to '.'").file(fileOkay = false)
    val outfile by option(help = "output filename; if omitted")
    val packageName by option(help = "scope to specified package; default: 'arcs'").default("arcs")
    val protos by argument(help = "paths to protobuf-serialized manifests")
        .file(exists = true).multiple()

    /** Mock Proto2Schema: So far, this is equivalent to copy. */
    override fun run() {
        protos.forEach { protoFile ->
            val outFile = outputFile(protoFile)
            echo("$protoFile --> $outFile")

            val bytes = protoFile.readBytes()
            val manifest = Manifest.parseFrom(bytes)

            outFile.writeBytes(protoFile.readBytes())
        }
    }

    /** Produces a File object per user specification, or with default values. */
    fun outputFile(inputFile: File): File {
        val outputName = outfile ?: inputFile.nameWithoutExtension + ".kt"
        val outputPath = outdir ?: System.getProperty("user.dir")
        return File("$outputPath/$outputName")
    }

    fun formatName(name: String): String {
        return name[0].toLowerCase() + name.substring(1)
    }

    fun generateSchemas(schemas: List<Schema>): Iterable<PropertySpec> {
        var anons = 0
        val schemaClass = ClassName("arcs.core.data", "Schema")
        val schemaNameClass = ClassName("arcs.core.data", "SchemaName")
        val schemaFieldsClass = ClassName("arcs.core.data", "SchemaFields")
        return schemas.map {
            PropertySpec.builder("${formatName(it.name?.name
                ?: "anon${++anons}")}Schema", Schema::class)
                .initializer(CodeBlock.builder()
                    .addStatement("%T(", schemaClass)
                    .indent()
                    .addStatement("listOf(")
                    .indent()
                    .apply {
                        it.names.forEachIndexed { index, name ->
                            if (index > 0) addStatement(",%T(%S)", schemaNameClass, name.name)
                            else addStatement("%T(%S)", schemaNameClass, name.name)
                        }
                    }
                    .unindent()
                    .addStatement("),")
                    .addStatement("%T(", schemaFieldsClass)
                    .indent()
                    .addStatement("singletons = mapOf(")
                    .indent()
                    .apply {
                        val entries = it.fields.singletons.entries
                        entries.forEachIndexed { index, entry ->
                            when (entry.value.tag) {
                                FieldType.Tag.EntityRef -> add(
                                    "%S to %T(%S)",
                                    entry.key,
                                    FieldType.EntityRef::class,
                                    (entry.value as FieldType.EntityRef).schemaHash
                                )
                                FieldType.Tag.Primitive -> add(
                                    "%S to %T.%L",
                                    entry.key,
                                    FieldType::class,
                                    (entry.value as FieldType.Primitive).primitiveType
                                )
                            }
                            if (index != entries.size - 1) add(",")
                            add("\n")
                        }
                    }
                    .unindent()
                    .addStatement("),")
                    .addStatement("collections = mapOf(")
                    .indent()
                    .apply {
                        val entries = it.fields.collections.entries
                        entries.forEachIndexed { index, entry ->
                            when (entry.value.tag) {
                                FieldType.Tag.EntityRef -> add(
                                    "%S to %T(%S)",
                                    entry.key,
                                    FieldType.EntityRef::class,
                                    (entry.value as FieldType.EntityRef).schemaHash
                                )
                                FieldType.Tag.Primitive -> add(
                                    "%S to %T.%L",
                                    entry.key,
                                    FieldType::class,
                                    (entry.value as FieldType.Primitive).primitiveType
                                )
                            }
                            if (index != entries.size - 1) add(",")
                            add("\n")
                        }
                    }
                    .unindent()
                    .addStatement(")")
                    .unindent()
                    .addStatement("),")
                    .addStatement("%S", it.hash)
                    .addStatement(")")
                    .build())
                .build()
        }
    }
}

fun main(args: Array<String>) = Proto2Schema().main(args)

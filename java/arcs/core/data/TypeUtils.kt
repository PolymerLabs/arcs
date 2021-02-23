package arcs.core.data

import arcs.core.data.expression.Expression
import arcs.core.data.expression.InferredType
import arcs.core.data.expression.MapScope
import arcs.core.data.expression.ParameterScope
import arcs.core.data.expression.TypeEvaluator
import arcs.core.type.Type

private val primitiveToInferred = mapOf(
  FieldType.Boolean to InferredType.Primitive.BooleanType,
  FieldType.Long to InferredType.Primitive.LongType,
  FieldType.Int to InferredType.Primitive.IntType,
  FieldType.BigInt to InferredType.Primitive.BigIntType,
  FieldType.Byte to InferredType.Primitive.ByteType,
  FieldType.Short to InferredType.Primitive.ShortType,
  FieldType.Char to InferredType.Primitive.ShortType,
  FieldType.Float to InferredType.Primitive.FloatType,
  FieldType.Double to InferredType.Primitive.DoubleType,
  FieldType.Number to InferredType.Primitive.NumberType,
  FieldType.Text to InferredType.Primitive.TextType,
  FieldType.Instant to InferredType.Primitive.LongType
)

private val tupleOrdinals = listOf("first", "second", "third", "fourth", "fifth")

private fun mapPrimitiveTypeToInferredType(fieldType: FieldType) =
  requireNotNull(primitiveToInferred[fieldType]) {
    "$fieldType can't be mapped to InferredType"
  }

private fun mapTupleToInferredType(fieldName: String, fieldType: FieldType.Tuple) =
  InferredType.ScopeType(
    MapScope<InferredType>(
      fieldName,
      fieldType.types.mapIndexed { index, tupleType ->
        require(index < tupleOrdinals.size) {
          "Tuple of size ${fieldType.types.size} not supported, 5 is the maximum tuple size."
        }
        tupleOrdinals[index] to mapFieldTypeToInferredType(tupleOrdinals[index], tupleType)
      }.associateBy({ it.first }, { it.second })
    )
  )

private fun mapFieldTypeToInferredType(fieldName: String, fieldType: FieldType): InferredType {
  return when (fieldType) {
    is FieldType.Primitive -> mapPrimitiveTypeToInferredType(fieldType)
    is FieldType.EntityRef -> mapSchemaToInferredType(
      SchemaRegistry.getSchema(fieldType.schemaHash)
    )
    is FieldType.Tuple -> mapTupleToInferredType(fieldName, fieldType)
    is FieldType.ListOf -> mapListTypeToInferredType(fieldName, fieldType)
    is FieldType.InlineEntity -> mapSchemaToInferredType(
      SchemaRegistry.getSchema(fieldType.schemaHash)
    )
    is FieldType.NullableOf -> mapNullableTypeToInferredType(fieldName, fieldType)
  }
}

private fun mapListTypeToInferredType(fieldName: String, fieldType: FieldType.ListOf) =
  InferredType.SeqType(mapFieldTypeToInferredType(fieldName, fieldType.primitiveType))

private fun mapNullableTypeToInferredType(fieldName: String, fieldType: FieldType.NullableOf) =
  InferredType.UnionType(setOf(
    mapFieldTypeToInferredType(fieldName, fieldType.innerType),
    InferredType.Primitive.NullType
  ))

private fun mapSchemaToInferredType(schema: Schema): InferredType {
  val allFields = schema.fields.singletons.entries + schema.fields.collections.entries
  return InferredType.ScopeType(
    MapScope(
      schema.names.firstOrNull()?.name ?: "*",
      allFields.map { (field, ftype) ->
        val inferredType = mapFieldTypeToInferredType(field, ftype)
        field to if (field in schema.fields.singletons) inferredType else InferredType.SeqType(
          inferredType
        )
      }.associateBy({ it.first }, { it.second })
    )
  )
}

/** VisibleForTesting */
fun mapTypeToInferredType(type: Type): InferredType = when (type) {
  is CollectionType<*> -> InferredType.SeqType(mapTypeToInferredType(type.containedType))
  is SingletonType<*> -> mapTypeToInferredType(type.containedType)
  is ReferenceType<*> -> mapTypeToInferredType(type.containedType)
  is MuxType<*> -> mapTypeToInferredType(type.containedType)
  is EntityType -> mapSchemaToInferredType(type.entitySchema)
  else -> throw IllegalArgumentException("Can't map type $type to InferredType")
}

/** Map [Type] to [InferredType] recursively creating sub-scopes as needed. */
fun constructTypeScope(map: Map<String, Type>) =
  MapScope("root", map.mapValues { mapTypeToInferredType(it.value) })

/**
 * Typecheck a paxel [Expression] against a [Scope] of [InferredType].
 *
 * @param [name] name of the connection being checked.
 * @param [expr] is the expression to check.
 * @param [typeScope] usually from [constructTypeScope] from readable HandleConnection connections.
 * @param [param] is a Scope of [InferredType] for any query parameters the expression may refer to.
 * @param [expectedType] [HandleConnection] [Type] the Paxel expression should be assignable to.
 * @return a list of warnings if succeeded
 * @throws PaxelTypeException if any errors occur.
 */
fun typeCheck(
  name: String,
  expr: Expression<*>,
  typeScope: Expression.Scope,
  expectedType: Type,
  params: Expression.Scope = ParameterScope()
): List<String> {
  val typeEvaluator = TypeEvaluator(params)
  try {
    val inferredType = expr.accept(typeEvaluator, typeScope)
    val expectedInferredType = mapTypeToInferredType(expectedType)
    if (!expectedInferredType.isAssignableFrom(inferredType)) {
      throw PaxelTypeException(
        "Handle $name expected $expectedInferredType but found $inferredType", listOf()
      )
    }
  } catch (e: Exception) {
    if (typeEvaluator.errors.isNotEmpty()) {
      throw PaxelTypeException("Handle $name has errors:", typeEvaluator.errors)
    } else {
      throw e
    }
  }

  return typeEvaluator.warnings
}

/** Throw if any errors occur during type checking of a paxel expression. */
class PaxelTypeException(msg: String, val errors: List<String>) :
  Exception("$msg ${errors.joinToString(prefix = "\n  ", separator = "\n  ")}")

/**
 * If this Type represents a [SingletonType], [CollectionType], or [EntityType], return the
 * [Schema] used by the underlying [Entity] that this type represents.
 */
fun Type.toSchema(): Schema {
  val maybeSchema = when (this) {
    is EntitySchemaProviderType -> entitySchema
    else -> null
  }
  return requireNotNull(maybeSchema) {
    "Type $this has no schema"
  }
}

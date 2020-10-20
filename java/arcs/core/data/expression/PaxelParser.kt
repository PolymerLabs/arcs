/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.data.expression

import arcs.core.data.expression.Expression.FieldExpression
import arcs.core.data.expression.Expression.QualifiedExpression
import arcs.core.data.expression.Expression.Scope
import arcs.core.util.AnyOfParser
import arcs.core.util.BigInt
import arcs.core.util.Grammar
import arcs.core.util.ParseResult
import arcs.core.util.Parser
import arcs.core.util.ParserException
import arcs.core.util.div
import arcs.core.util.eof
import arcs.core.util.many
import arcs.core.util.map
import arcs.core.util.optional
import arcs.core.util.parser
import arcs.core.util.plus
import arcs.core.util.regex
import arcs.core.util.toBigInt
import arcs.core.util.token
import arcs.core.util.unaryMinus

/**
 * A parser combinator implementation of the Paxel expression parser.
 */
object PaxelParser : Grammar<Expression<Any>>() {
  private const val WS = "[\\s\\n]"

  sealed class DiscreteType<T : Number> {
    object PaxelBigInt : DiscreteType<BigInt>() {
      override fun parse(number: String) = BigInt(number)
    }

    object PaxelInt : DiscreteType<Int>() {
      override fun parse(number: String) = number.toInt()
    }

    object PaxelLong : DiscreteType<Long>() {
      override fun parse(number: String) = number.toLong()
    }

    abstract fun parse(number: String): T
  }

  sealed class Unit(val conversionFactor: Int) {
    open fun convert(number: Number): Number = when (number) {
      is BigInt -> number.multiply(conversionFactor.toBigInt())
      is Long -> number * conversionFactor
      is Double -> number * conversionFactor.toDouble()
      else -> number.toLong() * conversionFactor
    }

    object Identity : Unit(1) {
      override fun convert(number: Number) = number
    }

    object Millisecond : Unit(1)
    object Second : Unit(1000)
    object Minute : Unit(Second.conversionFactor * 60)
    object Hour : Unit(Minute.conversionFactor * 60)
    object Day : Unit(Hour.conversionFactor * 24)
  }

  private val whitespace = -regex("($WS+)")
  private val oCurly by -regex("(\\{$WS*)")
  private val cCurly by -regex("($WS*\\})")
  private val comma by -regex("($WS*,$WS*)")
  private val colon by -regex("($WS*:$WS*)")

  private val units by
    optional(whitespace +
      (regex("(millisecond)s?").map { Unit.Millisecond } /
        regex("(second)s?").map { Unit.Second } /
        regex("(minute)s?").map { Unit.Minute } /
        regex("(hour)s?").map { Unit.Hour } /
        regex("(day)s?").map { Unit.Day }
        )
    ).map {
      it ?: Unit.Identity
    }

  private val typeIdentifier by
  token("n").map { DiscreteType.PaxelBigInt } /
    token("i").map { DiscreteType.PaxelInt } /
    token("l").map { DiscreteType.PaxelLong }

  private val discreteValue by
  (regex("(-?[0-9]+)") + typeIdentifier + units).map { (number, type, units) ->
    Expression.NumberLiteralExpression(units.convert(type.parse(number)))
  }

  // IEEE-754 float: +-[integralPart].[fractionPart]e+-[exponent]
  private val numberValue by (regex("([+-]?[0-9]+\\.?[0-9]*(?:[eE][+-]?[0-9]+)?)") + units)
    .map { (number, units) ->
      Expression.NumberLiteralExpression(units.convert(number.toDouble()))
    }

  private val booleanValue by
  token("true").map { true.asExpr() } / token("false").map { false.asExpr() }

  private val nullValue by token("null").map { nullExpr() }

  // JSON-style string: all legal chars but ' or \, otherwise \'\b\n\r\f\t \\ and \u{hex} allowed
  private val textValue by regex("\'((?:[^\'\\\\]|\\\\[\'\\\\/bfnrt]|\\\\u[0-9a-f]{4})*)\'").map {
    Expression.TextLiteralExpression(unescape(it))
  }

  private val ident by regex("((?!from|select|let|orderby|where)[A-Za-z_][A-Za-z0-9_]*)")

  // optional whitespace
  private val ows by -regex("($WS*)")

  private val functionArguments: Parser<List<Expression<Any>>> by optional(
    parser(::paxelExpression) + many(-regex("($WS*,$WS*)") + parser(::paxelExpression))
  ).map {
    it?.let { (arg, rest) ->
      listOf(arg) + rest
    } ?: emptyList()
  }

  private val functionCall by
  (ident + -(token("(") + ows) + functionArguments + -(ows + token(")"))).map { (id, args) ->
    Expression.FunctionExpression<Any>(
      maybeFail("unknown function name $id") {
        GlobalFunction.of(id)
      }, args
    )
  }

  private val scopeQualifier by
  functionCall / ident.map { FieldExpression<Any>(null, it, false) } /
    parser(::nestedExpression)

  @Suppress("UNCHECKED_CAST")
  @OptIn(ExperimentalStdlibApi::class)
  private val scopeLookup by
  (scopeQualifier + many((token("?.") / token(".")) + ident)).map { (initial, rest) ->
    rest.fold(initial) { qualifier, (operator, id) ->
      FieldExpression<Scope>(qualifier as Expression<Scope>, id, operator == "?.")
    }
  }

  private val query by regex("\\?([a-zA-Z_][a-zA-Z0-9_]*)").map {
    Expression.QueryParameterExpression<Any>(it)
  }

  private val nestedExpression by
  -regex("(\\($WS*)") + parser(::paxelExpression) + -regex("($WS*\\))")

  @Suppress("UNCHECKED_CAST")
  private val unaryOperation by
  ((token("not ") / token("-")) + ows + parser(::primaryExpression)).map { (token, expr) ->
    Expression.UnaryExpression(
      Expression.UnaryOp.fromToken(token.trim()) as Expression.UnaryOp<Any?, Any?>, expr
    )
  }

  private val primaryExpression: Parser<Expression<Any?>> by
  discreteValue /
    numberValue /
    unaryOperation /
    booleanValue /
    textValue /
    nullValue /
    scopeLookup /
    query

  private val multiplyExpression by primaryExpression sepBy binaryOp("*", "/")
  private val additiveExpression by multiplyExpression sepBy binaryOp("+", "-")
  private val ifNullExpression by additiveExpression sepBy binaryOp("?:")
  private val comparativeExpression by ifNullExpression sepBy binaryOp("<=", "<", ">=", ">")
  private val equalityExpression by comparativeExpression sepBy binaryOp("==", "!=")
  private val andExpression by equalityExpression sepBy binaryOp("and ")
  private val orExpression by andExpression sepBy binaryOp("or ")

  private val refinementExpression by orExpression

  private val sourceExpression by scopeLookup / nestedExpression

  private val fromIter by -token("from") + (whitespace + ident + whitespace)
  private val fromIn by -token("in") + (whitespace + sourceExpression)

  @Suppress("UNCHECKED_CAST")
  private val fromExpression: Parser<QualifiedExpression> by
  (fromIter + fromIn).map { (iter, src) ->
    Expression.FromExpression(null, src as Expression<Sequence<Any>>, iter)
  }

  @Suppress("UNCHECKED_CAST")
  private val whereExpression: Parser<QualifiedExpression> by
  -token("where") + (whitespace + refinementExpression).map { expr ->
    Expression.WhereExpression(
      expr as Expression<Sequence<Scope>>, expr as Expression<Boolean>
    )
  }

  private val letVar by -token("let") + (whitespace + ident + ows)
  private val letSource by -token("=") + (whitespace + sourceExpression)

  @Suppress("UNCHECKED_CAST")
  private val letExpression: Parser<QualifiedExpression> by
  (letVar + letSource).map { (varName, src) ->
    Expression.LetExpression(
      src as Expression<Sequence<Scope>>,
      src as Expression<Any>,
      varName
    )
  }

  private val orderDirection by optional(ows + (token("descending") / token("ascending"))).map {
    it?.let { dir -> dir == "descending" } ?: false
  }

  @Suppress("UNCHECKED_CAST")
  private val selectorExpression by (refinementExpression + orderDirection).map { (expr, dir) ->
    Expression.OrderByExpression.Selector(expr as Expression<Any>, dir)
  }

  private val orderBySelectors by
  (selectorExpression + many(comma + selectorExpression)).map { (first, rest) ->
    listOf(first) + rest
  }

  @Suppress("UNCHECKED_CAST")
  private val orderByExpression by -token("orderby") +
    (whitespace + orderBySelectors).map { selectors ->
      Expression.OrderByExpression<Any>(
        selectors[0].expr as Expression<Sequence<Scope>>,
        selectors
      )
    }

  private val schemaNames by (ident + many(whitespace + ident)).map { (ident, rest) ->
    setOf(ident) + rest.toSet()
  }

  private val newField by (ident + colon + parser(::paxelExpression))
  private val newFields by optional(newField + many(comma + newField)).map { fields ->
    fields?.let { (name, expr, otherFields) ->
      listOf(name to expr) + otherFields
    } ?: emptyList()
  }
  private val newFieldsDecl by oCurly + newFields + cCurly

  private val newExpression: Parser<Expression<Any>> by
  (-token("new") + (whitespace + schemaNames) + ows + newFieldsDecl).map { (names, fields) ->
    Expression.NewExpression(names, fields)
  }

  private val selectExprArg by newExpression / refinementExpression

  @Suppress("UNCHECKED_CAST")
  private val selectExpression: Parser<QualifiedExpression> by
  -token("select") + (ows + selectExprArg).map { expr ->
    Expression.SelectExpression(expr as Expression<Sequence<Scope>>, expr)
  }

  private val qualifiedExpression: Parser<QualifiedExpression> by
  (fromExpression / whereExpression / letExpression / orderByExpression)

  private val expressionWithQualifier by
    (fromExpression + many(ows + qualifiedExpression) + selectExpression)
      .map { (first, rest, select) ->
        val all: List<QualifiedExpression> = listOf(first) + rest + listOf(select)
        val nullQualifier: QualifiedExpression? = null
        all.fold(nullQualifier) { qualifier: QualifiedExpression?, qualified: QualifiedExpression ->
          qualified.withQualifier(qualifier)
        }
      }

  @Suppress("UNCHECKED_CAST")
  private val paxelExpression by
  (newExpression / expressionWithQualifier / refinementExpression) as Parser<Expression<Any>>

  override val topLevel by paxelExpression + ows + eof

  @Suppress("UNCHECKED_CAST")
  private fun binaryOp(vararg tokens: String) = ows + AnyOfParser(
    tokens.map { token(it) }.toList()
  ).map { token ->
    Expression.BinaryOp.fromToken(token.trim()) as Expression.BinaryOp<Any?, Any?, Any?>
  }

  private infix fun Parser<Expression<Any?>>.sepBy(
    tokens: Parser<Expression.BinaryOp<Any?, Any?, Any?>>
  ) = (this + many(tokens + ows + this)).map { (left, rest) ->
    rest.fold(left) { lhs, (op, rhs) ->
      Expression.BinaryExpression(op, lhs, rhs)
    }
  }

  private fun <T> maybeFail(msg: String, block: () -> T) = try {
    block()
  } catch (e: Exception) {
    throw ParserException(msg, e)
  }

  private fun unescape(string: String) = string.replace(
    Regex("\\\\[\'/bfnrt]|\\\\u[0-9a-f]{4}")
  ) { match: MatchResult ->
    when {
      escapes.contains(match.value) -> escapes[match.value]!!
      match.value.startsWith("\\u") -> {
        match.value.substring(3).toInt(16).toChar().toString()
      }
      else -> throw IllegalArgumentException("${match.value} shouldn't match")
    }
  }

  private val escapes = mapOf(
    "\\\\" to "\\",
    "\\\"" to "\"",
    "\\\'" to "\'",
    "\\b" to "\b",
    "\\f" to 12.toChar().toString(),
    "\\n" to "\n",
    "\\r" to "\r",
    "\\t" to "\t"
  )

  /** Parses a paxel expression in string format and returns an [Expression] */
  fun parse(paxelInput: String) =
    when (val result = this(paxelInput)) {
      is ParseResult.Success<*> -> result.value as Expression<*>
      is ParseResult.Failure -> throw IllegalArgumentException(
        "Parse Failed reading ${paxelInput.substring(result.start.offset)}\n$result"
      )
    }
}

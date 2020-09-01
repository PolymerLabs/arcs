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
import arcs.core.util.PairOfParser
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
import arcs.core.util.token
import arcs.core.util.unaryMinus
import java.math.BigInteger

/**
 * A parser combinator implementation of the Paxel expression parser.
 */
object PaxelParser {
    private val WS = "[\\s\\n]"

    sealed class DiscreteType<T : Number> {
        object PaxelBigInt : DiscreteType<BigInteger>() {
            override fun parse(number: String) = BigInteger(number)
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
        fun convert(number: Number): Number = when (number) {
            is BigInteger -> number.multiply(conversionFactor.toBigInteger())
            is Long -> number * conversionFactor
            is Double -> number * conversionFactor.toDouble()
            else -> number.toLong() * conversionFactor
        }

        object Millisecond : Unit(1)
        object Second : Unit(1000)
        object Minute : Unit(Second.conversionFactor * 60)
        object Hour : Unit(Minute.conversionFactor * 60)
        object Day : Unit(Hour.conversionFactor * 24)
    }

    private val whitespace = -regex("($WS+)")

    private val units =
        optional(whitespace + (regex("(millisecond)s?").map { Unit.Millisecond } /
        regex("(second)s?").map { Unit.Second } /
        regex("(minute)s?").map { Unit.Minute } /
        regex("(hour)s?").map { Unit.Hour } /
        regex("(day)s?").map { Unit.Day })).map {
            it ?:  Unit.Millisecond
        }

    private val typeIdentifier =
        token("n").map { DiscreteType.PaxelBigInt } /
        token("i").map { DiscreteType.PaxelInt } /
        token("l").map { DiscreteType.PaxelLong }

    private val discreteValue =
        (regex("(-?[0-9]+)") + typeIdentifier + units).map { (number, type, units) ->
            Expression.NumberLiteralExpression(units.convert(type.parse(number)))
        }

    private val numberValue = (regex("([+-]?[0-9]+\\.?[0-9]*(?:[eE][+-]?[0-9]+)?)") + units)
        .map { (number, units) ->
            Expression.NumberLiteralExpression(units.convert(number.toDouble()))
        }

    private val booleanValue =
        token("true").map { true.asExpr() } / token("false").map { false.asExpr() }

    private val textValue = regex("\'((?:[^\'\\\\]|\\\\[\'\\\\/bfnrt]|\\\\u[0-9a-f]{4})*)\'").map {
        Expression.TextLiteralExpression(unescape(it))
    }

    private val ident = regex("([A-Za-z_][A-Za-z0-9_]*)")

    // optional whitespace
    private val ws = -regex("($WS*)")

    private val functionArguments: Parser<List<Expression<Any>>> = optional(
        parser(::paxelExpression) + many(-regex("($WS*,$WS*)") + parser(::paxelExpression))
    ).map {
        it?.let { (arg, rest) ->
            listOf(arg) + rest
        } ?: emptyList()
    }

    private val functionCall =
        (ident + -(token("(") + ws) + functionArguments + -(ws + token(")"))).map { (ident, args) ->
            Expression.FunctionExpression<Any>(
                maybeFail("unknown function name $ident") {
                    GlobalFunction.of(ident)
                }, args
            )
        }

    @OptIn(kotlin.ExperimentalStdlibApi::class)
    private val scopeLookup = (ident + many(-token(".") + ident)).map { (ident, rest) ->
        val nullQualifier: Expression<Scope>? = null
        (listOf(ident) + rest).fold(nullQualifier) { qualifier, id ->
            FieldExpression<Scope>(qualifier, id)
        } as Expression<Any>
    }

    private val query = regex("\\?([a-zA-Z_][a-zA-Z0-9_]*)").map {
        Expression.QueryParameterExpression<Any>(it)
    }

    private val nestedExpression =
        -regex("(\\($WS*)") + parser(::paxelExpression) + -regex("($WS*\\))")

    private val unaryOperation =
        ((token("not ") / token("-")) + ws + parser(::primaryExpression)).map { (token, expr) ->
            Expression.UnaryExpression(
                Expression.UnaryOp.fromToken(token.trim()) as Expression.UnaryOp<Any, Any>, expr
            )
        }

    private val primaryExpression: Parser<Expression<Any>>
        = nestedExpression /
        discreteValue /
        numberValue /
        unaryOperation /
        booleanValue /
        textValue /
        functionCall /
        scopeLookup /
        query

    private val multiplyExpression = primaryExpression sepBy binaryOp("*", "/")
    private val additiveExpression = multiplyExpression sepBy binaryOp("+", "-")
    private val comparativeExpression = additiveExpression sepBy binaryOp("<=", "<", ">=", ">")
    private val equalityExpression = comparativeExpression sepBy binaryOp("==", "!=")
    private val andExpression = equalityExpression sepBy binaryOp("and")
    private val orExpression = andExpression sepBy binaryOp("or")

    private val refinementExpression = orExpression

    private val sourceExpression = scopeLookup / nestedExpression


    private val fromIter = -token("from") + (ws + ident + ws)
    private val fromIn = -token("in") + (ws + sourceExpression)

    @Suppress("UNCHECKED_CAST")
    private val fromExpression: Parser<QualifiedExpression> =
        (fromIter + fromIn).map { (iter, src) ->
            Expression.FromExpression(null, src as Expression<Sequence<Any>>, iter)
        }

    private val whereExpression: Parser<QualifiedExpression> =
        -token("where") + (ws + refinementExpression).map { expr ->
            Expression.WhereExpression(
                expr as Expression<Sequence<kotlin.Unit>>, expr as Expression<Boolean>
            )
        }

    private val schemaNames = (ident + many(whitespace + ident)).map { (ident, rest) ->
        setOf(ident) + rest.toSet()
    }

    private val oCurly = -regex("(\\{$WS*)")
    private val cCurly = -regex("($WS*\\})")
    private val comma = -regex("($WS*,$WS*)")
    private val colon = -regex("($WS*:$WS*)")

    private val newField = (ident + colon + parser(::paxelExpression))
    private val newFields = optional(newField + many(comma + newField)).map { fields ->
        fields?.let { (name, expr, otherFields) ->
            listOf(name to expr) + otherFields
        } ?: emptyList()
    }
    private val newFieldsDecl = oCurly + newFields + cCurly

    private val newExpression =
        (-token("new") + (whitespace + schemaNames) + ws + newFieldsDecl).map { (names, newFields) ->
            Expression.NewExpression(names, newFields)
        }

    private val selectExprArg = newExpression / refinementExpression

    private val selectExpression: Parser<QualifiedExpression> =
        -token("select") + (ws + selectExprArg).map { expr ->
            Expression.SelectExpression(expr as Expression<Sequence<kotlin.Unit>>, expr)
        }

    private val qualifiedExpression: Parser<QualifiedExpression> =
        fromExpression / whereExpression / selectExpression

    private val expressionWithQualifier =
        (qualifiedExpression + many(ws + qualifiedExpression)).map { (first, rest) ->
            val all: List<QualifiedExpression> = listOf(first) + rest
            maybeFail("Paxel expressions must start with FROM") {
                require(all.first() is Expression.FromExpression)
            }

            maybeFail("Paxel expressions must end with SELECT") {
                require(all.last() is Expression.SelectExpression<*>)
            }

            val nullQualifier: QualifiedExpression? = null
            all.fold(
                nullQualifier
            ) { qualifier: QualifiedExpression?, qualified: QualifiedExpression ->
                qualified.setQualifier(qualifier)
            }
        }

    private val paxelExpression =
        (expressionWithQualifier / refinementExpression) as Parser<Expression<Any>>

    private val paxelProgram = paxelExpression + eof

    private fun binaryOp(vararg tokens: String) = ws + AnyOfParser<String>(
        tokens.map { token(it) }.toList()
    ).map { token ->
        Expression.BinaryOp.fromToken(token) as Expression.BinaryOp<Any, Any, Any>
    }

    private infix fun Parser<Expression<Any>>.sepBy(
        tokens: Parser<Expression.BinaryOp<Any, Any, Any>>
    ) = (this + many(tokens + ws + this)).map { (left, rest) ->
        rest.fold(left) { lhs, (op, rhs) ->
            Expression.BinaryExpression<Any, Any, Any>(op, lhs, rhs)
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
        when (val result = paxelProgram(paxelInput)) {
            is ParseResult.Success<*> -> result.value as Expression<*>
            is ParseResult.Failure -> throw IllegalArgumentException(
                "Parse Failed reading ${paxelInput.substring(result.start.offset)}: ${result.error}"
            )
        }
}

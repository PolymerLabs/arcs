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
import arcs.core.data.expression.Expression.Scope
import arcs.core.util.ParseResult
import arcs.core.util.Parser
import arcs.core.util.ParserException
import arcs.core.util.div
import arcs.core.util.many
import arcs.core.util.map
import arcs.core.util.optional
import arcs.core.util.parser
import arcs.core.util.plus
import arcs.core.util.regex
import arcs.core.util.token
import arcs.core.util.unaryMinus
import java.io.Serializable
import java.math.BigInteger

/**
 * A parser combinator implementation of the Paxel expression parser.
 */
object PaxelParser {
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

    val whitespace = -regex("(\\s+)")

    val units =
        optional(whitespace + (regex("(millisecond)s?").map { Unit.Millisecond } /
        regex("(second)s?").map { Unit.Second } /
        regex("(minute)s?").map { Unit.Minute } /
        regex("(hour)s?").map { Unit.Hour } /
        regex("(day)s?").map { Unit.Day })).map {
            it ?:  Unit.Millisecond
        }

    val typeIdentifier =
        token("n").map { DiscreteType.PaxelBigInt } /
        token("i").map { DiscreteType.PaxelInt } /
        token("l").map { DiscreteType.PaxelLong }

    val discreteValue =
        (regex("(-?[0-9]+)") + typeIdentifier + units).map { (number, type, units) ->
            Expression.NumberLiteralExpression(units.convert(type.parse(number)))
        }

    val numberValue = (regex("([+-]?[0-9]+\\.?[0-9]*(?:[eE][+-]?[0-9]+)?)") + units)
        .map { (number, units) ->
            Expression.NumberLiteralExpression(units.convert(number.toDouble()))
        }

    val booleanValue = token("true").map { true.asExpr() } / token("false").map { false.asExpr() }

    val textValue = regex("\'((?:[^\'\\\\]|\\\\[\'\\\\/bfnrt]|\\\\u[0-9a-f]{4})*)\'").map {
        Expression.TextLiteralExpression(unescape(it))
    }

    val ident = regex("([A-Za-z_][A-Za-z0-9_]*)")

    val functionArguments: Parser<List<Expression<Any>>> = optional(
            parser(::paxelExpression) + many(-regex("(\\s*,\\s*)") + parser(::paxelExpression))
        ).map {
        it?.let { (arg, rest) ->
            listOf(arg) + rest
        } ?: emptyList<Expression<Any>>()
    }

    val functionCall =
        (ident + -regex("(\\(\\s*)") + functionArguments + -regex("(\\s*\\))")).map { (ident, args) ->
            Expression.FunctionExpression<Any>(
                maybeFail("unknown function name $ident") {
                    GlobalFunction.of(ident)
                },
                args
            )
    }

    @OptIn(kotlin.ExperimentalStdlibApi::class)
    val scopeLookup =
        (ident + many(-token(".") + ident)).map { (ident, rest) ->
            val nullQualifier: Expression<Scope>? = null
            (listOf(ident) + rest).scan(nullQualifier) { qualifier, id ->
                FieldExpression<Scope, Any>(qualifier as Expression<Scope>, id) as Expression<Scope>
            }
        }

    val paxelExpression: Parser<Expression<Any>>
        = discreteValue / numberValue / booleanValue / textValue / functionCall / scopeLookup

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
        when (val result = paxelExpression(paxelInput)) {
            is ParseResult.Success<*> -> result.value as Expression<*>
            is ParseResult.Failure -> throw IllegalArgumentException(
                "Parse Failed reading ${paxelInput.substring(result.start.offset)}: ${result.error}"
            )
        }
}

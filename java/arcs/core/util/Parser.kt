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
package arcs.core.util

import arcs.core.util.ParseResult.Failure
import arcs.core.util.ParseResult.Success

/** The result (Functor) of a [Parser] application is a either [Success] or [Failure]. */
sealed class ParseResult<out T> {
    @Suppress("UNCHECKED_CAST")
    fun <T> orElse(f: () -> ParseResult<T>): ParseResult<T> {
        return when (this) {
            is Success<*> -> this as ParseResult<T>
            is Failure -> f()
        }
    }

    /** Map a function over the contents of this functor returning a new functor. */
    fun <S> flatMap(f: (T, String) -> ParseResult<S>): ParseResult<S> {
        return when (this) {
            is Success<T> -> f(value, rest)
            else -> Failure
        }
    }

    /** Represents a successful parse, containing the parsed value, and unparsed leftover. */
    data class Success<out T>(val value: T, val rest: String) : ParseResult<T>()

    /** Represents a parse failure. */
    object Failure : ParseResult<Nothing>()
}

/** Chop off the consumed part of the string. */
fun String.advance(str: String) = this.substring(str.length)

/**
 * Monadic parser combinator interface. Parser combinators can be composed like monads, and
 * produce a [ParseResult] containing the current parsed value and unconsumed income, or
 * a [Failure].
 */
abstract class Parser<out T> {
    abstract operator fun invoke(string: String): ParseResult<T>
}

/** A parser that consumes a prefix of a string. */
class StringToken(val token: String) : Parser<String>() {
    override fun invoke(string: String): ParseResult<String> = when {
        string.startsWith(token) -> Success(token, string.advance(token))
        else -> Failure
    }
}

/**
 * A parser that consumes a regex prefix (anchored at ^) of a String, and returns the
 * first matchgroup.
 */
class RegexToken(val regexToken: String) : Parser<String>() {
    override fun invoke(string: String): ParseResult<String> =
        Regex("^${regexToken}").find(string, 0)?.let { it ->
            Success(it.groupValues[1], string.advance(it.groupValues[0]))
        } ?: Failure
}

/**
 * A parser that invokes another parser, and if it success, it returns, otherwise is succeeds with
 * null.
 */
class Optional<T>(val parser: Parser<T>) : Parser<T?>() {
    override fun invoke(string: String): ParseResult<T?> = parser(string).orElse {
        Success<T?>(null, string)
    }
}

/**
 * A parser that combines two parsers in sequence, if either one fails, the parse fails,
 * otherwise the combined results are returned as a [Pair<T, S].
 */
class Seq<T, S>(val left: Parser<T>, val right: Parser<S>) : Parser<Pair<T, S>>() {
    override fun invoke(string: String) = left(string).flatMap { v1, r ->
        right(r).flatMap { v2, r2 ->
            Success(Pair(v1, v2), r2)
        }
    }
}

/** A parser that combines two parsers by returning the value of the first one that succeeds. */
class Par<T>(val left: Parser<T>, val right: Parser<T>) : Parser<T>() {
    override fun invoke(string: String): ParseResult<T> = left(string).orElse {
        right(string)
    }
}

/**
 * A parser that invokes another parser zero or more times until it fails, returning a list
 * of success values. If no parse succeeds, it returns an empty list.
 */
class Many<T>(val parser: Parser<T>) : Parser<List<T>>() {
    override fun invoke(string: String): ParseResult<List<T>> {
        val result = mutableListOf<T>()
        var parseResult = parser(string)
        var lastSuccess = parseResult
        while (parseResult is Success<T>) {
            result.add(parseResult.value)
            lastSuccess = parseResult
            parseResult = parser(parseResult.rest)
        }
        return Success<List<T>>(result, (lastSuccess as? Success<T>)?.rest ?: string)
    }
}

/** A parser which converts the return value of a parser into another value. */
class Transform<T, R>(val parser: Parser<T>, val transform: (T) -> R) : Parser<R>() {
    override fun invoke(string: String): ParseResult<R> = parser(string).flatMap { v, r ->
        Success<R>(transform(v), r)
    }
}

/** A parser used to refer to parsers that haven't been constructed yet. */
class LazyParser<T>(val parser: () -> Parser<T>) : Parser<T>() {
    override fun invoke(string: String): ParseResult<T> = parser()(string)
}

/** Combines two parsers via addition operator as [Seq] combinator. */
operator fun <T, S> Parser<T>.plus(other: Parser<S>) = Seq(this, other)

/** Combines to parsers via division operator as [Par] combinator. */
operator fun <T> Parser<T>.div(other: Parser<T>) = Par(this, other)

/** Helper function for [Optional]. */
fun <T> optional(parser: Parser<T>) = Optional<T>(parser)

/** Helper for [Many]. */
fun <T> many(parser: Parser<T>) = Many<T>(parser)

/** Helper for [Transform]. */
fun <T, R> Parser<T>.map(f: (T) -> R) = Transform(this, f)

/** Helper for [LazyParser]. */
fun <T> parser(f: () -> Parser<T>) = LazyParser<T>(f)

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

/**
 * # Introduction
 * Monadic parser combinator facility for Kotlin. Parser combinators can be composed like monads,
 * and produce a [ParseResult] containing the current parsed value and unconsumed string, or
 * a [Failure]. Two primitive string parsers are provided, along with a set of combinators:
 * [Seq]uence, [Par]allel, [Many], [Optional], [LazyParser], [TransformParser].
 * <br>
 *
 * ## Basic Parsing
 * The the most basic parser consumes parser of a string, and returns the result.
 * ```kotlin
 * val helloParser = token("hello")
 * val helloResult = helloParser("hello world")
 * // returns Success("hello", " world")
 * val helloResult = helloParser("world hello")
 * // returns Failure
 * ```
 *
 * ## Transforming String Results to other types
 * Sometimes you want to return AST nodes instead of strings, that's where the [Transform] parser
 * comes into play via the [map] extension function.
 *
 * ```
 * val helloParser = token("hello").map { StringNode(it) }
 * val helloResult = helloParser("hello world")
 * // returns Success(StringNode("hello"), " world")
 * ```
 *
 * ## Handling Failures
 * If you want to handle results without worrying about [Failure] cases, you can [flatMap] them
 * which only invokes the function if the result is a [Success].
 *
 * ```
 * helloResult.flatMap { value, rest -> doSomething(value) }
 * ```
 *
 * but sometimes you want to supply a default.
 *
 * ```
 * helloResult.orElse { Success("default", "") }
 * ```
 *
 * ## Combining Parsers
 * You can combine two parsers together in sequence and transform them as well. Here, '+' is
 * used for sequence combination.
 *
 * ```
 * val helloWorld = token("hello") + token(" world").map { (hello, world) ->
 *   listOf(hello, world)
 * }
 *
 * val helloResult = helloWorld("hello world")
 * // returns Success(List<String>("hello", " world"), "")
 * ```
 *
 * ### The [Par]allel 'or' combinator
 * If you want combine two parsers, so that one or the other may success, use the '/' operator.
 *
 * ```kotlin
 * val helloOrFooWorld = (token("hello") / token("foo")) + token("world")
 * helloOrFooWorld("foo world") // success!
 * helloOrFooWorld("hello world") // success!
 * helloOrFooWorld("bar world") // failure!
 * ```
 *
 * ### The Many and Optional combinators.
 * If a parser can succeed 0 or 1 times, use [optional], and if it can succeed 0 or many times,
 * use [many]. [optional] returns Success(null, rest) if it didn't match, and [many] returns
 * Success(List<T>, rest) with the matched results.
 *
 * ```kotlin
 * val helloWorld = token("hello") + optional(token(" ")) + token("world")
 * helloWorld("hello world") // success!
 * helloWorld("helloworld") // success!
 * helloWorld("hello  world") // failure! only one space allowed
 *
 * val helloWorld2 = token("hello") + many(token(" ")) + token("world")
 * helloWorld("hello world") // success!
 * helloWorld("helloworld") // success!
 * helloWorld("hello   world") // success!!
 * ```
 *
 * ### Ignoring Parser results
 * Each time you sequence two parsers via '+', you add another argument to the resulting return
 * value tuple.
 *
 * If you have `Parser<T>` + `Parser<S>`, the result is `ParserResult<Pair<T,S>>` and if you have
 * `Parser<T> + Parser<S> + Parser<R>` the result is `ParserResult<Triple<T,S,R>>`. Often times,
 * some of these values are from non-relevant surrounding tokens. You can remove these from the
 * output signature via the [IgnoreParser], which is normally used via the [unaryMinus] helper.
 *
 * ```kotlin
 * val term = token("hello") / token("world")
 * val array = token("[") + many(term + optional(token(","))) + token("]")
 * // without IgnoreParser the return result is Triple<String, List<Pair<String, String?>>, String>
 *
 * val arrayClean = -token("[") + many(term + -optional(token(","))) + -token("]")
 * // arrayClean("[hello,world]") returns Success(List<String>("hello", "world"))
 * ```
 */
abstract class Parser<out T> {
    abstract operator fun invoke(string: String): ParseResult<T>
}

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
        return Success(result, (lastSuccess as? Success<T>)?.rest ?: string)
    }
}

/** A parser which converts the return value of a parser into another value. */
class Transform<T, R>(val parser: Parser<T>, val transform: (T) -> R) : Parser<R>() {
    override fun invoke(string: String): ParseResult<R> = parser(string).flatMap { v, r ->
        Success(transform(v), r)
    }
}

/** A parser used to refer to parsers that haven't been constructed yet. */
class LazyParser<T>(val parser: () -> Parser<T>) : Parser<T>() {
    override fun invoke(string: String): ParseResult<T> = parser()(string)
}

/** A parser that represents three parsers in sequence yielding a [Triple]. */
class TriSeq<T, S, R>(val left: Seq<T, S>, val right: Parser<R>) : Parser<Triple<T, S, R>>() {
    override fun invoke(string: String): ParseResult<Triple<T, S, R>> =
        left(string).flatMap { v1, r1 ->
            right(r1).flatMap { v2, r2 ->
                Success(Triple(v1.first, v1.second, v2), r2)
            }
        }
}

/** A parser which omits its output from the result type. */
class IgnoreParser<T>(val parser: Parser<T>) : Parser<T>() {
    override fun invoke(string: String): ParseResult<T> = parser(string)
}

/** Combines two parsers via addition operator as [Seq] combinator. */
inline operator fun <reified T, reified S> Parser<T>.plus(other: Parser<S>) = Seq(this, other)

/** Combines two parsers in sequence with a third as a [TriSeq] combinator. */
inline operator fun <reified T, reified S, reified R> Seq<T, S>.plus(other: Parser<R>) =
    TriSeq(this, other)

/** Combines an [IgnoreParser] with a [Parser] ignoring the output of the first. */
inline operator fun<reified T, reified S> IgnoreParser<T>.plus(other: Parser<S>) =
    Seq(this, other).map { (_, y) -> y }

/** Combines an [Parser] with an [IgnoreParser] ignoring the output of the second. */
inline operator fun<reified T, reified S> Parser<T>.plus(other: IgnoreParser<S>) =
    Seq(this, other).map { (x, _) -> x }

/** Unary minus as shorthand for ignoring a parser's output. */
inline operator fun<reified T> Parser<T>.unaryMinus() = IgnoreParser(this)

/** Combines to parsers via division operator as [Par] combinator. */
inline operator fun <T> Parser<T>.div(other: Parser<T>) = Par(this, other)

/** Shorthand to create [RegexToken] parser. */
inline fun regex(regex: String) = RegexToken(regex)

/** Shorthand to create a [StringToken] parser. */
inline fun token(prefix: String) = StringToken(prefix)

/** Helper function for [Optional]. */
inline fun <T> optional(parser: Parser<T>) = Optional<T>(parser)

/** Helper for [Many]. */
inline fun <T> many(parser: Parser<T>) = Many<T>(parser)

/** Helper for [Transform]. */
inline fun <T, R> Parser<T>.map(noinline f: (T) -> R) = Transform(this, f)

/** Helper for [LazyParser]. */
inline fun <T> parser(noinline f: () -> Parser<T>) = LazyParser<T>(f)

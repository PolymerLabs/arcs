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
 * [PairOfParser], [AnyOfParser], [ManyOfParser], [Optional], [LazyParser], [TransformParser].
 * <br>
 *
 * ## Basic Parsing
 * The most basic parser consumes parser of a string, and returns the result.
 * ```kotlin
 * val helloParser = token("hello")
 * val helloResult = helloParser("helloworld")
 * // returns Success("hello", "world")
 * val helloResult = helloParser("worldhello")
 * // returns Failure
 * ```
 *
 * ## Transforming String Results to other types
 * Sometimes you want to return AST nodes instead of strings, that's where the [TransformParser] parser
 * comes into play via the [map] extension function.
 *
 * ```
 * val helloParser = token("hello").map { StringNode(it) }
 * val helloResult = helloParser("hello world")
 * // returns Success(StringNode("hello"), " world")
 * ```
 *
 * ## Handling Failures
 * If you want to handle results without worrying about [Failure] cases, you can [map] them
 * which only invokes the function if the result is a [Success].
 *
 * ```
 * helloResult.map { value, rest -> doSomething(value) }
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
 * ### The [AnyOfParser] parallel 'or' combinator
 * If you want combine two parsers, so that one or the other may success, use the '/' operator.
 *
 * ```kotlin
 * val helloOrFooWorld = (token("hello") / token("foo")) + token("world")
 * helloOrFooWorld("fooworld") // success!
 * helloOrFooWorld("helloworld") // success!
 * helloOrFooWorld("barworld") // failure!
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
 * output signature via the [IgnoringParser], which is normally used via the [unaryMinus] helper.
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
abstract class Parser<out T>() {
    operator fun invoke(string: String, pos: Int = 0) = invoke(string, SourcePosition(pos, 0, 0))

    private var _name: String = ""

    /** Readable debug name for parser, to be used for improved debugging. */
    var name: String
        get() = _name
        internal set(value) {
            _name = value
        }

    /** Return the leftmost token expected by this Parser, used for error reporting. */
    abstract fun leftTokens(): List<String>

    abstract operator fun invoke(
        string: String,
        pos: SourcePosition
    ): ParseResult<T>
}

data class SourcePosition(val offset: Int, val line: Int, val column: Int) {
    fun advance(str: String): SourcePosition {
        var last = 0.toChar()
        var newOffset = offset
        var newLine = line
        var newCol = column

        for (chr in str) {
            newOffset += 1
            if ((last == '\r' && chr == '\n') || chr == '\n' || chr == '\r') {
                newLine += 1
                newCol = 1
            } else {
                newCol += 1
            }
            last = chr
        }
        return SourcePosition(newOffset, newLine, newCol)
    }
}

/** The result (Functor) of a [Parser] application is a either [Success] or [Failure]. */
sealed class ParseResult<out T>() {
    abstract val start: SourcePosition
    abstract val end: SourcePosition

    @Suppress("UNCHECKED_CAST")
    fun <T> orElse(f: (Failure) -> ParseResult<T>): ParseResult<T> {
        return when (this) {
            is Success<*> -> this as ParseResult<T>
            is Failure -> f(this)
        }
    }

    /** Map a function over the contents of this functor returning a new functor. */
    fun <S> map(f: (T, SourcePosition, SourcePosition) -> ParseResult<S>): ParseResult<S> {
        return when (this) {
            is Success<T> -> f(value, start, end)
            else -> this as Failure
        }
    }

    /** Represents a successful parse, containing the parsed value, and unparsed leftover. */
    data class Success<out T>(
        val value: T,
        override val start: SourcePosition,
        override val end: SourcePosition
    ) : ParseResult<T>()

    /** Represents a parse failure. */
    class Failure(
        val error: String,
        override val start: SourcePosition,
        override val end: SourcePosition
    ) : ParseResult<Nothing>()
}

/** Chop off the consumed part of the string. */
fun String.advance(str: String) = this.substring(str.length)

/** A parser that consumes a prefix of a string. */
class StringToken(val token: String) : Parser<String>() {
    override fun invoke(string: String, pos: SourcePosition): ParseResult<String> = when {
        string.startsWith(token, pos.offset) -> Success(token, pos, pos.advance(token))
        else -> Failure("Expecting $token", pos, pos)
    }

    override fun leftTokens(): List<String> = listOf(token)
}

/**
 * A parser that consumes a regex prefix (anchored at ^) of a String, and returns the
 * first matchgroup.
 */
class RegexToken(val regexToken: String) : Parser<String>() {

    override fun invoke(string: String, pos: SourcePosition): ParseResult<String> =
        Regex("^$regexToken").find(string.substring(pos.offset))?.let { it ->
            Success(it.groupValues[1], pos, pos.advance(it.groupValues[0]))
        } ?: Failure("Expecting $regexToken", pos, pos)

    override fun leftTokens(): List<String> = listOf(regexToken)
}

/**
 * A parser that invokes another parser, and if it success, it returns, otherwise is succeeds with
 * null.
 */
class Optional<T>(val parser: Parser<T>) : Parser<T?>() {
    override fun invoke(
        string: String,
        pos: SourcePosition
    ): ParseResult<T?> = parser(string, pos).orElse {
        Success<T?>(null, pos, pos)
    }

    override fun leftTokens(): List<String> = parser.leftTokens()
}

/**
 * A parser that combines two parsers in sequence, if either one fails, the parse fails,
 * otherwise the combined results are returned as a [Pair<T, S>].
 */
class PairOfParser<T, S>(val left: Parser<T>, val right: Parser<S>) : Parser<Pair<T, S>>() {
    override fun invoke(string: String, pos: SourcePosition) =
        left(string, pos).map { v1, s1, e1 ->
            right(string, e1).map { v2, _, e2 ->
                Success(Pair(v1, v2), s1, e2)
        }
    }

    override fun leftTokens(): List<String> = left.leftTokens()
}

/** A parser that combines two parsers by returning the value of the first one that succeeds. */
class AnyOfParser<T>(val parsers: List<Parser<T>>) : Parser<T>() {

    override fun leftTokens(): List<String> = parsers.flatMap { it.leftTokens() }

    override fun invoke(string: String, pos: SourcePosition): ParseResult<T> {
        for (parser in parsers) {
            when (val result = parser(string, pos)) {
                is Success<T> -> return result
                else -> Unit
            }
        }
        return Failure("Expecting one of " + leftTokens().joinToString(), pos, pos)
    }
}

/**
 * A parser that invokes another parser zero or more times until it fails, returning a list
 * of success values. If no parse succeeds, it returns an empty list.
 */
class ManyOfParser<T>(val parser: Parser<T>) : Parser<List<T>>() {

    override fun leftTokens(): List<String> = parser.leftTokens()

    override fun invoke(string: String, pos: SourcePosition): ParseResult<List<T>> {
        val result = mutableListOf<T>()
        // Result could be immutable by mapping and chaining parsers to concatenate a result
        // but it's overkill.
        val resultParser = parser.map {
            result.add(it)
            it
        }

        // Stops with first Failure(msg, start, end)
        // But (start) is actually equal to the last Success's end
        fun parseUntilFail(pos: SourcePosition): ParseResult<T> =
            resultParser(string, pos).map { _, _, end -> parseUntilFail(end) }

        return parseUntilFail(pos).orElse {
                failure -> Success(result, pos, failure.start)
        }
    }
}

/** A parser which converts the return value of a parser into another value. */
class TransformParser<T, R>(val parser: Parser<T>, val transform: (T) -> R) : Parser<R>() {

    override fun leftTokens(): List<String> = parser.leftTokens()

    override fun invoke(
        string: String,
        pos: SourcePosition
    ): ParseResult<R> = parser(string, pos).map { v, start, end ->
        Success(transform(v), start, end)
    }
}

/** A parser used to refer to parsers that haven't been constructed yet. */
class LazyParser<T>(val parser: () -> Parser<T>) : Parser<T>() {
    override fun leftTokens(): List<String> = parser().leftTokens()

    override fun invoke(string: String, pos: SourcePosition): ParseResult<T> = parser()(string, pos)
}

/** A parser that represents three parsers in sequence yielding a [Triple]. */
class TripleOfParser<T, S, R>(
    val left: PairOfParser<T, S>,
    val right: Parser<R>
) : Parser<Triple<T, S, R>>() {

    override fun leftTokens(): List<String> = left.leftTokens()

    override fun invoke(string: String, pos: SourcePosition): ParseResult<Triple<T, S, R>> =
        left(string, pos).map { v1, s1, e1 ->
            right(string, e1).map { v2, _, e2 ->
                Success(Triple(v1.first, v1.second, v2), s1, e2)
            }
        }
}

/** A parser which omits its output from the result type. */
class IgnoringParser<T>(val parser: Parser<T>) : Parser<T>() {
    override fun leftTokens(): List<String> = parser.leftTokens()

    override fun invoke(string: String, pos: SourcePosition): ParseResult<T> = parser(string, pos)
}

/** A parser that succeeds by matching the end of the input. */
object EofParser : Parser<Unit>() {
    override fun leftTokens(): List<String> = listOf("<eof>")

    init {
        name = "<eof>"
    }

    override fun invoke(string: String, pos: SourcePosition): ParseResult<Unit> =
        if (pos.offset == string.length) Success(Unit, pos, pos) else Failure(
            "Expecting eof",
            pos,
            pos
        )
}

/** Combines two parsers via addition operator as [PairOfParser] combinator. */
operator fun <T, S> Parser<T>.plus(other: Parser<S>) = PairOfParser(this, other)

/** Combines two parsers in sequence with a third as a [TripleOfParser] combinator. */
operator fun <T, S, R> PairOfParser<T, S>.plus(other: Parser<R>) =
    TripleOfParser(this, other)

operator fun <T, S, R> PairOfParser<T, S>.plus(other: IgnoringParser<R>) =
    PairOfParser(this, other).map { (x, _) -> x }

/** Combines an [IgnoringParser] with a [Parser] ignoring the output of the first. */
operator fun <T, S> IgnoringParser<T>.plus(other: Parser<S>) =
    PairOfParser(this, other).map { (_, y) -> y }

/** Combines an [Parser] with an [IgnoringParser] ignoring the output of the second. */
operator fun <T, S> Parser<T>.plus(other: IgnoringParser<S>) =
    PairOfParser(this, other).map { (x, _) -> x }

/** Unary minus as shorthand for ignoring a parser's output. */
operator fun <T> Parser<T>.unaryMinus() = IgnoringParser(this)

/** Combines to parsers via division operator as [AnyOfParser] combinator. */
operator fun <T> Parser<T>.div(other: Parser<T>) = AnyOfParser<T>(listOf(this, other))
operator fun <T> AnyOfParser<T>.div(other: Parser<T>) = AnyOfParser<T>(this.parsers + listOf(other))

/** Shorthand to create [RegexToken] parser. */
fun regex(regex: String) = RegexToken(regex)

/** Shorthand to create a [StringToken] parser. */
fun token(prefix: String) = StringToken(prefix)

/** Helper function for [Optional]. */
fun <T> optional(parser: Parser<T>) = Optional(parser)

/** Helper for [ManyOfParser]. */
fun <T> many(parser: Parser<T>) = ManyOfParser(parser)

/** Helper for [TransformParser]. */
fun <T, R> Parser<T>.map(f: (T) -> R) = TransformParser(this, f)

/** Helper for [LazyParser]. */
fun <T> parser(f: () -> Parser<T>) = LazyParser(f)

/** Helper for [EofParser], matches end of input and ignores it in the result. */
val eof = -EofParser

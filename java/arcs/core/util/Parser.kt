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
import kotlin.math.max
import kotlin.math.min
import kotlin.reflect.KProperty

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
 *
 * ### Grammars
 *
 * For better error messages and optimizations in the future, you can collect your parser rules
 * into a [Grammar]. [Grammar] provides a property delegate provide that can register parsers,
 * set debug names, and in the future, separate tokens from non-terminals.
 *
 * ```kotlin
 * object HelloGrammar : Grammar<String>() {
 *   val hello by token("hello")
 *   val world by token("world")
 *   val helloOrWorld by hello / world
 *   override val topLevel by helloOrWorld
 * }
 *
 * HelloGrammar("hello world").
 *
 * Note the use of 'by' instead of '='. This triggers the parsers to be given names like
 * 'helloOrWorld' or 'hello' which show up in error messages.
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
    abstract val consumed: Int

    @Suppress("UNCHECKED_CAST")
    fun <T> orElse(f: (Failure) -> ParseResult<T>): ParseResult<T> {
        return when (this) {
            is Success<*> -> this as ParseResult<T>
            is Failure -> f(this)
        }
    }

    /** Map a function over the contents of this functor returning a new functor. */
    fun <S> map(f: (T, SourcePosition, SourcePosition, Int) -> ParseResult<S>): ParseResult<S> {
        return when (this) {
            is Success<T> -> f(value, start, end, consumed)
            else -> this as Failure
        }
    }

    /** Represents a successful parse, containing the parsed value, and unparsed leftover. */
    data class Success<out T>(
      val value: T,
      override val start: SourcePosition,
      override val end: SourcePosition,
      override val consumed: Int = 1
    ) : ParseResult<T>()

    /** Represents a parse failure. */
    data class Failure(
      val error: String,
      override val start: SourcePosition,
      override val end: SourcePosition,
      override val consumed: Int = 0,
      val parser: String = "",
      val cause: Failure? = null
    ) : ParseResult<Nothing>() {
        override fun toString() = rootCause(this).let {
            "${it.error} at line ${it.start.line}, column ${it.start.column}"
        } + (this.cause?.let { "\n[Traceback]" + traceBack(this) })
    }
}

private tailrec fun rootCause(cause: Failure): Failure =
    if (cause.cause == null) cause else rootCause(cause.cause)

private fun traceBack(cause: Failure?): String = when {
    cause == null -> ""
    cause.parser.isBlank() -> traceBack(cause.cause)
    else -> "\n  at ${cause.parser}" + traceBack(cause.cause)
}

/** Create a parent [Failure] as a copy, labeled with the enclosing parser. */
private fun Failure.causedBy(parser: String) = this.copy(parser = parser, cause = this)

/** Create a copy of [Failure] with a new value for [consumed]. */
private fun Failure.consumed(consumed: Int, parser: String, cause: Failure) = this.copy(
    consumed = consumed,
    parser = parser,
    cause = cause)

/** Chop off the consumed part of the string. */
fun String.advance(str: String) = this.substring(str.length)

private const val TRACEBACK_AMOUNT = 4

private fun String.traceBack(at: Int) = this.substring(
    max(0, at - TRACEBACK_AMOUNT),
    if (at != 0) min(at + 1, this.length) else min(TRACEBACK_AMOUNT + 1, this.length)
)

private fun errorPointer(s: String, pos: SourcePosition) = """
        |${s.traceBack(pos.offset)}
        |${" ".repeat(min(TRACEBACK_AMOUNT, pos.offset))}^
    """.trimMargin()

/** A parser that consumes a prefix of a string. */
class StringToken(val token: String) : Parser<String>() {
    override fun invoke(string: String, pos: SourcePosition): ParseResult<String> = when {
        string.startsWith(token, pos.offset) -> Success(token, pos, pos.advance(token))
        else -> Failure("${errorPointer(string, pos)}\nExpecting $token", pos, pos)
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
        } ?: Failure("${errorPointer(string, pos)}\nExpecting $regexToken", pos, pos)

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
        Success<T?>(null, pos, pos, 0)
    }

    override fun leftTokens(): List<String> = parser.leftTokens()
}

/**
 * A parser that combines two parsers in sequence, if either one fails, the parse fails,
 * otherwise the combined results are returned as a [Pair<T, S>].
 */
class PairOfParser<T, S>(val left: Parser<T>, val right: Parser<S>) : Parser<Pair<T, S>>() {
    override fun invoke(string: String, pos: SourcePosition): ParseResult<Pair<T, S>> =
        when (val outerResult = left(string, pos).map { v1, s1, e1, c1 ->
            val result = right(string, e1).map { v2, _, e2, c2 ->
                Success(Pair(v1, v2), s1, e2, c1 + c2)
            }
            when (result) {
                is Success<*> -> result as Success<Pair<T, S>>
                is Failure -> result.consumed(
                    result.consumed + c1,
                    this@PairOfParser.name,
                    result
                )
            }
        }) {
            is Success<*> -> outerResult as Success<Pair<T, S>>
            is Failure -> outerResult.causedBy(name)
        }

    override fun leftTokens(): List<String> = left.leftTokens()
}

/** A parser that combines two parsers by returning the value of the first one that succeeds. */
class AnyOfParser<T>(val parsers: List<Parser<T>>) : Parser<T>() {

    override fun leftTokens(): List<String> = parsers.flatMap { it.leftTokens() }

    override fun invoke(string: String, pos: SourcePosition): ParseResult<T> {
        var mostConsumed = 0
        var mostConsumedFailure: Failure? = null

        for (parser in parsers) {
            when (val result = parser(string, pos)) {
                is Success<T> -> return result
                else -> {
                    if (result.consumed >= mostConsumed) {
                        mostConsumed = result.consumed
                        mostConsumedFailure = result as Failure
                    }
                }
            }
        }
        if (mostConsumed == 0) {
            return Failure(
                "${errorPointer(string, pos)}\nExpecting one of " + leftTokens().joinToString(),
                pos,
                pos,
                0,
                name
            )
        } else {
            return mostConsumedFailure!!.causedBy(name)
        }
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
        var consumed = 0
        // Result could be immutable by mapping and chaining parsers to concatenate a result
        // but it's overkill.
        val resultParser = parser.map {
            result.add(it)
            it
        }

        // Stops with first Failure(msg, start, end)
        // But (start) is actually equal to the last Success's end
        fun parseUntilFail(pos: SourcePosition): ParseResult<T> =
            resultParser(string, pos).map { _, _, end, c -> consumed += c; parseUntilFail(end) }

        return parseUntilFail(pos).orElse {
                failure -> Success(result, pos, failure.start, consumed)
        }
    }
}

class ParserException(msg: String, cause: Exception) : Exception(msg, cause)

/** A parser which converts the return value of a parser into another value. */
class TransformParser<T, R>(val parser: Parser<T>, val transform: (T) -> R) : Parser<R>() {

    override fun leftTokens(): List<String> = parser.leftTokens()

    override fun invoke(
      string: String,
      pos: SourcePosition
    ): ParseResult<R> = parser(string, pos).map { v, start, end, consumed ->
        try {
            Success(transform(v), start, end, consumed)
        } catch (e: ParserException) {
            Failure(e.message ?: "Parse Exception", start, end).causedBy(name)
        }
    }.orElse { failure -> failure.causedBy(name) }
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
        left(string, pos).map { v1, s1, e1, c1 ->
            val result = right(string, e1).map { v2, _, e2, c2 ->
                Success(Triple(v1.first, v1.second, v2), s1, e2, c1 + c2)
            }
            when (result) {
                is Success<*> -> result as Success<Triple<T, S, R>>
                is Failure -> result.consumed(
                    result.consumed + c1,
                    this@TripleOfParser.name,
                    result
                )
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
            "${errorPointer(string, pos)}\nExpecting eof",
            pos,
            pos,
            0,
            name
        )
}

/**
 * A class to collect all of the parser rules for a language, including designating a
 * [topLevel] rule to start the parser, and property delegate providers to set helpful debug
 * names on parsers.
 */
abstract class Grammar<T> : Parser<T>() {
    /** The top level rule for this grammar. */
    abstract val topLevel: Parser<T>

    /** Delegate provider that assigns names to parsers. */
    protected operator fun <T> Parser<T>.provideDelegate(
      thisRef: Grammar<*>,
      property: KProperty<*>
    ): Parser<T> = also { it.name = property.name }

    /** Allow parser fields to be delegated. */
    protected operator fun <T> Parser<T>.getValue(
      thisRef: Grammar<*>,
      property: KProperty<*>
    ): Parser<T> = this

    override fun leftTokens() = topLevel.leftTokens()

    override fun invoke(string: String, pos: SourcePosition): ParseResult<T> = topLevel(string, pos)
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

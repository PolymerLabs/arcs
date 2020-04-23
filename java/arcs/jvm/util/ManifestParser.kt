package arcs.jvm.util

import arcs.jvm.util.ManifestParser.getValue
import arcs.jvm.util.ManifestParser.provideDelegate
import com.github.h0tk3y.betterParse.combinators.asJust
import com.github.h0tk3y.betterParse.combinators.map
import com.github.h0tk3y.betterParse.combinators.oneOrMore
import com.github.h0tk3y.betterParse.combinators.optional
import com.github.h0tk3y.betterParse.combinators.or
import com.github.h0tk3y.betterParse.combinators.times
import com.github.h0tk3y.betterParse.combinators.use
import com.github.h0tk3y.betterParse.combinators.zeroOrMore
import com.github.h0tk3y.betterParse.grammar.Grammar
import com.github.h0tk3y.betterParse.lexer.TokenMatch
import com.github.h0tk3y.betterParse.parser.ErrorResult
import com.github.h0tk3y.betterParse.parser.ParseResult
import com.github.h0tk3y.betterParse.parser.Parsed
import com.github.h0tk3y.betterParse.parser.Parser
import java.util.Stack

class ManifestItem
data class Manifest(val items: List<ManifestItem>)

object ManifestParser : Grammar<Manifest>() {
    var currentIndent = 0
    val indents = Stack<Int>()
    val sameIdent by lookahead(token("[ ]*")) {
        val i = it.t1.text.length
        if (i == currentIndent) {
            true
        } else if (i < currentIndent) {
            currentIndent = indents.pop()
            false
        }
        false
    } * token("[ ]*")

    val indent by lookahead(token("[ ]*")) {
        val i = it.t1.text.length
        if (i > indent) {
            indents.push(currentIndent)
            currentIndent = i
            true
        } else {
            false
        }
    } * token("[ ]*")

    val fieldName by token("[a-z][a-z0-9_]*") use { text }
    val simpleName by token("[a-zA-Z][a-zA-Z0-9_]*") use { text }
    val dottedName by simpleName * token("\\.") * simpleName map { "${it.t1}.${it.t3}" }
    val upperIdent by /* not(UpperReservedWord) */ token("[A-Z][a-z0-9_]*") use { text }

    val backquotedString by token("`") * token("[^`]+") * token("`") map { it.t2 }
    val id by token("'") * token("[^'\n]+") * token("'") map { it.t2 }
    // need negative not() combinator
    val unsafeLowerIdent by  token(
        "[a-z][a-z0-9_]*(?=[^a-zA-Z0-9_])|\\Z"
    ) use { text }

    // need negative not() combinator
    val lowerIdent by /* not(reservedWord) */ unsafeLowerIdent
    val spaceChar by token("\\s|\\t|\\f|\\r|\\v|\\u00A0")
    val whiteSpace by oneOrMore(spaceChar)
    val eol by optional(token("\\r")) or token("\\n") * optional(token("\\r"))
    val eolWhiteSpace: Parser<*> by zeroOrMore(spaceChar) * token("(?!.)") or zeroOrMore(
        spaceChar
    ) * token("//[^\n]*") * optional(eolWhiteSpace) or optional(spaceChar) * eol * optional(
        eolWhiteSpace
    )
    val eolPlusWhiteSpace by optional(eolWhiteSpace) * optional(whiteSpace)

    override val rootParser: Parser<Manifest>
        get() = whiteSpace

    fun <S> lookahead(parser: Parser<S>, block: (ParseResult<S>) -> Boolean) = LookAhead(parser, block)

    class LookAhead<S>(val parser: Parser<S>, val block: (ParseResult<S>) -> Boolean) : Parser<S> {
        override fun tryParse(tokens: Sequence<TokenMatch>): ParseResult<S> {
            val result = parser.tryParse(tokens)
            return when (result) {
                is Parsed && block(result) -> Parsed(result.value, tokens)
                is ErrorResult -> result
            }
        }

    }
}

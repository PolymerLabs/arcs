package arcs.core.util

import arcs.core.util.ParseResult.Failure
import arcs.core.util.ParseResult.Success
import com.google.common.truth.Truth.assertThat
import kotlin.test.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Parser]. */
@RunWith(JUnit4::class)
class ParserTest {

    fun String.rest(pos: SourcePosition) =
        if (pos.offset >= this.length) "" else this.substring(pos.offset)

    @Test
    fun parseWithTokenizer() {
        val hello = token("hello")
        hello("hello world").map { match, start, end ->
            assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
            assertThat(end).isEqualTo(SourcePosition(5, 0, 5))
            assertThat(match).isEqualTo("hello")
            assertThat("hello world".rest(end)).isEqualTo(" world")
            Success(match, start, end)
        }.orElse<Nothing> {
            fail()
        }

        assertThat(hello("world")).isInstanceOf(Failure::class.java)

        val helloregex = regex("(h.ll)o")

        helloregex("hello world").map { match, start, end ->
            assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
            assertThat(end).isEqualTo(SourcePosition(5, 0, 5))
            assertThat(match).isEqualTo("hell")
            assertThat("hello world".rest(end)).isEqualTo(" world")
            Success(match, start, end)
        }.orElse<Nothing> {
            fail()
        }

        assertThat(helloregex("world")).isInstanceOf(Failure::class.java)
    }

    @Test
    fun parseSequential() {
        val helloworld = token("hello") + token("world")
        helloworld("helloworld").map { (hello, world), start, end ->
            assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
            assertThat(end).isEqualTo(SourcePosition(10, 0, 10))
            assertThat(hello).isEqualTo("hello")
            assertThat(world).isEqualTo("world")
            assertThat("helloworld".rest(end)).isEqualTo("")
            Success(Pair(hello, world), start, end)
        }.orElse<Nothing> {
            fail()
        }

        val helloworld2 = token("hello") + token("world") + token("two")
        helloworld2("helloworldtwo").map { (hello, world, two), start, end ->
            assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
            assertThat(end).isEqualTo(SourcePosition(13, 0, 13))
            assertThat(hello).isEqualTo("hello")
            assertThat(world).isEqualTo("world")
            assertThat(two).isEqualTo("two")
            assertThat("helloworldtwo".rest(end)).isEqualTo("")
            Success(Triple(hello, world, two), start, end)
        }.orElse<Nothing> {
            fail()
        }

        assertThat(helloworld("hello world")).isInstanceOf(Failure::class.java)
    }

    @Test
    fun parseParallel() {
        val helloworld = token("hello") / token("goodbye") / token("foo") / token("bar")
        helloworld("hello world").map { match, start, end ->
            assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
            assertThat(end).isEqualTo(SourcePosition(5, 0, 5))
            assertThat(match).isEqualTo("hello")
            assertThat("hello world".rest(end)).isEqualTo(" world")
            Success(match, start, end)
        }.orElse<Nothing> {
            fail()
        }

        helloworld("goodbye world").map { match, start, end ->
            assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
            assertThat(end).isEqualTo(SourcePosition(7, 0, 7))
            assertThat(match).isEqualTo("goodbye")
            assertThat("goodbye world".rest(end)).isEqualTo(" world")
            Success(match, start, end)
        }.orElse<Nothing> {
            fail()
        }

        assertThat(helloworld("sayonara world")).isInstanceOf(Failure::class.java)
    }

    @Test
    fun parseMany() {
        val intro = token("a ") + many(token("long ")) + token("time ago in a far away galaxy")
        val string = "a long long long time ago in a far away galaxy"
        intro(string).map { (_, many, _), start, end ->
            assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
            assertThat(end).isEqualTo(SourcePosition(string.length, 0, string.length))
            assertThat(many).containsExactly("long ", "long ", "long ")
            assertThat(string.rest(end)).isEqualTo("")
            Success(many, start, end)
        }.orElse<Nothing> {
            fail()
        }

        assertThat(intro("a time ago")).isInstanceOf(Failure::class.java)
    }

    @Test
    fun parseOptional() {
        val trailing = token("hello") + optional(token(", "))
        trailing("hello.").map { (hello, _), start, end ->
            assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
            assertThat(end).isEqualTo(SourcePosition(5, 0, 5))
            assertThat(hello).isEqualTo("hello")
            assertThat("hello.".rest(end)).isEqualTo(".")
            Success(hello, start, end)
        }.orElse<Nothing> {
            fail()
        }

        trailing("hello, ").map { (hello, opt), start, end ->
            assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
            assertThat(end).isEqualTo(SourcePosition(7, 0, 7))
            assertThat(hello).isEqualTo("hello")
            assertThat(opt).isEqualTo(", ")
            assertThat("hello, ".rest(end)).isEqualTo("")
            Success(hello, start, end)
        }.orElse<Nothing> {
            fail()
        }
    }

    @Test
    fun testIgnoring() {
        val space: IgnoringParser<String> = -token(" ")
        val ignoring = token("hello") + space + token("world")
        ignoring("hello world").map { (hello, world), start, end ->
            assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
            assertThat(end).isEqualTo(SourcePosition(11, 0, 11))
            assertThat(hello).isEqualTo("hello")
            assertThat(world).isEqualTo("world")
            Success(hello, start, end)
        }.orElse<Nothing> {
            fail()
        }
    }

    @Test
    fun testEof() {
        val hello = token("hello") + eof
        hello("hello").map { match, start, end ->
            assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
            assertThat(end).isEqualTo(SourcePosition(5, 0, 5))
            assertThat(match).isEqualTo("hello")
            assertThat("hello".rest(end)).isEqualTo("")
            Success(match, start, end)
        }.orElse<Nothing> {
            fail()
        }

        val failure = hello("hello!2").map { _, s, e ->
            require(false) { "Shouldn't be called" }
            Failure("", s, e)
        } as Failure

        assertThat(failure.error).isEqualTo("Expecting eof")
    }
}

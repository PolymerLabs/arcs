package arcs.core.util

import arcs.core.util.ParseResult.Failure
import arcs.core.util.ParseResult.Success
import com.google.common.truth.Truth.assertThat
import kotlin.test.fail
import kotlin.text.RegexOption.IGNORE_CASE
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
    hello("hello world").map { match, start, end, _ ->
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

    helloregex("hello world").map { match, start, end, _ ->
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
    helloworld("helloworld").map { (hello, world), start, end, _ ->
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
    helloworld2("helloworldtwo").map { (hello, world, two), start, end, _ ->
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
    helloworld("hello world").map { match, start, end, _ ->
      assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
      assertThat(end).isEqualTo(SourcePosition(5, 0, 5))
      assertThat(match).isEqualTo("hello")
      assertThat("hello world".rest(end)).isEqualTo(" world")
      Success(match, start, end)
    }.orElse<Nothing> {
      fail()
    }

    helloworld("goodbye world").map { match, start, end, _ ->
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
    intro(string).map { (_, many, _), start, end, _ ->
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
  fun parserMany_complexSubExpression() {
    // A regression test for a bug where the parser composed by ManyOfParser fails mid-way and
    // ManyOfParser incorrectly reports its parsed range as including the partially parsed sequence.
    //
    // In this examples we are parsing repeated "_" + "x", but fail to find the third occurrence,
    // as we find "_" + "o". The partial match of "_" in the third attempt used to influence the
    // reported "end" position of parsing. ManyOfParser reported successfully parsing the "_x_x_"
    // string, instead of "_x_x".
    val composed = many(-token("_") + token("x")) + many(-token("_") + token("o"))

    composed("_x_x_o_o").map { r, s, e, _ ->
      assertThat(r).isEqualTo(Pair(listOf("x", "x"), listOf("o", "o")))
      Success(r, s, e)
    }.orElse<Nothing> {
      fail()
    }
  }

  @Test
  fun parseOptional() {
    val trailing = token("hello") + optional(token(", "))
    trailing("hello.").map { (hello, _), start, end, _ ->
      assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
      assertThat(end).isEqualTo(SourcePosition(5, 0, 5))
      assertThat(hello).isEqualTo("hello")
      assertThat("hello.".rest(end)).isEqualTo(".")
      Success(hello, start, end)
    }.orElse<Nothing> {
      fail()
    }

    trailing("hello, ").map { (hello, opt), start, end, _ ->
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
    ignoring("hello world").map { (hello, world), start, end, _ ->
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
  fun testIgnoring_chainedWithPlus() {
    val ignoreA: IgnoringParser<String> = -token("a")
    val ignoreB: IgnoringParser<String> = -token("b")
    val takeC: Parser<String> = token("c")
    val parser = ignoreA + ignoreB + takeC + ignoreB + ignoreA
    parser("abcba").map { text, start, end, _ ->
      assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
      assertThat(end).isEqualTo(SourcePosition(5, 0, 5))
      assertThat(text).isEqualTo("c")
      Success(text, start, end)
    }.orElse<Nothing> {
      fail()
    }
  }

  @Test
  fun testRegex() {
    val parser = regex("(hello|world)")
    parser("world").map { text, start, end, _ ->
      assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
      assertThat(end).isEqualTo(SourcePosition(5, 0, 5))
      assertThat(text).isEqualTo("world")
      Success(text, start, end)
    }.orElse<Nothing> {
      fail()
    }

    assertThat(parser("sayonara")).isInstanceOf(Failure::class.java)
    assertThat(parser("WORLD")).isInstanceOf(Failure::class.java)
  }

  @Test
  fun testRegex_withOptions() {
    val parser = regex("(hello|world)", IGNORE_CASE)
    parser("wOrlD").map { text, start, end, _ ->
      assertThat(text).isEqualTo("wOrlD")
      Success(text, start, end)
    }.orElse<Nothing> {
      fail()
    }

    assertThat(parser("Sayonara")).isInstanceOf(Failure::class.java)
  }

  @Test
  fun testEof() {
    val hello = token("hello") + eof
    hello("hello").map { match, start, end, _ ->
      assertThat(start).isEqualTo(SourcePosition(0, 0, 0))
      assertThat(end).isEqualTo(SourcePosition(5, 0, 5))
      assertThat(match).isEqualTo("hello")
      assertThat("hello".rest(end)).isEqualTo("")
      Success(match, start, end)
    }.orElse<Nothing> {
      fail()
    }

    val failure = hello("hello!2").map { _, s, e, _ ->
      require(false) { "Shouldn't be called" }
      Failure("", s, e)
    } as Failure

    assertThat(failure.error).isEqualTo("ello!\n    ^\nExpecting eof")
  }

  object HelloGrammar : Grammar<String>() {
    val hello by (token("hello") + token("world")).map { (h, w) -> h + w }
    val world by token("world")
    val helloOrWorld by hello / world
    override val topLevel by helloOrWorld + eof
  }

  @Test
  fun testGrammar() {
    val failure = HelloGrammar("foo")
    assertThat(failure.toString()).isEqualTo(
      """
            |foo
            |^
            |Expecting one of hello, world at line 0, column 0
            |[Traceback]
            |  at topLevel
            |  at helloOrWorld
        """.trimMargin()
    )

    val failure2 = HelloGrammar("hello")
    assertThat(failure2.toString()).isEqualTo(
      """
            |ello
            |    ^
            |Expecting world at line 0, column 5
            |[Traceback]
            |  at topLevel
            |  at helloOrWorld
            |  at hello
        """.trimMargin()
    )

    val failure3 = HelloGrammar("world!")
    assertThat(failure3.toString()).isEqualTo(
      """
            |orld!
            |    ^
            |Expecting eof at line 0, column 5
            |[Traceback]
            |  at topLevel
            |  at <eof>
        """.trimMargin()
    )
  }
}

package arcs.core.type

import arcs.core.common.Literal
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.After
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class TypeFactoryTest {
  @After
  fun tearDown() {
    TypeFactory.clearRegistrationsForTesting()
  }

  @Test
  fun getType_notTypeLiteral_null() {
    val e = assertFailsWith<IllegalArgumentException> { TypeFactory.getType(object : Literal {}) }
    assertThat(e).hasMessageThat().isEqualTo("TypeLiteral required")
  }

  @Test
  fun getType_notRegistered_null() {
    val typeLiteral = object : TypeLiteral {
      override val tag = Tag.Singleton
    }
    val e = assertFailsWith<IllegalArgumentException> { TypeFactory.getType(typeLiteral) }
    assertThat(e).hasMessageThat().isEqualTo("Type with tag Singleton has no registered builder")
  }

  @Test
  fun getType_multipleRegistered_success() {
    TypeFactory.registerBuilder(Tag.Singleton) { literal -> TestType((literal as TestLiteral).txt) }

    val type = TypeFactory.getType(TestLiteral("hello world"))
    assertThat(type).isInstanceOf(TestType::class.java)
    assertThat((type as TestType).txt).isEqualTo("hello world")
  }

  private class TestLiteral(val txt: String) : TypeLiteral {
    override val tag = Tag.Singleton
  }

  private class TestType(val txt: String) : Type {
    override val tag = Tag.Singleton
    override fun toLiteral() = TestLiteral(txt)
  }
}

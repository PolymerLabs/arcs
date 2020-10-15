package arcs.core.analysis

import arcs.core.data.AccessPath
import arcs.core.data.Claim
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SingletonType
import arcs.core.data.expression.PaxelParser
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

private fun List<String>.asFields() = map { AccessPath.Selector.Field(it) }

@RunWith(JUnit4::class)
class ClaimDeductionTest {
  @Test
  fun particle_to_scoped_equal_claims() {
    val connections = mapOf(
      "input" to HandleConnectionSpec(
        name = "input",
        direction = HandleMode.Read,
        type = SingletonType(EntityType(Schema(
          names = setOf(SchemaName("PetCount")),
          fields = SchemaFields(
            singletons = mapOf(
              "cat" to FieldType.Number,
              "dog" to FieldType.Number,
              "foo" to FieldType.Text
            ),
            collections = emptyMap()
          ),
          hash="FooHousePetHash"
        )))
      ),
      "output" to HandleConnectionSpec(
        name = "output",
        direction = HandleMode.Write,
        type = SingletonType(EntityType(Schema(
          names = setOf(SchemaName("Foo")),
          fields = SchemaFields(
            singletons = mapOf(
              "a" to FieldType.InlineEntity("BarHash"),
              "b" to FieldType.Text,
              "c" to FieldType.Number
            ),
            collections = emptyMap()
          ),
          hash="FooHousePetHash"
        ))),
        expression = PaxelParser.parse(
          """
          new Foo {
            a: new Bar {
              x: input.cat, 
              y: input.dog
            },
            b: input.foo,
            c: 5
          }
          """.trimIndent()
        )
      )
    )
    val particleSpec = ParticleSpec(
      name = "FooHousePets",
      location = "arcs.analysis.FooHousePets",
      connections = connections
    )
    val particle = Recipe.Particle(particleSpec, emptyList())
    val actual = RecipeGraph.Node.Particle(particle).analyzeExpression()

    assertThat(actual).isEqualTo(
      listOf(
        Claim.DerivesFrom(
          AccessPath(particle, connections["output"]!!, listOf("a", "x").asFields()),
          AccessPath(particle, connections["input"]!!, listOf("cat").asFields())
        ),
        Claim.DerivesFrom(
          AccessPath(particle, connections["output"]!!, listOf("a", "y").asFields()),
          AccessPath(particle, connections["input"]!!, listOf("dog").asFields())
        ),
        Claim.DerivesFrom(
          AccessPath(particle, connections["output"]!!, listOf("b").asFields()),
          AccessPath(particle, connections["input"]!!, listOf("foo").asFields())
        )
      )
    )
  }
}


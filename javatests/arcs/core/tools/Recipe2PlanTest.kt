package javatests.arcs.core.tools

import arcs.core.data.*
import arcs.core.tools.Recipe2Plan
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import com.google.common.truth.Truth.assertThat
import org.junit.Assert.assertThat


@RunWith(JUnit4::class)
class Recipe2PlanTest {
    @Test
    fun schemaGeneration_singleProperty() {

        val testSchema = Schema(
            listOf(SchemaName("Slice")),
            SchemaFields(
                singletons = mapOf(
                    "num" to FieldType.Number,
                    "flg" to FieldType.Boolean,
                    "txt" to FieldType.Text
                ),
                collections = mapOf()
            ),
            "f4907f97574693c81b5d62eb009d1f0f209000b8"
        )

        val r2p = Recipe2Plan()
        val schemaProperty = r2p.generateSchemas(listOf(testSchema)).first()

        // TODO(alxr): Add asserts

    }

    @Test
    fun planGeneration_singleRecipe() {
        val sliceSchema = Schema(
            listOf(SchemaName("Slice")),
            SchemaFields(
                singletons = mapOf(
                    "num" to FieldType.Number,
                    "flg" to FieldType.Boolean,
                    "txt" to FieldType.Text
                ),
                collections = mapOf()
            ),
            "f4907f97574693c81b5d62eb009d1f0f209000b8"
        )

        val sliceEntity = EntityType(sliceSchema)
        val sliceCollection = CollectionType(sliceEntity)

        val x = Recipe2Plan.Recipe(
            "EntitySlicingTest",
            listOf(
                Plan.Particle(
                    "EntitySlicingTest",
                    "src/wasm/tests/\$module.wasm",
                    mapOf(
                        "s1" to Plan.HandleConnection(null, sliceEntity),
                        "s2" to Plan.HandleConnection(null, sliceEntity),
                        "c1" to Plan.HandleConnection(null, sliceCollection)
                    )

                )
            )
        )

        val r2p = Recipe2Plan()

        val typeBuilder = r2p.generatePlans(listOf(x)).first()

        val str = typeBuilder.toString()

        // TODO(alxr): Finish assert
        // assertThat(str).isEqualTo()
    }
}

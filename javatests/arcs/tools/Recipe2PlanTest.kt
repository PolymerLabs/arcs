package javatests.arcs.core.tools

import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.tools.Recipe2Plan
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class Recipe2PlanTest {
    @Test
    fun schemaGeneration_singleProperty() {

        val testSchema = Schema(
            setOf(SchemaName("Slice")),
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

//        val x = Recipe2Plan.Recipe(
//            "EntitySlicingTest",
//            listOf(
//                Plan.Particle(
//                    "EntitySlicingTest",
//                    "src/wasm/tests/\$module.wasm",
//                    mapOf(
//                        "s1" to Plan.HandleConnection(null, sliceEntity),
//                        "s2" to Plan.HandleConnection(null, sliceEntity),
//                        "c1" to Plan.HandleConnection(null, sliceCollection)
//                    )
//
//                )
//            )
//        )

        val r2p = Recipe2Plan()

//        val typeBuilder = r2p.generatePlans(listOf(x)).first()

        // TODO(alxr): Finish assert
        // assertThat(str).isEqualTo()
    }
}

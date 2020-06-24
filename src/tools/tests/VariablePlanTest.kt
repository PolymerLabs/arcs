package src.tools.tests

import arcs.core.data.FieldType
import arcs.core.data.SchemaFields
import arcs.core.data.proto.ManifestProto
import arcs.core.data.proto.decodeRecipes
import arcs.core.data.toPlan
import arcs.core.host.toSchema
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.repoutils.runfilesDir
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.io.File

@RunWith(JUnit4::class)
class VariablePlanTest {
    @Test
    fun variable_hasSameSchema() {
        DriverAndKeyConfigurator.configure(null)

        val ingestParticle = VariableIngestionPlan.particles.first { it.particleName == "Ingest"}
        val processParticle = VariableIngestionPlan.particles.first { it.particleName == "Process" }

        val ingestSchema = ingestParticle.handles.values.single().type.toSchema()
        val processSchema = processParticle.handles.values.single().type.toSchema()

        assertThat(ingestSchema.name?.name).isEqualTo("Action")
        assertThat(processSchema.fields).isEqualTo(SchemaFields(
            mapOf(
                "sessionId" to FieldType.Text,
                "action" to FieldType.Text,
                "timestampInMs" to FieldType.Number
            ),
            emptyMap()
        ))

        assertThat(processSchema.toLiteral()).isEqualTo(ingestSchema.toLiteral())
    }

    @Test
    fun variable_recipePlanEquivalence() {
        DriverAndKeyConfigurator.configure(null)

        val manifestProto = ManifestProto.parseFrom(
            File(runfilesDir() + "src/tools/tests/variable-proto.pb.bin").readBytes()
        )
        val recipes = manifestProto.decodeRecipes()

        val variableIngestionRecipe = recipes.first { it.name == "VariableIngestion" }

        val fromRecipe = variableIngestionRecipe.toPlan()

        assertThat(fromRecipe.particles).isEqualTo(VariableIngestionPlan.particles)
    }
}

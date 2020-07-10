package arcs.core.analysis

import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe
import arcs.core.data.Recipe.Handle
import arcs.core.data.Recipe.Particle
import arcs.core.data.Recipe.Particle.HandleConnection
import arcs.core.data.TypeVariable
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for TypeConstraints. */
@RunWith(JUnit4::class)
class TypeConstraintsTest {
    // ---- The test environment ----
    //
    //  particle ConnectionsTest
    //    text_cnxn: reads
    //    word_cnxn: reads
    //    num_cnxn: reads
    //
    //  particle TypeVariablesTest
    //    num_cnxn: reads TypeVariable("num_type")
    //    int_cnxn: reads TypeVariable("num_type")
    //
    val textHandle = Handle(
        "text",
        Handle.Fate.CREATE,
        TypeVariable("text")
    )
    val numHandle = Handle(
        "num",
        Handle.Fate.CREATE,
        TypeVariable("num")
    )
    val intHandle = Handle(
        "int",
        Handle.Fate.CREATE,
        TypeVariable("int")
    )
    val textCnxnSpec = HandleConnectionSpec("text_cnxn", HandleMode.Read, TypeVariable("text_cnxn"))
    val wordCnxnSpec = HandleConnectionSpec("word_cnxn", HandleMode.Read, TypeVariable("word_cnxn"))
    val numCnxnSpec = HandleConnectionSpec("num_cnxn", HandleMode.Read, TypeVariable("num_type"))
    // numCnxnSpec has the same type variable name as [numCnxnSpec]
    val intCnxnSpec = HandleConnectionSpec("int_cnxn", HandleMode.Write, TypeVariable("num_type"))

    val connectionsTestSpec = ParticleSpec(
        "ConnectionsTest",
        listOf(textCnxnSpec, wordCnxnSpec, numCnxnSpec).associateBy { it.name },
        "ConnectionsTestLocation"
    )
    val typeVariablesTestSpec = ParticleSpec(
        "TypeVariablesTest",
        listOf(numCnxnSpec, intCnxnSpec).associateBy { it.name },
        "TypeVariablesTestLocation"
    )

    @Test
    fun typeConstraintToStringTests() {
        val connectionNode = TypeConstraintNode.HandleConnection(typeVariablesTestSpec, intCnxnSpec)
        assertThat("$connectionNode").isEqualTo("TypeVariablesTest.int_cnxn")
        val handleNode = TypeConstraintNode.Handle(intHandle)
        assertThat("$handleNode").isEqualTo("int")
    }

    @Test
    fun typeConstraintEqualsTests() {
        val constraint1 = TypeConstraint(
            TypeConstraintNode.HandleConnection(typeVariablesTestSpec, intCnxnSpec),
            TypeConstraintNode.Handle(intHandle)
        )
        val constraint2 = TypeConstraint(
            TypeConstraintNode.HandleConnection(typeVariablesTestSpec, intCnxnSpec),
            TypeConstraintNode.HandleConnection(typeVariablesTestSpec, numCnxnSpec)
        )
        assertThat(constraint1).isEqualTo(constraint1)
        assertThat(constraint2).isEqualTo(constraint2)
        assertThat(constraint1).isNotEqualTo(constraint2)
    }

    @Test
    fun typeConstraintHashAndEqualsIgnoresOrder() {
        val constraint1 = TypeConstraint(
            TypeConstraintNode.HandleConnection(typeVariablesTestSpec, intCnxnSpec),
            TypeConstraintNode.Handle(intHandle)
        )
        val constraint2 = TypeConstraint(
            TypeConstraintNode.Handle(intHandle),
            TypeConstraintNode.HandleConnection(typeVariablesTestSpec, intCnxnSpec)
        )
        assertThat(constraint1).isEqualTo(constraint2)
        assertThat(constraint1.hashCode()).isEqualTo(constraint2.hashCode())
    }

    @Test
    fun createsConnectionConstraints() {
        // ConnectionsTest:
        //   text_cnxn: reads text
        //   word_cnxn: reads text
        //   num_cnxn: reads num
        val connectionsTestParticle = Recipe.Particle(
            connectionsTestSpec,
            listOf(
                HandleConnection(textCnxnSpec, textHandle, TypeVariable("text")),
                HandleConnection(wordCnxnSpec, textHandle, TypeVariable("text")),
                HandleConnection(numCnxnSpec, numHandle, TypeVariable("num"))
            )
        )
        val constraints = connectionsTestParticle.getTypeConstraints()
        assertThat(constraints).containsExactly(
            TypeConstraint(
                TypeConstraintNode.HandleConnection(connectionsTestSpec, textCnxnSpec),
                TypeConstraintNode.Handle(textHandle)
            ),
            TypeConstraint(
                TypeConstraintNode.HandleConnection(connectionsTestSpec, wordCnxnSpec),
                TypeConstraintNode.Handle(textHandle)
            ),
            TypeConstraint(
                TypeConstraintNode.HandleConnection(connectionsTestSpec, numCnxnSpec),
                TypeConstraintNode.Handle(numHandle)
            )
        )
    }

    @Test
    fun createsTypeVariableConstraints() {
        // TypeVariablesTest:
        //   num_cnxn: reads num
        //   int_cnxn: reads int
        val typeVariablesTestParticle = Recipe.Particle(
            typeVariablesTestSpec,
            listOf(
                HandleConnection(numCnxnSpec, numHandle, TypeVariable("num")),
                HandleConnection(intCnxnSpec, intHandle, TypeVariable("int"))
            )
        )
        val constraints = typeVariablesTestParticle.getTypeConstraints()
        assertThat(constraints).containsExactly(
            TypeConstraint(
                TypeConstraintNode.HandleConnection(typeVariablesTestSpec, numCnxnSpec),
                TypeConstraintNode.Handle(numHandle)
            ),
            TypeConstraint(
                TypeConstraintNode.HandleConnection(typeVariablesTestSpec, intCnxnSpec),
                TypeConstraintNode.Handle(intHandle)
            ),
            TypeConstraint(
                TypeConstraintNode.HandleConnection(typeVariablesTestSpec, intCnxnSpec),
                TypeConstraintNode.HandleConnection(typeVariablesTestSpec, numCnxnSpec)
            )
        )
    }
}

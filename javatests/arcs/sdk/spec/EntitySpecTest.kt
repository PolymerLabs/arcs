package arcs.sdk.spec

import arcs.core.common.Id
import arcs.core.data.RawEntity
import arcs.core.data.RawEntity.Companion.NO_REFERENCE_ID
import arcs.core.data.Ttl
import arcs.core.data.util.toReferencable
import arcs.core.entity.SchemaRegistry
import arcs.core.testutil.runTest
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.Reference
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.withContext
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

private typealias Foo = EntitySpecParticle_Foo
private typealias Bar = EntitySpecParticle_Bars

/** Specification tests for entities. */
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class EntitySpecTest {

    class EntitySpecParticle : AbstractEntitySpecParticle()

    private lateinit var idGenerator: Id.Generator
    private var currentTime: Long = 500L

    @get:Rule
    val log = LogRule()

    @get:Rule
    val harness = EntitySpecParticleTestHarness { EntitySpecParticle() }

    @Before
    fun setUp() {
        idGenerator = Id.Generator.newForTest("session")
    }

    @Test
    fun createEmptyInstance() {
        val entity = Foo()
        assertThat(entity.bool).isFalse()
        assertThat(entity.num).isEqualTo(0.0)
        assertThat(entity.text).isEqualTo("")
        assertThat(entity.ref).isNull()
        assertThat(entity.bt).isEqualTo(0)
        assertThat(entity.shrt).isEqualTo(0)
        assertThat(entity.nt).isEqualTo(0)
        assertThat(entity.lng).isEqualTo(0L)
        assertThat(entity.chr).isEqualTo('\u0000')
        assertThat(entity.flt).isEqualTo(0.0f)
        assertThat(entity.dbl).isEqualTo(0.0)
        assertThat(entity.bools).isEmpty()
        assertThat(entity.nums).isEmpty()
        assertThat(entity.texts).isEmpty()
        assertThat(entity.refs).isEmpty()
        assertThat(entity.bts).isEmpty()
        assertThat(entity.shrts).isEmpty()
        assertThat(entity.nts).isEmpty()
        assertThat(entity.lngs).isEmpty()
        assertThat(entity.chrs).isEmpty()
        assertThat(entity.flts).isEmpty()
        assertThat(entity.dbls).isEmpty()
    }

    @Test
    fun createWithFieldValues() = runTest {
        harness.start()

        val ref1 = createBarReference(Bar(value = "bar1"))
        val ref2 = createBarReference(Bar(value = "bar2"))
        val ref3 = createBarReference(Bar(value = "bar3"))
        val entity = Foo(
            bool = true,
            num = 123.0,
            text = "abc",
            ref = ref1,
            bt = 47,
            shrt = 30000,
            nt = 1000000000,
            lng = 15000000000L,
            chr = 'A',
            flt = 43.23f,
            dbl = 77.66E200,
            bools = setOf(false),
            nums = setOf(456.0, 789.0),
            texts = setOf("def", "ghi"),
            refs = setOf(ref2, ref3),
            bts = setOf(23, 34),
            shrts = setOf(234, 345),
            nts = setOf(234567, 345678),
            lngs = setOf(1L, 1234567890123L),
            chrs = setOf('A', 'R', 'C', 'S'),
            flts = setOf(2.3f, 3.4f),
            dbls = setOf(2.3E200, 3.4E100)
        )
        assertThat(entity.bool).isEqualTo(true)
        assertThat(entity.num).isEqualTo(123.0)
        assertThat(entity.text).isEqualTo("abc")
        assertThat(entity.ref).isEqualTo(ref1)
        assertThat(entity.bt).isEqualTo(47)
        assertThat(entity.shrt).isEqualTo(30000)
        assertThat(entity.nt).isEqualTo(1000000000)
        assertThat(entity.lng).isEqualTo(15000000000L)
        assertThat(entity.chr).isEqualTo('A')
        assertThat(entity.flt).isEqualTo(43.23f)
        assertThat(entity.dbl).isEqualTo(77.66E200)
        assertThat(entity.bools).containsExactly(false)
        assertThat(entity.nums).containsExactly(456.0, 789.0)
        assertThat(entity.texts).containsExactly("def", "ghi")
        assertThat(entity.refs).containsExactly(ref2, ref3)
        assertThat(entity.bts).containsExactly(23.toByte(), 34.toByte())
        assertThat(entity.shrts).containsExactly(234.toShort(), 345.toShort())
        assertThat(entity.nts).containsExactly(234567, 345678)
        assertThat(entity.lngs).containsExactly(1L, 1234567890123L)
        assertThat(entity.chrs).containsExactly('A', 'R', 'C', 'S')
        assertThat(entity.flts).containsExactly(2.3f, 3.4f)
        assertThat(entity.dbls).containsExactly(2.3E200, 3.4E100)
    }

    @Test
    fun ensureEntityFields() {
        val entity = Foo()
        assertThat(entity.entityId).isNull()

        entity.ensureEntityFields(idGenerator, "handle", FakeTime(currentTime))
        val entityId = entity.entityId

        // Check that the entity ID has been set to *something*.
        assertThat(entityId).isNotNull()
        assertThat(entityId).isNotEmpty()
        assertThat(entityId).isNotEqualTo(NO_REFERENCE_ID)
        assertThat(entityId).contains("handle")

        val creationTimestamp = entity.serialize().creationTimestamp
        assertThat(creationTimestamp).isEqualTo(currentTime)

        // Calling it again doesn't overwrite id and timestamp.
        entity.ensureEntityFields(idGenerator, "something-else", FakeTime(currentTime+10))
        assertThat(entity.entityId).isEqualTo(entityId)
        assertThat(entity.serialize().creationTimestamp).isEqualTo(creationTimestamp)
    }

    @Test
    fun expiryTimestamp() {
        val entity = Foo()
        
        entity.ensureEntityFields(idGenerator, "handle", FakeTime(currentTime), Ttl.Minutes(1))
        
        val expirationTimestamp = entity.serialize().expirationTimestamp
        assertThat(expirationTimestamp).isEqualTo(currentTime + 60000) // 1 minute = 60'000 milliseconds
    }

    @Test
    fun copy() = runTest {
        harness.start()

        val ref1 = createBarReference(Bar(value = "bar1"))
        val ref2 = createBarReference(Bar(value = "bar2"))
        val ref3 = createBarReference(Bar(value = "bar3"))
        val entity = Foo(
            bool = true,
            num = 123.0,
            text = "abc",
            ref = ref1,
            bt = 47,
            shrt = 30000,
            nt = 1000000000,
            lng = 15000000000L,
            chr = 'A',
            flt = 43.23f,
            dbl = 77.66E200,
            bools = setOf(false),
            nums = setOf(456.0, 789.0),
            texts = setOf("def", "ghi"),
            refs = setOf(ref2, ref3),
            bts = setOf(23, 34),
            shrts = setOf(234, 345),
            nts = setOf(234567, 345678),
            lngs = setOf(1L, 1234567890123L),
            chrs = setOf('A', 'R', 'C', 'S'),
            flts = setOf(2.3f, 3.4f),
            dbls = setOf(2.3E200, 3.4E100)
        )

        // Copying an unidentified entity should give an exact copy of the entity.
        assertThat(entity.copy()).isEqualTo(entity)

        // Copying an identified entity should reset the ID.
        entity.identify()
        val copy1 = entity.copy()
        assertThat(copy1.entityId).isNull()
        assertThat(copy1).isNotEqualTo(entity)

        // Copying an entity with replacement fields should overwrite those fields in the copy.
        val copy2 = entity.copy(
            bool = false,
            num = 456.0,
            text = "xyz",
            ref = ref2,
            bt = 25,
            shrt = -20000,
            nt = -900000000,
            lng = -16000000000L,
            chr = 'a',
            flt = 23.43f,
            dbl = 66.77E100,
            bools = setOf(true),
            nums = setOf(111.0, 222.0),
            texts = setOf("aaa", "bbb"),
            refs = setOf(ref1, ref3),
            bts = setOf(45, 56),
            shrts = setOf(456, 567),
            nts = setOf(456789, 567890),
            lngs = setOf(1L, 2345678901234L),
            chrs = setOf('R', 'O', 'C', 'K', 'S'),
            flts = setOf(4.5f, 5.6f),
            dbls = setOf(4.5E50, 5.6E60)
        )
        assertThat(copy2.entityId).isNull()
        assertThat(copy2.bool).isFalse()
        assertThat(copy2.num).isEqualTo(456.0)
        assertThat(copy2.text).isEqualTo("xyz")
        assertThat(copy2.ref).isEqualTo(ref2)
        assertThat(copy2.bt).isEqualTo(25)
        assertThat(copy2.shrt).isEqualTo(-20000)
        assertThat(copy2.nt).isEqualTo(-900000000)
        assertThat(copy2.lng).isEqualTo(-16000000000L)
        assertThat(copy2.chr).isEqualTo('a')
        assertThat(copy2.flt).isEqualTo(23.43f)
        assertThat(copy2.dbl).isEqualTo(66.77E100)
        assertThat(copy2.bools).containsExactly(true)
        assertThat(copy2.nums).containsExactly(111.0, 222.0)
        assertThat(copy2.texts).containsExactly("aaa", "bbb")
        assertThat(copy2.refs).containsExactly(ref1, ref3)
        assertThat(copy2.bts).containsExactly(45.toByte(), 56.toByte())
        assertThat(copy2.shrts).containsExactly(456.toShort(), 567.toShort())
        assertThat(copy2.nts).containsExactly(456789, 567890)
        assertThat(copy2.lngs).containsExactly(1L, 2345678901234L)
        assertThat(copy2.chrs).containsExactly('R', 'O', 'C', 'K', 'S')
        assertThat(copy2.flts).containsExactly(4.5f, 5.6f)
        assertThat(copy2.dbls).containsExactly(4.5E50, 5.6E60)
    }

    @Test
    fun serialize_roundTrip() = runTest {
        harness.start()

        val ref1 = createBarReference(Bar(value = "bar1"))
        val ref2 = createBarReference(Bar(value = "bar2"))
        val ref3 = createBarReference(Bar(value = "bar3"))
        val entity = Foo(
            bool = true,
            num = 123.0,
            text = "abc",
            ref = ref1,
            bt = 47,
            shrt = 30000,
            nt = 1000000000,
            lng = 15000000000L,
            chr = 'A',
            flt = 43.23f,
            dbl = 77.66E200,
            bools = setOf(false),
            nums = setOf(456.0, 789.0),
            texts = setOf("def", "ghi"),
            refs = setOf(ref2, ref3),
            bts = setOf(23, 34),
            shrts = setOf(234, 345),
            nts = setOf(234567, 345678),
            lngs = setOf(1L, 1234567890123L),
            chrs = setOf('A', 'R', 'C', 'S'),
            flts = setOf(2.3f, 3.4f),
            dbls = setOf(2.3E200, 3.4E100)
        )
        val entityId = entity.identify()

        val rawEntity = entity.serialize()

        assertThat(rawEntity).isEqualTo(
            RawEntity(
                entityId,
                singletons = mapOf(
                    "bool" to true.toReferencable(),
                    "num" to 123.0.toReferencable(),
                    "text" to "abc".toReferencable(),
                    "ref" to ref1.toReferencable(),
                    "bt" to 47.toByte().toReferencable(),
                    "shrt" to 30000.toShort().toReferencable(),
                    "nt" to 1000000000.toReferencable(),
                    "lng" to 15000000000L.toReferencable(),
                    "chr" to 'A'.toReferencable(),
                    "flt" to 43.23f.toReferencable(),
                    "dbl" to 77.66E200.toReferencable()
                ),
                collections = mapOf(
                    "bools" to setOf(false.toReferencable()),
                    "nums" to setOf(456.0.toReferencable(), 789.0.toReferencable()),
                    "texts" to setOf("def".toReferencable(), "ghi".toReferencable()),
                    "refs" to setOf(ref2.toReferencable(), ref3.toReferencable()),
                    "bts" to setOf(23.toByte().toReferencable(), 34.toByte().toReferencable()),
                    "shrts" to setOf(234.toShort().toReferencable(), 345.toShort().toReferencable()),
                    "nts" to setOf(234567.toReferencable(), 345678.toReferencable()),
                    "lngs" to setOf(1L.toReferencable(), 1234567890123L.toReferencable()),
                    "chrs" to setOf('A'.toReferencable(), 'R'.toReferencable(), 'C'.toReferencable(), 'S'.toReferencable()),
                    "flts" to setOf(2.3f.toReferencable(), 3.4f.toReferencable()),
                    "dbls" to setOf(2.3E200.toReferencable(), 3.4E100.toReferencable())
                ),
                creationTimestamp = 500L
            )
        )
        assertThat(Foo.deserialize(rawEntity)).isEqualTo(entity)
    }

    @Test
    fun schemaRegistry() {
        // The entity class should have registered itself statically.
        val hash = Foo.SCHEMA.hash
        assertThat(SchemaRegistry.getSchema(hash)).isEqualTo(Foo.SCHEMA)
    }

    /**
     * Stores the given [Bar] entity in a collection, and then creates and returns a reference to
     * it.
     */
    private suspend fun createBarReference(bar: Bar): Reference<Bar> =
        withContext(harness.bars.dispatcher) {
            harness.bars.store(bar)
            harness.bars.createReference(bar)
        }

    /** Generates and returns an ID for the entity. */
    private fun (Foo).identify(): String {
        assertThat(entityId).isNull()
        ensureEntityFields(idGenerator, "handleName", FakeTime(currentTime))
        assertThat(entityId).isNotNull()
        return entityId!!
    }
}

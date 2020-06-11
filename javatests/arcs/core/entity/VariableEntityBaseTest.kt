package arcs.core.entity

import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4


@RunWith(JUnit4::class)
@Suppress("UNCHECKED_CAST")
class VariableEntityBaseTest {

    private lateinit var entity: DummyVariableEntity

    @Before
    fun setUp() {
        SchemaRegistry.register(DummyVariableEntity.SCHEMA)
        entity = DummyVariableEntity()
    }

    @After
    fun tearDown() {
        SchemaRegistry.clearForTest()
    }

    @Test
    fun serializationRoundTrip() {
        // TODO(alxr): Implement
    }

}

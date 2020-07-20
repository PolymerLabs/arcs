package arcs.showcase.kotlintypes

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Job

class IntegralReader : AbstractIntegralReader() {
    override fun onReady() {
        val entity = requireNotNull(handles.inputs.fetch())
        {
            "Failed to read entity from input handle!"
        }
        assertThat(entity.aByte).isEqualTo(42.toByte())
        assertThat(entity.aShort).isEqualTo(280.toShort())
        assertThat(entity.anInt).isEqualTo(70000)
        assertThat(entity.aLong).isEqualTo(10000000000L)
        updated.complete()
    }

    companion object {
        val updated = Job()
    }
}

class FloatingReader : AbstractFloatingReader() {
    override fun onReady() {
        val entity = requireNotNull(handles.inputs.fetch())
        {
            "Failed to read entity from input handle!"
        }

        assertThat(entity.aFloat).isEqualTo(255.5f)
        assertThat(entity.aDouble).isEqualTo(255.5E100)
        updated.complete()
    }

    companion object {
        val updated = Job()
    }

}

class CharReader : AbstractCharReader() {
    override fun onReady() {
        val entity = requireNotNull(handles.inputs.fetch())
        {
            "Failed to read entity from input handle!"
        }

        assertThat(entity.aChar).isEqualTo('A')
        updated.complete()
    }

    companion object {
        val updated = Job()
    }

}

class IntegralSetReader : AbstractIntegralSetReader() {
    override fun onUpdate() {
        val entity = requireNotNull(handles.inputs.fetch())
        {
            "Failed to read entity from input handle!"
        }

        assertThat(entity.someBytes).containsExactly(42.toByte())
        assertThat(entity.someShorts).containsExactly(42.toShort(), 280.toShort())
        assertThat(entity.someInts).containsExactly(42, 280, 70000)
        assertThat(entity.someLongs).containsExactly(42L, 280L, 70000L, 10000000000L)
        updated.complete()
    }

    companion object {
        val updated = Job()
    }

}

class FloatingSetReader : AbstractFloatingSetReader() {
    override fun onUpdate() {
        val entity = requireNotNull(handles.inputs.fetch())
        {
            "Failed to read entity from input handle!"
        }

        assertThat(entity.someFloats).containsExactly(255.5f)
        assertThat(entity.someDoubles).containsExactly(255.5, 255.5E100)
        updated.complete()
    }

    companion object {
        val updated = Job()
    }

}

class CharSetReader : AbstractCharSetReader() {
    override fun onUpdate() {
        val entity = requireNotNull(handles.inputs.fetch())
        {
            "Failed to read entity from input handle!"
        }

        assertThat(entity.someChars).containsExactly('A')
        updated.complete()
    }

    companion object {
        val updated = Job()
    }

}
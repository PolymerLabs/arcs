package arcs.showcase.kotlintypes

class UseUpExtraRegisterSpace : AbstractUseUpExtraRegisterSpace() {

    override fun onReady() {
        val entity = requireNotNull(handles.inputs.fetch()) {
            "Failed to read entity from input handle!"
        }

        val bytes = setOf(entity.aByte)
        val shorts = setOf(entity.aShort, entity.aByte.toShort())
        val ints = setOf(entity.anInt, entity.aShort.toInt(), entity.aByte.toInt())
        val longs = setOf(
            entity.aLong,
            entity.anInt.toLong(),
            entity.aShort.toLong(),
            entity.aByte.toLong()
        )

        val chars = setOf(entity.aChar)

        val floats = setOf(entity.aFloat)
        val doubles = setOf(entity.aDouble, entity.aFloat.toDouble())

        handles.outputs.store(
            KotlinTypeSets(
                someBytes = bytes,
                someShorts = shorts,
                someInts = ints,
                someLongs = longs,
                someChars = chars,
                someFloats = floats,
                someDoubles = doubles
            )
        )
    }
}

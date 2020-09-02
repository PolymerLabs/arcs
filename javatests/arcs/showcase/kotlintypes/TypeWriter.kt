package arcs.showcase.kotlintypes

class TypeWriter : AbstractTypeWriter() {

    override fun onFirstStart() {
        handles.outputs.store(
            KotlinTypes(
                aByte = 42.toByte(),
                aShort = 280.toShort(),
                anInt = 70000,
                aLong = 10000000000L,
                aChar = 'A',
                aFloat = 255.5f,
                aDouble = 255.5E100
            )
        )
    }
}

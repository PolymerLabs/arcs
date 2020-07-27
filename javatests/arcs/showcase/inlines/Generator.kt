package arcs.showcase.inlines

import kotlinx.coroutines.runBlocking

class Generator : AbstractGenerator() {

    override fun onReady() {
        println("Generator::onReady")
        val childEntity = Generator_Child(
            isReferenced = true,
            trackingValue = "Created by Generator [reference]"
        )
        handles.child.store(childEntity)

        handles.parent.store(
            Generator_Parent(
                child = Generator_Parent_Child(
                    isReferenced = false,
                    trackingValue = "Created by Generator [inline]"
                ),
                direct = Generator_Parent_Direct(
                    message = "Direct information inside an inline entity",
                    code = 42
                ),
                reference = runBlocking { handles.child.createReference(childEntity) }
            )
        )
    }
}

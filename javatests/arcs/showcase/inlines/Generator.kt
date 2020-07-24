package arcs.showcase.inlines

class Generator : AbstractGenerator() {

    override fun onReady() {
        val childEntity = ChildEntity(
            isReferenced = True,
            trackingValue = "Created by Generator [reference]"
        )
        handles.child.store(childEntity)

        handles.parent.store(
            ParentEntity(
                child = ChildEntity(
                    isReferenced = False,
                    trackingValue = "Created by Generator [inline]"
                ),
                direct = DirectInformation(
                    message = "Direct information inside an inline entity",
                    code = 42
                )
                reference = handles.child.createReference(childEntity)
            )
        )
    }
}

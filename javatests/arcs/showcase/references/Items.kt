package arcs.showcase.references

data class MyLevel0(
    val name: String
)

data class MyLevel1(
    val name: String,
    val children: Set<MyLevel0>
)

data class MyLevel2(
    val name: String,
    val children: Set<MyLevel1>
)


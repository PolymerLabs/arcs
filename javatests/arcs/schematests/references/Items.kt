package arcs.schematests.references

data class Level0(
    val name: String
)

data class Level1(
    val name: String,
    val children: Set<Level0>
)

data class Level2(
    val name: String,
    val children: Set<Level1>
)


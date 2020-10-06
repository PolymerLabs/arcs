package arcs.showcase.inline

data class MyLevel0(
  val name: String
)

data class MyLevel1(
  val name: String,
  val children: List<MyLevel0>
)

data class MyLevel2(
  val name: String,
  val children: List<MyLevel1>
)

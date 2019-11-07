load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_binary", "arcs_kt_schema")

arcs_kt_schema(
    name = "game_schemas",
    srcs = ["TTTGame.arcs"],
)

arcs_kt_binary(
    name = "TTTBoard",
    srcs = ["TTTBoard.kt"],
    deps = [":game_schemas"],
)

arcs_kt_binary(
    name = "TTTGame",
    srcs = ["TTTGame.kt"],
)

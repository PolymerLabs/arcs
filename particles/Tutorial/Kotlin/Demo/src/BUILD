load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_particles",
    "arcs_kt_schema",
)

licenses(["notice"])

arcs_kt_schema(
    name = "game_schemas",
    srcs = ["TTTGame.arcs"],
)

arcs_kt_particles(
    name = "particles",
    srcs = glob(["*.kt"]),
    package = "arcs.tutorials.tictactoe",
    platforms = ["wasm"],
    deps = [":game_schemas"],
)

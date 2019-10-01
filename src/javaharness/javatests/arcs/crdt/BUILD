
licenses(["notice"])

java_test(
    name = "AllTests",
    srcs = glob(["*.java"]),
    size = "small",
    test_class = "arcs.crdt.AllTests",
    deps = [
        "@junit//jar",
        "//java/arcs/api:api-android",
        "//java/arcs/crdt:crdt-android",
    ],
)

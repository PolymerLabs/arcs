
licenses(["notice"])

java_test(
    name = "AllTests",
    srcs = glob(["*.java"]),
    size = "small",
    test_class = "arcs.crdt.AllTests",
    deps = [
        "@junit//jar",
        "//javaharness/java/arcs/api:api-android",
        "//javaharness/java/arcs/crdt:crdt-android",
    ],
)

#load("@rules_java//java:defs.bzl", "java_test")

java_test(
    name = "AllTests",
    srcs = glob(["*.java"]),
    size = "small",
    test_class = "arcs.impl.AllTests",
    deps = [
        "//java/arcs/impl:impl",
        "@junit//jar",
        "//java/arcs/api",
    ],
)


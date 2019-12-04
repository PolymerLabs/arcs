load("//third_party/java/arcs/build_defs:native.oss.bzl", "java_test")

licenses(["notice"])

java_test(
    name = "AllTests",
    size = "small",
    srcs = glob(["*.java"]),
    test_class = "arcs.api.AllTests",
    deps = [
        "//javaharness/java/arcs/api:api-android",
        "//third_party/java/junit",
    ],
)

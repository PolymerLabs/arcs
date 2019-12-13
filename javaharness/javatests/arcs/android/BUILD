load("//third_party/java/arcs/build_defs:native.oss.bzl", "java_test")

licenses(["notice"])

java_test(
    name = "AllTests",
    size = "small",
    srcs = glob(["*.java"]),
    test_class = "arcs.android.AllTests",
    deps = [
        "//javaharness/java/arcs/android",
        "//javaharness/java/arcs/api:api-android",
        "//third_party/java/json",
        "//third_party/java/junit",
    ],
)

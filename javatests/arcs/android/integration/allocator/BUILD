load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_android_test_suite(
    name = "allocator-tests",
    srcs = glob(["*Test.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.android.integration.allocator",
    deps = [
        "//java/arcs/core/host",
        "//java/arcs/core/util/testutil",
        "//javatests/arcs/android/integration",
        "//javatests/arcs/core/allocator:allocator-test-util",
        "//javatests/arcs/core/host:particle",
        "//javatests/arcs/core/host:plans",
        "//javatests/arcs/core/host:pure-particles-jvm",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

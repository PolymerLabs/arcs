load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_test_suite")

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

TEST_SRCS = glob(["*Test.kt"])

arcs_kt_android_test_suite(
    name = "testutil",
    srcs = TEST_SRCS,
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.core.testutil",
    deps = [
        "//java/arcs/core/testutil",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)

load("//third_party/java/arcs/build_defs/internal:kotlin.bzl", "arcs_kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

GENERATOR_UTIL_SRCS = ["GeneratorUtil.kt"]

# The `testutil` library can be JVM-only, since our unit tests are run on the JVM.
arcs_kt_jvm_library(
    name = "testutil",
    testonly = True,
    srcs = glob(
        ["*.kt"],
        exclude = GENERATOR_UTIL_SRCS,
    ),
    deps = [
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_jvm_library(
    name = "generator_util",
    testonly = True,
    srcs = GENERATOR_UTIL_SRCS,
    deps = [
        ":testutil",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/testutil:generators",
        "//java/arcs/core/data:data-kt",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/testutil:generators",
        "//java/arcs/core/storage/testutil:generators",
    ],
)

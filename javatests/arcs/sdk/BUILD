load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_jvm_test_suite",
    "arcs_kt_plan",
    "arcs_kt_schema",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "sdk",
    srcs = glob(["*Test.kt"]),
    package = "arcs.sdk",
    deps = [
        ":schemas",
        ":schemas_test_harness",
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/entity",
        "//java/arcs/core/entity/testutil",
        "//java/arcs/core/host",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/driver:ramdisk",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//java/arcs/core/testutil/handles",
        "//java/arcs/core/util",
        "//java/arcs/core/util:utils-platform-dependencies",
        "//java/arcs/core/util/testutil",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk:sdk-kt",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_schema(
    name = "schemas",
    srcs = glob(["*.arcs"]),
    test_harness = True,
)

arcs_kt_plan(
    name = "plans",
    srcs = [
        "person.arcs",
    ],
    deps = [
        ":schemas",
    ],
)

arcs_kt_jvm_library(
    name = "particle",
    testonly = 1,
    srcs = glob(
        ["*.kt"],
        exclude = ["*Test.kt"],
    ),
    deps = [
        ":schemas",
        "//java/arcs/sdk",
    ],
)

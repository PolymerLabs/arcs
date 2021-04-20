load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_gen",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

arcs_kt_jvm_test_suite(
    name = "entity",
    srcs = glob(["*.kt"]),
    package = "arcs.core.entity",
    deps = [
        ":codegen",
        "//java/arcs/core/allocator",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/expression",
        "//java/arcs/core/data/testutil",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/entity",
        "//java/arcs/core/entity/testutil",
        "//java/arcs/core/entity/testutil:testutil_mock",
        "//java/arcs/core/host",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/driver:ramdisk",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//java/arcs/core/testutil/handles",
        "//java/arcs/core/type",
        "//java/arcs/core/util",
        "//java/arcs/core/util:utils-platform-dependencies",
        "//java/arcs/core/util/testutil",
        "//java/arcs/flags:flags-kt",
        "//java/arcs/flags:unit_test_build_flags",
        "//java/arcs/flags/testing:testing-kt",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util/testutil",
        "//javatests/arcs/core/host:testhost",
        "//third_party/java/junit:junit-android",
        "//third_party/java/mockito",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
        "//third_party/kotlin/mockito_kotlin",
    ],
)

arcs_kt_gen(
    name = "codegen",
    srcs = ["type_slicing.arcs"],
)

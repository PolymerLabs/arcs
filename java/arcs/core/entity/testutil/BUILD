load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_gen", "arcs_kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

MOCK_SRCS = [
    "StorageMocks.kt",
]

arcs_kt_jvm_library(
    name = "testutil",
    testonly = True,
    srcs = glob(
        ["*.kt"],
        exclude = MOCK_SRCS,
    ),
    exports = [":fixture_arcs_gen"],
    deps = [
        ":fixture_arcs_gen",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt/testutil",
        "//java/arcs/core/crdt/testutil:generators",
        "//java/arcs/core/data:annotations",
        "//java/arcs/core/data:data-kt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/testutil:generators",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/entity",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//java/arcs/core/testutil:generator_util",
        "//java/arcs/core/util",
        "//java/arcs/core/util:utils-platform-dependencies",
    ],
)

arcs_kt_jvm_library(
    name = "testutil_mock",
    testonly = True,
    srcs = MOCK_SRCS,
    add_android_constraints = False,
    exports = [":fixture_arcs_gen"],
    deps = [
        ":testutil",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/entity",
        "//java/arcs/core/storage:storage-kt",
        "//third_party/java/mockito",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/mockito_kotlin",
    ],
)

arcs_kt_gen(
    name = "fixture_arcs_gen",
    srcs = ["fixture.arcs"],
)

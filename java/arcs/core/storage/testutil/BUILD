load("//third_party/java/arcs/build_defs/internal:kotlin.bzl", "arcs_kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

FAKE_DRIVER_PROVIDER_SRCS = [
    "FakeDriverProvider.kt",
    "FakeDriver.kt",
]

GENERATOR_SRCS = [
    "Generators.kt",
]

arcs_kt_jvm_library(
    name = "testutil",
    testonly = True,
    srcs = glob(
        ["*.kt"],
        exclude = FAKE_DRIVER_PROVIDER_SRCS + GENERATOR_SRCS,
    ),
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/testing",
        "//java/arcs/core/crdt/testutil",
        "//java/arcs/core/data:data-kt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/entity",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage:writeback",
        "//java/arcs/core/storage/driver:driver_providers",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/type",
        "//java/arcs/core/util/testutil",
        "//java/arcs/flags/testing",
        "//java/arcs/jvm/util",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)

arcs_kt_jvm_library(
    name = "fake_driver_provider",
    testonly = True,
    srcs = FAKE_DRIVER_PROVIDER_SRCS,
    deps = [
        "//java/arcs/core/crdt",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage:storage_key",
    ],
)

arcs_kt_jvm_library(
    name = "generators",
    testonly = True,
    srcs = GENERATOR_SRCS,
    deps = [
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
    ],
)

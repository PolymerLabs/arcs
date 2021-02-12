load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_jvm_test_suite",
    "arcs_kt_particles",
    "arcs_kt_plan",
    "arcs_kt_schema",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "host",
    size = "large",
    srcs = glob(["*Test.kt"]),
    # TODO(b/157513871): Deflake this test suite.
    flaky = True,
    package = "arcs.core.host",
    deps = [
        ":particle",  # buildcleaner: keep
        ":plans",
        ":schemas",
        ":testhost",
        ":testhostbase",
        "//java/arcs/core/allocator",  # buildcleaner: keep
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/data:schema-serializer",
        "//java/arcs/core/entity",
        "//java/arcs/core/entity/testutil:fixture_arcs_gen",
        "//java/arcs/core/entity/testutil:testutil-kt",
        "//java/arcs/core/host",
        "//java/arcs/core/host/api",
        "//java/arcs/core/storage:storage-kt",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/driver:ramdisk",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//java/arcs/core/testutil/handles",
        "//java/arcs/core/type",
        "//java/arcs/core/util",
        "//java/arcs/core/util/testutil",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk",
        "//third_party/java/junit",
        "//third_party/java/mockito",
        "//third_party/java/truth",
        "//third_party/kotlin/kotlin:kotlin_test",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
        "//third_party/kotlin/mockito_kotlin",
    ],
)

arcs_kt_schema(
    name = "schemas",
    srcs = [
        "lifecycle.arcs",
        "person.arcs",
        "reflective.arcs",
        "test.arcs",
    ],
    test_harness = True,
)

arcs_kt_plan(
    name = "plans",
    srcs = [
        "lifecycle.arcs",
        "person.arcs",
        "reflective.arcs",
    ],
    deps = [
        ":schemas",
    ],
)

arcs_kt_particles(
    name = "pure-particles",
    testonly = 1,
    srcs = [
        "PurePerson.kt",
    ],
    package = "arcs.core.host",
    platforms = ["jvm"],
    deps = [
        ":schemas",
        ":testhost",
        "//java/arcs/jvm/host",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_jvm_library(
    name = "testhost",
    testonly = 1,
    srcs = [
        "TestingHost.kt",
        "TestingJvmProdHost.kt",
    ],
    constraints = ["android"],
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/host/api",
        "//java/arcs/core/storage:storage-kt",
        "//java/arcs/core/util",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk:sdk-kt",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_jvm_library(
    name = "testhostbase",
    testonly = 1,
    srcs = [
        "AbstractArcHostTestBase.kt",
    ],
    constraints = ["android"],
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/entity",
        "//java/arcs/core/entity/testutil",
        "//java/arcs/core/host",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/driver:ramdisk",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil/handles",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk:sdk-kt",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_jvm_library(
    name = "particle",
    testonly = 1,
    srcs = [
        "LifecycleParticles.kt",
        "NonRelevant.kt",
        "ReadPerson.kt",
        "TestHost.kt",
        "TestHostParticle.kt",
        "TestProdParticle.kt",
        "TestReflectiveParticle.kt",
        "WritePerson.kt",
    ],
    deps = [
        ":plans",
        ":pure-particles-jvm",  # buildcleaner: keep
        ":schemas",
        "//java/arcs/core/host",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

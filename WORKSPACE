load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# NodeJS

http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "0942d188f4d0de6ddb743b9f6642a26ce1ad89f09c0035a9a5ca5ba9615c96aa",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/0.38.1/rules_nodejs-0.38.1.tar.gz"],
)

load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories")

node_repositories(
    node_version = "10.16.0",
    package_json = ["//:package.json"],
    yarn_version = "1.13.0",
)

# Java deps from Maven. This has to be declare before rules_kotlin

RULES_JVM_EXTERNAL_TAG = "3.2"

RULES_JVM_EXTERNAL_SHA = "82262ff4223c5fda6fb7ff8bd63db8131b51b413d26eb49e3131037e79e324af"

http_archive(
    name = "rules_jvm_external",
    sha256 = RULES_JVM_EXTERNAL_SHA,
    strip_prefix = "rules_jvm_external-%s" % RULES_JVM_EXTERNAL_TAG,
    url = "https://github.com/bazelbuild/rules_jvm_external/archive/%s.zip" % RULES_JVM_EXTERNAL_TAG,
)

load("@rules_jvm_external//:defs.bzl", "maven_install")

ANDROIDX_LIFECYCLE_VERSION = "2.2.0"

ANDROIDX_TEST_VERSION = "1.2.0"

ANDROIDX_WORK_VERSION = "2.3.1"

AUTO_VALUE_VERSION = "1.7"

AUTO_SERVICE_VERSION = "1.0-rc6"

KOTLINX_ATOMICFU_VERSION = "0.14.2"

KOTLINX_COROUTINES_VERSION = "1.3.4"

ROBOLECTRIC_VERSION = "4.1"

KOTLINPOET_VERSION = "1.0.1"

CLIKT_VERSION = "2.2.0"

UI_AUTOMATOR_VERSION = "2.2.0"

maven_install(
    artifacts = [
        "androidx.appcompat:appcompat:1.1.0",
        "androidx.annotation:annotation:1.1.0",
        "androidx.lifecycle:lifecycle-common:" + ANDROIDX_LIFECYCLE_VERSION,
        "androidx.lifecycle:lifecycle-common-java8:" + ANDROIDX_LIFECYCLE_VERSION,
        "androidx.lifecycle:lifecycle-runtime:" + ANDROIDX_LIFECYCLE_VERSION,
        "androidx.lifecycle:lifecycle-service:" + ANDROIDX_LIFECYCLE_VERSION,
        "androidx.webkit:webkit:1.1.0-rc01",
        "androidx.work:work-runtime:" + ANDROIDX_WORK_VERSION,
        "androidx.work:work-testing:" + ANDROIDX_WORK_VERSION,
        "androidx.test:core:" + ANDROIDX_TEST_VERSION,
        "androidx.test.ext:junit:1.1.1",
        "androidx.test:monitor:" + ANDROIDX_TEST_VERSION,
        "androidx.test:runner:" + ANDROIDX_TEST_VERSION,
        "androidx.test:rules:" + ANDROIDX_TEST_VERSION,
        "androidx.test.uiautomator:uiautomator:" + UI_AUTOMATOR_VERSION,
        "com.google.flogger:flogger:0.4",
        "com.google.code.findbugs:jsr305:3.0.2",
        "com.google.flogger:flogger-system-backend:0.4",
        "com.google.dagger:dagger:2.23.1",
        "com.google.dagger:dagger-compiler:2.23.1",
        "com.google.auto.value:auto-value:" + AUTO_VALUE_VERSION,
        "com.google.auto.value:auto-value-annotations:" + AUTO_VALUE_VERSION,
        "com.google.auto.service:auto-service:" + AUTO_SERVICE_VERSION,
        "com.google.auto.service:auto-service-annotations:" + AUTO_SERVICE_VERSION,
        "com.google.protobuf:protobuf-java:3.11.4",
        "com.google.truth:truth:1.0",
        "com.github.ajalt:clikt:" + CLIKT_VERSION,
        "com.nhaarman.mockitokotlin2:mockito-kotlin:2.2.0",
        "javax.inject:javax.inject:1",
        "junit:junit:4.11",
        "org.jetbrains.kotlin:kotlin-test:1.3.72",
        "org.jetbrains.kotlinx:kotlinx-coroutines-android:" + KOTLINX_COROUTINES_VERSION,
        "org.jetbrains.kotlinx:kotlinx-coroutines-core:" + KOTLINX_COROUTINES_VERSION,
        "org.jetbrains.kotlinx:kotlinx-coroutines-core-js:" + KOTLINX_COROUTINES_VERSION,
        "org.jetbrains.kotlinx:kotlinx-coroutines-test:" + KOTLINX_COROUTINES_VERSION,
        "org.jetbrains.kotlinx:atomicfu:" + KOTLINX_ATOMICFU_VERSION,
        "org.jetbrains.kotlinx:atomicfu-js:" + KOTLINX_ATOMICFU_VERSION,
        "org.json:json:20141113",
        "org.mockito:mockito-core:2.23.0",
        "org.robolectric:robolectric:" + ROBOLECTRIC_VERSION,
        "org.robolectric:shadowapi:" + ROBOLECTRIC_VERSION,
        "org.robolectric:shadows-framework:" + ROBOLECTRIC_VERSION,
        "com.squareup:kotlinpoet:" + KOTLINPOET_VERSION,
    ],
    fetch_sources = True,
    repositories = [
        "https://jcenter.bintray.com/",
        "https://maven.google.com",
        "https://repo1.maven.org/maven2",
    ],
)

# @rules_proto is used by KotlincWorker and must be declared before rules_kotlin

http_archive(
    name = "rules_proto",
    sha256 = "602e7161d9195e50246177e7c55b2f39950a9cf7366f74ed5f22fd45750cd208",
    strip_prefix = "rules_proto-97d8af4dc474595af3900dd85cb3a29ad28cc313",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_proto/archive/97d8af4dc474595af3900dd85cb3a29ad28cc313.tar.gz",
        "https://github.com/bazelbuild/rules_proto/archive/97d8af4dc474595af3900dd85cb3a29ad28cc313.tar.gz",
    ],
)

load("@rules_proto//proto:repositories.bzl", "rules_proto_dependencies", "rules_proto_toolchains")

rules_proto_dependencies()

rules_proto_toolchains()

# Install Emscripten via the emsdk.

load("//build_defs/emscripten:repo.bzl", "emsdk_repo")

emsdk_repo()

# Install the Kotlin-Native compiler

load("//build_defs/kotlin_native:repo.bzl", "kotlin_native_repo")

kotlin_native_repo(name = "kotlin_native_local")

# Android SDK

android_sdk_repository(
    name = "androidsdk",
    api_level = 29,
)

http_archive(
    name = "build_bazel_rules_android",
    sha256 = "cd06d15dd8bb59926e4d65f9003bfc20f9da4b2519985c27e190cddc8b7a7806",
    strip_prefix = "rules_android-0.1.1",
    urls = ["https://github.com/bazelbuild/rules_android/archive/v0.1.1.zip"],
)

# Kotlin

load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")

git_repository(
    name = "io_bazel_rules_kotlin",
    commit = "eb353b2d3ed3a6634e9028ffb0e8af8321a12c9c",
    remote = "https://github.com/cromwellian/rules_kotlin.git",
    shallow_since = "1585186427 -0700",
)

load("@io_bazel_rules_kotlin//kotlin:dependencies.bzl", "kt_download_local_dev_dependencies")
load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kotlin_repositories")

KOTLIN_VERSION = "1.3.70"

KOTLINC_RELEASE_SHA = "709d782ff707a633278bac4c63bab3026b768e717f8aaf62de1036c994bc89c7"

KOTLINC_RELEASE = {
    "urls": [
        "https://github.com/JetBrains/kotlin/releases/download/v{v}/kotlin-compiler-{v}.zip".format(v = KOTLIN_VERSION),
    ],
    "sha256": KOTLINC_RELEASE_SHA,
}

kt_download_local_dev_dependencies()

kotlin_repositories(compiler_release = KOTLINC_RELEASE)

register_toolchains("//third_party/java/arcs/build_defs/internal:kotlin_toolchain")

# Robolectric

http_archive(
    name = "robolectric",
    sha256 = "2ee850ca521288db72b0dedb9ecbda55b64d11c470435a882f8daf615091253d",
    strip_prefix = "robolectric-bazel-4.1",
    urls = ["https://github.com/robolectric/robolectric-bazel/archive/4.1.tar.gz"],
)

load("@robolectric//bazel:robolectric.bzl", "robolectric_repositories")

robolectric_repositories()

# Python

http_archive(
    name = "rules_python",
    sha256 = "aa96a691d3a8177f3215b14b0edc9641787abaaa30363a080165d06ab65e1161",
    url = "https://github.com/bazelbuild/rules_python/releases/download/0.0.1/rules_python-0.0.1.tar.gz",
)

load("@rules_python//python:repositories.bzl", "py_repositories")

py_repositories()

# Protobuf

# Note: using the gRPC protobuf rules, since they seem to be the most
# comprehensive and best documented:
# https://github.com/rules-proto-grpc/rules_proto_grpc

http_archive(
    name = "rules_proto_grpc",
    sha256 = "5f0f2fc0199810c65a2de148a52ba0aff14d631d4e8202f41aff6a9d590a471b",
    strip_prefix = "rules_proto_grpc-1.0.2",
    urls = ["https://github.com/rules-proto-grpc/rules_proto_grpc/archive/1.0.2.tar.gz"],
)

load(
    "@rules_proto_grpc//android:repositories.bzl",
    rules_proto_grpc_android_repos = "android_repos",
)

rules_proto_grpc_android_repos()

load("@io_grpc_grpc_java//:repositories.bzl", "grpc_java_repositories")

grpc_java_repositories(
    omit_bazel_skylib = True,
    omit_com_google_protobuf = True,
    omit_com_google_protobuf_javalite = True,
    omit_net_zlib = True,
)

load(
    "@rules_proto_grpc//:repositories.bzl",
    "rules_proto_grpc_repos",
    "rules_proto_grpc_toolchains",
)

rules_proto_grpc_toolchains()

rules_proto_grpc_repos()

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

# Install Emscripten via the emsdk.

load("//build_defs/emscripten:repo.bzl", "emsdk_repo")

emsdk_repo()

# Install the Kotlin-Native compiler

load("//build_defs/kotlin_native:repo.bzl", "kotlin_native_repo")

kotlin_native_repo()

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
    commit = "4f29ff058ebd7b49ece683f61c148e65b80806b3",
    remote = "https://github.com/cromwellian/rules_kotlin.git",
    shallow_since = "1578612474 -0800",
)

load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kotlin_repositories")

KOTLIN_VERSION = "1.3.60"

KOTLINC_RELEASE_SHA = "12f97cff23ff8116904cb97a7ef4e3af5c3b8e5df9d9e63baa251d9a73b42fbb"

KOTLINC_RELEASE = {
    "urls": [
        "https://github.com/JetBrains/kotlin/releases/download/v{v}/kotlin-compiler-{v}.zip".format(v = KOTLIN_VERSION),
    ],
    "sha256": KOTLINC_RELEASE_SHA,
}

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

# Java deps from Maven.

RULES_JVM_EXTERNAL_TAG = "2.10"

RULES_JVM_EXTERNAL_SHA = "1bbf2e48d07686707dd85357e9a94da775e1dbd7c464272b3664283c9c716d26"

http_archive(
    name = "rules_jvm_external",
    sha256 = RULES_JVM_EXTERNAL_SHA,
    strip_prefix = "rules_jvm_external-%s" % RULES_JVM_EXTERNAL_TAG,
    url = "https://github.com/bazelbuild/rules_jvm_external/archive/%s.zip" % RULES_JVM_EXTERNAL_TAG,
)

load("@rules_jvm_external//:defs.bzl", "maven_install")

ANDROIDX_LIFECYCLE_VERSION = "2.1.0"

ANDROIDX_TEST_VERSION = "1.2.0"

AUTO_VALUE_VERSION = "1.7"

AUTO_SERVICE_VERSION = "1.0-rc6"

KOTLINX_ATOMICFU_VERSION = "0.14.1"

KOTLINX_COROUTINES_VERSION = "1.3.3"

ROBOLECTRIC_VERSION = "4.1"

maven_install(
    artifacts = [
        "androidx.annotation:annotation:1.1.0",
        "androidx.lifecycle:lifecycle-common:" + ANDROIDX_LIFECYCLE_VERSION,
        "androidx.lifecycle:lifecycle-common-java8:" + ANDROIDX_LIFECYCLE_VERSION,
        "androidx.lifecycle:lifecycle-runtime:" + ANDROIDX_LIFECYCLE_VERSION,
        "androidx.webkit:webkit:1.1.0-rc01",
        "androidx.test:core:" + ANDROIDX_TEST_VERSION,
        "androidx.test.ext:junit:1.1.1",
        "androidx.test:monitor:" + ANDROIDX_TEST_VERSION,
        "androidx.test:runner:" + ANDROIDX_TEST_VERSION,
        "androidx.test:rules:" + ANDROIDX_TEST_VERSION,
        "com.google.flogger:flogger:0.4",
        "com.google.code.findbugs:jsr305:3.0.2",
        "com.google.flogger:flogger-system-backend:0.4",
        "com.google.dagger:dagger:2.23.1",
        "com.google.dagger:dagger-compiler:2.23.1",
        "com.google.auto.value:auto-value:" + AUTO_VALUE_VERSION,
        "com.google.auto.value:auto-value-annotations:" + AUTO_VALUE_VERSION,
        "com.google.auto.service:auto-service:" + AUTO_SERVICE_VERSION,
        "com.google.auto.service:auto-service-annotations:" + AUTO_SERVICE_VERSION,
        "com.google.truth:truth:1.0",
        "com.nhaarman.mockitokotlin2:mockito-kotlin:2.2.0",
        "javax.inject:javax.inject:1",
        "junit:junit:4.11",
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
    ],
    fetch_sources = True,
    repositories = [
        "https://jcenter.bintray.com/",
        "https://maven.google.com",
        "https://repo1.maven.org/maven2",
    ],
)

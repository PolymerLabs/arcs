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

RULES_KOTLIN_VERSION = "legacy-modded-1_0_0-01"

RULES_KOTLIN_SHA = "b7984b28e0a1e010e225a3ecdf0f49588b7b9365640af783bd01256585cbb3ae"

http_archive(
    name = "io_bazel_rules_kotlin",
    sha256 = RULES_KOTLIN_SHA,
    strip_prefix = "rules_kotlin-%s" % RULES_KOTLIN_VERSION,
    type = "zip",
    urls = ["https://github.com/cgruber/rules_kotlin/archive/%s.zip" % RULES_KOTLIN_VERSION],
)

load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kotlin_repositories")

KOTLIN_VERSION = "1.3.31"

KOTLINC_RELEASE_SHA = "107325d56315af4f59ff28db6837d03c2660088e3efeb7d4e41f3e01bb848d6a"

KOTLINC_RELEASE = {
    "urls": [
        "https://github.com/JetBrains/kotlin/releases/download/v{v}/kotlin-compiler-{v}.zip".format(v = KOTLIN_VERSION),
    ],
    "sha256": KOTLINC_RELEASE_SHA,
}

kotlin_repositories(compiler_release = KOTLINC_RELEASE)

register_toolchains("//third_party/java/arcs/build_defs/internal:kotlin_toolchain")

# Java deps from Maven.

RULES_JVM_EXTERNAL_TAG = "2.8"

RULES_JVM_EXTERNAL_SHA = "79c9850690d7614ecdb72d68394f994fef7534b292c4867ce5e7dec0aa7bdfad"

http_archive(
    name = "rules_jvm_external",
    sha256 = RULES_JVM_EXTERNAL_SHA,
    strip_prefix = "rules_jvm_external-%s" % RULES_JVM_EXTERNAL_TAG,
    url = "https://github.com/bazelbuild/rules_jvm_external/archive/%s.zip" % RULES_JVM_EXTERNAL_TAG,
)

load("@rules_jvm_external//:defs.bzl", "maven_install")

AUTO_VALUE_VERSION = "1.7"

KOTLINX_ATOMICFU_VERSION = "0.13.1"

KOTLINX_COROUTINES_VERSION = "1.3.2"

maven_install(
    artifacts = [
        "com.google.flogger:flogger:0.4",
        "com.google.flogger:flogger-system-backend:0.4",
        "com.google.dagger:dagger:2.23.1",
        "com.google.dagger:dagger-compiler:2.23.1",
        "com.google.auto.value:auto-value:" + AUTO_VALUE_VERSION,
        "com.google.auto.value:auto-value-annotations:" + AUTO_VALUE_VERSION,
        "com.google.truth:truth:1.0",
        "com.nhaarman.mockitokotlin2:mockito-kotlin:2.2.0",
        "javax.inject:javax.inject:1",
        "junit:junit:4.11",
        "org.jetbrains.kotlinx:kotlinx-coroutines-core:" + KOTLINX_COROUTINES_VERSION,
        "org.jetbrains.kotlinx:kotlinx-coroutines-core-js:" + KOTLINX_COROUTINES_VERSION,
        "org.jetbrains.kotlinx:kotlinx-coroutines-test:" + KOTLINX_COROUTINES_VERSION,
        "org.jetbrains.kotlinx:atomicfu:" + KOTLINX_ATOMICFU_VERSION,
        "org.jetbrains.kotlinx:atomicfu-js:" + KOTLINX_ATOMICFU_VERSION,
        "org.json:json:20141113",
        "org.mockito:mockito-core:2.23.0",
    ],
    repositories = [
        "https://jcenter.bintray.com/",
        "https://maven.google.com",
        "https://repo1.maven.org/maven2",
    ],
)

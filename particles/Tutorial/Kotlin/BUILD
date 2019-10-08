load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_binary", "kt_wasm_library")
load("//build_defs:build_defs.bzl", "arcs_kt_schema", "arcs_ts_test")

kt_wasm_binary(
    name = "hello_world",
    srcs = ["1_HelloWorld/HelloWorld.kt"],
    deps = ["//src/wasm/kotlin:arcs_wasm"],
)

kt_wasm_binary(
    name = "basic_template",
    srcs = ["2_BasicTemplates/BasicTemplate.kt"],
    deps = ["//src/wasm/kotlin:arcs_wasm"],
)

arcs_kt_schema(
    name = "store_schema",
    src = "3_JsonStore/JsonStore.arcs",
    out = "3_JsonStore/Entities.kt",
)

kt_wasm_binary(
    name = "json_store",
    srcs = [
        "3_JsonStore/JsonStore.kt",
        ":store_schema",
    ],
    deps = ["//src/wasm/kotlin:arcs_wasm"],
)

kt_wasm_binary(
    name = "parent_particle",
    srcs = ["4_RenderSlots/ParentParticle.kt"],
    deps = ["//src/wasm/kotlin:arcs_wasm"],
)

kt_wasm_binary(
    name = "child_particle",
    srcs = ["4_RenderSlots/ChildParticle.kt"],
    deps = ["//src/wasm/kotlin:arcs_wasm"],
)

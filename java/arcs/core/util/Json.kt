/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
@file:Suppress("UNCHECKED_CAST")

package arcs.core.util

import arcs.core.util.JsonValue.JsonArray
import arcs.core.util.JsonValue.JsonBoolean
import arcs.core.util.JsonValue.JsonNull
import arcs.core.util.JsonValue.JsonNumber
import arcs.core.util.JsonValue.JsonObject
import arcs.core.util.JsonValue.JsonString

/** Visitor interface for [JsonValue] hierarchy. */
interface JsonVisitor<R> {
    /** Primary entrypoint to visitor. */
    fun visit(value: JsonValue<*>) = when(value) {
        is JsonBoolean -> visit(value as JsonBoolean)
        is JsonString -> visit(value as JsonString)
        is JsonNumber -> visit(value as JsonNumber)
        is JsonArray -> visit(value as JsonArray)
        is JsonObject -> visit(value as JsonObject)
        is JsonNull -> visit(value as JsonNull)
        else -> throw IllegalArgumentException("Unknown JsonValue type $value")
    }

    /** Called when a [JsonBoolean] is encountered. */
    fun visit(value: JsonBoolean): R

    /** Called when a [JsonString] is encountered. */
    fun visit(value: JsonString): R

    /** Called when a [JsonNumber] is encountered. */
    fun visit(value: JsonNumber): R

    /** Called when a [JsonArray] is encountered. */
    fun visit(value: JsonArray): R

    /** Called when a [JsonNull] is encountered. */
    fun visit(value: JsonObject): R

    /** Called when a [JsonNull] is encountered. */
    fun visit(value: JsonNull): R
}

sealed class JsonValue<T>() {
    abstract val value: T
    /** Return this as a [JsonArray] or null if it isn't an array. */
    fun array() = this as? JsonArray

    /** Return this as a [JsonObject] or null if it isn't an object. */
    fun obj() = this as? JsonObject

    /** Return this as a [JsonNumber] or null if it isn't a number. */
    fun number() = (this as? JsonNumber)?.value

    /** Return this as a [JsonString] or null if it isn't a string. */
    fun string() = (this as? JsonString)?.value

    /** Return this as a [JsonBoolean] or null if it isn't a boolean. */
    fun bool() = (this as? JsonBoolean)?.value

    /** Used to represent the value of 'null' */
    object Null {
        override fun toString() = "null"
    }

    /** Used to represent a Json string */
    data class JsonString(override val value: String) : JsonValue<String>() {
        override fun toString() = "\"${value.replace("\"", "\\\"")}\""
    }

    /** Used to represent a Json number */
    data class JsonNumber(override val value: Double) : JsonValue<Double>() {
        override fun toString() = value.toString()
    }

    /** Used to represent a Json boolean */
    data class JsonBoolean(override val value: Boolean) : JsonValue<Boolean>() {
        override fun toString() = value.toString()
    }

    /** Used to represent custom (potentially non-standard) Json values. */
    open class JsonAny<T>(override val value: T) : JsonValue<T>()

    /** Used to to represent a Json array .*/
    data class JsonArray(
        override val value: List<JsonValue<*>> = mutableListOf()
    ) : JsonValue<List<JsonValue<*>>>() {
        override fun toString() = value.joinToString(prefix = "[", postfix = "]", separator = ",")

        /** Number of elements in the array. */
        val size = value.size

        /** If the array is empty. */
        fun isEmpty() = size == 0

        /** Lookup a value in an array by index. */
        operator fun <T : JsonValue<*>> get(index: Int) = value[index]

        /** Set a value in an array by index, if the index > array size, it is appended. */
        operator fun <T> set(index: Int, arg: JsonValue<T>): JsonValue<T> =
            (value as? MutableList<JsonValue<T>>)?.run {
                if (index < size) {
                    return value.set(index, arg)
                } else {
                    add(arg)
                    return arg
                }
            }?: throw IllegalArgumentException("JsonArray is immutable")
    }

    /** Used to represent a Json object. */
    data class JsonObject(
        override val value: Map<String, JsonValue<*>> = mutableMapOf()
    ) : JsonValue<Map<String, JsonValue<*>>>() {
        override fun toString() = value.map { (name, value) ->
            JsonString(name).toString() + ":${value.toString()}"
        }.joinToString(prefix = "{", postfix = "}", separator = ",")

        /** Lookup a object value by key. */
        operator fun get(key: String) = value[key] as JsonValue<*>

        /** Set an object value by key. */
        operator fun <T> set(key: String, value: T) =
            (value as? MutableMap<String, T>)?.put(key, value) ?:
            throw IllegalArgumentException("JsonObject is immutable")
    }

    /** Used to represent a Json null value. */
    object JsonNull : JsonAny<Null>(Null)
}

/**
 * Simple parser-combinator based multiple-platform JSON parser.
 * TODO: Limitations
 * 1) lax parsing (trailing commas allowed)
 * 2) float parsing non-exact
 * 3) whitespace not allowed
 * 4) unicode escaping not handled
 */
object Json {
    /** Parses a string in JSON format and returns a [JsonValue] */
    fun parse(jsonString: String) = (jsonValue(jsonString) as? ParseResult.Success<JsonValue<*>>)?.
        value ?: throw IllegalArgumentException("Parse failed")

    private val jsonNumber: Parser<JsonValue<*>> = regex("(-?[0-9]+\\.?[0-9]*(?:e-?[0-9]+)?)")
        .map { JsonNumber(it.toDouble()) }

    private val jsonString: Parser<JsonValue<*>> = regex("\"((?:[^\"\\\\]|\\\\.)*)\"").map {
        JsonString(it.replace("\\\"", "\"").replace("\\\n","\n"))
    }

    private val jsonBoolean: Parser<JsonValue<*>> = (token("true") / token("false")).map {
        JsonBoolean(
            it.toBoolean()
        )
    }
    private val jsonNull: Parser<JsonValue<*>> = token("null").map { JsonNull }
    private val jsonArray: Parser<JsonValue<*>> = (
        -token("[") + many(parser(::jsonValue) + -optional(token(","))) + -token("]")
        ).map { JsonArray(it) }


    private val fieldName: Parser<String> = (jsonString + -token(":")).map { it.string()!! }

    private val jsonObjectField: Parser<Pair<String, JsonValue<*>>> =
        fieldName + ((parser(::jsonValue) + -optional(token(","))).map { it })

    private val jsonObject: Parser<JsonValue<*>> =
        (-token("{") + many(jsonObjectField) + -token("}")).map { result ->
            JsonObject(result.associateBy({ it.first }, { it.second }))
        }

    private val jsonValue: Parser<JsonValue<*>> = jsonObject / jsonArray /
        jsonNumber / jsonString / jsonBoolean / jsonNull
}

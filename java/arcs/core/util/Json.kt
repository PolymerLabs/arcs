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
    @Suppress("USELESS_CAST")
    fun visit(value: JsonValue<*>) = when (value) {
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

    /** Called when a [JsonObject] is encountered. */
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
        private val escapes = mapOf(
            "\\" to "\\\\",
            "\"" to "\\\"",
            "\b" to "\\b",
            12.toChar().toString() to "\\f",
            "\n" to "\\n",
            "\r" to "\\r",
            "\t" to "\\t"
        )

        private fun escape(string: String) = escapes.entries.fold(string) { str, (old, new) ->
            str.replace(old, new)
        }.replace(Regex("[^\u0000-\u007F]")) { match ->
            match.value.toCharArray().fold("") { unicode, char ->
                unicode + "\\u${char.toInt().toString(16)}"
            }
        }

        override fun toString() = "\"${escape(value)}\""
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
    open class JsonAny<T>(override val value: T) : JsonValue<T>() {
        override fun toString() = value.toString()
    }

    /** Used to to represent a Json array .*/
    data class JsonArray(
        override val value: List<JsonValue<*>> = mutableListOf()
    ) : JsonValue<List<JsonValue<*>>>() {
        override fun toString() = value.joinToString(prefix = "[", postfix = "]", separator = ",")

        /** Number of elements in the array. */
        val size get() = value.size

        /** If the array is empty. */
        fun isEmpty() = size == 0

        /** Lookup a value in an array by index. */
        operator fun get(index: Int) = value[index]

        /** Append a value to the end of an array. */
        fun <T> add(arg: JsonValue<T>) = (value as? MutableList<JsonValue<T>>)?.run {
            add(arg)
        }

        /** Set a value in an array by index, if the index > array size, it is appended. */
        operator fun <T> set(index: Int, arg: JsonValue<T>): JsonValue<T> =
            (value as? MutableList<JsonValue<T>>)?.run {
                if (index < size) {
                    return value.set(index, arg)
                } else if (index == size) {
                    this@JsonArray.add(arg)
                    return arg
                } else throw IllegalArgumentException("JsonArray.set $index > $size")
            } ?: throw IllegalArgumentException("JsonArray is immutable")
    }

    /** Used to represent a Json object. */
    data class JsonObject(
        override val value: Map<String, JsonValue<*>> = mutableMapOf()
    ) : JsonValue<Map<String, JsonValue<*>>>() {
        override fun toString() = value.map { (name, value) ->
            JsonString(name).toString() + ":$value"
        }.joinToString(prefix = "{", postfix = "}", separator = ",")

        /** Lookup a object value by key. */
        operator fun get(key: String) = value[key] as JsonValue<*>

        /** Set an object value by key. */
        operator fun <T> set(key: String, value: T) =
            (value as? MutableMap<String, T>)?.put(key, value)
            ?: throw IllegalArgumentException("JsonObject is immutable")
    }

    /** Used to represent a Json null value. */
    object JsonNull : JsonAny<Null>(Null)
}

/**
 * Simple parser-combinator based multiple-platform JSON parser.
 * TODO: Limitations
 * lax parsing (trailing commas allowed), allows control characters, etc.
 */
object Json {
    /** Parses a string in JSON format and returns a [JsonValue] */
    fun parse(jsonString: String) =
        when (val result = jsonValue(jsonString)) {
            is ParseResult.Success<JsonValue<*>> -> result.value
            is ParseResult.Failure -> throw IllegalArgumentException(
                "Parse Failed reading ${jsonString.substring(result.start.offset)}: ${result.error}"
            )
        }

    private val jsonNumber = regex("([+-]?[0-9]+\\.?[0-9]*(?:[eE][+-]?[0-9]+)?)")
        .map { JsonNumber(it.toDouble()) }

    private val escapes = mapOf(
        "\\\\" to "\\",
        "\\\"" to "\"",
        "\\b" to "\b",
        "\\f" to 12.toChar().toString(),
        "\\n" to "\n",
        "\\r" to "\r",
        "\\t" to "\t"
    )

    private fun unescape(string: String) = string.replace(
        Regex("\\\\[\"/bfnrt]|\\\\u[0-9a-f]{4}")
    ) { match: MatchResult ->
        when {
            escapes.contains(match.value) -> escapes[match.value]!!
            match.value.startsWith("\\u") -> {
                match.value.substring(3).toInt(16).toChar().toString()
            }
            else -> throw IllegalArgumentException("${match.value} shouldn't match")
        }
    }

    private val jsonString = regex("\"((?:[^\"\\\\]|\\\\[\"\\\\/bfnrt]|\\\\u[0-9a-f]{4})*)\"").map {
        JsonString(unescape(it))
    }

    private val jsonBoolean = (token("true") / token("false")).map {
        JsonBoolean(
            it.toBoolean()
        )
    }

    private val jsonNull = token("null").map { JsonNull }

    private val jsonOpenBracket = -regex("\\s*(\\[)\\s*")
    private val jsonCloseBracket = -regex("\\s*(\\])\\s*")
    private val jsonOpenBrace = -regex("\\s*(\\{)\\s*")
    private val jsonCloseBrace = -regex("\\s*(\\})\\s*")
    private val jsonComma = -optional(regex("\\s*(,)\\s*"))

    private val jsonArray = (
        jsonOpenBracket + many(parser(::jsonValue) + jsonComma) + jsonCloseBracket
        ).map { JsonArray(it) }

    private val fieldName = (jsonString + -regex("\\s*(:)\\s*")).map { it.value }

    private val jsonObjectField = (fieldName + parser(::jsonValue) + jsonComma).map { it }

    private val jsonObject =
        (jsonOpenBrace + many(jsonObjectField) + jsonCloseBrace).map { result ->
            JsonObject(result.associateBy({ it.first }, { it.second }))
        }

    private val jsonValue: Parser<JsonValue<*>> =
        jsonNumber / jsonString / jsonBoolean / jsonNull / jsonObject / jsonArray
}

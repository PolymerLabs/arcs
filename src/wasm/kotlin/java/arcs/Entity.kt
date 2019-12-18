/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs

import kotlin.properties.ReadWriteProperty
import kotlin.reflect.KProperty

typealias URL = String

abstract class Entity<T> : BaseEntity() {
    var internalId = ""
    abstract fun decodeEntity(encoded: String): T?
    abstract fun encodeEntity(): String
}

class StringDecoder(private var str: String) {

    companion object {

        fun decodeDictionary(str: String): Map<String, String> {
            val decoder = StringDecoder(str)
            val dict = mutableMapOf<String, String>()

            var num = decoder.getInt(":")
            while (num-- > 0) {
                val klen = decoder.getInt(":")
                val key = decoder.chomp(klen)

                val vlen = decoder.getInt(":")
                val value = decoder.chomp(vlen)

                dict[key] = value
            }

            return dict
        }
    }

    fun done(): Boolean {
        return str.isEmpty()
    }

    fun upTo(sep: String): String {
        val ind = str.indexOf(sep)
        if (ind == -1) {
            error("Packaged entity decoding failed in upTo()\n")
        }
        val token = str.substring(0, ind)
        str = str.substring(ind + 1)
        return token
    }

    fun getInt(sep: String): Int {
        val token = upTo(sep)
        return token.toInt()
    }

    fun chomp(len: Int): String {
        // TODO: detect overrun
        val token = str.substring(0, len)
        str = str.substring(len)
        return token
    }

    fun validate(token: String) {
        if (chomp(token.length) != token) {
            throw Exception("Packaged entity decoding failed in validate()\n")
        }
    }

    fun decodeText(): String {
        val len = getInt(":")
        return chomp(len)
    }

    fun decodeNum(): Double {
        val token = upTo(":")
        return token.toDouble()
    }

    fun decodeBool(): Boolean {
        return (chomp(1)[0] == '1')
    }
}

class StringEncoder(private val sb: StringBuilder = StringBuilder()) {

    companion object {
        fun encodeDictionary(dict: Map<String, Any?>): String {
            val sb = StringBuilder()
            sb.append(dict.size).append(":")

            for ((key, value) in dict) {
                sb.append(key.length).append(":").append(key)
                sb.append(encodeValue(value))
            }
            return sb.toString()
        }

        fun encodeList(list: List<Any>): String {
            return list.joinToString(separator = "", prefix = "${list.size}:") { encodeValue(it) }
        }

        fun encodeValue(value: Any?): String {
            return when (value) {
                is String -> "T${value.length}:$value"
                is Boolean -> "B${if (value) 1 else 0}"
                is Double -> "N$value:"
                is Map<*, *> -> {
                    @Suppress("UNCHECKED_CAST")
                    val dictString = encodeDictionary(value as Map<String, Any?>)
                    "D${dictString.length}:$dictString"
                }
                is List<*> -> {
                    @Suppress("UNCHECKED_CAST")
                    val listString = encodeList(value as List<Any>)
                    "A${listString.length}:$listString"
                }
                else -> throw IllegalArgumentException("Unknown expression.")
            }
        }
    }

    fun result(): String = sb.toString()

    fun encode(prefix: String, str: String) {
        sb.append("$prefix${str.length}:$str|")
    }

    fun encode(prefix: String, num: Double) {
        sb.append("$prefix$num:|")
    }

    fun encode(prefix: String, flag: Boolean) {
        sb.append("$prefix${if (flag) "1" else "0"}|")
    }
}

abstract class BaseEntity {
    private var nextFieldId = 0
    private val fieldSets = mutableSetOf<Int>()

    internal fun registerField(delegate: EntityFieldDelegate<*>) {
        val fieldId = nextFieldId++
        delegate.onSet = {
            fieldSets.add(fieldId)

            if (fieldSets.size == nextFieldId) {
                isSet()
            }
        }
    }

    open fun isSet() = Unit
}

abstract class EntityField<T> {
    operator fun provideDelegate(
        thisRef: BaseEntity,
        prop: KProperty<*>
    ): ReadWriteProperty<BaseEntity, T> {
        val delegate = getDelegate()
        thisRef.registerField(delegate)
        return delegate
    }

    abstract fun getDelegate(): EntityFieldDelegate<T>
}

abstract class EntityFieldDelegate<T> : ReadWriteProperty<BaseEntity, T> {
    lateinit var onSet: () -> Unit
    abstract override fun getValue(thisRef: BaseEntity, property: KProperty<*>): T
    abstract override fun setValue(thisRef: BaseEntity, property: KProperty<*>, value: T)
}

class EntityDoubleField : EntityField<Double>() {
    override fun getDelegate(): EntityFieldDelegate<Double> = EntityDoubleFieldDelegate()
}

class EntityStringField : EntityField<String>() {
    override fun getDelegate(): EntityFieldDelegate<String> = EntityStringFieldDelegate()
}

class EntityBooleanField : EntityField<Boolean>() {
    override fun getDelegate(): EntityFieldDelegate<Boolean> = EntityBooleanFieldDelegate()
}

class EntityDoubleFieldDelegate : EntityFieldDelegate<Double>() {
    private var value: Double = 0.0
    override fun getValue(thisRef: BaseEntity, property: KProperty<*>): Double = value

    override fun setValue(thisRef: BaseEntity, property: KProperty<*>, value: Double) {
        this.value = value
        onSet()
    }
}

class EntityStringFieldDelegate : EntityFieldDelegate<String>() {
    private var value: String = ""
    override fun getValue(thisRef: BaseEntity, property: KProperty<*>): String = value

    override fun setValue(thisRef: BaseEntity, property: KProperty<*>, value: String) {
        this.value = value
        onSet()
    }
}

class EntityBooleanFieldDelegate : EntityFieldDelegate<Boolean>() {
    private var value: Boolean = false
    override fun getValue(thisRef: BaseEntity, property: KProperty<*>): Boolean = value

    override fun setValue(thisRef: BaseEntity, property: KProperty<*>, value: Boolean) {
        this.value = value
        onSet()
    }
}

@Suppress("UNCHECKED_CAST")
inline fun <reified T : Any> BaseEntity.entityField(): EntityField<T> = when (T::class) {
    Double::class -> EntityDoubleField() as EntityField<T>
    String::class -> EntityStringField() as EntityField<T>
    Boolean::class -> EntityBooleanField() as EntityField<T>
    else -> throw IllegalArgumentException("Unsupported entity field type: ${T::class}")
}

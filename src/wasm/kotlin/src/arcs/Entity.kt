package arcs

typealias URL = String

abstract class Entity<T> {
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
            while(num-- > 0){
                val klen = decoder.getInt(":")
                val key = decoder.chomp(klen)

                val vlen = decoder.getInt(":")
                val value = decoder.chomp(vlen)

                dict[key] = value
            }

            return dict
        }
    }

    fun done():Boolean {
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

            for((key, value) in dict) {
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

    fun result():String = sb.toString()

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

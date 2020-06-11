package arcs.core.entity

import arcs.core.data.RawEntity

interface Dummy <T : EntityBase> : Entity {
    var bool: Boolean?
    var num: Double?
    var text: String?
    var ref: Reference<T>?
    var bools: Set<Boolean>
    var nums: Set<Double>
    var texts: Set<String>
    var refs: Set<Reference<T>>

    fun getSingletonValueForTest(field: String): Any?

    fun getCollectionValueForTest(field: String): Set<Any>

    fun setSingletonValueForTest(field: String, value: Any?)

    fun setCollectionValueForTest(field: String, values: Set<Any>)

    fun deserializeForTest(rawEntity: RawEntity)
}

package arcs

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support optional field detection

data class PersonDetails(
  var name: String = "", var age: Double = 0.0
) : Entity<PersonDetails>() {
  override fun decodeEntity(encoded: String): PersonDetails? {
    if (encoded.isEmpty()) {
      return null
    }
    val decoder = StringDecoder(encoded)
    this.internalId = decoder.decodeText()
    decoder.validate("|")
    var i = 0
    while (!decoder.done() && i < 2) {
      val name = decoder.upTo(":")
      when (name) {
        "name" -> {
          decoder.validate("T")
          this.name = decoder.decodeText()
        }
        "age" -> {
          decoder.validate("N")
          this.age = decoder.decodeNum()
        }
      }
      decoder.validate("|")
      i++
    }
    return this
  }

  override fun encodeEntity(): String {
    val encoder = StringEncoder()
    encoder.encode("", internalId)
    encoder.encode("name:T", name)
    encoder.encode("age:N", age)
    return encoder.result()
  }
}

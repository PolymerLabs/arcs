package arcs

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support optional field detection

data class Data(
  var num: Double = 0.0, var txt: String = "", var lnk: String = "", var flg: Boolean = false
) : Entity<Data>() {
  override fun decodeEntity(encoded: String): Data? {
    if (encoded.isEmpty()) {
      return null
    }
    val decoder = StringDecoder(encoded)
    this.internalId = decoder.decodeText()
    decoder.validate("|")
    var i = 0
    while (!decoder.done() && i < 4) {
      val name = decoder.upTo(":")
      when (name) {
        "num" -> {
          decoder.validate("N")
          this.num = decoder.decodeNum()
        }
        "txt" -> {
          decoder.validate("T")
          this.txt = decoder.decodeText()
        }
        "lnk" -> {
          decoder.validate("U")
          this.lnk = decoder.decodeText()
        }
        "flg" -> {
          decoder.validate("B")
          this.flg = decoder.decodeBool()
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
    encoder.encode("num:N", num)
    encoder.encode("txt:T", txt)
    encoder.encode("lnk:U", lnk)
    encoder.encode("flg:B", flg)
    return encoder.result()
  }
}

data class Info(
  var for_: String = "", var val_: Double = 0.0
) : Entity<Info>() {
  override fun decodeEntity(encoded: String): Info? {
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
        "for" -> {
          decoder.validate("T")
          this.for_ = decoder.decodeText()
        }
        "val" -> {
          decoder.validate("N")
          this.val_ = decoder.decodeNum()
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
    encoder.encode("for:T", for_)
    encoder.encode("val:N", val_)
    return encoder.result()
  }
}

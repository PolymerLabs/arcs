#ifndef _ARCS_ENTITY_DATA_H
#define _ARCS_ENTITY_DATA_H
// GENERATED CODE

namespace arcs {

class Data {
public:
  double num;
  std::string txt;
  URL lnk;
  bool flg;
  std::unordered_set<double> c_num;
  std::unordered_set<std::string> c_txt;
  std::unordered_set<URL, HashURL, EqualURL> c_lnk;
  std::unordered_set<bool> c_flg;

  static const int FIELD_COUNT = 8;

  std::string encode() {
    internal::StringEncoder encoder;
    if (this->num != 0)
      encoder.encodeValue("num:N", this->num, "|");
    if (!this->txt.empty())
      encoder.encodeValue("txt:T", this->txt, "|");
    if (!this->lnk.href.empty())
      encoder.encodeValue("lnk:U", this->lnk, "|");
    if (this->flg)
      encoder.encodeValue("flg:B", this->flg, "|");
    if (!this->c_num.empty())
      encoder.encodeCollection("c_num:CN", this->c_num);
    if (!this->c_txt.empty())
      encoder.encodeCollection("c_txt:CT", this->c_txt);
    if (!this->c_lnk.empty())
      encoder.encodeCollection("c_lnk:CU", this->c_lnk);
    if (!this->c_flg.empty())
      encoder.encodeCollection("c_flg:CB", this->c_flg);
    return encoder.result();
  }

  static Data decode(std::string str) {
    Data obj;
    internal::StringDecoder decoder(str.c_str());
    for (int i = 0; !decoder.done() && i < Data::FIELD_COUNT; i++) {
      std::string name = decoder.upTo(':');
      if (0) {
      } else if (name == "num") {
        decoder.validate("N");
        decoder.decodeValue(obj.num);
      } else if (name == "txt") {
        decoder.validate("T");
        decoder.decodeValue(obj.txt);
      } else if (name == "lnk") {
        decoder.validate("U");
        decoder.decodeValue(obj.lnk);
      } else if (name == "flg") {
        decoder.validate("B");
        decoder.decodeValue(obj.flg);
      } else if (name == "c_num") {
        decoder.validate("CN");
        decoder.decodeCollection(obj.c_num);
      } else if (name == "c_txt") {
        decoder.validate("CT");
        decoder.decodeCollection(obj.c_txt);
      } else if (name == "c_lnk") {
        decoder.validate("CU");
        decoder.decodeCollection(obj.c_lnk);
      } else if (name == "c_flg") {
        decoder.validate("CB");
        decoder.decodeCollection(obj.c_flg);
      }
      decoder.validate("|");
    }
    return obj;
  }
};

}

#endif

#ifndef _ARCS_ENTITY_DATA_H
#define _ARCS_ENTITY_DATA_H

// GENERATED CODE - DO NOT EDIT

namespace arcs {

class Data {
public:
  double num() const { return num_; }
  void set_num(double value) { num_ = value; num_valid_ = true; }
  void clear_num() { num_ = double(); num_valid_ = false; }
  bool has_num() const { return num_valid_; }

  const std::string& txt() const { return txt_; }
  void set_txt(const std::string& value) { txt_ = value; txt_valid_ = true; }
  void clear_txt() { txt_ = std::string(); txt_valid_ = false; }
  bool has_txt() const { return txt_valid_; }

  const URL& lnk() const { return lnk_; }
  void set_lnk(const URL& value) { lnk_ = value; lnk_valid_ = true; }
  void clear_lnk() { lnk_ = URL(); lnk_valid_ = false; }
  bool has_lnk() const { return lnk_valid_; }

  bool flg() const { return flg_; }
  void set_flg(bool value) { flg_ = value; flg_valid_ = true; }
  void clear_flg() { flg_ = bool(); flg_valid_ = false; }
  bool has_flg() const { return flg_valid_; }

  std::string _internal_id;  // TODO

private:
  double num_ = double();
  bool num_valid_ = false;

  std::string txt_ = std::string();
  bool txt_valid_ = false;

  URL lnk_ = URL();
  bool lnk_valid_ = false;

  bool flg_ = bool();
  bool flg_valid_ = false;

  static const int FIELD_COUNT = 4;
  friend void decode_entity<Data>(Data* entity, const char* str);
};

template<>
void decode_entity(Data* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < Data::FIELD_COUNT; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "num") {
      decoder.validate("N");
      decoder.decode(entity->num_);
      entity->num_valid_ = true;
    } else if (name == "txt") {
      decoder.validate("T");
      decoder.decode(entity->txt_);
      entity->txt_valid_ = true;
    } else if (name == "lnk") {
      decoder.validate("U");
      decoder.decode(entity->lnk_);
      entity->lnk_valid_ = true;
    } else if (name == "flg") {
      decoder.validate("B");
      decoder.decode(entity->flg_);
      entity->flg_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
std::string encode_entity(const Data& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id);
  if (entity.has_num())
    encoder.encode("num:N", entity.num());
  if (entity.has_txt())
    encoder.encode("txt:T", entity.txt());
  if (entity.has_lnk())
    encoder.encode("lnk:U", entity.lnk());
  if (entity.has_flg())
    encoder.encode("flg:B", entity.flg());
  return std::move(encoder.result());
}

template<>
std::string entity_to_str(const Data& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id);
  if (entity.has_num())
    printer.add("num: ", entity.num());
  if (entity.has_txt())
    printer.add("txt: ", entity.txt());
  if (entity.has_lnk())
    printer.add("lnk: ", entity.lnk());
  if (entity.has_flg())
    printer.add("flg: ", entity.flg());
  return std::move(printer.result(join));
}

}  // namespace arcs

#endif

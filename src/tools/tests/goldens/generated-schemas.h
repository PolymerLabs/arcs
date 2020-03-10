#ifndef _ARCS_GOLDEN_H
#define _ARCS_GOLDEN_H

// GENERATED CODE - DO NOT EDIT
#ifndef _ARCS_H
#error arcs.h must be included before entity class headers
#endif

namespace arcs {

// Aliased as Gold_Data_Ref, Gold_Alias
class GoldInternal1 {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  GoldInternal1() = default;
  GoldInternal1(GoldInternal1&&) = default;
  GoldInternal1& operator=(GoldInternal1&&) = default;

  template<typename T>
  GoldInternal1(const T& other) :
    val_(other.val()), val_valid_(other.has_val())
  {}

  const std::string& val() const { return val_; }
  void set_val(const std::string& value) { val_ = value; val_valid_ = true; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const GoldInternal1& other) const;
  bool operator!=(const GoldInternal1& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const GoldInternal1& a, const GoldInternal1& b) {
    if (int cmp = a._internal_id_.compare(b._internal_id_)) {
      return cmp < 0;
    }
    if (0) {
    } else if (int cmp = a.val_.compare(b.val_)) {
      return cmp < 0;
    }
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  GoldInternal1(const GoldInternal1&) = default;
  GoldInternal1& operator=(const GoldInternal1&) = default;

  static const char* _schema_hash() { return "485712110d89359a3e539dac987329cd2649d889"; }
  static const int _field_count = 1;

  std::string val_ = "";
  bool val_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<GoldInternal1>;
  friend class Collection<GoldInternal1>;
  friend class Ref<GoldInternal1>;
  friend class internal::Accessor;
};

using Gold_Data_Ref = GoldInternal1;
using Gold_Alias = GoldInternal1;

template<>
inline GoldInternal1 internal::Accessor::clone_entity(const GoldInternal1& entity) {
  GoldInternal1 clone;
  clone.val_ = entity.val_;
  clone.val_valid_ = entity.val_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const GoldInternal1& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  internal::hash_combine(h, entity.val_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const GoldInternal1& a, const GoldInternal1& b) {
  return (a.val_ == b.val_);
}

inline bool GoldInternal1::operator==(const GoldInternal1& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const GoldInternal1& entity, const char* join, bool with_id) {
  internal::StringPrinter printer;
  if (with_id) {
    printer.addId(entity._internal_id_);
  }
  if (entity.val_valid_) printer.add("val: ", entity.val_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(GoldInternal1* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < GoldInternal1::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "val") {
      decoder.validate("T");
      decoder.decode(entity->val_);
      entity->val_valid_ = true;
    } else {
      // Ignore unknown fields until type slicing is fully implemented.
      std::string typeChar = decoder.chomp(1);
      if (typeChar == "T" || typeChar == "U") {
        std::string s;
        decoder.decode(s);
      } else if (typeChar == "N") {
        double d;
        decoder.decode(d);
      } else if (typeChar == "B") {
        bool b;
        decoder.decode(b);
      }
      i--;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const GoldInternal1& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  encoder.encode("val:T", entity.val_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::GoldInternal1> {
  size_t operator()(const arcs::GoldInternal1& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class Gold_QCollection {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  Gold_QCollection() = default;
  Gold_QCollection(Gold_QCollection&&) = default;
  Gold_QCollection& operator=(Gold_QCollection&&) = default;

  template<typename T>
  Gold_QCollection(const T& other) :
    name_(other.name()), name_valid_(other.has_name()),
    age_(other.age()), age_valid_(other.has_age()),
    lastCall_(other.lastCall()), lastCall_valid_(other.has_lastCall()),
    address_(other.address()), address_valid_(other.has_address()),
    favoriteColor_(other.favoriteColor()), favoriteColor_valid_(other.has_favoriteColor()),
    birthDayMonth_(other.birthDayMonth()), birthDayMonth_valid_(other.has_birthDayMonth()),
    birthDayDOM_(other.birthDayDOM()), birthDayDOM_valid_(other.has_birthDayDOM())
  {}

  const std::string& name() const { return name_; }
  void set_name(const std::string& value) { name_ = value; name_valid_ = true; }

  double age() const { return age_; }
  void set_age(double value) { age_ = value; age_valid_ = true; }

  double lastCall() const { return lastCall_; }
  void set_lastCall(double value) { lastCall_ = value; lastCall_valid_ = true; }

  const std::string& address() const { return address_; }
  void set_address(const std::string& value) { address_ = value; address_valid_ = true; }

  const std::string& favoriteColor() const { return favoriteColor_; }
  void set_favoriteColor(const std::string& value) { favoriteColor_ = value; favoriteColor_valid_ = true; }

  double birthDayMonth() const { return birthDayMonth_; }
  void set_birthDayMonth(double value) { birthDayMonth_ = value; birthDayMonth_valid_ = true; }

  double birthDayDOM() const { return birthDayDOM_; }
  void set_birthDayDOM(double value) { birthDayDOM_ = value; birthDayDOM_valid_ = true; }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const Gold_QCollection& other) const;
  bool operator!=(const Gold_QCollection& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const Gold_QCollection& a, const Gold_QCollection& b) {
    if (int cmp = a._internal_id_.compare(b._internal_id_)) {
      return cmp < 0;
    }
    if (0) {
    } else if (int cmp = a.name_.compare(b.name_)) {
      return cmp < 0;
    }
    if (0) {
    } else if (a.age_ != b.age_) {
      return a.age_ < b.age_;
    }
    if (0) {
    } else if (a.lastCall_ != b.lastCall_) {
      return a.lastCall_ < b.lastCall_;
    }
    if (0) {
    } else if (int cmp = a.address_.compare(b.address_)) {
      return cmp < 0;
    }
    if (0) {
    } else if (int cmp = a.favoriteColor_.compare(b.favoriteColor_)) {
      return cmp < 0;
    }
    if (0) {
    } else if (a.birthDayMonth_ != b.birthDayMonth_) {
      return a.birthDayMonth_ < b.birthDayMonth_;
    }
    if (0) {
    } else if (a.birthDayDOM_ != b.birthDayDOM_) {
      return a.birthDayDOM_ < b.birthDayDOM_;
    }
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  Gold_QCollection(const Gold_QCollection&) = default;
  Gold_QCollection& operator=(const Gold_QCollection&) = default;

  static const char* _schema_hash() { return "ccd14452cc01e1b00b94cdb25bfe34a5a632daaa"; }
  static const int _field_count = 7;

  std::string name_ = "";
  bool name_valid_ = false;

  double age_ = 0;
  bool age_valid_ = false;

  double lastCall_ = 0;
  bool lastCall_valid_ = false;

  std::string address_ = "";
  bool address_valid_ = false;

  std::string favoriteColor_ = "";
  bool favoriteColor_valid_ = false;

  double birthDayMonth_ = 0;
  bool birthDayMonth_valid_ = false;

  double birthDayDOM_ = 0;
  bool birthDayDOM_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<Gold_QCollection>;
  friend class Collection<Gold_QCollection>;
  friend class Ref<Gold_QCollection>;
  friend class internal::Accessor;
};

template<>
inline Gold_QCollection internal::Accessor::clone_entity(const Gold_QCollection& entity) {
  Gold_QCollection clone;
  clone.name_ = entity.name_;
  clone.name_valid_ = entity.name_valid_;
  clone.age_ = entity.age_;
  clone.age_valid_ = entity.age_valid_;
  clone.lastCall_ = entity.lastCall_;
  clone.lastCall_valid_ = entity.lastCall_valid_;
  clone.address_ = entity.address_;
  clone.address_valid_ = entity.address_valid_;
  clone.favoriteColor_ = entity.favoriteColor_;
  clone.favoriteColor_valid_ = entity.favoriteColor_valid_;
  clone.birthDayMonth_ = entity.birthDayMonth_;
  clone.birthDayMonth_valid_ = entity.birthDayMonth_valid_;
  clone.birthDayDOM_ = entity.birthDayDOM_;
  clone.birthDayDOM_valid_ = entity.birthDayDOM_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const Gold_QCollection& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  internal::hash_combine(h, entity.name_);
  internal::hash_combine(h, entity.age_);
  internal::hash_combine(h, entity.lastCall_);
  internal::hash_combine(h, entity.address_);
  internal::hash_combine(h, entity.favoriteColor_);
  internal::hash_combine(h, entity.birthDayMonth_);
  internal::hash_combine(h, entity.birthDayDOM_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const Gold_QCollection& a, const Gold_QCollection& b) {
  return (a.name_ == b.name_) &&
         (a.age_ == b.age_) &&
         (a.lastCall_ == b.lastCall_) &&
         (a.address_ == b.address_) &&
         (a.favoriteColor_ == b.favoriteColor_) &&
         (a.birthDayMonth_ == b.birthDayMonth_) &&
         (a.birthDayDOM_ == b.birthDayDOM_);
}

inline bool Gold_QCollection::operator==(const Gold_QCollection& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const Gold_QCollection& entity, const char* join, bool with_id) {
  internal::StringPrinter printer;
  if (with_id) {
    printer.addId(entity._internal_id_);
  }
  if (entity.name_valid_) printer.add("name: ", entity.name_);
  if (entity.age_valid_) printer.add("age: ", entity.age_);
  if (entity.lastCall_valid_) printer.add("lastCall: ", entity.lastCall_);
  if (entity.address_valid_) printer.add("address: ", entity.address_);
  if (entity.favoriteColor_valid_) printer.add("favoriteColor: ", entity.favoriteColor_);
  if (entity.birthDayMonth_valid_) printer.add("birthDayMonth: ", entity.birthDayMonth_);
  if (entity.birthDayDOM_valid_) printer.add("birthDayDOM: ", entity.birthDayDOM_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(Gold_QCollection* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < Gold_QCollection::_field_count; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "name") {
      decoder.validate("T");
      decoder.decode(entity->name_);
      entity->name_valid_ = true;
    } else if (name == "age") {
      decoder.validate("N");
      decoder.decode(entity->age_);
      entity->age_valid_ = true;
    } else if (name == "lastCall") {
      decoder.validate("N");
      decoder.decode(entity->lastCall_);
      entity->lastCall_valid_ = true;
    } else if (name == "address") {
      decoder.validate("T");
      decoder.decode(entity->address_);
      entity->address_valid_ = true;
    } else if (name == "favoriteColor") {
      decoder.validate("T");
      decoder.decode(entity->favoriteColor_);
      entity->favoriteColor_valid_ = true;
    } else if (name == "birthDayMonth") {
      decoder.validate("N");
      decoder.decode(entity->birthDayMonth_);
      entity->birthDayMonth_valid_ = true;
    } else if (name == "birthDayDOM") {
      decoder.validate("N");
      decoder.decode(entity->birthDayDOM_);
      entity->birthDayDOM_valid_ = true;
    } else {
      // Ignore unknown fields until type slicing is fully implemented.
      std::string typeChar = decoder.chomp(1);
      if (typeChar == "T" || typeChar == "U") {
        std::string s;
        decoder.decode(s);
      } else if (typeChar == "N") {
        double d;
        decoder.decode(d);
      } else if (typeChar == "B") {
        bool b;
        decoder.decode(b);
      }
      i--;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const Gold_QCollection& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  encoder.encode("name:T", entity.name_);
  encoder.encode("age:N", entity.age_);
  encoder.encode("lastCall:N", entity.lastCall_);
  encoder.encode("address:T", entity.address_);
  encoder.encode("favoriteColor:T", entity.favoriteColor_);
  encoder.encode("birthDayMonth:N", entity.birthDayMonth_);
  encoder.encode("birthDayDOM:N", entity.birthDayDOM_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::Gold_QCollection> {
  size_t operator()(const arcs::Gold_QCollection& entity) const {
    return arcs::hash_entity(entity);
  }
};

namespace arcs {

class Gold_Data {
public:
  // Entities must be copied with arcs::clone_entity(), which will exclude the internal id.
  // Move operations are ok (and will include the internal id).
  Gold_Data() = default;
  Gold_Data(Gold_Data&&) = default;
  Gold_Data& operator=(Gold_Data&&) = default;

  template<typename T>
  Gold_Data(const T& other) :
    num_(other.num()), num_valid_(other.has_num()),
    txt_(other.txt()), txt_valid_(other.has_txt()),
    lnk_(other.lnk()), lnk_valid_(other.has_lnk()),
    flg_(other.flg()), flg_valid_(other.has_flg()),
    ref_(other.ref()), ref_valid_(other.has_ref())
  {}

  double num() const { return num_; }
  void set_num(double value) { num_ = value; num_valid_ = true; }

  const std::string& txt() const { return txt_; }
  void set_txt(const std::string& value) { txt_ = value; txt_valid_ = true; }

  const URL& lnk() const { return lnk_; }
  void set_lnk(const URL& value) { lnk_ = value; lnk_valid_ = true; }

  bool flg() const { return flg_; }
  void set_flg(bool value) { flg_ = value; flg_valid_ = true; }

  const Ref<GoldInternal1>& ref() const { return ref_; }
  void set_ref(const GoldInternal1& value) { internal::Accessor::bind(&ref_, value); }

  // Equality ops compare internal ids and all data fields.
  // Use arcs::fields_equal() to compare only the data fields.
  bool operator==(const Gold_Data& other) const;
  bool operator!=(const Gold_Data& other) const { return !(*this == other); }

  // For STL containers.
  friend bool operator<(const Gold_Data& a, const Gold_Data& b) {
    if (int cmp = a._internal_id_.compare(b._internal_id_)) {
      return cmp < 0;
    }
    if (0) {
    } else if (a.num_ != b.num_) {
      return a.num_ < b.num_;
    }
    if (0) {
    } else if (int cmp = a.txt_.compare(b.txt_)) {
      return cmp < 0;
    }
    if (0) {
    } else if (int cmp = a.lnk_.compare(b.lnk_)) {
      return cmp < 0;
    }
    if (0) {
    } else if (a.flg_ != b.flg_) {
      return a.flg_ < b.flg_;
    }
    if (0) {
    } else if (a.ref_ != b.ref_) {
      return a.ref_ < b.ref_;
    }
    return false;
  }

protected:
  // Allow private copying for use in Handles.
  Gold_Data(const Gold_Data&) = default;
  Gold_Data& operator=(const Gold_Data&) = default;

  static const char* _schema_hash() { return "d8058d336e472da47b289eafb39733f77eadb111"; }
  static const int _field_count = 5;

  double num_ = 0;
  bool num_valid_ = false;

  std::string txt_ = "";
  bool txt_valid_ = false;

  URL lnk_ = "";
  bool lnk_valid_ = false;

  bool flg_ = false;
  bool flg_valid_ = false;

  Ref<GoldInternal1> ref_ = {};
  bool ref_valid_ = false;

  std::string _internal_id_;

  friend class Singleton<Gold_Data>;
  friend class Collection<Gold_Data>;
  friend class Ref<Gold_Data>;
  friend class internal::Accessor;
};

template<>
inline Gold_Data internal::Accessor::clone_entity(const Gold_Data& entity) {
  Gold_Data clone;
  clone.num_ = entity.num_;
  clone.num_valid_ = entity.num_valid_;
  clone.txt_ = entity.txt_;
  clone.txt_valid_ = entity.txt_valid_;
  clone.lnk_ = entity.lnk_;
  clone.lnk_valid_ = entity.lnk_valid_;
  clone.flg_ = entity.flg_;
  clone.flg_valid_ = entity.flg_valid_;
  clone.ref_ = entity.ref_;
  clone.ref_valid_ = entity.ref_valid_;
  return clone;
}

template<>
inline size_t internal::Accessor::hash_entity(const Gold_Data& entity) {
  size_t h = 0;
  internal::hash_combine(h, entity._internal_id_);
  internal::hash_combine(h, entity.num_);
  internal::hash_combine(h, entity.txt_);
  internal::hash_combine(h, entity.lnk_);
  internal::hash_combine(h, entity.flg_);
  internal::hash_combine(h, entity.ref_);
  return h;
}

template<>
inline bool internal::Accessor::fields_equal(const Gold_Data& a, const Gold_Data& b) {
  return (a.num_ == b.num_) &&
         (a.txt_ == b.txt_) &&
         (a.lnk_ == b.lnk_) &&
         (a.flg_ == b.flg_) &&
         (a.ref_ == b.ref_);
}

inline bool Gold_Data::operator==(const Gold_Data& other) const {
  return _internal_id_ == other._internal_id_ && fields_equal(*this, other);
}

template<>
inline std::string internal::Accessor::entity_to_str(const Gold_Data& entity, const char* join, bool with_id) {
  internal::StringPrinter printer;
  if (with_id) {
    printer.addId(entity._internal_id_);
  }
  if (entity.num_valid_) printer.add("num: ", entity.num_);
  if (entity.txt_valid_) printer.add("txt: ", entity.txt_);
  if (entity.lnk_valid_) printer.add("lnk: ", entity.lnk_);
  if (entity.flg_valid_) printer.add("flg: ", entity.flg_);
  if (entity.ref_valid_) printer.add("ref: ", entity.ref_);
  return printer.result(join);
}

template<>
inline void internal::Accessor::decode_entity(Gold_Data* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id_);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < Gold_Data::_field_count; i++) {
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
    } else if (name == "ref") {
      decoder.validate("R");
      decoder.decode(entity->ref_);
      entity->ref_valid_ = true;
    } else {
      // Ignore unknown fields until type slicing is fully implemented.
      std::string typeChar = decoder.chomp(1);
      if (typeChar == "T" || typeChar == "U") {
        std::string s;
        decoder.decode(s);
      } else if (typeChar == "N") {
        double d;
        decoder.decode(d);
      } else if (typeChar == "B") {
        bool b;
        decoder.decode(b);
      }
      i--;
    }
    decoder.validate("|");
  }
}

template<>
inline std::string internal::Accessor::encode_entity(const Gold_Data& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id_);
  encoder.encode("num:N", entity.num_);
  encoder.encode("txt:T", entity.txt_);
  encoder.encode("lnk:U", entity.lnk_);
  encoder.encode("flg:B", entity.flg_);
  encoder.encode("ref:R", entity.ref_);
  return encoder.result();
}

}  // namespace arcs

// For STL unordered associative containers. Entities will need to be std::move()-inserted.
template<>
struct std::hash<arcs::Gold_Data> {
  size_t operator()(const arcs::Gold_Data& entity) const {
    return arcs::hash_entity(entity);
  }
};

class AbstractGold : public arcs::Particle {
protected:
  arcs::Singleton<arcs::Gold_Data> data_{this, "data"};
  arcs::Collection<arcs::Gold_QCollection> qCollection_{this, "qCollection"};
  arcs::Singleton<arcs::Gold_Alias> alias_{this, "alias"};
};

#endif

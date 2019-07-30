#include <arcs.h>
#include <test-arcs.h>

class PassThrough : public arcs::Particle {
public:
  PassThrough() {
    registerHandle("input", input_);
    registerHandle("output", output_);
  }

  void onHandleSync(arcs::Handle* handle, bool all_synced) override {
    onHandleUpdate(handle);
  }

  void onHandleUpdate(arcs::Handle* handle) override {
    const arcs::Data& data = input_.get();
    arcs::Data out;
    if (data.has_num()) out.set_num(data.num() * 2);
    if (data.has_txt()) out.set_txt(data.txt() + "!");
    if (data.has_lnk()) out.set_lnk(data.lnk() + "#");
    if (data.has_flg()) out.set_flg(!data.flg());
    output_.set(&out);
  }

  arcs::Singleton<arcs::Data> input_;
  arcs::Singleton<arcs::Data> output_;
};

DEFINE_PARTICLE(PassThrough)

package arcs.sdk.android.dev.api;

import arcs.core.common.Id;
import arcs.core.common.Id.Generator;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class ArcData {
  private String arcId;
  private String pecId;
  private String recipe;
  private List<ParticleData> particleList = new ArrayList<>();
  private String sessionId;

  public String getArcId() {
    return arcId;
  }

  public String getPecId() {
    return pecId;
  }

  public String getRecipe() {
    return recipe;
  }

  public List<ParticleData> getParticleList() {
    return particleList;
  }

  public String getSessionId() {
    return sessionId;
  }

  public static class Builder {
    private final ArcData arcData = new ArcData();
    private final Id.Generator idGenerator = Id.Generator.Companion.newSession();

    public Builder setArcId(String arcId) {
      arcData.arcId = arcId;
      return this;
    }

    public Builder setPecId(String pecId) {
      arcData.pecId = pecId;
      return this;
    }

    public Builder setRecipe(String recipe) {
      arcData.recipe = recipe;
      return this;
    }

    public Builder addParticleData(ParticleData particleData) {
      arcData.particleList.add(particleData);
      return this;
    }

    public ArcData build() {
      Id arcId;
      if (arcData.arcId == null) {
        arcId = idGenerator.newArcId(ArcData.generateId());
        arcData.arcId = arcId.toString();
      } else {
        arcId = Id.Companion.fromString(arcData.arcId);
      }
      if (arcData.pecId == null) {
        arcData.pecId = idGenerator.newChildId(arcId, "pec").toString();
      }
      arcData.getParticleList().forEach(data -> data.normalize(idGenerator, arcId));
      arcData.sessionId = idGenerator.getSessionId();
      return arcData;
    }
  }

  public static class ParticleData {
    String name;
    String id;
    // Only one of either {particleId, particleName}, or particle can be set.
    Particle particle;
    // TODO: should be a name->id map. atm only support providing a single slot.
    String providedSlotId;

    public String getId() {
      return particle == null ? id : particle.getId();
    }

    public String getName() {
      return particle == null ? name : particle.getName();
    }

    public String getProvidedSlotId() {
      return providedSlotId;
    }

    public Particle getParticle() {
      return particle;
    }
    
    public ParticleData setId(String id) {
      if (this.particle != null) {
        throw new IllegalArgumentException("Cannot set particle id - particle already set");
      }
      this.id = id;
      return this;
    }

    public ParticleData setName(String name) {
      if (this.particle != null) {
        throw new IllegalArgumentException("Cannot set particle name - particle already set");
      }
      this.name = name;
      return this;
    }

    public ParticleData setParticle(Particle particle) {
      if (name != null || id != null) {
        throw new IllegalArgumentException(
            "Cannot set particle - particle name and/or id already set");
      }
      this.particle = particle;
      return this;
    }

    public ParticleData setProvidedSlotId(String providedSlotId) {
      this.providedSlotId = providedSlotId;
      return this;
    }

    void normalize(Id.Generator idGenerator, Id arcId) {
      if (name != null) {
        if (id == null) {
          id = idGenerator.newChildId(arcId, "particle").toString();
        }
      }
      if (particle != null) {
        if (particle.getId() == null) {
          particle.setId(idGenerator.newChildId(arcId, "particle").toString());
        }
        providedSlotId =
            particle.providesSlot() ? idGenerator.newChildId(arcId, "slotId").toString() : null;
      }
    }
  }

  // copied from /modalities/dom/components/generate-id.js
  private static long lastPushTime = -1;
  private static int[] lastRandChars = new int[12];
  private static final String PUSH_CHARS =
      "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";

  private static String generateId() {
    // TODO: Inject a Clock (so that tests can be repeatable and deterministic).
    long now = new Date().getTime();
    boolean duplicateTime = now == lastPushTime;
    lastPushTime = now;

    char[] timeStampChars = new char[8];
    for (int i = 7; i >= 0; i--) {
      timeStampChars[i] = PUSH_CHARS.charAt((int) (now % 64));
      now = (int) Math.floor(now / 64);
    }
    if (now != 0) {
      throw new AssertionError("We should have converted the entire timestamp.");
    }

    String id = String.valueOf(timeStampChars);

    if (!duplicateTime) {
      for (int i = 0; i < 12; i++) {
        lastRandChars[i] = (int) Math.floor(Math.random() * 64);
      }
    } else {
      int i;
      // If the timestamp hasn't changed since last push, use the same random number, except
      // incremented by 1.
      for (i = 11; i >= 0 && lastRandChars[i] == 63; i--) {
        lastRandChars[i] = 0;
      }
      lastRandChars[i]++;
    }
    for (int i = 0; i < 12; i++) {
      id += PUSH_CHARS.charAt(lastRandChars[i]);
    }
    return id;
  }
}

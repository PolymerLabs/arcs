package arcs.api;

public class Arc {
  private String arcId;
  private String pecId;
  private String recipe;
  private String particleId;
  private String particleName;
  private Particle particle;
  private String providedSlotId;
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

  public String getParticleId() {
    return particleId;
  }

  public String getParticleName() {
    return particleName;
  }

  public Particle getParticle() {
    return particle;
  }

  public String getProvidedSlotId() {
    return providedSlotId;
  }

  public String getSessionId() {
    return sessionId;
  }

  public static class Builder {
    private final Arc arc = new Arc();
    private final IdGenerator idGenerator = IdGenerator.newSession();

    public Builder setArcId(String arcId) {
      arc.arcId = arcId;
      return this;
    }

    public Builder setPecId(String pecId) {
      arc.pecId = pecId;
      return this;
    }

    public Builder setRecipe(String recipe) {
      arc.recipe = recipe;
      return this;
    }

    public Builder setParticleId(String particleId) {
      if (arc.particle != null) {
        throw new IllegalArgumentException("Cannot set particle id - particle already set");
      }
      arc.particleId = particleId;
      return this;
    }

    public Builder setParticleName(String particleName) {
      if (arc.particle != null) {
        throw new IllegalArgumentException("Cannot set particle name - particle already set");
      }
      arc.particleName = particleName;
      return this;
    }

    public Builder setParticle(Particle particle) {
      if (arc.particleName != null || arc.particleId != null) {
        throw new IllegalArgumentException(
            "Cannot set particle - particle name and/or id already set");
      }
      arc.particle = particle;
      return this;
    }

    public Builder setProvidedSlotId(String providedSlotId) {
      arc.providedSlotId = providedSlotId;
      return this;
    }

    public Arc get() {
      Id arcId;
      if (arc.arcId == null) {
        arcId = Id.newArcId();
        arc.arcId = arcId.toString();
      } else {
        arcId = Id.fromString(arc.arcId);
      }
      if (arc.pecId == null) {
        arc.pecId = idGenerator.newChildId(arcId, "pec").toString();
      }
      if (arc.particleName != null) {
        if (arc.particleId == null) {
          arc.particleId = idGenerator.newChildId(arcId, "particle").toString();
        }
      }
      if (arc.particle != null) {
        if (arc.particle.getId() == null) {
          arc.particle.setId(idGenerator.newChildId(arcId, "particle").toString());
        }
        arc.particleName = arc.particle.getName();
        arc.particleId = arc.particle.getId();
        arc.providedSlotId =
            arc.particle.providesSlot() ? idGenerator.newChildId(arcId, "slotId").toString() : null;
      }
      arc.sessionId = idGenerator.getSessionId();

      return arc;
    }
  }
}

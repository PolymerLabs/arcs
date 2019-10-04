package arcs.api;

public class ArcData {
  private String arcId;
  private String pecId;
  private String recipe;
  // Only one of either {particleId, particleName}, or particle can be set.
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
    return particle == null ? particleId : particle.getId();
  }

  public String getParticleName() {
    return particle == null ? particleName : particle.getName();
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
    private final ArcData arcData = new ArcData();
    private final IdGenerator idGenerator = IdGenerator.newSession();

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

    public Builder setParticleId(String particleId) {
      if (arcData.particle != null) {
        throw new IllegalArgumentException("Cannot set particle id - particle already set");
      }
      arcData.particleId = particleId;
      return this;
    }

    public Builder setParticleName(String particleName) {
      if (arcData.particle != null) {
        throw new IllegalArgumentException("Cannot set particle name - particle already set");
      }
      arcData.particleName = particleName;
      return this;
    }

    public Builder setParticle(Particle particle) {
      if (arcData.particleName != null || arcData.particleId != null) {
        throw new IllegalArgumentException(
            "Cannot set particle - particle name and/or id already set");
      }
      arcData.particle = particle;
      return this;
    }

    public Builder setProvidedSlotId(String providedSlotId) {
      arcData.providedSlotId = providedSlotId;
      return this;
    }

    public ArcData build() {
      Id arcId;
      if (arcData.arcId == null) {
        arcId = Id.newArcId();
        arcData.arcId = arcId.toString();
      } else {
        arcId = Id.fromString(arcData.arcId);
      }
      if (arcData.pecId == null) {
        arcData.pecId = idGenerator.newChildId(arcId, "pec").toString();
      }
      if (arcData.particleName != null) {
        if (arcData.particleId == null) {
          arcData.particleId = idGenerator.newChildId(arcId, "particle").toString();
        }
      }
      if (arcData.particle != null) {
        if (arcData.particle.getId() == null) {
          arcData.particle.setId(idGenerator.newChildId(arcId, "particle").toString());
        }
        arcData.providedSlotId =
            arcData.particle.providesSlot() ? idGenerator.newChildId(arcId, "slotId").toString() : null;
      }
      arcData.sessionId = idGenerator.getSessionId();

      return arcData;
    }
  }
}

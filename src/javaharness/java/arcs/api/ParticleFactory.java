package arcs.api;

/**
 * Interface that all built in particles must implement to create particles.
 */
public interface ParticleFactory {
    String getParticleName();
    Particle createParticle();
}

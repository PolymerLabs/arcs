import {Recipe} from "./recipe.js";
import {Handle} from './recipe-interface.js';
import {HandleEndPoint, ParticleEndPoint, TagEndPoint} from "./connection-constraint";
import {ParticleSpec} from "../../arcs-types/particle-spec.js";

// TODO(shanestephens): This should be a RecipeBuilder
export const newRecipe = (name?: string) => new Recipe(name);
export const newHandleEndPoint = (handle: Handle) => new HandleEndPoint(handle);
export const newParticleEndPoint = (particle: ParticleSpec, connection: string) => new ParticleEndPoint(particle, connection);
export const newTagEndPoint = (tags: string[]) => new TagEndPoint(tags);
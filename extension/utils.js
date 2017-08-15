// ad-hoc (for now) utilities
let utils = {
  createUrlMap: cdnRoot => {
    return {
      // TODO(sjmiles): mapping root and dot-root allows browser-cdn-loader to replace right-hand
      // side with fully-qualified URL when loading from worker context
      '/': '/',
      './': './',
      'assets': `${cdnRoot}/assets`,
      // TODO(sjmiles): map must always contain (explicitly, no prefixing) a mapping for `worker-entry-cdn.js`
      'worker-entry-cdn.js': `${cdnRoot}/worker-entry-cdn.js`
    };
  },
  prepareDataContext: (db, arc, manifest) => {
    if (!db) return;
    let highlight = 'padding: 3px 4px; background: #444; color: #bada55; font-weight: bold;';
    // create views
    // TODO(sjmiles): empirically, views must exist before committing Entities (?)
    db.views && Object.keys(db.views).forEach(k => {
      let entity = manifest.findSchemaByName(db.views[k]).entityClass();
      arc.createView(entity.type, k);
      console.log(`created View: %c${k}`, `${highlight} color: #ff8080;`);
    });
    // commit entities
    db.model && Object.keys(db.model).forEach(k => {
      let entity = manifest.findSchemaByName(k).entityClass();
      arc.commit(db.model[k].map(p => new entity(p)));
      console.log(`committed Entity: %c${k}`, `${highlight} color: #ffff80;`);
    });
  },
  suggest: async (arc, ui, planner, recipes) => {
    planner.init(arc, {
      arc,
      recipes
    });
    let suggestions = await planner.suggest(500);
    suggestions.forEach((suggestion, i) => ui.add(suggestion, i));
  }
};

// global module (for now)
window.utils = utils;
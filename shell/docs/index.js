import DocScraper from '../components/doc-scraper.js';
import docUrls from './doc-urls.js';

const toc = document.querySelector(`[toc]`);
const doc = document.querySelector(`[docs]`);

const strcmp = (a, b)=>(a<b)?-1:((a>b)?1:0);

const buildMdRenderer = file => {
  let md = new Remarkable({
    highlight: (str, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(lang, str).value;
        } catch (err) {
          // lint much?
        }
      }
      return ''; // use external default escaping
    }
  });
  let pathPrefix = file.replace(/(.*\/)[^/]+/, '$1');
  let imgRule = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, idx, options) => {
    tokens[idx].src = pathPrefix + tokens[idx].src;
    return imgRule(tokens, idx, options);
  };
  return md;
};

// Convert this-type-of_variables ToCamelNotation.
const toCamel = fn => {
  return fn.replace(/.*\/([^/.]+)\.\w+/, '$1').replace(/^[a-z]|(-[a-z])|(_[a-z])/g, v => {
    return v.length < 2 ? v.toUpperCase() : v[1].toUpperCase();
  });
};

const scrape = async urls => {
  let ismd = url => url.toLowerCase().endsWith('.md');
  let mds = urls.filter(f => ismd(f));
  let others = urls.filter(f => !ismd(f));
  let classes = await new DocScraper().addUrls(others);
  let values = await Promise.all(mds.map(async f => {
    let response = await fetch(f);
    let text = await response.text();
    return {
      name,
      chapter: f.startsWith('docs') ? 'Background' : 'Reference',
      description: buildMdRenderer(f).render(text)
    };
  }));
  return classes.concat(values);
};

const renderTopic = topic => {
  let html = [];
  html.push(`
    <div dclass>
      <div name>${topic.name}</div>
      <div desc>${topic.description}</div>
  `.trim());
  topic.methods && topic.methods.forEach(m => {
    html.push(`
      <div method>
        <div name>${m.name}</div>
        <div desc>${m.description}</div>
      </div>
    `.trim());
  });
  html.push(`</div>`);
  html.push(`<div end></div>`);
  return html.join('');
};

const renderDocs = docs => {
  let html = [];
  if (docs.classes) {
    docs.classes.sort((a, b) => strcmp(a.name, b.name));
    html = docs.classes.map(renderTopic);
  }
  doc.innerHTML = html.join(` `);
};

const renderToc = data => {
  // TODO: add @chapter pragma to the source code.
  let chapter = cls => cls.chapter || 'Reference';
  let html = [];
  new Set(data.classes.map(cls => chapter(cls))).forEach(c => {
    let topics = data.classes.filter(cls => chapter(cls) == c).map(c => c.name);
    html.push(`<div chapter><span name>${c}</span>`);
    Array.prototype.push.apply(html, topics.map(t => `<div><a href="#${t}" title="${t}">${t}</a></div>`));
    html.push('</div>');
  });
  toc.innerHTML = html.join('');
};

let corpus;

scrape(docUrls).then(classes => {
  console.log(classes);
  corpus = {classes};
  renderToc(corpus);
  updateTopic();
});

const updateTopic = () => {
  let name = decodeURIComponent(location.hash).slice(1) || `Manifest`;
  let topic = corpus.classes.find(c => c.name === name);
  doc.innerHTML = topic ? renderTopic(topic) : 'n/a';
};

window.onhashchange = e => {
  updateTopic();
};

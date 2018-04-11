import DocScraper from '../components/doc-scraper.js';
import docUrls from './doc-urls.js';

/* global Remarkable, hljs */

const toc = document.querySelector(`[toc]`);
const doc = document.querySelector(`[docs]`);

const strcmp = (a, b)=>(a<b)?-1:((a>b)?1:0);

const buildMdRenderer = file => {
  const md = new Remarkable({
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
  const pathPrefix = file.replace(/(.*\/)[^/]+/, '$1');
  const imgRule = md.renderer.rules.image;
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
  const ismd = url => url.toLowerCase().endsWith('.md');
  const mds = urls.filter(f => ismd(f));
  const others = urls.filter(f => !ismd(f));
  const classes = await new DocScraper().addUrls(others);
  const values = await Promise.all(mds.map(async path => {
    const response = await fetch(path);
    const text = await response.text();
    return {
      name: toCamel(path),
      chapter: path.startsWith('docs') ? 'Background' : 'Reference',
      description: buildMdRenderer(path).render(text)
    };
  }));
  return classes.concat(values);
};

const renderTopic = topic => {
  const html = [];
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
  const chapter = cls => cls.chapter || 'Reference';
  const html = [];
  new Set(data.classes.map(cls => chapter(cls))).forEach(c => {
    const topics = data.classes.filter(cls => chapter(cls) == c).map(c => c.name);
    html.push(`<div chapter><div name>${c}</div>`);
    Array.prototype.push.apply(html, topics.map(t => `<div list><a href="#${t}" title="${t}">${t}</a></div>`));
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
  const name = decodeURIComponent(location.hash).slice(1) || `Manifest`;
  const topic = corpus.classes.find(c => c.name === name);
  doc.innerHTML = topic ? renderTopic(topic) : 'n/a';
  // update toc selection
  const tocLinks = toc.querySelectorAll('a');
  tocLinks.forEach(m => {
    m.classList.toggle('selected', m.getAttribute('title') === name);
  });
  doc.scrollTop = 0;
};

window.onhashchange = e => {
  updateTopic();
};

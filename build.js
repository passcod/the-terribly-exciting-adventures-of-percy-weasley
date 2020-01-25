const fs = require('fs')
const unified = require('unified')
const markdown = require('remark-parse')
const abbr = require('remark-abbr')
const textr = require('remark-textr')
const hype = require('remark-rehype')
const reparse = require('rehype-raw')
const html = require('rehype-stringify')
const type = require('typographic-base')
const sanitise = require('rehype-sanitize')
const u = require('unist-builder')
const doc = require('rehype-document')

function footnoteReference(h, node) {
  const identifier = String(node.identifier)

  if (h.footnoteOrder.indexOf(identifier) === -1) {
    h.footnoteOrder.push(identifier)
  }

  return h(node.position, 'sup', {}, [
    h(node, 'a', {
      id: `fnref-${identifier}`,
      name: `fnref-${identifier}`,
      href: `#fndef-${identifier}`,
      className: ['footnote-ref']
    }, [
      u('text', node.label || identifier)
    ])
  ])
}

let footnoteid = 0 // very hack
function footnoteDefinition (h, node) {
  footnoteid += 1
  for (const child of node.children) {
    if (child.type == 'paragraph') {
      child.children.unshift({
        type: 'html',
        value: `<a
          id="fndef-${footnoteid}"
          name="fndef-${footnoteid}"
        ></a>`
      })
      child.children.push({
        type: 'html',
        value: '<br>',
      });
      break;
    }
  }

  return null;
}

let transform = unified()
  .use(markdown, { footnotes: true })
  .use(abbr)
  .use(textr, { plugins: [ type ] })
  .use(hype, {
    allowDangerousHTML: true,
    handlers: { footnoteReference, footnoteDefinition }
  })
  .use(reparse)
  .use(sanitise, {
    strip: ['script', 'style'],
    clobber: [],
    protocols: {
      href: ['https'],
      src: ['https'],
    },
    tagNames: [
      'a', 'abbr', 'acronym', 'address', 'b', 'big', 'blockquote', 'br',
      'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'dd', 'del',
      'dfn', 'div', 'dl', 'dt', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'hr', 'i', 'img', 'ins', 'kbd', 'li', 'ol', 'p', 'pre', 'q', 's',
      'samp', 'small', 'span', 'strike', 'strong', 'sub', 'sup', 'table',
      'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'tt', 'u', 'ul', 'var',
    ],
    attributes: {
      a: ['href', 'id', 'name'],
      img: ['src', 'alt'],
      '*': [],
    },
  })

if (process.env.local || process.argv[2] == 'local') {
  transform = transform.use(doc, {
    title: 'The Terribly Exciting Adventures of Percy Weasley, Witch',
    style: `
html {
  font-family: C059;
}

body {
  width: 80ch;
  margin: 3em auto;
}

.footnotes li {
  margin-bottom: 1em;
}
    `
  })
}

transform = transform.use(html).freeze()

try {
  fs.mkdirSync('build');
} catch (_) {}

for (const file of fs.readdirSync('build')) {
  fs.unlinkSync(`build/${file}`)
}

for (let file of fs.readdirSync('chapters')) {
  if (!file.endsWith('.md')) continue
  console.log(file)
  footnoteid = 0
  const input = fs.readFileSync(`chapters/${file}`)
  const build = transform.processSync(input)
  fs.writeFileSync(`build/${file.replace(/\.md$/, '.html')}`, build)
}



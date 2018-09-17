const fs = require('fs').promises
const path = require('path')
const marked = require('marked')

const SRC_DIR = './src'
const DOCS_DIR = './docs'
const cwd = process.cwd()

async function main () {
  try {
    await fs.mkdir(path.join(cwd, DOCS_DIR))
  } catch (e) {
    if (e.code !== 'EEXIST') { throw e }
  }
  const fileNames = await fs.readdir(path.join(cwd, SRC_DIR))
  for await (const fileName of fileNames) {
    if (!fileName.match(/\.js$/)) { continue }
    if (fileName.match(/\.build\.js$/)) { continue }

    const filePath = path.join(cwd, SRC_DIR, fileName)
    const fileData = await fs.readFile(filePath, 'utf8')
    const htmlData = join(formatFile(fileName, fileData))
    const htmlPath = path.join(cwd, DOCS_DIR, fileName.replace(/\.js$/, '.html'))
    await fs.writeFile(htmlPath, htmlData, 'utf8')
  }
}

const css = (strs) => strs.join('')
const stylesheet = css`
  body {
    margin: 0 auto;
    max-width: 800px;
    font-family: sans-serif;
  }
  p {
    margin: 1em auto 0.5em;
  }
  .test {
    border: 1px solid #ccc;
    padding-bottom: 1em;
  }
  code {
    display: block;
    white-space: pre;
    line-height: 1.4em;
  }
  section {
    margin: 1em 0;
  }
  .test header {
    background-color: papayawhip;
    font-weight: bold;
    padding: 0.5em;
  }
  .test .container {
    padding: 0.5em;
  }
  summary code {
    display: inline;
    white-space: normal;
  }
  .test code {
    padding-left: 1em;
    position: relative;
    white-space: pre-line;
  }
  .expect::before,
  .to-equal::before {
    position: absolute;
    left: 0;
    font-weight: bold;
  }
  .expect::before {
    content: ">";
    color: blue;
  }
  .to-equal::before {
    content: "<";
    color: gray;
  }
  .comment {
    line-height: 1.4;
  }
  .comment code {
    display: inline-block;
    background-color: #eee;
    line-height: 1;
    font-size: 16px;
    padding-left: 0;
  }
`

function * formatFile (name, data) {
  yield `<!doctype html>`
  yield * h('html', '', [
    ...h('head', '', [
      ...h('title', '', name),
      ...h('style', '', stylesheet)
    ]),
    ...h('body', '', body(data.split(/\n/).filter(removeEmpty)))
  ])
}

const removeEmpty = (line) => /\S/.test(line)

function * comment (lines) {
  const buffer = []
  while (lines.length) {
    const line = lines[0]
    let match = line.match(commentPattern)
    if (match) {
      buffer.push(match[1])
      lines.shift()
    } else {
      break
    }
  }
  yield * h('aside', 'class="comment"', marked(buffer.join('\n')))
}

const indentedPattern = /^\s+\S/
const commentPattern = /^\s*\/\/(.*)/
const testPattern = /^export function (?:only_|skip_)?test_([\w_]+)/
const exportPattern = /^export (?:default )?(?:function|const|let) (\S)+/
const expectHeadPattern = /^\s*expect\(/
const expectFullPattern = /^\s*expect\(([^]+)\)\s*.toEqual\(([^]+)\)\s*/
const asiLinePattern = /^\s*(?:let|const|var|function|class|if|while|;)/

function * expect (lines) {
  const buffer = [lines.shift()]
  while (lines.length) {
    if (lines[0].match(expectHeadPattern) || lines[0].match(commentPattern) ||
      lines[0].match(asiLinePattern) || lines[0].match(/^}/)) {
      break
    } else {
      buffer.push(lines.shift())
    }
  }
  const text = buffer.join('\n')
  const match = text.match(expectFullPattern)
  if (match) {
    yield * h('code', 'class="expect"', match[1].trim())
    yield * h('code', 'class="to-equal"', match[2].trim())
  } else {
    yield * h('code', 'class="to-equal"', text.trim())
  }
}

function * test (lines) {
  const buffer = []
  const title = lines.shift().match(testPattern)

  while (lines.length) {
    const line = lines[0]
    if (line.match(/^}/)) {
      lines.shift()
      break
    }
    if (line.match(commentPattern)) {
      buffer.push(join(comment(lines)))
    } else if (line.match(expectHeadPattern)) {
      buffer.push(join(expect(lines)))
    } else {
      buffer.push(join(h('code', '', line)))
      lines.shift()
    }
  }
  yield * h('section', `class="test" id="test_${title}"`, [
    ...h('header', '', title[1].replace(/_/g, ' ')),
    ...h('div', 'class="container"', join(buffer))
  ])
}

function * contentBody (lines) {
  const buffer = []
  buffer.push(join(h('code', '', lines.shift())))
  while (lines.length) {
    const line = lines[0]

    if (line.match(commentPattern) && line.match(indentedPattern)) {
      buffer.push(join(comment(lines)))
    } else if (line.match(commentPattern) || line.match(testPattern) || line.match(exportPattern)) {
      break
    } else {
      buffer.push(join(h('code', '', line)))
      lines.shift()
    }
  }
  if (buffer.length === 1) {
    yield * h('div', 'class="content"', buffer[0])
  } else {
    yield * h('details', 'class="content"', [
      ...h('summary', '', buffer[0]),
      ...buffer.slice(1)
    ])
  }
}

function * detailBody (lines) {
  yield lines.shift()
  while (lines.length) {
    const line = lines[0]

    if (line.match(commentPattern) && line.match(indentedPattern)) {
      yield * comment(lines)
    } else if (line.match(exportPattern) || line.match(testPattern) || line.match(commentPattern)) {
      return
    } else {
      yield * h('code', '', line)
      lines.shift()
    }
  }
}

function * body (lines) {
  while (lines.length) {
    const line = lines[0]
    let match
    if (line.match(commentPattern)) {
      yield * comment(lines)
    } else if (match = line.match(testPattern)) {
      yield * test(lines)
    } else {
      yield * contentBody(lines)
    }
  }
}

function join (stringIter) {
  let str = ''
  for (const line of stringIter) { str += line }
  return str
}

function * h (tag, props = '', contents = []) {
  yield `<${tag} ${props}>`
  if (typeof contents === 'string') {
    yield contents
  } else {
    yield * contents
  }
  yield `</${tag}>`
}

main()

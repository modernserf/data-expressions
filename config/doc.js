const fs = require('fs').promises
const path = require('path')
const marked = require('marked')
const prism = require('prismjs')

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

function * formatFile (name, data) {
  yield `<!doctype html>`
  yield * h('html', '', [
    ...h('head', '', [
      '<meta charset="utf-8">',
      '<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      ...h('title', '', name),
      '<link rel="stylesheet" type="text/css" href="doc.css" />'
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
  yield * h('aside', 'class="comment"', marked(buffer.join('\n\n')))
}

const indentedPattern = /^\s+\S/
const commentPattern = /^\s*\/\/(.*)/
const testPattern = /^export function (?:only_|skip_)?test_([\w_]+)/
const exportPattern = /^export (?:default )?(?:function|const|let) (\S)+/
const expectHeadPattern = /^\s*expect\(/
const expectFullPattern = /^\s*expect\(([^]+)\)\s*.toEqual\(([^]+)\)\s*/
const asiLinePattern = /^\s*(?:let|const|var|function|class|if|while|;)/

function * code (props, string) {
  yield * h('code', props, prism.highlight(string, prism.languages.javascript))
}

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
    yield * code('class="expect"', match[1].trim())
    yield * code('class="to-equal"', match[2].trim())
  } else {
    yield * code('class="to-equal"', text.trim())
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
      buffer.push(join(code('', line)))
      lines.shift()
    }
  }
  yield * h('section', `class="test" id="test_${title}"`, join(buffer))
}

function * contentBody (lines) {
  const buffer = []
  buffer.push(join(code('', lines.shift())))
  while (lines.length) {
    const line = lines[0]

    if (line.match(commentPattern) && line.match(indentedPattern)) {
      buffer.push(join(comment(lines)))
    } else if (line.match(commentPattern) || line.match(testPattern) || line.match(exportPattern)) {
      break
    } else {
      buffer.push(join(code('', line)))
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

function * body (lines) {
  while (lines.length) {
    const line = lines[0]
    if (line.match(commentPattern)) {
      yield * comment(lines)
    } else if (line.match(testPattern)) {
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

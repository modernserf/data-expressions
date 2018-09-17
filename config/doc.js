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
  }
  .test {
    border: 1px solid #ccc;
    padding: 1em;
  }
  code {
    display: block;
    white-space: pre;
    line-height: 0.7;
  }
  .comment code {
    display: inline-block;
    background-color: #eee;
  }
  section {
    margin: 1em 0;
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
  yield `<aside class="comment">`
  let buffer = ''
  while (lines.length) {
    const line = lines[0]
    let match = line.match(commentPattern)
    if (match) {
      buffer += match[1] + '\n'
      lines.shift()
    } else {
      break
    }
  }
  yield marked(buffer)
  yield `</aside>`
}

const indentedPattern = /^\s+\S/
const commentPattern = /^\s*\/\/(.*)/
const testPattern = /^export function (?:only_|skip_)?test_([\w_]+)/
const exportPattern = /^export (?:default )?(?:function|const|let) (\S)+/

function * test (lines) {
  while (lines.length) {
    const line = lines[0]
    if (line.match(/^}/)) {
      yield * h('code', '', line)
      lines.shift()
      return
    }
    if (line.match(commentPattern)) {
      yield * comment(lines)
    } else {
      yield * h('code', '', line)
      lines.shift()
    }
  }
}

function * exportBody (lines) {
  while (lines.length) {
    const line = lines[0]

    if (line.match(commentPattern)) {
      yield * comment(lines)
    } else if (line.match(testPattern)) {
      return
    } else if (line.match(indentedPattern) || line.match(exportPattern) || line.match(/^}/)) {
      yield * h('code', '', line)
      lines.shift()
    } else {
      return
    }
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
      yield * h('section', `class="test" id="test_${match[1]}"`, [
        ...test(lines)
      ])
    } else if (match = line.match(exportPattern)) {
      yield * h('section', `class="export" id="${match[1]}"`, [
        ...exportBody(lines)
      ])
    } else {
      yield * h('details', '', [
        ...h('section', 'class="details-body"', [
          ...detailBody(lines)
        ])
      ])
    }
  }
}

function join (stringIter) {
  let str = ''
  for (const line of stringIter) { str += line + '\n' }
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

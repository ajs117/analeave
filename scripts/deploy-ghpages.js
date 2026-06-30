const { execSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

function run(command, options = {}) {
  console.log('>', command)
  return execSync(command, { stdio: 'inherit', ...options })
}

async function main() {
  const root = process.cwd()
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  const repoUrl = (process.env.REPO || (pkg.repository && pkg.repository.url)) || ''

  if (!repoUrl) {
    console.error('Repository URL not found. Set package.json.repository.url or pass REPO env var.')
    process.exit(1)
  }

  const buildDir = path.join(root, 'dist')
  if (!fs.existsSync(buildDir)) {
    console.error('Build directory not found. Run npm run build before deploy.')
    process.exit(1)
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ana-leave-deploy-'))

  try {
    run(`git clone ${repoUrl} "${tmp}"`)
    process.chdir(tmp)

    try {
      run('git checkout gh-pages')
    } catch (error) {
      run('git checkout --orphan gh-pages')
    }

    fs.readdirSync(tmp).forEach((entry) => {
      if (entry === '.git') return
      fs.rmSync(path.join(tmp, entry), { recursive: true, force: true })
    })

    const copyRecursive = (source, destination) => {
      if (!fs.existsSync(destination)) fs.mkdirSync(destination, { recursive: true })
      for (const name of fs.readdirSync(source)) {
        const sourcePath = path.join(source, name)
        const destinationPath = path.join(destination, name)
        const stat = fs.statSync(sourcePath)
        if (stat.isDirectory()) {
          copyRecursive(sourcePath, destinationPath)
        } else {
          fs.copyFileSync(sourcePath, destinationPath)
        }
      }
    }

    copyRecursive(buildDir, tmp)

    // Stop GitHub Pages' Jekyll processing so files/dirs are served verbatim.
    fs.writeFileSync(path.join(tmp, '.nojekyll'), '')

    run('git add -A')
    try {
      run('git commit -m "Deploy to gh-pages [skip ci]"')
    } catch (error) {
      console.log('Nothing to commit. Continuing...')
    }

    run('git push origin HEAD:gh-pages --force')
    console.log('Deployed to gh-pages')
  } finally {
    process.chdir(root)
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
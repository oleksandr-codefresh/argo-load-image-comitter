const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const yamlUtils = require('js-yaml');

const GH_TOKEN = process.env.GH_TOKEN
const GH_USER = process.env.GH_USER
const GH_URL = process.env.GH_URL || "https://github.com"
const BASE_REPO_NAME = process.env.BASE_REPO_NAME
const FROM_INDEX = +(process.env.FROM_INDEX || 0)
const TO_INDEX = +(process.env.TO_INDEX || 0)
const COMMIT_DELAY_SEC = +(process.env.COMMIT_DELAY_SEC || 60)

const repoDirName = 'repositories'
const repoName = getRepoName(FROM_INDEX);
const reposPath = `${process.cwd()}/${repoDirName}`
const repoPath = `${process.cwd()}/${repoDirName}/${repoName}`

const imageOrder = [
    "0.1",
    "0.2",
    "0.3",
]

function getNextImageName(currentImage: string): string {
    const nextImageIndex = imageOrder.indexOf(currentImage) + 1
    const maxIndex = imageOrder.length - 1

    return nextImageIndex > maxIndex ? imageOrder[0] : imageOrder[nextImageIndex]
}

function getRepoUrlWithCreds(repoName: string): string {
    const urlHalf = GH_URL.replace('//', `//${GH_TOKEN}:x-oauth-basic@`)
    return `${urlHalf}/${GH_USER}/${repoName}.git`
}

function getRepoName(index: number): string {
    return `${BASE_REPO_NAME}-${index}`
}

async function waitTime(sec: number): Promise<any> {
    return new Promise((res) => {
        setTimeout(res, sec * 1000)
    })
}

async function updateImage(valuesFilePath: string) {
    const valuesFileContent = fs.readFileSync(valuesFilePath, {encoding: 'utf-8'})
    const yamlObject = yamlUtils.load(valuesFileContent)
    const currentImage = yamlObject.image.tag
    const nextImage = getNextImageName(currentImage)
    yamlObject.image.tag = nextImage
    const newValuesFileContent = yamlUtils.dump(yamlObject)
    fs.writeFileSync(valuesFilePath, newValuesFileContent)
    console.log(`new tag - ${nextImage}`)
    exec(`git -C ${repoPath} add ${valuesFilePath}`)
    exec(`git -C ${repoPath} commit --message 'new tag - ${nextImage}'`)
    exec(`git -C ${repoPath} push origin`)
}

async function main() {

    const devValuesPath = `${process.cwd()}/${repoDirName}/${repoName}/dev/values.yaml`
    const prodValuesPath = `${process.cwd()}/${repoDirName}/${repoName}/prod/values.yaml`

    console.log({
        GH_TOKEN,
        GH_USER,
        GH_URL,
        BASE_REPO_NAME,
        FROM_INDEX,
        TO_INDEX,
        COMMIT_DELAY_SEC
    })

    await exec(`rm -rf ./${repoDirName}`)
    await exec(`mkdir ${repoDirName}`)
    await exec(`git clone ${getRepoUrlWithCreds(repoName)} ${repoPath}`)

    await updateImage(devValuesPath)
    await waitTime(COMMIT_DELAY_SEC)
    await updateImage(prodValuesPath)
}

main()

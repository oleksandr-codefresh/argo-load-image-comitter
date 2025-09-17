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
const COMMIT_DEV_DELAY_SEC = +(process.env.COMMIT_DEV_DELAY_SEC || 60)
const COMMIT_PRODUCT_DELAY_SEC = +(process.env.COMMIT_PRODUCT_DELAY_SEC || 90)
const COMMIT_CYCLE_DELAY_SEC = +(process.env.COMMIT_CYCLE_DELAY_SEC || 0)

const repoDirName = 'repositories'
const reposPath = `${process.cwd()}/${repoDirName}`
const getRepoPath = (repoName: string): string => `${process.cwd()}/${repoDirName}/${repoName}`

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

async function updateImage(opts: { valuesFilePath: string, repoPath: string }): Promise<string> {
    const valuesFileContent = fs.readFileSync(opts.valuesFilePath, {encoding: 'utf-8'})
    const yamlObject = yamlUtils.load(valuesFileContent)
    const currentImage = yamlObject.image.tag
    const nextImage = getNextImageName(currentImage)
    yamlObject.image.tag = nextImage
    const newValuesFileContent = yamlUtils.dump(yamlObject)
    fs.writeFileSync(opts.valuesFilePath, newValuesFileContent)
    await exec(`git -C ${opts.repoPath} add ${opts.valuesFilePath}`)
    await exec(`git -C ${opts.repoPath} commit --message 'new tag - ${nextImage}'`)
    await exec(`git -C ${opts.repoPath} push origin`)
    return nextImage
}

async function updateRepo(idx: number): Promise<void> {
    const repoName = getRepoName(idx);
    const repoPath = `${process.cwd()}/${repoDirName}/${repoName}`
    const getValuesPath = (folder: string): string => `${repoPath}/${folder}/values.yaml`
    const devValuesPath = getValuesPath('dev')
    const prodValuesPath = getValuesPath('prod')

    // actions
    console.log(`processing repo - ${repoName}`)
    await exec(`git clone ${getRepoUrlWithCreds(repoName)} ${repoPath}`)

    const newDevImage = await updateImage({ repoPath, valuesFilePath: devValuesPath })
    console.log(`updated /dev folder image to ${newDevImage}`)
    console.log(`waiting ${COMMIT_DEV_DELAY_SEC} sec before updating /prod folder image`)
    await waitTime(COMMIT_DEV_DELAY_SEC)
    const newProdImage = await updateImage({ repoPath, valuesFilePath: prodValuesPath })
    console.log(`updated /prod folder image to ${newProdImage}`)
    await exec(`rm -rf ${repoPath}`)
    console.log(`removed ${repoName}`)
}

function printConfig() {
    console.log('Props')
    console.log({
        BASE_REPO_NAME,
        FROM_INDEX,
        TO_INDEX,
        COMMIT_DEV_DELAY_SEC,
        COMMIT_PRODUCT_DELAY_SEC,
        COMMIT_CYCLE_DELAY_SEC,
    })
    if (COMMIT_CYCLE_DELAY_SEC) {
        console.warn('Script running in infinitely loop mode')
    }
}

async function main() {
    await exec(`rm -rf ./${repoDirName}`)
    await exec(`mkdir ${repoDirName}`)
    const iterations: number[] = new Array((TO_INDEX + 1) - FROM_INDEX).fill(null).map((_, idx) => idx + FROM_INDEX)
    if (!iterations.length) return;
    for await (const idx of iterations) {
        if (idx > FROM_INDEX) {
            console.log(`waiting ${COMMIT_PRODUCT_DELAY_SEC} sec before updating next repo`)
            await waitTime(COMMIT_PRODUCT_DELAY_SEC)
        }
        await updateRepo(idx)
    }
    if (COMMIT_CYCLE_DELAY_SEC) {
        console.log(`waiting ${COMMIT_CYCLE_DELAY_SEC} sec before next cycle`)
        await waitTime(COMMIT_CYCLE_DELAY_SEC)
        process.nextTick(main)
        return
    }
    console.log('tasks finished')
}

printConfig()
main()

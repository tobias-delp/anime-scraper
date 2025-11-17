import axios from 'axios'
import { load } from 'cheerio'
import { sendTelegramMessage } from '../util/telegram'
import { batchGetAnimesByKey, loadAnimeCacheFromDB, saveCacheToDB, saveNewAnimesToDB } from '../util/db'
import { ScrapedAnime, DBAnime, CachedAnime } from '../types/dto'

// entry point for the lambda
export const handler = async () => {
    const scrapedAnimes = await scrapeSite('https://aniwatchtv.to/recently-updated')

    console.log(scrapedAnimes)

    const scrapedAnimesCache = generateCacheJson(scrapedAnimes)

    console.log('scrapedAnimeCache')
    console.log(scrapedAnimesCache)

    const animeCacheFromDB = await loadAnimeCacheFromDB()

    console.log('animeCacheFromDB')
    console.log(animeCacheFromDB)


    const newAnimes = compareCaches(scrapedAnimesCache, animeCacheFromDB)

    console.log('newAnimes')
    console.log(newAnimes)

    // if there are no new animes, stop here
    if (!newAnimes.length) return

    saveCacheToDB(scrapedAnimesCache)

    const animesFromDB = await loadAnimesFromDB(newAnimes)

    console.log('animesFromDB')
    console.log(animesFromDB)

    const newAnimesToSave = await createAnimesToSave(newAnimes, scrapedAnimes, animesFromDB)

    console.log(newAnimesToSave)

    if (newAnimesToSave.length) {
        await saveNewAnimesToDB(newAnimesToSave)
        await sendNotifications(newAnimesToSave)
    }
}

async function scrapeSite(url: string): Promise<ScrapedAnime[]> {
    const currentDate = new Date().toISOString()
    const response = await axios.get(url)
    const html = response.data

    const $ = load(html)

    const allAnimes = $('div.flw-item')

    const scrapedAnimes: ScrapedAnime[] = []
    for (let anime of allAnimes) {
        const link = $(anime).find('a[data-jname]')

        const displayName = $(link).attr('data-jname')
        if (!displayName) continue

        const url = $(link).attr('href')
        if (!url) continue

        const episode = Number($(anime).find('.tick-sub').text())
        const scrapedAnime: ScrapedAnime = {
            displayName,
            url: 'https://aniwatchtv.to' + url,
            currentEpisode: episode,
            lastUpdated: currentDate
        }
        scrapedAnimes.push(scrapedAnime)
    }

    console.log(`Scraped ${scrapedAnimes.length} items`)
    return scrapedAnimes
}

function generateCacheJson(scrapedAnimes: ScrapedAnime[]): CachedAnime[] {
    return scrapedAnimes.map(({ url, currentEpisode }) => { return { url, currentEpisode } })
}

async function loadAnimesFromDB(scrapedAnimes: CachedAnime[]): Promise<DBAnime[]> {
    const animeKeys = scrapedAnimes.map(anime => anime.url)
    let results: DBAnime[] = []
    try {
        console.log(animeKeys)
        results = await batchGetAnimesByKey(animeKeys);
        console.log("Fetched items:", results.length);
    } catch (error) {
        console.error("Error fetching items:", error);
    }
    return results
}

function compareCaches(scrapedAnimesCache: CachedAnime[], animeCacheFromDB: CachedAnime[]): CachedAnime[] {
    const newAnimes = []

    // if there is no cache in the db, everything is new
    if (!animeCacheFromDB.length) return scrapedAnimesCache

    for (let scrapedAnime of scrapedAnimesCache) {
        // if already exists, ignore
        if (animeCacheFromDB.some(({ url, currentEpisode }) => scrapedAnime.url == url && scrapedAnime.currentEpisode == currentEpisode)) continue
        newAnimes.push(scrapedAnime)
    }
    return newAnimes
}

async function createAnimesToSave(newAnimes: CachedAnime[], scrapedAnimes: ScrapedAnime[], dbAnimes: DBAnime[]): Promise<DBAnime[]> {
    const updatedAnimes: DBAnime[] = []
    for (let newAnime of newAnimes) {
        const animeFromDB = dbAnimes.find(({ url }) => newAnime.url == url)
        // anime is not yet in DB -> new anime found
        if (!animeFromDB) {
            const animeToSave = scrapedAnimes.find(({ url }) => newAnime.url == url)
            if (!animeToSave) continue
            updatedAnimes.push(
                {
                    ...animeToSave,
                    notWatching: false
                }
            )
            continue
        }

        // anime is in DB but with an older episode -> add new episode
        if (animeFromDB.currentEpisode < newAnime.currentEpisode) {
            // take the old entry and just change what is new
            updatedAnimes.push(
                {
                    ...animeFromDB,
                    currentEpisode: newAnime.currentEpisode,
                    lastUpdated: new Date().toISOString()
                }
            )
        }
    }
    console.log(`New items found: ${updatedAnimes.length}`)
    return updatedAnimes
}

async function sendNotifications(newEntries: DBAnime[]) {
    for (let { displayName, currentEpisode, url, notWatching } of newEntries) {
        if (notWatching) continue // don't send a message if not watching
        await sendTelegramMessage(`${displayName} episode ${currentEpisode} is out`, url)
    }
}

// (async () => sendTelegramMessage('stuff', '1234'))()
// (async () => handler())()

// TODO: register webhook once the lambda has telegramWebhook function url has been set up

// https://api.telegram.org/bot{bot_token}/getWebhookInfo
// https://api.telegram.org/bot{bot_token}/setWebhook?url={webhook_endpoint}
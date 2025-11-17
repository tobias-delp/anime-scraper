type ScrapedAnime = {
    displayName: string
    url: string
    currentEpisode: number
    lastUpdated: string
}

type DBAnime = ScrapedAnime & {
    notWatching: boolean
}


type CachedAnime = {
    url: string
    currentEpisode: number
}

export {
    ScrapedAnime,
    DBAnime,
    CachedAnime
}
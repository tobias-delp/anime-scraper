import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchGetCommand, GetCommand, PutCommand, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { DBAnime, CachedAnime } from "../types/dto";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);
const dynamoTable = process.env.TABLE_NAME || '';


async function loadAnimeCacheFromDB(): Promise<CachedAnime[]> {
    const response = await ddbDocClient.send(new GetCommand(
        {
            TableName: dynamoTable,
            Key: { url: 'cachedAnimes' }
        }
    ))

    return response.Item?.cache as CachedAnime[]
}

async function saveCacheToDB(cache: CachedAnime[]) {
    try {
        await ddbDocClient.send(new PutCommand(
            {
                TableName: dynamoTable,
                Item: { url: 'cachedAnimes', cache }
            }
        ))
    } catch (e) {
        console.error(e)
    }
}

async function batchGetAnimesByKey(keyStrings: string[]): Promise<DBAnime[]> {
    // Map each URL to the key object required by DynamoDB
    // Assuming the primary key attribute is named "url"
    const keys = keyStrings.map((url) => ({ url }));

    // Create the BatchGetCommand input
    const batchGetParams = {
        RequestItems: {
            [dynamoTable]: {
                Keys: keys,
            },
        },
    };

    const command = new BatchGetCommand(batchGetParams);
    const response = await ddbDocClient.send(command);

    const items = response.Responses?.[dynamoTable] ?? [];

    return items as DBAnime[];
}

async function saveNewAnimesToDB(newEntries: DBAnime[]) {
    try {
        for (let entry of newEntries) {
            await ddbDocClient.send(new PutCommand(
                {
                    TableName: dynamoTable,
                    Item: entry
                }
            ))
        }
    } catch (e) {
        console.error(e)
    }
}

async function markAnimeNotWatching(url: string) {
    console.log(`Updating ${url}`)
    const params: UpdateCommandInput = {
        TableName: dynamoTable,
        Key: {
            url: url
        },
        UpdateExpression: 'set notWatching = :s',
        ExpressionAttributeValues: {
            ':s': true
        },
        ReturnValues: "UPDATED_NEW"
    };

    try {
        const response = await ddbDocClient.send(new UpdateCommand(params));
        console.log(response)
    } catch (e) {
        console.error(e)
    }
}

export {
    batchGetAnimesByKey,
    loadAnimeCacheFromDB,
    saveCacheToDB,
    saveNewAnimesToDB,
    markAnimeNotWatching
}
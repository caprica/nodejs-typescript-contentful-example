/*
 * Access module for Contentful.
 */
import * as contentful from 'contentful-management'
import { AssetProps, BulkActionPublishPayload, BulkActionUnpublishPayload, CreateEntryProps, EntryProps } from 'contentful-management'
import { createReadStream } from 'fs'
import { logger } from './log'
import { AssetMeta } from './model'

const API_KEY = process.env.CONTENTFUL_API_KEY as string
const SPACE_ID = process.env.CONTENTFUL_SPACE_ID as string

/**
 * Create a new client to access Contentful via the Management API.
 *
 * @returns Contentful client
 */
const contentfulClient = () => contentful.createClient(
    {
        accessToken: API_KEY,
    },
    {
         type: 'plain',
         defaults: {
            spaceId: SPACE_ID,
            environmentId: 'master'
         }
    }
)

/**
 * Component used to access the Contentful Management API.
 */
const client = contentfulClient()

/**
 * Heterogeneous array of items (assets or entries).
 */
export type ItemArray = (AssetProps | EntryProps)[]

/**
 * Find all entries with the given tag.
 *
 * @param tag id of the tag that must exist on the desired entries
 * @returns array of entry ids
 */
export const findTaggedEntries = async (tag: string) => {
    logger.info(`findTaggedEntries(tag=${tag})`)
    const result = await client.entry.getMany({
        query: {
            select: 'sys.id',
            ...{
                'metadata.tags.sys.id[all]': tag
            }
        }
    })
    return result.items.map(entry => entry.sys.id)
}

/**
 * Find all assets with the given tag.
 *
 * @param tag id of the tag that must exist on the desired entries
 * @returns array of asset ids
 */
 export const findTaggedAssets = async (tag: string) => {
    logger.info(`findTaggedAssets(tag=${tag})`)
    const result = await client.asset.getMany({
        query: {
            select: 'sys.id',
            ...{
                'metadata.tags.sys.id[all]': tag
            }
        }
    })
    return result.items.map(entry => entry.sys.id)
}

/**
 * Delete zero or more entries by their id.
 *
 * The entries will be unpublished, then deleted.
 *
 * @param ids array of entry ids
 */
export const deleteEntries = async (ids: string[]) => {
    logger.info(`deleteEntries(ids=[${ids.length}])`)
    return await Promise.all(ids.map(async id => {
        logger.info(`delete entry ${id}`)
        await client.entry.delete({ entryId: id })
    }))
}

/**
 * Delete zero or more assets by their id.
 *
 * @param ids array of asset ids
 */
 export const deleteAssets = async (ids: string[]) => {
    logger.info(`deleteAssets(ids=[${ids.length}])`)
    return await Promise.all(ids.map(async id => {
        logger.info(`delete asset ${id}`)
        await client.asset.delete({ assetId: id })
    }))
}

/**
 * Create a new entry.
 *
 * The entry will be tagged with the given tag.
 *
 * The new entry will be in Draft state, not Published.
 *
 * @returns promise for the created entry
 */
 export const createEntry = async (contentTypeId: string, value: any, tag: string) => {
    logger.info(`createEntry(contentTypeId=${contentTypeId}, value=${JSON.stringify(value)}, tag=${tag})`)
    const entry: CreateEntryProps = {
        fields: {
            ...value
        },
        metadata: {
            tags: [{
                sys: {
                    type: 'Link',
                    linkType: 'Tag',
                    id: tag
                }
            }]
        }
    }
    return await client.entry.create({ contentTypeId }, entry)
}

/**
 * Create a new asset from a local file.
 *
 * The asset will be tagged with the given tag.
 *
 * The new asset will be in Draft state, not Published.
 *
 * @param meta metadata describing the asset
 * @param file name of the local file containing the asset
 * @param locale locale to create asset for
 * @param tag tag to apply to the new asset
 * @returns promise for the created asset
 */
export const createAssetFromFile = async (meta: AssetMeta, file: string, locale: string, tag: string) => {
    logger.info(`createAsset(file=${file}, tag=${tag})`)
    // Asset creation can not incorporate setting the tag, it must be added subsequently
    const assetProps = {
        fields: {
            title: {
                [locale]: meta.title
            },
            description: {
                [locale]: meta.description
            },
            file: {
                [locale]: {
                    file: createReadStream(file),
                    contentType: meta.contentType,
                    fileName: meta.fileName,
                }
            }
        }
    }
    const asset = await client.asset.createFromFiles({}, assetProps)
    logger.info(`created ${asset.sys.id}`)
    return await tagAsset(asset, tag)
}

/**
 * Create a new asset from a Picsum URL.
 *
 * The asset will be tagged with the given tag.
 *
 * The new asset will be in Draft state, not Published.
 *
 * @param meta metadata describing the asset
 * @param width desired image width
 * @param height desired image height
 * @param locale locale to create asset for
 * @param tag tag to apply to the new asset
 * @returns promise for the created asset
 */
 export const createAssetFromPicsum = async (meta: AssetMeta, width: number, height: number, locale: string, tag: string) => {
    logger.info(`createPicsumAsset(tag=${tag})`)
    // Asset creation can not incorporate setting the tag, it must be added subsequently
    const assetProps = {
        fields: {
            title: {
                [locale]: meta.title
            },
            description: {
                [locale]: meta.description
            },
            file: {
                [locale]: {
                    contentType: meta.contentType,
                    fileName: meta.fileName,
                    upload: `https://picsum.photos/${width}/${height}`
                }
            }
        }
    }
    const asset = await client.asset.create({}, assetProps)
    logger.info(`created ${asset.sys.id}`)
    return await tagAsset(asset, tag)
}

/**
 * Wait for assets to be processed
 *
 * @param assets assets to process
 * @returns processed assets
 */
export const processAssets = (assets: AssetProps[]) => {
    logger.info(`processAssets(assets=[${assets.length}])`)
    const results = assets.map(asset => client.asset.processForAllLocales({}, asset))
    return Promise.all(results)
}

/**
 * Publish a collection of items in bulk.
 *
 * The items may be any combination of assets and entries.
 *
 * @param items items to publish
 * @returns promise of published items
 */
export const publishItems = async (items: ItemArray) => {
    logger.info(`publishItems(items=[${items.length}])`)
    if (items.length === 0) return
    items.forEach(item => logger.info(`publish ${item.sys.id}`))
    const payload: BulkActionPublishPayload = {
        entities: {
            sys: {
                type: 'Array'
            },
            items: items.map(item => ({
                sys: {
                    type: 'Link',
                    id: item.sys.id,
                    version: item.sys.version,
                    linkType: item.sys.type as 'Asset' | 'Entry',
                }
            }))
        }
    }
    return await client.bulkAction.publish({ spaceId: SPACE_ID, environmentId: 'master' }, payload)
}

// Potenatially the following two unpublish methods could be merged similarly
// to how the publish counterpart methods work

/**
 * Unpublish a collection of entries in bulk.
 *
 * @param ids entries to unpublish
 * @return promise
 */
export const unpublishEntries = async (ids: string[]) => {
    logger.info(`unpublishEntries(ids=[${ids.length}])`)
    return await unpublishItems(ids, 'Entry')
}

/**
 * Unpublish a collection of assets in bulk.
 *
 * @param ids assets to unpublish
 * @return promise
 */
 export const unpublishAssets = async (ids: string[]) => {
    logger.info(`unpublishAssets(ids=[${ids.length}])`)
    return await unpublishItems(ids, 'Asset')
}

const tagAsset = async (asset: AssetProps, tag: string) => {
    logger.info(`tagAsset(id=${asset.sys.id}, tag=${tag})`)
    asset.metadata = {
        tags: [{
            sys: {
                type: 'Link',
                linkType: 'Tag',
                id: tag
            }
        }]
    }
    const updatedAsset = await client.asset.update(
        {
            assetId: asset.sys.id
        },
        asset
    )
    logger.info(`updated ${updatedAsset.sys.id}`)
    return updatedAsset
}

const unpublishItems = async (items: string[], type: 'Entry' | 'Asset') => {
    logger.info(`unpublishItems(items=[${items.length}], type=${type})`)
    if (items.length === 0) return
    items.forEach(id => logger.info(`unpublish ${id}`))
    const payload: BulkActionUnpublishPayload = {
        entities: {
            sys: {
                type: 'Array'
            },
            items: items.map(id => ({
                sys: {
                    type: 'Link',
                    linkType:
                    type, id
                }
            }))
        }
    }
    return await client.bulkAction.unpublish({ spaceId: SPACE_ID, environmentId: 'master' }, payload)
}

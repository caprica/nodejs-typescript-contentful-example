import { faker } from '@faker-js/faker'
import { AssetProps, EntryProps } from 'contentful-management'
import { kebabCase, snakeCase } from 'lodash'
import { createEntry, createAssetFromPicsum, publishItems, ItemArray, processAssets } from '../contentful'
import { logger } from '../log'

// Note that both Faker and Picsum can accept a seed value if it is necessary
// to generate consistent results each time the process is executed

// An interface for an object that holds both created assets and entries
interface Items {
    assets: AssetProps[]
    entries: EntryProps[]
}

// Set the locale for Faker, so we get e.g. UK postcodes rather then US zipcodes
faker.locale = 'en_GB'

/**
 * Create new test data, identified by a system tag.
 *
 * @param options pased command-line options
 */
export const setupCommand = async (options: any) => {
    logger.info('setup')
    // Use this to tag all generated items
    const tag = options.tag
    // Work with data in this locale
    const locale = options.locale
    // Collect all created items
    const allCreatedItems: Items = {
        assets: [],
        entries: []
    }
    for (var i = 0; i < 10; i++) {
        const createdItems = await createTestEntry(locale, tag)
        allCreatedItems.assets.push.apply(allCreatedItems.assets, createdItems.assets)
        allCreatedItems.entries.push.apply(allCreatedItems.entries, createdItems.entries)
    }
    // Assets must be fully processed before they can be published, so wait for
    // them all to be ready
    const allProcessedAssets = await processAssets(allCreatedItems.assets)
    // Everything is now ready to be published in one go
    const toPublish = [...allCreatedItems.entries, ...allProcessedAssets]
    await publishItems(toPublish)
    logger.info('setup finished')
}

const createTestEntry = async (locale: string, tag: string): Promise<Items> => {
    const name = faker.company.name()

    const imageProps = {
        title: `${name} featured image`,
        description: `Main image for ${name}.`,
        contentType: 'image/jpeg',
        fileName: snakeCase(name) + '.jpg'
    }
    const imageAsset = await createAssetFromPicsum(imageProps, 400, 225, locale, tag)
    logger.info(`created asset ${imageAsset.sys.id}`)

    const addressProps = {
        houseNumberAndStreet: { [locale]: faker.address.streetAddress() },
        town: { [locale]: faker.address.city() },
        county: { [locale]: faker.address.county() },
        postcode: { [locale]: faker.address.zipCode() }
    }
    const addressEntry = await createEntry('address', addressProps, tag);
    logger.info(`created address entry ${addressEntry.sys.id}`)

    const articleProps = {
        name: { [locale]: name },
        address: { [locale]: { sys: { type: 'Link', linkType: 'Entry', id: addressEntry.sys.id }} },
        mainImage: { [locale]: { sys: { type: 'Link', linkType: 'Asset', id: imageAsset.sys.id }} },
        slug: { [locale]: kebabCase(name) }
    }
    const articleEntry = await createEntry('article', articleProps, tag)
    logger.info(`created article entry ${articleEntry.sys.id}`)

    return {
        assets: [imageAsset],
        entries: [addressEntry, articleEntry]
    }
}

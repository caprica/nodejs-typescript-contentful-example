import { deleteAssets, deleteEntries, findTaggedAssets, findTaggedEntries, unpublishAssets, unpublishEntries } from '../contentful'
import { logger } from '../log'

/**
 * Teardown previously created test data, identified by a system tag.
 *
 * @param options pased command-line options
 */
export const teardownCommand = async (options: any) => {
    logger.info('teardown')
    const tag = options.tag
    const generatedEntries = await findTaggedEntries(tag)
    const generatedAssets = await findTaggedAssets(tag)
    await unpublishEntries(generatedEntries)
    await unpublishAssets(generatedAssets)
    await deleteEntries(generatedEntries)
    await deleteAssets(generatedAssets)
    logger.info('teardown finished')
}

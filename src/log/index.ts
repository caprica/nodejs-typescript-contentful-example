/*
 * Module for logging.
 */
import winston from 'winston'

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'cfdata.log' })
    ],
})

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
        level: 'debug'
    }))
}

export { logger }

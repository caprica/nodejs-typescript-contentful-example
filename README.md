# NodeJS with Typescript example for Contentful

This is a bare-bones project showing how to write a simple NodeJS application
using Typescript and Visual Studio Code, and access the Contentful Content
Management (CMA) API.

See https://github.com/caprica/nodejs-typescript-example for a vanilla project.

## Contentful features

This project shows:

 - Contentful 'plain' Javascript SDK API
 - creation of assets (images) and entries
 - fields in the content model that link to other entries
 - teardown of previously created test data
 - bulk operations

## Other features

 - FakerJS for generating text content
 - Picsum for generating image content
 - Winston for logging

## Notes

### FakerJS

Faker's wordlists do contain some words that may not be appropriate in a formal
business setting and therefore consideration should be given to implementing
word filters.

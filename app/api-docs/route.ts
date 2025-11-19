import { ApiReference } from '@scalar/nextjs-api-reference'

const config = {
    url: '/swagger.json',
    theme: 'kepler',

}

// @ts-ignore
export const GET = ApiReference(config)
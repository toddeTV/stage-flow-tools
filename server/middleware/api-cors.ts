import { handleApiCors } from '../utils/api-cors'

export default defineEventHandler((event) => {
  if (handleApiCors(event, useRuntimeConfig(event))) {
    return
  }
})

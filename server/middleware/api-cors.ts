export default defineEventHandler((event) => {
  if (handleApiCors(event, useRuntimeConfig(event))) {
    return
  }
})

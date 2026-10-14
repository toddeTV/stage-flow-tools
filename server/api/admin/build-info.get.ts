import { setHeader } from 'h3'
import { getBuildCommitSha } from '../../utils/build-info'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  return { commitSha: getBuildCommitSha() }
})

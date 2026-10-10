import { PresenterParentOriginsSchema } from '#shared/utils/validation';

export default defineApiHandler(async (event) => {
  await verifyAdmin(event);
  const allowedOrigins = parseValidatedValue<string[]>(
    useRuntimeConfig(event).presenterParentOrigins,
    PresenterParentOriginsSchema,
  );
  return { allowedOrigins };
});

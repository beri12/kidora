import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Usage:
//   @CurrentUser() user            -> whole { id, email, role, name } object
//   @CurrentUser('id') teacherId   -> just the id field
export const CurrentUser = createParamDecorator((field: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  return field ? user?.[field] : user;
});
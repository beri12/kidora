import { ForbiddenException } from '@nestjs/common';
import { SchoolAccessGuard } from './school-access.guard';

const ctxFor = (req: any) => ({ switchToHttp: () => ({ getRequest: () => req }) }) as any;

describe('SchoolAccessGuard', () => {
  it('attaches the server-resolved tenant to the request', async () => {
    const tenants: any = { resolve: jest.fn().mockResolvedValue({ schoolId: 'school-a' }) };
    const guard = new SchoolAccessGuard(tenants);
    const req: any = { user: { id: 'u1' }, body: { schoolId: 'school-b' } };

    await expect(guard.canActivate(ctxFor(req))).resolves.toBe(true);
    // The forged body value is ignored; the tenant comes from the database.
    expect(req.tenant).toEqual({ schoolId: 'school-a' });
    expect(tenants.resolve).toHaveBeenCalledWith('u1');
  });

  it('rejects an unauthenticated request', async () => {
    const guard = new SchoolAccessGuard({ resolve: jest.fn() } as any);
    await expect(guard.canActivate(ctxFor({}))).rejects.toBeInstanceOf(ForbiddenException);
  });
});

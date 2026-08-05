import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateAvatarDto } from './dto/avatar.dto';

@Injectable()
export class AvatarService {
  constructor(private prisma: PrismaService) {}

  // Get (or lazily create) the user's avatar config.
  async get(userId: string) {
    let avatar = await this.prisma.avatar.findUnique({ where: { userId } });
    if (!avatar) avatar = await this.prisma.avatar.create({ data: { userId } });
    return avatar;
  }

  async update(userId: string, dto: UpdateAvatarDto) {
    await this.get(userId);
    return this.prisma.avatar.update({ where: { userId }, data: dto });
  }

  // Catalog of purchasable/equippable items, optionally filtered by category.
  listItems(category?: string) {
    return this.prisma.avatarItem.findMany({ where: category ? { category } : {}, orderBy: { price: 'asc' } });
  }

  // The user's owned items (inventory), with the item details joined.
  inventory(userId: string) {
    return this.prisma.inventory.findMany({ where: { userId }, include: { item: true } });
  }

  // Equip / unequip an owned item (one equipped per category).
  async equip(userId: string, itemId: string, equipped: boolean) {
    const inv = await this.prisma.inventory.findUnique({ where: { userId_itemId: { userId, itemId } }, include: { item: true } });
    if (!inv) return null;
    if (equipped) {
      const sameCat = await this.prisma.inventory.findMany({ where: { userId, item: { category: inv.item.category } } });
      await Promise.all(sameCat.map((i) => this.prisma.inventory.update({ where: { id: i.id }, data: { equipped: false } })));
    }
    return this.prisma.inventory.update({ where: { id: inv.id }, data: { equipped }, include: { item: true } });
  }
}

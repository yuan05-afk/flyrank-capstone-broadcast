import { prisma } from "@/lib/db";

export const campaignsRepository = {
  create(data: { title: string; body: string; url: string }) {
    return prisma.campaign.create({ data });
  },
  findById(id: string) {
    return prisma.campaign.findUnique({
      where: { id },
      include: { posts: true, jobs: true },
    });
  },
  list() {
    return prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { posts: true },
    });
  },
  remove(id: string) {
    return prisma.campaign.delete({ where: { id } });
  },
};

export const socialPostsRepository = {
  createMany(
    rows: Array<{
      campaignId: string;
      platform: string;
      caption: string;
      imagePath: string;
      idempotencyKey: string;
      status?: string;
    }>
  ) {
    return prisma.socialPost.createMany({ data: rows });
  },
  findByCampaign(campaignId: string) {
    return prisma.socialPost.findMany({ where: { campaignId } });
  },
  findById(id: string) {
    return prisma.socialPost.findUnique({ where: { id } });
  },
  findByIdempotencyKey(key: string) {
    return prisma.socialPost.findUnique({ where: { idempotencyKey: key } });
  },
  update(
    id: string,
    data: Partial<{
      status: string;
      externalPostId: string | null;
      scheduledFor: Date | null;
      lastError: string | null;
      publishedAt: Date | null;
    }>
  ) {
    return prisma.socialPost.update({ where: { id }, data });
  },
};

export const credentialsRepository = {
  upsertEncrypted(platform: string, encryptedToken: string, iv: string) {
    return prisma.platformCredential.upsert({
      where: { platform },
      create: { platform, encryptedToken, iv },
      update: { encryptedToken, iv },
    });
  },
  find(platform: string) {
    return prisma.platformCredential.findUnique({ where: { platform } });
  },
};

export const jobsRepository = {
  enqueue(data: {
    campaignId: string;
    socialPostId: string;
    type: string;
    runAt: Date;
  }) {
    return prisma.job.create({ data });
  },
  async claimDue(now = new Date()) {
    const due = await prisma.job.findFirst({
      where: {
        doneAt: null,
        runAt: { lte: now },
        OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(now.getTime() - 60_000) } }],
      },
      orderBy: { runAt: "asc" },
    });
    if (!due) return null;
    return prisma.job.update({
      where: { id: due.id },
      data: { lockedAt: now, attempts: { increment: 1 } },
    });
  },
  markDone(id: string) {
    return prisma.job.update({
      where: { id },
      data: { doneAt: new Date(), lastError: null },
    });
  },
  markError(id: string, lastError: string) {
    return prisma.job.update({
      where: { id },
      data: { lockedAt: null, lastError },
    });
  },
};

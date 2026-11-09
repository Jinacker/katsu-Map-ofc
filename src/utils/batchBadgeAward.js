export const hasAwardBadge = (response, badgeId) => {
  const data = response?.data?.data ?? response?.data;
  return (data?.badges || []).some((item) => item.badgeId === badgeId && item.badge?.type === 'AWARD');
};

// Check immediately before each write: the existing award endpoint updates an
// owned badge's public reason, so it must not be used as an ownership check.
export async function awardSelectedUsers({ users, badgeId, reason, getUserBadges, awardBadge }) {
  const awarded = [];
  const skipped = [];
  const failed = [];
  const seen = new Set();
  for (const user of users) {
    if (seen.has(user.id)) continue;
    seen.add(user.id);
    if (user.ownsBadge) {
      skipped.push(user);
      continue;
    }
    try {
      const inventory = await getUserBadges(user.id);
      if (hasAwardBadge(inventory, badgeId)) {
        skipped.push(user);
        continue;
      }
      await awardBadge(badgeId, user.id, reason);
      awarded.push(user);
    } catch (error) {
      failed.push({ user, error });
    }
  }
  return { awarded, skipped, failed };
}

// Keep tier and page-based definitions distinct for the 0.71 client.
function prepareShared(data, now = Date.now()) {
  const passes = data.BattlePasses || (data.BattlePasses = []);
  const rotations = data.BattlePassRotation || (data.BattlePassRotation = []);
  const definitions = [...passes, ...(data.BattlePassesV3 || [])];
  const active = rotations.find(r => Date.parse(r.StartDate) <= now && now < Date.parse(r.EndDate) && definitions.some(p => p.PassID === r.PassID));
  if (active) return active;
  // Keep the local server's existing pass ID and legacy cosmetics after the
  // bundled production schedule expires. Dates are stable across restarts.
  const passID = Number(process.env.BATTLE_PASS_ID || 72);
  if (!passes.some(p => p.PassID === passID)) {
    if (!data.BattlePass?.Tiers) throw new Error('Battle pass tiers are missing');
    passes.push({ ...data.BattlePass, PassID: passID, Title: 'STUMBLE_PASS', ThemeName: '', ShopOfferID: 'battle_pass_offer' });
  }
  const rotation = { DateID: passID, PassID: passID, StartDate: '2020-01-01T00:00:00Z', EndDate: '2036-01-01T00:00:00Z', Platforms: ['steam', 'web', 'android', 'ios'] };
  rotations.push(rotation);
  return rotation;
}

function stateFor(user, rotation) {
  const old = user.battlePass || {};
  const same = old.passID === rotation.PassID || old.passID == null;
  return {
    ...old,
    passID: rotation.PassID,
    passDateId: rotation.DateID,
    secondsToEnd: Math.max(0, Math.floor((Date.parse(rotation.EndDate) - Date.now()) / 1000)),
    hasPurchased: same && !!(old.hasPurchased ?? user.hasBattlePass),
    passTokens: same ? Number(old.passTokens ?? user.passTokens ?? 0) : 0,
    freePassRewards: same ? (old.freePassRewards || user.freePassRewards || []) : [],
    premiumPassRewards: same ? (old.premiumPassRewards || user.premiumPassRewards || []) : [],
    slotsClaimed: same ? (old.slotsClaimed || []) : [],
    experience: same ? Number(old.experience || 0) : 0,
    coins: same ? Number(old.coins || 0) : 0
  };
}

function clientState(state) {
  return { PassID: state.passID, PassTokens: state.passTokens, HasPurchased: state.hasPurchased, FreePassRewards: state.freePassRewards, PremiumPassRewards: state.premiumPassRewards, SecondsToEnd: state.secondsToEnd, Experience: state.experience, Coins: state.coins, SlotsClaimed: state.slotsClaimed, PassDateId: state.passDateId };
}

function grant(user, rewards, shared) {
  for (const reward of rewards) {
    const type = reward.Type || reward.RewardType;
    const amount = Number(reward.Amount || 1);
    let item = reward.TypeInfo;
    if (type === 'CURRENCY') {
      let balance = user.balances.find(b => b.name === item);
      if (!balance) user.balances.push(balance = { name: item, amount: 0 });
      balance.amount += amount;
      continue;
    }
    const field = { SKIN: 'skins', EMOTE: 'emotes', ANIMATION: 'animations', FOOTSTEPS: 'footsteps', ACTION_EMOTE: 'actionEmotes' }[type];
    if (type === 'LOOTBOX') {
      user.inventory ||= [];
      let entry = user.inventory.find(i => i.itemType === type && i.item === item);
      if (!entry) user.inventory.push(entry = { userId: user.id, itemType: type, item, amount: 0 });
      entry.amount += amount;
      continue;
    }
    if (!field) throw new Error(`Unsupported battle pass reward: ${type}`);
    user[field] ||= [];
    for (let i = 0; i < amount; i++) {
      if (item === 'random' && type === 'SKIN') {
        const candidates = (shared.Skins_v4 || []).map(s => s.SkinID).filter(id => id && !user.skins.includes(id));
        if (!candidates.length) throw new Error('No available skin reward');
        item = candidates[Math.floor(Math.random() * candidates.length)];
      }
      if (!user[field].includes(item)) user[field].push(item);
      if (reward.TypeInfo === 'random') item = 'random';
    }
  }
}

module.exports = { prepareShared, stateFor, clientState, grant };

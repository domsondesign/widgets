const CrystalMiningWidget = {
  settings: {},
  minerDb: null,
  storageKey: '',
  channelId: '',
  channelName: '',
  saveInProgress: false,
  pendingSave: false,
  saveTimer: null,
  animationQueue: [],
  isAnimating: false,
  animationTimers: [],
  leaderboardRenderTimer: null,
  leaderboardPopupTimer: null,
  profileCloseTimer: null,
  ready: false,
  eventBacklog: [],
  avatarCache: {},
  eventTimer: null,
  eventEndTimer: null,
  activeEvent: null,
  activeEventEndsAt: 0,

  defaults: {
    cooldown: 30,
    stoneChance: 55,
    ironChance: 25,
    goldChance: 13,
    diamondChance: 6,
    mythrilChance: 1,
    stoneName: 'Stone',
    ironName: 'Iron',
    goldName: 'Gold',
    diamondName: 'Diamond',
    mythrilName: 'Mythril',
    scale: 100,
    backgroundColor: '#fff7fa',
    backgroundOpacity: 94,
    borderColor: '#f2c9d6',
    borderWidth: 1,
    borderRadius: 20,
    textColor: '#4f3f46',
    usernameColor: '#b86b83',
    oreNameColor: '#8f6f7f',
    position: 'top-right',
    mineCommand: '!mine',
    minerCommand: '!miner',
    topMinersCommand: '!topminers',
    resetMinerCommand: '!resetminer',
    resetAllMinersCommand: '!resetallminers',
    mineOnCommand: '!mineon',
    mineOffCommand: '!mineoff',
    miningText: 'Mining...',
    resultText: '{user} mined',
    miningEnabled: true,
    enableLeaderboard: false,
    permanentLeaderboard: false,
    leaderboardSize: 100,
    leaderboardAmount: 5,
    leaderboardTitle: 'Top Miners',
    leaderboardEmptyText: 'No miners yet',
    leaderboardPopupDuration: 6000,
    animationDuration: 3200,
    maxSavedMiners: 1000,
    showTwitchAvatar: false,
    enableEvents: false,
    eventInterval: 30,
    eventDuration: 300,
    enableEventNotifications: true,
    crystalRushMessage: '✨ Crystal Rush\nDiamond chance increased!',
    mythrilSurgeMessage: '✨ Mythril Surge\nMythril chance increased!',
    luckyMiningMessage: '✨ Lucky Mining\nBetter ores are more likely!',
    eventEndedMessage: '{event}\nEnded'
  },

  assets: {
    pickaxe: 'https://github.com/domsondesign/widgets/blob/main/Mining/pickaxe.png?raw=true',
    stone: 'https://github.com/domsondesign/widgets/blob/main/Mining/stone.png?raw=true',
    iron: 'https://github.com/domsondesign/widgets/blob/main/Mining/iron.png?raw=true',
    gold: 'https://github.com/domsondesign/widgets/blob/main/Mining/gold.png?raw=true',
    diamond: 'https://github.com/domsondesign/widgets/blob/main/Mining/diamond.png?raw=true',
    mythril: 'https://github.com/domsondesign/widgets/blob/main/Mining/mythril.png?raw=true',
    dust: 'https://github.com/domsondesign/widgets/blob/main/Mining/dust%20puff.png?raw=true',
    sparkle: 'https://github.com/domsondesign/widgets/blob/main/Mining/magical%20sparkle.png?raw=true',
    trophy: 'https://github.com/domsondesign/widgets/blob/main/Mining/trophy.png?raw=true'
  },

  oreRanks: {
    stone: 1,
    iron: 2,
    gold: 3,
    diamond: 4,
    mythril: 5
  },

  elements: {},

  async init(eventData) {
    const detail = eventData && eventData.detail ? eventData.detail : {};
    const fieldData = detail.fieldData || {};

    this.settings = this.loadSettings(fieldData);
    this.channelId = this.getChannelId(detail);
    this.channelName = this.getChannelName(detail);
    this.storageKey = this.buildStorageKey();

    this.cacheElements();
    this.applyBaseUiSettings();
    this.applyAssets();
    this.resetNotification();
    await this.loadStorage();
    this.ready = true;
    this.renderPermanentLeaderboard();
    this.startEventSchedule();
    this.processPendingChatEvents();
  },

  cacheElements() {
    this.elements.root = document.getElementById('crystal-mining-widget');
    this.elements.notification = document.getElementById('mining-notification');
    this.elements.pickaxeImage = document.getElementById('pickaxe-image');
    this.elements.impactEffect = document.getElementById('impact-effect');
    this.elements.sparkleEffect = document.getElementById('sparkle-effect');
    this.elements.miningText = document.getElementById('mining-text');
    this.elements.userAvatar = document.getElementById('user-avatar');
    this.elements.usernameText = document.getElementById('username-text');
    this.elements.oreDisplay = document.getElementById('ore-display');
    this.elements.oreIcon = document.getElementById('ore-icon');
    this.elements.oreName = document.getElementById('ore-name');
    
    this.elements.leaderboardContainer = document.getElementById('leaderboard-container');
    this.elements.leaderboardTitle = document.getElementById('leaderboard-title');
    this.elements.leaderboardList = document.getElementById('leaderboard-list');
    this.elements.leaderboardTrophy = document.getElementById('leaderboard-trophy');
    
    this.elements.leaderboardPopup = document.getElementById('leaderboard-popup');
    this.elements.leaderboardPopupTitle = document.getElementById('leaderboard-popup-title');
    this.elements.leaderboardPopupList = document.getElementById('leaderboard-popup-list');
    this.elements.leaderboardPopupTrophy = document.getElementById('leaderboard-popup-trophy');
    
    this.elements.minerProfile = document.getElementById('miner-profile');
    this.elements.profileAvatar = document.getElementById('profile-avatar');
    this.elements.profileUsername = document.getElementById('profile-username');
    this.elements.statStoneValue = document.getElementById('stat-stone-value');
    this.elements.statIronValue = document.getElementById('stat-iron-value');
    this.elements.statGoldValue = document.getElementById('stat-gold-value');
    this.elements.statDiamondValue = document.getElementById('stat-diamond-value');
    this.elements.statMythrilValue = document.getElementById('stat-mythril-value');
    this.elements.profileTotalMined = document.getElementById('profile-total-mined');
    this.elements.profileBestOre = document.getElementById('profile-best-ore');
  },

  loadSettings(fieldData) {
    return {
      cooldown: this.clamp(this.toNumber(fieldData.cooldown, this.defaults.cooldown), 0, 3600),
      stoneChance: this.clamp(this.toNumber(fieldData.stoneChance, this.defaults.stoneChance), 0, 100),
      ironChance: this.clamp(this.toNumber(fieldData.ironChance, this.defaults.ironChance), 0, 100),
      goldChance: this.clamp(this.toNumber(fieldData.goldChance, this.defaults.goldChance), 0, 100),
      diamondChance: this.clamp(this.toNumber(fieldData.diamondChance, this.defaults.diamondChance), 0, 100),
      mythrilChance: this.clamp(this.toNumber(fieldData.mythrilChance, this.defaults.mythrilChance), 0, 100),
      stoneName: fieldData.stoneName || this.defaults.stoneName,
      ironName: fieldData.ironName || this.defaults.ironName,
      goldName: fieldData.goldName || this.defaults.goldName,
      diamondName: fieldData.diamondName || this.defaults.diamondName,
      mythrilName: fieldData.mythrilName || this.defaults.mythrilName,
      scale: this.clamp(this.toNumber(fieldData.scale, this.defaults.scale), 1, 100),
      backgroundColor: fieldData.backgroundColor || this.defaults.backgroundColor,
      backgroundOpacity: this.clamp(this.toNumber(fieldData.backgroundOpacity, this.defaults.backgroundOpacity), 0, 100),
      borderColor: fieldData.borderColor || this.defaults.borderColor,
      borderWidth: this.clamp(this.toNumber(fieldData.borderWidth, this.defaults.borderWidth), 0, 24),
      borderRadius: this.clamp(this.toNumber(fieldData.borderRadius, this.defaults.borderRadius), 0, 80),
      textColor: fieldData.textColor || this.defaults.textColor,
      usernameColor: fieldData.usernameColor || this.defaults.usernameColor,
      oreNameColor: fieldData.oreNameColor || this.defaults.oreNameColor,
      position: fieldData.position || this.defaults.position,
      miningText: fieldData.miningText || this.defaults.miningText,
      resultText: fieldData.resultText || this.defaults.resultText,
      miningEnabled: this.toBoolean(fieldData.miningEnabled, this.defaults.miningEnabled),
      enableLeaderboard: this.toBoolean(fieldData.enableLeaderboard, this.defaults.enableLeaderboard),
      permanentLeaderboard: this.toBoolean(fieldData.permanentLeaderboard, this.defaults.permanentLeaderboard),
      leaderboardSize: this.clamp(this.toNumber(fieldData.leaderboardSize, this.defaults.leaderboardSize), 60, 150),
      leaderboardAmount: this.clamp(this.toNumber(fieldData.leaderboardAmount || fieldData.playersShown, this.defaults.leaderboardAmount), 1, 20),
      leaderboardTitle: fieldData.leaderboardTitle || this.defaults.leaderboardTitle,
      leaderboardEmptyText: fieldData.leaderboardEmptyText || this.defaults.leaderboardEmptyText,
      leaderboardPopupDuration: this.clamp(this.toNumber(fieldData.leaderboardPopupDuration, this.defaults.leaderboardPopupDuration), 1000, 30000),
      animationDuration: this.clamp(this.toNumber(fieldData.animationDuration || fieldData.notificationDuration, this.defaults.animationDuration), 2200, 10000),
      maxSavedMiners: this.clamp(this.toNumber(fieldData.maxSavedMiners, this.defaults.maxSavedMiners), 50, 5000),
      pickaxeUrl: fieldData.pickaxeUrl || this.assets.pickaxe,
      stoneUrl: fieldData.stoneUrl || this.assets.stone,
      ironUrl: fieldData.ironUrl || this.assets.iron,
      goldUrl: fieldData.goldUrl || this.assets.gold,
      diamondUrl: fieldData.diamondUrl || this.assets.diamond,
      mythrilUrl: fieldData.mythrilUrl || this.assets.mythril,
      dustUrl: fieldData.dustUrl || this.assets.dust,
      sparkleUrl: fieldData.sparkleUrl || this.assets.sparkle,
      trophyUrl: fieldData.trophyUrl || this.assets.trophy,
      mineCommand: this.normalizeCommand(fieldData.mineCommand || this.defaults.mineCommand),
      minerCommand: this.normalizeCommand(fieldData.minerCommand || this.defaults.minerCommand),
      topMinersCommand: this.normalizeCommand(fieldData.topMinersCommand || this.defaults.topMinersCommand),
      resetMinerCommand: this.normalizeCommand(fieldData.resetMinerCommand || this.defaults.resetMinerCommand),
      resetAllMinersCommand: this.normalizeCommand(fieldData.resetAllMinersCommand || this.defaults.resetAllMinersCommand),
      mineOnCommand: this.normalizeCommand(fieldData.mineOnCommand || this.defaults.mineOnCommand),
      mineOffCommand: this.normalizeCommand(fieldData.mineOffCommand || this.defaults.mineOffCommand),
      showTwitchAvatar: this.toBoolean(fieldData.showTwitchAvatar, this.defaults.showTwitchAvatar),
      enableEvents: this.toBoolean(fieldData.enableEvents, this.defaults.enableEvents),
      eventInterval: this.clamp(this.toNumber(fieldData.eventInterval, this.defaults.eventInterval), 15, 1440),
      eventDuration: this.clamp(this.toNumber(fieldData.eventDuration, this.defaults.eventDuration), 60, 3600),
      enableEventNotifications: this.toBoolean(fieldData.enableEventNotifications, this.defaults.enableEventNotifications),
      crystalRushMessage: fieldData.crystalRushMessage || this.defaults.crystalRushMessage,
      mythrilSurgeMessage: fieldData.mythrilSurgeMessage || this.defaults.mythrilSurgeMessage,
      luckyMiningMessage: fieldData.luckyMiningMessage || this.defaults.luckyMiningMessage,
      eventEndedMessage: fieldData.eventEndedMessage || this.defaults.eventEndedMessage
    };
  },

  normalizeCommand(command) {
    const value = String(command || '').trim().toLowerCase();
    return value.charAt(0) === '!' ? value : `!${value}`;
  },

  getChannelId(detail) {
    if (detail.channel && detail.channel.id) return String(detail.channel.id);
    if (detail.channel && detail.channel._id) return String(detail.channel._id);
    if (detail.providerId) return String(detail.providerId);
    if (detail.account && detail.account.id) return String(detail.account.id);
    if (detail.account && detail.account._id) return String(detail.account._id);
    return this.getChannelName(detail) || 'unknown-channel';
  },

  getChannelName(detail) {
    if (detail.channel && detail.channel.username) return String(detail.channel.username);
    if (detail.channel && detail.channel.name) return String(detail.channel.name);
    if (detail.channel && detail.channel.displayName) return String(detail.channel.displayName);
    if (detail.account && detail.account.username) return String(detail.account.username);
    return 'unknown';
  },

  buildStorageKey() {
    return `crystalMining:v1:${this.safeKey(this.channelId || this.channelName || 'unknown-channel')}:miners`;
  },

  async loadStorage() {
    if (!window.SE_API || typeof SE_API.get !== 'function') {
      this.minerDb = this.createEmptyDb();
      return;
    }

    try {
      const storedData = await SE_API.get(this.storageKey);
      this.minerDb = this.normalizeStoredDb(storedData);
    } catch (error) {
      this.minerDb = this.createEmptyDb();
    }
  },

  createEmptyDb() {
    return {
      version: 1,
      channelId: this.channelId,
      channelName: this.channelName,
      users: {}
    };
  },

  normalizeStoredDb(storedData) {
    if (typeof storedData === 'string') {
      try {
        storedData = JSON.parse(storedData);
      } catch (error) {
        storedData = null;
      }
    }

    if (!storedData || typeof storedData !== 'object') {
      return this.createEmptyDb();
    }

    const db = this.createEmptyDb();
    const users = storedData.users && typeof storedData.users === 'object' ? storedData.users : {};

    Object.keys(users).forEach((key) => {
      const profile = users[key];
      if (!profile || typeof profile !== 'object') return;
      const username = String(profile.username || key).trim();
      if (!username) return;
      db.users[this.getUserKey(username)] = this.normalizeProfile(profile, username);
    });

    return db;
  },

  handleEventReceived(eventData) {
    const detail = eventData && eventData.detail ? eventData.detail : {};
    const listener = detail.listener;
    const event = detail.event;

    if (!this.isChatMessageEvent(listener, event)) return;

    const chatMessage = this.extractChatMessage(event);
    if (!chatMessage.text || !chatMessage.username || chatMessage.isBot) return;

    if (!this.ready) {
      this.eventBacklog.push(chatMessage);
      return;
    }

    this.handleChatMessage(chatMessage);
  },

  processPendingChatEvents() {
    if (!this.eventBacklog.length) return;

    const pendingEvents = this.eventBacklog.splice(0, this.eventBacklog.length);
    pendingEvents.forEach((chatMessage) => {
      if (chatMessage && chatMessage.text && chatMessage.username) {
        this.handleChatMessage(chatMessage);
      }
    });
  },

  isChatMessageEvent(listener, event) {
    if (!event || typeof event !== 'object') return false;

    if (listener === 'message' || listener === 'chat-message') return true;

    const data = event.data && typeof event.data === 'object' ? event.data : null;
    if (!data || typeof data.text !== 'string') return false;

    return Boolean(data.displayName || data.nick || data.username || data.name);
  },

  extractChatMessage(event) {
    const data = event && event.data ? event.data : {};
    const text = data.text || event.text || '';
    const username = data.displayName || data.nick || data.username || data.name || event.displayName || event.nick || event.username || event.name || '';
    const badges = data.badges || event.badges || {};
    const isBot = Boolean(data.isBot || event.isBot || badges.bot);

    return {
      text: String(text).trim(),
      textLower: String(text).trim().toLowerCase(),
      username: String(username).trim(),
      isBot: isBot,
      badges: badges,
      avatar: this.getCachedAvatar(username, event),
      raw: event
    };
  },

  handleChatMessage(chatMessage) {
    if (chatMessage.textLower === this.settings.mineCommand) {
      this.handleMineCommand(chatMessage);
      return;
    }

    if (chatMessage.textLower === this.settings.minerCommand) {
      this.handleMinerCommand(chatMessage);
      return;
    }

    if (chatMessage.textLower === this.settings.topMinersCommand) {
      this.showLeaderboardPopup();
      return;
    }

    if (chatMessage.textLower.indexOf(`${this.settings.resetMinerCommand} `) === 0) {
      this.handleResetMinerCommand(chatMessage);
      return;
    }

    if (chatMessage.textLower === this.settings.resetAllMinersCommand) {
      this.handleResetAllMinersCommand(chatMessage);
      return;
    }

    if (chatMessage.textLower === this.settings.mineOnCommand) {
      this.handleMineToggleCommand(chatMessage, true);
      return;
    }

    if (chatMessage.textLower === this.settings.mineOffCommand) {
      this.handleMineToggleCommand(chatMessage, false);
    }
  },

  handleMineCommand(chatMessage) {
    if (!this.settings.miningEnabled) return;

    if (!this.ready && !this.minerDb) {
      this.minerDb = this.createEmptyDb();
    }

    const profile = this.getOrCreateProfile(chatMessage.username);
    if (this.isOnCooldown(profile)) return;

    const ore = this.rollOre();
    this.updateProfileWithOre(profile, ore);
    this.pruneMinersIfNeeded();
    this.scheduleSave();
    this.scheduleLeaderboardRender();
    this.enqueueNotification({ type: 'mine', username: profile.username, avatar: chatMessage.avatar, ore: ore, timestamp: Date.now() });
  },

  handleMinerCommand(chatMessage) {
    const profile = this.getProfile(chatMessage.username);
    if (!profile) return;
    this.showMinerProfile(profile, chatMessage.avatar);
  },

  handleResetMinerCommand(chatMessage) {
    if (!this.hasModeratorPermission(chatMessage)) return;
    const username = chatMessage.text.split(/\s+/).slice(1).join(' ').trim();
    if (!username || !this.minerDb || !this.minerDb.users) return;

    delete this.minerDb.users[this.getUserKey(username)];
    this.scheduleSave();
    this.scheduleLeaderboardRender();
  },

  handleResetAllMinersCommand(chatMessage) {
    if (!this.hasModeratorPermission(chatMessage)) return;

    this.minerDb = this.createEmptyDb();
    this.scheduleSave();
    this.scheduleLeaderboardRender();
  },

  handleMineToggleCommand(chatMessage, enabled) {
    if (!this.hasBroadcasterPermission(chatMessage)) return;
    this.settings.miningEnabled = enabled;
  },

  isOnCooldown(profile) {
    const cooldownMs = Math.max(0, this.settings.cooldown) * 1000;
    const lastMiningTime = this.toNumber(profile.lastMiningTime, 0);
    return cooldownMs > 0 && Date.now() - lastMiningTime < cooldownMs;
  },

  enqueueNotification(notificationEvent) {
    this.animationQueue.push(notificationEvent);
    this.processAnimationQueue();
  },

  processAnimationQueue() {
    if (this.isAnimating) return;
    const nextEvent = this.animationQueue.shift();
    if (nextEvent) this.playNotification(nextEvent);
  },

  playNotification(notificationEvent) {
    if (notificationEvent.type === 'mine') {
      this.playMiningAnimation(notificationEvent);
      return;
    }

    this.showCardPopup(notificationEvent);
  },

  playMiningAnimation(miningEvent) {
    const notification = this.elements.notification;
    if (!notification) {
      this.processAnimationQueue();
      return;
    }

    this.isAnimating = true;
    this.clearAnimationTimers();
    this.resetNotification();
    this.populateNotification(miningEvent);

    notification.classList.add('is-active', 'is-mining');

    this.animationTimers.push(setTimeout(() => {
      notification.classList.remove('is-mining');
      notification.classList.add('show-result');
    }, 1250));

    this.animationTimers.push(setTimeout(() => {
      notification.classList.add('is-exiting');
    }, Math.max(1800, this.settings.animationDuration - 350)));

    this.animationTimers.push(setTimeout(() => {
      this.finishMiningAnimation();
    }, Math.max(2200, this.settings.animationDuration)));
  },

  populateNotification(miningEvent) {
    if (this.elements.miningText) this.elements.miningText.textContent = this.settings.miningText;
    if (this.elements.usernameText) this.elements.usernameText.textContent = miningEvent.username;
    if (this.elements.oreName) this.elements.oreName.textContent = this.getOreLabel(miningEvent.ore);

    if (this.elements.userAvatar) {
      this.elements.userAvatar.src = miningEvent.avatar || '';
      this.elements.userAvatar.style.display = miningEvent.avatar ? 'inline-block' : 'none';
    }

    if (this.elements.oreIcon) {
      this.elements.oreIcon.src = this.getOreImage(miningEvent.ore);
      this.elements.oreIcon.alt = miningEvent.ore;
      this.elements.oreIcon.style.display = 'block';
    }

    if (this.elements.sparkleEffect) {
      this.elements.sparkleEffect.style.display = this.isRareOre(miningEvent.ore) ? 'block' : 'none';
    }

    if (this.elements.oreDisplay) this.elements.oreDisplay.setAttribute('data-ore', miningEvent.ore);
    if (this.elements.notification) this.elements.notification.setAttribute('data-ore', miningEvent.ore);
  },

  finishMiningAnimation() {
    this.resetNotification();
    this.isAnimating = false;
    this.processAnimationQueue();
  },

  resetNotification() {
    const notification = this.elements.notification;
    if (!notification) return;

    notification.classList.remove('is-active', 'is-mining', 'show-result', 'is-exiting');
    notification.removeAttribute('data-ore');

    if (this.elements.usernameText) this.elements.usernameText.textContent = '';
    if (this.elements.oreName) this.elements.oreName.textContent = '';
    if (this.elements.oreDisplay) this.elements.oreDisplay.removeAttribute('data-ore');
    if (this.elements.oreIcon) {
      this.elements.oreIcon.removeAttribute('src');
      this.elements.oreIcon.style.display = 'none';
    }
    if (this.elements.userAvatar) {
      this.elements.userAvatar.removeAttribute('src');
      this.elements.userAvatar.style.display = 'none';
    }
    if (this.elements.sparkleEffect) this.elements.sparkleEffect.style.display = 'none';
  },

  clearAnimationTimers() {
    this.animationTimers.forEach((timerId) => clearTimeout(timerId));
    this.animationTimers = [];
  },

  getTopMiners() {
    if (!this.minerDb || !this.minerDb.users) return [];

    return Object.keys(this.minerDb.users)
      .map((key) => this.minerDb.users[key])
      .filter((profile) => profile && this.toNumber(profile.totalMined, 0) > 0)
      .sort((a, b) => {
        const totalDiff = this.toNumber(b.totalMined, 0) - this.toNumber(a.totalMined, 0);
        if (totalDiff !== 0) return totalDiff;
        return this.getOreRank(b.bestDiscovery) - this.getOreRank(a.bestDiscovery);
      })
      .slice(0, Math.max(1, this.settings.leaderboardAmount));
  },

  renderLeaderboardList(listElement, miners) {
    if (!listElement) return;

    const fragment = document.createDocumentFragment();
    listElement.textContent = '';

    if (!miners.length) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'leaderboard-item';
      emptyItem.textContent = this.settings.leaderboardEmptyText;
      fragment.appendChild(emptyItem);
    } else {
      miners.forEach((profile, index) => {
        const item = document.createElement('li');
        item.className = 'leaderboard-item';
        
        const medalDiv = document.createElement('span');
        medalDiv.className = 'leaderboard-item-medal';
        const medals = ['🥇', '🥈', '🥉'];
        medalDiv.textContent = medals[index] || `${index + 1}.`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'leaderboard-item-content';
        
        // Add avatar if showing
        if (this.settings.showTwitchAvatar && this.avatarCache[this.getUserKey(profile.username)]) {
          const avatar = document.createElement('img');
          avatar.className = 'leaderboard-item-avatar';
          avatar.src = this.avatarCache[this.getUserKey(profile.username)];
          avatar.alt = profile.username;
          contentDiv.appendChild(avatar);
        }
        
        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'leaderboard-item-username';
        usernameSpan.textContent = profile.username;
        
        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'leaderboard-item-score';
        scoreSpan.textContent = this.toNumber(profile.totalMined, 0);
        
        contentDiv.appendChild(usernameSpan);
        contentDiv.appendChild(scoreSpan);
        
        item.appendChild(medalDiv);
        item.appendChild(contentDiv);
        fragment.appendChild(item);
      });
    }

    listElement.appendChild(fragment);
  },

  renderPermanentLeaderboard() {
    const container = this.elements.leaderboardContainer;
    if (!container) return;

    if (!this.settings.enableLeaderboard || !this.settings.permanentLeaderboard) {
      container.classList.remove('is-visible');
      return;
    }

    if (this.elements.leaderboardTitle) this.elements.leaderboardTitle.textContent = this.settings.leaderboardTitle;
    this.renderLeaderboardList(this.elements.leaderboardList, this.getTopMiners());
    container.classList.add('is-visible');
  },

  scheduleLeaderboardRender() {
    if (!this.settings.enableLeaderboard) return;
    if (this.leaderboardRenderTimer) clearTimeout(this.leaderboardRenderTimer);
    this.leaderboardRenderTimer = setTimeout(() => this.renderPermanentLeaderboard(), 500);
  },

  showLeaderboardPopup() {
    this.enqueueNotification({ type: 'leaderboard', title: this.settings.leaderboardTitle, rows: this.getLeaderboardRows() });
  },

  getLeaderboardRows() {
    const miners = this.getTopMiners();
    if (!miners.length) return [this.settings.leaderboardEmptyText];

    const medals = ['🥇', '🥈', '🥉'];
    return miners.map((profile, index) => `${medals[index] || `${index + 1}.`} ${profile.username} · ${this.toNumber(profile.totalMined, 0)}`);
  },

  showMinerProfile(profile, avatar) {
    if (!profile) return;

    if (this.profileCloseTimer) clearTimeout(this.profileCloseTimer);
    if (this.isAnimating) {
      this.profileCloseTimer = setTimeout(() => this.showMinerProfile(profile, avatar), 500);
      return;
    }

    this.isAnimating = true;
    
    const profileElement = this.elements.minerProfile;
    if (!profileElement) {
      this.isAnimating = false;
      return;
    }

    // Populate profile
    this.elements.profileUsername.textContent = profile.username;
    
    const ores = this.normalizeOreCounts(profile.ores || profile);
    this.elements.statStoneValue.textContent = ores.Stone;
    this.elements.statIronValue.textContent = ores.Iron;
    this.elements.statGoldValue.textContent = ores.Gold;
    this.elements.statDiamondValue.textContent = ores.Diamond;
    this.elements.statMythrilValue.textContent = ores.Mythril;
    this.elements.profileTotalMined.textContent = this.toNumber(profile.totalMined, 0);
    
    const bestOre = profile.bestOreFound || profile.bestDiscovery || '';
    this.elements.profileBestOre.textContent = this.getOreLabel(bestOre) || '—';

    // Set avatar
    const cachedAvatar = avatar || this.avatarCache[this.getUserKey(profile.username)];
    if (cachedAvatar && this.settings.showTwitchAvatar) {
      this.elements.profileAvatar.src = cachedAvatar;
      this.elements.profileAvatar.classList.add('has-image');
    } else {
      this.elements.profileAvatar.classList.remove('has-image');
    }

    // Show profile
    profileElement.classList.remove('is-exiting');
    profileElement.classList.add('is-visible');

    // Auto-close after duration
    this.profileCloseTimer = setTimeout(() => {
      profileElement.classList.add('is-exiting');
      this.profileCloseTimer = setTimeout(() => {
        profileElement.classList.remove('is-visible', 'is-exiting');
        this.isAnimating = false;
        this.processAnimationQueue();
      }, 220);
    }, this.settings.leaderboardPopupDuration);
  },

  showCardPopup(card) {
    const popup = this.elements.leaderboardPopup;
    if (!popup) {
      this.isAnimating = false;
      this.processAnimationQueue();
      return;
    }

    this.isAnimating = true;
    if (this.leaderboardPopupTimer) clearTimeout(this.leaderboardPopupTimer);

    if (this.elements.leaderboardPopupTitle) this.elements.leaderboardPopupTitle.textContent = card.title || '';

    if (this.elements.leaderboardPopupTrophy) {
      this.elements.leaderboardPopupTrophy.src = card.avatar || this.assets.trophy;
      this.elements.leaderboardPopupTrophy.style.display = card.avatar || card.type === 'leaderboard' ? 'block' : 'none';
      this.elements.leaderboardPopupTrophy.classList.toggle('is-avatar', Boolean(card.avatar));
    }

    const listElement = this.elements.leaderboardPopupList;
    if (listElement) {
      const fragment = document.createDocumentFragment();
      listElement.textContent = '';
      (card.rows || []).forEach((text) => {
        const item = document.createElement('li');
        item.className = 'leaderboard-item';
        item.textContent = text;
        fragment.appendChild(item);
      });
      listElement.appendChild(fragment);
    }

    popup.classList.remove('is-visible');
    void popup.offsetWidth;
    popup.classList.add('is-visible');

    this.leaderboardPopupTimer = setTimeout(() => {
      popup.classList.remove('is-visible');
      this.isAnimating = false;
      this.processAnimationQueue();
    }, this.settings.leaderboardPopupDuration);
  },

  getProfile(username) {
    if (!this.minerDb) this.minerDb = this.createEmptyDb();
    return this.minerDb.users[this.getUserKey(username)] || null;
  },

  getOrCreateProfile(username) {
    if (!this.minerDb) this.minerDb = this.createEmptyDb();

    const userKey = this.getUserKey(username);
    const existingProfile = this.minerDb.users[userKey];

    if (existingProfile) {
      this.minerDb.users[userKey] = this.normalizeProfile(existingProfile, username);
      return this.minerDb.users[userKey];
    }

    const newProfile = this.createProfile(username);
    this.minerDb.users[userKey] = newProfile;
    return newProfile;
  },

  createProfile(username) {
    return {
      username: username,
      Stone: 0,
      Iron: 0,
      Gold: 0,
      Diamond: 0,
      Mythril: 0,
      ores: { Stone: 0, Iron: 0, Gold: 0, Diamond: 0, Mythril: 0 },
      totalMined: 0,
      lastMiningTime: 0,
      bestDiscovery: '',
      bestOreFound: ''
    };
  },

  normalizeProfile(profile, username) {
    const ores = this.normalizeOreCounts(profile.ores || profile);
    const bestOre = profile.bestOreFound || profile.bestDiscovery || '';

    return {
      username: String(username || profile.username || '').trim(),
      Stone: ores.Stone,
      Iron: ores.Iron,
      Gold: ores.Gold,
      Diamond: ores.Diamond,
      Mythril: ores.Mythril,
      ores: ores,
      totalMined: this.toNumber(profile.totalMined, 0),
      lastMiningTime: this.toNumber(profile.lastMiningTime, 0),
      bestDiscovery: bestOre,
      bestOreFound: bestOre
    };
  },

  updateProfileWithOre(profile, ore) {
    if (!profile || !ore) return;

    profile.ores = this.normalizeOreCounts(profile.ores);
    profile.ores[ore] = this.toNumber(profile.ores[ore], 0) + 1;
    profile[ore] = profile.ores[ore];
    profile.totalMined = this.toNumber(profile.totalMined, 0) + 1;
    profile.lastMiningTime = Date.now();

    if (!profile.bestDiscovery || this.getOreRank(ore) > this.getOreRank(profile.bestDiscovery)) {
      profile.bestDiscovery = ore;
      profile.bestOreFound = ore;
    }
  },

  normalizeOreCounts(ores) {
    const safeOres = ores && typeof ores === 'object' ? ores : {};
    return {
      Stone: this.toNumber(safeOres.Stone, 0),
      Iron: this.toNumber(safeOres.Iron, 0),
      Gold: this.toNumber(safeOres.Gold, 0),
      Diamond: this.toNumber(safeOres.Diamond, 0),
      Mythril: this.toNumber(safeOres.Mythril, 0)
    };
  },

  pruneMinersIfNeeded() {
    if (!this.minerDb || !this.minerDb.users) return;

    const keys = Object.keys(this.minerDb.users);
    const maxSaved = Math.max(50, this.settings.maxSavedMiners);
    if (keys.length <= maxSaved) return;

    keys
      .map((key) => ({ key: key, profile: this.minerDb.users[key] }))
      .sort((a, b) => {
        const totalDiff = this.toNumber(a.profile.totalMined, 0) - this.toNumber(b.profile.totalMined, 0);
        if (totalDiff !== 0) return totalDiff;
        return this.toNumber(a.profile.lastMiningTime, 0) - this.toNumber(b.profile.lastMiningTime, 0);
      })
      .slice(0, keys.length - maxSaved)
      .forEach((entry) => {
        delete this.minerDb.users[entry.key];
      });
  },

  rollOre() {
    const chances = [
      { name: 'Stone', weight: Math.max(0, this.getEventChance('Stone', this.settings.stoneChance)) },
      { name: 'Iron', weight: Math.max(0, this.getEventChance('Iron', this.settings.ironChance)) },
      { name: 'Gold', weight: Math.max(0, this.getEventChance('Gold', this.settings.goldChance)) },
      { name: 'Diamond', weight: Math.max(0, this.getEventChance('Diamond', this.settings.diamondChance)) },
      { name: 'Mythril', weight: Math.max(0, this.getEventChance('Mythril', this.settings.mythrilChance)) }
    ];

    let totalWeight = chances.reduce((sum, ore) => sum + ore.weight, 0);
    if (totalWeight <= 0) {
      chances[0].weight = 55;
      chances[1].weight = 25;
      chances[2].weight = 13;
      chances[3].weight = 6;
      chances[4].weight = 1;
      totalWeight = 100;
    }

    let roll = Math.random() * totalWeight;
    for (let i = 0; i < chances.length; i += 1) {
      roll -= chances[i].weight;
      if (roll <= 0) return chances[i].name;
    }

    return 'Stone';
  },

  getEventChance(ore, baseChance) {
    if (!this.activeEvent) return baseChance;

    if (this.activeEvent.type === 'crystalRush' && ore === 'Diamond') return baseChance * 2;
    if (this.activeEvent.type === 'mythrilSurge' && ore === 'Mythril') return baseChance * 3;

    if (this.activeEvent.type === 'luckyMining') {
      if (ore === 'Stone') return baseChance * 0.65;
      if (ore === 'Gold' || ore === 'Diamond' || ore === 'Mythril') return baseChance * 1.5;
    }

    return baseChance;
  },

  startEventSchedule() {
    if (this.eventTimer) clearTimeout(this.eventTimer);
    if (!this.settings.enableEvents) return;
    this.eventTimer = setTimeout(() => this.startRandomEvent(), this.settings.eventInterval * 60 * 1000);
  },

  startRandomEvent() {
    const events = [
      { type: 'crystalRush', title: '✨ Crystal Rush', message: this.settings.crystalRushMessage },
      { type: 'mythrilSurge', title: '✨ Mythril Surge', message: this.settings.mythrilSurgeMessage },
      { type: 'luckyMining', title: '✨ Lucky Mining', message: this.settings.luckyMiningMessage }
    ];
    const event = events[Math.floor(Math.random() * events.length)];

    this.activeEvent = event;
    this.activeEventEndsAt = Date.now() + this.settings.eventDuration * 1000;

    if (this.settings.enableEventNotifications) {
      this.enqueueNotification({ type: 'event', title: event.title, rows: this.formatEventRows(event.message) });
    }

    if (this.eventEndTimer) clearTimeout(this.eventEndTimer);
    this.eventEndTimer = setTimeout(() => this.endActiveEvent(), this.settings.eventDuration * 1000);
  },

  endActiveEvent() {
    const endedEvent = this.activeEvent;
    this.activeEvent = null;
    this.activeEventEndsAt = 0;

    if (endedEvent && this.settings.enableEventNotifications) {
      const cleanTitle = endedEvent.title.replace('✨ ', '');
      const message = this.settings.eventEndedMessage.replaceAll('{event}', cleanTitle);
      this.enqueueNotification({ type: 'event', title: cleanTitle, rows: this.formatEventRows(message) });
    }

    this.startEventSchedule();
  },

  formatEventRows(message) {
    const rows = String(message || '').split('\n').filter(Boolean);
    if (this.activeEventEndsAt) rows.push(`${this.formatRemainingTime(this.activeEventEndsAt - Date.now())} remaining`);
    return rows;
  },

  formatRemainingTime(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  },

  scheduleSave() {
    this.pendingSave = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveStorage(), 750);
  },

  async saveStorage() {
    if (!this.minerDb) return;
    if (!window.SE_API || !SE_API.store) return;

    if (this.saveInProgress) {
      this.pendingSave = true;
      return;
    }

    this.saveInProgress = true;
    this.pendingSave = false;

    try {
      await this.storeSet(this.storageKey, JSON.parse(JSON.stringify(this.minerDb)));
    } catch (error) {
      this.pendingSave = true;
    }

    this.saveInProgress = false;
    if (this.pendingSave) this.scheduleSave();
  },

  async storeSet(key, value) {
    if (SE_API.store && typeof SE_API.store.set === 'function') {
      return SE_API.store.set(key, value);
    }

    if (typeof SE_API.store === 'function') {
      return SE_API.store(key, value);
    }

    throw new Error('SE_API.store is not available');
  },

  getCachedAvatar(username, event) {
    if (!this.settings.showTwitchAvatar) return '';
    const key = this.getUserKey(username);
    if (this.avatarCache[key]) return this.avatarCache[key];

    const data = event && event.data ? event.data : {};
    const avatar = data.avatar || data.profileImage || data.profileImageUrl || data.userAvatar || data.displayAvatar || '';
    if (avatar) this.avatarCache[key] = avatar;
    return avatar;
  },

  applyBaseUiSettings() {
    const root = this.elements.root || document.getElementById('crystal-mining-widget');
    if (!root) return;

    root.className = 'crystal-mining-widget';
    root.classList.add(`position-${this.settings.position}`);
    root.classList.add(`leaderboard-${this.settings.position}`);
    root.style.setProperty('--widget-scale', String(this.settings.scale / 100));
    root.style.setProperty('--leaderboard-scale', String(this.settings.leaderboardSize / 100));
    root.style.setProperty('--border-color', this.settings.borderColor);
    root.style.setProperty('--border-width', `${this.settings.borderWidth}px`);
    root.style.setProperty('--border-radius', `${this.settings.borderRadius}px`);
    root.style.setProperty('--text-color', this.settings.textColor);
    root.style.setProperty('--username-color', this.settings.usernameColor);
    root.style.setProperty('--ore-color', this.settings.oreNameColor);

    const rgb = this.hexToRgb(this.settings.backgroundColor);
    root.style.setProperty('--box-bg-r', String(rgb.r));
    root.style.setProperty('--box-bg-g', String(rgb.g));
    root.style.setProperty('--box-bg-b', String(rgb.b));
    root.style.setProperty('--box-opacity', String(this.settings.backgroundOpacity / 100));

    if (this.elements.miningText) this.elements.miningText.textContent = this.settings.miningText;
  },

  applyAssets() {
    this.assets.pickaxe = this.settings.pickaxeUrl || this.assets.pickaxe;
    this.assets.stone = this.settings.stoneUrl || this.assets.stone;
    this.assets.iron = this.settings.ironUrl || this.assets.iron;
    this.assets.gold = this.settings.goldUrl || this.assets.gold;
    this.assets.diamond = this.settings.diamondUrl || this.assets.diamond;
    this.assets.mythril = this.settings.mythrilUrl || this.assets.mythril;
    this.assets.dust = this.settings.dustUrl || this.assets.dust;
    this.assets.sparkle = this.settings.sparkleUrl || this.assets.sparkle;
    this.assets.trophy = this.settings.trophyUrl || this.assets.trophy;

    if (this.elements.pickaxeImage) this.elements.pickaxeImage.src = this.assets.pickaxe;
    if (this.elements.impactEffect) this.elements.impactEffect.src = this.assets.dust;
    if (this.elements.sparkleEffect) this.elements.sparkleEffect.src = this.assets.sparkle;
    if (this.elements.leaderboardTrophy) this.elements.leaderboardTrophy.src = this.assets.trophy;
    if (this.elements.leaderboardPopupTrophy) this.elements.leaderboardPopupTrophy.src = this.assets.trophy;

    // Set ore icons in profile
    if (this.elements.root) {
      const statStoneIcon = this.elements.root.querySelector('#stat-stone-icon');
      const statIronIcon = this.elements.root.querySelector('#stat-iron-icon');
      const statGoldIcon = this.elements.root.querySelector('#stat-gold-icon');
      const statDiamondIcon = this.elements.root.querySelector('#stat-diamond-icon');
      const statMythrilIcon = this.elements.root.querySelector('#stat-mythril-icon');
      
      if (statStoneIcon) statStoneIcon.src = this.assets.stone;
      if (statIronIcon) statIronIcon.src = this.assets.iron;
      if (statGoldIcon) statGoldIcon.src = this.assets.gold;
      if (statDiamondIcon) statDiamondIcon.src = this.assets.diamond;
      if (statMythrilIcon) statMythrilIcon.src = this.assets.mythril;
    }
  },

  getOreImage(ore) {
    const key = String(ore || '').toLowerCase();
    return this.assets[key] || this.assets.stone;
  },

  isRareOre(ore) {
    return ore === 'Diamond' || ore === 'Mythril';
  },

  getOreLabel(ore) {
    const labels = {
      Stone: this.settings.stoneName,
      Iron: this.settings.ironName,
      Gold: this.settings.goldName,
      Diamond: this.settings.diamondName,
      Mythril: this.settings.mythrilName
    };
    return labels[ore] || ore;
  },

  getOreRank(ore) {
    return this.oreRanks[String(ore || '').toLowerCase()] || 0;
  },

  getUserKey(username) {
    return this.safeKey(username);
  },

  safeKey(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  },

  formatText(template, username, ore) {
    return String(template || '').replaceAll('{user}', username).replaceAll('{ore}', ore);
  },

  hexToRgb(hex) {
    const fallback = { r: 22, g: 18, b: 34 };
    const cleanHex = String(hex || '').replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(cleanHex)) return fallback;
    return {
      r: parseInt(cleanHex.slice(0, 2), 16),
      g: parseInt(cleanHex.slice(2, 4), 16),
      b: parseInt(cleanHex.slice(4, 6), 16)
    };
  },

  toNumber(value, fallback) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  },

  toBoolean(value, fallback) {
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return fallback;
  },

  clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  },

  hasModeratorPermission(chatMessage) {
    const badges = this.getBadges(chatMessage);
    return this.hasBroadcasterPermission(chatMessage) || Boolean(badges.moderator || badges.mod);
  },

  hasBroadcasterPermission(chatMessage) {
    const badges = this.getBadges(chatMessage);
    const username = this.safeKey(chatMessage.username);
    return Boolean(badges.broadcaster) || username === this.safeKey(this.channelName);
  },

  getBadges(chatMessage) {
    const event = chatMessage.raw || {};
    const data = event.data || {};
    const badges = chatMessage.badges || data.badges || event.badges || {};
    if (!Array.isArray(badges)) return badges;

    return badges.reduce((normalized, badge) => {
      const key = badge && (badge.type || badge.name || badge.id);
      if (key) normalized[key] = true;
      return normalized;
    }, {});
  }
};

window.addEventListener('onWidgetLoad', function (eventData) {
  CrystalMiningWidget.init(eventData);
});

window.addEventListener('onEventReceived', function (eventData) {
  CrystalMiningWidget.handleEventReceived(eventData);
});

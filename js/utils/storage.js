/**
 * Storage Utility Module
 * Handles localStorage operations for favorites and recent items
 */

const STORAGE_KEYS = {
  FAVORITES: 'map_explorer_favorites',
  RECENT: 'map_explorer_recent',
  PREFERENCES: 'map_explorer_preferences'
};

const MAX_RECENT_ITEMS = 10;

/**
 * Gets favorites from localStorage
 * @returns {Array} Array of favorite items
 */
export function getFavorites() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading favorites:', error);
    return [];
  }
}

/**
 * Adds an item to favorites
 * @param {Object} item - Item to add (must have id, name, path)
 * @returns {boolean} Success status
 */
export function addToFavorites(item) {
  try {
    const favorites = getFavorites();

    // Check if already exists
    if (favorites.some(fav => fav.id === item.id)) {
      return false;
    }

    favorites.push({
      id: item.id,
      name: item.name,
      path: item.path,
      mimeType: item.mimeType,
      size: item.size,
      addedAt: new Date().toISOString()
    });

    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    return true;
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return false;
  }
}

/**
 * Removes an item from favorites
 * @param {string} itemId - ID of item to remove
 * @returns {boolean} Success status
 */
export function removeFromFavorites(itemId) {
  try {
    const favorites = getFavorites();
    const filtered = favorites.filter(fav => fav.id !== itemId);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return false;
  }
}

/**
 * Checks if an item is in favorites
 * @param {string} itemId - ID of item to check
 * @returns {boolean} True if item is favorited
 */
export function isFavorite(itemId) {
  const favorites = getFavorites();
  return favorites.some(fav => fav.id === itemId);
}

/**
 * Gets recent items from localStorage
 * @returns {Array} Array of recent items
 */
export function getRecentItems() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECENT);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading recent items:', error);
    return [];
  }
}

/**
 * Adds an item to recent history
 * @param {Object} item - Item to add
 */
export function addToRecent(item) {
  try {
    let recent = getRecentItems();

    // Remove if already exists
    recent = recent.filter(r => r.id !== item.id);

    // Add to beginning
    recent.unshift({
      id: item.id,
      name: item.name,
      path: item.path,
      mimeType: item.mimeType,
      size: item.size,
      accessedAt: new Date().toISOString()
    });

    // Keep only MAX_RECENT_ITEMS
    if (recent.length > MAX_RECENT_ITEMS) {
      recent = recent.slice(0, MAX_RECENT_ITEMS);
    }

    localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(recent));
  } catch (error) {
    console.error('Error adding to recent:', error);
  }
}

/**
 * Clears recent items history
 */
export function clearRecentItems() {
  try {
    localStorage.removeItem(STORAGE_KEYS.RECENT);
  } catch (error) {
    console.error('Error clearing recent items:', error);
  }
}

/**
 * Gets user preferences
 * @returns {Object} User preferences
 */
export function getPreferences() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error reading preferences:', error);
    return {};
  }
}

/**
 * Saves user preferences
 * @param {Object} preferences - Preferences to save
 */
export function savePreferences(preferences) {
  try {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
}

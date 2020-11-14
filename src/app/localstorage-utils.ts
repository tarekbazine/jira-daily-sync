import { SettingsModel } from './models';

const SETTINGS_KEY = 'SETTINGS_KEY_V0';

export function saveToLocalStorage(settings: SettingsModel): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getFromLocalStorage(): SettingsModel {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY));
  } catch (e) {
    return null;
  }
}

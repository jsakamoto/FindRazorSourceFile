import { describe, it, expect, vi } from 'vitest';
import { getConfigValue, toBool, isPressedHotkey, type FindRazorSourceFileConfig } from '../../FindRazorSourceFile/script.ts';

describe('getConfigValue', () => {

  it('should return the default value when configurations is empty', () => {
    expect(getConfigValue([], 'hotkey:code', 'KeyF')).toBe('KeyF');
  });

  it('should return the value when the specified key exists', () => {
    const configs = [{ key: 'hotkey:code', value: 'KeyG' }];
    expect(getConfigValue(configs, 'hotkey:code', 'KeyF')).toBe('KeyG');
  });

  it('should return the default value when the specified key does not exist', () => {
    const configs = [{ key: 'hotkey:code', value: 'KeyG' }];
    expect(getConfigValue(configs, 'hotkey:ctrlKey', 'true')).toBe('true');
  });

  it('should return the first entry value when duplicate keys exist', () => {
    const configs = [
      { key: 'hotkey:code', value: 'KeyG' },
      { key: 'hotkey:code', value: 'KeyH' },
    ];
    expect(getConfigValue(configs, 'hotkey:code', 'KeyF')).toBe('KeyG');
  });
});

describe('toBool', () => {

  it('should return true for boolean true', () => {
    expect(toBool(true)).toBe(true);
  });

  it('should return false for boolean false', () => {
    expect(toBool(false)).toBe(false);
  });

  it('should return true for string "true"', () => {
    expect(toBool('true')).toBe(true);
  });

  it('should return false for string "false"', () => {
    expect(toBool('false')).toBe(false);
  });

  it('should be case insensitive for string values', () => {
    expect(toBool('True')).toBe(true);
    expect(toBool('TRUE')).toBe(true);
    expect(toBool('False')).toBe(false);
    expect(toBool('FALSE')).toBe(false);
  });

  it('should return false and log error for invalid values', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    expect(toBool(1)).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('isPressedHotkey', () => {

  const keyCombinations = (() => {
    const keyCodes = [
      'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI', 'KeyJ',
      'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT',
      'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ',
    ] as const;
    const combos: KeyboardEvent[] = [];
    for (const ctrlKey of [false, true])
      for (const shiftKey of [false, true])
        for (const altKey of [false, true])
          for (const metaKey of [false, true])
            for (const code of keyCodes)
              combos.push(new KeyboardEvent('keydown', { code, ctrlKey, shiftKey, altKey, metaKey }));
    return combos;
  })();

  describe('with empty configs (default: Ctrl+Shift+F)', () => {
    const configs: FindRazorSourceFileConfig[] = [];

    it('should return true only for Ctrl+Shift+F', () => {
      for (const key of keyCombinations) {
        const expected = key.code === 'KeyF' && key.ctrlKey && key.shiftKey && !key.altKey && !key.metaKey;
        expect(isPressedHotkey(configs, key), `code=${key.code} ctrl=${key.ctrlKey} shift=${key.shiftKey} alt=${key.altKey} meta=${key.metaKey}`).toBe(expected);
      }
    });
  });

  describe('with code overridden to KeyX (default modifiers: Ctrl+Shift)', () => {
    const configs = [{ key: 'hotkey:code', value: 'KeyX' }];

    it('should return true only for Ctrl+Shift+X', () => {
      for (const key of keyCombinations) {
        const expected = key.code === 'KeyX' && key.ctrlKey && key.shiftKey && !key.altKey && !key.metaKey;
        expect(isPressedHotkey(configs, key), `code=${key.code} ctrl=${key.ctrlKey} shift=${key.shiftKey} alt=${key.altKey} meta=${key.metaKey}`).toBe(expected);
      }
    });
  });

  describe('with ctrlKey set to false (default code KeyF, Shift only)', () => {
    const configs = [{ key: 'hotkey:ctrlKey', value: 'false' }];

    it('should return true only for Shift+F (no Ctrl)', () => {
      for (const key of keyCombinations) {
        const expected = key.code === 'KeyF' && !key.ctrlKey && key.shiftKey && !key.altKey && !key.metaKey;
        expect(isPressedHotkey(configs, key), `code=${key.code} ctrl=${key.ctrlKey} shift=${key.shiftKey} alt=${key.altKey} meta=${key.metaKey}`).toBe(expected);
      }
    });
  });

  describe('with alt and meta enabled, ctrl and shift disabled, code KeyA', () => {
    const configs = [
      { key: 'hotkey:code', value: 'KeyA' },
      { key: 'hotkey:ctrlKey', value: 'false' },
      { key: 'hotkey:shiftKey', value: 'false' },
      { key: 'hotkey:altKey', value: 'true' },
      { key: 'hotkey:metaKey', value: 'true' },
    ];

    it('should return true only for Alt+Meta+A', () => {
      for (const key of keyCombinations) {
        const expected = key.code === 'KeyA' && !key.ctrlKey && !key.shiftKey && key.altKey && key.metaKey;
        expect(isPressedHotkey(configs, key), `code=${key.code} ctrl=${key.ctrlKey} shift=${key.shiftKey} alt=${key.altKey} meta=${key.metaKey}`).toBe(expected);
      }
    });
  });
});

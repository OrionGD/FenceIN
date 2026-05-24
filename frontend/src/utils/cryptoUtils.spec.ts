import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encryptData, decryptData, getEncryptionKey } from './cryptoUtils';

describe('CryptoUtils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should generate a new encryption key if none exists', async () => {
    const mockKey = { type: 'secret' } as any;
    vi.mocked(window.crypto.subtle.generateKey).mockResolvedValue(mockKey);
    vi.mocked(window.crypto.subtle.exportKey).mockResolvedValue(new ArrayBuffer(32));

    const key = await getEncryptionKey();

    expect(window.crypto.subtle.generateKey).toHaveBeenCalled();
    expect(key).toBe(mockKey);
    expect(localStorage.getItem('fencein-offline-key')).toBeTruthy();
  });

  it('should encrypt and decrypt data properly', async () => {
    // We mock the internals to just return dummy arraybuffers for testing the flow
    const mockKey = { type: 'secret' } as any;
    vi.mocked(window.crypto.subtle.importKey).mockResolvedValue(mockKey);
    
    // Set a dummy key so it doesn't try to generate
    localStorage.setItem('fencein-offline-key', 'ZHVtbXlrZXk=');

    const dummyCipher = new ArrayBuffer(16);
    vi.mocked(window.crypto.subtle.encrypt).mockResolvedValue(dummyCipher);

    const testData = { userId: '123', status: 'OK' };
    const { cipherText, iv } = await encryptData(testData);

    expect(window.crypto.subtle.encrypt).toHaveBeenCalled();
    expect(cipherText).toBe(dummyCipher);
    expect(iv).toBeInstanceOf(Uint8Array);

    // Mock decrypt
    const dummyDecrypted = new TextEncoder().encode(JSON.stringify(testData)).buffer;
    vi.mocked(window.crypto.subtle.decrypt).mockResolvedValue(dummyDecrypted);

    const result = await decryptData(cipherText, iv);
    expect(result).toEqual(testData);
  });
});

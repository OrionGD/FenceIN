const ENCRYPTION_KEY_NAME = 'fencein-offline-key';

export async function getEncryptionKey(): Promise<CryptoKey> {
  const storedKey = localStorage.getItem(ENCRYPTION_KEY_NAME);
  if (storedKey) {
    const rawKey = Uint8Array.from(atob(storedKey), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exported = await crypto.subtle.exportKey('raw', key);
  const base64Key = btoa(String.fromCharCode(...new Uint8Array(exported)));
  localStorage.setItem(ENCRYPTION_KEY_NAME, base64Key);

  return key;
}

export async function encryptData(data: any): Promise<{ cipherText: ArrayBuffer, iv: Uint8Array }> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));

  const cipherText = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    encoded
  );

  return { cipherText, iv };
}

export async function decryptData(cipherText: ArrayBuffer, iv: Uint8Array): Promise<any> {
  const key = await getEncryptionKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    cipherText
  );

  const decoded = new TextDecoder().decode(decrypted);
  return JSON.parse(decoded);
}

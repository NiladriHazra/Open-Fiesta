import { useEffect, useState } from 'react';
import CryptoJS from 'crypto-js';

const secretKey = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-secret-key';

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        try {
          // Try to decrypt the data
          const bytes = CryptoJS.AES.decrypt(raw, secretKey);
          const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
          // If decryptedData is empty, it means decryption failed
          if (decryptedData === '') {
            throw new Error("Decryption failed");
          }
          setValue(decryptedData);
        } catch (error) {
          // If decryption fails, assume it's plain text
          console.warn(`Failed to decrypt localStorage item "${key}". Assuming plain text. Error:`, error);
          setValue(JSON.parse(raw));
        }
      }
    } catch (error) {
      // Keep initial value if localStorage fails
      console.warn(`Failed to parse localStorage item "${key}":`, error);
    } finally {
      setIsHydrated(true);
    }
  }, [key]);

  // Save to localStorage when value changes (but only after hydration)
  useEffect(() => {
    if (isHydrated) {
      try {
        // Encrypt the data before storing it
        const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(value), secretKey).toString();
        window.localStorage.setItem(key, encryptedData);
      } catch (error) {
        console.warn(`Failed to save to localStorage item "${key}":`, error);
      }
    }
  }, [key, value, isHydrated]);

  return [value, setValue] as const;
}

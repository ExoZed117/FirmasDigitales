import CryptoJS from 'crypto-js';

/**
 * Lee un archivo PDF local y calcula su hash SHA-256 de forma asíncrona.
 * @param {File} file 
 * @returns {Promise<string>} hash hexadecimal
 */
export const calculateSHA256 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target.result;
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
        const hash = CryptoJS.SHA-256(wordArray).toString(CryptoJS.enc.Hex);
        resolve(hash);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
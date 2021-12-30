/* eslint-disable no-plusplus */
const rotl = (a, shift) => {
  switch (shift) {
    default:
      return ((a << shift) | (a >>> (32 - shift)));
  }
};

const salsaCore = (nonce32, key32, isFirstEntry) => {
  const sigma = 'expand 32-byte \0';
  // Convert sigma to 4 32-bit integers
  const sigma32 = new Int32Array(new Uint8Array(Buffer.from(sigma)).buffer);

  // Init state
  const block = new Int32Array([
    sigma32[0],
    key32[0],
    key32[1],
    key32[2],
    key32[3],
    sigma32[1],
    nonce32[0],
    nonce32[1],
    nonce32[2],
    nonce32[3],
    sigma32[2],
    key32[4],
    key32[5],
    key32[6],
    key32[7],
    sigma32[3],
  ]);

  const originalBlock = new Int32Array([...block]);

  for (let i = 0; i < 20; i += 1) {
    const currentBlock = [];
    for (let j = 0; j < 4; j += 1) {
      const abcd = [];
      for (let k = 0; k < 4; k += 1) {
        // column indices
        abcd[k] = block[(5 * j + 4 * k) & 0xf];
      }
      abcd[1] ^= rotl(abcd[3] + abcd[0], 7);
      abcd[2] ^= rotl(abcd[1] + abcd[0], 9);
      abcd[3] ^= rotl(abcd[1] + abcd[2], 13);
      abcd[0] ^= rotl(abcd[3] + abcd[2], 18);

      for (let k = 0; k < 4; k += 1) {
        // row indices
        currentBlock[j + k - ((j + k + ((j + k >> 31) >> 30)) & 0x3FFFFFFC) + 4 * j] = abcd[k];
      }
    }

    for (let j = 0; j < 16; j += 1) {
      block[j] = currentBlock[j];
    }
  }

  if (isFirstEntry) {
    const result = [];
    for (let i = 0; i < 16; i += 1) {
      block[i] += originalBlock[i];
    }

    for (let i = 0; i < 4; i += 1) {
      block[5 * i] -= sigma32[i];
      block[i + 6] -= nonce32[i];
    }

    for (let i = 0; i < 4; i += 1) {
      result[i] = block[5 * i];
    }

    for (let i = 0; i < 4; i += 1) {
      result[i + 4] = block[i + 6];
    }

    return new Int32Array(result);
  }

  const result = [];
  for (let i = 0; i < 16; i += 1) {
    result[i] = block[i] + originalBlock[i];
  }

  return new Int32Array(result);
};

const salsaDecrypt = (nonce, key, compressedBytes) => {
  const key32 = new Int32Array(key.buffer);
  const nonce32 = new Int32Array(nonce.buffer);
  const newKey32 = salsaCore(nonce32, key32, true);
  const newNonce32 = new Int32Array([
    nonce32[4],
    nonce32[5],
    0,
    0,
  ]);

  const result = [];
  let currentOffset = 0;

  while (result.length < compressedBytes.length) {
    const xor = new Uint8Array(salsaCore(newNonce32, newKey32, false).buffer);
    for (let i = 0; i < 64 && currentOffset < compressedBytes.length; i += 1) {
      result.push(xor[i] ^ compressedBytes[currentOffset++]);
    }

    // not tested but should work
    if (newNonce32[2] === 4294967295) {
      newNonce32[3] += 1;
      newNonce32[2] = 0;
    } else {
      newNonce32[2] += 1;
    }
  }

  return result;
};
module.exports = {
  salsaCore,
  salsaDecrypt,
};

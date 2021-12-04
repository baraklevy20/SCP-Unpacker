const fs = require('fs');
const sha256 = require('js-sha256');
const lzma = require('lzma-native');

const processFlags = (flags, compressedBytes, uncompressedSizeBytes, calculatedHash) => {
  if ((flags & 0x100) !== 0) {
    // section is chacha20 encrypted
    throw Error('Unsupported flag: CHACHA20');
  }

  if ((flags & 0x10) !== 0) {
    if (calculatedHash !== sha256(compressedBytes)) {
      throw Error('Invalid sha256');
    }
  }

  if ((flags & 1) !== 0) {
    const compressedData = [
      ...compressedBytes.slice(0, 5), // lzma props
      ...uncompressedSizeBytes, // lzma uncompressed size
      ...compressedBytes.slice(5), // compressed data
    ];
    
    return lzma.decompress(compressedData);
  }

  return compressedBytes;
};

const unpack = async (fileToUnpack) => {
  const buffer = fs.readFileSync(fileToUnpack);
  const magic = buffer.toString('utf-8', 0, 4);
  const version = buffer.readUInt16LE(4);

  if (magic !== 'SCP!' || version !== 1) {
    throw Error(`Invalid SCP file. Wrong header. Magic: ${magic}. Version: ${version}`);
  }

  // These flags are used in CHACHA20 (probably key and nonce):
  // 0x28 = ?
  // 0x30 = ?
  // 0x38 = ?
  // 0x40 = ?
  // All other bytes are known and used in the app

  const directoryOffset = Number(buffer.readBigUInt64LE(0x10));
  const uncompressedDirectorySizeBytes = buffer.subarray(0x18, 0x18 + 8);
  const directoryLength = Number(buffer.readBigUInt64LE(0x20));
  const compressedDirectory = buffer.subarray(directoryOffset, directoryOffset + directoryLength);
  const directoryFlags = buffer.readUInt32LE(0x08);

  const directory = await processFlags(
    directoryFlags,
    compressedDirectory,
    uncompressedDirectorySizeBytes,
    buffer.toString('hex', 0x48, 0x48 + 32),
  );

  const numberOfFiles = buffer.readUInt32LE(0xC);

  let fileHeader = directory;
  const promises = [];
  const fileNames = [];

  for (let i = 0; i < numberOfFiles; i += 1) {
    // the length includes the null terminated char
    const fileNameLength = fileHeader.readUInt16LE(0x2);
    fileNames[i] = fileHeader.toString('utf-8', 0x3c, 0x3c + fileNameLength - 1);

    const uncompressedFileSizeBytes = fileHeader.subarray(0x4, 0x4 + 8);
    const fileOffset = Number(fileHeader.readBigUInt64LE(0xc));
    const compressedFileSize = Number(fileHeader.readBigUInt64LE(0x14));

    const compressedFile = buffer.subarray(fileOffset, fileOffset + compressedFileSize);
    const fileFlags = fileHeader.readUInt16LE(0);

    promises.push(processFlags(
      fileFlags,
      compressedFile,
      uncompressedFileSizeBytes,
      fileHeader.toString('hex', 0x1c, 0x1c + 32),
    ));

    // Move to the next file header
    fileHeader = fileHeader.subarray(0x3c + fileNameLength);
  }

  const files = await Promise.all(promises);

  files.forEach((file, i) => {
    fs.writeFileSync(`out/${fileToUnpack}/${fileNames[i]}`, file);
  });
};

module.exports = {
  unpack,
};
